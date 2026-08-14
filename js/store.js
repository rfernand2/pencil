/* store.js — everything the app keeps on this machine.
 *
 * IndexedDB rather than localStorage: localStorage caps out around 5MB and
 * only holds strings, so a handful of full-size drawings would blow the quota.
 * IndexedDB stores real Blobs and has orders of magnitude more room.
 *
 *   drawings    finished artwork + how it was made
 *   backgrounds pictures the user uploaded
 *   prefs       small odds and ends (which factory pictures are hidden, etc.)
 */
(function (global) {
  "use strict";

  var NAME = "pencil";
  var VERSION = 1;
  var dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error("This browser has no IndexedDB."));
      var req = global.indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("drawings")) {
          db.createObjectStore("drawings", { keyPath: "id" }).createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("backgrounds")) {
          db.createObjectStore("backgrounds", { keyPath: "id" }).createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("prefs")) {
          db.createObjectStore("prefs", { keyPath: "k" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("Could not open the local database.")); };
    });
    return dbp;
  }

  function run(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var req = fn(t.objectStore(store));
        t.oncomplete = function () { resolve(req && req.result); };
        t.onerror = t.onabort = function () {
          var e = t.error || (req && req.error);
          if (e && (e.name === "QuotaExceededError" || /quota/i.test(e.message || ""))) {
            reject(new Error("This machine's storage for the app is full — delete a few drawings."));
          } else {
            reject(e || new Error("Local storage write failed."));
          }
        };
      });
    });
  }

  function all(store) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var t = db.transaction(store, "readonly");
        var cur = t.objectStore(store).openCursor();
        cur.onsuccess = function () {
          var c = cur.result;
          if (c) { out.push(c.value); c.continue(); }
        };
        t.oncomplete = function () {
          /* seq breaks ties: two records saved in the same millisecond must
             still come back in a stable, newest-first order. */
          out.sort(function (a, b) {
            return (b.createdAt || 0) - (a.createdAt || 0) || (b.seq || 0) - (a.seq || 0);
          });
          resolve(out);
        };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  var counter = 0;

  function id(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function stamp(rec) {
    rec.id = rec.id || id(rec._p);
    rec.createdAt = rec.createdAt || Date.now();
    rec.seq = rec.seq || ++counter;
    delete rec._p;
    return rec;
  }

  /* ---------- drawings ---------- */

  function addDrawing(rec) {
    rec._p = "dw"; stamp(rec);
    return run("drawings", "readwrite", function (s) { return s.put(rec); }).then(function () { return rec; });
  }

  function listDrawings() { return all("drawings"); }

  function getDrawing(key) {
    return run("drawings", "readonly", function (s) { return s.get(key); });
  }

  function deleteDrawings(ids) {
    return run("drawings", "readwrite", function (s) {
      ids.forEach(function (k) { s.delete(k); });
      return null;
    });
  }

  /* ---------- backgrounds ---------- */

  function addBackground(rec) {
    rec._p = "bg"; stamp(rec);
    return run("backgrounds", "readwrite", function (s) { return s.put(rec); }).then(function () { return rec; });
  }

  function listBackgrounds() { return all("backgrounds"); }

  function deleteBackground(key) {
    return run("backgrounds", "readwrite", function (s) { return s.delete(key); });
  }

  function clearBackgrounds() {
    return run("backgrounds", "readwrite", function (s) { return s.clear(); });
  }

  /* ---------- prefs ---------- */

  function getPref(k, dflt) {
    return run("prefs", "readonly", function (s) { return s.get(k); }).then(function (r) {
      return r && r.v !== undefined ? r.v : dflt;
    }).catch(function () { return dflt; });
  }

  function setPref(k, v) {
    return run("prefs", "readwrite", function (s) { return s.put({ k: k, v: v }); });
  }

  /* ---------- helpers ---------- */

  function usage() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().catch(function () { return null; });
  }

  function bytes(n) {
    if (!n && n !== 0) return "?";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  /* Canvas -> Blob, with a data-URL fallback for older engines. */
  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (b) {
          b ? resolve(b) : reject(new Error("Could not encode the image."));
        }, type, quality);
      } else {
        try {
          var parts = canvas.toDataURL(type, quality).split(",");
          var bin = atob(parts[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: type }));
        } catch (e) { reject(e); }
      }
    });
  }

  /* Draw an image onto a canvas no larger than `max` on its long edge. */
  function fitCanvas(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  global.STORE = {
    open: open,
    addDrawing: addDrawing,
    listDrawings: listDrawings,
    getDrawing: getDrawing,
    deleteDrawings: deleteDrawings,
    addBackground: addBackground,
    listBackgrounds: listBackgrounds,
    deleteBackground: deleteBackground,
    clearBackgrounds: clearBackgrounds,
    getPref: getPref,
    setPref: setPref,
    usage: usage,
    bytes: bytes,
    canvasToBlob: canvasToBlob,
    fitCanvas: fitCanvas
  };
})(window);
