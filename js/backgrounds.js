/* backgrounds.js — ten drawing surfaces, each generated on a canvas so the app
 * is fully self-contained (no network, no tainted canvas when saving a PNG).
 *
 * Every surface declares `region`: the rectangle of natural white space the
 * artwork is composed into, in percent of the image.
 * `tone` says whether the pencil should draw dark on light, or light on dark.
 */
(function (global) {
  "use strict";

  function rnd(seed) {
    var s = seed >>> 0 || 7;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  function grain(g, w, h, n, alpha, dark) {
    var r = rnd(97531);
    g.save();
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, s = 0.5 + r() * 1.6;
      g.fillStyle = dark
        ? "rgba(255,255,255," + (alpha * (0.4 + r() * 0.6)).toFixed(3) + ")"
        : "rgba(70,55,40," + (alpha * (0.4 + r() * 0.6)).toFixed(3) + ")";
      g.fillRect(x, y, s, s);
    }
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function paperFill(g, w, h, top, bottom) {
    var lg = g.createLinearGradient(0, 0, w * 0.4, h);
    lg.addColorStop(0, top);
    lg.addColorStop(1, bottom);
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
  }

  function shadow(g, fn, blur, off, col) {
    g.save();
    g.shadowColor = col || "rgba(0,0,0,0.35)";
    g.shadowBlur = blur;
    g.shadowOffsetY = off;
    fn();
    g.restore();
  }

  var B = [];

  /* 1 — playing card on green felt --------------------------------------- */
  B.push({
    id: "card", name: "Ace of clubs", w: 900, h: 1260, tone: "light",
    region: { x: 13, y: 15, w: 74, h: 70 },
    features: [
      {id: "pip", kind: "motif", x: 50, y: 44, r: 11, weight: 3.2, label: "the club pip", note: "a big black club pip printed in the middle of the card"},
      {id: "corner", kind: "motif", x: 11, y: 8, r: 4.5, weight: 0.5, label: "the corner pip", note: "the small A and club printed in the top corner"},
      {id: "border", kind: "frame", x: 6, y: 4, w: 88, h: 92, weight: 0.7, label: "the card border", note: "the rounded double border of the card"}
    ],
    render: function (g, w, h) {
      var lg = g.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h / 2, h * 0.8);
      lg.addColorStop(0, "#26603f"); lg.addColorStop(1, "#123322");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      grain(g, w, h, 6000, 0.06, true);

      var m = 34, cw = w - m * 2, ch = h - m * 2;
      shadow(g, function () {
        g.fillStyle = "#fbf8f1";
        roundRect(g, m, m, cw, ch, 40);
        g.fill();
      }, 42, 16, "rgba(0,0,0,0.5)");
      g.strokeStyle = "rgba(0,0,0,0.10)"; g.lineWidth = 2;
      roundRect(g, m, m, cw, ch, 40); g.stroke();
      g.strokeStyle = "rgba(20,20,20,0.16)"; g.lineWidth = 2;
      roundRect(g, m + 22, m + 22, cw - 44, ch - 44, 26); g.stroke();

      function club(cx, cy, s) {
        var r = s * 0.27;
        g.fillStyle = "#15120f";
        g.beginPath();
        g.arc(cx, cy - r, r, 0, Math.PI * 2);
        g.arc(cx - r * 0.94, cy + r * 0.38, r, 0, Math.PI * 2);
        g.arc(cx + r * 0.94, cy + r * 0.38, r, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(cx - r * 0.2, cy + r * 0.45);
        g.quadraticCurveTo(cx - r * 0.2, cy + r * 1.15, cx - r * 0.66, cy + r * 2.0);
        g.lineTo(cx + r * 0.66, cy + r * 2.0);
        g.quadraticCurveTo(cx + r * 0.2, cy + r * 1.15, cx + r * 0.2, cy + r * 0.45);
        g.closePath(); g.fill();
      }
      g.fillStyle = "#15120f";
      g.font = "bold 76px Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "top";
      g.fillText("A", m + 62, m + 40);
      club(m + 62, m + 158, 40);
      /* The big centre pip is the thing worth drawing on — a canopy, a balloon,
         a clover patch. Without it the card is just a blank rectangle. */
      club(w / 2, h * 0.44, 132);
      g.save();
      g.translate(w - m - 62, h - m - 40); g.rotate(Math.PI);
      g.font = "bold 76px Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "top";
      g.fillStyle = "#15120f"; g.fillText("A", 0, 0);
      club(0, 118, 40);
      g.restore();
    }
  });

  /* 1b — the other ace, on burgundy felt ---------------------------------- */
  B.push({
    id: "diamond", name: "Ace of diamonds", w: 900, h: 1260, tone: "light",
    region: { x: 13, y: 15, w: 74, h: 70 },
    features: [
      { id: "pip", kind: "motif", x: 50, y: 44, r: 10.5, weight: 3.2, label: "the diamond pip", note: "a big red diamond pip printed in the middle of the card" },
      { id: "corner", kind: "motif", x: 11, y: 8, r: 4.5, weight: 0.5, label: "the corner pip", note: "the small red A and diamond printed in the top corner" },
      { id: "border", kind: "frame", x: 6, y: 4, w: 88, h: 92, weight: 0.7, label: "the card border", note: "the rounded double border of the card" }
    ],
    render: function (g, w, h) {
      var lg = g.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h / 2, h * 0.8);
      lg.addColorStop(0, "#6d2230"); lg.addColorStop(1, "#33101a");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      grain(g, w, h, 6000, 0.06, true);

      var m = 34, cw = w - m * 2, ch = h - m * 2;
      shadow(g, function () {
        g.fillStyle = "#fbf8f1";
        roundRect(g, m, m, cw, ch, 40);
        g.fill();
      }, 42, 16, "rgba(0,0,0,0.5)");
      g.strokeStyle = "rgba(0,0,0,0.10)"; g.lineWidth = 2;
      roundRect(g, m, m, cw, ch, 40); g.stroke();
      g.strokeStyle = "rgba(150,30,40,0.20)"; g.lineWidth = 2;
      roundRect(g, m + 22, m + 22, cw - 44, ch - 44, 26); g.stroke();

      /* a diamond with very slightly bowed sides, the way they are printed */
      function diamond(cx, cy, s) {
        var wq = s * 0.62, hq = s;
        g.fillStyle = "#c0202c";
        g.beginPath();
        g.moveTo(cx, cy - hq);
        g.quadraticCurveTo(cx + wq * 0.42, cy - hq * 0.42, cx + wq, cy);
        g.quadraticCurveTo(cx + wq * 0.42, cy + hq * 0.42, cx, cy + hq);
        g.quadraticCurveTo(cx - wq * 0.42, cy + hq * 0.42, cx - wq, cy);
        g.quadraticCurveTo(cx - wq * 0.42, cy - hq * 0.42, cx, cy - hq);
        g.closePath(); g.fill();
      }

      g.fillStyle = "#c0202c";
      g.font = "bold 76px Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "top";
      g.fillText("A", m + 62, m + 40);
      diamond(m + 62, m + 168, 34);
      diamond(w / 2, h * 0.44, 132);
      g.save();
      g.translate(w - m - 62, h - m - 40); g.rotate(Math.PI);
      g.font = "bold 76px Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "top";
      g.fillStyle = "#c0202c"; g.fillText("A", 0, 0);
      diamond(0, 128, 34);
      g.restore();
    }
  });

  /* 2 — taped sketchbook page -------------------------------------------- */
  B.push({
    id: "sketchbook", name: "Sketchbook page", w: 1240, h: 940, tone: "light",
    region: { x: 9, y: 10, w: 82, h: 80 },
    features: [
      {id: "ring", kind: "disc", x: 71, y: 30, r: 9, weight: 2.6, label: "the coffee ring", note: "a faint brown coffee-cup ring stained on the paper"},
      {id: "tapeTL", kind: "corner", x: 8, y: 8, angle: -0.7, weight: 1.3, label: "the tape corner", note: "a strip of masking tape across the top-left corner"},
      {id: "tapeBR", kind: "corner", x: 92, y: 92, angle: -0.7, weight: 1, label: "the tape corner", note: "a strip of masking tape across the bottom-right corner"}
    ],
    render: function (g, w, h) {
      g.fillStyle = "#8a7f70"; g.fillRect(0, 0, w, h);
      grain(g, w, h, 4000, 0.08, true);
      var m = 26;
      shadow(g, function () {
        g.fillStyle = "#f6efe0";
        g.fillRect(m, m, w - m * 2, h - m * 2);
      }, 30, 12, "rgba(0,0,0,0.4)");
      paperFillClip(g, m, w, h);
      grain(g, w, h, 20000, 0.05, false);
      /* deckle edge nibbles */
      var r = rnd(4242);
      g.fillStyle = "#8a7f70";
      for (var i = 0; i < 260; i++) {
        var t = r();
        if (r() < 0.5) g.fillRect(m - 2 + r() * 5, m + t * (h - m * 2), 3, 4);
        else g.fillRect(m + t * (w - m * 2), m - 2 + r() * 5, 4, 3);
      }
      /* a coffee ring — something for a drawing to build on */
      g.save();
      g.translate(w * 0.71, h * 0.30);
      g.strokeStyle = "rgba(146,98,48,0.42)";
      for (var q = 0; q < 3; q++) {
        g.lineWidth = 5 - q * 1.4;
        g.beginPath();
        for (var a = 0; a <= 46; a++) {
          var t = (a / 46) * Math.PI * 2;
          var rr = w * 0.088 * (1 - q * 0.045) + Math.sin(t * 5 + q) * 2.2;
          var px = Math.cos(t) * rr, py = Math.sin(t) * rr * 0.98;
          a ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.stroke();
      }
      g.fillStyle = "rgba(150,106,58,0.09)";
      g.beginPath(); g.ellipse(0, 0, w * 0.082, w * 0.080, 0, 0, Math.PI * 2); g.fill();
      g.restore();

      /* corner tape */
      [[m - 12, m - 12, -0.7], [w - m - 76, m - 12, 0.7],
      [m - 12, h - m - 76, 0.7], [w - m - 76, h - m - 76, -0.7]].forEach(function (t) {
        g.save();
        g.translate(t[0] + 44, t[1] + 44); g.rotate(t[2]);
        g.fillStyle = "rgba(232,222,190,0.82)";
        g.fillRect(-72, -17, 144, 34);
        g.strokeStyle = "rgba(150,138,110,0.4)"; g.lineWidth = 1.5;
        g.strokeRect(-72, -17, 144, 34);
        g.restore();
      });
      function paperFillClip(gg, mm, ww, hh) {
        gg.save();
        gg.beginPath(); gg.rect(mm, mm, ww - mm * 2, hh - mm * 2); gg.clip();
        var lg = gg.createLinearGradient(0, 0, ww, hh);
        lg.addColorStop(0, "#faf4e7"); lg.addColorStop(0.55, "#f4ecda"); lg.addColorStop(1, "#efe5d0");
        gg.fillStyle = lg; gg.fillRect(0, 0, ww, hh);
        gg.restore();
      }
    }
  });

  /* 3 — ruled notebook ---------------------------------------------------- */
  B.push({
    id: "notebook", name: "Ruled notebook", w: 1000, h: 1300, tone: "light",
    region: { x: 20, y: 9, w: 72, h: 80 },
    features: [
      {id: "rules", kind: "rules", x: 12, y: 10, w: 84, h: 84, gap: 3.5, weight: 3, label: "the ruled lines", note: "blue ruled lines running across the page"},
      {id: "margin", kind: "edge", x1: 11.4, y1: 3, x2: 11.6, y2: 97, weight: 1.1, label: "the margin line", note: "the red vertical margin line"},
      {id: "rings", kind: "spikes", x: 5, y: 4, w: 7, h: 92, weight: 1.6, label: "the spiral binding", note: "the wire spiral binding down the left edge"}
    ],
    render: function (g, w, h) {
      paperFill(g, w, h, "#fdfaf2", "#f2ece0");
      grain(g, w, h, 14000, 0.04, false);
      g.strokeStyle = "rgba(96,132,168,0.42)"; g.lineWidth = 1.6;
      for (var y = 120; y < h - 60; y += 46) {
        g.beginPath(); g.moveTo(110, y); g.lineTo(w - 46, y + 1.5); g.stroke();
      }
      g.strokeStyle = "rgba(198,88,88,0.55)"; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(112, 40); g.lineTo(116, h - 40); g.stroke();
      /* spiral binding */
      g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(0, 0, 74, h);
      for (var i = 0; i < 18; i++) {
        var cy = 58 + i * ((h - 120) / 17);
        g.fillStyle = "#efe9dc";
        g.beginPath(); g.ellipse(50, cy, 15, 11, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(60,50,40,0.25)"; g.lineWidth = 2;
        g.beginPath(); g.ellipse(50, cy, 15, 11, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = "#9aa3ab"; g.lineWidth = 7; g.lineCap = "round";
        g.beginPath(); g.moveTo(18, cy - 12); g.lineTo(70, cy + 6); g.stroke();
        g.strokeStyle = "#cfd6dc"; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(20, cy - 13); g.lineTo(66, cy + 3); g.stroke();
      }
      g.lineCap = "butt";
    }
  });

  /* 4 — vintage postcard --------------------------------------------------- */
  B.push({
    id: "postcard", name: "Vintage postcard", w: 1400, h: 950, tone: "light",
    region: { x: 6, y: 9, w: 41, h: 82 },
    features: [
      {id: "divider", kind: "edge", x1: 50, y1: 8, x2: 50, y2: 92, weight: 1.2, label: "the centre rule", note: "the vertical rule splitting the card in two"},
      {id: "stamp", kind: "frame", x: 74, y: 10, w: 11, h: 19, weight: 1.6, label: "the stamp box", note: "the dashed AFFIX STAMP box"},
      {id: "parAvion", kind: "disc", x: 72, y: 34, r: 5.5, weight: 2, label: "the postmark", note: "a faded round PAR AVION postmark"},
      {id: "lines", kind: "rules", x: 55, y: 52, w: 38, h: 25, gap: 6, weight: 2, label: "the address lines", note: "ruled address lines on the right half"}
    ],
    render: function (g, w, h) {
      g.fillStyle = "#6d6355"; g.fillRect(0, 0, w, h);
      var m = 22;
      shadow(g, function () {
        var lg = g.createLinearGradient(0, 0, w, h);
        lg.addColorStop(0, "#f5e9d0"); lg.addColorStop(0.5, "#efe0c2"); lg.addColorStop(1, "#e6d4b2");
        g.fillStyle = lg; g.fillRect(m, m, w - m * 2, h - m * 2);
      }, 26, 10, "rgba(0,0,0,0.45)");
      grain(g, w, h, 26000, 0.07, false);
      /* age blotches */
      var r = rnd(8081);
      for (var i = 0; i < 26; i++) {
        g.fillStyle = "rgba(150,112,60,0.05)";
        g.beginPath();
        g.ellipse(m + r() * (w - m * 2), m + r() * (h - m * 2), 20 + r() * 90, 16 + r() * 70, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = "rgba(90,70,45,0.5)"; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(w * 0.5, m + 40); g.lineTo(w * 0.5, h - m - 40); g.stroke();
      /* stamp box */
      g.strokeStyle = "rgba(90,70,45,0.45)"; g.lineWidth = 2.4;
      g.setLineDash([9, 7]);
      g.strokeRect(w - m - 190, m + 46, 148, 176);
      g.setLineDash([]);
      g.fillStyle = "rgba(90,70,45,0.32)";
      g.font = "italic 22px Georgia, serif"; g.textAlign = "center";
      g.fillText("AFFIX", w - m - 116, m + 128);
      g.fillText("STAMP", w - m - 116, m + 156);
      /* address lines */
      g.strokeStyle = "rgba(90,70,45,0.35)"; g.lineWidth = 2;
      for (var k = 0; k < 5; k++) {
        var y = h * 0.5 + k * 58;
        g.beginPath(); g.moveTo(w * 0.55, y); g.lineTo(w - m - 60, y); g.stroke();
      }
      g.save();
      g.translate(w * 0.72, m + 300); g.rotate(-0.22);
      g.strokeStyle = "rgba(120,60,50,0.3)"; g.lineWidth = 5;
      g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "rgba(120,60,50,0.3)";
      g.font = "bold 20px Georgia, serif"; g.textAlign = "center";
      g.fillText("PAR AVION", 0, 8);
      g.restore();
    }
  });

  /* 5 — linen napkin on a dark desk ---------------------------------------- */
  B.push({
    id: "napkin", name: "Napkin on desk", w: 1240, h: 960, tone: "light",
    region: { x: 22, y: 22, w: 56, h: 58 },
    features: [
      {id: "cup", kind: "disc", x: 90, y: 12, r: 8, weight: 2.6, label: "the coffee cup", note: "a coffee cup resting at the top-right corner"},
      {id: "fold", kind: "edge", x1: 22, y1: 50, x2: 78, y2: 49, weight: 1.6, label: "the fold crease", note: "a fold crease running across the napkin"},
      {id: "foldV", kind: "edge", x1: 50, y1: 17, x2: 50, y2: 82, weight: 1.2, label: "the fold crease", note: "a fold crease running down the napkin"}
    ],
    render: function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, w, h);
      lg.addColorStop(0, "#4a3527"); lg.addColorStop(1, "#2f2118");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      var r = rnd(1717);
      g.strokeStyle = "rgba(20,12,8,0.35)"; g.lineWidth = 2;
      for (var i = 0; i < 26; i++) {
        var y = r() * h;
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 12, w * 0.7, y - 12, w, y + 4); g.stroke();
      }
      grain(g, w, h, 9000, 0.07, true);

      var nx = w * 0.17, ny = h * 0.16, nw = w * 0.66, nh = h * 0.68;
      shadow(g, function () {
        g.save();
        g.translate(nx + nw / 2, ny + nh / 2); g.rotate(-0.025);
        g.fillStyle = "#f4f0e6";
        g.fillRect(-nw / 2, -nh / 2, nw, nh);
        g.restore();
      }, 34, 14, "rgba(0,0,0,0.55)");
      g.save();
      g.translate(nx + nw / 2, ny + nh / 2); g.rotate(-0.025);
      var ng = g.createLinearGradient(-nw / 2, -nh / 2, nw / 2, nh / 2);
      ng.addColorStop(0, "#f7f4ec"); ng.addColorStop(0.5, "#efeae0"); ng.addColorStop(1, "#e7e1d4");
      g.fillStyle = ng; g.fillRect(-nw / 2, -nh / 2, nw, nh);
      /* linen weave */
      g.strokeStyle = "rgba(150,140,124,0.16)"; g.lineWidth = 1;
      for (var x = -nw / 2; x < nw / 2; x += 7) { g.beginPath(); g.moveTo(x, -nh / 2); g.lineTo(x, nh / 2); g.stroke(); }
      for (var y2 = -nh / 2; y2 < nh / 2; y2 += 7) { g.beginPath(); g.moveTo(-nw / 2, y2); g.lineTo(nw / 2, y2); g.stroke(); }
      /* fold creases */
      g.strokeStyle = "rgba(140,130,112,0.3)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -nh / 2); g.lineTo(2, nh / 2); g.stroke();
      g.beginPath(); g.moveTo(-nw / 2, 4); g.lineTo(nw / 2, 0); g.stroke();
      g.restore();

      /* a cup peeking into the corner */
      g.save();
      g.translate(w * 0.9, h * 0.13);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath(); g.ellipse(6, 96, 108, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e9e3d6";
      g.beginPath(); g.moveTo(-96, -40); g.lineTo(-80, 84); g.lineTo(80, 84); g.lineTo(96, -40); g.closePath(); g.fill();
      g.fillStyle = "#cfc7b6";
      g.beginPath(); g.ellipse(0, -40, 96, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#4a2f1c";
      g.beginPath(); g.ellipse(0, -38, 82, 21, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  });

  /* 6 — big sky over hills ------------------------------------------------- */
  B.push({
    id: "sky", name: "Sky over hills", w: 1400, h: 920, tone: "light",
    region: { x: 7, y: 5, w: 86, h: 52 },
    features: [
      {id: "horizon", kind: "edge", x1: 0, y1: 74, x2: 100, y2: 72, weight: 3, label: "the ridge of hills", note: "the ridge of green hills along the bottom"},
      {id: "clouds", kind: "disc", x: 30, y: 47, r: 9, weight: 1.6, label: "the low cloud", note: "a soft band of low cloud"}
    ],
    render: function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, "#cfe2f0"); lg.addColorStop(0.45, "#e6eff5"); lg.addColorStop(0.72, "#f4efe2"); lg.addColorStop(1, "#dfe6cf");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      var r = rnd(3131);
      /* soft low clouds */
      for (var i = 0; i < 7; i++) {
        var cx = r() * w, cy = h * (0.42 + r() * 0.16), cw = 120 + r() * 220;
        g.fillStyle = "rgba(255,255,255," + (0.28 + r() * 0.3).toFixed(2) + ")";
        for (var b = 0; b < 6; b++) {
          g.beginPath();
          g.ellipse(cx + (b - 3) * cw * 0.22, cy + (r() - 0.5) * 16, cw * (0.2 + r() * 0.18), cw * 0.09, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
      /* hills */
      function hill(base, amp, col) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, h);
        g.lineTo(0, base);
        for (var x = 0; x <= w; x += 24) {
          g.lineTo(x, base - Math.sin(x / w * 5.2 + amp) * amp * 26 - Math.sin(x / w * 13) * 9);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
      }
      hill(h * 0.74, 2.1, "#b9c4a4");
      hill(h * 0.82, 1.2, "#9aab86");
      hill(h * 0.9, 3.4, "#7d9169");
      grain(g, w, h, 9000, 0.03, false);
    }
  });

  /* 7 — snowfield ---------------------------------------------------------- */
  B.push({
    id: "snow", name: "Snowfield", w: 1400, h: 960, tone: "light",
    region: { x: 6, y: 50, w: 88, h: 44 },
    features: [
      {id: "horizon", kind: "edge", x1: 0, y1: 46, x2: 100, y2: 46, weight: 3, label: "the snow horizon", note: "the horizon where the snowfield meets the sky"},
      {id: "trees", kind: "spikes", x: 0, y: 40, w: 100, h: 8, weight: 2, label: "the treeline", note: "a distant treeline of small dark pines"}
    ],
    render: function (g, w, h) {
      var lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, "#c9d6e2"); lg.addColorStop(0.4, "#e2eaf1"); lg.addColorStop(0.46, "#f2f5f8"); lg.addColorStop(1, "#ffffff");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      var r = rnd(5150), horizon = h * 0.46;
      /* distant treeline */
      for (var i = 0; i < 120; i++) {
        var x = r() * w, th = 26 + r() * 52, tw = th * 0.3;
        g.fillStyle = "rgba(74,88,84," + (0.28 + r() * 0.4).toFixed(2) + ")";
        g.beginPath();
        g.moveTo(x, horizon - th); g.lineTo(x - tw, horizon + 4); g.lineTo(x + tw, horizon + 4);
        g.closePath(); g.fill();
      }
      g.fillStyle = "rgba(120,138,150,0.25)";
      g.fillRect(0, horizon, w, 5);
      /* drifts */
      for (var d = 0; d < 5; d++) {
        var y = horizon + 40 + d * ((h - horizon) / 5);
        g.strokeStyle = "rgba(160,178,196," + (0.2 - d * 0.03).toFixed(2) + ")";
        g.lineWidth = 3 + d;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y - 22 - d * 6, w * 0.7, y + 18 + d * 5, w, y - 8);
        g.stroke();
      }
      /* falling snow */
      for (var k = 0; k < 240; k++) {
        g.fillStyle = "rgba(255,255,255," + (0.4 + r() * 0.5).toFixed(2) + ")";
        g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 3, 0, Math.PI * 2); g.fill();
      }
    }
  });

  /* 8 — framed canvas on a wall -------------------------------------------- */
  B.push({
    id: "frame", name: "Framed canvas", w: 1080, h: 1300, tone: "light",
    region: { x: 21, y: 19, w: 58, h: 55 },
    features: [
      {id: "opening", kind: "frame", x: 20, y: 16, w: 60, h: 60, weight: 3, label: "the blank canvas", note: "the blank canvas inside a wooden frame"},
      {id: "wire", kind: "edge", x1: 36, y1: 12, x2: 64, y2: 12, weight: 0.7, label: "the hanging wire", note: "the hanging wire and nail above the frame"}
    ],
    render: function (g, w, h) {
      var lg = g.createRadialGradient(w * 0.5, h * 0.32, 60, w * 0.5, h * 0.5, h * 0.9);
      lg.addColorStop(0, "#d9cdbd"); lg.addColorStop(1, "#b6a894");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      grain(g, w, h, 16000, 0.05, false);
      var fx = w * 0.15, fy = h * 0.12, fw = w * 0.7, fh = h * 0.7;
      shadow(g, function () {
        g.fillStyle = "#6b4a2c"; g.fillRect(fx, fy, fw, fh);
      }, 40, 20, "rgba(0,0,0,0.45)");
      /* frame moulding */
      var mg = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
      mg.addColorStop(0, "#a9773f"); mg.addColorStop(0.5, "#7d5528"); mg.addColorStop(1, "#5f3f1d");
      g.fillStyle = mg; g.fillRect(fx, fy, fw, fh);
      g.strokeStyle = "rgba(255,220,170,0.28)"; g.lineWidth = 4;
      g.strokeRect(fx + 8, fy + 8, fw - 16, fh - 16);
      g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 3;
      g.strokeRect(fx + 44, fy + 44, fw - 88, fh - 88);
      /* canvas */
      var cx = fx + 52, cy = fy + 52, cw = fw - 104, ch = fh - 104;
      var cg = g.createLinearGradient(cx, cy, cx + cw, cy + ch);
      cg.addColorStop(0, "#fbf8f1"); cg.addColorStop(1, "#efe9dc");
      g.fillStyle = cg; g.fillRect(cx, cy, cw, ch);
      g.save();
      g.beginPath(); g.rect(cx, cy, cw, ch); g.clip();
      g.strokeStyle = "rgba(160,148,130,0.16)"; g.lineWidth = 1;
      for (var x = cx; x < cx + cw; x += 6) { g.beginPath(); g.moveTo(x, cy); g.lineTo(x, cy + ch); g.stroke(); }
      for (var y = cy; y < cy + ch; y += 6) { g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + cw, y); g.stroke(); }
      var vg = g.createRadialGradient(cx + cw / 2, cy + ch / 2, cw * 0.2, cx + cw / 2, cy + ch / 2, cw * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(90,74,54,0.14)");
      g.fillStyle = vg; g.fillRect(cx, cy, cw, ch);
      g.restore();
      /* hanging wire */
      g.strokeStyle = "rgba(60,48,36,0.5)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(fx + fw * 0.3, fy); g.lineTo(w / 2, fy - 62); g.lineTo(fx + fw * 0.7, fy); g.stroke();
      g.fillStyle = "#4a3c2c";
      g.beginPath(); g.arc(w / 2, fy - 68, 8, 0, Math.PI * 2); g.fill();
    }
  });

  /* 9 — kraft envelope ------------------------------------------------------ */
  B.push({
    id: "envelope", name: "Kraft envelope", w: 1320, h: 920, tone: "light",
    region: { x: 14, y: 27, w: 72, h: 47 },
    features: [
      {id: "flap", kind: "edge", x1: 7, y1: 10, x2: 50, y2: 43, weight: 1.5, label: "the flap seam", note: "the diagonal seam of the envelope flap"},
      {id: "label", kind: "frame", x: 14, y: 27, w: 72, h: 47, weight: 2.6, label: "the address label", note: "a blank white address label stuck on the envelope"},
      {id: "seal", kind: "disc", x: 88, y: 82, r: 4.5, weight: 2, label: "the wax seal", note: "a red wax seal at the bottom corner"}
    ],
    render: function (g, w, h) {
      g.fillStyle = "#4c4a46"; g.fillRect(0, 0, w, h);
      grain(g, w, h, 6000, 0.06, true);
      var ex = w * 0.07, ey = h * 0.1, ew = w * 0.86, eh = h * 0.8;
      shadow(g, function () {
        g.fillStyle = "#d7b98a"; g.fillRect(ex, ey, ew, eh);
      }, 36, 16, "rgba(0,0,0,0.5)");
      var eg = g.createLinearGradient(ex, ey, ex + ew, ey + eh);
      eg.addColorStop(0, "#e0c395"); eg.addColorStop(0.5, "#d5b585"); eg.addColorStop(1, "#c8a675");
      g.fillStyle = eg; g.fillRect(ex, ey, ew, eh);
      /* kraft fibres */
      var r = rnd(6060);
      for (var i = 0; i < 1400; i++) {
        g.strokeStyle = "rgba(120,90,55," + (0.05 + r() * 0.1).toFixed(3) + ")";
        g.lineWidth = 1;
        var fx = ex + r() * ew, fy = ey + r() * eh, a = r() * Math.PI;
        g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * 12, fy + Math.sin(a) * 12); g.stroke();
      }
      /* flap seams */
      g.strokeStyle = "rgba(120,92,56,0.45)"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew / 2, ey + eh * 0.42); g.lineTo(ex + ew, ey); g.stroke();
      g.beginPath(); g.moveTo(ex, ey + eh); g.lineTo(ex + ew * 0.36, ey + eh * 0.56); g.stroke();
      g.beginPath(); g.moveTo(ex + ew, ey + eh); g.lineTo(ex + ew * 0.64, ey + eh * 0.56); g.stroke();
      /* white label */
      var lx = ex + ew * 0.08, ly = ey + eh * 0.22, lw = ew * 0.84, lh = eh * 0.6;
      shadow(g, function () {
        g.fillStyle = "#fcf9f2"; g.fillRect(lx, ly, lw, lh);
      }, 14, 6, "rgba(60,40,20,0.35)");
      g.fillStyle = "#fcf9f2"; g.fillRect(lx, ly, lw, lh);
      g.strokeStyle = "rgba(150,120,80,0.35)"; g.lineWidth = 1.6;
      g.strokeRect(lx + 6, ly + 6, lw - 12, lh - 12);
      /* wax seal peeking bottom-right */
      g.save();
      g.translate(ex + ew - 62, ey + eh - 52);
      g.fillStyle = "#8e2f2c";
      g.beginPath();
      for (var k = 0; k <= 26; k++) {
        var a2 = (k / 26) * Math.PI * 2;
        var rr = 44 + Math.sin(a2 * 7) * 4;
        g.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
      }
      g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  });

  /* 10 — blueprint (draw in white) ------------------------------------------ */
  B.push({
    id: "blueprint", name: "Blueprint sheet", w: 1400, h: 1000, tone: "dark",
    region: { x: 9, y: 9, w: 82, h: 66 },
    features: [
      {id: "grid", kind: "rules", x: 5, y: 5, w: 90, h: 88, gap: 2.4, weight: 2.6, label: "the blueprint grid", note: "the fine blueprint grid"},
      {id: "title", kind: "frame", x: 68, y: 80, w: 29, h: 15, weight: 1.4, label: "the title block", note: "the title block in the bottom-right corner"},
      {id: "dim", kind: "edge", x1: 4.3, y1: 7.8, x2: 95.7, y2: 7.8, weight: 1.2, label: "the dimension arrow", note: "a dimension arrow running across the top"}
    ],
    render: function (g, w, h) {
      var lg = g.createRadialGradient(w * 0.4, h * 0.35, 80, w * 0.5, h * 0.5, w * 0.8);
      lg.addColorStop(0, "#1d4d86"); lg.addColorStop(1, "#12305a");
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,0.09)"; g.lineWidth = 1;
      for (var x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (var y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 1.6;
      for (var x2 = 0; x2 < w; x2 += 120) { g.beginPath(); g.moveTo(x2, 0); g.lineTo(x2, h); g.stroke(); }
      for (var y2 = 0; y2 < h; y2 += 120) { g.beginPath(); g.moveTo(0, y2); g.lineTo(w, y2); g.stroke(); }
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 3;
      g.strokeRect(30, 30, w - 60, h - 60);
      g.lineWidth = 1.4;
      g.strokeRect(44, 44, w - 88, h - 88);
      /* title block */
      var tw = 400, th = 150;
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2.4;
      g.strokeRect(w - 44 - tw, h - 44 - th, tw, th);
      g.beginPath(); g.moveTo(w - 44 - tw, h - 44 - th + 48); g.lineTo(w - 44, h - 44 - th + 48); g.stroke();
      g.beginPath(); g.moveTo(w - 44 - tw, h - 44 - th + 100); g.lineTo(w - 44, h - 44 - th + 100); g.stroke();
      g.beginPath(); g.moveTo(w - 44 - tw * 0.42, h - 44 - th + 100); g.lineTo(w - 44 - tw * 0.42, h - 44); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.82)";
      g.font = "600 22px 'Courier New', monospace"; g.textAlign = "left";
      g.fillText("DRAWING No.  P-001", w - 30 - tw, h - 44 - th + 32);
      g.fillText("SCALE  1:1", w - 30 - tw, h - 44 - th + 84);
      g.fillText("SHEET 1 OF 1", w - 30 - tw, h - 44 - th + 136);
      g.fillText("REV  A", w - 30 - tw * 0.38, h - 44 - th + 136);
      /* corner dimension arrows */
      g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(60, 78); g.lineTo(w - 60, 78); g.stroke();
      [60, w - 60].forEach(function (px, i) {
        var d = i ? -1 : 1;
        g.beginPath(); g.moveTo(px, 78); g.lineTo(px + d * 14, 72); g.lineTo(px + d * 14, 84); g.closePath();
        g.fillStyle = "rgba(255,255,255,0.45)"; g.fill();
      });
    }
  });

  /* ---------- build data URLs ---------- */

  function build(bg) {
    if (bg._url) return bg._url;
    var c = document.createElement("canvas");
    c.width = bg.w; c.height = bg.h;
    var g = c.getContext("2d");
    bg.render(g, bg.w, bg.h);
    bg._url = c.toDataURL("image/jpeg", 0.9);
    return bg._url;
  }

  global.BACKGROUNDS = B;
  global.buildBackground = build;
})(window);
