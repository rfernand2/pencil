# Pencil

Pick a picture, give it some keywords, press **Draw**, and a pencil sketches something
onto the picture's white space — stroke by stroke, in front of you.

Open `pencil.html` in a browser, or run `run.bat` to serve it on
`http://127.0.0.1:8080`. No build step, no dependencies.

## How it works

The animation is the approach from `t_grok.html`, generalised: a drawing is an ordered
list of **actions** (`move` / `stroke` / `dot` / `pause`), and the player walks that list
in real time, advancing along each stroke's arc length while a pencil sprite rides the tip.

Everything above that is new:

| File | What it does |
| --- | --- |
| `js/engine.js` | The action list, the `Sketch` drawing vocabulary, the animation player, PNG re-render |
| `js/backgrounds.js` | The ten pictures, drawn procedurally onto a canvas; each declares its white-space rectangle |
| `js/motifs.js` | 52 hand-coded motifs (trees, cats, lighthouses, mandalas…) with tags for keyword matching |
| `js/strokefont.js` | A single-stroke alphabet, so the pencil can hand-letter a word |
| `js/compose.js` | Keywords → a scene plan (motifs, palette, layout) → actions |
| `js/ai.js` | Optional: an LLM designs the strokes instead, at run time |
| `js/store.js` | Everything kept on this machine — gallery, uploads, preferences |
| `server.js` / `run.bat` | Serving it locally (and, later, the deployed container) |

### Coordinates

Motifs are authored in **local units**: 0–100 across the drawing region, with y running
to whatever the region's aspect makes it. One local unit is square on screen, so a circle
is a circle whichever picture it lands on. `compose.sketchFor()` maps local units into
image percentages; the player maps those to pixels at whatever size the picture is shown.

## The ten pictures

Each was chosen (and drawn) for having a large, calm area to draw into: an ace-of-clubs
playing card, a taped sketchbook page, a ruled notebook, a vintage postcard, a linen
napkin on a dark desk, sky over hills, a snowfield, a framed blank canvas, a kraft
envelope, and a blueprint sheet. The blueprint is dark, so the pencil switches to white.

**Upload…** takes your own picture and finds the drawing area itself: it downsamples the
image, scores every candidate rectangle on size, local flatness and contrast, and picks
the calmest large one. **Show drawing area** overlays whatever it settled on.

## Who designs it

- **Built-in** — instant and offline. Keywords are matched against motif tags and themes,
  which pick a palette and one of four layouts (landscape, vignette, pattern, scatter).
  A keyword it doesn't recognise gets hand-lettered into the drawing instead.
- **Claude / Grok / Gemini** — the model is handed the drawing vocabulary and the region's
  dimensions, and returns a JSON list of ops. It can use the built-in motifs *and* invent
  its own strokes, so the results are far more varied.

The model never runs code. Every op is validated and clamped before it is drawn; anything
unrecognised is counted and dropped, and the status line tells you how many.

While a model is thinking, a **Designing** dialog shows the provider, step and exact model,
counts the elapsed seconds, and offers **Cancel** — which aborts the request there and then
and leaves the picture untouched.

### Quick → Deep

The slider under the designer buttons picks how hard the model works. Each step is a
genuinely different-sized model, not just a different setting:

| Step | Claude | Grok | Gemini |
| --- | --- | --- | --- |
| **Quick** | `claude-haiku-4-5` | `grok-4.20-0309-non-reasoning` | `gemini-3.5-flash-lite` |
| **Balanced** | `claude-sonnet-5` (effort low) | `grok-4.3` | `gemini-3.7-flash` |
| **Deep** | `claude-opus-5` (effort high) | `grok-4.6` | `gemini-3.1-pro-preview` |

Quick returns a fast sketch in a few seconds; Deep thinks for a minute or two and produces
a much more considered drawing. Note Haiku 4.5 is deliberately sent *without* an `effort`
parameter — it rejects one with a 400.

## The gallery

**★ Save to gallery** keeps the finished picture on this machine, or tick *Save every
finished drawing automatically*. **Gallery** opens the collection: tick the corner of any
card to select it, then **Download** or **Delete** as many as you like at once. Clicking a
card shows exactly how it was made — the model, the step, the background it was drawn on,
the keywords, when it was made, and how many ops survived validation.

Uploaded pictures are kept too, so they're still there next time. Each picture in the
picker has a **✕**: it deletes your uploads, and hides factory pictures. **Reset to factory
pictures** brings all ten back and clears your uploads (it asks first).

Storage is **IndexedDB**, not `localStorage` — the latter caps out around 5MB and only holds
strings, which a handful of full-size drawings would blow straight through. Drawings are
stored as JPEG blobs capped at 1800px, uploads are downscaled to 1600px on the way in, and
the gallery header shows how much space is in use.

## API keys

The AI designers read `js/keys.local.js`. It's already there with your keys in it, and the
model IDs are editable:

```js
window.PENCIL_KEYS = {
  anthropic: { key: "sk-ant-…" },
  xai:       { key: "xai-…" },
  gemini:    { key: "AIza…" }
};
```

Which model each step uses lives in `js/ai.js`. To override, add `model: "…"` to force one
model for every step, or `models: { deep: { model: "…", maxTokens: 40000 } }` for just one.

> ⚠️ **That file is a live secret loaded straight into the browser.** Anyone who can open
> the page can read the keys. Keep it out of version control, don't put it on a shared
> host, and delete it if you only want the offline designer. If you ever publish this,
> move the calls behind a small proxy that holds the keys server-side.

Delete the file and the app still works — the AI buttons simply don't appear.

Gemini's thinking tokens count against `maxTokens`; if it stops early, raise it.

## Other controls

**Drawing speed** scales the animation (0.3×–6×). **Finish now** renders the rest instantly.
**Redraw** re-rolls the same keywords into a different picture — every press uses a fresh
seed, so no two drawings are alike. **Save PNG** composites the artwork onto the picture at
its full resolution, not at screen size.
