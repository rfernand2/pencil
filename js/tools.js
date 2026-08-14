/* tools.js — which implement drew a stroke, and what it looks like.
 *
 * A drawing already varies colour and width wildly: fine coloured outlines,
 * broad translucent shading. This turns that into a real set of tools, so the
 * thing you see moving on the paper matches the mark it leaves.
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else root.TOOLS = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* A modest box of colours. Stroke colours are matched to the nearest one —
     the mark keeps its exact hex, only the barrel is quantised. */
  var COLOURS = [
    { id: "graphite", name: "Graphite", rgb: [58, 54, 48], barrel: "#f1d03c", lead: "#2f2b26" },
    { id: "grey", name: "Grey", rgb: [124, 122, 116], barrel: "#b9bcc0", lead: "#7c7a74" },
    { id: "white", name: "White", rgb: [242, 244, 240], barrel: "#f4f4ee", lead: "#ffffff" },
    { id: "red", name: "Red", rgb: [192, 57, 43], barrel: "#c0392b", lead: "#c0392b" },
    { id: "orange", name: "Orange", rgb: [214, 122, 43], barrel: "#d67a2b", lead: "#d67a2b" },
    { id: "amber", name: "Amber", rgb: [217, 182, 46], barrel: "#d9b62e", lead: "#d9b62e" },
    { id: "green", name: "Green", rgb: [74, 139, 58], barrel: "#4a8b3a", lead: "#4a8b3a" },
    { id: "teal", name: "Teal", rgb: [47, 156, 143], barrel: "#2f9c8f", lead: "#2f9c8f" },
    { id: "blue", name: "Blue", rgb: [58, 110, 168], barrel: "#3a6ea8", lead: "#3a6ea8" },
    { id: "violet", name: "Violet", rgb: [106, 75, 156], barrel: "#6a4b9c", lead: "#6a4b9c" },
    { id: "pink", name: "Pink", rgb: [209, 86, 138], barrel: "#d1568a", lead: "#d1568a" },
    { id: "brown", name: "Brown", rgb: [138, 90, 48], barrel: "#8a5a30", lead: "#8a5a30" }
  ];

  /* Anything this wide is no longer a pencil line — it's a broad tip. */
  var BROAD = 0.46;

  function hexToRgb(hex) {
    var h = String(hex || "").trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) return [60, 56, 50];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function nearestColour(hex) {
    var c = hexToRgb(hex);
    var lum = (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
    var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);

    /* Absolute chroma, not saturation: a near-black warm ink like #2b2620 has a
       high *relative* saturation but only 11 levels of actual colour in it, and
       it must read as graphite rather than brown. */
    if (max - min < 28) {
      if (lum > 0.72) return COLOURS[2];      // white
      if (lum > 0.34) return COLOURS[1];      // grey
      return COLOURS[0];                      // graphite
    }

    var best = COLOURS[0], bestD = Infinity;
    for (var i = 0; i < COLOURS.length; i++) {
      /* skip the neutrals — a saturated stroke should pick a real colour */
      if (i < 3) continue;
      var t = COLOURS[i].rgb;
      var dr = c[0] - t[0], dg = c[1] - t[1], db = c[2] - t[2];
      var d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.7;
      if (d < bestD) { bestD = d; best = COLOURS[i]; }
    }
    return best;
  }

  /* width is in LOCAL units, as authored by the motifs. */
  function classify(colour, width) {
    var c = nearestColour(colour);
    var kind = width >= BROAD ? "marker" : "pencil";
    return {
      id: kind + ":" + c.id,
      kind: kind,
      colour: c.id,
      name: c.name + " " + (kind === "marker" ? "marker" : "pencil"),
      barrel: c.barrel,
      lead: c.lead
    };
  }

  var byId = {};
  function get(id) {
    if (byId[id]) return byId[id];
    var parts = String(id || "pencil:graphite").split(":");
    var c = COLOURS.filter(function (x) { return x.id === parts[1]; })[0] || COLOURS[0];
    var t = {
      id: id, kind: parts[0] === "marker" ? "marker" : "pencil", colour: c.id,
      name: c.name + " " + (parts[0] === "marker" ? "marker" : "pencil"),
      barrel: c.barrel, lead: c.lead
    };
    byId[id] = t;
    return t;
  }

  function shade(hex, k) {
    var c = hexToRgb(hex);
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
    return "rgb(" + f(c[0]) + "," + f(c[1]) + "," + f(c[2]) + ")";
  }

  /* ---------- the sprites ----------
   * Drawn tip-at-origin, pointing down the +y axis, in a ~78-unit-long space so
   * both tools sit in the same coordinate system as the original pencil. */

  function drawPencil(g, t, tipColour) {
    /* shadow */
    g.save();
    g.translate(3.2, 2.4);
    g.fillStyle = "rgba(0,0,0,0.16)";
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(-6.8, 22); g.lineTo(-6.8, 77);
    g.lineTo(6.8, 77); g.lineTo(6.8, 22); g.closePath();
    g.fill();
    g.restore();

    var isGraphite = t.colour === "graphite";
    var wood = "#e8c57a";

    /* sharpened cone */
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(-4.3, 14); g.lineTo(4.3, 14); g.closePath();
    g.fillStyle = wood;
    g.fill();

    /* the lead — the colour actually being laid down */
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(-1.7, 5.6); g.lineTo(1.7, 5.6); g.closePath();
    g.fillStyle = tipColour || t.lead;
    g.fill();

    /* collar */
    g.beginPath();
    g.moveTo(-4.3, 14); g.lineTo(-6.7, 22); g.lineTo(6.7, 22); g.lineTo(4.3, 14);
    g.closePath();
    g.fillStyle = shade(wood, 0.94);
    g.fill();

    /* barrel */
    g.fillStyle = t.barrel;
    g.fillRect(-6.7, 22, 13.4, isGraphite ? 38 : 50);
    g.fillStyle = "rgba(255,255,255,0.30)";
    g.fillRect(-5.2, 23, 2.1, isGraphite ? 36 : 48);
    g.fillStyle = shade(t.barrel, 0.82);
    g.fillRect(-6.7, 22, 1.5, isGraphite ? 38 : 50);
    g.fillRect(5.2, 22, 1.5, isGraphite ? 38 : 50);

    if (isGraphite) {
      /* the classic ferrule and eraser */
      g.fillStyle = "#c8ccd2";
      g.fillRect(-6.9, 60, 13.8, 8);
      g.fillStyle = "#9aa1aa";
      g.fillRect(-6.9, 61.6, 13.8, 1.15);
      g.fillRect(-6.9, 65.6, 13.8, 1.15);
      g.fillStyle = "#e898a6";
      g.beginPath();
      if (g.roundRect) g.roundRect(-6.5, 68, 13, 9.2, 2.2); else g.rect(-6.5, 68, 13, 9.2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(-4.6, 69, 2, 6);
    } else {
      /* colour pencils get a dipped end instead */
      g.fillStyle = shade(t.barrel, 0.7);
      g.beginPath();
      if (g.roundRect) g.roundRect(-6.7, 71, 13.4, 6.4, 2.4); else g.rect(-6.7, 71, 13.4, 6.4);
      g.fill();
    }
  }

  function drawMarker(g, t, tipColour) {
    g.save();
    g.translate(3.4, 2.6);
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.beginPath();
    if (g.roundRect) g.roundRect(-9, 0, 18, 76, 3); else g.rect(-9, 0, 18, 76);
    g.fill();
    g.restore();

    /* chisel felt tip — wide, flat, and the colour it lays down */
    g.fillStyle = tipColour || t.lead;
    g.beginPath();
    g.moveTo(-6.4, 0); g.lineTo(6.4, 0); g.lineTo(4.6, 13); g.lineTo(-4.6, 13);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.beginPath();
    g.moveTo(-6.4, 0); g.lineTo(0, 0); g.lineTo(0, 13); g.lineTo(-4.6, 13);
    g.closePath();
    g.fill();

    /* collar */
    g.fillStyle = "#d9dde2";
    g.beginPath();
    if (g.roundRect) g.roundRect(-7.4, 12, 14.8, 7, 1.6); else g.rect(-7.4, 12, 14.8, 7);
    g.fill();

    /* fat body */
    g.fillStyle = shade(t.barrel, 0.92);
    g.beginPath();
    if (g.roundRect) g.roundRect(-9, 18, 18, 58, 3.4); else g.rect(-9, 18, 18, 58);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.26)";
    g.fillRect(-6.6, 20, 3, 53);
    g.fillStyle = "rgba(0,0,0,0.20)";
    g.fillRect(5.4, 20, 2.6, 53);

    /* label band, so it reads as a marker not a crayon */
    g.fillStyle = "rgba(250,250,246,0.92)";
    g.fillRect(-9, 34, 18, 11);
    g.fillStyle = shade(t.barrel, 0.75);
    g.fillRect(-9, 34, 18, 2);
    g.fillRect(-9, 43, 18, 2);
  }

  /* Draw a tool with its tip at (0,0) pointing along +y, at `scale`. */
  function paint(g, tool, scale, tipColour) {
    g.save();
    g.scale(scale, scale);
    if (tool.kind === "marker") drawMarker(g, tool, tipColour);
    else drawPencil(g, tool, tipColour);
    g.restore();
  }

  return {
    COLOURS: COLOURS,
    BROAD: BROAD,
    classify: classify,
    get: get,
    paint: paint,
    nearestColour: nearestColour
  };
});
