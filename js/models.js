/* models.js — the Quick / Balanced / Deep table.
 *
 * Loaded as a plain script in the browser (window.PENCIL_MODELS) and required
 * by server.js in Node, so the client and the proxy can never disagree about
 * which models are allowed.
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else root.PENCIL_MODELS = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TIERS = [
    { id: "quick", label: "Quick", hint: "a fast sketch, ~10-25s" },
    { id: "balanced", label: "Balanced", hint: "more detail, ~25-60s" },
    { id: "deep", label: "Deep", hint: "the most considered drawing, 1-2 min" }
  ];

  var MODELS = {
    anthropic: {
      /* Haiku 4.5 rejects output_config.effort with a 400 — it must be omitted. */
      quick: { model: "claude-haiku-4-5", maxTokens: 14000 },
      balanced: { model: "claude-sonnet-5", maxTokens: 22000, effort: "low" },
      deep: { model: "claude-opus-5", maxTokens: 32000, effort: "high" }
    },
    xai: {
      quick: { model: "grok-4.20-0309-non-reasoning", maxTokens: 14000 },
      balanced: { model: "grok-4.3", maxTokens: 18000 },
      deep: { model: "grok-4.6", maxTokens: 24000 }
    },
    gemini: {
      quick: { model: "gemini-3.5-flash-lite", maxTokens: 24000 },
      balanced: { model: "gemini-3.7-flash", maxTokens: 36000 },
      deep: { model: "gemini-3.1-pro-preview", maxTokens: 56000 }
    },
    /* The gpt-5.6 family, ordered by measurement rather than by the names:
       on one design each, luna took 23s for 109 ops, terra 26s, and sol 73s
       for 154 ops and twice anyone's reasoning tokens. Moon, earth, sun. */
    openai: {
      quick: { model: "gpt-5.6-luna", maxTokens: 20000 },
      balanced: { model: "gpt-5.6-terra", maxTokens: 28000, effort: "low" },
      deep: { model: "gpt-5.6-sol", maxTokens: 40000, effort: "high" }
    }
  };

  /* Which env var holds each provider's key when running server-side. */
  var ENV_KEYS = {
    anthropic: "ANTHROPIC_API_KEY",
    xai: "XAI_API_KEY",
    gemini: "GEMINI_API_KEY",
    openai: "OPENAI_API_KEY"
  };

  return { TIERS: TIERS, MODELS: MODELS, ENV_KEYS: ENV_KEYS };
});
