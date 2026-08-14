# Pencil

Pick a picture, press **Draw**, and a pencil sketches something onto it — stroke by
stroke, in front of you. It doesn't draw *next to* what's already there; it builds on it.
Given an ace of clubs it grows a trunk under the club pip and makes it a tree. Given a
ruled page it turns the lines into a sea and sails a boat along one of them.

Keywords are optional. They steer what it does with the picture; they aren't the subject.

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
| `js/backgrounds.js` | The eleven pictures, drawn procedurally onto a canvas; each declares its white-space rectangle |
| `js/motifs.js` | 52 hand-coded motifs (trees, cats, lighthouses, mandalas…) with tags for keyword matching |
| `js/strokefont.js` | A single-stroke alphabet, so the pencil can hand-letter a word |
| `js/riffs.js` | 23 ways to build on a feature of the picture — the heart of it |
| `js/compose.js` | Picture features + keywords → a plan → actions |
| `js/ai.js` | Optional: an LLM designs the strokes instead, at run time |
| `js/store.js` | Everything kept on this machine — gallery, uploads, preferences |
| `server.js` / `run.bat` | Serving it locally (and, later, the deployed container) |

### Coordinates

Motifs are authored in **local units**: 0–100 across the drawing region, with y running
to whatever the region's aspect makes it. One local unit is square on screen, so a circle
is a circle whichever picture it lands on. `compose.sketchFor()` maps local units into
image percentages; the player maps those to pixels at whatever size the picture is shown.

## Using the picture as the idea

This is the whole point, and it comes from the post the project started with — several
models were handed an ace of clubs and asked to *"be creative and draw inside the card,
using the card as inspo"*. Drawing something unrelated in the blank middle misses it.

So every picture declares its **features**: the club pip, a coffee ring, the ruled lines,
a fold crease, the hills on the horizon, a wax seal, the blank canvas in a frame. 31 of
them across the eleven pictures, each with a weight saying how interesting it is to build on —
the card's pip beats the card's border even though the border is far bigger.

`js/riffs.js` then holds ways to build on a feature, keyed by what kind of thing it is:

| The picture has… | …so the drawing might |
| --- | --- |
| a round thing (coffee ring, postmark, cup) | make it a sun, a hot-air balloon, a bicycle wheel, a ringed planet, a pond with a fish |
| a printed emblem (a card pip) | grow a trunk under it, hang a basket from it, fly it as a kite, plant clover beneath it, let vines climb out |
| ruled lines | turn them into a sea with a boat riding one, a stave with notes on it, a fence, rain |
| a strong edge (horizon, fold, seam) | peg washing along it, walk a cat down it, stand a town on it, sail a boat on it |
| a rectangle (canvas, label, stamp box) | make it a window with curtains, a doorway with a path, something climbing in |
| tape corners, spiral binding, a treeline | grow a vine from under it, send a snail up it, fly birds over it |

Keywords pick *among* those: on a ruled page, "music" gives the stave, "sea" the boat,
"rain" the umbrella, "cat" the fence. With none, the picture decides on its own, and the
status line tells you what it did — *"turned the ruled lines into a sea"*.

The AI designers get the same information: the prompt lists what is printed on the surface
with coordinates, and asks the model to build on one of them so the result *could not have
been drawn on any other picture*.

## The eleven pictures

Each was chosen (and drawn) for having a large, calm area to draw into: the ace of clubs
and the ace of diamonds, a taped sketchbook page, a ruled notebook, a vintage postcard, a
linen napkin on a dark desk, sky over hills, a snowfield, a framed blank canvas, a kraft
envelope, and a blueprint sheet. The blueprint is dark, so the pencil switches to white.

Uploaded pictures have no declared features, so they get a free-standing drawing.

**Upload…** takes your own picture and finds the drawing area itself: it downsamples the
image, scores every candidate rectangle on size, local flatness and contrast, and picks
the calmest large one. **Show drawing area** overlays whatever it settled on.

## Who designs it

- **Built-in** — instant and offline. Picks a feature of the picture and a way to build on
  it, then scatters a few supporting details in the clear space. A keyword it does not
  recognise gets hand-lettered into the drawing instead.
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
pictures** brings them all back and clears your uploads (it asks first).

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

## Deploying

Live at **https://pencil-draw.fly.dev** · source at **github.com/rfernand2/pencil** (private).

```
fly deploy
```

`Dockerfile` and `fly.toml` are already set up: Node 22 Alpine, no dependencies, one
`shared-cpu-1x` machine in `sjc` that scales to zero when nobody is using it, health-checked
on `/healthz`.

### Keys never ship to the browser

`.gitignore` and `.dockerignore` both exclude `js/keys.local.js`, so it is in neither the
repo nor the image, and `server.js` refuses to serve it from a deployed copy. The AI
designers instead go through a small proxy — the browser posts a prompt to `/api/design`
and the server calls the provider with a key held as a Fly secret.

As deployed the app has **no secrets set**, so it shows only the Built-in designer and
cannot spend a penny of API credit. To turn the AI designers on:

```
fly secrets set PENCIL_PASSWORD=pick-something
fly secrets set ANTHROPIC_API_KEY=... XAI_API_KEY=... GEMINI_API_KEY=...
```

Set whichever providers you want; each one that has a key appears as a button. Setting
secrets restarts the machine, and the client discovers what is available from
`/api/providers` at startup.

> ⚠️ A `.fly.dev` URL is public. Anyone who finds it and knows the password can spend your
> API credit. `PENCIL_PASSWORD` is the gate; `PENCIL_RATE_LIMIT` (default 20 designs per
> hour per IP address) is the backstop. The proxy also picks the model itself from the
> Quick/Balanced/Deep table, so a caller cannot ask it for an expensive one.

## Other controls

**Drawing speed** scales the animation (0.3×–6×). **Finish now** renders the rest instantly.
**Surprise me** clears the keywords, which hands the idea back to the picture.
**Redraw** re-rolls the same settings into a different drawing — every press uses a fresh
seed, so no two drawings are alike. **Save PNG** composites the artwork onto the picture at
its full resolution, not at screen size.
