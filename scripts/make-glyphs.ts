// Reads the outlines of the few letters the fleet paints on its hulls out of two open-licence fonts and writes src/model/fleet/typeface.ts. The outlines are plain numbers, so the package ships no font file
// and needs no font at run time; the two licences ship with it (LICENSES/OFL-Michroma.txt, LICENSES/OFL-MPLUS1p.txt) and NOTICE.md credits both.
//
//   node scripts/make-glyphs.ts fonts/Michroma-Regular.ttf /path/to/MPLUS1p-Bold.ttf
//
// Michroma (SIL OFL 1.1, Vernon Adams, https://github.com/googlefonts/Michroma-font) is the wide technical face for Latin letters and figures. M PLUS 1p Bold (SIL OFL 1.1, the M+ Project Authors,
// https://github.com/google/fonts/tree/main/ofl/mplus1p) gives the kanji and katakana. The M+ file is 1.7 MB and is not kept in this repository: download it and pass its path.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LATIN_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -./:#()+&,'!?·×";
const CJK = "加美鳴宮本有明花房ロムルス級";
/** Flattening error of a curve, in cap heights. */
const FLAT = 0.0015;
/** Decimals kept. */
const KEEP = 1000;

interface Font {
  data: DataView;
  tables: Map<string, { offset: number; length: number }>;
  unitsPerEm: number;
  long: boolean;
  glyphs: number;
}

function open(path: string): Font {
  const buffer = readFileSync(path);
  const data = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = data.getUint16(4);
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(data.getUint8(at), data.getUint8(at + 1), data.getUint8(at + 2), data.getUint8(at + 3));
    tables.set(tag, { offset: data.getUint32(at + 8), length: data.getUint32(at + 12) });
  }
  const head = tables.get("head");
  const maxp = tables.get("maxp");
  if (!head || !maxp || !tables.has("glyf")) throw new Error(`${path}: not a TrueType font with outlines`);
  return { data, tables, unitsPerEm: data.getUint16(head.offset + 18), long: data.getInt16(head.offset + 50) === 1, glyphs: data.getUint16(maxp.offset + 4) };
}

