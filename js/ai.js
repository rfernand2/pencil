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

  /* The drawing vocabulary, shared by the one-shot prompt and the round-by-round
     one so the two can never drift apart. */
  var OPS_HELP = [
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
    '{"op":"pause","d":0.3}'
  ].join("\n");

  /* ---------- prompt ---------- */

  /* Where the drawing box sits in the attached image, so the model can tie what
     it can SEE to the coordinates it has to draw in. */
  function regionNote(r, localH) {
    if (!r) return "";
    return [
      "## The picture in front of you",
      "The attached image is the picture itself — look at it, don't imagine it.",
      "Your drawing area is the part of that image from " + r.x.toFixed(0) + "% to " +
      (r.x + r.w).toFixed(0) + "% across and " + r.y.toFixed(0) + "% to " +
      (r.y + r.h).toFixed(0) + "% down.",
      "Local (0,0) is that area's top-left corner and (100," + localH.toFixed(0) +
      ") its bottom-right, so everything you draw lands inside it.",
      ""
    ].join("\n");
  }

  function buildPrompt(ctx) {
    var motifList = global.MOTIF_IDS.join(", ");
    return [
      "You are designing a pencil drawing that will be animated stroke-by-stroke onto a photograph.",
      "",
      ctx.hasImage ? regionNote(ctx.region, ctx.localH) : "",
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
      OPS_HELP,
      "",
      "Ready-made motifs (use for anything on this list, then draw your own strokes around them): " + motifList + ".",
      "Motifs whose id is a thing that stands on the ground are anchored at their BASE (c is the bottom-centre);",
      "all others are anchored at their centre. size is roughly the motif's height.",
      "",
      "## What is already on the picture — draw WITH it, not beside it",
      ctx.features && ctx.features.length
        ? [
          "These things are already printed on the surface, at these local coordinates" +
          (ctx.hasImage ? " (you can see them in the image too)" : "") + ":",
          ctx.features.map(function (f) { return "  - " + f.desc; }).join("\n"),
          "",
          "This is the whole point of the drawing. Choose one of them and build on it so the",
          "result could not have been drawn on any other picture. Extend it, re-read it as",
          "something else, let your drawing grow out of it or lean on it. For instance a round",
          "stain becomes a sun, a balloon or a wheel; a printed emblem sprouts a trunk and",
          "becomes a tree; ruled lines become a sea with a boat riding one of them, or a stave",
          "with notes sitting on it; a strong edge becomes a horizon, a washing line, a tightrope.",
          "Do not simply place a picture in the empty space and ignore what is there."
        ].join("\n")
        : "Nothing is printed on this surface, so the drawing is free-standing.",
      "",
      "## Brief",
      ctx.keywords
        ? 'Keywords from the person: "' + ctx.keywords + '". Use them to colour the idea, but the ' +
          "picture's own features still lead — the keywords say what mood or characters to bring to them."
        : "No keywords were given, which is the normal case. Take your cue entirely from the picture.",
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

  /* The emptiest patch of the drawing area, given what previous rounds took up.
     A coarse grid is plenty, and doing this in code rather than asking the model
     to eyeball it is what stops a small model stacking its whole scene in one
     corner. Ties break toward the drawn work, so the picture stays a picture
     rather than scattering into the corners. */
  function clearSpot(history, localH) {
    var G = 3, cw = 100 / G, ch = localH / G;
    var boxes = (history || []).map(function (h) { return h.box; }).filter(Boolean);
    if (!boxes.length) return null;

    var cx = 0, cy = 0;
    boxes.forEach(function (b) { cx += (b.x0 + b.x1) / 2; cy += (b.y0 + b.y1) / 2; });
    cx /= boxes.length; cy /= boxes.length;

    var best = null;
    for (var gy = 0; gy < G; gy++) {
      for (var gx = 0; gx < G; gx++) {
        var x0 = gx * cw, y0 = gy * ch, x1 = x0 + cw, y1 = y0 + ch;
        var taken = 0;
        boxes.forEach(function (b) {
          var ox = Math.max(0, Math.min(x1, b.x1) - Math.max(x0, b.x0));
          var oy = Math.max(0, Math.min(y1, b.y1) - Math.max(y0, b.y0));
          taken += ox * oy;
        });
        var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        var pull = Math.sqrt((mx - cx) * (mx - cx) + (my - cy) * (my - cy)) / 400;
        var score = taken / (cw * ch) + pull;
        if (!best || score < best.score) best = { score: score, x0: x0, y0: y0, x1: x1, y1: y1 };
      }
    }
    return best;
  }

  /* One round of incremental mode. The model is shown the picture as it stands
     — background plus everything drawn so far — and adds a single element. It
     decides when the picture is finished; the caller caps how long it may go. */
  function buildStepPrompt(ctx) {
    var motifList = global.MOTIF_IDS.join(", ");
    return [
      "You are drawing on a picture, one element at a time, and you can see your own work.",
      "",
      regionNote(ctx.region, ctx.localH),
      "## Where you are",
      "This is round " + ctx.round + " of at most " + ctx.maxRounds + ".",
      ctx.history && ctx.history.length
        ? "You have already drawn these, and they are in the image — do not repeat any of them,\n" +
        "and do not draw on top of them. The box after each one is the space it took up:\n" +
        ctx.history.map(function (h, i) {
          var b = h.box;
          return "  " + (i + 1) + ". " + h.note + (b
            ? "  — occupies x " + b.x0.toFixed(0) + "-" + b.x1.toFixed(0) +
            ", y " + b.y0.toFixed(0) + "-" + b.y1.toFixed(0)
            : "");
        }).join("\n") +
        (ctx.spot
          ? "\nThe clearest space left is x " + ctx.spot.x0.toFixed(0) + "-" + ctx.spot.x1.toFixed(0) +
          ", y " + ctx.spot.y0.toFixed(0) + "-" + ctx.spot.y1.toFixed(0) + ". Put this round's" +
          " element there, or spanning out from there, unless it genuinely has to touch" +
          " something already drawn (a rider on a horse, a bird on a branch)."
          : "\nPut this round's element in space that is still clear.")
        : "Nothing has been drawn yet. The picture starts with you.",
      "",
      "## The medium — read this before deciding what to draw",
      "Every op becomes a visible pencil line, drawn one after another by a hand. There is no",
      "airbrush, no gradient, no opacity wash, no blur. So 'subtle shading', 'a vignette',",
      "'depth', 'atmosphere' and 'a soft shadow' do not exist here — asked for, they come out",
      "as a scribble of hard grey lines across your drawing and wreck it.",
      "Draw THINGS, not effects.",
      "",
      "## Your job this round",
      ctx.round === 1
        ? "This is round 1: draw the MAIN SUBJECT, in outline, and nothing else. Not a background,\n" +
        "not a texture, not a shadow — the thing the picture is about. Make it big enough to carry\n" +
        "the drawing and put it where it works with what is already printed on the surface."
        : "Add exactly ONE more element, of a kind you have NOT drawn yet. Pick from:\n" +
        "  - a second subject or companion that relates to the first (a person, animal, bird, boat…)\n" +
        "  - the setting it sits in: ground, horizon, water, a building, branches\n" +
        "  - a foreground or framing detail: plants, birds in the distance, small objects\n" +
        "  - hand-lettering of a short word, if the picture wants one\n" +
        "  - ONE pass of hatching to weight the subject — allowed only from round 4 on, once at most",
      "Draw it where the picture needs it: fill a gap, balance a mass, or lean on something",
      "already there. Never draw an object that is already in the picture a second time.",
      "Send only the strokes for the new element — 30-140 ops.",
      "",
      "## When to stop",
      'Set "done": true when the picture reads as complete and another element would clutter it.',
      "A good drawing here is 3-6 elements. Be honest — stopping early is better than padding,",
      "and padding with texture is the worst outcome. If you set done, still send this round's ops.",
      "",
      "## How to draw well",
      "- Big shapes first, then detail. Curves read better than long straight lines.",
      "- Line weight: 0.3-0.45 for outlines, 0.16-0.24 for detail, 0.5-0.8 for hatching.",
      "- 6-20 points per curve. Keep each element inside a sensible patch, not sprawled edge to edge.",
      "",
      "## Canvas",
      "Coordinates are in local units: x runs 0 (left) to 100 (right); y runs 0 (top) to " +
      ctx.localH.toFixed(1) + " (bottom). Units are square.",
      "The surface is: " + ctx.surface + ". Stay inside the box, leave a margin of ~4 units.",
      "The paper is " + (ctx.tone === "dark" ? "DARK, so draw in light colours" : "LIGHT, so draw in dark colours") + ".",
      "Palette: ink " + ctx.pal.ink + ", secondary " + ctx.pal.ink2 + ", soft " + ctx.pal.soft +
      ", foliage " + ctx.pal.leaf + ", accents " + ctx.pal.accent.join(" ") + ".",
      ctx.keywords ? 'Keywords from the person: "' + ctx.keywords + '".' : "",
      "",
      "## Ops",
      "Reply with ONLY a JSON object, no prose, no markdown fence:",
      '{"note":"<the element you just added, 2-6 words>","done":false,"ops":[ ... ]}',
      OPS_HELP,
      "Ready-made motifs: " + motifList + ".",
      "Motifs whose id is a thing that stands on the ground are anchored at their BASE;",
      "all others are anchored at their centre. size is roughly the motif's height.",
      "",
      "Variation token: " + ctx.nonce,
      "Return the JSON object now."
    ].join("\n");
  }

  /* ---------- providers & tiers ---------- */

  /* Quick / Balanced / Deep map to genuinely different-sized models, not just
   * different settings. Shared with the server proxy — see js/models.js. */
  var TIERS = global.PENCIL_MODELS.TIERS;
  var MODELS = global.PENCIL_MODELS.MODELS;
  var INCREMENTAL = global.PENCIL_MODELS.INCREMENTAL || {};

  /* The tier incremental mode uses for a family — smallest that can actually
     hold a composition together. See js/models.js. */
  function incrementalTier(provider) { return INCREMENTAL[provider] || "quick"; }

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

  /* Same contract as the direct callers: prompt (and optionally the picture)
     in, raw model text out. */
  async function callProxy(prompt, provider, tier, signal, image) {
    var headers = { "content-type": "application/json" };
    if (proxyAuth) headers["x-pencil-key"] = accessKey();
    var res = await fetch("api/design", {
      method: "POST",
      signal: signal,
      headers: headers,
      body: JSON.stringify({ provider: provider, tier: tier, prompt: prompt, image: image || undefined })
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

  /* Each provider wants the picture in its own shape. JPEG throughout: a
     photograph re-encodes far smaller than PNG and the model is reading
     composition, not pixels. */
  function anthropicContent(prompt, image) {
    if (!image) return prompt;
    return [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
      { type: "text", text: prompt }
    ];
  }

  function openaiContent(prompt, image) {
    if (!image) return prompt;
    return [
      { type: "image_url", image_url: { url: "data:image/jpeg;base64," + image } },
      { type: "text", text: prompt }
    ];
  }

  function geminiParts(prompt, image) {
    var parts = [];
    if (image) parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });
    parts.push({ text: prompt });
    return parts;
  }

  async function callAnthropic(prompt, cfg, m, signal, image) {
    var body = {
      model: m.model,
      max_tokens: m.maxTokens,
      messages: [{ role: "user", content: anthropicContent(prompt, image) }]
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

  async function callXAI(prompt, cfg, m, signal, image) {
    var res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: signal,
      headers: { "content-type": "application/json", "authorization": "Bearer " + cfg.key },
      body: JSON.stringify({
        model: m.model,
        max_tokens: m.maxTokens,
        messages: [{ role: "user", content: openaiContent(prompt, image) }]
      })
    });
    if (!res.ok) throw new Error("Grok " + res.status + ": " + (await res.text()).slice(0, 300));
    var data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message.content) || "";
  }

  async function callGemini(prompt, cfg, m, signal, image) {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + m.model +
      ":generateContent?key=" + encodeURIComponent(cfg.key);
    var res = await fetch(url, {
      method: "POST",
      signal: signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: geminiParts(prompt, image) }],
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

  /* Everything both modes need before they can talk to a model: a fresh sketch
     to draw into, the palette, and the picture's features in local units. */
  function prepare(opts) {
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

    /* Describe the picture's own features in the same local units the model draws in. */
    var features = (opts.features || []).map(function (f) {
      var g = S.toLocal(f);
      var where;
      if (g.x1 !== undefined) {
        where = "a line from (" + g.x1.toFixed(0) + "," + g.y1.toFixed(0) + ") to (" +
          g.x2.toFixed(0) + "," + g.y2.toFixed(0) + ")";
      } else if (g.r !== undefined) {
        where = "a circle of radius " + g.r.toFixed(0) + " centred at (" +
          g.x.toFixed(0) + "," + g.y.toFixed(0) + ")";
      } else if (g.w !== undefined) {
        where = "a rectangle " + g.w.toFixed(0) + " wide and " + g.h.toFixed(0) +
          " tall with its top-left at (" + g.x.toFixed(0) + "," + g.y.toFixed(0) + ")" +
          (g.gap ? ", ruled every " + g.gap.toFixed(1) + " units" : "");
      } else {
        where = "at (" + g.x.toFixed(0) + "," + g.y.toFixed(0) + ")";
      }
      return { desc: f.note + " — " + where, id: f.id };
    });

    return { cfg: cfg, proxy: proxy, caller: caller, S: S, LH: LH, pal: pal, features: features };
  }

  /* Where a round's strokes actually landed, back in the local units the model
     thinks in. Telling it "that patch is taken" works far better than hoping it
     notices from the picture — a small model will happily stack a second
     balloon on top of the first. */
  function boundsOf(acts, S) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    function add(px, py) {
      var p = S.unmap(px, py);
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
      n++;
    }
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (a.type === "stroke") {
        for (var k = 0; k < a.points.length; k++) add(a.points[k].x, a.points[k].y);
      } else if (a.type === "dot") add(a.x, a.y);
    }
    return n ? { x0: x0, y0: y0, x1: x1, y1: y1 } : null;
  }

  /* Send a prompt (with the picture attached when we have one) and hand back
     the parsed JSON. Cancellation is normalised for both paths. */
  async function ask(p, opts, prompt, tier) {
    var m = modelFor(opts.provider, tier);
    var raw;
    try {
      raw = p.proxy
        ? await callProxy(prompt, opts.provider, tier, opts.signal, opts.image)
        : await p.caller(prompt, p.cfg, m, opts.signal, opts.image);
    } catch (err) {
      if (aborted(err)) {
        var c = new Error("Cancelled.");
        c.cancelled = true;
        throw c;
      }
      throw err;
    }
    return { spec: extractJSON(raw), model: m.model };
  }

  async function design(opts) {
    var p = prepare(opts);
    var S = p.S, LH = p.LH, pal = p.pal;

    var prompt = buildPrompt({
      localH: LH,
      tone: opts.tone,
      surface: opts.surface,
      pal: pal,
      keywords: opts.keywords,
      features: p.features,
      region: opts.region,
      hasImage: !!opts.image,
      nonce: opts.seed.toString(36)
    });

    var got = await ask(p, opts, prompt, opts.tier || "balanced");

    S.pen({ color: pal.ink, width: 0.32, speed: 58, alpha: 1 });
    S.jit = 0.14;
    var stats = interpret(got.spec, S, LH, pal);
    if (!stats.drawn) throw new Error("The model returned no usable strokes.");

    return {
      actions: S.acts,
      palette: pal,
      localH: LH,
      title: typeof got.spec.title === "string" ? got.spec.title.slice(0, 80) : null,
      model: got.model,
      stats: stats
    };
  }

  /* One round of incremental mode. The caller animates the returned actions,
     re-snapshots the picture, and comes back for the next round until `done`. */
  async function designStep(opts) {
    var p = prepare(opts);
    var S = p.S, LH = p.LH, pal = p.pal;

    var prompt = buildStepPrompt({
      localH: LH,
      tone: opts.tone,
      surface: opts.surface,
      pal: pal,
      keywords: opts.keywords,
      region: opts.region,
      round: opts.round,
      maxRounds: opts.maxRounds,
      history: opts.history || [],
      spot: clearSpot(opts.history, LH),
      nonce: opts.seed.toString(36)
    });

    var got = await ask(p, opts, prompt, opts.tier || incrementalTier(opts.provider));

    S.pen({ color: pal.ink, width: 0.32, speed: 58, alpha: 1 });
    S.jit = 0.14;
    var stats = interpret(got.spec, S, LH, pal);

    return {
      box: boundsOf(S.acts, S),
      actions: S.acts,
      palette: pal,
      localH: LH,
      note: typeof got.spec.note === "string" ? got.spec.note.slice(0, 60) : null,
      done: got.spec.done === true,
      model: got.model,
      stats: stats
    };
  }

  global.AI = {
    design: design,
    designStep: designStep,
    incrementalTier: incrementalTier,
    MAX_ROUNDS: 8,
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
