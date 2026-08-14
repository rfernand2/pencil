/* ai.js — optional runtime drawing design by an LLM.
 *
 * The model never runs code: it returns a JSON list of ops in the same
 * vocabulary the offline composer uses, and this file interprets them.
 * Anything it can't validate is dropped rather than drawn.
 */
(function (global) {
  "use strict";

  var MAX_OPS = 1400;
  var MAX_PTS = 400;

  /* ---------- prompt ---------- */

  function buildPrompt(ctx) {
    var motifList = global.MOTIF_IDS.join(", ");
    return [
      "You are designing a pencil drawing that will be animated stroke-by-stroke onto a photograph.",
      "",
      "## Canvas",
      "You draw inside a rectangle of white space on the picture. Coordinates are in local units:",
      "x runs 0 (left) to 100 (right); y runs 0 (top) to " + ctx.localH.toFixed(1) + " (bottom). Units are square.",
      "The surface is: " + ctx.surface + ". Stay inside the box, leave a margin of ~4 units.",
      "",
      "## Ink",
      "The paper is " + (ctx.tone === "dark" ? "DARK, so draw in light colours" : "LIGHT, so draw in dark colours") + ".",
      "Suggested palette (you may pick other hex colours in the same key): ink " + ctx.pal.ink +
      ", secondary " + ctx.pal.ink2 + ", soft " + ctx.pal.soft + ", foliage " + ctx.pal.leaf +
      ", accents " + ctx.pal.accent.join(" ") + ".",
      "",
      "## Ops",
      "Reply with ONLY a JSON object, no prose, no markdown fence:",
      '{"title":"<short name for the drawing>","ops":[ ... ]}',
      "Each op is one of:",
      '{"op":"pen","color":"#hex","width":0.3,"speed":60,"alpha":1}   set style for following ops',
      '{"op":"curve","pts":[[x,y],...]}     smooth open line through the points',
      '{"op":"shape","pts":[[x,y],...]}     smooth CLOSED outline',
      '{"op":"poly","pts":[[x,y],...],"close":true}  straight-edged path',
      '{"op":"line","a":[x,y],"b":[x,y]}',
      '{"op":"circle","c":[x,y],"r":6}',
      '{"op":"ellipse","c":[x,y],"rx":8,"ry":4,"rot":0.3}',
      '{"op":"arc","c":[x,y],"rx":8,"ry":8,"rot":0,"from":3.14,"to":6.28}',
      '{"op":"dot","c":[x,y],"r":0.4}',
      '{"op":"shade","c":[x,y],"rx":5,"ry":4,"ang":0.7,"n":18}   loose pencil hatching inside an ellipse',
      '{"op":"scribble","c":[x,y],"rx":5,"ry":4,"ang":0,"rows":7}  denser back-and-forth fill',
      '{"op":"text","s":"WORD","c":[x,baselineY],"h":5}   hand-lettering, caps only',
      '{"op":"motif","id":"<id>","c":[x,y],"size":20}     a ready-made drawing (see list)',
      '{"op":"pause","d":0.3}',
      "",
      "Ready-made motifs (use for anything on this list, then draw your own strokes around them): " + motifList + ".",
      "Motifs whose id is a thing that stands on the ground are anchored at their BASE (c is the bottom-centre);",
      "all others are anchored at their centre. size is roughly the motif's height.",
      "",
      "## Brief",
      ctx.keywords
        ? 'Keywords from the person: "' + ctx.keywords + '". Let them inspire the picture — literal where a keyword names an object, atmospheric where it names a mood. You do not have to use every one.'
        : "No keywords were given. Invent something charming and unexpected.",
      "Variation token (make this drawing different from other runs): " + ctx.nonce,
      "",
      "## How to draw well",
      "- Compose one coherent picture, not a sticker sheet: a subject, a setting, and a few small details.",
      "- Order the ops the way a person draws: big shapes first, then detail, then shading and texture.",
      "- Line weight: 0.3-0.45 for main outlines, 0.16-0.24 for detail, 0.5-0.8 for shading strokes.",
      "- Use shade/scribble with alpha 0.2-0.45 for tone. Overlap it with the outlines; do not colour inside neat.",
      "- Curves read better than long straight lines. 6-20 points per curve.",
      "- 120-400 ops is a good drawing. Fewer than 60 looks unfinished.",
      "Return the JSON object now."
    ].join("\n");
  }

  /* ---------- providers & tiers ---------- */

  /* Quick / Balanced / Deep map to genuinely different-sized models, not just
   * different settings. Shared with the server proxy — see js/models.js. */
  var TIERS = global.PENCIL_MODELS.TIERS;
  var MODELS = global.PENCIL_MODELS.MODELS;

  /* Providers the server will proxy for, discovered at startup. Lets a deployed
   * copy use keys held as server secrets instead of shipping them to the browser. */
  var proxied = [];
  var proxyAuth = false;

  function keysFor(provider) {
    var k = global.PENCIL_KEYS || {};
    return k[provider] || null;
  }

  function viaProxy(provider) {
    var cfg = keysFor(provider);
    return (!cfg || !cfg.key) && proxied.indexOf(provider) >= 0;
  }

  /* Resolve a tier to a concrete model, letting keys.local.js override either
   * one tier (`models.deep`) or every tier (`model`). */
  function modelFor(provider, tier) {
    var table = MODELS[provider] || {};
    var base = table[tier] || table.balanced || {};
    var cfg = keysFor(provider) || {};
    var over = (cfg.models && cfg.models[tier]) || {};
    var m = {
      model: over.model || (cfg.model || base.model),
      maxTokens: over.maxTokens || cfg.maxTokens || base.maxTokens || 16000,
      effort: over.effort !== undefined ? over.effort
        : (cfg.effort !== undefined ? cfg.effort : base.effort)
    };
    /* a forced model must not inherit another tier's effort blindly */
    if ((cfg.model || over.model) && over.effort === undefined && cfg.effort === undefined) {
      m.effort = base.effort;
    }
    return m;
  }

  function aborted(err) {
    return err && (err.name === "AbortError" || err.code === 20);
  }

  function available() {
    var out = [];
    ["anthropic", "xai", "gemini"].forEach(function (p) {
      var c = keysFor(p);
      if ((c && c.key) || proxied.indexOf(p) >= 0) out.push(p);
    });
    return out;
  }

  /* Ask the server which providers it can proxy. Fails silently when the page
   * is opened straight off the filesystem — there is no server to ask. */
  function discover() {
    return fetch("api/providers", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return [];
        proxied = j.providers || [];
        proxyAuth = !!j.authRequired;
        return proxied;
      })
      .catch(function () { return []; });
  }

  function accessKey() {
    try { return sessionStorage.getItem("pencilKey") || ""; } catch (e) { return ""; }
  }

  function setAccessKey(v) {
    try { sessionStorage.setItem("pencilKey", v || ""); } catch (e) {}
  }

  /* Same contract as the direct callers: prompt in, raw model text out. */
  async function callProxy(prompt, provider, tier, signal) {
    var headers = { "content-type": "application/json" };
    if (proxyAuth) headers["x-pencil-key"] = accessKey();
    var res = await fetch("api/design", {
      method: "POST",
      signal: signal,
      headers: headers,
      body: JSON.stringify({ provider: provider, tier: tier, prompt: prompt })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      if (res.status === 401) {
        setAccessKey("");
        throw new Error(data.error || "This copy needs an access password.");
      }
      throw new Error(data.error || (provider + " proxy failed (" + res.status + ")"));
    }
    return data.text || "";
  }

  async function callAnthropic(prompt, cfg, m, signal) {
    var body = {
      model: m.model,
      max_tokens: m.maxTokens,
      messages: [{ role: "user", content: prompt }]
    };
    /* Only send effort where the model supports it — Haiku 4.5 returns a 400. */
    if (m.effort) body.output_config = { effort: m.effort };

    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Claude " + res.status + ": " + (await res.text()).slice(0, 300));
    var data = await res.json();
    if (data.stop_reason === "refusal") throw new Error("Claude declined this request.");
    var text = (data.content || []).filter(function (b) { return b.type === "text"; })
      .map(function (b) { return b.text; }).join("");
    return text;
  }

  async function callXAI(prompt, cfg, m, signal) {
    var res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: signal,
      headers: { "content-type": "application/json", "authorization": "Bearer " + cfg.key },
      body: JSON.stringify({
        model: m.model,
        max_tokens: m.maxTokens,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) throw new Error("Grok " + res.status + ": " + (await res.text()).slice(0, 300));
    var data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message.content) || "";
  }

  async function callGemini(prompt, cfg, m, signal) {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + m.model +
      ":generateContent?key=" + encodeURIComponent(cfg.key);
    var res = await fetch(url, {
      method: "POST",
      signal: signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: m.maxTokens, responseMimeType: "application/json" }
      })
    });
    if (!res.ok) throw new Error("Gemini " + res.status + ": " + (await res.text()).slice(0, 300));
    var data = await res.json();
    var cand = data.candidates && data.candidates[0];
    if (!cand) throw new Error("Gemini returned no candidates.");
    if (cand.finishReason && cand.finishReason !== "STOP") {
      throw new Error("Gemini stopped early (" + cand.finishReason + ") — raise maxTokens in keys.local.js.");
    }
    return ((cand.content && cand.content.parts) || []).map(function (p) { return p.text || ""; }).join("");
  }

  var CALLERS = { anthropic: callAnthropic, xai: callXAI, gemini: callGemini };

  /* ---------- parsing ---------- */

  function extractJSON(text) {
    var t = String(text || "").trim();
    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    var start = t.indexOf("{");
    if (start < 0) throw new Error("No JSON object in the model's reply.");
    /* walk to the matching brace so trailing prose is tolerated */
    var depth = 0, inStr = false, esc = false, end = -1;
    for (var i = start; i < t.length; i++) {
      var ch = t[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error("The model's JSON was cut off — try again or lower the detail.");
    return JSON.parse(t.slice(start, end));
  }

  /* ---------- interpretation ---------- */

  function num(v, dflt) {
    var n = typeof v === "number" ? v : parseFloat(v);
    return isFinite(n) ? n : dflt;
  }

  function colour(v, dflt) {
    return (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())) ? v.trim() : dflt;
  }

  function pts(raw, LH) {
    if (!Array.isArray(raw)) return null;
    var out = [];
    for (var i = 0; i < raw.length && out.length < MAX_PTS; i++) {
      var p = raw[i];
      if (!Array.isArray(p) || p.length < 2) continue;
      var x = num(p[0], null), y = num(p[1], null);
      if (x === null || y === null) continue;
      out.push({ x: Math.max(-20, Math.min(120, x)), y: Math.max(-20, Math.min(LH + 20, y)) });
    }
    return out.length >= 2 ? out : null;
  }

  function interpret(spec, S, LH, pal) {
    var ops = Array.isArray(spec.ops) ? spec.ops : [];
    var drawn = 0, skipped = 0;
    S.pause(0.4);

    for (var i = 0; i < ops.length && i < MAX_OPS; i++) {
      var o = ops[i] || {};
      var st = {};
      if (o.color !== undefined) st.color = colour(o.color, undefined);
      if (o.width !== undefined) st.width = Math.max(0.08, Math.min(1.6, num(o.width, 0.3)));
      if (o.speed !== undefined) st.speed = Math.max(12, Math.min(260, num(o.speed, 60)));
      if (o.alpha !== undefined) st.alpha = Math.max(0.08, Math.min(1, num(o.alpha, 1)));

      try {
        switch (o.op) {
          case "pen":
            S.pen({
              color: colour(o.color, S.style.color),
              width: st.width !== undefined ? st.width : S.style.width,
              speed: st.speed !== undefined ? st.speed : S.style.speed,
              alpha: st.alpha !== undefined ? st.alpha : S.style.alpha
            });
            break;
          case "move":
            var mp = Array.isArray(o.c) ? o.c : o.a;
            if (Array.isArray(mp)) S.move(num(mp[0], 50), num(mp[1], LH / 2), 0.22, 3);
            break;
          case "curve": {
            var cp = pts(o.pts, LH); if (!cp) { skipped++; break; }
            S.stroke(global.PX.smooth(cp, 6, false), st); drawn++; break;
          }
          case "shape": {
            var sp = pts(o.pts, LH); if (!sp) { skipped++; break; }
            S.stroke(global.PX.smooth(sp, 6, true), st); drawn++; break;
          }
          case "poly": {
            var pp = pts(o.pts, LH); if (!pp) { skipped++; break; }
            S.poly(pp, o.close !== false, st); drawn++; break;
          }
          case "line":
            if (!Array.isArray(o.a) || !Array.isArray(o.b)) { skipped++; break; }
            S.line(num(o.a[0], 0), num(o.a[1], 0), num(o.b[0], 0), num(o.b[1], 0), st); drawn++; break;
          case "circle":
            if (!Array.isArray(o.c)) { skipped++; break; }
            S.circle(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.3, num(o.r, 4)), st); drawn++; break;
          case "ellipse":
            if (!Array.isArray(o.c)) { skipped++; break; }
            S.ellipse(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.3, num(o.rx, 4)),
              Math.max(0.3, num(o.ry, 4)), num(o.rot, 0), st); drawn++; break;
          case "arc":
            if (!Array.isArray(o.c)) { skipped++; break; }
            st.from = num(o.from, 0); st.to = num(o.to, Math.PI);
            S.ellipse(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.3, num(o.rx, 4)),
              Math.max(0.3, num(o.ry, 4)), num(o.rot, 0), st); drawn++; break;
          case "dot":
            if (!Array.isArray(o.c)) { skipped++; break; }
            S.dot(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.08, Math.min(3, num(o.r, 0.35))), st); drawn++; break;
          case "shade":
            if (!Array.isArray(o.c)) { skipped++; break; }
            S.shade(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.4, num(o.rx, 4)), Math.max(0.4, num(o.ry, 4)),
              num(o.ang, 0.6), Math.max(2, Math.min(60, Math.round(num(o.n, 14)))),
              Object.assign({ width: 0.5, alpha: 0.3 }, st)); drawn++; break;
          case "scribble":
            if (!Array.isArray(o.c)) { skipped++; break; }
            S.scribble(num(o.c[0], 50), num(o.c[1], LH / 2), Math.max(0.4, num(o.rx, 4)), Math.max(0.4, num(o.ry, 4)),
              num(o.ang, 0), Math.max(2, Math.min(30, Math.round(num(o.rows, 7)))),
              Object.assign({ width: 0.4, alpha: 0.35 }, st)); drawn++; break;
          case "text": {
            if (!Array.isArray(o.c) || typeof o.s !== "string" || !o.s.trim()) { skipped++; break; }
            var h = Math.max(1.2, Math.min(LH * 0.4, num(o.h, 5)));
            global.STROKEFONT.drawText(S, o.s.slice(0, 42), num(o.c[0], 50), num(o.c[1], LH * 0.9), h,
              Object.assign({ color: pal.ink2, width: 0.26, speed: 46 }, st));
            drawn++; break;
          }
          case "motif": {
            var m = global.MOTIFS[o.id];
            if (!m || !Array.isArray(o.c)) { skipped++; break; }
            var size = Math.max(2, Math.min(LH * 1.2, num(o.size, 18)));
            var mx = num(o.c[0], 50), my = num(o.c[1], LH / 2);
            S.move(mx, m.anchor === "base" ? my - size * 0.5 : my, 0.22, 3);
            var saved = S.save();
            m.draw(S, mx, my, size, pal);
            S.restore(saved);
            drawn++; break;
          }
          case "pause":
            S.pause(Math.max(0.05, Math.min(2, num(o.d, 0.3))));
            break;
          default:
            skipped++;
        }
      } catch (e) {
        skipped++;
      }
    }
    S.pause(0.3);
    return { drawn: drawn, skipped: skipped };
  }

  /* ---------- public ---------- */

  async function design(opts) {
    var cfg = keysFor(opts.provider);
    var proxy = viaProxy(opts.provider);
    if (!proxy && (!cfg || !cfg.key)) {
      throw new Error("No API key configured for " + opts.provider + ".");
    }
    var caller = CALLERS[opts.provider];
    if (!caller) throw new Error("Unknown provider " + opts.provider + ".");

    var rnd = global.PX.makeRand(opts.seed);
    var built = global.COMPOSE.sketchFor(opts.region, opts.natW, opts.natH, rnd);
    var S = built.S, LH = built.LH;

    var basePal = global.COMPOSE.PALETTES[opts.tone === "dark" ? "chalk" : (opts.paletteHint || "graphite")];
    var pal = Object.assign({}, basePal);

    var prompt = buildPrompt({
      localH: LH,
      tone: opts.tone,
      surface: opts.surface,
      pal: pal,
      keywords: opts.keywords,
      nonce: opts.seed.toString(36)
    });

    var tier = opts.tier || "balanced";
    var m = modelFor(opts.provider, tier);
    var raw;
    try {
      raw = proxy
        ? await callProxy(prompt, opts.provider, tier, opts.signal)
        : await caller(prompt, cfg, m, opts.signal);
    } catch (err) {
      if (aborted(err)) {
        var c = new Error("Cancelled.");
        c.cancelled = true;
        throw c;
      }
      throw err;
    }
    var spec = extractJSON(raw);

    S.pen({ color: pal.ink, width: 0.32, speed: 58, alpha: 1 });
    S.jit = 0.14;
    var stats = interpret(spec, S, LH, pal);
    if (!stats.drawn) throw new Error("The model returned no usable strokes.");

    return {
      actions: S.acts,
      palette: pal,
      localH: LH,
      title: typeof spec.title === "string" ? spec.title.slice(0, 80) : null,
      model: m.model,
      stats: stats
    };
  }

  global.AI = {
    design: design,
    interpret: interpret,
    TIERS: TIERS,
    MODELS: MODELS,
    modelFor: modelFor,
    discover: discover,
    available: available,
    viaProxy: viaProxy,
    needsAccessKey: function () { return proxyAuth && !accessKey(); },
    setAccessKey: setAccessKey,
    available: available,
    buildPrompt: buildPrompt,
    extractJSON: extractJSON
  };
})(window);