/** The glyph index of a character, from the cmap (format 4 or 12). */
function glyphOf(font: Font, code: number): number {
  const cmap = font.tables.get("cmap");
  if (!cmap) throw new Error("no cmap");
  const { data } = font;
  const n = data.getUint16(cmap.offset + 2);
  let best = 0;
  for (let i = 0; i < n; i++) {
    const platform = data.getUint16(cmap.offset + 4 + i * 8);
    const encoding = data.getUint16(cmap.offset + 6 + i * 8);
    const sub = cmap.offset + data.getUint32(cmap.offset + 8 + i * 8);
    const format = data.getUint16(sub);
    if (!((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0)) continue;
    if (format === 12) {
      const groups = data.getUint32(sub + 12);
      for (let g = 0; g < groups; g++) {
        const start = data.getUint32(sub + 16 + g * 12);
        const end = data.getUint32(sub + 20 + g * 12);
        if (code >= start && code <= end) return data.getUint32(sub + 24 + g * 12) + (code - start);
      }
    } else if (format === 4) {
      const segs = data.getUint16(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + segs * 2 + 2;
      const deltas = starts + segs * 2;
      const ranges = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = data.getUint16(ends + s * 2);
        const start = data.getUint16(starts + s * 2);
        if (code < start || code > end) continue;
        const range = data.getUint16(ranges + s * 2);
        const delta = data.getInt16(deltas + s * 2);
        if (range === 0) best = (code + delta) & 0xffff;
        else {
          const at = ranges + s * 2 + range + (code - start) * 2;
          const g = data.getUint16(at);
          best = g === 0 ? 0 : (g + delta) & 0xffff;
        }
        if (best) return best;
      }
    }
  }
  return best;
}

type Point = { x: number; y: number; on: boolean };

/** The contours of a glyph as points with their on-curve flag, in font units; composite glyphs are put together. */
function outlineOf(font: Font, index: number, depth = 0): Point[][] {
  if (depth > 6) return [];
  const { data } = font;
  const loca = font.tables.get("loca");
  const glyf = font.tables.get("glyf");
  if (!loca || !glyf) return [];
  const from = font.long ? data.getUint32(loca.offset + index * 4) : data.getUint16(loca.offset + index * 2) * 2;
  const to = font.long ? data.getUint32(loca.offset + index * 4 + 4) : data.getUint16(loca.offset + index * 2 + 2) * 2;
  if (from === to) return [];
  let at = glyf.offset + from;
  const n = data.getInt16(at);
  at += 10;
  if (n >= 0) {
    const ends: number[] = [];
    for (let i = 0; i < n; i++) ends.push(data.getUint16(at + i * 2));
    at += n * 2;
    const instructions = data.getUint16(at);
    at += 2 + instructions;
    const total = (ends[n - 1] ?? -1) + 1;
    const flags: number[] = [];
    while (flags.length < total) {
      const flag = data.getUint8(at++);
      flags.push(flag);
      if (flag & 8) {
        let repeat = data.getUint8(at++);
        while (repeat-- > 0) flags.push(flag);
      }
    }
    const xs: number[] = [];
    const ys: number[] = [];
    let value = 0;
    for (let i = 0; i < total; i++) {
      const f = flags[i];
      if (f & 2) value += (f & 16 ? 1 : -1) * data.getUint8(at++);
      else if (!(f & 16)) {
        value += data.getInt16(at);
        at += 2;
      }
      xs.push(value);
    }
    value = 0;
    for (let i = 0; i < total; i++) {
      const f = flags[i];
      if (f & 4) value += (f & 32 ? 1 : -1) * data.getUint8(at++);
      else if (!(f & 32)) {
        value += data.getInt16(at);
        at += 2;
      }
      ys.push(value);
    }
    const contours: Point[][] = [];
    let start = 0;
    for (const end of ends) {
      const points: Point[] = [];
      for (let i = start; i <= end; i++) points.push({ x: xs[i], y: ys[i], on: Boolean(flags[i] & 1) });
      contours.push(points);
      start = end + 1;
    }
    return contours;
  }
  // a composite: parts placed by an offset and a scale
  const out: Point[][] = [];
  for (;;) {
    const flag = data.getUint16(at);
    const component = data.getUint16(at + 2);
    at += 4;
    let dx: number;
    let dy: number;
    if (flag & 1) {
      dx = data.getInt16(at);
      dy = data.getInt16(at + 2);
      at += 4;
    } else {
      dx = data.getInt8(at);
      dy = data.getInt8(at + 1);
      at += 2;
    }
    if (!(flag & 2)) {
      dx = 0;
      dy = 0;
    }
    let a = 1;
    let b = 0;
    let c = 0;
    let d = 1;
    const f2 = (o: number) => data.getInt16(at + o) / 16384;
    if (flag & 8) {
      a = d = f2(0);
      at += 2;
    } else if (flag & 0x40) {
      a = f2(0);
      d = f2(2);
      at += 4;
    } else if (flag & 0x80) {
      a = f2(0);
      b = f2(2);
      c = f2(4);
      d = f2(6);
      at += 8;
    }
    for (const contour of outlineOf(font, component, depth + 1)) out.push(contour.map((p) => ({ x: p.x * a + p.y * c + dx, y: p.x * b + p.y * d + dy, on: p.on })));
    if (!(flag & 0x20)) break;
  }
  return out;
}

/** A closed contour of quadratic curves as a polyline: y is scaled by `scale` and moved down by `shift`. */
function flatten(contour: Point[], scale: number, shift: number): number[] {
  if (contour.length < 3) return [];
  // between two off-curve points the on-curve one is implied halfway
  const full: Point[] = [];
  for (let i = 0; i < contour.length; i++) {
    const p = contour[i];
    const q = contour[(i + 1) % contour.length];
    full.push(p);
    if (!p.on && !q.on) full.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, on: true });
  }
  const first = full.findIndex((p) => p.on);
  const ring = first < 0 ? full : full.slice(first).concat(full.slice(0, first));
  if (first < 0) ring.unshift({ x: (ring[0].x + ring[ring.length - 1].x) / 2, y: (ring[0].y + ring[ring.length - 1].y) / 2, on: true });
  const n = ring.length;
  const raw: number[] = [];
  const emit = (x: number, y: number) => raw.push(Math.round(x * scale * KEEP) / KEEP, Math.round((y * scale - shift) * KEEP) / KEEP);
  emit(ring[0].x, ring[0].y);
  let current = ring[0];
  let i = 1;
  while (i <= n) {
    const p = ring[i % n];
    if (p.on) {
      if (i < n) emit(p.x, p.y);
      current = p;
      i += 1;
      continue;
    }
    const next = ring[(i + 1) % n];
    const dev = (Math.hypot(current.x - 2 * p.x + next.x, current.y - 2 * p.y + next.y) / 4) * scale;
    const steps = Math.max(2, Math.min(24, Math.ceil(Math.sqrt(dev / FLAT))));
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const u = 1 - t;
      emit(u * u * current.x + 2 * u * t * p.x + t * t * next.x, u * u * current.y + 2 * u * t * p.y + t * t * next.y);
    }
    if (i + 1 < n) emit(next.x, next.y);
    current = next;
    i += 2;
  }
  const clean: number[] = [];
  for (let k = 0; k < raw.length; k += 2) {
    if (clean.length >= 2 && clean[clean.length - 2] === raw[k] && clean[clean.length - 1] === raw[k + 1]) continue;
    clean.push(raw[k], raw[k + 1]);
  }
  if (clean.length > 4 && clean[0] === clean[clean.length - 2] && clean[1] === clean[clean.length - 1]) clean.length -= 2;
  return clean;
}

