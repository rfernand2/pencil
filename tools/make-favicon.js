/* Draws favicon.ico — a gold pencil on a dark tile, mid-stroke.
 *
 * Everything else in this project is drawn in code rather than pasted in as
 * an asset, and the icon is no exception: run `node tools/make-favicon.js`
 * and it re-renders. No dependencies; PNG and ICO are both written by hand.
 *
 * The design is authored once in a 0..1 square and rasterised at every size
 * with 8x8 supersampling, so 16px is the same drawing as 48px rather than a
 * blurry downscale of it.
 */
const fs = require("fs"), zlib = require("zlib"), path = require("path");

/* ---------- the drawing ------------------------------------------------ */

const C = {
  tile: [0x1c, 0x1f, 0x25],   /* --panel   */
  gold: [0xe8, 0xb4, 0x5c],   /* --accent  */
  goldLo: [0xb0, 0x7e, 0x35], /* the shaded facet */
  wood: [0xef, 0xe3, 0xcd],
  lead: [0x9a, 0xa1, 0xad],   /* --dim: graphite reads grey, not black, on a dark tile */
  line: [0xe9, 0xe6, 0xdf]    /* --text: the stroke it just drew */
};

/* Pencil axis: tip at lower-left, pointing up-right at 45°. */
const TIP = [0.290, 0.715];
const DIR = [Math.SQRT1_2, -Math.SQRT1_2];
const PERP = [-DIR[1], DIR[0]];
const HALF = 0.108;                 /* half the barrel width */
const CONE = 0.175;                 /* tip -> where the wood meets the paint */
const END = 0.640;                  /* tip -> the blunt far end */

const at = (d, o) => [TIP[0] + DIR[0] * d + PERP[0] * (o || 0),
TIP[1] + DIR[1] * d + PERP[1] * (o || 0)];

const barrel = [at(CONE, HALF), at(END, HALF), at(END, -HALF), at(CONE, -HALF)];
const facet = [at(CONE, 0), at(END, 0), at(END, -HALF), at(CONE, -HALF)];
const cone = [TIP, at(CONE, HALF), at(CONE, -HALF)];
const lead = [TIP, at(0.052, HALF * 0.30), at(0.052, -HALF * 0.30)];

/* The stroke leaving the tip — a flick, not a full arc, so it still reads at
   16px. Kept thin and started at the tip rather than behind it: any wider and
   it stops being a line and becomes a blob under the pencil. */
const stroke = [[0.305, 0.775], [0.44, 0.840], [0.615, 0.846], [0.760, 0.788]];
const STROKE_W = 0.038;

/* ---------- geometry --------------------------------------------------- */

function inPoly(p, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
      p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

function nearPolyline(p, pts, w) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = p[0] - (a[0] + dx * t), ey = p[1] - (a[1] + dy * t);
    if (ex * ex + ey * ey <= w * w) return true;
  }
  return false;
}

function inRounded(p, r) {
  const x = p[0], y = p[1];
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  const cx = x < r ? r : x > 1 - r ? 1 - r : x;
  const cy = y < r ? r : y > 1 - r ? 1 - r : y;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/* Painter's algorithm, last hit wins. Returns [r,g,b,a] or null for nothing. */
function sample(p) {
  if (inPoly(p, lead)) return C.lead;
  if (inPoly(p, cone)) return C.wood;
  if (inPoly(p, facet)) return C.goldLo;
  if (inPoly(p, barrel)) return C.gold;
  if (nearPolyline(p, stroke, STROKE_W)) return C.line;
  if (inRounded(p, 0.22)) return C.tile;
  return null;
}

/* ---------- raster ----------------------------------------------------- */

const SS = 8;   /* 64 samples per pixel: the 45° barrel edges need it */

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample([(x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size]);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; n++;
        }
      }
      const i = (y * size + x) * 4;
      if (!n) continue;
      /* Premultiplied average: partly-covered edge pixels keep their colour
         and lose only alpha, which is what stops a dark halo on light tabs. */
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = Math.round(n / (SS * SS) * 255);
    }
  }
  return px;
}

/* ---------- PNG -------------------------------------------------------- */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    /* bit depth */
  ihdr[9] = 6;    /* truecolour + alpha */
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;   /* filter: none */
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/* ---------- ICO -------------------------------------------------------- */

function ico(entries) {
  const head = Buffer.alloc(6 + entries.length * 16);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);                  /* 1 = icon */
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach((e, i) => {
    const d = 6 + i * 16;
    head[d] = e.size >= 256 ? 0 : e.size;    /* 0 means 256 */
    head[d + 1] = e.size >= 256 ? 0 : e.size;
    head[d + 2] = 0;                         /* palette size */
    head[d + 3] = 0;
    head.writeUInt16LE(1, d + 4);            /* colour planes */
    head.writeUInt16LE(32, d + 6);           /* bits per pixel */
    head.writeUInt32LE(e.data.length, d + 8);
    head.writeUInt32LE(offset, d + 12);
    offset += e.data.length;
  });
  return Buffer.concat([head, ...entries.map(e => e.data)]);
}

/* ---------- go --------------------------------------------------------- */

const SIZES = [16, 32, 48, 64];
const entries = SIZES.map(size => ({ size, data: png(size, render(size)) }));
const out = path.join(__dirname, "..", "favicon.ico");
fs.writeFileSync(out, ico(entries));
console.log("favicon.ico  " + SIZES.join("/") + "px  " + fs.statSync(out).size + " bytes");

/* Handy when tweaking the design: node tools/make-favicon.js --preview */
if (process.argv.includes("--preview")) {
  const dir = process.argv[process.argv.indexOf("--preview") + 1] || __dirname;
  for (const size of [16, 32, 48, 128, 256]) {
    fs.writeFileSync(path.join(dir, "icon-" + size + ".png"), png(size, render(size)));
  }
  console.log("previews written to " + dir);
}
