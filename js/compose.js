/* compose.js — keywords -> a scene plan -> a pencil action list.
 * This is the offline brain; ai.js can replace the planning step with an LLM.
 */
(function (global) {
  "use strict";

  /* ---------- palettes ---------- */

  var PALETTES = {
    graphite: { ink: "#2b2620", ink2: "#4a4239", soft: "#6d6357", leaf: "#5c6a49", accent: ["#8a7358", "#6f6455", "#77808a"] },
    forest: { ink: "#22301f", ink2: "#3d5233", soft: "#6f7f5e", leaf: "#3f7a3a", accent: ["#c2703a", "#7ea84c", "#d8b451"] },
    ocean: { ink: "#16303f", ink2: "#1f4f68", soft: "#5b8ba3", leaf: "#2f7f70", accent: ["#e0a24a", "#3d8fb5", "#2f9c8f"] },
    sunset: { ink: "#3a2320", ink2: "#6b3a2c", soft: "#a5705a", leaf: "#8a7a3a", accent: ["#e2603c", "#f0a03a", "#c04a6e"] },
    night: { ink: "#1e1e38", ink2: "#33335c", soft: "#5c5c8a", leaf: "#3f6b5a", accent: ["#e8c65a", "#8fa8e0", "#c98ae0"] },
    autumn: { ink: "#3b2716", ink2: "#6b431f", soft: "#9a7449", leaf: "#7a7a2e", accent: ["#c05a22", "#d9902a", "#8f3f2a"] },
    candy: { ink: "#3d2430", ink2: "#6e3a52", soft: "#a3708a", leaf: "#5f8f6a", accent: ["#e0568a", "#f2a0c0", "#7bb8e0"] },
    chalk: { ink: "#f3f7ff", ink2: "#d2e2f4", soft: "#9dbcdb", leaf: "#a6dcb4", accent: ["#ffd98a", "#7fe3d0", "#ffb3c1"], paperDark: true }
  };

  /* ---------- keyword themes ---------- */

  var THEMES = [
    { words: ["ocean", "sea", "beach", "marine", "sail", "coast", "nautical", "surf", "harbour", "harbor", "island"], palette: "ocean", scene: "landscape", motifs: ["wave", "sailboat", "lighthouse", "fish", "whale", "anchor"] },
    { words: ["forest", "woods", "woodland", "jungle", "nature", "wild", "hike", "trees"], palette: "forest", scene: "landscape", motifs: ["tree", "pine", "fern", "mushroom", "owl", "leaf"] },
    { words: ["night", "midnight", "dark", "sleep", "dream", "stars", "cosmos", "space", "galaxy", "universe"], palette: "night", scene: "scatter", motifs: ["moon", "star", "planet", "comet", "cloud"] },
    { words: ["autumn", "fall", "harvest", "october", "cosy", "cozy"], palette: "autumn", scene: "landscape", motifs: ["tree", "leaf", "mushroom", "coffee", "book"] },
    { words: ["winter", "snow", "cold", "ice", "christmas", "december"], palette: "ocean", scene: "landscape", motifs: ["pine", "snowflake", "house", "lantern"] },
    { words: ["spring", "garden", "bloom", "blossom", "meadow", "grow"], palette: "candy", scene: "landscape", motifs: ["flower", "butterfly", "bee", "fern", "rabbit"] },
    { words: ["summer", "sun", "holiday", "hot", "vacation"], palette: "sunset", scene: "landscape", motifs: ["sun", "sailboat", "wave", "bicycle"] },
    { words: ["love", "romance", "valentine", "wedding", "heart", "thanks", "friend"], palette: "candy", scene: "pattern", motifs: ["heart", "flower", "bird", "leaf"] },
    { words: ["city", "urban", "town", "street", "work", "office", "commute"], palette: "graphite", scene: "landscape", motifs: ["city", "bicycle", "coffee", "clock"] },
    { words: ["magic", "fantasy", "fairy", "myth", "legend", "wizard", "spell"], palette: "night", scene: "vignette", motifs: ["dragon", "castle", "star", "mandala", "key"] },
    { words: ["calm", "zen", "quiet", "meditate", "balance", "peace", "still"], palette: "graphite", scene: "pattern", motifs: ["mandala", "spiral", "leaf", "wave"] },
    { words: ["music", "song", "jazz", "band", "sing", "dance", "melody"], palette: "sunset", scene: "scatter", motifs: ["musicnote", "bird", "spiral", "star"] },
    { words: ["desert", "southwest", "dry", "arizona", "sand"], palette: "sunset", scene: "landscape", motifs: ["cactus", "sun", "mountain"] },
    { words: ["mountain", "alps", "peak", "climb", "summit", "trek"], palette: "graphite", scene: "landscape", motifs: ["mountain", "pine", "bird", "cloud"] },
    { words: ["home", "family", "cottage", "village", "kitchen"], palette: "autumn", scene: "landscape", motifs: ["house", "tree", "teapot", "cat"] },
    { words: ["halloween", "spooky", "ghost", "haunted", "creepy"], palette: "night", scene: "scatter", motifs: ["ghost", "moon", "owl", "mushroom"] },
    { words: ["study", "read", "book", "learn", "school", "library", "exam"], palette: "graphite", scene: "vignette", motifs: ["book", "coffee", "clock", "feather"] }
  ];

  var SCENE_HINTS = {
    landscape: ["landscape", "scene", "view", "horizon", "vista", "world", "place"],
    vignette: ["portrait", "single", "one", "close", "study", "logo", "icon"],
    pattern: ["pattern", "wreath", "border", "symmetry", "mandala", "tile", "frame"],
    scatter: ["scatter", "constellation", "collection", "many", "swarm", "sky"]
  };

  var SURPRISE = [
    ["a fox sleeping under an oak", ["tree", "leaf", "mushroom", "star"], "forest", "landscape"],
    ["a whale swimming past the moon", ["whale", "moon", "star", "wave"], "night", "scatter"],
    ["a lighthouse in a storm", ["lighthouse", "wave", "cloud", "rain"], "ocean", "landscape"],
    ["a cat on a windowsill", ["cat", "flower", "teapot", "moon"], "autumn", "vignette"],
    ["a paper town at dusk", ["city", "bird", "cloud", "sun"], "sunset", "landscape"],
    ["a garden waking up", ["flower", "butterfly", "bee", "fern"], "candy", "landscape"],
    ["a quiet mountain morning", ["mountain", "pine", "bird", "cloud"], "graphite", "landscape"],
    ["a dragon guarding a key", ["dragon", "castle", "key", "star"], "night", "vignette"],
    ["a bicycle by the sea", ["bicycle", "sailboat", "wave", "sun"], "ocean", "landscape"],
    ["a desk at midnight", ["coffee", "book", "clock", "musicnote"], "graphite", "scatter"]
  ];

  var STOPWORDS = { "a": 1, "an": 1, "the": 1, "of": 1, "and": 1, "in": 1, "on": 1, "with": 1, "at": 1, "to": 1, "for": 1, "my": 1, "some": 1, "is": 1 };

  /* ---------- keyword parsing ---------- */

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s,'-]/g, " ")
      .split(/[\s,]+/)
      .filter(function (t) { return t && !STOPWORDS[t]; });
  }

  /* A tag near the front of a motif's tag list means the motif is really *about*
   * that word; a tag at the back is a loose association. "moon" is motif `moon`
   * first and `rocket` a distant fourth, so only the best match is taken. */
  function bestFor(tag) {
    var ids = global.MOTIF_TAGS[tag];
    if (!ids) return null;
    var best = null, bestRank = 1e9;
    ids.forEach(function (id) {
      var rank = global.MOTIFS[id].tags.indexOf(tag);
      if (id === tag) rank = -1;
      if (rank < bestRank) { bestRank = rank; best = id; }
    });
    return best;
  }

  function plan(text, rnd, styleHint) {
    var tokens = tokenize(text);
    var joined = tokens.join(" ");
    var motifs = [], matched = [], palette = null, scene = null;

    function add(id) { if (id && motifs.indexOf(id) < 0) motifs.push(id); }

    /* multi-word tags first — "hot air balloon" must not leave "air" behind */
    Object.keys(global.MOTIF_TAGS).forEach(function (tag) {
      if (tag.indexOf(" ") > 0 && joined.indexOf(tag) >= 0) {
        add(bestFor(tag));
        tag.split(" ").forEach(function (wd) { matched.push(wd); });
      }
    });

    /* single-word tag hits: one motif per word, the one it fits best */
    tokens.forEach(function (t) {
      var tag = global.MOTIF_TAGS[t] ? t : t.replace(/(ies)$/, "y").replace(/s$/, "");
      var id = bestFor(tag);
      if (id) { matched.push(t); add(id); }
    });

    /* themes contribute palette, scene and companions */
    THEMES.forEach(function (th) {
      for (var i = 0; i < th.words.length; i++) {
        if (tokens.indexOf(th.words[i]) >= 0) {
          if (!palette) palette = th.palette;
          if (!scene) scene = th.scene;
          matched.push(th.words[i]);
          th.motifs.forEach(add);
          return;
        }
      }
    });

    Object.keys(SCENE_HINTS).forEach(function (k) {
      SCENE_HINTS[k].forEach(function (wd) { if (tokens.indexOf(wd) >= 0) scene = k; });
    });

    var caption = null;
    var surprise = null;

    /* No keywords is a normal way to use this: the picture supplies the idea.
       Only invent a scene when there is nothing at all to work from. */
    var empty = !tokens.length;
    if (!motifs.length && !empty) {
      surprise = SURPRISE[(rnd() * SURPRISE.length) | 0];
      motifs = surprise[1].slice();
      palette = palette || surprise[2];
      scene = scene || surprise[3];
    }

    /* an unmatched word becomes the caption — the drawing writes it out */
    var unmatched = tokens.filter(function (t) { return matched.indexOf(t) < 0 && t.length > 2; });
    if (unmatched.length) caption = unmatched.slice(0, 3).join(" ");

    if (!scene) {
      var hasLand = motifs.some(function (m) {
        var slot = global.MOTIFS[m].slot;
        return slot === "ground" || slot === "horizon";
      });
      scene = hasLand ? "landscape" : (motifs.length > 3 ? "scatter" : "vignette");
    }
    if (!palette) palette = "graphite";
    if (styleHint === "graphite") palette = "graphite";

    return {
      motifs: motifs.slice(0, 7),
      tokens: tokens,
      empty: empty,
      palette: palette,
      scene: scene,
      caption: caption,
      title: surprise ? surprise[0] : (tokens.length ? tokens.join(" ") : null)
    };
  }

  /* Used only when there is neither a keyword nor a feature to build on. */
  function surprisePlan(rnd) {
    var s = SURPRISE[(rnd() * SURPRISE.length) | 0];
    return {
      motifs: s[1].slice(), tokens: [], empty: false,
      palette: s[2], scene: s[3], caption: null, title: s[0]
    };
  }

  /* ---------- region -> sketch ---------- */

  function sketchFor(region, natW, natH, rnd) {
    var u = region.w / 100;                       // image-% of width per local unit
    var ar = natH / natW;
    var localH = region.h * ar * 100 / region.w;
    var S = new global.PX.Sketch({
      u: u, ar: ar, localH: localH, rnd: rnd,
      map: function (lx, ly) {
        return { x: region.x + lx * u, y: region.y + ly * u / ar };
      }
    });
    /* The inverse: features are described in image %, but riffs draw in local
       units — and a feature may well sit outside the drawing region. */
    S.unmap = function (x, y) {
      return { x: (x - region.x) / u, y: (y - region.y) * ar / u };
    };
    S.toLocal = function (f) {
      /* pctX/pctY are the feature's place on the whole picture, so a riff can
         tell it is near an edge and build inward instead of off the page. */
      var out = {
        id: f.id, kind: f.kind, note: f.note, label: f.label || f.note || f.id,
        pctX: f.x !== undefined ? f.x : (f.x1 + f.x2) / 2,
        pctY: f.y !== undefined ? f.y : (f.y1 + f.y2) / 2
      };
      if (f.x !== undefined) {
        var p = S.unmap(f.x, f.y);
        out.x = p.x; out.y = p.y;
      }
      if (f.r !== undefined) out.r = f.r / u;
      if (f.w !== undefined) out.w = f.w / u;
      if (f.h !== undefined) out.h = (f.h * ar) / u;
      if (f.gap !== undefined) out.gap = (f.gap * ar) / u;
      if (f.x1 !== undefined) {
        var a = S.unmap(f.x1, f.y1), b = S.unmap(f.x2, f.y2);
        out.x1 = a.x; out.y1 = a.y; out.x2 = b.x; out.y2 = b.y;
      }
      if (f.angle !== undefined) out.angle = f.angle;
      return out;
    };
    return { S: S, LH: localH };
  }

  /* ---------- shared decorations ---------- */

  function groundTexture(S, y, x0, x1, pal, n) {
    var rnd = S.rnd;
    for (var i = 0; i < n; i++) {
      var x = x0 + rnd() * (x1 - x0);
      var l = 1.2 + rnd() * 3;
      S.line(x, y + (rnd() - 0.5) * 1.4, x + l, y + (rnd() - 0.5) * 1.4,
        { color: rnd() > 0.5 ? pal.ink2 : pal.soft, width: 0.22, speed: 190, alpha: 0.35 + rnd() * 0.3 });
    }
  }

  function grassTuft(S, x, y, h, pal) {
    var rnd = S.rnd, n = 3 + ((rnd() * 3) | 0);
    for (var i = 0; i < n; i++) {
      var dx = (i - n / 2) * h * 0.22 + (rnd() - 0.5) * h * 0.2;
      var hh = h * (0.6 + rnd() * 0.6);
      S.quad(x, y, x + dx * 0.4, y - hh * 0.6, x + dx, y - hh,
        { n: 7, color: rnd() > 0.5 ? pal.leaf : pal.ink2, width: 0.2, speed: 130, alpha: 0.85 });
    }
  }

  function sparkles(S, xs, LH, pal, n) {
    var rnd = S.rnd;
    for (var i = 0; i < n; i++) {
      var x = 6 + rnd() * 88, y = 4 + rnd() * (LH - 8);
      var r = 0.35 + rnd() * 0.5;
      S.line(x - r, y, x + r, y, { color: pal.accent[0], width: 0.2, speed: 200, alpha: 0.7 });
      S.line(x, y - r, x, y + r, { color: pal.accent[0], width: 0.2, speed: 200, alpha: 0.7 });
    }
  }

  function pickMotif(list, rnd, wantSlot) {
    var candidates = list.filter(function (id) {
      var m = global.MOTIFS[id];
      return !wantSlot || m.slot === wantSlot || m.slot === "any";
    });
    if (!candidates.length) candidates = list;
    return candidates[(rnd() * candidates.length) | 0];
  }

  /* The declared size range is a guide, not a cage — a tall region deserves a
   * tall drawing, so the upper bound is allowed to stretch. */
  function sizeFor(id, LH, f) {
    var m = global.MOTIFS[id];
    var want = LH * f;
    return Math.max(m.size[0] * 0.8, Math.min(m.size[1] * 2.2, want));
  }

  /* Scenery reads fine repeated across a scene; characters and objects do not. */
  var REPEATABLE = {
    tree: 1, pine: 1, fern: 1, mushroom: 1, flower: 1, cactus: 1,
    house: 1, mountain: 1, city: 1, leaf: 1, wave: 1
  };

  /* Evenly spaced x positions with a little human jitter, never colliding. */
  function slots(n, x0, x1, rnd) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      out.push(x0 + t * (x1 - x0) + (rnd() - 0.5) * ((x1 - x0) / Math.max(2, n) * 0.35));
    }
    return out;
  }

  function place(S, id, x, y, size, pal) {
    var m = global.MOTIFS[id];
    if (!m) return;
    S.move(x, m.anchor === "base" ? y - size * 0.5 : y, 0.22, 3);
    m.draw(S, x, y, size, pal);
  }

  /* ---------- scene builders ---------- */

  function buildLandscape(S, LH, p, pal) {
    var rnd = S.rnd;
    var wide = 100 / LH;                       // >1 means a short, wide box
    var horizon = LH * (LH > 118 ? 0.76 : wide > 2 ? 0.74 : 0.7);

    S.pause(0.5);

    /* horizon line first — it anchors everything */
    S.curve([[2, horizon + (rnd() - 0.5)], [30, horizon - 0.8 + rnd()], [66, horizon + 0.6], [98, horizon - 0.4]],
      { color: pal.ink, width: 0.34, speed: 70 });

    var back = p.motifs.filter(function (id) { return global.MOTIFS[id].slot === "horizon"; });
    var ground = p.motifs.filter(function (id) { return global.MOTIFS[id].slot === "ground"; });
    var sky = p.motifs.filter(function (id) { return global.MOTIFS[id].slot === "sky"; });
    var any = p.motifs.filter(function (id) { return global.MOTIFS[id].slot === "any"; });

    if (!ground.length && any.length) ground = [any.shift()];
    if (!ground.length && back.length) ground = [back[0]];
    if (!ground.length && sky.length > 1) ground = [sky.pop()];
    if (!ground.length) ground = p.motifs.slice(0, 1);

    /* far distance */
    back.forEach(function (id, i) {
      var xs = slots(back.length, 26, 74, rnd);
      place(S, id, xs[i], horizon + 0.6, sizeFor(id, LH, 0.42), pal);
    });

    /* Only scenery repeats convincingly — a row of five identical cats does not. */
    var scenery = ground.filter(function (id) { return REPEATABLE[id]; });

    /* a receding row of small repeats so the middle distance isn't empty */
    var filler = scenery[0] || back.filter(function (id) { return REPEATABLE[id]; })[0];
    if (filler) {
      slots(wide > 2 ? 5 : 3, 8, 92, rnd).forEach(function (x) {
        if (Math.abs(x - 50) < 12) return;
        place(S, filler, x, horizon - 0.6 - rnd() * 0.8, sizeFor(filler, LH, 0.17 + rnd() * 0.05), pal);
      });
    }

    /* the near row — distinct subjects first, scenery padding the gaps */
    var near = ground.slice();
    var want = wide > 2 ? 4 : 3;
    while (near.length < want && scenery.length) near.push(scenery[near.length % scenery.length]);

    var taken = [];
    var free = slots(near.length, 10, 90, rnd);
    for (var i = 0; i < near.length; i++) {
      var id = near[i];
      var heroF = near.length > 3 ? 0.4 : near.length > 2 ? 0.46 : (wide > 2 ? 0.62 : 0.52);
      var f = i === 0 ? heroF : 0.26 + rnd() * 0.1;
      var sz = sizeFor(id, LH, f);
      var half = sz * 0.45;
      /* take whichever free slot leaves the most room, rather than dropping the motif */
      var pickIdx = -1, bestGap = -1;
      for (var k = 0; k < free.length; k++) {
        if (free[k] === null) continue;
        var gap = taken.length
          ? Math.min.apply(null, taken.map(function (t) { return Math.abs(t[0] - free[k]) - t[1] - half; }))
          : 99;
        if (gap > bestGap) { bestGap = gap; pickIdx = k; }
      }
      if (pickIdx < 0) break;
      var x = free[pickIdx];
      free[pickIdx] = null;
      taken.push([x, half]);
      /* crowded scenes gain depth instead of losing motifs: later items sit
         a touch further back, which reads as overlap rather than collision */
      var depth = bestGap < 0 ? -1.2 - rnd() * 1.4 : 0.4 + rnd() * 1.8;
      place(S, id, x, horizon + depth, sz, pal);
    }

    /* sky — each motif once, padded only with things that read fine repeated */
    var skyH = horizon * 0.62;
    var skyList = sky.slice();
    if (!skyList.length && any.length) skyList.push(any[0]);
    var padding = ["cloud", "star", "bird"];
    var wantSky = wide > 2 ? 3 : 2;
    for (var s2 = 0; skyList.length < wantSky && s2 < padding.length; s2++) {
      if (skyList.indexOf(padding[s2]) < 0) skyList.push(padding[s2]);
    }
    var sxs = global.PX.shuffle(rnd, slots(skyList.length, 12, 88, rnd));
    skyList.forEach(function (id, i) {
      place(S, id, sxs[i], 4 + (i % 2) * skyH * 0.42 + rnd() * skyH * 0.34,
        sizeFor(id, LH, i === 0 ? 0.26 : 0.15 + rnd() * 0.04), pal);
    });

    /* floating extras */
    any.slice(0, 3).forEach(function (id, i) {
      var x = 12 + rnd() * 76;
      var y = horizon * (0.3 + rnd() * 0.45);
      place(S, id, x, y, sizeFor(id, LH, 0.18 + rnd() * 0.07), pal);
    });

    S.move(8, horizon, 0.24, 2.4);
    var tufts = wide > 2 ? 14 : 10;
    for (var t = 0; t < tufts; t++) grassTuft(S, 5 + rnd() * 90, horizon + 0.4 + rnd() * 1.4, LH * 0.045, pal);
    groundTexture(S, horizon + 1.8, 4, 96, pal, 34);

    /* foreground: a tall region leaves a lot of empty page below the horizon */
    var floor = LH - (p.caption ? LH * 0.14 : 2);
    if (floor - horizon > LH * 0.12) {
      var props = ["leaf", "flower", "mushroom", "fern"].filter(function (id) {
        return p.motifs.indexOf(id) >= 0;
      });
      if (!props.length) props = ["leaf"];
      var rows = Math.max(1, Math.round((floor - horizon) / (LH * 0.14)));
      for (var r = 0; r < rows; r++) {
        var fy = horizon + (floor - horizon) * ((r + 0.7) / (rows + 0.4));
        var cols = 2 + ((rnd() * 3) | 0);
        slots(cols, 12, 88, rnd).forEach(function (fx) {
          var id = props[(rnd() * props.length) | 0];
          var mm = global.MOTIFS[id];
          var sz = sizeFor(id, LH, 0.07 + rnd() * 0.04) * (0.8 + (r / rows) * 0.6);
          place(S, id, fx, mm.anchor === "base" ? fy + sz * 0.4 : fy, sz, pal);
        });
        groundTexture(S, fy, 6, 94, pal, 12);
      }
    }
  }

  function buildVignette(S, LH, p, pal) {
    var rnd = S.rnd;
    S.pause(0.5);
    var main = p.motifs[0];
    var cy = LH * 0.44;
    var m = global.MOTIFS[main];
    var size = sizeFor(main, LH, Math.min(0.72, 62 / LH));
    place(S, main, 50, m.anchor === "base" ? cy + size * 0.46 : cy, size, pal);

    var rest = p.motifs.slice(1);
    var n = Math.max(6, Math.min(10, rest.length * 3));
    var rx = Math.min(42, 34 + LH * 0.05);
    var ry = Math.min(LH * 0.42, cy * 0.86);
    for (var i = 0; i < n; i++) {
      var id = rest.length ? rest[i % rest.length] : pickMotif(p.motifs, rnd, "any");
      var a = (i / n) * Math.PI * 2 - 1.35 + (rnd() - 0.5) * 0.18;
      var x = 50 + Math.cos(a) * (rx + (rnd() - 0.5) * 4);
      var y = cy + Math.sin(a) * (ry + (rnd() - 0.5) * 3);
      var mm = global.MOTIFS[id];
      var sz = sizeFor(id, LH, 0.16);
      if (x < 7 || x > 93 || y < sz * 0.5 + 2 || y > LH - sz * 0.5 - 2) continue;
      place(S, id, x, mm.anchor === "base" ? y + sz * 0.42 : y, sz, pal);
    }
    sparkles(S, 0, LH, pal, 8);
  }

  function buildPattern(S, LH, p, pal) {
    var rnd = S.rnd;
    S.pause(0.5);
    var cx = 50, cy = LH * 0.48;
    var rx = 40, ry = Math.min(LH * 0.4, cy * 0.84);
    var n = 12;
    for (var i = 0; i < n; i++) {
      var id = p.motifs[i % p.motifs.length];
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      var x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      var mm = global.MOTIFS[id];
      var sz = sizeFor(id, LH, 0.2);
      place(S, id, x, mm.anchor === "base" ? y + sz * 0.4 : y, sz, pal);
    }
    /* connecting vine */
    var vine = [];
    for (var k = 0; k <= 60; k++) {
      var a2 = (k / 60) * Math.PI * 2 - Math.PI / 2;
      vine.push([cx + Math.cos(a2) * rx * 0.72, cy + Math.sin(a2) * ry * 0.72]);
    }
    S.curve(vine, { color: pal.leaf, width: 0.24, speed: 80, alpha: 0.8 });
    for (var j = 0; j < 14; j++) {
      var a3 = (j / 14) * Math.PI * 2;
      var lx = cx + Math.cos(a3) * rx * 0.72, ly = cy + Math.sin(a3) * ry * 0.72;
      global.MOTIFS.leaf.draw(S, lx, ly, LH * 0.055, pal);
    }
    if (p.motifs.length) {
      var hero = p.motifs[0];
      var hm = global.MOTIFS[hero];
      var hs = sizeFor(hero, LH, 0.34);
      place(S, hero, cx, hm.anchor === "base" ? cy + hs * 0.45 : cy, hs, pal);
    }
  }

  function buildScatter(S, LH, p, pal) {
    var rnd = S.rnd;
    S.pause(0.5);
    var used = [];
    var n = 14;
    for (var i = 0; i < n; i++) {
      var id = p.motifs[i % p.motifs.length];
      var tries = 0, x, y, ok = false, sz = sizeFor(id, LH, i === 0 ? 0.34 : 0.17 + rnd() * 0.1);
      while (tries++ < 60) {
        x = 10 + rnd() * 80;
        y = sz * 0.5 + 3 + rnd() * Math.max(4, LH - sz - 6);
        ok = true;
        for (var k = 0; k < used.length; k++) {
          var dx = used[k][0] - x, dy = used[k][1] - y;
          if (Math.sqrt(dx * dx + dy * dy) < (used[k][2] + sz) * 0.6) { ok = false; break; }
        }
        if (ok) break;
      }
      if (!ok) continue;
      used.push([x, y, sz]);
      var mm = global.MOTIFS[id];
      place(S, id, x, mm.anchor === "base" ? y + sz * 0.4 : y, sz, pal);
    }
    /* faint constellation lines */
    for (var c = 1; c < used.length; c += 2) {
      S.line(used[c - 1][0], used[c - 1][1], used[c][0], used[c][1],
        { color: pal.soft, width: 0.16, speed: 150, alpha: 0.35, n: 8 });
    }
    sparkles(S, 0, LH, pal, 10);
  }

  /* A riff is the subject; this is just a few things scattered around it so the
     rest of the clear space isn't bare. Deliberately sparse. */
  function buildAccents(S, LH, p, pal, chosen) {
    var rnd = S.rnd;
    var avoid = chosen ? S.toLocal(chosen.feature) : null;
    var reach = avoid ? (avoid.r || Math.max(avoid.w || 0, avoid.h || 0) || 12) * 1.7 : 0;
    var n = Math.min(5, Math.max(2, p.motifs.length));
    var placed = 0, tries = 0;
    while (placed < n && tries++ < 60) {
      var id = p.motifs[placed % p.motifs.length];
      var m = global.MOTIFS[id];
      if (!m) { placed++; continue; }
      var sz = sizeFor(id, LH, 0.13 + rnd() * 0.06);
      var x = 10 + rnd() * 80;
      var y = sz * 0.6 + 3 + rnd() * Math.max(4, LH - sz - 8);
      if (avoid && avoid.x !== undefined) {
        var dx = x - avoid.x, dy = y - avoid.y;
        if (Math.sqrt(dx * dx + dy * dy) < reach) continue;
      }
      place(S, id, x, m.anchor === "base" ? y + sz * 0.4 : y, sz, pal);
      placed++;
    }
    sparkles(S, 0, LH, pal, 4);
  }

  /* ---------- entry point ---------- */

  /* Pick a feature of the picture and a way to build on it. Keywords steer the
     choice; without them the picture alone decides. */
  function pickRiff(features, tokens, rnd) {
    if (!features || !features.length || !global.RIFFS) return null;
    var options = [];
    features.forEach(function (f) {
      global.RIFFS.forKind(f.kind).forEach(function (r) {
        /* weight says how interesting the thing is to build on — the club pip
           beats the card's border even though the border is far bigger */
        var score = (f.weight === undefined ? 1 : f.weight) * 2;
        r.tags.forEach(function (t) { if (tokens.indexOf(t) >= 0) score += 8; });
        options.push({ feature: f, riff: r, score: score + rnd() * 1.6 });
      });
    });
    if (!options.length) return null;
    options.sort(function (a, b) { return b.score - a.score; });
    return options[0];
  }

  function compose(opts) {
    var rnd = global.PX.makeRand(opts.seed);
    var built = sketchFor(opts.region, opts.natW, opts.natH, rnd);
    var S = built.S, LH = built.LH;
    var p = opts.plan;
    var chosen0 = pickRiff(opts.features, p.tokens || [], global.PX.makeRand(opts.seed ^ 0x5bf03635));
    /* nothing asked for and nothing to build on — then invent something */
    if (!chosen0 && p.empty) p = surprisePlan(rnd);

    var moods = ["graphite", "forest", "ocean", "autumn", "sunset", "night", "candy"];
    var palName = p.palette || moods[(rnd() * moods.length) | 0];
    var pal = PALETTES[opts.tone === "dark" ? "chalk" : palName];
    if (opts.tone === "dark") pal = PALETTES.chalk;
    pal = Object.assign({}, pal);

    S.pen({ color: pal.ink, width: 0.32, alpha: 1, speed: 58 });
    S.jit = 0.15;

    /* The picture comes first: find something already on it worth building on. */
    var chosen = chosen0;
    var story = null;

    if (chosen) {
      S.pause(0.5);
      chosen.riff.draw(S, S.toLocal(chosen.feature), pal);
      story = chosen.riff.story.replace("%s", chosen.feature.label || chosen.feature.note || "it");
      /* then a light supporting scene in the clear space, not a second drawing */
      if (p.motifs.length) buildAccents(S, LH, p, pal, chosen);
    } else {
      var builders = {
        landscape: buildLandscape, vignette: buildVignette,
        pattern: buildPattern, scatter: buildScatter
      };
      (builders[p.scene] || buildVignette)(S, LH, p, pal);
    }

    if (p.caption) {
      var capH = Math.max(2.6, Math.min(6, LH * 0.09));
      var baseline = LH - capH * 0.6;
      S.move(50, baseline + capH * 1.6, 0.4, 4);
      global.STROKEFONT.drawText(S, p.caption, 50, baseline, capH,
        { color: pal.ink2, width: 0.26, speed: 44, alpha: 0.9 });
      var tw = global.STROKEFONT.measureText(p.caption.toUpperCase(), capH, 0.24);
      S.line(50 - tw / 2 - 1, baseline + capH * 0.42, 50 + tw / 2 + 1, baseline + capH * 0.42,
        { color: pal.accent[0], width: 0.22, speed: 70, alpha: 0.8 });
    }

    S.pause(0.3);
    return {
      actions: S.acts, palette: pal, localH: LH,
      story: story,
      title: story || p.title || "a doodle",
      riff: chosen ? chosen.riff.id : null,
      feature: chosen ? chosen.feature.id : null
    };
  }

  global.COMPOSE = {
    PALETTES: PALETTES,
    THEMES: THEMES,
    plan: plan,
    surprisePlan: surprisePlan,
    pickRiff: pickRiff,
    compose: compose,
    sketchFor: sketchFor,
    tokenize: tokenize
  };
})(window);
