/* server.js — a dependency-free static server for the Pencil app.
 *
 * Used by run.bat locally and as the container entrypoint on Fly.
 *   PORT  listening port          (default 8080)
 *   HOST  interface to bind       (default 127.0.0.1; Fly sets 0.0.0.0)
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const { TIERS, MODELS, ENV_KEYS } = require("./js/models.js");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "127.0.0.1";

/* Optional shared password for a deployed copy. Unset = open to anyone who
   has the URL, which is fine privately but not for a public app with keys. */
const PASSWORD = process.env.PENCIL_PASSWORD || "";
/* Designs per IP per hour. A public endpoint spending real money needs a cap. */
const RATE_LIMIT = Number(process.env.PENCIL_RATE_LIMIT || 20);

function providerKey(p) { return process.env[ENV_KEYS[p]] || ""; }
function enabledProviders() { return Object.keys(ENV_KEYS).filter(providerKey); }

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ "content-length": Buffer.byteLength(body) }, headers || {}));
  res.end(body);
}

function sendJSON(res, code, obj) {
  send(res, code, JSON.stringify(obj), { "content-type": "application/json; charset=utf-8" });
}

/* ---------- rate limiting ---------- */

const hits = new Map();   // ip -> [timestamps]

function rateLimited(ip) {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const cutoff = now - 3600e3;
  const list = (hits.get(ip) || []).filter(t => t > cutoff);
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) {           // keep the map from growing without bound
    for (const [k, v] of hits) if (!v.some(t => t > cutoff)) hits.delete(k);
  }
  return false;
}

function clientIP(req) {
  const fwd = req.headers["fly-client-ip"] || req.headers["x-forwarded-for"] || "";
  return String(fwd).split(",")[0].trim() || req.socket.remoteAddress || "?";
}

/* ---------- the design proxy ---------- */

function readBody(req, limit = 200e3) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on("data", c => {
      n += c.length;
      if (n > limit) { reject(new Error("Request too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function callProvider(provider, m, prompt) {
  const key = providerKey(provider);

  if (provider === "anthropic") {
    const body = { model: m.model, max_tokens: m.maxTokens, messages: [{ role: "user", content: prompt }] };
    if (m.effort) body.output_config = { effort: m.effort };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
    const d = await r.json();
    if (d.stop_reason === "refusal") throw new Error("Claude declined this request.");
    return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  }

  if (provider === "xai") {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ model: m.model, max_tokens: m.maxTokens, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) throw new Error("Grok " + r.status + ": " + (await r.text()).slice(0, 200));
    const d = await r.json();
    return (d.choices && d.choices[0] && d.choices[0].message.content) || "";
  }

  if (provider === "gemini") {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + m.model +
      ":generateContent?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: m.maxTokens, responseMimeType: "application/json" }
      })
    });
    if (!r.ok) throw new Error("Gemini " + r.status + ": " + (await r.text()).slice(0, 200));
    const d = await r.json();
    const c = d.candidates && d.candidates[0];
    if (!c) throw new Error("Gemini returned no candidates.");
    if (c.finishReason && c.finishReason !== "STOP") {
      throw new Error("Gemini stopped early (" + c.finishReason + ").");
    }
    return ((c.content && c.content.parts) || []).map(p => p.text || "").join("");
  }

  throw new Error("Unknown provider");
}

async function handleDesign(req, res) {
  if (PASSWORD && req.headers["x-pencil-key"] !== PASSWORD) {
    return sendJSON(res, 401, { error: "Wrong or missing access password." });
  }
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJSON(res, 400, { error: "Bad request body." });
  }

  const provider = String(body.provider || "");
  const tier = String(body.tier || "balanced");
  const prompt = String(body.prompt || "");

  if (!providerKey(provider)) return sendJSON(res, 404, { error: "No server key for " + provider + "." });
  if (!TIERS.some(t => t.id === tier)) return sendJSON(res, 400, { error: "Unknown tier." });
  if (prompt.length < 20 || prompt.length > 40000) return sendJSON(res, 400, { error: "Bad prompt." });

  /* Count against the limit only once the request is real, so a typo or a
     probe doesn't cost someone their quota. */
  if (rateLimited(clientIP(req))) {
    return sendJSON(res, 429, {
      error: "That's " + RATE_LIMIT + " drawings in an hour from this address — try later, " +
        "or use the Built-in designer, which is unlimited."
    });
  }

  /* The model is chosen here, never by the caller — otherwise a public endpoint
     could be pointed at any model on the account. */
  const m = MODELS[provider][tier];

  try {
    const text = await callProvider(provider, m, prompt);
    sendJSON(res, 200, { text, model: m.model });
  } catch (e) {
    console.error("[design]", provider, tier, e.message);
    sendJSON(res, 502, { error: String(e.message || e) });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/api/design") {
    return handleDesign(req, res).catch(e => sendJSON(res, 500, { error: String(e.message || e) }));
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "Method not allowed", { "content-type": "text/plain" });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    return send(res, 400, "Bad request", { "content-type": "text/plain" });
  }

  if (pathname === "/" || pathname === "") pathname = "/pencil.html";
  if (pathname === "/healthz") return send(res, 200, "ok", { "content-type": "text/plain" });
  if (pathname === "/api/providers") {
    return sendJSON(res, 200, {
      providers: enabledProviders(),
      authRequired: !!PASSWORD,
      rateLimit: RATE_LIMIT
    });
  }
  /* Never serve the local key file from a deployed copy. */
  if (pathname === "/js/keys.local.js" && enabledProviders().length) {
    return send(res, 404, "Not found", { "content-type": "text/plain" });
  }

  /* Resolve inside ROOT — nothing above it is reachable, however the URL is spelled. */
  const target = path.resolve(ROOT, "." + path.sep + pathname);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return send(res, 403, "Forbidden", { "content-type": "text/plain" });
  }

  fs.stat(target, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, "Not found: " + pathname, { "content-type": "text/plain" });
    }
    const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "content-length": st.size,
      /* the app is edited live in development, so never let the browser hold a stale copy */
      "cache-control": "no-cache"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(target).pipe(res).on("error", () => res.destroy());
  });
});

server.listen(PORT, HOST, () => {
  const shown = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Pencil is running at  http://${shown}:${PORT}/pencil.html`);
  const p = enabledProviders();
  if (p.length) {
    console.log(`Proxying AI designers: ${p.join(", ")}  ` +
      `(limit ${RATE_LIMIT}/hour per IP, password ${PASSWORD ? "on" : "off"})`);
  }
  if (HOST !== "0.0.0.0") console.log("Press Ctrl+C to stop.");
});

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => server.close(() => process.exit(0)))
);
