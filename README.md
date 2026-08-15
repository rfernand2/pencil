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
| `js/backgrounds.js` | The fifteen pictures, drawn procedurally onto a canvas; each declares its white-space rectangle |
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

This is the whole point, and it comes from the post the project started with:
[**Ann's post**](https://x.com/ann_nnng/status/2088234665287270643), in which several
models were handed an ace of clubs and asked to *"be creative and draw inside the card,
using the card as inspo"*. Drawing something unrelated in the blank middle misses it.

So every picture declares its **features**: the club pip, a coffee ring, the ruled lines,
a fold crease, the hills on the horizon, a wax seal, the blank canvas in a frame. 43 of
them across the fifteen pictures, each with a weight saying how interesting it is to build on —
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

## The fifteen pictures

Each was chosen (and drawn) for having a large, calm area to draw into: the ace of clubs
and the ace of diamonds, a taped sketchbook page, a ruled notebook, a vintage postcard, a
linen napkin on a dark desk, sky over hills, a snowfield, a framed blank canvas, a kraft
envelope, and a blueprint sheet. The blueprint is dark, so the pencil switches to white.

Four of them are there for their **scaffolding** rather than their calm — structure odd
enough that it asks a question:

| Picture | What it hands you |
| --- | --- |
| **Window light on a wall** | A skewed patch of sunlight with the glazing bars laid across it — a lit stage, or a window to climb through |
| **Torn paper** | A ragged rip straight across the picture: a mountain ridge, a coastline, a saw, a row of teeth |
| **Admission ticket** | A barcode is a row of uprights — a skyline, a fence, a pipe organ — and a perforation is a line asking to be crossed |
| **Ink blot** | The oldest creative prompt there is: an accident that is already almost something |

Uploaded pictures have no declared features, so they get a free-standing drawing.

**Upload…** takes your own picture and finds the drawing area itself: it downsamples the
image, scores every candidate rectangle on size, local flatness and contrast, and picks
the calmest large one. **Show drawing area** overlays whatever it settled on.

## Who designs it

- **Built-in** — instant and offline. Picks a feature of the picture and a way to build on
  it, then scatters a few supporting details in the clear space. A keyword it does not
  recognise gets hand-lettered into the drawing instead.
- **Claude / Grok / Gemini / ChatGPT** — the model is handed **the picture itself**, the drawing
  vocabulary and the region's dimensions, and returns a JSON list of ops. It can use the
  built-in motifs *and* invent its own strokes, so the results are far more varied.

The picture goes up as a downscaled JPEG (768px, ~18KB of base64) alongside the prompt, and
the prompt says where the drawing box sits inside it — so the model can tie what it can see
to the coordinates it has to draw in. The features list still goes too: the image says what
the surface looks like, the list says exactly where things are.

The model never runs code. Every op is validated and clamped before it is drawn; anything
unrecognised is counted and dropped, and the status line tells you how many.

While a model is thinking, a **Designing** dialog shows the provider, step and exact model,
counts the elapsed seconds, and offers **Cancel** — which aborts the request there and then
and leaves the picture untouched.

### Quick → Deep

The slider under the designer buttons picks how hard the model works. Each step is a
genuinely different-sized model, not just a different setting:

| Step | Claude | Grok | Gemini | ChatGPT |
| --- | --- | --- | --- | --- |
| **Quick** | `claude-haiku-4-5` | `grok-4.20-0309-non-reasoning` | `gemini-3.5-flash-lite` | `gpt-5.6-luna` |
| **Balanced** | `claude-sonnet-5` (effort low) | `grok-4.3` | `gemini-3.7-flash` | `gpt-5.6-terra` (effort low) |
| **Deep** | `claude-opus-5` (effort high) | `grok-4.6` | `gemini-3.1-pro-preview` | `gpt-5.6-sol` (effort high) |

Quick returns a fast sketch in a few seconds; Deep thinks for a minute or two and produces
a much more considered drawing. The slider governs **both** modes — one-shot and
incremental — so the choice of how hard the model works is always yours.

Two provider quirks, both found the hard way. Haiku 4.5 is deliberately sent *without* an
`effort` parameter — it rejects one with a 400. And the `gpt-5.6` family is ordered by
measurement rather than by its names: on one design each, `luna` took 23s for 109 ops,
`terra` 26s, and `sol` 73s for 154 ops and twice anyone's reasoning tokens. Moon, earth, sun.

### When a model fumbles the JSON

A long op list is worth more than the one op a model got wrong in the middle of it, so a
reply that won't parse is cut back to the last op that does and drawn anyway — the same
for a reply that was truncated mid-array. Only a reply with nothing salvageable in it is
an error. `gpt-5.6-terra` emits a malformed op every so often; without this you lose 150
good ops to one bad one.

### Incremental drawing

Tick **Incremental drawing** and the model stops designing the whole picture up front. It
draws one element, is shown the result, and decides what the picture needs next:

```
    background ──▶ model ──▶ one element ──▶ animate ──▶ snapshot ──┐
                     ▲                                              │
                     └──────────────────────────────────────────────┘
                              until it says done, or 8 rounds
```

Round 1 is the main subject in outline. Every round after that adds one thing of a *kind*
it hasn't drawn yet — a companion, the setting, a foreground detail, or (from round 4) a
single pass of hatching. The model sets `"done": true` when another element would clutter
the picture; most drawings finish in four or five rounds without hitting the cap.

Two things are worked out in code rather than left to the model, because small models are
bad at both. The **occupied box** of each round is measured from the strokes it produced and
fed back in local coordinates, so it knows what space is taken; and the **emptiest cell** of
a 3×3 grid over the drawing area is offered as the place to put the next element, with ties
broken toward the existing work so the picture stays a picture instead of scattering into
the corners. Without those, a small model stacks its whole scene in one blob.

The prompt also spells out that there is no airbrush here — every op becomes a visible
pencil line, so "subtle shading", "a vignette" and "atmosphere" come out as a scribble of
hard grey lines. Told that, models draw *things* instead of effects.

Incremental obeys the same **Quick → Deep** slider as the one-shot mode, and the choice
matters more here because it compounds over the rounds. On the ace of clubs, `gpt-5.6-luna`
(Quick) ran the full eight rounds and produced a sticker sheet — key, padlock, crown,
feather, watch, compass — while `gpt-5.6-terra` (Balanced) drew a crown resting on the
diamond pip, a laurel wreath around it and a key below, then stopped itself at four.
Grok's Quick tier is *non-reasoning* and can't place an element next to the last one: it
piles every round into one tangle where `grok-4.3` on the identical loop draws a clean
scene. Balanced is the sweet spot for this mode; Quick is for when you want it fast and
don't mind a scrapbook.

**Cancel** stops the loop between rounds and keeps whatever is already on the picture — it
is ink, not a preview. The gallery records the mode, the round count and every element in
the order it was drawn.

> On a deployed copy each round is a separate call and counts separately against
> `PENCIL_RATE_LIMIT`, so the default of 20/hour is about three incremental drawings.

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
  gemini:    { key: "AIza…" },
  openai:    { key: "sk-proj-…" }
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

The live demo **does have all four keys set, and no password**, so its only protection is
the rate limit. That is a deliberate choice for a public demo, not an oversight — but it is
the wrong default for a fork. Set a password on yours:

```
fly secrets set PENCIL_PASSWORD=pick-something
fly secrets set ANTHROPIC_API_KEY=... XAI_API_KEY=... GEMINI_API_KEY=... OPENAI_API_KEY=...
```

With no keys set at all, the app still works — it simply offers the Built-in designer only,
and cannot spend a penny.

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

## Credits and licence

Inspired by [Ann's post](https://x.com/ann_nnng/status/2088234665287270643) — models given
an ace of clubs and asked to be creative *inside* the card. That post is the whole brief:
build on what is already on the picture rather than beside it.

Released under the [MIT licence](LICENSE). The pictures, motifs and riffs are drawn in code
in this repository, so there are no third-party image assets to attribute.