/** The glyphs a GPOS coverage table lists, as a map to their index in it. */
function coverageOf(data: DataView, at: number): Map<number, number> {
  const out = new Map<number, number>();
  const format = data.getUint16(at);
  const count = data.getUint16(at + 2);
  if (format === 1) for (let i = 0; i < count; i++) out.set(data.getUint16(at + 4 + i * 2), i);
  else
    for (let i = 0; i < count; i++) {
      const start = data.getUint16(at + 4 + i * 6);
      const end = data.getUint16(at + 6 + i * 6);
      const first = data.getUint16(at + 8 + i * 6);
      for (let g = start; g <= end; g++) out.set(g, first + g - start);
    }
  return out;
}

/** The class of a glyph in a GPOS class definition table (0 when it has none). */
function classOf(data: DataView, at: number, glyph: number): number {
  const format = data.getUint16(at);
  if (format === 1) {
    const start = data.getUint16(at + 2);
    const count = data.getUint16(at + 4);
    return glyph >= start && glyph < start + count ? data.getUint16(at + 6 + (glyph - start) * 2) : 0;
  }
  const ranges = data.getUint16(at + 2);
  for (let i = 0; i < ranges; i++) {
    const start = data.getUint16(at + 4 + i * 6);
    const end = data.getUint16(at + 6 + i * 6);
    if (glyph >= start && glyph <= end) return data.getUint16(at + 8 + i * 6);
  }
  return 0;
}

/** The kerning of a pair of glyphs, in font units: the sum of the first glyph's x advance in every pair-adjustment lookup the `kern` feature uses. */
function kerner(font: Font): (left: number, right: number) => number {
  const gpos = font.tables.get("GPOS");
  if (!gpos) return () => 0;
  const { data } = font;
  const base = gpos.offset;
  const featureList = base + data.getUint16(base + 6);
  const lookupList = base + data.getUint16(base + 8);
  const lookups = new Set<number>();
  const features = data.getUint16(featureList);
  for (let i = 0; i < features; i++) {
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((k) => data.getUint8(featureList + 2 + i * 6 + k)));
    if (tag !== "kern") continue;
    const feature = featureList + data.getUint16(featureList + 6 + i * 6);
    const n = data.getUint16(feature + 2);
    for (let k = 0; k < n; k++) lookups.add(data.getUint16(feature + 4 + k * 2));
  }
  /** x advance of the first value record, given the formats. */
  const valueSize = (format: number) => {
    let size = 0;
    for (let bit = 0; bit < 8; bit++) if (format & (1 << bit)) size += 2;
    return size;
  };
  const xAdvanceAt = (format: number, at: number) => {
    if (!(format & 4)) return 0;
    let skip = 0;
    for (let bit = 0; bit < 2; bit++) if (format & (1 << bit)) skip += 2;
    return data.getInt16(at + skip);
  };
  const subtables: { at: number }[] = [];
  for (const index of lookups) {
    const lookup = lookupList + data.getUint16(lookupList + 2 + index * 2);
    let type = data.getUint16(lookup);
    const count = data.getUint16(lookup + 4);
    for (let k = 0; k < count; k++) {
      let sub = lookup + data.getUint16(lookup + 6 + k * 2);
      if (type === 9) {
        type = data.getUint16(sub + 2);
        sub += data.getUint32(sub + 4);
      }
      if (type === 2) subtables.push({ at: sub });
    }
  }
  return (left, right) => {
    let total = 0;
    for (const { at } of subtables) {
      const format = data.getUint16(at);
      const coverage = coverageOf(data, at + data.getUint16(at + 2));
      const first = coverage.get(left);
      if (first === undefined) continue;
      const f1 = data.getUint16(at + 4);
      const f2 = data.getUint16(at + 6);
      if (format === 1) {
        const set = at + data.getUint16(at + 10 + first * 2);
        const pairs = data.getUint16(set);
        const record = 2 + valueSize(f2);
        const step = record + valueSize(f1);
        for (let p = 0; p < pairs; p++) {
          const row = set + 2 + p * step;
          if (data.getUint16(row) === right) {
            total += xAdvanceAt(f1, row + 2);
            break;
          }
        }
      } else {
        const class1 = classOf(data, at + data.getUint16(at + 8), left);
        const class2 = classOf(data, at + data.getUint16(at + 10), right);
        const c2count = data.getUint16(at + 14);
        const step = valueSize(f1) + valueSize(f2);
        total += xAdvanceAt(f1, at + 16 + (class1 * c2count + class2) * step);
      }
      // the first lookup that has the pair decides, as a shaper's kern lookup does
      if (total !== 0) break;
    }
    return total;
  };
}

