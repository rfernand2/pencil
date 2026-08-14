/* motifs.js — the drawable vocabulary.
 *
 * Every motif draws in LOCAL units (100 across the drawing region).
 *   anchor: "base"   -> (x, y) is the bottom-centre, for things that stand on ground
 *           "center" -> (x, y) is the middle, for things that float
 *   size            -> roughly the motif's height in local units
 */
(function (global) {
  "use strict";

  var M = {};

  /* ---------- shared shapes ---------- */

  function ring(cx, cy, rx, ry, n, wobble, rnd) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2;
      pts.push({
        x: cx + Math.cos(t) * rx + (rnd() - 0.5) * wobble,
        y: cy + Math.sin(t) * ry + (rnd() - 0.5) * wobble
      });
    }
    return pts;
  }

  function leafShape(cx, cy, ang, len, wid, rnd) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var px = -dy, py = dx;
    var pts = [], i, t, w, n = 12;
    for (i = 0; i <= n; i++) {
      t = i / n;
      w = Math.sin(t * Math.PI) * wid;
      pts.push({ x: cx + dx * len * t + px * w, y: cy + dy * len * t + py * w });
    }
    for (i = n; i >= 0; i--) {
      t = i / n;
      w = Math.sin(t * Math.PI) * wid;
      pts.push({ x: cx + dx * len * t - px * w, y: cy + dy * len * t - py * w });
    }
    return pts;
  }

  function petalRing(S, cx, cy, r, petals, plen, pwid, col, rnd) {
    for (var i = 0; i < petals; i++) {
      var a = (i / petals) * Math.PI * 2 + rnd() * 0.12;
      S.stroke(leafShape(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, a, plen, pwid, rnd),
        { color: col, width: 0.26, speed: 60 });
    }
  }

  function def(id, meta) { M[id] = meta; }

  /* =====================================================================
   * SKY / CELESTIAL
   * =================================================================== */

  def("sun", {
    tags: ["sun", "sunshine", "summer", "warm", "day", "light", "hot", "sunrise", "sunset"],
    anchor: "center", slot: "sky", size: [10, 20],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.3, rnd = S.rnd;
      S.stroke(ring(x, y, r, r, 26, 0.12, rnd), { color: pal.ink, width: 0.32, speed: 52 });
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2 + 0.2;
        var l = r * (0.35 + rnd() * 0.35);
        S.line(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25,
          x + Math.cos(a) * (r * 1.25 + l), y + Math.sin(a) * (r * 1.25 + l),
          { color: i % 2 ? pal.accent[0] : pal.ink, width: 0.26, speed: 80 });
      }
      S.shade(x, y, r * 0.7, r * 0.7, 0.7, 10, { color: pal.accent[0], width: 0.5, alpha: 0.3 });
    }
  });

  def("moon", {
    tags: ["moon", "night", "crescent", "sleep", "dream", "lunar", "midnight"],
    anchor: "center", slot: "sky", size: [10, 20],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.42, rnd = S.rnd;
      var outer = [], inner = [], i, a;
      for (i = 0; i <= 22; i++) {
        a = -Math.PI * 0.42 + (i / 22) * Math.PI * 1.52;
        outer.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
      }
      for (i = 22; i >= 0; i--) {
        a = -Math.PI * 0.42 + (i / 22) * Math.PI * 1.52;
        inner.push({ x: x + Math.cos(a) * r * 0.62 + r * 0.34, y: y + Math.sin(a) * r * 0.78 });
      }
      S.stroke(outer.concat(inner), { color: pal.ink, width: 0.34, speed: 46 });
      for (i = 0; i < 4; i++) {
        var cx = x - r * 0.1 + (rnd() - 0.5) * r * 0.7;
        var cy = y + (rnd() - 0.5) * r * 1.1;
        S.stroke(ring(cx, cy, r * 0.11, r * 0.09, 8, 0.05, rnd),
          { color: pal.ink2, width: 0.18, alpha: 0.6, speed: 70 });
      }
    }
  });

  def("star", {
    tags: ["star", "stars", "night", "sky", "space", "wish", "sparkle", "magic", "cosmos"],
    anchor: "center", slot: "sky", size: [4, 12],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.5, pts = [];
      for (var i = 0; i <= 10; i++) {
        var a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        var rr = i % 2 === 0 ? r : r * 0.4;
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      S.stroke(pts, { color: pal.accent[0], width: 0.26, speed: 68 });
    }
  });

  def("cloud", {
    tags: ["cloud", "clouds", "sky", "rain", "weather", "storm", "dream", "float"],
    anchor: "center", slot: "sky", size: [8, 18],
    draw: function (S, x, y, s, pal) {
      var w = s * 1.6, h = s * 0.62, rnd = S.rnd;
      var pts = [];
      var bumps = [[-0.5, 0.1, 0.3], [-0.2, -0.34, 0.42], [0.2, -0.26, 0.38], [0.5, 0.06, 0.3]];
      pts.push({ x: x - w * 0.52, y: y + h * 0.42 });
      for (var b = 0; b < bumps.length; b++) {
        for (var i = 0; i <= 10; i++) {
          var a = Math.PI * (1 + i / 10);
          pts.push({
            x: x + bumps[b][0] * w + Math.cos(a) * w * bumps[b][2],
            y: y + bumps[b][1] * h + Math.sin(a) * h * bumps[b][2] * 1.5 + h * 0.4
          });
        }
      }
      pts.push({ x: x + w * 0.52, y: y + h * 0.42 });
      pts.push({ x: x - w * 0.5, y: y + h * 0.46 });
      S.stroke(pts, { color: pal.ink, width: 0.3, speed: 50 });
      S.shade(x, y + h * 0.1, w * 0.4, h * 0.4, 0.35, 8, { color: pal.soft, width: 0.4, alpha: 0.25 });
    }
  });

  def("rain", {
    tags: ["rain", "rainy", "storm", "drizzle", "shower", "monsoon", "wet"],
    anchor: "center", slot: "sky", size: [10, 22],
    draw: function (S, x, y, s, pal) {
      M.cloud.draw(S, x, y - s * 0.28, s * 0.58, pal);
      var rnd = S.rnd;
      for (var i = 0; i < 9; i++) {
        var dx = (rnd() - 0.5) * s * 1.3;
        var dy = s * 0.15 + rnd() * s * 0.55;
        S.line(x + dx, y + dy, x + dx - s * 0.07, y + dy + s * 0.24,
          { color: pal.accent[1] || pal.ink2, width: 0.22, speed: 110, alpha: 0.8 });
      }
    }
  });

  def("snowflake", {
    tags: ["snow", "snowflake", "winter", "cold", "ice", "frost", "christmas"],
    anchor: "center", slot: "sky", size: [5, 12],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.5;
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * Math.PI * 2;
        var ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
        S.line(x, y, ex, ey, { color: pal.accent[0], width: 0.22, speed: 90 });
        var mx = x + Math.cos(a) * r * 0.62, my = y + Math.sin(a) * r * 0.62;
        S.line(mx, my, mx + Math.cos(a + 0.9) * r * 0.26, my + Math.sin(a + 0.9) * r * 0.26,
          { color: pal.accent[0], width: 0.18, speed: 110 });
        S.line(mx, my, mx + Math.cos(a - 0.9) * r * 0.26, my + Math.sin(a - 0.9) * r * 0.26,
          { color: pal.accent[0], width: 0.18, speed: 110 });
      }
    }
  });

  def("rainbow", {
    tags: ["rainbow", "hope", "colour", "color", "pride", "arc", "joy"],
    anchor: "center", slot: "sky", size: [12, 30],
    draw: function (S, x, y, s, pal) {
      var cols = ["#c0392b", "#e08a2e", "#d9b62e", "#4f8f3c", "#3a6ea8", "#6a4b9c"];
      for (var i = 0; i < cols.length; i++) {
        var r = s * (0.75 - i * 0.09);
        S.ellipse(x, y + s * 0.4, r, r, 0, { from: Math.PI, to: Math.PI * 2, n: 24, color: cols[i], width: 0.42, speed: 55, alpha: 0.85 });
      }
    }
  });

  def("comet", {
    tags: ["comet", "meteor", "space", "shooting star", "fast", "cosmos"],
    anchor: "center", slot: "sky", size: [8, 20],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x, y, s * 0.16, s * 0.16, 12, 0.06, rnd), { color: pal.ink, width: 0.28, speed: 60 });
      for (var i = 0; i < 5; i++) {
        var off = (i - 2) * s * 0.08;
        S.curve([[x - s * 0.14, y + off * 0.4], [x - s * 0.6, y + off - s * 0.12], [x - s * 1.1, y + off * 1.4 - s * 0.28]],
          { color: i % 2 ? pal.accent[0] : pal.ink2, width: 0.24, speed: 90, alpha: 0.75 });
      }
    }
  });

  def("planet", {
    tags: ["planet", "saturn", "space", "cosmos", "orbit", "universe", "galaxy", "astronomy"],
    anchor: "center", slot: "sky", size: [10, 24],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.34, rnd = S.rnd;
      S.stroke(ring(x, y, r, r, 24, 0.1, rnd), { color: pal.ink, width: 0.32, speed: 50 });
      S.ellipse(x, y, r * 1.85, r * 0.48, -0.32, { n: 30, color: pal.accent[0], width: 0.28, speed: 60 });
      S.ellipse(x, y, r * 1.55, r * 0.38, -0.32, { n: 26, color: pal.accent[0], width: 0.2, speed: 70, alpha: 0.7 });
      S.shade(x - r * 0.25, y + r * 0.1, r * 0.55, r * 0.5, 1.1, 12, { color: pal.soft, width: 0.45, alpha: 0.3 });
    }
  });

  /* =====================================================================
   * PLANTS
   * =================================================================== */

  def("tree", {
    tags: ["tree", "oak", "forest", "wood", "nature", "park", "shade", "green"],
    anchor: "base", slot: "ground", size: [18, 44],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, th = s * 0.42, tw = s * 0.09;
      S.curve([[x - tw, y], [x - tw * 0.75, y - th * 0.6], [x - tw * 0.5, y - th]], { color: pal.ink, width: 0.4, speed: 42 });
      S.curve([[x + tw, y], [x + tw * 0.8, y - th * 0.6], [x + tw * 0.5, y - th]], { color: pal.ink, width: 0.4, speed: 42 });
      S.line(x - tw * 0.5, y - th * 0.55, x - tw * 2.1, y - th * 0.95, { color: pal.ink, width: 0.28, speed: 60 });
      S.line(x + tw * 0.5, y - th * 0.65, x + tw * 2.2, y - th * 1.05, { color: pal.ink, width: 0.28, speed: 60 });

      var cy = y - s * 0.66, cr = s * 0.36;
      var pts = [], i;
      for (i = 0; i <= 34; i++) {
        var a = (i / 34) * Math.PI * 2;
        var wob = 0.78 + Math.sin(a * 5 + 1.2) * 0.16 + rnd() * 0.1;
        pts.push({ x: x + Math.cos(a) * cr * 1.15 * wob, y: cy + Math.sin(a) * cr * wob });
      }
      S.stroke(pts, { color: pal.ink, width: 0.3, speed: 44 });
      S.shade(x, cy, cr * 0.95, cr * 0.78, 0.6, 34, { color: pal.leaf, width: 0.6, alpha: 0.32 });
      for (i = 0; i < 5; i++) {
        S.shade(x + (rnd() - 0.5) * cr * 1.6, cy + (rnd() - 0.5) * cr * 1.2, cr * 0.22, cr * 0.2, rnd() * 3, 4,
          { color: pal.accent[1] || pal.leaf, width: 0.5, alpha: 0.3 });
      }
      S.line(x - s * 0.2, y, x + s * 0.2, y, { color: pal.ink2, width: 0.22, speed: 70, alpha: 0.7 });
    }
  });

  def("pine", {
    tags: ["pine", "fir", "spruce", "forest", "christmas", "mountain", "woods", "conifer"],
    anchor: "base", slot: "ground", size: [16, 40],
    draw: function (S, x, y, s, pal) {
      var tiers = 4, top = y - s;
      S.line(x - s * 0.045, y, x - s * 0.045, y - s * 0.12, { color: pal.ink, width: 0.3, speed: 60 });
      S.line(x + s * 0.045, y, x + s * 0.045, y - s * 0.12, { color: pal.ink, width: 0.3, speed: 60 });
      for (var t = 0; t < tiers; t++) {
        var f = t / tiers;
        var w = s * (0.14 + f * 0.24);
        var yt = top + (s * 0.88) * f;
        var yb = top + (s * 0.88) * (f + 0.42);
        S.stroke([{ x: x, y: yt }, { x: x - w * 0.5, y: (yt + yb) / 2 }, { x: x - w, y: yb },
        { x: x, y: yb - s * 0.03 }, { x: x + w, y: yb }, { x: x + w * 0.5, y: (yt + yb) / 2 }, { x: x, y: yt }],
          { color: pal.ink, width: 0.28, speed: 50 });
        S.shade(x, (yt + yb) / 2, w * 0.6, (yb - yt) * 0.3, 1.2, 8, { color: pal.leaf, width: 0.55, alpha: 0.3 });
      }
    }
  });

  def("flower", {
    tags: ["flower", "flowers", "bloom", "blossom", "daisy", "rose", "garden", "spring", "love", "petal"],
    anchor: "base", slot: "ground", size: [10, 28],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, hy = y - s * 0.76;
      S.curve([[x, y], [x + s * 0.06, y - s * 0.4], [x, hy]], { color: pal.leaf, width: 0.3, speed: 55 });
      S.stroke(leafShape(x, y - s * 0.4, -0.4, s * 0.24, s * 0.07, rnd), { color: pal.leaf, width: 0.24, speed: 70 });
      S.stroke(leafShape(x, y - s * 0.28, Math.PI + 0.4, s * 0.2, s * 0.06, rnd), { color: pal.leaf, width: 0.24, speed: 70 });
      petalRing(S, x, hy, s * 0.16, 7, s * 0.2, s * 0.075, pal.accent[0], rnd);
      S.stroke(ring(x, hy, s * 0.075, s * 0.075, 12, 0.05, rnd), { color: pal.ink, width: 0.24, speed: 70 });
      S.shade(x, hy, s * 0.06, s * 0.06, 0.5, 5, { color: pal.accent[1] || pal.accent[0], width: 0.4, alpha: 0.45 });
    }
  });

  def("leaf", {
    tags: ["leaf", "leaves", "autumn", "fall", "botanical", "plant", "nature"],
    anchor: "center", slot: "any", size: [6, 16],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, a = -0.7 + rnd() * 1.4;
      S.stroke(leafShape(x - Math.cos(a) * s * 0.4, y - Math.sin(a) * s * 0.4, a, s * 0.8, s * 0.22, rnd),
        { color: pal.ink, width: 0.26, speed: 56 });
      S.line(x - Math.cos(a) * s * 0.38, y - Math.sin(a) * s * 0.38,
        x + Math.cos(a) * s * 0.36, y + Math.sin(a) * s * 0.36,
        { color: pal.ink2, width: 0.18, speed: 80, alpha: 0.75 });
      S.shade(x, y, s * 0.22, s * 0.14, a, 6, { color: pal.leaf, width: 0.45, alpha: 0.3 });
    }
  });

  def("fern", {
    tags: ["fern", "frond", "jungle", "botanical", "plant", "forest", "green"],
    anchor: "base", slot: "ground", size: [12, 30],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      var spine = global.PX.smooth([[x, y], [x + s * 0.1, y - s * 0.5], [x - s * 0.05, y - s]], 8, false);
      S.stroke(spine, { color: pal.leaf, width: 0.3, speed: 48 });
      for (var i = 1; i < 9; i++) {
        var p = spine[Math.floor((i / 9) * (spine.length - 1))];
        var l = s * 0.3 * (1 - i / 11);
        S.stroke(leafShape(p.x, p.y, -0.5, l, l * 0.28, rnd), { color: pal.leaf, width: 0.2, speed: 90 });
        S.stroke(leafShape(p.x, p.y, Math.PI + 0.5, l, l * 0.28, rnd), { color: pal.leaf, width: 0.2, speed: 90 });
      }
    }
  });

  def("mushroom", {
    tags: ["mushroom", "toadstool", "fungi", "forest", "cottagecore", "woodland"],
    anchor: "base", slot: "ground", size: [8, 20],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, capY = y - s * 0.6, capW = s * 0.44;
      S.curve([[x - s * 0.13, y], [x - s * 0.16, y - s * 0.35], [x - s * 0.13, capY]], { color: pal.ink, width: 0.3, speed: 55 });
      S.curve([[x + s * 0.13, y], [x + s * 0.16, y - s * 0.35], [x + s * 0.13, capY]], { color: pal.ink, width: 0.3, speed: 55 });
      S.quad(x - capW, capY, x, capY - s * 0.62, x + capW, capY, { n: 18, color: pal.ink, width: 0.32, speed: 46 });
      S.line(x - capW, capY, x + capW, capY, { color: pal.ink, width: 0.24, speed: 70 });
      S.shade(x, capY - s * 0.2, capW * 0.7, s * 0.18, 0.3, 12, { color: pal.accent[0], width: 0.5, alpha: 0.4 });
      for (var i = 0; i < 4; i++) {
        S.dot(x + (rnd() - 0.5) * capW * 1.3, capY - s * 0.1 - rnd() * s * 0.32, s * 0.045,
          { color: pal.paperDark ? pal.ink : "#fbf6ec", alpha: 0.9 });
      }
    }
  });

  def("cactus", {
    tags: ["cactus", "desert", "succulent", "arizona", "dry", "southwest", "prickly"],
    anchor: "base", slot: "ground", size: [14, 34],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, w = s * 0.16;
      S.stroke([{ x: x - w, y: y }, { x: x - w, y: y - s * 0.78 }, { x: x - w * 0.5, y: y - s * 0.95 },
      { x: x + w * 0.5, y: y - s * 0.95 }, { x: x + w, y: y - s * 0.78 }, { x: x + w, y: y }],
        { color: pal.leaf, width: 0.34, speed: 46 });
      S.stroke([{ x: x - w, y: y - s * 0.5 }, { x: x - w * 2.6, y: y - s * 0.5 }, { x: x - w * 3.2, y: y - s * 0.62 },
      { x: x - w * 3.2, y: y - s * 0.8 }], { color: pal.leaf, width: 0.3, speed: 55 });
      S.stroke([{ x: x + w, y: y - s * 0.62 }, { x: x + w * 2.4, y: y - s * 0.62 }, { x: x + w * 2.9, y: y - s * 0.74 },
      { x: x + w * 2.9, y: y - s * 0.95 }], { color: pal.leaf, width: 0.3, speed: 55 });
      for (var i = 0; i < 12; i++) {
        var px = x + (rnd() - 0.5) * w * 1.4, py = y - rnd() * s * 0.85;
        S.line(px, py, px + (rnd() - 0.5) * s * 0.06, py - s * 0.04, { color: pal.ink2, width: 0.16, speed: 130, alpha: 0.7 });
      }
      S.shade(x, y - s * 0.45, w * 0.7, s * 0.32, 1.4, 10, { color: pal.leaf, width: 0.5, alpha: 0.22 });
    }
  });

  def("mountain", {
    tags: ["mountain", "mountains", "peak", "alps", "hike", "summit", "range", "hill", "everest"],
    anchor: "base", slot: "horizon", size: [22, 50],
    draw: function (S, x, y, s, pal) {
      var w = s * 1.5;
      S.stroke([{ x: x - w, y: y }, { x: x - w * 0.32, y: y - s * 0.72 }, { x: x - w * 0.12, y: y - s * 0.48 },
      { x: x + w * 0.18, y: y - s }, { x: x + w, y: y }], { color: pal.ink, width: 0.36, speed: 42 });
      S.stroke([{ x: x + w * 0.03, y: y - s * 0.78 }, { x: x + w * 0.1, y: y - s * 0.86 },
      { x: x + w * 0.18, y: y - s }, { x: x + w * 0.3, y: y - s * 0.82 }, { x: x + w * 0.38, y: y - s * 0.72 }],
        { color: pal.ink2, width: 0.24, speed: 60 });
      S.shade(x + w * 0.35, y - s * 0.35, w * 0.28, s * 0.24, 1.15, 12, { color: pal.soft, width: 0.5, alpha: 0.28 });
      S.shade(x - w * 0.5, y - s * 0.25, w * 0.22, s * 0.18, 1.15, 8, { color: pal.soft, width: 0.5, alpha: 0.2 });
    }
  });

  def("wave", {
    tags: ["wave", "waves", "sea", "ocean", "surf", "water", "beach", "tide", "sail"],
    anchor: "center", slot: "any", size: [8, 24],
    draw: function (S, x, y, s, pal) {
      var col = pal.accent[2] || pal.accent[0];
      S.curve([[x - s * 0.9, y], [x - s * 0.45, y - s * 0.28], [x, y], [x + s * 0.45, y + s * 0.28], [x + s * 0.9, y]],
        { color: col, width: 0.3, speed: 60 });
      S.curve([[x - s * 0.8, y + s * 0.22], [x - s * 0.35, y - s * 0.04], [x + s * 0.1, y + s * 0.22], [x + s * 0.6, y + s * 0.42]],
        { color: col, width: 0.22, speed: 75, alpha: 0.7 });
    }
  });

  /* =====================================================================
   * CREATURES
   * =================================================================== */

  def("cat", {
    tags: ["cat", "kitten", "kitty", "feline", "pet", "meow", "tabby"],
    anchor: "base", slot: "ground", size: [12, 30],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      var bx = x, by = y - s * 0.3, br = s * 0.3;
      S.stroke(ring(bx, by, br * 0.85, br, 22, 0.08, rnd), { color: pal.ink, width: 0.3, speed: 48 });
      var hx = x + s * 0.02, hy = y - s * 0.74, hr = s * 0.2;
      S.stroke(ring(hx, hy, hr, hr * 0.9, 18, 0.06, rnd), { color: pal.ink, width: 0.28, speed: 52 });
      S.stroke([{ x: hx - hr * 0.85, y: hy - hr * 0.4 }, { x: hx - hr * 1.0, y: hy - hr * 1.3 }, { x: hx - hr * 0.25, y: hy - hr * 0.85 }],
        { color: pal.ink, width: 0.26, speed: 65 });
      S.stroke([{ x: hx + hr * 0.85, y: hy - hr * 0.4 }, { x: hx + hr * 1.0, y: hy - hr * 1.3 }, { x: hx + hr * 0.25, y: hy - hr * 0.85 }],
        { color: pal.ink, width: 0.26, speed: 65 });
      S.dot(hx - hr * 0.38, hy - hr * 0.05, s * 0.028, { color: pal.ink });
      S.dot(hx + hr * 0.38, hy - hr * 0.05, s * 0.028, { color: pal.ink });
      S.stroke([{ x: hx - hr * 0.1, y: hy + hr * 0.28 }, { x: hx, y: hy + hr * 0.4 }, { x: hx + hr * 0.1, y: hy + hr * 0.28 }],
        { color: pal.accent[0], width: 0.22, speed: 80 });
      for (var i = 0; i < 3; i++) {
        var wy = hy + hr * (0.28 + i * 0.14);
        S.line(hx - hr * 0.3, wy, hx - hr * 1.5, wy - hr * 0.15 + i * hr * 0.16, { color: pal.ink2, width: 0.16, speed: 130 });
        S.line(hx + hr * 0.3, wy, hx + hr * 1.5, wy - hr * 0.15 + i * hr * 0.16, { color: pal.ink2, width: 0.16, speed: 130 });
      }
      S.curve([[bx + br * 0.8, by + br * 0.5], [bx + br * 1.9, by + br * 0.2], [bx + br * 1.7, by - br * 0.9]],
        { color: pal.ink, width: 0.28, speed: 55 });
      S.line(bx - br * 0.45, y, bx - br * 0.45, y - s * 0.06, { color: pal.ink, width: 0.24, speed: 90 });
      S.line(bx + br * 0.3, y, bx + br * 0.3, y - s * 0.06, { color: pal.ink, width: 0.24, speed: 90 });
      S.shade(bx, by, br * 0.55, br * 0.6, 1.1, 12, { color: pal.accent[1] || pal.soft, width: 0.5, alpha: 0.28 });
    }
  });

  def("bird", {
    tags: ["bird", "birds", "sparrow", "robin", "fly", "wing", "song", "swallow", "flight", "freedom"],
    anchor: "center", slot: "sky", size: [6, 18],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x, y, s * 0.34, s * 0.26, 18, 0.06, rnd), { color: pal.ink, width: 0.28, speed: 55 });
      S.stroke(ring(x - s * 0.34, y - s * 0.2, s * 0.15, s * 0.14, 14, 0.04, rnd), { color: pal.ink, width: 0.26, speed: 62 });
      S.stroke([{ x: x - s * 0.47, y: y - s * 0.2 }, { x: x - s * 0.62, y: y - s * 0.15 }, { x: x - s * 0.46, y: y - s * 0.09 }],
        { color: pal.accent[0], width: 0.22, speed: 90 });
      S.dot(x - s * 0.36, y - s * 0.24, s * 0.026, { color: pal.ink });
      S.curve([[x - s * 0.1, y - s * 0.14], [x + s * 0.12, y - s * 0.42], [x + s * 0.34, y - s * 0.1]],
        { color: pal.ink, width: 0.26, speed: 60 });
      S.curve([[x + s * 0.3, y + s * 0.08], [x + s * 0.6, y - s * 0.06], [x + s * 0.72, y + s * 0.2]],
        { color: pal.ink, width: 0.26, speed: 60 });
      S.shade(x, y, s * 0.2, s * 0.15, 0.5, 8, { color: pal.accent[1] || pal.soft, width: 0.45, alpha: 0.3 });
    }
  });

  def("owl", {
    tags: ["owl", "wise", "night", "hoot", "woodland", "forest"],
    anchor: "base", slot: "ground", size: [12, 28],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke([{ x: x - s * 0.3, y: y }, { x: x - s * 0.34, y: y - s * 0.5 }, { x: x - s * 0.2, y: y - s * 0.86 },
      { x: x, y: y - s * 0.95 }, { x: x + s * 0.2, y: y - s * 0.86 }, { x: x + s * 0.34, y: y - s * 0.5 },
      { x: x + s * 0.3, y: y }, { x: x - s * 0.3, y: y }], { color: pal.ink, width: 0.3, speed: 46 });
      S.stroke([{ x: x - s * 0.3, y: y - s * 0.82 }, { x: x - s * 0.22, y: y - s * 1.0 }, { x: x - s * 0.06, y: y - s * 0.86 }],
        { color: pal.ink, width: 0.24, speed: 75 });
      S.stroke([{ x: x + s * 0.3, y: y - s * 0.82 }, { x: x + s * 0.22, y: y - s * 1.0 }, { x: x + s * 0.06, y: y - s * 0.86 }],
        { color: pal.ink, width: 0.24, speed: 75 });
      var ey = y - s * 0.68, er = s * 0.14;
      S.stroke(ring(x - s * 0.15, ey, er, er, 14, 0.04, rnd), { color: pal.ink, width: 0.24, speed: 70 });
      S.stroke(ring(x + s * 0.15, ey, er, er, 14, 0.04, rnd), { color: pal.ink, width: 0.24, speed: 70 });
      S.dot(x - s * 0.15, ey, er * 0.42, { color: pal.ink });
      S.dot(x + s * 0.15, ey, er * 0.42, { color: pal.ink });
      S.stroke([{ x: x - s * 0.05, y: ey + er * 0.5 }, { x: x, y: ey + er * 1.2 }, { x: x + s * 0.05, y: ey + er * 0.5 }],
        { color: pal.accent[0], width: 0.22, speed: 90 });
      for (var i = 0; i < 3; i++) {
        S.curve([[x - s * 0.24, y - s * 0.42 + i * s * 0.13], [x, y - s * 0.34 + i * s * 0.13], [x + s * 0.24, y - s * 0.42 + i * s * 0.13]],
          { color: pal.ink2, width: 0.18, speed: 90, alpha: 0.75 });
      }
    }
  });

  def("fish", {
    tags: ["fish", "sea", "ocean", "aquarium", "swim", "river", "koi", "pond"],
    anchor: "center", slot: "any", size: [6, 18],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke([{ x: x - s * 0.5, y: y }, { x: x - s * 0.1, y: y - s * 0.3 }, { x: x + s * 0.34, y: y },
      { x: x - s * 0.1, y: y + s * 0.3 }, { x: x - s * 0.5, y: y }], { color: pal.ink, width: 0.28, speed: 55 });
      S.stroke([{ x: x + s * 0.34, y: y }, { x: x + s * 0.6, y: y - s * 0.24 }, { x: x + s * 0.54, y: y },
      { x: x + s * 0.6, y: y + s * 0.24 }, { x: x + s * 0.34, y: y }], { color: pal.ink, width: 0.24, speed: 70 });
      S.dot(x - s * 0.34, y - s * 0.05, s * 0.03, { color: pal.ink });
      S.curve([[x - s * 0.14, y - s * 0.2], [x - s * 0.06, y], [x - s * 0.14, y + s * 0.2]], { color: pal.ink2, width: 0.18, speed: 90 });
      S.shade(x + s * 0.02, y, s * 0.2, s * 0.14, 0.4, 8, { color: pal.accent[2] || pal.accent[0], width: 0.45, alpha: 0.34 });
    }
  });

  def("whale", {
    tags: ["whale", "ocean", "sea", "deep", "blue", "marine", "dream"],
    anchor: "center", slot: "any", size: [12, 32],
    draw: function (S, x, y, s, pal) {
      S.stroke([{ x: x - s * 0.6, y: y }, { x: x - s * 0.3, y: y - s * 0.26 }, { x: x + s * 0.2, y: y - s * 0.22 },
      { x: x + s * 0.55, y: y - s * 0.05 }, { x: x + s * 0.72, y: y - s * 0.3 }, { x: x + s * 0.78, y: y + s * 0.05 },
      { x: x + s * 0.5, y: y + s * 0.2 }, { x: x - s * 0.1, y: y + s * 0.26 }, { x: x - s * 0.6, y: y }],
        { color: pal.ink, width: 0.3, speed: 46 });
      S.curve([[x - s * 0.55, y + s * 0.06], [x - s * 0.1, y + s * 0.18], [x + s * 0.42, y + s * 0.14]],
        { color: pal.ink2, width: 0.2, speed: 80, alpha: 0.8 });
      S.dot(x - s * 0.46, y - s * 0.06, s * 0.028, { color: pal.ink });
      S.curve([[x - s * 0.25, y - s * 0.26], [x - s * 0.3, y - s * 0.55], [x - s * 0.14, y - s * 0.72]],
        { color: pal.accent[2] || pal.accent[0], width: 0.22, speed: 80 });
      S.curve([[x - s * 0.25, y - s * 0.26], [x - s * 0.14, y - s * 0.55], [x - s * 0.32, y - s * 0.68]],
        { color: pal.accent[2] || pal.accent[0], width: 0.22, speed: 80 });
      S.shade(x, y, s * 0.3, s * 0.13, 0.1, 12, { color: pal.accent[2] || pal.soft, width: 0.5, alpha: 0.25 });
    }
  });

  def("butterfly", {
    tags: ["butterfly", "moth", "wings", "spring", "garden", "transform", "delicate"],
    anchor: "center", slot: "any", size: [6, 18],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.line(x, y - s * 0.28, x, y + s * 0.3, { color: pal.ink, width: 0.24, speed: 80 });
      var w = s * 0.44;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d, i) {
        var f = i > 1 ? 0.72 : 1;
        S.stroke([{ x: x, y: y - s * 0.02 },
        { x: x + d[0] * w * 0.9 * f, y: y + d[1] * w * 0.85 * f - s * 0.05 },
        { x: x + d[0] * w * 1.05 * f, y: y + d[1] * w * 0.2 * f },
        { x: x, y: y + s * 0.05 }], { color: pal.ink, width: 0.24, speed: 62 });
        S.shade(x + d[0] * w * 0.55 * f, y + d[1] * w * 0.42 * f, w * 0.25 * f, w * 0.22 * f, rnd() * 3, 6,
          { color: pal.accent[i % pal.accent.length], width: 0.45, alpha: 0.4 });
      });
      S.curve([[x, y - s * 0.28], [x - s * 0.1, y - s * 0.42], [x - s * 0.18, y - s * 0.36]], { color: pal.ink, width: 0.16, speed: 110 });
      S.curve([[x, y - s * 0.28], [x + s * 0.1, y - s * 0.42], [x + s * 0.18, y - s * 0.36]], { color: pal.ink, width: 0.16, speed: 110 });
    }
  });

  def("bee", {
    tags: ["bee", "honey", "buzz", "hive", "garden", "pollinate", "wasp"],
    anchor: "center", slot: "any", size: [4, 12],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x, y, s * 0.4, s * 0.28, 18, 0.05, rnd), { color: pal.ink, width: 0.26, speed: 60 });
      for (var i = -1; i <= 1; i++) {
        S.line(x + i * s * 0.16, y - s * 0.24, x + i * s * 0.16, y + s * 0.24, { color: pal.ink, width: 0.24, speed: 90 });
      }
      S.shade(x, y, s * 0.3, s * 0.2, 0, 8, { color: pal.accent[0], width: 0.45, alpha: 0.4 });
      S.stroke(ring(x - s * 0.16, y - s * 0.42, s * 0.22, s * 0.14, 12, 0.04, rnd), { color: pal.ink2, width: 0.18, alpha: 0.7, speed: 90 });
      S.stroke(ring(x + s * 0.16, y - s * 0.42, s * 0.22, s * 0.14, 12, 0.04, rnd), { color: pal.ink2, width: 0.18, alpha: 0.7, speed: 90 });
    }
  });

  def("snail", {
    tags: ["snail", "slow", "shell", "spiral", "garden", "patience"],
    anchor: "base", slot: "ground", size: [6, 16],
    draw: function (S, x, y, s, pal) {
      var pts = [], i;
      for (i = 0; i <= 60; i++) {
        var t = (i / 60) * Math.PI * 5.2;
        var r = s * 0.05 + (i / 60) * s * 0.36;
        pts.push({ x: x + Math.cos(t) * r, y: y - s * 0.42 + Math.sin(t) * r });
      }
      S.stroke(pts, { color: pal.ink, width: 0.26, speed: 52 });
      S.curve([[x - s * 0.42, y], [x - s * 0.6, y - s * 0.1], [x - s * 0.66, y - s * 0.34]], { color: pal.ink, width: 0.26, speed: 65 });
      S.curve([[x + s * 0.3, y], [x - s * 0.2, y], [x - s * 0.6, y - s * 0.02]], { color: pal.ink, width: 0.26, speed: 70 });
      S.line(x - s * 0.66, y - s * 0.34, x - s * 0.72, y - s * 0.52, { color: pal.ink, width: 0.18, speed: 110 });
      S.dot(x - s * 0.72, y - s * 0.54, s * 0.035, { color: pal.ink });
    }
  });

  def("rabbit", {
    tags: ["rabbit", "bunny", "hare", "easter", "meadow", "hop"],
    anchor: "base", slot: "ground", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x, y - s * 0.26, s * 0.3, s * 0.26, 20, 0.06, rnd), { color: pal.ink, width: 0.3, speed: 50 });
      var hx = x - s * 0.22, hy = y - s * 0.58;
      S.stroke(ring(hx, hy, s * 0.18, s * 0.16, 16, 0.05, rnd), { color: pal.ink, width: 0.28, speed: 58 });
      S.stroke(leafShape(hx - s * 0.04, hy - s * 0.12, -1.5, s * 0.4, s * 0.055, rnd), { color: pal.ink, width: 0.24, speed: 70 });
      S.stroke(leafShape(hx + s * 0.08, hy - s * 0.12, -1.25, s * 0.36, s * 0.05, rnd), { color: pal.ink, width: 0.24, speed: 70 });
      S.dot(hx - s * 0.06, hy - s * 0.02, s * 0.028, { color: pal.ink });
      S.dot(hx - s * 0.16, hy + s * 0.06, s * 0.022, { color: pal.accent[0] });
      S.stroke(ring(x + s * 0.3, y - s * 0.22, s * 0.09, s * 0.09, 12, 0.04, rnd), { color: pal.ink, width: 0.22, speed: 80 });
      S.shade(x, y - s * 0.26, s * 0.2, s * 0.16, 1.0, 10, { color: pal.soft, width: 0.45, alpha: 0.25 });
    }
  });

  /* =====================================================================
   * PLACES & THINGS
   * =================================================================== */

  def("house", {
    tags: ["house", "home", "cottage", "village", "roof", "cabin", "family"],
    anchor: "base", slot: "ground", size: [14, 34],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.46, wallTop = y - s * 0.6;
      S.stroke([{ x: x - w, y: y }, { x: x - w, y: wallTop }, { x: x + w, y: wallTop }, { x: x + w, y: y }, { x: x - w, y: y }],
        { color: pal.ink, width: 0.32, speed: 46 });
      S.stroke([{ x: x - w * 1.2, y: wallTop }, { x: x, y: y - s }, { x: x + w * 1.2, y: wallTop }],
        { color: pal.ink, width: 0.32, speed: 50 });
      S.stroke([{ x: x - w * 0.22, y: y }, { x: x - w * 0.22, y: y - s * 0.3 }, { x: x + w * 0.22, y: y - s * 0.3 }, { x: x + w * 0.22, y: y }],
        { color: pal.ink, width: 0.26, speed: 65 });
      S.stroke([{ x: x + w * 0.46, y: y - s * 0.5 }, { x: x + w * 0.46, y: y - s * 0.32 }, { x: x + w * 0.78, y: y - s * 0.32 },
      { x: x + w * 0.78, y: y - s * 0.5 }, { x: x + w * 0.46, y: y - s * 0.5 }], { color: pal.ink, width: 0.24, speed: 70 });
      S.line(x + w * 0.62, y - s * 0.5, x + w * 0.62, y - s * 0.32, { color: pal.ink, width: 0.18, speed: 110 });
      S.stroke([{ x: x + w * 0.5, y: y - s * 0.86 }, { x: x + w * 0.5, y: y - s * 1.12 }, { x: x + w * 0.78, y: y - s * 1.12 }, { x: x + w * 0.78, y: y - s * 0.74 }],
        { color: pal.ink, width: 0.26, speed: 65 });
      S.shade(x, y - s * 0.78, w * 0.7, s * 0.16, 0.5, 14, { color: pal.accent[0], width: 0.5, alpha: 0.3 });
      S.shade(x + w * 0.62, y - s * 0.41, w * 0.13, s * 0.07, 0.9, 5, { color: pal.accent[1] || pal.accent[0], width: 0.4, alpha: 0.5 });
    }
  });

  def("castle", {
    tags: ["castle", "fortress", "fairytale", "king", "queen", "tower", "kingdom", "medieval"],
    anchor: "base", slot: "ground", size: [20, 46],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.6;
      S.stroke([{ x: x - w, y: y }, { x: x - w, y: y - s * 0.5 }, { x: x + w, y: y - s * 0.5 }, { x: x + w, y: y }, { x: x - w, y: y }],
        { color: pal.ink, width: 0.32, speed: 46 });
      var cren = [];
      for (var i = 0; i <= 6; i++) {
        var cx = x - w + (i / 6) * w * 2;
        cren.push({ x: cx, y: y - s * 0.5 - (i % 2 ? 0 : s * 0.08) });
        cren.push({ x: cx + w * 0.14, y: y - s * 0.5 - (i % 2 ? 0 : s * 0.08) });
      }
      S.stroke(cren, { color: pal.ink, width: 0.26, speed: 60 });
      [-1, 1].forEach(function (d) {
        var tx = x + d * w * 1.15;
        S.stroke([{ x: tx - s * 0.16, y: y }, { x: tx - s * 0.16, y: y - s * 0.8 }, { x: tx + s * 0.16, y: y - s * 0.8 }, { x: tx + s * 0.16, y: y }],
          { color: pal.ink, width: 0.3, speed: 50 });
        S.stroke([{ x: tx - s * 0.24, y: y - s * 0.8 }, { x: tx, y: y - s * 1.08 }, { x: tx + s * 0.24, y: y - s * 0.8 }],
          { color: pal.accent[0], width: 0.3, speed: 55 });
        S.line(tx, y - s * 1.08, tx, y - s * 1.24, { color: pal.ink, width: 0.2, speed: 100 });
        S.stroke([{ x: tx, y: y - s * 1.24 }, { x: tx + s * 0.2, y: y - s * 1.18 }, { x: tx, y: y - s * 1.12 }],
          { color: pal.accent[0], width: 0.22, speed: 90 });
      });
      S.stroke([{ x: x - s * 0.14, y: y }, { x: x - s * 0.14, y: y - s * 0.24 }, { x: x, y: y - s * 0.34 },
      { x: x + s * 0.14, y: y - s * 0.24 }, { x: x + s * 0.14, y: y }], { color: pal.ink, width: 0.26, speed: 65 });
      S.shade(x, y - s * 0.25, w * 0.7, s * 0.16, 1.2, 12, { color: pal.soft, width: 0.5, alpha: 0.2 });
    }
  });

  def("lighthouse", {
    tags: ["lighthouse", "coast", "beacon", "harbour", "harbor", "guide", "shore"],
    anchor: "base", slot: "ground", size: [18, 42],
    draw: function (S, x, y, s, pal) {
      var bw = s * 0.22, tw = s * 0.13;
      S.stroke([{ x: x - bw, y: y }, { x: x - tw, y: y - s * 0.72 }], { color: pal.ink, width: 0.32, speed: 48 });
      S.stroke([{ x: x + bw, y: y }, { x: x + tw, y: y - s * 0.72 }], { color: pal.ink, width: 0.32, speed: 48 });
      for (var i = 1; i <= 3; i++) {
        var f = i / 4;
        var w2 = bw + (tw - bw) * f;
        S.line(x - w2, y - s * 0.72 * f, x + w2, y - s * 0.72 * f, { color: pal.accent[0], width: 0.3, speed: 80, alpha: 0.75 });
      }
      S.line(x - tw * 1.5, y - s * 0.72, x + tw * 1.5, y - s * 0.72, { color: pal.ink, width: 0.26, speed: 80 });
      S.stroke([{ x: x - tw, y: y - s * 0.72 }, { x: x - tw, y: y - s * 0.9 }, { x: x + tw, y: y - s * 0.9 }, { x: x + tw, y: y - s * 0.72 }],
        { color: pal.ink, width: 0.26, speed: 70 });
      S.stroke([{ x: x - tw * 1.4, y: y - s * 0.9 }, { x: x, y: y - s * 1.04 }, { x: x + tw * 1.4, y: y - s * 0.9 }],
        { color: pal.ink, width: 0.26, speed: 75 });
      S.line(x + tw, y - s * 0.82, x + s * 0.6, y - s * 0.94, { color: pal.accent[0], width: 0.22, speed: 110, alpha: 0.6 });
      S.line(x + tw, y - s * 0.8, x + s * 0.62, y - s * 0.7, { color: pal.accent[0], width: 0.22, speed: 110, alpha: 0.6 });
      S.shade(x, y - s * 0.82, tw * 0.7, s * 0.06, 0, 5, { color: pal.accent[0], width: 0.4, alpha: 0.55 });
    }
  });

  def("sailboat", {
    tags: ["boat", "sailboat", "sail", "sea", "ocean", "voyage", "yacht", "ship", "journey"],
    anchor: "center", slot: "any", size: [12, 30],
    draw: function (S, x, y, s, pal) {
      S.stroke([{ x: x - s * 0.5, y: y + s * 0.24 }, { x: x - s * 0.35, y: y + s * 0.44 },
      { x: x + s * 0.38, y: y + s * 0.44 }, { x: x + s * 0.55, y: y + s * 0.24 }, { x: x - s * 0.5, y: y + s * 0.24 }],
        { color: pal.ink, width: 0.32, speed: 50 });
      S.line(x - s * 0.02, y + s * 0.22, x - s * 0.02, y - s * 0.62, { color: pal.ink, width: 0.26, speed: 65 });
      S.stroke([{ x: x + s * 0.04, y: y - s * 0.6 }, { x: x + s * 0.44, y: y + s * 0.18 }, { x: x + s * 0.04, y: y + s * 0.18 }],
        { color: pal.ink, width: 0.28, speed: 55 });
      S.stroke([{ x: x - s * 0.08, y: y - s * 0.52 }, { x: x - s * 0.36, y: y + s * 0.18 }, { x: x - s * 0.08, y: y + s * 0.18 }],
        { color: pal.ink, width: 0.28, speed: 58 });
      S.shade(x + s * 0.18, y - s * 0.14, s * 0.12, s * 0.2, 1.2, 8, { color: pal.accent[0], width: 0.45, alpha: 0.32 });
      S.curve([[x - s * 0.75, y + s * 0.5], [x - s * 0.3, y + s * 0.42], [x + s * 0.2, y + s * 0.52], [x + s * 0.78, y + s * 0.44]],
        { color: pal.accent[2] || pal.ink2, width: 0.24, speed: 80 });
    }
  });

  def("rocket", {
    tags: ["rocket", "space", "launch", "startup", "moon", "mars", "future", "spaceship", "fly"],
    anchor: "center", slot: "any", size: [12, 32],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.16;
      S.stroke([{ x: x - w, y: y + s * 0.3 }, { x: x - w, y: y - s * 0.16 }, { x: x, y: y - s * 0.5 },
      { x: x + w, y: y - s * 0.16 }, { x: x + w, y: y + s * 0.3 }, { x: x - w, y: y + s * 0.3 }],
        { color: pal.ink, width: 0.3, speed: 50 });
      S.stroke([{ x: x - w, y: y + s * 0.08 }, { x: x - w * 2.2, y: y + s * 0.36 }, { x: x - w, y: y + s * 0.3 }],
        { color: pal.ink, width: 0.26, speed: 68 });
      S.stroke([{ x: x + w, y: y + s * 0.08 }, { x: x + w * 2.2, y: y + s * 0.36 }, { x: x + w, y: y + s * 0.3 }],
        { color: pal.ink, width: 0.26, speed: 68 });
      S.circle(x, y - s * 0.1, w * 0.55, { n: 14, color: pal.ink, width: 0.24, speed: 75 });
      for (var i = 0; i < 7; i++) {
        var f = 0.4 + S.rnd() * 0.9;
        S.curve([[x + (S.rnd() - 0.5) * w * 1.4, y + s * 0.32], [x + (S.rnd() - 0.5) * w, y + s * (0.32 + 0.12 * f)],
        [x + (S.rnd() - 0.5) * w * 0.8, y + s * (0.32 + 0.22 * f)]],
          { color: i % 2 ? pal.accent[0] : (pal.accent[1] || pal.accent[0]), width: 0.28, speed: 120, alpha: 0.7 });
      }
    }
  });

  def("balloon", {
    tags: ["balloon", "hot air balloon", "fly", "adventure", "travel", "float", "sky"],
    anchor: "center", slot: "sky", size: [14, 34],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, r = s * 0.3;
      S.stroke([{ x: x - r, y: y - s * 0.16 }, { x: x - r * 1.02, y: y - s * 0.45 }, { x: x, y: y - s * 0.62 },
      { x: x + r * 1.02, y: y - s * 0.45 }, { x: x + r, y: y - s * 0.16 }, { x: x + r * 0.45, y: y + s * 0.06 },
      { x: x - r * 0.45, y: y + s * 0.06 }, { x: x - r, y: y - s * 0.16 }], { color: pal.ink, width: 0.3, speed: 46 });
      S.curve([[x - r * 0.5, y - s * 0.56], [x - r * 0.62, y - s * 0.2], [x - r * 0.28, y + s * 0.04]],
        { color: pal.accent[0], width: 0.24, speed: 70 });
      S.curve([[x + r * 0.5, y - s * 0.56], [x + r * 0.62, y - s * 0.2], [x + r * 0.28, y + s * 0.04]],
        { color: pal.accent[0], width: 0.24, speed: 70 });
      S.line(x - r * 0.42, y + s * 0.06, x - r * 0.3, y + s * 0.26, { color: pal.ink, width: 0.18, speed: 110 });
      S.line(x + r * 0.42, y + s * 0.06, x + r * 0.3, y + s * 0.26, { color: pal.ink, width: 0.18, speed: 110 });
      S.stroke([{ x: x - r * 0.32, y: y + s * 0.26 }, { x: x - r * 0.28, y: y + s * 0.42 }, { x: x + r * 0.28, y: y + s * 0.42 }, { x: x + r * 0.32, y: y + s * 0.26 }, { x: x - r * 0.32, y: y + s * 0.26 }],
        { color: pal.ink, width: 0.26, speed: 70 });
      S.shade(x, y - s * 0.28, r * 0.55, s * 0.2, 1.5, 14, { color: pal.accent[1] || pal.accent[0], width: 0.5, alpha: 0.28 });
    }
  });

  def("bicycle", {
    tags: ["bicycle", "bike", "cycle", "ride", "commute", "summer", "wheels"],
    anchor: "base", slot: "ground", size: [12, 30],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, r = s * 0.3;
      var lx = x - s * 0.42, rx = x + s * 0.42;
      S.stroke(ring(lx, y - r, r, r, 26, 0.07, rnd), { color: pal.ink, width: 0.28, speed: 50 });
      S.stroke(ring(rx, y - r, r, r, 26, 0.07, rnd), { color: pal.ink, width: 0.28, speed: 50 });
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * Math.PI * 2;
        S.line(lx, y - r, lx + Math.cos(a) * r, y - r + Math.sin(a) * r, { color: pal.ink2, width: 0.14, speed: 150, alpha: 0.7 });
        S.line(rx, y - r, rx + Math.cos(a) * r, y - r + Math.sin(a) * r, { color: pal.ink2, width: 0.14, speed: 150, alpha: 0.7 });
      }
      S.stroke([{ x: lx, y: y - r }, { x: x - s * 0.06, y: y - r }, { x: x - s * 0.02, y: y - r * 1.9 },
      { x: lx + s * 0.16, y: y - r * 1.85 }, { x: lx, y: y - r }], { color: pal.ink, width: 0.24, speed: 62 });
      S.stroke([{ x: x - s * 0.06, y: y - r }, { x: rx, y: y - r }, { x: x + s * 0.2, y: y - r * 1.95 }, { x: x - s * 0.02, y: y - r * 1.9 }],
        { color: pal.ink, width: 0.24, speed: 62 });
      S.line(x + s * 0.2, y - r * 1.95, rx, y - r, { color: pal.ink, width: 0.22, speed: 80 });
      S.line(x + s * 0.1, y - r * 2.05, x + s * 0.3, y - r * 2.05, { color: pal.ink, width: 0.22, speed: 100 });
      S.stroke([{ x: lx + s * 0.06, y: y - r * 1.95 }, { x: lx + s * 0.24, y: y - r * 1.98 }], { color: pal.accent[0], width: 0.3, speed: 90 });
      S.circle(x - s * 0.06, y - r, s * 0.05, { n: 10, color: pal.ink, width: 0.2, speed: 90 });
    }
  });

  def("city", {
    tags: ["city", "skyline", "urban", "town", "buildings", "downtown", "metropolis", "new york"],
    anchor: "base", slot: "horizon", size: [16, 40],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, n = 7, w = s * 1.9;
      var cx = x - w / 2;
      for (var i = 0; i < n; i++) {
        var bw = w / n * (0.7 + rnd() * 0.5);
        var bh = s * (0.35 + rnd() * 0.65);
        S.stroke([{ x: cx, y: y }, { x: cx, y: y - bh }, { x: cx + bw, y: y - bh }, { x: cx + bw, y: y }],
          { color: pal.ink, width: 0.28, speed: 55 });
        var rows = Math.max(1, Math.floor(bh / (s * 0.11)));
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < 2; c++) {
            if (rnd() > 0.45) continue;
            var wx = cx + bw * (0.28 + c * 0.42);
            var wy = y - bh + s * 0.08 + r * s * 0.11;
            S.line(wx, wy, wx + bw * 0.18, wy, { color: pal.accent[0], width: 0.3, speed: 150, alpha: 0.65 });
          }
        }
        cx += bw + w / n * 0.12;
      }
    }
  });

  def("coffee", {
    tags: ["coffee", "tea", "cafe", "cup", "mug", "morning", "cozy", "espresso", "latte", "warm"],
    anchor: "base", slot: "ground", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.36;
      S.stroke([{ x: x - w, y: y - s * 0.72 }, { x: x - w * 0.78, y: y }, { x: x + w * 0.78, y: y }, { x: x + w, y: y - s * 0.72 }],
        { color: pal.ink, width: 0.32, speed: 48 });
      S.ellipse(x, y - s * 0.72, w, w * 0.28, 0, { n: 24, color: pal.ink, width: 0.28, speed: 55 });
      S.stroke([{ x: x + w * 0.94, y: y - s * 0.58 }, { x: x + w * 1.6, y: y - s * 0.52 }, { x: x + w * 1.55, y: y - s * 0.26 }, { x: x + w * 0.87, y: y - s * 0.2 }],
        { color: pal.ink, width: 0.26, speed: 62 });
      S.line(x - w * 1.15, y, x + w * 1.15, y, { color: pal.ink, width: 0.26, speed: 80 });
      S.shade(x, y - s * 0.72, w * 0.78, w * 0.2, 0, 10, { color: pal.accent[0], width: 0.5, alpha: 0.35 });
      for (var i = -1; i <= 1; i++) {
        S.curve([[x + i * w * 0.36, y - s * 0.82], [x + i * w * 0.36 + w * 0.2, y - s * 1.0],
        [x + i * w * 0.36 - w * 0.16, y - s * 1.16], [x + i * w * 0.36 + w * 0.1, y - s * 1.32]],
          { color: pal.soft, width: 0.22, speed: 70, alpha: 0.65 });
      }
    }
  });

  def("book", {
    tags: ["book", "read", "story", "library", "study", "novel", "learn", "knowledge", "page"],
    anchor: "center", slot: "any", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.55, h = s * 0.36;
      S.curve([[x - w, y - h * 0.5], [x - w * 0.5, y - h * 0.85], [x, y - h * 0.45]], { color: pal.ink, width: 0.3, speed: 55 });
      S.curve([[x, y - h * 0.45], [x + w * 0.5, y - h * 0.85], [x + w, y - h * 0.5]], { color: pal.ink, width: 0.3, speed: 55 });
      S.curve([[x - w, y - h * 0.5], [x - w * 0.55, y + h * 0.15], [x, y + h * 0.55]], { color: pal.ink, width: 0.3, speed: 55 });
      S.curve([[x, y + h * 0.55], [x + w * 0.55, y + h * 0.15], [x + w, y - h * 0.5]], { color: pal.ink, width: 0.3, speed: 55 });
      S.line(x, y - h * 0.45, x, y + h * 0.55, { color: pal.ink, width: 0.24, speed: 80 });
      for (var i = 1; i <= 3; i++) {
        var f = i / 4;
        S.curve([[x - w * (1 - f * 0.2), y - h * 0.5 + h * f * 0.5], [x - w * 0.5, y - h * 0.6 + h * f * 0.8], [x - w * 0.06, y - h * 0.35 + h * f * 0.7]],
          { color: pal.ink2, width: 0.16, speed: 110, alpha: 0.6 });
        S.curve([[x + w * (1 - f * 0.2), y - h * 0.5 + h * f * 0.5], [x + w * 0.5, y - h * 0.6 + h * f * 0.8], [x + w * 0.06, y - h * 0.35 + h * f * 0.7]],
          { color: pal.ink2, width: 0.16, speed: 110, alpha: 0.6 });
      }
    }
  });

  def("musicnote", {
    tags: ["music", "song", "note", "melody", "sing", "jazz", "band", "tune", "sound", "dance"],
    anchor: "center", slot: "any", size: [6, 18],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x - s * 0.18, y + s * 0.32, s * 0.2, s * 0.15, 16, 0.04, rnd), { color: pal.ink, width: 0.28, speed: 60 });
      S.line(x + s * 0.02, y + s * 0.3, x + s * 0.02, y - s * 0.42, { color: pal.ink, width: 0.26, speed: 70 });
      S.curve([[x + s * 0.02, y - s * 0.42], [x + s * 0.34, y - s * 0.3], [x + s * 0.3, y - s * 0.02]],
        { color: pal.ink, width: 0.26, speed: 70 });
      S.shade(x - s * 0.18, y + s * 0.32, s * 0.13, s * 0.1, 0.5, 6, { color: pal.accent[0], width: 0.45, alpha: 0.5 });
    }
  });

  def("heart", {
    tags: ["heart", "love", "valentine", "romance", "kind", "care", "friend", "thanks"],
    anchor: "center", slot: "any", size: [6, 20],
    draw: function (S, x, y, s, pal) {
      var r = s * 0.42, pts = [];
      for (var i = 0; i <= 40; i++) {
        var t = (i / 40) * Math.PI * 2;
        var hx = 16 * Math.pow(Math.sin(t), 3);
        var hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push({ x: x + hx * r / 16, y: y + hy * r / 16 });
      }
      S.stroke(pts, { color: pal.accent[0], width: 0.3, speed: 52 });
      S.shade(x, y + r * 0.05, r * 0.5, r * 0.42, 0.8, 12, { color: pal.accent[0], width: 0.5, alpha: 0.28 });
    }
  });

  def("feather", {
    tags: ["feather", "quill", "write", "light", "bird", "soft", "poem"],
    anchor: "center", slot: "any", size: [8, 22],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, a = -1.15;
      var dx = Math.cos(a), dy = Math.sin(a);
      var bx = x - dx * s * 0.5, by = y - dy * s * 0.5;
      S.line(bx, by, bx + dx * s, by + dy * s, { color: pal.ink, width: 0.26, speed: 60 });
      for (var i = 2; i < 16; i++) {
        var t = i / 16;
        var px = bx + dx * s * t, py = by + dy * s * t;
        var l = s * 0.24 * Math.sin(t * Math.PI) * (0.8 + rnd() * 0.4);
        S.line(px, py, px + Math.cos(a - 0.85) * l, py + Math.sin(a - 0.85) * l, { color: pal.ink2, width: 0.17, speed: 140, alpha: 0.85 });
        S.line(px, py, px + Math.cos(a + 0.85) * l, py + Math.sin(a + 0.85) * l, { color: pal.ink2, width: 0.17, speed: 140, alpha: 0.85 });
      }
    }
  });

  def("lantern", {
    tags: ["lantern", "lamp", "light", "glow", "cozy", "festival", "warm", "night"],
    anchor: "center", slot: "sky", size: [8, 22],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.24;
      S.stroke([{ x: x - w, y: y - s * 0.3 }, { x: x - w * 1.2, y: y + s * 0.05 }, { x: x - w * 0.85, y: y + s * 0.35 },
      { x: x + w * 0.85, y: y + s * 0.35 }, { x: x + w * 1.2, y: y + s * 0.05 }, { x: x + w, y: y - s * 0.3 }, { x: x - w, y: y - s * 0.3 }],
        { color: pal.ink, width: 0.28, speed: 52 });
      S.line(x - w * 1.15, y - s * 0.3, x + w * 1.15, y - s * 0.3, { color: pal.ink, width: 0.24, speed: 80 });
      S.line(x - w * 1.0, y + s * 0.35, x + w * 1.0, y + s * 0.35, { color: pal.ink, width: 0.24, speed: 80 });
      S.curve([[x - w * 0.6, y - s * 0.32], [x, y - s * 0.62], [x + w * 0.6, y - s * 0.32]], { color: pal.ink, width: 0.22, speed: 80 });
      S.shade(x, y + s * 0.04, w * 0.7, s * 0.22, 1.3, 12, { color: pal.accent[0], width: 0.5, alpha: 0.42 });
    }
  });

  def("key", {
    tags: ["key", "unlock", "secret", "mystery", "door", "answer"],
    anchor: "center", slot: "any", size: [6, 18],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x - s * 0.34, y, s * 0.16, s * 0.16, 16, 0.04, rnd), { color: pal.ink, width: 0.28, speed: 60 });
      S.line(x - s * 0.18, y, x + s * 0.46, y, { color: pal.ink, width: 0.28, speed: 75 });
      S.line(x + s * 0.28, y, x + s * 0.28, y + s * 0.16, { color: pal.ink, width: 0.24, speed: 100 });
      S.line(x + s * 0.42, y, x + s * 0.42, y + s * 0.2, { color: pal.ink, width: 0.24, speed: 100 });
    }
  });

  def("umbrella", {
    tags: ["umbrella", "rain", "shelter", "parasol", "weather"],
    anchor: "center", slot: "any", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.5;
      S.quad(x - w, y, x, y - s * 0.62, x + w, y, { n: 20, color: pal.ink, width: 0.3, speed: 52 });
      var scallop = [];
      for (var i = 0; i <= 4; i++) {
        var f = i / 4;
        scallop.push({ x: x - w + 2 * w * f, y: y });
        if (i < 4) scallop.push({ x: x - w + 2 * w * (f + 0.125), y: y + s * 0.07 });
      }
      S.stroke(scallop, { color: pal.ink, width: 0.24, speed: 70 });
      S.line(x, y - s * 0.6, x, y + s * 0.4, { color: pal.ink, width: 0.24, speed: 80 });
      S.curve([[x, y + s * 0.4], [x - s * 0.12, y + s * 0.5], [x - s * 0.2, y + s * 0.38]], { color: pal.ink, width: 0.22, speed: 90 });
      S.shade(x, y - s * 0.24, w * 0.6, s * 0.16, 1.3, 12, { color: pal.accent[0], width: 0.5, alpha: 0.3 });
    }
  });

  def("clock", {
    tags: ["clock", "time", "hour", "deadline", "watch", "moment", "late"],
    anchor: "center", slot: "any", size: [8, 22],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, r = s * 0.42;
      S.stroke(ring(x, y, r, r, 28, 0.08, rnd), { color: pal.ink, width: 0.3, speed: 50 });
      S.stroke(ring(x, y, r * 0.86, r * 0.86, 26, 0.06, rnd), { color: pal.ink2, width: 0.18, speed: 70, alpha: 0.7 });
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        S.line(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82,
          { color: pal.ink2, width: 0.16, speed: 160, alpha: 0.8 });
      }
      S.line(x, y, x + r * 0.42, y - r * 0.28, { color: pal.ink, width: 0.26, speed: 90 });
      S.line(x, y, x - r * 0.16, y - r * 0.6, { color: pal.ink, width: 0.22, speed: 90 });
      S.dot(x, y, s * 0.03, { color: pal.ink });
    }
  });

  def("anchor", {
    tags: ["anchor", "sea", "harbour", "harbor", "sailor", "steady", "nautical"],
    anchor: "center", slot: "any", size: [8, 22],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      S.stroke(ring(x, y - s * 0.42, s * 0.1, s * 0.1, 12, 0.03, rnd), { color: pal.ink, width: 0.26, speed: 70 });
      S.line(x, y - s * 0.32, x, y + s * 0.4, { color: pal.ink, width: 0.28, speed: 70 });
      S.line(x - s * 0.24, y - s * 0.2, x + s * 0.24, y - s * 0.2, { color: pal.ink, width: 0.24, speed: 90 });
      S.curve([[x - s * 0.38, y + s * 0.14], [x - s * 0.34, y + s * 0.4], [x, y + s * 0.5], [x + s * 0.34, y + s * 0.4], [x + s * 0.38, y + s * 0.14]],
        { color: pal.ink, width: 0.28, speed: 58 });
      S.line(x - s * 0.38, y + s * 0.14, x - s * 0.48, y + s * 0.06, { color: pal.ink, width: 0.22, speed: 100 });
      S.line(x + s * 0.38, y + s * 0.14, x + s * 0.48, y + s * 0.06, { color: pal.ink, width: 0.22, speed: 100 });
    }
  });

  def("spiral", {
    tags: ["spiral", "abstract", "swirl", "flow", "vortex", "energy", "pattern", "hypnotic"],
    anchor: "center", slot: "any", size: [8, 26],
    draw: function (S, x, y, s, pal) {
      var pts = [];
      for (var i = 0; i <= 90; i++) {
        var t = (i / 90) * Math.PI * 6;
        var r = (i / 90) * s * 0.5;
        pts.push({ x: x + Math.cos(t) * r, y: y + Math.sin(t) * r * 0.92 });
      }
      S.stroke(pts, { color: pal.accent[0], width: 0.26, speed: 60 });
    }
  });

  def("mandala", {
    tags: ["mandala", "pattern", "zen", "meditation", "symmetry", "abstract", "geometric", "calm", "balance"],
    anchor: "center", slot: "any", size: [14, 36],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, r = s * 0.5;
      S.stroke(ring(x, y, r, r, 34, 0.08, rnd), { color: pal.ink, width: 0.26, speed: 55 });
      S.stroke(ring(x, y, r * 0.68, r * 0.68, 28, 0.06, rnd), { color: pal.ink2, width: 0.2, speed: 70 });
      S.stroke(ring(x, y, r * 0.2, r * 0.2, 14, 0.04, rnd), { color: pal.accent[0], width: 0.22, speed: 80 });
      var n = 12;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        S.stroke(leafShape(x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22, a, r * 0.46, r * 0.1, rnd),
          { color: i % 2 ? pal.accent[0] : pal.ink, width: 0.2, speed: 95 });
        S.line(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96,
          { color: pal.ink2, width: 0.18, speed: 140 });
        S.dot(x + Math.cos(a + Math.PI / n) * r * 0.84, y + Math.sin(a + Math.PI / n) * r * 0.84, r * 0.035, { color: pal.accent[1] || pal.accent[0] });
      }
    }
  });

  def("eye", {
    tags: ["eye", "see", "watch", "vision", "look", "observe", "awake", "insight"],
    anchor: "center", slot: "any", size: [8, 24],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, w = s * 0.55;
      S.curve([[x - w, y], [x - w * 0.4, y - s * 0.28], [x + w * 0.4, y - s * 0.28], [x + w, y]], { color: pal.ink, width: 0.3, speed: 55 });
      S.curve([[x - w, y], [x - w * 0.4, y + s * 0.26], [x + w * 0.4, y + s * 0.26], [x + w, y]], { color: pal.ink, width: 0.3, speed: 55 });
      S.stroke(ring(x, y, s * 0.19, s * 0.19, 18, 0.04, rnd), { color: pal.ink, width: 0.26, speed: 65 });
      S.dot(x, y, s * 0.075, { color: pal.ink });
      S.dot(x + s * 0.06, y - s * 0.06, s * 0.028, { color: pal.paperDark ? pal.ink : "#fdf9f0" });
      for (var i = 0; i < 6; i++) {
        var a = -2.5 + (i / 5) * 2;
        S.line(x + Math.cos(a) * w * 0.75, y + Math.sin(a) * s * 0.3, x + Math.cos(a) * w * 1.0, y + Math.sin(a) * s * 0.46,
          { color: pal.ink2, width: 0.18, speed: 140 });
      }
      S.shade(x, y, s * 0.14, s * 0.13, 0.8, 6, { color: pal.accent[2] || pal.accent[0], width: 0.4, alpha: 0.35 });
    }
  });

  def("crown", {
    tags: ["crown", "king", "queen", "royal", "win", "champion", "gold", "best"],
    anchor: "center", slot: "any", size: [8, 22],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.5, b = y + s * 0.24;
      S.stroke([{ x: x - w, y: b }, { x: x - w, y: y - s * 0.3 }, { x: x - w * 0.5, y: y + s * 0.02 },
      { x: x, y: y - s * 0.38 }, { x: x + w * 0.5, y: y + s * 0.02 }, { x: x + w, y: y - s * 0.3 },
      { x: x + w, y: b }, { x: x - w, y: b }], { color: pal.accent[0], width: 0.3, speed: 52 });
      S.line(x - w, b - s * 0.12, x + w, b - s * 0.12, { color: pal.accent[0], width: 0.22, speed: 90 });
      S.dot(x - w, y - s * 0.34, s * 0.045, { color: pal.ink });
      S.dot(x, y - s * 0.42, s * 0.045, { color: pal.ink });
      S.dot(x + w, y - s * 0.34, s * 0.045, { color: pal.ink });
    }
  });

  def("teapot", {
    tags: ["teapot", "tea", "kettle", "cozy", "kitchen", "brew", "afternoon"],
    anchor: "base", slot: "ground", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd, r = s * 0.38;
      S.stroke([{ x: x - r, y: y - s * 0.34 }, { x: x - r * 0.72, y: y }, { x: x + r * 0.72, y: y },
      { x: x + r, y: y - s * 0.34 }, { x: x + r * 0.6, y: y - s * 0.6 }, { x: x - r * 0.6, y: y - s * 0.6 }, { x: x - r, y: y - s * 0.34 }],
        { color: pal.ink, width: 0.3, speed: 50 });
      S.stroke([{ x: x + r * 0.95, y: y - s * 0.4 }, { x: x + r * 1.5, y: y - s * 0.5 }, { x: x + r * 1.62, y: y - s * 0.68 }],
        { color: pal.ink, width: 0.26, speed: 70 });
      S.stroke([{ x: x - r * 0.95, y: y - s * 0.46 }, { x: x - r * 1.55, y: y - s * 0.42 }, { x: x - r * 1.5, y: y - s * 0.16 }, { x: x - r * 0.85, y: y - s * 0.1 }],
        { color: pal.ink, width: 0.26, speed: 68 });
      S.line(x - r * 0.62, y - s * 0.6, x + r * 0.62, y - s * 0.6, { color: pal.ink, width: 0.24, speed: 90 });
      S.stroke(ring(x, y - s * 0.68, r * 0.16, r * 0.12, 12, 0.03, rnd), { color: pal.ink, width: 0.22, speed: 90 });
      S.shade(x, y - s * 0.3, r * 0.5, s * 0.14, 1.2, 10, { color: pal.accent[0], width: 0.5, alpha: 0.28 });
      S.curve([[x + r * 1.62, y - s * 0.78], [x + r * 1.9, y - s * 0.95], [x + r * 1.6, y - s * 1.12]],
        { color: pal.soft, width: 0.22, speed: 80, alpha: 0.6 });
    }
  });

  def("dragon", {
    tags: ["dragon", "fantasy", "myth", "fire", "legend", "magic", "beast"],
    anchor: "center", slot: "any", size: [16, 40],
    draw: function (S, x, y, s, pal) {
      var rnd = S.rnd;
      var body = global.PX.smooth([[x - s * 0.75, y + s * 0.3], [x - s * 0.3, y + s * 0.02], [x + s * 0.05, y + s * 0.2],
      [x + s * 0.4, y - s * 0.06], [x + s * 0.62, y - s * 0.3]], 10, false);
      S.stroke(body, { color: pal.ink, width: 0.34, speed: 46 });
      var lower = body.map(function (p, i) { return { x: p.x, y: p.y + s * 0.14 * Math.sin((i / body.length) * Math.PI) + s * 0.06 }; });
      S.stroke(lower, { color: pal.ink, width: 0.26, speed: 60 });
      for (var i = 3; i < body.length - 2; i += 3) {
        var p = body[i];
        S.stroke([{ x: p.x - s * 0.04, y: p.y }, { x: p.x, y: p.y - s * 0.11 }, { x: p.x + s * 0.04, y: p.y }],
          { color: pal.accent[0], width: 0.22, speed: 110 });
      }
      var hx = x + s * 0.62, hy = y - s * 0.3;
      S.stroke(ring(hx, hy, s * 0.13, s * 0.1, 14, 0.04, rnd), { color: pal.ink, width: 0.28, speed: 65 });
      S.line(hx + s * 0.02, hy - s * 0.08, hx + s * 0.12, hy - s * 0.24, { color: pal.ink, width: 0.2, speed: 110 });
      S.dot(hx + s * 0.05, hy - s * 0.02, s * 0.026, { color: pal.ink });
      for (var k = 0; k < 5; k++) {
        S.curve([[hx + s * 0.14, hy + s * 0.02], [hx + s * 0.3 + rnd() * s * 0.1, hy + (rnd() - 0.5) * s * 0.16],
        [hx + s * 0.52 + rnd() * s * 0.14, hy + (rnd() - 0.5) * s * 0.26]],
          { color: k % 2 ? pal.accent[0] : (pal.accent[1] || pal.accent[0]), width: 0.24, speed: 120, alpha: 0.8 });
      }
      S.stroke([{ x: x + s * 0.05, y: y + s * 0.16 }, { x: x + s * 0.1, y: y - s * 0.36 }, { x: x + s * 0.38, y: y - s * 0.16 }, { x: x + s * 0.2, y: y + s * 0.04 }],
        { color: pal.ink, width: 0.26, speed: 60 });
      S.stroke([{ x: x - s * 0.75, y: y + s * 0.3 }, { x: x - s * 0.95, y: y + s * 0.16 }, { x: x - s * 0.86, y: y + s * 0.44 }],
        { color: pal.ink, width: 0.24, speed: 80 });
    }
  });

  def("ghost", {
    tags: ["ghost", "spooky", "halloween", "spirit", "boo", "haunt"],
    anchor: "center", slot: "any", size: [10, 26],
    draw: function (S, x, y, s, pal) {
      var w = s * 0.34, pts = [], i;
      for (i = 0; i <= 16; i++) {
        var a = Math.PI + (i / 16) * Math.PI;
        pts.push({ x: x + Math.cos(a) * w, y: y - s * 0.1 + Math.sin(a) * w * 1.1 });
      }
      for (i = 0; i <= 6; i++) {
        pts.push({ x: x + w - (i / 6) * w * 2, y: y + s * 0.42 + (i % 2 ? -s * 0.09 : s * 0.03) });
      }
      pts.push({ x: x - w, y: y - s * 0.1 });
      S.stroke(pts, { color: pal.ink, width: 0.3, speed: 50 });
      S.dot(x - w * 0.4, y - s * 0.2, s * 0.04, { color: pal.ink });
      S.dot(x + w * 0.4, y - s * 0.2, s * 0.04, { color: pal.ink });
      S.stroke(ring(x, y - s * 0.02, s * 0.06, s * 0.08, 12, 0.03, S.rnd), { color: pal.ink, width: 0.2, speed: 90 });
    }
  });

  /* ---------- lookup ---------- */

  var TAG_INDEX = {};
  Object.keys(M).forEach(function (id) {
    M[id].id = id;
    M[id].tags.forEach(function (t) {
      if (!TAG_INDEX[t]) TAG_INDEX[t] = [];
      TAG_INDEX[t].push(id);
    });
  });

  global.MOTIFS = M;
  global.MOTIF_TAGS = TAG_INDEX;
  global.MOTIF_IDS = Object.keys(M);
})(window);
