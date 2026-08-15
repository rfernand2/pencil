/* faces.js — doodled heads, generated rather than drawn.
 *
 * Inspired by Mannay's "you can just draw faces with javascript" post: a page
 * of little biro heads, no two alike. Every part here is a small set of
 * variants picked at random, so a crowd is never the same face repeated.
 *
 * Everything is in LOCAL units and anchored at the centre of the head, with
 * `s` the head's height. Kept to roughly a dozen strokes per face: these are
 * often drawn at 8-14 units across, where detail turns to mud.
 */
(function (global) {
  "use strict";

  /* A closed outline with a hand's worth of wobble in it. */
  function blob(cx, cy, rx, ry, rnd, warp) {
    var pts = [], n = 26;
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2;
      var k = warp ? warp(t) : 1;
      pts.push({
        x: cx + Math.cos(t) * rx * k + (rnd() - 0.5) * rx * 0.07,
        y: cy + Math.sin(t) * ry * k + (rnd() - 0.5) * ry * 0.07
      });
    }
    return pts;
  }

  /* ---------- the parts ---------- */

  var HEADS = [
    function () { return 1; },                                    /* oval */
    function (t) { return 1 + Math.sin(t) * 0.11; },              /* egg, heavy jaw */
    function (t) { return 1 + Math.cos(t * 2) * 0.09; },          /* squarish */
    function (t) { return 1 - Math.sin(t) * 0.10; },              /* pear, narrow chin */
    function (t) { return 1 + Math.cos(t) * 0.08; }               /* leaning */
  ];

  function drawHair(S, x, y, s, pal, rnd, rx, ry) {
    var kind = (rnd() * 7) | 0;
    var top = y - ry * 0.98;
    var ink = { color: pal.ink, width: 0.26, speed: 62 };
    var fine = { color: pal.ink, width: 0.2, speed: 88 };
    var i, t, px;

    if (kind === 0) return "bald";

    if (kind === 1) {                                   /* cropped, scribbled in */
      S.scribble(x, top + ry * 0.22, rx * 0.86, ry * 0.28, 0, 6,
        { color: pal.ink, width: 0.42, speed: 120, alpha: 0.9 });
      return "cropped";
    }
    if (kind === 2) {                                   /* spikes */
      for (i = 0; i < 9; i++) {
        t = -0.9 + (i / 8) * 1.8;
        px = x + Math.sin(t) * rx * 0.92;
        S.stroke([{ x: px, y: y - Math.cos(t) * ry * 0.92 },
        { x: px + (rnd() - 0.5) * s * 0.10, y: y - Math.cos(t) * ry * 1.24 }], fine);
      }
      return "spiky";
    }
    if (kind === 3) {                                   /* curls */
      for (i = 0; i < 7; i++) {
        t = -1.0 + (i / 6) * 2.0;
        px = x + Math.sin(t) * rx * 0.86;
        var py = y - Math.cos(t) * ry * 0.94;
        S.ellipse(px, py - ry * 0.10, s * 0.075, s * 0.065, rnd() * 2, fine);
      }
      return "curly";
    }
    if (kind === 4) {                                   /* a parting, swept over */
      S.curve([[x - rx * 0.95, y - ry * 0.42], [x - rx * 0.5, y - ry * 1.10],
      [x + rx * 0.35, y - ry * 1.02], [x + rx * 0.92, y - ry * 0.5]], ink);
      for (i = 0; i < 4; i++) {
        S.curve([[x - rx * 0.6 + i * rx * 0.34, y - ry * 0.95],
        [x - rx * 0.2 + i * rx * 0.34, y - ry * 0.66],
        [x - rx * 0.35 + i * rx * 0.34, y - ry * 0.44]], fine);
      }
      return "parted";
    }
    if (kind === 5) {                                   /* a cap */
      S.stroke(blob(x, top + ry * 0.26, rx * 0.98, ry * 0.34, rnd), ink);
      /* a closed peak that sits on the head, not a flag flying off it */
      S.poly([{ x: x + rx * 0.12, y: top + ry * 0.46 },
      { x: x + rx * 1.16, y: top + ry * 0.44 },
      { x: x + rx * 1.06, y: top + ry * 0.64 },
      { x: x + rx * 0.28, y: top + ry * 0.68 }], true, ink);
      S.scribble(x, top + ry * 0.26, rx * 0.8, ry * 0.22, 0, 4,
        { color: pal.ink, width: 0.4, speed: 130, alpha: 0.55 });
      return "a cap";
    }
    /* a band across the forehead */
    S.stroke([{ x: x - rx * 0.98, y: y - ry * 0.5 }, { x: x, y: y - ry * 0.66 },
    { x: x + rx * 0.98, y: y - ry * 0.5 }], { color: pal.ink, width: 0.42, speed: 70 });
    return "a headband";
  }

  function drawEyes(S, x, y, s, pal, rnd) {
    var kind = (rnd() * 7) | 0;
    var ey = y - s * 0.07, dx = s * 0.15, r = s * 0.05;
    var fine = { color: pal.ink, width: 0.2, speed: 85 };
    var i, sx;

    /* the doodles this comes from love a mismatched pair */
    var lopsided = rnd() < 0.35 ? s * 0.02 : 0;

    if (kind === 0) {                                   /* two dots */
      S.dot(x - dx, ey, r * 0.6, { color: pal.ink });
      S.dot(x + dx, ey + lopsided, r * 0.6, { color: pal.ink });
    } else if (kind === 1) {                            /* open rings */
      S.ellipse(x - dx, ey, r, r, 0, fine);
      S.ellipse(x + dx, ey + lopsided, r * 1.15, r, 0, fine);
    } else if (kind === 2) {                            /* rings with pupils */
      for (i = 0; i < 2; i++) {
        sx = x + (i ? dx : -dx);
        S.ellipse(sx, ey + (i ? lopsided : 0), r * 1.1, r, 0, fine);
        S.dot(sx + r * 0.25, ey + (i ? lopsided : 0), r * 0.4, { color: pal.ink });
      }
    } else if (kind === 3) {                            /* both shut */
      S.curve([[x - dx - r, ey], [x - dx, ey + r * 0.7], [x - dx + r, ey]], fine);
      S.curve([[x + dx - r, ey], [x + dx, ey + r * 0.7], [x + dx + r, ey]], fine);
    } else if (kind === 4) {                            /* a wink */
      S.ellipse(x - dx, ey, r * 1.1, r, 0, fine);
      S.dot(x - dx + r * 0.2, ey, r * 0.4, { color: pal.ink });
      S.curve([[x + dx - r, ey], [x + dx, ey + r * 0.8], [x + dx + r, ey]], fine);
    } else if (kind === 5) {                            /* glasses */
      var gr = r * 1.55;
      S.ellipse(x - dx, ey, gr, gr * 0.85, 0, fine);
      S.ellipse(x + dx, ey, gr, gr * 0.85, 0, fine);
      S.stroke([{ x: x - dx + gr, y: ey }, { x: x + dx - gr, y: ey }], fine);
      S.dot(x - dx, ey, r * 0.35, { color: pal.ink });
      S.dot(x + dx, ey, r * 0.35, { color: pal.ink });
      return "glasses";
    } else {                                            /* an eyepatch */
      S.ellipse(x + dx, ey, r * 1.1, r, 0, fine);
      S.dot(x + dx, ey, r * 0.4, { color: pal.ink });
      S.scribble(x - dx, ey, r * 1.3, r * 1.1, 0, 4,
        { color: pal.ink, width: 0.34, speed: 120, alpha: 0.95 });
      S.stroke([{ x: x - dx - r * 1.3, y: ey - r * 0.6 }, { x: x - s * 0.34, y: y - s * 0.2 }], fine);
      return "an eyepatch";
    }

    /* brows, on most of them, and often only one raised */
    if (rnd() < 0.75) {
      var bh = s * (0.055 + rnd() * 0.03);
      S.stroke([{ x: x - dx - r, y: ey - bh }, { x: x - dx + r, y: ey - bh - s * 0.012 }], fine);
      S.stroke([{ x: x + dx - r, y: ey - bh - (rnd() < 0.4 ? s * 0.03 : 0) },
      { x: x + dx + r, y: ey - bh - s * 0.012 }], fine);
    }
    return null;
  }

  function drawNose(S, x, y, s, pal, rnd) {
    var kind = (rnd() * 4) | 0;
    var fine = { color: pal.ink, width: 0.22, speed: 80 };
    var top = y - s * 0.03, bot = y + s * 0.13;
    if (kind === 0) {                                   /* the long doodle nose */
      S.stroke([{ x: x - s * 0.01, y: top }, { x: x + s * 0.02, y: bot },
      { x: x - s * 0.06, y: bot + s * 0.01 }], fine);
    } else if (kind === 1) {                            /* a hook */
      S.curve([[x, top], [x + s * 0.07, y + s * 0.06], [x - s * 0.05, bot]], fine);
    } else if (kind === 2) {                            /* a triangle */
      S.poly([{ x: x, y: top }, { x: x + s * 0.07, y: bot }, { x: x - s * 0.07, y: bot }], true, fine);
    } else {                                            /* a blob and two nostrils */
      S.ellipse(x, y + s * 0.06, s * 0.055, s * 0.045, 0, fine);
      S.dot(x - s * 0.03, y + s * 0.08, s * 0.012, { color: pal.ink });
      S.dot(x + s * 0.03, y + s * 0.08, s * 0.012, { color: pal.ink });
    }
  }

  function drawMouth(S, x, y, s, pal, rnd) {
    var kind = (rnd() * 5) | 0;
    var my = y + s * 0.24, w = s * 0.11;
    var fine = { color: pal.ink, width: 0.22, speed: 80 };
    if (kind === 0) S.stroke([{ x: x - w, y: my }, { x: x + w, y: my + s * 0.008 }], fine);
    else if (kind === 1) S.curve([[x - w, my - s * 0.02], [x, my + s * 0.05], [x + w, my - s * 0.02]], fine);
    else if (kind === 2) S.curve([[x - w, my + s * 0.04], [x, my - s * 0.03], [x + w, my + s * 0.04]], fine);
    else if (kind === 3) S.ellipse(x, my, w * 0.55, s * 0.05, 0, fine);
    else {
      S.curve([[x - w, my], [x, my + s * 0.06], [x + w, my]], fine);
      S.stroke([{ x: x - w * 0.8, y: my + s * 0.012 }, { x: x + w * 0.8, y: my + s * 0.012 }],
        { color: pal.ink, width: 0.16, speed: 100 });
    }
  }

  function drawExtras(S, x, y, s, pal, rnd, rx, ry) {
    var fine = { color: pal.ink, width: 0.2, speed: 88 };
    var r = rnd();
    if (r < 0.22) {                                     /* moustache */
      S.curve([[x - s * 0.13, y + s * 0.17], [x, y + s * 0.13], [x + s * 0.13, y + s * 0.17]],
        { color: pal.ink, width: 0.4, speed: 70 });
    } else if (r < 0.36) {                              /* stubble */
      S.scribble(x, y + s * 0.3, rx * 0.6, ry * 0.22, 0, 3,
        { color: pal.ink, width: 0.24, speed: 140, alpha: 0.45 });
    } else if (r < 0.44) {                              /* a beard */
      S.curve([[x - rx * 0.92, y + ry * 0.1], [x - rx * 0.5, y + ry * 1.05],
      [x + rx * 0.5, y + ry * 1.05], [x + rx * 0.92, y + ry * 0.1]], fine);
    }
    if (rnd() < 0.18) {                                 /* freckles */
      for (var i = 0; i < 5; i++) {
        S.dot(x + (rnd() - 0.5) * rx * 1.2, y + s * 0.1 + (rnd() - 0.5) * s * 0.06,
          s * 0.012, { color: pal.ink2, alpha: 0.8 });
      }
    }
  }

  /* ---------- a whole head ---------- */

  function face(S, x, y, s, pal) {
    var rnd = S.rnd;
    var rx = s * 0.34, ry = s * 0.46;
    var warp = HEADS[(rnd() * HEADS.length) | 0];

    S.move(x - rx, y, 0.2, 2.4);
    S.stroke(blob(x, y, rx, ry, rnd, warp), { color: pal.ink, width: 0.28, speed: 52 });

    /* ears, unless something is covering them */
    var ears = rnd() < 0.8;
    if (ears) {
      S.curve([[x - rx * 0.98, y - s * 0.05], [x - rx * 1.22, y + s * 0.02], [x - rx * 0.96, y + s * 0.09]],
        { color: pal.ink, width: 0.2, speed: 90 });
      S.curve([[x + rx * 0.98, y - s * 0.05], [x + rx * 1.22, y + s * 0.02], [x + rx * 0.96, y + s * 0.09]],
        { color: pal.ink, width: 0.2, speed: 90 });
    }

    drawHair(S, x, y, s, pal, rnd, rx, ry);
    drawEyes(S, x, y, s, pal, rnd);
    drawNose(S, x, y, s, pal, rnd);
    drawMouth(S, x, y, s, pal, rnd);
    drawExtras(S, x, y, s, pal, rnd, rx, ry);

    /* a collar, so it reads as a person rather than a floating head */
    if (rnd() < 0.45) {
      S.curve([[x - rx * 0.7, y + ry * 1.02], [x, y + ry * 1.3], [x + rx * 0.7, y + ry * 1.02]],
        { color: pal.ink2, width: 0.24, speed: 80 });
    }
  }

  /* Just the features, laid onto something already on the picture — the coffee
     ring, the pip, the ink blot. Nothing draws the outline: the picture is it. */
  function featuresOnly(S, x, y, s, pal) {
    var rnd = S.rnd;
    drawEyes(S, x, y, s, pal, rnd);
    drawNose(S, x, y, s, pal, rnd);
    drawMouth(S, x, y, s, pal, rnd);
    if (rnd() < 0.5) drawExtras(S, x, y, s, pal, rnd, s * 0.34, s * 0.46);
  }

  /* A page of them, the way the post had it: a grid, none of them alike. */
  function crowd(S, x, y, w, h, s, pal) {
    var rnd = S.rnd;
    var cols = Math.max(1, Math.round(w / (s * 0.95)));
    var rows = Math.max(1, Math.round(h / (s * 1.15)));
    var gx = w / cols, gy = h / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var fx = x + gx * (c + 0.5) + (rnd() - 0.5) * gx * 0.16;
        var fy = y + gy * (r + 0.5) + (rnd() - 0.5) * gy * 0.14;
        face(S, fx, fy, s * (0.86 + rnd() * 0.28), pal);
      }
    }
    return cols * rows;
  }

  global.FACES = { face: face, featuresOnly: featuresOnly, crowd: crowd };
})(window);
