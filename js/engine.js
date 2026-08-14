/* engine.js — hand-drawn pencil animation engine
 * Borrowed from / generalised out of t_grok.html.
 *
 * Two layers:
 *   Sketch  — collects "actions" (move / stroke / dot / pause) authored in a
 *             local 0..100 unit box, mapped into image-percent coordinates.
 *   Player  — animates those actions onto a canvas with a pencil sprite.
 */
(function (global) {
  "use strict";

  /* ---------- random ---------- */

  function makeRand(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function hashStr(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pick(rnd, arr) { return arr[(rnd() * arr.length) | 0]; }

  function shuffle(rnd, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (rnd() * (i + 1)) | 0;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- curves ---------- */

  function quadPts(x0, y0, x1, y1, x2, y2, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push({
        x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
        y: u * u * y0 + 2 * u * t * y1 + t * t * y2
      });
    }
    return pts;
  }

  function cubicPts(x0, y0, x1, y1, x2, y2, x3, y3, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push({
        x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
      });
    }
    return pts;
  }

  /* Catmull-Rom through a list of [x,y] or {x,y} control points. */
  function smooth(input, per, closed) {
    var p = input.map(function (q) {
      return Array.isArray(q) ? { x: q[0], y: q[1] } : { x: q.x, y: q.y };
    });
    if (p.length < 3) return p;
    per = per || 8;
    var out = [];
    var n = p.length;
    var start = closed ? 0 : 0;
    var end = closed ? n : n - 1;
    for (var i = start; i < end; i++) {
      var p0 = p[(i - 1 + n) % n];
      var p1 = p[i % n];
      var p2 = p[(i + 1) % n];
      var p3 = p[(i + 2) % n];
      if (!closed) {
        p0 = p[Math.max(0, i - 1)];
        p2 = p[Math.min(n - 1, i + 1)];
        p3 = p[Math.min(n - 1, i + 2)];
      }
      for (var k = 0; k < per; k++) {
        var t = k / per, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        });
      }
    }
    out.push(closed ? { x: p[0].x, y: p[0].y } : { x: p[n - 1].x, y: p[n - 1].y });
    return out;
  }

  /* ---------- arc-length ---------- */

  function measure(pts, ar) {
    var cum = [0], L = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x;
      var dy = (pts[i].y - pts[i - 1].y) * ar;
      L += Math.sqrt(dx * dx + dy * dy);
      cum.push(L);
    }
    return { L: L || 0.001, cum: cum };
  }

  function atLen(pts, cum, dist) {
    var total = cum[cum.length - 1];
    if (dist <= 0) {
      return { x: pts[0].x, y: pts[0].y, angle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) };
    }
    if (dist >= total) {
      var n = pts.length;
      return {
        x: pts[n - 1].x, y: pts[n - 1].y,
        angle: Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x)
      };
    }
    var i = 1;
    while (i < cum.length && cum[i] < dist) i++;
    var seg = cum[i] - cum[i - 1];
    var u = seg > 0 ? (dist - cum[i - 1]) / seg : 0;
    return {
      x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u,
      y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u,
      angle: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
    };
  }

  /* =========================================================================
   * Sketch — the drawing vocabulary motifs are written against.
   *
   * All coordinates handed to Sketch methods are in LOCAL units: a 0..100 box
   * across the width of the drawing region, with height running 0..cfg.localH
   * (so one local unit is square on screen).
   * ======================================================================= */

  function Sketch(cfg) {
    this.acts = [];
    this.map = cfg.map;          // (lx,ly) -> {x,y} in image %
    this.u = cfg.u;              // image-%-of-width per local unit
    this.ar = cfg.ar;            // image height/width ratio
    this.localH = cfg.localH;
    this.rnd = cfg.rnd;
    this.jit = 0.16;             // default wobble, local units
    this.style = { color: "#241d16", width: 0.34, alpha: 1, speed: 58 };
    this._penAt = null;
  }

  Sketch.prototype.pen = function (o) {
    if (o.color !== undefined) this.style.color = o.color;
    if (o.width !== undefined) this.style.width = o.width;
    if (o.alpha !== undefined) this.style.alpha = o.alpha;
    if (o.speed !== undefined) this.style.speed = o.speed;
    return this;
  };

  Sketch.prototype.save = function () {
    return { color: this.style.color, width: this.style.width, alpha: this.style.alpha, speed: this.style.speed, jit: this.jit };
  };
  Sketch.prototype.restore = function (s) {
    this.style.color = s.color; this.style.width = s.width;
    this.style.alpha = s.alpha; this.style.speed = s.speed; this.jit = s.jit;
  };

  Sketch.prototype._opt = function (o) {
    o = o || {};
    return {
      color: o.color !== undefined ? o.color : this.style.color,
      width: o.width !== undefined ? o.width : this.style.width,
      alpha: o.alpha !== undefined ? o.alpha : this.style.alpha,
      speed: o.speed !== undefined ? o.speed : this.style.speed
    };
  };

  /* Convert local points -> image %, adding hand wobble on the way. */
  Sketch.prototype._conv = function (pts, wob) {
    var w = wob === undefined ? this.jit : wob;
    var out = [], n = pts.length, rnd = this.rnd;
    for (var i = 0; i < n; i++) {
      var lx = pts[i].x, ly = pts[i].y;
      if (w && i > 0 && i < n - 1) {
        lx += (rnd() - 0.5) * w;
        ly += (rnd() - 0.5) * w;
      }
      out.push(this.map(lx, ly));
    }
    return out;
  };

  /* Lift the pencil and travel to a point without leaving a mark. */
  Sketch.prototype.move = function (lx, ly, dur, lift) {
    var p = this.map(lx, ly);
    this.acts.push({
      type: "move", x: p.x, y: p.y,
      duration: dur === undefined ? 0.24 : dur,
      lift: (lift === undefined ? 2.6 : lift) * this.u / this.ar
    });
    this._penAt = { x: lx, y: ly };
    return this;
  };

  Sketch.prototype.pause = function (d) {
    this.acts.push({ type: "pause", duration: d });
    return this;
  };

  /* Core stroke. `pts` are local {x,y}. */
  Sketch.prototype.path = function (pts, o) {
    if (!pts || pts.length < 2) return this;
    var st = this._opt(o);
    var wob = o && o.wob !== undefined ? o.wob : undefined;
    var cv = this._conv(pts, wob);
    var m = measure(cv, this.ar);
    if (m.L < 1e-4) return this;
    this.acts.push({
      type: "stroke",
      points: cv,
      color: st.color,
      width: Math.max(0.02, st.width * this.u),
      alpha: st.alpha,
      speed: st.speed * this.u,
      length: m.L,
      cum: m.cum
    });
    this._penAt = pts[pts.length - 1];
    return this;
  };

  /* Travel to the start of a stroke, then draw it. */
  Sketch.prototype.stroke = function (pts, o) {
    if (!pts || pts.length < 2) return this;
    var p0 = pts[0];
    var d = 0.1, lift = 1.2;
    if (this._penAt) {
      var dx = p0.x - this._penAt.x, dy = p0.y - this._penAt.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      d = Math.min(0.5, 0.06 + dist * 0.006);
      lift = Math.min(4, 0.5 + dist * 0.05);
    } else {
      d = 0.5; lift = 3;
    }
    this.move(p0.x, p0.y, d, lift);
    return this.path(pts, o);
  };

  Sketch.prototype.line = function (x0, y0, x1, y1, o) {
    var n = (o && o.n) || 6;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
    }
    return this.stroke(pts, o);
  };

  Sketch.prototype.quad = function (x0, y0, x1, y1, x2, y2, o) {
    return this.stroke(quadPts(x0, y0, x1, y1, x2, y2, (o && o.n) || 16), o);
  };

  Sketch.prototype.cubic = function (x0, y0, x1, y1, x2, y2, x3, y3, o) {
    return this.stroke(cubicPts(x0, y0, x1, y1, x2, y2, x3, y3, (o && o.n) || 22), o);
  };

  /* Smooth curve through control points (array of [x,y]). */
  Sketch.prototype.curve = function (ctrl, o) {
    return this.stroke(smooth(ctrl, (o && o.per) || 8, false), o);
  };

  Sketch.prototype.shape = function (ctrl, o) {
    return this.stroke(smooth(ctrl, (o && o.per) || 8, true), o);
  };

  Sketch.prototype.ellipse = function (cx, cy, rx, ry, rot, o) {
    rot = rot || 0;
    var n = (o && o.n) || 30;
    var c = Math.cos(rot), s = Math.sin(rot);
    var pts = [];
    var a0 = (o && o.from !== undefined) ? o.from : 0;
    var a1 = (o && o.to !== undefined) ? o.to : Math.PI * 2;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * (i / n);
      var ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
    }
    return this.stroke(pts, o);
  };

  Sketch.prototype.circle = function (cx, cy, r, o) {
    return this.ellipse(cx, cy, r, r, 0, o);
  };

  Sketch.prototype.poly = function (pts, close, o) {
    var p = pts.map(function (q) { return Array.isArray(q) ? { x: q[0], y: q[1] } : q; });
    if (close) p = p.concat([{ x: p[0].x, y: p[0].y }]);
    /* subdivide so wobble has somewhere to live */
    var out = [];
    for (var i = 0; i < p.length - 1; i++) {
      for (var k = 0; k < 3; k++) {
        var t = k / 3;
        out.push({ x: p[i].x + (p[i + 1].x - p[i].x) * t, y: p[i].y + (p[i + 1].y - p[i].y) * t });
      }
    }
    out.push(p[p.length - 1]);
    return this.stroke(out, o);
  };

  Sketch.prototype.dot = function (lx, ly, r, o) {
    var st = this._opt(o);
    var p = this.map(lx, ly);
    this.acts.push({
      type: "dot", x: p.x, y: p.y,
      r: r * this.u, color: st.color, alpha: st.alpha,
      duration: (o && o.duration) || 0.05
    });
    this._penAt = { x: lx, y: ly };
    return this;
  };

  /* Loose parallel shading inside an ellipse. Fast, scribbly, cheap. */
  Sketch.prototype.shade = function (cx, cy, rx, ry, ang, count, o) {
    var rnd = this.rnd;
    var st = this._opt(o);
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var px = -dy, py = dx;
    var made = 0, tries = 0;
    var first = true;
    while (made < count && tries < count * 14) {
      tries++;
      var a = rnd() * Math.PI * 2;
      var rr = Math.sqrt(rnd());
      var ox = Math.cos(a) * rx * rr, oy = Math.sin(a) * ry * rr;
      var len = (0.28 + rnd() * 0.6) * Math.min(rx, ry) * 1.5;
      var x0 = cx + ox - dx * len * 0.5, y0 = cy + oy - dy * len * 0.5;
      var x1 = cx + ox + dx * len * 0.5, y1 = cy + oy + dy * len * 0.5;
      if (first) { this.move(x0, y0, 0.14, 1.2); first = false; }
      this.path([
        { x: x0, y: y0 },
        { x: (x0 + x1) / 2 + px * (rnd() - 0.5) * 0.4, y: (y0 + y1) / 2 + py * (rnd() - 0.5) * 0.4 },
        { x: x1, y: y1 }
      ], {
        color: st.color,
        width: st.width * (0.8 + rnd() * 0.7),
        alpha: st.alpha * (0.55 + rnd() * 0.5),
        speed: st.speed * 2.6,
        wob: 0.1
      });
      made++;
    }
    return this;
  };

  /* Scribble fill following a direction — denser, more "coloured in". */
  Sketch.prototype.scribble = function (cx, cy, rx, ry, ang, rows, o) {
    var st = this._opt(o);
    var rnd = this.rnd;
    var c = Math.cos(ang), s = Math.sin(ang);
    var pts = [];
    for (var i = 0; i <= rows; i++) {
      var t = i / rows;
      var v = (t - 0.5) * 2;
      var half = Math.sqrt(Math.max(0, 1 - v * v));
      var dir = i % 2 === 0 ? 1 : -1;
      var steps = 4;
      for (var k = 0; k <= steps; k++) {
        var uu = (k / steps) * 2 - 1;
        var uv = dir * uu * half;
        var lx = uv * rx, ly = v * ry;
        pts.push({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
      }
    }
    if (pts.length > 2) {
      this.stroke(pts, {
        color: st.color, width: st.width, alpha: st.alpha,
        speed: st.speed * 3.4, wob: 0.12
      });
    }
    return this;
  };

  /* =========================================================================
   * Player — animates an action list over an image.
   * ======================================================================= */

  function Player(opts) {
    this.img = opts.img;
    this.ink = opts.ink;
    this.cur = opts.cur;
    this.frame = opts.frame;
    this.onProgress = opts.onProgress || function () {};
    this.onDone = opts.onDone || function () {};
    this.actions = [];
    this.W = 300; this.H = 400;
    this.actI = 0;
    this.phase = 0;
    this.rate = 1;
    this.running = false;
    this.pencil = { x: 12, y: 8, angle: 0.7 };
    this.showPencil = false;
    this.pencilTint = null;
    this.lastNow = 0;
    this.raf = null;
    this._drawn = 0;
    this._total = 0;
    var self = this;
    this._loop = function (t) { self._tick(t); };
  }

  Player.prototype.layout = function () {
    var img = this.img;
    var nw = img.naturalWidth || 1000;
    var nh = img.naturalHeight || 1000;
    var host = this.frame.parentNode;
    var maxW = host.clientWidth - 8;
    var maxH = host.clientHeight - 8;
    if (maxW <= 0) maxW = 600;
    if (maxH <= 0) maxH = 600;
    var s = Math.min(maxW / nw, maxH / nh);
    this.W = Math.max(40, Math.round(nw * s));
    this.H = Math.max(40, Math.round(nh * s));
    this.frame.style.width = this.W + "px";
    this.frame.style.height = this.H + "px";
    img.style.width = this.W + "px";
    img.style.height = this.H + "px";
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var list = [this.ink, this.cur];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      c.style.width = this.W + "px";
      c.style.height = this.H + "px";
      c.width = Math.round(this.W * dpr);
      c.height = Math.round(this.H * dpr);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.inkCtx = this.ink.getContext("2d");
    this.curCtx = this.cur.getContext("2d");
  };

  Player.prototype.clear = function () {
    if (this.inkCtx) this.inkCtx.clearRect(0, 0, this.W, this.H);
    if (this.curCtx) this.curCtx.clearRect(0, 0, this.W, this.H);
    this.showPencil = false;
  };

  Player.prototype.stop = function () {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    if (this.curCtx) this.curCtx.clearRect(0, 0, this.W, this.H);
    this.showPencil = false;
  };

  Player.prototype.play = function (actions) {
    this.stop();
    this.actions = actions;
    this.actI = 0;
    this.phase = 0;
    this._drawn = 0;
    this._total = 0;
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      this._total += a.type === "stroke" ? a.length : 0.25;
    }
    if (this._total <= 0) this._total = 1;
    this.clear();
    this.pencil.x = 6; this.pencil.y = 4; this.pencil.angle = 0.9;
    this.running = true;
    this.lastNow = 0;
    this.raf = requestAnimationFrame(this._loop);
  };

  /* Render everything remaining instantly. */
  Player.prototype.finishNow = function () {
    if (!this.actions.length) return;
    for (var i = this.actI; i < this.actions.length; i++) {
      var a = this.actions[i];
      if (a.type === "stroke") this._portion(a, i === this.actI ? this.phase : 0, 1);
      else if (a.type === "dot") this._dot(a);
    }
    this.actI = this.actions.length;
    this.phase = 0;
    this._drawn = this._total;
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    if (this.curCtx) this.curCtx.clearRect(0, 0, this.W, this.H);
    this.showPencil = false;
    this.onProgress(1);
    this.onDone();
  };

  /* Draw the whole action list onto any context at any size — used for
   * re-rendering after a resize and for exporting a full-resolution PNG. */
  Player.prototype.renderTo = function (ctx, W, H) {
    var self = this;
    var sX = function (v) { return (v / 100) * W; };
    var sY = function (v) { return (v / 100) * H; };
    var sW = function (v) { return (v / 100) * W; };
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 0; i < self.actions.length; i++) {
      var a = self.actions[i];
      if (a.type === "stroke") {
        ctx.globalAlpha = a.alpha;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = Math.max(0.6, sW(a.width));
        ctx.beginPath();
        ctx.moveTo(sX(a.points[0].x), sY(a.points[0].y));
        for (var k = 1; k < a.points.length; k++) ctx.lineTo(sX(a.points[k].x), sY(a.points[k].y));
        ctx.stroke();
      } else if (a.type === "dot") {
        ctx.globalAlpha = a.alpha;
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(sX(a.x), sY(a.y), Math.max(0.5, sW(a.r)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  Player.prototype._X = function (x) { return (x / 100) * this.W; };
  Player.prototype._Y = function (y) { return (y / 100) * this.H; };
  Player.prototype._S = function (u) { return (u / 100) * this.W; };

  Player.prototype._dot = function (a) {
    var g = this.inkCtx;
    g.save();
    g.globalAlpha = a.alpha;
    g.fillStyle = a.color;
    g.beginPath();
    g.arc(this._X(a.x), this._Y(a.y), Math.max(0.7, this._S(a.r)), 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  Player.prototype._portion = function (a, t0, t1) {
    if (t1 <= t0) return;
    var d0 = t0 * a.length, d1 = t1 * a.length;
    var p0 = atLen(a.points, a.cum, d0);
    var pts = [{ x: p0.x, y: p0.y }];
    for (var i = 0; i < a.points.length; i++) {
      if (a.cum[i] > d0 && a.cum[i] < d1) pts.push(a.points[i]);
    }
    var p1 = atLen(a.points, a.cum, d1);
    pts.push({ x: p1.x, y: p1.y });

    var g = this.inkCtx;
    g.save();
    g.globalAlpha = a.alpha;
    g.strokeStyle = a.color;
    g.lineWidth = Math.max(0.8, this._S(a.width));
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(this._X(pts[0].x), this._Y(pts[0].y));
    for (var k = 1; k < pts.length; k++) g.lineTo(this._X(pts[k].x), this._Y(pts[k].y));
    g.stroke();
    g.restore();
  };

  Player.prototype._advance = function (dt) {
    var guard = 0;
    while (dt > 0 && this.actI < this.actions.length && guard++ < 400) {
      var a = this.actions[this.actI];

      if (a.type === "pause") {
        this.showPencil = this.actI > 0;
        var need = (1 - this.phase) * a.duration;
        if (dt < need) { this.phase += dt / a.duration; return; }
        dt -= need; this._drawn += 0.25; this.actI++; this.phase = 0;
        continue;
      }

      if (a.type === "move") {
        if (this.phase === 0) { a._x0 = this.pencil.x; a._y0 = this.pencil.y; }
        this.showPencil = true;
        var needM = (1 - this.phase) * a.duration;
        var step = Math.min(dt, needM);
        this.phase += step / a.duration;
        dt -= step;
        var t = Math.min(1, this.phase);
        var e = t * t * (3 - 2 * t);
        this.pencil.x = a._x0 + (a.x - a._x0) * e;
        this.pencil.y = a._y0 + (a.y - a._y0) * e - Math.sin(t * Math.PI) * a.lift;
        var ang = Math.atan2(a.y - a._y0, a.x - a._x0);
        if (ang) this.pencil.angle = ang;
        if (t >= 1) {
          this.pencil.x = a.x; this.pencil.y = a.y;
          this._drawn += 0.25; this.actI++; this.phase = 0;
        }
        continue;
      }

      if (a.type === "dot") {
        this.showPencil = true;
        this.pencil.x = a.x; this.pencil.y = a.y;
        var needD = (1 - this.phase) * a.duration;
        if (dt < needD) { this.phase += dt / a.duration; return; }
        dt -= needD;
        this._dot(a);
        this._drawn += 0.25; this.actI++; this.phase = 0;
        continue;
      }

      /* stroke */
      this.showPencil = true;
      var span = a.length / a.speed;                 // seconds for the whole stroke
      var needS = (1 - this.phase) * span;
      var use = Math.min(dt, needS);
      var t0 = this.phase;
      this.phase = Math.min(1, this.phase + use / span);
      dt -= use;
      this._portion(a, t0, this.phase);
      this._drawn += a.length * (this.phase - t0);
      var pos = atLen(a.points, a.cum, this.phase * a.length);
      this.pencil.x = pos.x; this.pencil.y = pos.y; this.pencil.angle = pos.angle;
      if (this.phase >= 1) { this.actI++; this.phase = 0; }
    }
  };

  Player.prototype._tick = function (now) {
    if (!this.running) return;
    if (!this.lastNow) this.lastNow = now;
    var dt = Math.min(0.06, (now - this.lastNow) / 1000) * this.rate;
    this.lastNow = now;

    this._advance(dt);

    if (this.curCtx) {
      this.curCtx.clearRect(0, 0, this.W, this.H);
      if (this.showPencil) this._pencil(this.curCtx, this.pencil.x, this.pencil.y, this.pencil.angle);
    }
    this.onProgress(Math.min(1, this._drawn / this._total));

    if (this.actI >= this.actions.length) {
      this.running = false;
      this.showPencil = false;
      if (this.curCtx) this.curCtx.clearRect(0, 0, this.W, this.H);
      this.onProgress(1);
      this.onDone();
      return;
    }
    this.raf = requestAnimationFrame(this._loop);
  };

  /* The pencil sprite, lifted straight from t_grok.html. */
  Player.prototype._pencil = function (ctx, x, y, angle) {
    var tint = this.pencilTint;
    ctx.save();
    ctx.translate(this._X(x), this._Y(y));
    ctx.rotate(angle + Math.PI / 2);
    var s = this.W * 0.00215;
    ctx.scale(s, s);

    ctx.save();
    ctx.translate(3.2, 2.4);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-6.8, 22); ctx.lineTo(-6.8, 77);
    ctx.lineTo(6.8, 77); ctx.lineTo(6.8, 22); ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-4.3, 14); ctx.lineTo(4.3, 14); ctx.closePath();
    ctx.fillStyle = tint ? "#efe7dc" : "#4a4a4a";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-1.55, 5.2); ctx.lineTo(1.55, 5.2); ctx.closePath();
    ctx.fillStyle = tint || "#1a1a1a";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-4.3, 14); ctx.lineTo(-6.7, 22); ctx.lineTo(6.7, 22); ctx.lineTo(4.3, 14);
    ctx.closePath();
    ctx.fillStyle = "#e8c57a";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-1.2, 22); ctx.lineTo(1.2, 22); ctx.closePath();
    ctx.fillStyle = "#d7b066";
    ctx.fill();

    var body = tint ? "#dfe6ee" : "#f1d03c";
    var edge = tint ? "#c3ccd6" : "#e0bf2a";
    ctx.fillStyle = body;
    ctx.fillRect(-6.7, 22, 13.4, 38);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(-5.2, 23, 2.1, 36);
    ctx.fillStyle = edge;
    ctx.fillRect(-6.7, 22, 1.5, 38);
    ctx.fillRect(5.2, 22, 1.5, 38);

    ctx.fillStyle = "#c8ccd2";
    ctx.fillRect(-6.9, 60, 13.8, 8);
    ctx.fillStyle = "#9aa1aa";
    ctx.fillRect(-6.9, 61.6, 13.8, 1.15);
    ctx.fillRect(-6.9, 65.6, 13.8, 1.15);

    ctx.fillStyle = "#e898a6";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-6.5, 68, 13, 9.2, 2.2);
    else ctx.rect(-6.5, 68, 13, 9.2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(-4.6, 69, 2, 6);

    ctx.restore();
  };

  global.PX = {
    makeRand: makeRand,
    hashStr: hashStr,
    pick: pick,
    shuffle: shuffle,
    smooth: smooth,
    quadPts: quadPts,
    cubicPts: cubicPts,
    Sketch: Sketch,
    Player: Player
  };
})(window);
