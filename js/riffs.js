/* riffs.js — drawings that build on what the picture already has.
 *
 * The idea behind the whole app: given an ace of clubs, don't draw next to the
 * club pip, draw *with* it — grow it into a tree, float it as a balloon, plant
 * it in a patch of clover. Every background declares its features; each riff
 * here takes one of those features and extends it into a small scene.
 *
 * Feature geometry arrives already converted to LOCAL units.
 */
(function (global) {
  "use strict";

  var M = global.MOTIFS;

  function ring(cx, cy, rx, ry, n, wob, rnd) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2;
      pts.push({
        x: cx + Math.cos(t) * rx + (rnd() - 0.5) * wob,
        y: cy + Math.sin(t) * ry + (rnd() - 0.5) * wob
      });
    }
    return pts;
  }

  function grass(S, x, y, h, pal, n) {
    var rnd = S.rnd;
    for (var i = 0; i < (n || 5); i++) {
      var dx = (rnd() - 0.5) * h * 1.6;
      var hh = h * (0.5 + rnd() * 0.8);
      S.quad(x + dx, y, x + dx * 1.2, y - hh * 0.6, x + dx * 1.5, y - hh,
        { n: 6, color: rnd() > 0.5 ? pal.leaf : pal.ink2, width: 0.2, speed: 140, alpha: 0.85 });
    }
  }

  var R = [];
  function riff(o) { R.push(o); }

  /* ===================== disc: a round thing already there ================= */

  riff({
    id: "sun", kinds: ["disc"], tags: ["sun", "summer", "warm", "day", "morning"],
    story: "turned %s into a rising sun",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      for (var i = 0; i < 16; i++) {
        var a = (i / 16) * Math.PI * 2 + 0.1;
        var l = f.r * (0.28 + rnd() * 0.4);
        S.line(f.x + Math.cos(a) * f.r * 1.14, f.y + Math.sin(a) * f.r * 1.14,
          f.x + Math.cos(a) * (f.r * 1.14 + l), f.y + Math.sin(a) * (f.r * 1.14 + l),
          { color: i % 2 ? pal.accent[0] : pal.ink, width: 0.28, speed: 90 });
      }
      S.stroke(ring(f.x, f.y, f.r * 1.02, f.r * 1.02, 30, 0.14, rnd),
        { color: pal.ink, width: 0.3, speed: 55, alpha: 0.85 });
      M.bird.draw(S, f.x - f.r * 1.9, f.y - f.r * 0.5, f.r * 0.5, pal);
      M.bird.draw(S, f.x + f.r * 1.7, f.y - f.r * 0.9, f.r * 0.36, pal);
    }
  });

  riff({
    id: "balloon", kinds: ["disc", "motif"], tags: ["balloon", "fly", "travel", "adventure", "up"],
    story: "hung a basket under %s and floated it away",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var by = f.y + f.r * 2.3, bw = f.r * 0.52;
      S.line(f.x - f.r * 0.6, f.y + f.r * 0.8, f.x - bw, by, { color: pal.ink, width: 0.2, speed: 90 });
      S.line(f.x + f.r * 0.6, f.y + f.r * 0.8, f.x + bw, by, { color: pal.ink, width: 0.2, speed: 90 });
      S.line(f.x, f.y + f.r, f.x, by, { color: pal.ink, width: 0.18, speed: 100, alpha: 0.8 });
      S.stroke([{ x: f.x - bw, y: by }, { x: f.x - bw * 0.86, y: by + bw * 1.1 },
      { x: f.x + bw * 0.86, y: by + bw * 1.1 }, { x: f.x + bw, y: by }, { x: f.x - bw, y: by }],
        { color: pal.ink, width: 0.3, speed: 60 });
      for (var i = 1; i < 3; i++) {
        S.line(f.x - bw + (i / 3) * bw * 2, by, f.x - bw + (i / 3) * bw * 2, by + bw * 1.1,
          { color: pal.ink2, width: 0.16, speed: 130, alpha: 0.7 });
      }
      S.shade(f.x, by + bw * 0.5, bw * 0.5, bw * 0.4, 1.2, 8, { color: pal.accent[0], width: 0.45, alpha: 0.3 });
      M.cloud.draw(S, f.x - f.r * 2.6, f.y + f.r * 0.4, f.r * 0.7, pal);
      M.bird.draw(S, f.x + f.r * 2.4, f.y - f.r * 0.2, f.r * 0.42, pal);
      grass(S, f.x, by + bw * 3.4, f.r * 0.3, pal, 7);
    }
  });

  riff({
    id: "wheel", kinds: ["disc"], tags: ["bicycle", "bike", "ride", "wheels", "cycle", "summer"],
    story: "built a bicycle around %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd, r = f.r;
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        S.line(f.x, f.y, f.x + Math.cos(a) * r * 0.94, f.y + Math.sin(a) * r * 0.94,
          { color: pal.ink2, width: 0.15, speed: 170, alpha: 0.75 });
      }
      S.circle(f.x, f.y, r * 0.14, { n: 12, color: pal.ink, width: 0.22, speed: 90 });
      /* build the rest of the bike towards the middle of the picture */
      var ox = r * 2.5 * ((f.pctX || 50) > 55 ? -1 : 1);
      S.stroke(ring(f.x + ox, f.y, r, r, 28, 0.1, rnd), { color: pal.ink, width: 0.3, speed: 52 });
      for (var k = 0; k < 8; k++) {
        var a2 = (k / 8) * Math.PI * 2;
        S.line(f.x + ox, f.y, f.x + ox + Math.cos(a2) * r * 0.94, f.y + Math.sin(a2) * r * 0.94,
          { color: pal.ink2, width: 0.15, speed: 170, alpha: 0.75 });
      }
      S.stroke([{ x: f.x, y: f.y }, { x: f.x + ox * 0.42, y: f.y }, { x: f.x + ox * 0.5, y: f.y - r * 1.5 },
      { x: f.x + ox * 0.1, y: f.y - r * 1.45 }, { x: f.x, y: f.y }], { color: pal.ink, width: 0.26, speed: 62 });
      S.stroke([{ x: f.x + ox * 0.42, y: f.y }, { x: f.x + ox, y: f.y },
      { x: f.x + ox * 0.72, y: f.y - r * 1.55 }, { x: f.x + ox * 0.5, y: f.y - r * 1.5 }],
        { color: pal.ink, width: 0.26, speed: 62 });
      S.line(f.x + ox * 0.62, f.y - r * 1.72, f.x + ox * 0.86, f.y - r * 1.72,
        { color: pal.ink, width: 0.24, speed: 110 });
      S.stroke([{ x: f.x + ox * 0.06, y: f.y - r * 1.62 }, { x: f.x + ox * 0.28, y: f.y - r * 1.66 }],
        { color: pal.accent[0], width: 0.32, speed: 100 });
    }
  });

  riff({
    id: "planet", kinds: ["disc", "motif"], tags: ["space", "planet", "cosmos", "star", "night", "orbit"],
    story: "gave %s a ring and set it in space",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      S.ellipse(f.x, f.y, f.r * 1.75, f.r * 0.42, -0.3, { n: 34, color: pal.accent[0], width: 0.3, speed: 55 });
      S.ellipse(f.x, f.y, f.r * 1.45, f.r * 0.32, -0.3, { n: 30, color: pal.accent[0], width: 0.2, speed: 70, alpha: 0.7 });
      for (var i = 0; i < 7; i++) {
        M.star.draw(S, f.x + (rnd() - 0.5) * f.r * 6, f.y + (rnd() - 0.5) * f.r * 5,
          f.r * (0.14 + rnd() * 0.12), pal);
      }
      M.rocket.draw(S, f.x - f.r * 2.4, f.y + f.r * 1.7, f.r * 1.1, pal);
    }
  });

  riff({
    id: "pond", kinds: ["disc"], tags: ["pond", "water", "fish", "koi", "ripple", "calm", "garden"],
    story: "made %s a little pond",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      for (var i = 1; i <= 3; i++) {
        S.stroke(ring(f.x, f.y, f.r * (1 + i * 0.22), f.r * (0.42 + i * 0.1), 26, 0.12, rnd),
          { color: pal.accent[2] || pal.ink2, width: 0.2, speed: 80, alpha: 0.55 });
      }
      M.fish.draw(S, f.x - f.r * 0.25, f.y + f.r * 0.05, f.r * 0.8, pal);
      for (var k = 0; k < 5; k++) {
        var rx = f.x - f.r * 1.5 + rnd() * f.r * 0.5;
        S.quad(rx, f.y + f.r * 0.5, rx - f.r * 0.1, f.y - f.r * 0.3, rx + f.r * 0.1, f.y - f.r * 0.9,
          { n: 8, color: pal.leaf, width: 0.2, speed: 120 });
      }
      M.dragonfly ? M.dragonfly.draw(S, f.x + f.r, f.y - f.r, f.r * 0.5, pal)
        : M.butterfly.draw(S, f.x + f.r * 1.1, f.y - f.r * 1.1, f.r * 0.55, pal);
    }
  });

  /* ===================== motif: an emblem already printed ================== */

  riff({
    id: "growTree", kinds: ["motif"], tags: ["tree", "forest", "nature", "grow", "wood", "oak", "garden"],
    story: "grew a trunk under %s and made it a tree",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var base = f.y + f.r * 3.1, tw = f.r * 0.2;
      S.curve([[f.x - tw, base], [f.x - tw * 0.8, f.y + f.r * 1.6], [f.x - tw * 0.45, f.y + f.r * 0.9]],
        { color: pal.ink, width: 0.42, speed: 44 });
      S.curve([[f.x + tw, base], [f.x + tw * 0.85, f.y + f.r * 1.6], [f.x + tw * 0.45, f.y + f.r * 0.9]],
        { color: pal.ink, width: 0.42, speed: 44 });
      /* bark */
      for (var i = 0; i < 9; i++) {
        var by = f.y + f.r * (1.0 + rnd() * 2);
        S.line(f.x - tw * 0.5 + rnd() * tw, by, f.x - tw * 0.3 + rnd() * tw, by + f.r * 0.2,
          { color: pal.ink2, width: 0.18, speed: 160, alpha: 0.6 });
      }
      /* roots spreading onto the paper */
      [-1, 1].forEach(function (d) {
        S.curve([[f.x + d * tw * 0.6, base], [f.x + d * f.r * 0.9, base + f.r * 0.16],
        [f.x + d * f.r * 1.7, base + f.r * 0.1]], { color: pal.ink, width: 0.26, speed: 70 });
      });
      S.line(f.x - f.r * 1.9, base + f.r * 0.12, f.x + f.r * 1.9, base + f.r * 0.1,
        { color: pal.ink, width: 0.28, speed: 80 });
      /* a couple of branches reaching into the emblem */
      S.curve([[f.x - tw * 0.7, f.y + f.r * 1.2], [f.x - f.r * 0.8, f.y + f.r * 0.6], [f.x - f.r * 1.1, f.y]],
        { color: pal.ink, width: 0.24, speed: 75 });
      S.curve([[f.x + tw * 0.7, f.y + f.r * 1.3], [f.x + f.r * 0.8, f.y + f.r * 0.7], [f.x + f.r * 1.15, f.y + f.r * 0.1]],
        { color: pal.ink, width: 0.24, speed: 75 });
      /* leaves clinging to the emblem's outline */
      for (var k = 0; k < 10; k++) {
        var a = -Math.PI + rnd() * Math.PI * 2;
        M.leaf.draw(S, f.x + Math.cos(a) * f.r * 1.15, f.y + Math.sin(a) * f.r * 1.05, f.r * 0.3, pal);
      }
      grass(S, f.x - f.r * 1.2, base + f.r * 0.1, f.r * 0.3, pal, 6);
      grass(S, f.x + f.r * 1.2, base + f.r * 0.1, f.r * 0.3, pal, 6);
      M.mushroom.draw(S, f.x + f.r * 1.55, base + f.r * 0.1, f.r * 0.5, pal);
      M.snail.draw(S, f.x - f.r * 1.5, base + f.r * 0.1, f.r * 0.36, pal);
    }
  });

  riff({
    id: "clovers", kinds: ["motif"], tags: ["luck", "clover", "green", "meadow", "spring", "garden"],
    story: "planted a patch of clover under %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var base = f.y + f.r * 2.4;
      S.line(f.x - f.r * 2, base, f.x + f.r * 2, base - f.r * 0.04,
        { color: pal.ink, width: 0.28, speed: 80 });
      for (var i = 0; i < 7; i++) {
        var cx = f.x - f.r * 1.8 + (i / 6) * f.r * 3.6 + (rnd() - 0.5) * f.r * 0.3;
        var s = f.r * (0.22 + rnd() * 0.16);
        S.line(cx, base, cx + (rnd() - 0.5) * s, base - s * 1.6,
          { color: pal.leaf, width: 0.2, speed: 130 });
        for (var k = 0; k < 3; k++) {
          var a = -Math.PI / 2 + (k - 1) * 2.1;
          S.ellipse(cx + Math.cos(a) * s * 0.5, base - s * 1.6 + Math.sin(a) * s * 0.5,
            s * 0.5, s * 0.42, a, { n: 14, color: pal.leaf, width: 0.2, speed: 110 });
        }
      }
      M.bee.draw(S, f.x + f.r * 1.3, base - f.r * 1.5, f.r * 0.4, pal);
      M.butterfly.draw(S, f.x - f.r * 1.5, base - f.r * 1.9, f.r * 0.5, pal);
      grass(S, f.x, base, f.r * 0.26, pal, 8);
    }
  });

  riff({
    id: "kite", kinds: ["motif"], tags: ["kite", "wind", "fly", "sky", "string", "spring", "play"],
    story: "flew %s like a kite",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      /* spars across the pip, so it reads as the kite itself */
      S.line(f.x, f.y - f.r * 1.05, f.x, f.y + f.r * 1.05, { color: pal.ink, width: 0.2, speed: 110, alpha: 0.8 });
      S.line(f.x - f.r * 0.85, f.y - f.r * 0.1, f.x + f.r * 0.85, f.y - f.r * 0.1,
        { color: pal.ink, width: 0.2, speed: 110, alpha: 0.8 });

      /* the string, sagging away to one side */
      var dir = (f.pctX || 50) > 50 ? -1 : 1;
      var sx = f.x, sy = f.y + f.r * 1.1;
      var ex = f.x + dir * f.r * 2.6, ey = f.y + f.r * 5.4;
      var pts = [];
      for (var i = 0; i <= 24; i++) {
        var t = i / 24;
        pts.push([sx + (ex - sx) * t + dir * Math.sin(t * Math.PI) * f.r * 0.9,
        sy + (ey - sy) * t]);
      }
      S.curve(pts, { color: pal.ink, width: 0.2, speed: 80 });

      /* bows along the tail */
      for (var k = 4; k < 22; k += 5) {
        var p = pts[k], q = pts[k + 1];
        var a = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2;
        var bw = f.r * 0.26;
        S.stroke([{ x: p[0] - Math.cos(a) * bw, y: p[1] - Math.sin(a) * bw },
        { x: p[0], y: p[1] },
        { x: p[0] + Math.cos(a) * bw, y: p[1] + Math.sin(a) * bw }],
          { color: pal.accent[0], width: 0.26, speed: 110 });
      }

      /* whoever is holding it */
      var hx = pts[24][0], hy = pts[24][1];
      S.circle(hx, hy + f.r * 0.5, f.r * 0.3, { n: 14, color: pal.ink, width: 0.26, speed: 70 });
      S.line(hx, hy + f.r * 0.8, hx, hy + f.r * 1.8, { color: pal.ink, width: 0.28, speed: 90 });
      S.line(hx, hy + f.r * 1.0, hx - dir * f.r * 0.5, hy + f.r * 0.4, { color: pal.ink, width: 0.24, speed: 100 });
      S.line(hx, hy + f.r * 1.0, hx + dir * f.r * 0.45, hy + f.r * 1.4, { color: pal.ink, width: 0.24, speed: 100 });
      S.line(hx, hy + f.r * 1.8, hx - f.r * 0.4, hy + f.r * 2.5, { color: pal.ink, width: 0.26, speed: 100 });
      S.line(hx, hy + f.r * 1.8, hx + f.r * 0.4, hy + f.r * 2.5, { color: pal.ink, width: 0.26, speed: 100 });
      S.line(hx - f.r * 1.4, hy + f.r * 2.55, hx + f.r * 1.4, hy + f.r * 2.5,
        { color: pal.ink, width: 0.28, speed: 90 });
      grass(S, hx - f.r * 0.9, hy + f.r * 2.52, f.r * 0.3, pal, 5);
      grass(S, hx + f.r * 0.9, hy + f.r * 2.5, f.r * 0.3, pal, 5);

      M.cloud.draw(S, f.x - dir * f.r * 2.4, f.y - f.r * 1.9, f.r * 0.85, pal);
      M.bird.draw(S, f.x + dir * f.r * 2.6, f.y - f.r * 1.2, f.r * 0.5, pal);
    }
  });

  riff({
    id: "sprout", kinds: ["motif", "disc"], tags: ["vine", "leaf", "botanical", "plant", "grow", "jungle"],
    story: "let vines climb out of %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      [-1, 1].forEach(function (d) {
        var pts = [];
        for (var i = 0; i <= 26; i++) {
          var t = i / 26;
          pts.push([f.x + d * (f.r * 0.7 + t * f.r * 2.4),
          f.y + Math.sin(t * 6 + d) * f.r * 0.55 - t * f.r * 0.9]);
        }
        S.curve(pts, { color: pal.leaf, width: 0.26, speed: 60 });
        for (var k = 3; k < 24; k += 4) {
          var p = pts[k];
          M.leaf.draw(S, p[0], p[1], f.r * 0.34, pal);
        }
      });
      M.snail.draw(S, f.x + f.r * 1.1, f.y + f.r * 1.4, f.r * 0.42, pal);
    }
  });

  /* ===================== rules: lines already ruled ======================== */

  function ruleYs(f, max) {
    var ys = [], y = f.y;
    while (y < f.y + f.h && ys.length < (max || 40)) { ys.push(y); y += f.gap; }
    return ys;
  }

  riff({
    id: "seaLines", kinds: ["rules"], tags: ["sea", "ocean", "wave", "sail", "boat", "water", "voyage"],
    story: "turned %s into a sea",
    draw: function (S, f, pal) {
      var rnd = S.rnd, ys = ruleYs(f, 14);
      var col = pal.accent[2] || pal.ink2;
      ys.forEach(function (y, i) {
        var pts = [];
        for (var k = 0; k <= 14; k++) {
          var t = k / 14;
          pts.push([f.x + t * f.w, y + Math.sin(t * 9 + i) * f.gap * 0.32]);
        }
        S.curve(pts, { color: col, width: 0.22, speed: 110, alpha: 0.5 + (i % 3) * 0.12 });
      });
      var sy = ys[Math.max(0, Math.floor(ys.length * 0.35))];
      M.sailboat.draw(S, f.x + f.w * 0.34, sy - f.gap * 0.6, f.gap * 4.2, pal);
      M.fish.draw(S, f.x + f.w * 0.72, ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.62))], f.gap * 1.8, pal);
      M.fish.draw(S, f.x + f.w * 0.2, ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.78))], f.gap * 1.3, pal);
      M.bird.draw(S, f.x + f.w * 0.75, ys[0] - f.gap * 2.4, f.gap * 1.6, pal);
    }
  });

  riff({
    id: "stave", kinds: ["rules"], tags: ["music", "song", "melody", "jazz", "sing", "note", "sound"],
    story: "read %s as a stave and wrote a tune on it",
    draw: function (S, f, pal) {
      var ys = ruleYs(f, 10), rnd = S.rnd;
      var top = ys[Math.max(0, Math.floor(ys.length * 0.25))];
      var n = 7;
      for (var i = 0; i < n; i++) {
        var x = f.x + f.w * (0.12 + (i / n) * 0.78);
        var y = ys[Math.max(0, Math.min(ys.length - 1, Math.floor(ys.length * 0.25) + (i % 4)))];
        M.musicnote.draw(S, x, y, f.gap * (1.5 + rnd() * 0.5), pal);
      }
      /* a treble-ish flourish at the left */
      S.curve([[f.x + f.w * 0.04, top + f.gap * 2.6], [f.x + f.w * 0.09, top - f.gap * 0.6],
      [f.x + f.w * 0.045, top - f.gap * 1.4], [f.x + f.w * 0.03, top + f.gap * 0.4],
      [f.x + f.w * 0.08, top + f.gap * 1.6], [f.x + f.w * 0.05, top + f.gap * 3.2]],
        { color: pal.accent[0], width: 0.3, speed: 55 });
      M.bird.draw(S, f.x + f.w * 0.9, top - f.gap * 2.2, f.gap * 1.7, pal);
    }
  });

  riff({
    id: "fence", kinds: ["rules"], tags: ["fence", "cat", "garden", "evening", "home", "village"],
    story: "nailed a fence across %s",
    draw: function (S, f, pal) {
      var ys = ruleYs(f, 8), rnd = S.rnd;
      var top = ys[Math.max(0, Math.floor(ys.length * 0.3))];
      var bot = ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.3) + 3)];
      for (var i = 0; i < 7; i++) {
        var x = f.x + f.w * (0.08 + (i / 6) * 0.84);
        S.line(x, top - f.gap * 0.8, x, bot + f.gap * 0.5, { color: pal.ink, width: 0.3, speed: 80 });
        S.stroke([{ x: x - f.gap * 0.22, y: top - f.gap * 0.8 }, { x: x, y: top - f.gap * 1.25 },
        { x: x + f.gap * 0.22, y: top - f.gap * 0.8 }], { color: pal.ink, width: 0.24, speed: 110 });
      }
      M.cat.draw(S, f.x + f.w * 0.62, top - f.gap * 0.9, f.gap * 5, pal);
      M.bird.draw(S, f.x + f.w * 0.18, top - f.gap * 2.6, f.gap * 1.5, pal);
      grass(S, f.x + f.w * 0.3, bot + f.gap * 0.5, f.gap * 0.7, pal, 7);
    }
  });

  riff({
    id: "rainLines", kinds: ["rules"], tags: ["rain", "storm", "weather", "umbrella", "wet", "autumn"],
    story: "let rain fall between %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      for (var i = 0; i < 40; i++) {
        var x = f.x + rnd() * f.w, y = f.y + rnd() * f.h * 0.8;
        S.line(x, y, x - f.gap * 0.22, y + f.gap * 0.8,
          { color: pal.accent[2] || pal.ink2, width: 0.2, speed: 200, alpha: 0.7 });
      }
      M.umbrella.draw(S, f.x + f.w * 0.5, f.y + f.h * 0.62, f.gap * 6, pal);
      M.cloud.draw(S, f.x + f.w * 0.24, f.y + f.gap * 0.6, f.gap * 2.2, pal);
    }
  });

  /* ===================== edge: a strong line already there ================= */

  function edgeAt(f, t) {
    return { x: f.x1 + (f.x2 - f.x1) * t, y: f.y1 + (f.y2 - f.y1) * t };
  }
  function edgeLen(f) {
    return Math.sqrt(Math.pow(f.x2 - f.x1, 2) + Math.pow(f.y2 - f.y1, 2));
  }

  riff({
    id: "washing", kinds: ["edge"], tags: ["home", "laundry", "village", "summer", "cozy", "line"],
    story: "pegged washing along %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd, L = edgeLen(f), u = L * 0.07;
      for (var i = 0; i < 5; i++) {
        var p = edgeAt(f, 0.16 + i * 0.17);
        S.line(p.x, p.y - u * 0.22, p.x, p.y + u * 0.22, { color: pal.ink, width: 0.24, speed: 140 });
        var w = u * (0.5 + rnd() * 0.3), h = u * (0.7 + rnd() * 0.5);
        S.stroke([{ x: p.x - w, y: p.y + u * 0.1 }, { x: p.x - w * 0.8, y: p.y + h },
        { x: p.x + w * 0.8, y: p.y + h }, { x: p.x + w, y: p.y + u * 0.1 }],
          { color: pal.ink, width: 0.26, speed: 75 });
        S.shade(p.x, p.y + h * 0.6, w * 0.6, h * 0.3, 1.2, 6,
          { color: pal.accent[i % pal.accent.length], width: 0.45, alpha: 0.28 });
      }
      M.bird.draw(S, edgeAt(f, 0.82).x, edgeAt(f, 0.82).y - u * 0.5, u * 0.8, pal);
    }
  });

  riff({
    id: "tightrope", kinds: ["edge"], tags: ["balance", "circus", "cat", "brave", "calm", "careful"],
    story: "walked a cat along %s",
    draw: function (S, f, pal) {
      var L = edgeLen(f), u = L * 0.09;
      var p = edgeAt(f, 0.42);
      M.cat.draw(S, p.x, p.y, u * 2.2, pal);
      S.line(p.x - u * 1.5, p.y - u * 1.5, p.x + u * 1.5, p.y - u * 1.2,
        { color: pal.ink, width: 0.24, speed: 110 });
      var q = edgeAt(f, 0.78);
      M.bird.draw(S, q.x, q.y - u * 0.6, u * 0.7, pal);
      var r = edgeAt(f, 0.14);
      M.star.draw(S, r.x, r.y - u * 1.4, u * 0.5, pal);
    }
  });

  riff({
    id: "skyline", kinds: ["edge"], tags: ["city", "town", "urban", "buildings", "home", "village", "night"],
    story: "stood a little town on %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd, L = edgeLen(f), u = L * 0.08;
      for (var i = 0; i < 6; i++) {
        var p = edgeAt(f, 0.12 + i * 0.14);
        var bw = u * (0.4 + rnd() * 0.3), bh = u * (0.6 + rnd() * 1.1);
        S.stroke([{ x: p.x - bw, y: p.y }, { x: p.x - bw, y: p.y - bh },
        { x: p.x + bw, y: p.y - bh }, { x: p.x + bw, y: p.y }],
          { color: pal.ink, width: 0.28, speed: 65 });
        if (rnd() > 0.45) {
          S.stroke([{ x: p.x - bw * 1.2, y: p.y - bh }, { x: p.x, y: p.y - bh - u * 0.4 },
          { x: p.x + bw * 1.2, y: p.y - bh }], { color: pal.ink, width: 0.24, speed: 90 });
        }
        for (var k = 0; k < 2; k++) {
          var wy = p.y - bh + u * 0.2 + k * u * 0.3;
          if (wy > p.y - u * 0.15) continue;
          S.line(p.x - bw * 0.4, wy, p.x + bw * 0.4, wy,
            { color: pal.accent[0], width: 0.28, speed: 160, alpha: 0.7 });
        }
      }
      M.bird.draw(S, edgeAt(f, 0.85).x, edgeAt(f, 0.85).y - u * 2.2, u * 0.7, pal);
      M.bird.draw(S, edgeAt(f, 0.92).x, edgeAt(f, 0.92).y - u * 1.6, u * 0.5, pal);
    }
  });

  riff({
    id: "sailAlong", kinds: ["edge"], tags: ["sail", "sea", "boat", "journey", "sunset", "ocean"],
    story: "sailed a boat along %s",
    draw: function (S, f, pal) {
      var L = edgeLen(f), u = L * 0.1;
      var p = edgeAt(f, 0.38);
      M.sailboat.draw(S, p.x, p.y - u * 0.35, u * 2.1, pal);
      var s = edgeAt(f, 0.76);
      M.sun.draw(S, s.x, s.y - u * 1.5, u * 1.5, pal);
      var q = edgeAt(f, 0.14);
      M.wave.draw(S, q.x, q.y + u * 0.2, u * 1.2, pal);
      M.wave.draw(S, edgeAt(f, 0.6).x, edgeAt(f, 0.6).y + u * 0.3, u, pal);
    }
  });

  /* ===================== frame: a rectangle already drawn ================== */

  riff({
    id: "window", kinds: ["frame"], tags: ["window", "night", "moon", "home", "view", "dream", "cozy"],
    story: "made %s a window",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var cw = f.w * 0.2;
      [-1, 1].forEach(function (d) {
        var x = d < 0 ? f.x : f.x + f.w;
        S.stroke([{ x: x, y: f.y }, { x: x + d * -cw * 0.8, y: f.y + f.h * 0.28 },
        { x: x + d * -cw * 0.3, y: f.y + f.h * 0.55 }, { x: x + d * -cw, y: f.y + f.h * 0.8 }],
          { color: pal.ink, width: 0.3, speed: 55 });
        for (var i = 1; i < 4; i++) {
          S.curve([[x, f.y + f.h * 0.05], [x + d * -cw * 0.5 * (i / 3), f.y + f.h * 0.35],
          [x + d * -cw * 0.75 * (i / 3), f.y + f.h * 0.75]],
            { color: pal.ink2, width: 0.18, speed: 90, alpha: 0.6 });
        }
      });
      /* sill and glazing bars */
      S.line(f.x - f.w * 0.03, f.y + f.h, f.x + f.w * 1.03, f.y + f.h,
        { color: pal.ink, width: 0.34, speed: 70 });
      S.line(f.x + f.w * 0.5, f.y + f.h * 0.1, f.x + f.w * 0.5, f.y + f.h,
        { color: pal.ink, width: 0.22, speed: 90, alpha: 0.8 });
      S.line(f.x + f.w * 0.06, f.y + f.h * 0.52, f.x + f.w * 0.94, f.y + f.h * 0.52,
        { color: pal.ink, width: 0.22, speed: 90, alpha: 0.8 });
      /* the view */
      M.moon.draw(S, f.x + f.w * 0.74, f.y + f.h * 0.26, f.h * 0.2, pal);
      for (var i = 0; i < 5; i++) {
        M.star.draw(S, f.x + f.w * (0.1 + rnd() * 0.8), f.y + f.h * (0.08 + rnd() * 0.32), f.h * 0.05, pal);
      }
      M.pine.draw(S, f.x + f.w * 0.22, f.y + f.h * 0.98, f.h * 0.34, pal);
      M.pine.draw(S, f.x + f.w * 0.36, f.y + f.h * 0.98, f.h * 0.24, pal);
      M.cat.draw(S, f.x + f.w * 0.68, f.y + f.h, f.h * 0.3, pal);
    }
  });

  riff({
    id: "doorway", kinds: ["frame"], tags: ["door", "path", "journey", "adventure", "away", "castle"],
    story: "opened %s like a doorway",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var cx = f.x + f.w * 0.5, base = f.y + f.h;
      S.curve([[cx - f.w * 0.16, base], [cx - f.w * 0.06, base - f.h * 0.42],
      [cx + f.w * 0.02, base - f.h * 0.72]], { color: pal.ink, width: 0.3, speed: 60 });
      S.curve([[cx + f.w * 0.16, base], [cx + f.w * 0.1, base - f.h * 0.42],
      [cx + f.w * 0.06, base - f.h * 0.72]], { color: pal.ink, width: 0.3, speed: 60 });
      for (var i = 0; i < 9; i++) {
        var t = i / 9;
        var w = f.w * (0.15 - t * 0.11);
        S.line(cx - w, base - f.h * 0.72 * t, cx + w, base - f.h * 0.72 * t,
          { color: pal.ink2, width: 0.16, speed: 180, alpha: 0.4 });
      }
      M.mountain.draw(S, cx + f.w * 0.05, base - f.h * 0.72, f.h * 0.3, pal);
      M.sun.draw(S, cx - f.w * 0.22, base - f.h * 0.8, f.h * 0.16, pal);
      M.lantern.draw(S, f.x + f.w * 0.12, f.y + f.h * 0.3, f.h * 0.22, pal);
      M.tree.draw(S, f.x + f.w * 0.88, base, f.h * 0.5, pal);
      grass(S, cx, base, f.h * 0.05, pal, 9);
    }
  });

  riff({
    id: "peeking", kinds: ["frame"], tags: ["cat", "hello", "peek", "creature", "funny", "owl", "rabbit"],
    story: "had something climb into %s",
    draw: function (S, f, pal) {
      var who = M.owl ? "owl" : "cat";
      var base = f.y + f.h;
      S.line(f.x - f.w * 0.02, base, f.x + f.w * 1.02, base,
        { color: pal.ink, width: 0.32, speed: 70 });
      M[who].draw(S, f.x + f.w * 0.38, base, f.h * 0.52, pal);
      M.rabbit.draw(S, f.x + f.w * 0.72, base, f.h * 0.32, pal);
      M.butterfly.draw(S, f.x + f.w * 0.2, f.y + f.h * 0.3, f.h * 0.12, pal);
      grass(S, f.x + f.w * 0.6, base, f.h * 0.05, pal, 8);
      M.flower.draw(S, f.x + f.w * 0.14, base, f.h * 0.2, pal);
    }
  });

  /* ===================== corner: tape, folds ============================== */

  riff({
    id: "underTape", kinds: ["corner"], tags: ["vine", "grow", "leaf", "garden", "spring", "botanical"],
    story: "grew a vine out from under %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var dir = f.x < 50 ? 1 : -1;
      var scale = 12;
      var pts = [];
      for (var i = 0; i <= 22; i++) {
        var t = i / 22;
        pts.push([f.x + dir * t * scale * 2.4, f.y + Math.sin(t * 5) * scale * 0.5 + t * scale * 1.6]);
      }
      S.curve(pts, { color: pal.leaf, width: 0.28, speed: 60 });
      for (var k = 2; k < 22; k += 3) {
        M.leaf.draw(S, pts[k][0], pts[k][1], scale * 0.34, pal);
      }
      M.flower.draw(S, pts[20][0], pts[20][1] + scale * 0.4, scale * 0.7, pal);
      M.bee.draw(S, pts[12][0] + dir * scale * 0.6, pts[12][1] - scale * 0.6, scale * 0.3, pal);
    }
  });

  /* ===================== spikes: binding, treeline ======================== */

  riff({
    id: "climbing", kinds: ["spikes"], tags: ["snail", "climb", "slow", "patience", "journey"],
    story: "sent a climber up %s",
    draw: function (S, f, pal) {
      var u = Math.max(4, f.w * 0.8);
      M.snail.draw(S, f.x + f.w * 1.5, f.y + f.h * 0.42, u, pal);
      var pts = [];
      for (var i = 0; i <= 18; i++) {
        var t = i / 18;
        pts.push([f.x + f.w * 1.1 + Math.sin(t * 7) * u * 0.35, f.y + f.h * (0.42 + t * 0.5)]);
      }
      S.curve(pts, { color: pal.ink2, width: 0.18, speed: 120, alpha: 0.6 });
      M.leaf.draw(S, f.x + f.w * 1.6, f.y + f.h * 0.2, u * 0.7, pal);
      M.butterfly.draw(S, f.x + f.w * 2.2, f.y + f.h * 0.14, u * 0.7, pal);
    }
  });

  riff({
    id: "overTrees", kinds: ["spikes", "edge"], tags: ["forest", "winter", "snow", "wild", "night", "moon"],
    story: "sent something over %s",
    draw: function (S, f, pal) {
      /* works off either geometry: a band of spikes, or a bare edge */
      var cx, cy, span;
      if (f.x1 !== undefined) {
        cx = (f.x1 + f.x2) / 2; cy = (f.y1 + f.y2) / 2; span = edgeLen(f);
      } else {
        cx = f.x + f.w * 0.5; cy = f.y; span = f.w;
      }
      var u = Math.max(5, span * 0.09);
      cy -= u * 1.2;
      M.moon.draw(S, cx + u * 2.4, cy - u * 1.4, u * 1.6, pal);
      M.bird.draw(S, cx - u * 2.2, cy - u * 0.6, u * 1.1, pal);
      M.bird.draw(S, cx - u * 0.4, cy - u * 1.6, u * 0.8, pal);
      M.bird.draw(S, cx + u * 0.9, cy - u * 0.4, u * 0.6, pal);
    }
  });

  /* ---------------- lookup ---------------- */

  /* ================= faces: the two posts, put together ==================
     Ann's brief is to build on what is already printed; Mannay's is that a
     face is a handful of random parts. So: give the thing on the picture a
     face. The outline is already there — only the features get drawn. */

  riff({
    id: "faceIt", kinds: ["disc", "motif"],
    tags: ["face", "faces", "person", "people", "someone", "portrait", "doodle", "alive", "funny"],
    story: "gave %s a face",
    draw: function (S, f, pal) {
      var r = f.r || Math.max(f.w || 0, f.h || 0) / 2 || 10;
      /* Drawing dark ink onto a dark pip or blot puts the face where nobody
         can see it, so the ink flips to chalk when the thing is dark. */
      var p = f.dark
        ? Object.assign({}, pal, { ink: "#f7f3e8", ink2: "#ded8c8", soft: "#cfc8b8" })
        : pal;
      /* the features are scaled to the thing they land on, not to the region */
      global.FACES.featuresOnly(S, f.x, f.y, r * 1.8, p);
    }
  });

  riff({
    id: "crowdAround", kinds: ["disc", "motif", "frame", "edge"],
    tags: ["crowd", "people", "faces", "audience", "everyone", "watching", "queue", "doodles"],
    story: "drew a crowd watching %s",
    draw: function (S, f, pal) {
      var rnd = S.rnd;
      var r = f.r || Math.max(f.w || 0, f.h || 0) / 2 || 10;
      var cx = f.x !== undefined ? f.x : (f.x1 + f.x2) / 2;
      var cy = f.y !== undefined ? f.y : (f.y1 + f.y2) / 2;
      /* a ring of onlookers, all facing whatever it is */
      var n = 7 + ((rnd() * 4) | 0);
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + rnd() * 0.3;
        var d = r * (1.9 + rnd() * 0.9);
        global.FACES.face(S, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75,
          r * (0.55 + rnd() * 0.3), pal);
      }
    }
  });

  var byKind = {};
  R.forEach(function (r) {
    r.kinds.forEach(function (k) {
      if (!byKind[k]) byKind[k] = [];
      byKind[k].push(r);
    });
  });

  global.RIFFS = {
    all: R,
    forKind: function (k) { return byKind[k] || []; },
    kinds: Object.keys(byKind)
  };
})(window);