/** The leftmost and rightmost ink of a glyph at `rows` heights between 0 and 1 cap height (null where a row has none), from its flattened contours. */
function profileOf(contours: number[][], rows: number): { left: (number | null)[]; right: (number | null)[] } {
  const left: (number | null)[] = [];
  const right: (number | null)[] = [];
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) / rows;
    const xs: number[] = [];
    for (const ring of contours) {
      const n = ring.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const [x1, y1, x2, y2] = [ring[i * 2], ring[i * 2 + 1], ring[j * 2], ring[j * 2 + 1]];
        if (y1 > y !== y2 > y) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    left.push(xs.length ? Math.min(...xs) : null);
    right.push(xs.length ? Math.max(...xs) : null);
  }
  return { left, right };
}

/**
 * Optical kerning for the pairs the font does not kern: the average gap between two letters over the height of a capital (a missing ink counts as a depth of 0.4), against the gap between two straight stems; a pair
 * with a wider gap than that, as a diagonal or a round letter beside a stem leaves, is drawn in by a share of the difference, never past a quarter of a cap.
 */
function opticalKerns(glyphs: [string, number, number[][]][], fixed: ReadonlySet<string>): [string, number][] {
  const ROWS = 48;
  const DEPTH = 0.4;
  const info = new Map(glyphs.map(([ch, advance, contours]) => [ch, { advance, ...profileOf(contours, ROWS) }]));
  const gap = (a: string, b: string): number => {
    const l = info.get(a);
    const r = info.get(b);
    if (!l || !r) return 0;
    let sum = 0;
    for (let row = 0; row < ROWS; row++) {
      const edge = l.right[row];
      const next = r.left[row];
      sum += edge === null || next === null ? DEPTH : Math.min(DEPTH, Math.max(0, l.advance - edge + next));
    }
    return sum / ROWS;
  };
  const reference = gap("H", "H");
  const out: [string, number][] = [];
  // only where a letter whose right side is open (a diagonal, an arm, a leg) meets one whose left side is: the pairs a type designer kerns by hand
  const OPEN_RIGHT = "AVWYTLPFRKX7";
  const OPEN_LEFT = "AVWYTXK7";
  for (const a of OPEN_RIGHT)
    for (const b of OPEN_LEFT) {
      if (fixed.has(a + b)) continue;
      const extra = gap(a, b) - reference;
      if (extra <= 0.125) continue;
      const pull = Math.min(0.25, extra * 0.6);
      out.push([a + b, -Math.round(pull * KEEP) / KEEP]);
    }
  return out;
}

function advanceOf(font: Font, index: number): number {
  const hhea = font.tables.get("hhea");
  const hmtx = font.tables.get("hmtx");
  if (!hhea || !hmtx) return font.unitsPerEm;
  const metrics = font.data.getUint16(hhea.offset + 34);
  return font.data.getUint16(hmtx.offset + Math.min(index, metrics - 1) * 4);
}

