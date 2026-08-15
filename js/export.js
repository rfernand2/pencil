/* export.js — write a drawing out as a standalone HTML file that replays it.
 *
 * The file is fully self-contained: the picture goes in as a data URL and the
 * action list as JSON, so it opens off a USB stick with no network and no
 * other files. Nothing is fetched at run time.
 *
 * The player below is a deliberate port of the pacing half of js/engine.js —
 * measure / atLen / portion / advance — and nothing else. It replays; it does
 * not compose, so it needs no Sketch, no motifs, no riffs, no tool tray. Keep
 * it that way: if it grows a second copy of the drawing vocabulary, the two
 * will drift.
 */
(function (global) {
  "use strict";

  /* Coordinates carry far more precision than a screen can show. Two decimals
     is under a thousandth of the picture's width and cuts the file by a third. */
  function trim(actions) {
    var r = function (v) { return Math.round(v * 100) / 100; };
    return actions.map(function (a) {
      var o = {};
      for (var k in a) {
        if (k === "cum" || k === "length" || k === "_x0" || k === "_y0") continue;  // recomputed on load
        o[k] = a[k];
      }
      if (o.points) {
        o.points = o.points.map(function (p) { return { x: r(p.x), y: r(p.y) }; });
      }
      if (o.x !== undefined) o.x = r(o.x);
      if (o.y !== undefined) o.y = r(o.y);
      if (o.r !== undefined) o.r = r(o.r);
      return o;
    });
  }

  function esc(s) {
    /* only </ can end the script block early */
    return String(s).replace(/<\//g, "<\\/");
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var PLAYER = [
    "function measure(pts, ar) {",
    "  var cum = [0], L = 0;",
    "  for (var i = 1; i < pts.length; i++) {",
    "    var dx = pts[i].x - pts[i-1].x, dy = (pts[i].y - pts[i-1].y) * ar;",
    "    L += Math.sqrt(dx*dx + dy*dy); cum.push(L);",
    "  }",
    "  return { L: L || 0.001, cum: cum };",
    "}",
    "function atLen(pts, cum, dist) {",
    "  var total = cum[cum.length-1];",
    "  if (dist <= 0) return { x: pts[0].x, y: pts[0].y, angle: Math.atan2(pts[1].y-pts[0].y, pts[1].x-pts[0].x) };",
    "  if (dist >= total) { var n = pts.length;",
    "    return { x: pts[n-1].x, y: pts[n-1].y, angle: Math.atan2(pts[n-1].y-pts[n-2].y, pts[n-1].x-pts[n-2].x) }; }",
    "  var lo = 0, hi = cum.length - 1;",
    "  while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= dist) lo = mid; else hi = mid; }",
    "  var seg = cum[hi] - cum[lo] || 1e-6, t = (dist - cum[lo]) / seg;",
    "  return { x: pts[lo].x + (pts[hi].x-pts[lo].x)*t, y: pts[lo].y + (pts[hi].y-pts[lo].y)*t,",
    "           angle: Math.atan2(pts[hi].y-pts[lo].y, pts[hi].x-pts[lo].x) };",
    "}",
    "",
    "var img = document.getElementById('pic'), ink = document.getElementById('ink'), cur = document.getElementById('cur');",
    "var frame = document.getElementById('frame'), bar = document.querySelector('#bar i');",
    "var W = 0, H = 0, inkCtx, curCtx, ar = 1;",
    "var acts = DATA.actions, actI = 0, phase = 0, running = false, lastNow = 0, rate = 1;",
    "var pencil = { x: 6, y: 4, angle: 0.9 }, showPencil = false, tint = '#2b2620';",
    "var drawn = 0, total = 0;",
    "",
    "function layout() {",
    "  /* measured off the viewport, not the stage: the stage's own height",
    "     depends on this frame, so asking it produces a picture that grows",
    "     past the window and pushes the controls off the bottom */",
    "  var head = document.querySelector('header').offsetHeight;",
    "  var foot = document.querySelector('footer').offsetHeight;",
    "  var maxW = Math.max(80, document.documentElement.clientWidth - 36);",
    "  var maxH = Math.max(80, window.innerHeight - head - foot - 36);",
    "  var s = Math.min(maxW / DATA.natW, maxH / DATA.natH);",
    "  W = Math.round(DATA.natW * s); H = Math.round(DATA.natH * s);",
    "  frame.style.width = W + 'px'; frame.style.height = H + 'px';",
    "  img.style.width = W + 'px'; img.style.height = H + 'px';",
    "  var dpr = Math.min(2, window.devicePixelRatio || 1);",
    "  [ink, cur].forEach(function (c) {",
    "    c.style.width = W + 'px'; c.style.height = H + 'px';",
    "    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);",
    "    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);",
    "  });",
    "  inkCtx = ink.getContext('2d'); curCtx = cur.getContext('2d');",
    "}",
    "function X(v) { return (v/100) * W; }",
    "function Y(v) { return (v/100) * H; }",
    "function S(v) { return (v/100) * W; }",
    "",
    "function prepare() {",
    "  ar = DATA.natH / DATA.natW;",
    "  total = 0;",
    "  acts.forEach(function (a) {",
    "    if (a.type === 'stroke') { var m = measure(a.points, ar); a.length = m.L; a.cum = m.cum; total += m.L; }",
    "    else total += 0.25;",
    "  });",
    "  if (total <= 0) total = 1;",
    "}",
    "",
    "function portion(a, t0, t1) {",
    "  if (t1 <= t0) return;",
    "  var d0 = t0 * a.length, d1 = t1 * a.length;",
    "  var p0 = atLen(a.points, a.cum, d0), pts = [{ x: p0.x, y: p0.y }];",
    "  for (var i = 0; i < a.points.length; i++) if (a.cum[i] > d0 && a.cum[i] < d1) pts.push(a.points[i]);",
    "  var p1 = atLen(a.points, a.cum, d1); pts.push({ x: p1.x, y: p1.y });",
    "  var g = inkCtx;",
    "  g.save(); g.globalAlpha = a.alpha; g.strokeStyle = a.color;",
    "  g.lineWidth = Math.max(0.8, S(a.width)); g.lineCap = 'round'; g.lineJoin = 'round';",
    "  g.beginPath(); g.moveTo(X(pts[0].x), Y(pts[0].y));",
    "  for (var k = 1; k < pts.length; k++) g.lineTo(X(pts[k].x), Y(pts[k].y));",
    "  g.stroke(); g.restore();",
    "}",
    "function dot(a) {",
    "  var g = inkCtx; g.save(); g.globalAlpha = a.alpha; g.fillStyle = a.color;",
    "  g.beginPath(); g.arc(X(a.x), Y(a.y), Math.max(0.5, S(a.r)), 0, Math.PI*2); g.fill(); g.restore();",
    "}",
    "",
    "/* the pencil riding the tip, in whatever colour is being laid down */",
    "function sprite(g, x, y, angle) {",
    "  var px = X(x), py = Y(y), L = Math.max(26, W * 0.075), w = L * 0.17;",
    "  g.save(); g.translate(px, py); g.rotate(angle + Math.PI);",
    "  g.beginPath(); g.moveTo(0, 0); g.lineTo(L*0.22, -w*0.55); g.lineTo(L*0.22, w*0.55); g.closePath();",
    "  g.fillStyle = tint; g.fill();",
    "  g.beginPath(); g.moveTo(L*0.22, -w*0.55); g.lineTo(L*0.34, -w*0.75); g.lineTo(L*0.34, w*0.75); g.lineTo(L*0.22, w*0.55); g.closePath();",
    "  g.fillStyle = '#e8d3a8'; g.fill();",
    "  g.beginPath(); g.moveTo(L*0.34, -w*0.75); g.lineTo(L, -w*0.75); g.lineTo(L, w*0.75); g.lineTo(L*0.34, w*0.75); g.closePath();",
    "  g.fillStyle = tint; g.fill();",
    "  g.fillStyle = 'rgba(255,255,255,0.22)';",
    "  g.fillRect(L*0.34, -w*0.75, L*0.66, w*0.4);",
    "  g.restore();",
    "}",
    "",
    "function advance(dt) {",
    "  var guard = 0;",
    "  while (dt > 0 && actI < acts.length && guard++ < 400) {",
    "    var a = acts[actI];",
    "    if (a.type === 'pause') {",
    "      showPencil = actI > 0;",
    "      var need = (1 - phase) * a.duration;",
    "      if (dt < need) { phase += dt / a.duration; return; }",
    "      dt -= need; drawn += 0.25; actI++; phase = 0; continue;",
    "    }",
    "    if (a.type === 'move') {",
    "      if (phase === 0) { a._x0 = pencil.x; a._y0 = pencil.y; }",
    "      showPencil = true;",
    "      var needM = (1 - phase) * a.duration, step = Math.min(dt, needM);",
    "      phase += step / a.duration; dt -= step;",
    "      var t = Math.min(1, phase), e = t*t*(3-2*t), qx, qy, ang;",
    "      if (a.fetch) {",
    "        var vx = -7, vy = Math.max(10, Math.min(90, (a._y0 + a.y) / 2));",
    "        if (t < 0.5) { var u = t/0.5; u = u*u*(3-2*u);",
    "          qx = a._x0 + (vx-a._x0)*u; qy = a._y0 + (vy-a._y0)*u; ang = Math.atan2(vy-a._y0, vx-a._x0); }",
    "        else { var v = (t-0.5)/0.5; v = v*v*(3-2*v);",
    "          qx = vx + (a.x-vx)*v; qy = vy + (a.y-vy)*v; ang = Math.atan2(a.y-vy, a.x-vx); }",
    "      } else {",
    "        qx = a._x0 + (a.x-a._x0)*e;",
    "        qy = a._y0 + (a.y-a._y0)*e - Math.sin(t*Math.PI)*a.lift;",
    "        ang = Math.atan2(a.y-a._y0, a.x-a._x0);",
    "      }",
    "      pencil.x = qx; pencil.y = qy; if (ang) pencil.angle = ang;",
    "      if (a.swapColor && t >= 0.5) tint = a.swapColor;",
    "      if (t >= 1) { pencil.x = a.x; pencil.y = a.y; drawn += 0.25; actI++; phase = 0; }",
    "      continue;",
    "    }",
    "    if (a.type === 'dot') {",
    "      showPencil = true; pencil.x = a.x; pencil.y = a.y; tint = a.color;",
    "      var needD = (1 - phase) * a.duration;",
    "      if (dt < needD) { phase += dt / a.duration; return; }",
    "      dt -= needD; dot(a); drawn += 0.25; actI++; phase = 0; continue;",
    "    }",
    "    showPencil = true; tint = a.color;",
    "    var span = a.length / a.speed, needS = (1 - phase) * span, use = Math.min(dt, needS), t0 = phase;",
    "    phase = Math.min(1, phase + use / span); dt -= use;",
    "    portion(a, t0, phase);",
    "    drawn += a.length * (phase - t0);",
    "    var pos = atLen(a.points, a.cum, phase * a.length);",
    "    pencil.x = pos.x; pencil.y = pos.y; pencil.angle = pos.angle;",
    "    if (phase >= 1) { actI++; phase = 0; }",
    "  }",
    "}",
    "",
    "function tick(now) {",
    "  if (!running) return;",
    "  if (!lastNow) lastNow = now;",
    "  var dt = Math.min(0.06, (now - lastNow) / 1000) * rate;",
    "  lastNow = now;",
    "  advance(dt);",
    "  curCtx.clearRect(0, 0, W, H);",
    "  if (showPencil) sprite(curCtx, pencil.x, pencil.y, pencil.angle);",
    "  bar.style.width = (Math.min(1, drawn / total) * 100).toFixed(1) + '%';",
    "  if (actI >= acts.length) {",
    "    running = false; showPencil = false; curCtx.clearRect(0, 0, W, H);",
    "    bar.style.width = '100%';",
    "    document.getElementById('replay').disabled = false;",
    "    return;",
    "  }",
    "  requestAnimationFrame(tick);",
    "}",
    "",
    "function renderAll(g, w, h) {",
    "  var sx = function (v) { return (v/100)*w; }, sy = function (v) { return (v/100)*h; };",
    "  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';",
    "  acts.forEach(function (a) {",
    "    if (a.type === 'stroke') {",
    "      g.globalAlpha = a.alpha; g.strokeStyle = a.color;",
    "      g.lineWidth = Math.max(0.6, (a.width/100)*w);",
    "      g.beginPath(); g.moveTo(sx(a.points[0].x), sy(a.points[0].y));",
    "      for (var k = 1; k < a.points.length; k++) g.lineTo(sx(a.points[k].x), sy(a.points[k].y));",
    "      g.stroke();",
    "    } else if (a.type === 'dot') {",
    "      g.globalAlpha = a.alpha; g.fillStyle = a.color;",
    "      g.beginPath(); g.arc(sx(a.x), sy(a.y), Math.max(0.5, (a.r/100)*w), 0, Math.PI*2); g.fill();",
    "    }",
    "  });",
    "  g.restore();",
    "}",
    "",
    "function start() {",
    "  running = false;",
    "  inkCtx.clearRect(0, 0, W, H); curCtx.clearRect(0, 0, W, H);",
    "  actI = 0; phase = 0; drawn = 0; lastNow = 0;",
    "  pencil.x = 6; pencil.y = 4; pencil.angle = 0.9;",
    "  document.getElementById('replay').disabled = true;",
    "  running = true;",
    "  requestAnimationFrame(tick);",
    "}",
    "",
    "document.getElementById('replay').onclick = start;",
    "document.getElementById('finish').onclick = function () {",
    "  running = false;",
    "  inkCtx.clearRect(0, 0, W, H); curCtx.clearRect(0, 0, W, H);",
    "  renderAll(inkCtx, W, H);",
    "  actI = acts.length; bar.style.width = '100%';",
    "  document.getElementById('replay').disabled = false;",
    "};",
    "document.getElementById('speed').oninput = function () {",
    "  rate = parseFloat(this.value);",
    "  document.getElementById('speedVal').textContent = rate.toFixed(1) + '\\u00d7';",
    "};",
    "document.getElementById('png').onclick = function () {",
    "  var c = document.createElement('canvas');",
    "  c.width = DATA.natW; c.height = DATA.natH;",
    "  var g = c.getContext('2d');",
    "  g.drawImage(img, 0, 0, DATA.natW, DATA.natH);",
    "  renderAll(g, DATA.natW, DATA.natH);",
    "  var a = document.createElement('a');",
    "  a.href = c.toDataURL('image/png');",
    "  a.download = DATA.slug + '.png';",
    "  a.click();",
    "};",
    "",
    "var resizeTimer;",
    "window.addEventListener('resize', function () {",
    "  clearTimeout(resizeTimer);",
    "  resizeTimer = setTimeout(function () {",
    "    var wasRunning = running;",
    "    layout();",
    "    if (!wasRunning) { inkCtx.clearRect(0,0,W,H); renderAll(inkCtx, W, H); }",
    "  }, 140);",
    "});",
    "",
    "function go() { prepare(); layout(); start(); }",
    "if (img.complete) go(); else img.onload = go;"
  ].join("\n");

  /* opts: title, bgUrl, natW, natH, actions, meta {designerLabel, model, tier,",
     surfaceName, keywords, createdAt, mode, rounds} */
  function toHTML(opts) {
    var acts = trim(opts.actions || []);
    var meta = opts.meta || {};
    var title = opts.title || "Pencil drawing";
    var slug = (title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "drawing");

    var bits = [];
    if (meta.designerLabel) bits.push(meta.designerLabel + (meta.tier ? " · " + meta.tier : ""));
    if (meta.model && meta.model !== "built-in composer") bits.push(meta.model);
    if (meta.mode === "incremental") bits.push(meta.rounds + " rounds");
    if (meta.surfaceName) bits.push("on " + meta.surfaceName);
    if (meta.keywords) bits.push("“" + meta.keywords + "”");

    var data = {
      natW: opts.natW, natH: opts.natH, slug: slug, actions: acts
    };

    return [
      "<!doctype html>",
      '<html lang="en"><head><meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      "<title>" + escHtml(title) + " — Pencil</title>",
      "<style>",
      "  :root { --bg:#14161a; --panel:#1c1f25; --line:#333945; --text:#e9e6df; --dim:#9aa1ad;",
      "          --accent:#e8b45c; --btn:#2b313b; --btn-hi:#39414e; }",
      "  * { margin:0; padding:0; box-sizing:border-box; }",
      "  body { background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;",
      "         min-height:100vh; display:flex; flex-direction:column; }",
      "  header { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }",
      "  header h1 { font-size:17px; font-weight:650; }",
      "  header .sub { color:var(--dim); font-size:12.5px; }",
      "  #stage { flex:1; display:grid; place-items:center; padding:16px; min-height:0; overflow:hidden; }",
      "  #frame { position:relative; line-height:0; box-shadow:0 18px 50px rgba(0,0,0,.45); border-radius:3px; overflow:hidden; }",
      "  #frame img, #frame canvas { position:absolute; inset:0; display:block; }",
      "  #frame img { position:relative; }",
      "  footer { padding:12px 20px 18px; border-top:1px solid var(--line); display:flex; gap:10px; align-items:center; flex-wrap:wrap; }",
      "  button { font:inherit; color:var(--text); background:var(--btn); border:1px solid var(--line);",
      "           border-radius:9px; padding:9px 15px; cursor:pointer; }",
      "  button:hover:not(:disabled) { background:var(--btn-hi); }",
      "  button:disabled { opacity:.45; cursor:default; }",
      "  button.primary { background:var(--accent); border-color:var(--accent); color:#241a06; font-weight:650; }",
      "  label { display:flex; align-items:center; gap:8px; color:var(--dim); font-size:12.5px; }",
      "  input[type=range] { accent-color:var(--accent); width:150px; }",
      "  #bar { flex:1; min-width:120px; height:4px; background:var(--panel); border-radius:3px; overflow:hidden; }",
      "  #bar i { display:block; height:100%; width:0; background:var(--accent); transition:width .1s linear; }",
      "  .credit { color:var(--dim); font-size:11.5px; }",
      "  .credit a { color:var(--dim); }",
      "</style></head><body>",
      "<header>",
      "  <h1>" + escHtml(title) + "</h1>",
      '  <span class="sub">' + escHtml(bits.join(" · ")) + "</span>",
      "</header>",
      '<div id="stage"><div id="frame">',
      '  <img id="pic" alt="" src="' + opts.bgUrl + '" />',
      '  <canvas id="ink"></canvas><canvas id="cur"></canvas>',
      "</div></div>",
      "<footer>",
      '  <button class="primary" id="replay">▶ Replay</button>',
      '  <button id="finish">Finish now</button>',
      '  <button id="png">Save PNG</button>',
      '  <label>Speed <input type="range" id="speed" min="0.3" max="6" step="0.1" value="1" />',
      '    <span id="speedVal">1.0×</span></label>',
      '  <div id="bar"><i></i></div>',
      '  <span class="credit">drawn by <a href="https://github.com/rfernand2/pencil">Pencil</a>' +
      (meta.createdAt ? " · " + escHtml(new Date(meta.createdAt).toLocaleDateString()) : "") + "</span>",
      "</footer>",
      "<script>",
      "var DATA = " + esc(JSON.stringify(data)) + ";",
      PLAYER,
      "<\/script></body></html>"
    ].join("\n");
  }

  global.EXPORT = { toHTML: toHTML, trim: trim };
})(window);