function capHeight(font: Font): number {
  const os2 = font.tables.get("OS/2");
  if (os2 && font.data.getUint16(os2.offset) >= 2) {
    const h = font.data.getInt16(os2.offset + 88);
    if (h > 0) return h;
  }
  const top = Math.max(...outlineOf(font, glyphOf(font, "H".charCodeAt(0))).flat().map((p) => p.y));
  return top;
}

function latinFace(path: string, optical: boolean): { cap: number; glyphs: [string, number, number[][]][]; kern: [string, number][] } {
  const font = open(path);
  const cap = capHeight(font);
  const scale = 1 / cap;
  const glyphs: [string, number, number[][]][] = [];
  for (const ch of LATIN_SET) {
    const index = glyphOf(font, ch.codePointAt(0) ?? 0);
    if (!index && ch !== " ") {
      // a sign this face lacks is left out; the letters and figures must all be there
      if (/[A-Z0-9-]/.test(ch)) throw new Error(`${path}: no glyph for ${ch}`);
      continue;
    }
    const contours = index ? outlineOf(font, index).map((c) => flatten(c, scale, 0)).filter((c) => c.length >= 6) : [];
    glyphs.push([ch, Math.round(advanceOf(font, index) * scale * KEEP) / KEEP, contours]);
  }
  const kern = kerner(font);
  const pairs: [string, number][] = [];
  for (const a of LATIN_SET) for (const b of LATIN_SET) {
    const value = kern(glyphOf(font, a.codePointAt(0) ?? 0), glyphOf(font, b.codePointAt(0) ?? 0));
    if (value) pairs.push([a + b, Math.round(value * scale * KEEP) / KEEP]);
  }
  const extra = optical ? opticalKerns(glyphs, new Set(pairs.map(([pair]) => pair))) : [];
  return { cap, glyphs, kern: [...pairs, ...extra] };
}

/** The kanji and katakana, drawn about 1.15 cap heights tall and centred on the Latin capitals' height band. */
function cjkFace(path: string): [string, number, number[][]][] {
  const font = open(path);
  const raw = [...CJK].map((ch) => {
    const index = glyphOf(font, ch.codePointAt(0) ?? 0);
    if (!index) throw new Error(`${path}: no glyph for ${ch}`);
    return { ch, index, contours: outlineOf(font, index) };
  });
  const ys = raw.flatMap((g) => g.contours.flat().map((p) => p.y));
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const scale = 1.15 / (high - low);
  const shift = ((low + high) / 2) * scale - 0.5;
  return raw.map((g) => [g.ch, Math.round(advanceOf(font, g.index) * scale * KEEP) / KEEP, g.contours.map((c) => flatten(c, scale, shift)).filter((c) => c.length >= 6)]);
}

const here = dirname(fileURLToPath(import.meta.url));
// node scripts/make-glyphs.ts --face <font.ttf> <EXPORT_NAME> prints one face, so a concept can be added without rebuilding the faces already shipped.
if (process.argv[2] === "--face") {
  const face = latinFace(process.argv[3], false);
  const name = process.argv[4];
  if (!face || !name) throw new Error("usage: node scripts/make-glyphs.ts --face <font.ttf> <EXPORT_NAME>");
  const rowOf = ([ch, advance, contours]: [string, number, number[][]]) => `  ${JSON.stringify(ch)}: [${advance}, [${contours.map((c) => `[${c.join(",")}]`).join(",")}]],`;
  process.stdout.write(`export const ${name}: Readonly<Record<string, GlyphData>> = {\n${face.glyphs.map(rowOf).join("\n")}\n};\nexport const ${name}_KERN: Readonly<Record<string, number>> = {\n${face.kern.map(([pair, v]) => `  ${JSON.stringify(pair)}: ${v},`).join("\n")}\n};\n`);
  process.exit(0);
}
const [latinPath, cjkPath, orbitronPath, oxaniumPath] = process.argv.slice(2);
if (!latinPath || !cjkPath) throw new Error("usage: node scripts/make-glyphs.ts <Michroma-Regular.ttf> <MPLUS1p-Bold.ttf> [<Orbitron-Bold.ttf> <Oxanium-ExtraBold.ttf>]");
const latin = latinFace(latinPath, true);
const orbitron = orbitronPath ? latinFace(orbitronPath, false) : null;
const oxanium = oxaniumPath ? latinFace(oxaniumPath, false) : null;
const cjk = cjkFace(cjkPath);

const row = ([ch, advance, contours]: [string, number, number[][]]) => `  ${JSON.stringify(ch)}: [${advance}, [${contours.map((c) => `[${c.join(",")}]`).join(",")}]],`;
const text = `// Letter outlines for the fleet's hull markings, in cap heights (1 is the height of a capital letter, y up, the baseline at 0). Made by \`node scripts/make-glyphs.ts\`; do not edit.
//
// Latin letters, figures and signs: Michroma, Copyright 2011 The Michroma Project Authors (https://github.com/googlefonts/Michroma-font), SIL Open Font License 1.1 (LICENSES/OFL-Michroma.txt).
// Kanji and katakana: M PLUS 1p Bold, Copyright 2016 The M+ Project Authors, SIL Open Font License 1.1 (LICENSES/OFL-MPLUS1p.txt).
// The outlines are cut out of the fonts and flattened to straight runs; the fonts' own files are not part of the package. Each entry is [advance, contours], a contour a flat list of x y numbers.
// Pure data: no imports.

/** A glyph: how far the pen moves, and its closed contours as flat lists of x, y in cap heights. */
export type GlyphData = readonly [advance: number, contours: readonly (readonly number[])[]];

/** The Latin face (Michroma). */
export const LATIN: Readonly<Record<string, GlyphData>> = {
${latin.glyphs.map(row).join("\n")}
};

/** Kerning for pairs of letters: the pair, and how far to move the second letter along, in cap heights. The font's own GPOS kern lookups (a handful of pairs), then optical kerning for the pairs it leaves: diagonals and rounds drawn in towards a stem's gap. */
export const KERN: Readonly<Record<string, number>> = {
${latin.kern.map(([pair, v]) => `  ${JSON.stringify(pair)}: ${v},`).join("\n")}
};

${orbitron ? `/** A second Latin face for concepts: Orbitron Bold, a geometric squared face. */
export const ORBITRON: Readonly<Record<string, GlyphData>> = {
${orbitron.glyphs.map(row).join("\n")}
};
/** Orbitron's own kerning, from its GPOS kern lookups. */
export const ORBITRON_KERN: Readonly<Record<string, number>> = {
${orbitron.kern.map(([pair, v]) => `  ${JSON.stringify(pair)}: ${v},`).join("\n")}
};
` : ""}${oxanium ? `/** A third Latin face for concepts: Oxanium ExtraBold, a squared technical face. */
export const OXANIUM: Readonly<Record<string, GlyphData>> = {
${oxanium.glyphs.map(row).join("\n")}
};
/** Oxanium Stencil's own kerning, from its GPOS kern lookups. */
export const OXANIUM_KERN: Readonly<Record<string, number>> = {
${oxanium.kern.map(([pair, v]) => `  ${JSON.stringify(pair)}: ${v},`).join("\n")}
};
` : ""}/** The kanji and katakana face (M PLUS 1p Bold). */
export const KANJI: Readonly<Record<string, GlyphData>> = {
${cjk.map(row).join("\n")}
};

/** The credit for each face, as NOTICE.md gives it. */
export const TYPEFACE_CREDITS = [
  "Michroma, Copyright 2011 The Michroma Project Authors (https://github.com/googlefonts/Michroma-font), SIL Open Font License 1.1",
  "M PLUS 1p Bold, Copyright 2016 The M+ Project Authors (https://github.com/google/fonts/tree/main/ofl/mplus1p), SIL Open Font License 1.1",
${orbitron ? '  "Orbitron Bold, Copyright (c) 2009, Matt McInerney, with Reserved Font Name Orbitron (https://github.com/theleagueof/orbitron), SIL Open Font License 1.1",\n' : ""}${oxanium ? '  "Oxanium ExtraBold, Copyright 2019 The Oxanium Project Authors (https://github.com/sevmeyer/oxanium), SIL Open Font License 1.1",\n' : ""}] as const;
`;
writeFileSync(join(here, "..", "src", "model", "fleet", "typeface.ts"), text);
console.log(`Michroma cap height ${latin.cap} units; ${latin.glyphs.length} Latin glyphs, ${cjk.length} kanji and katakana, ${(text.length / 1024).toFixed(0)} KB`);
