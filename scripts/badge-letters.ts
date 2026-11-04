// The fleet badges' lettering: a bold, wide, chamfered stroke font of our own, drawn on a grid 12 units tall, so a badge carries its words as paths and never needs a font. `lettering` gives the `d` of one path to stroke
// (square caps, mitred joins); the badges in src/data/fleet/badges/ hold the result. Run it to print one:
//   node scripts/badge-letters.ts "SPX-207" 100 270 12 [anchor: start|middle|end] [stroke width, in the same units]
import { fileURLToPath } from "node:url";

type Point = readonly [number, number];
type Stroke = readonly Point[];

const GRID = 12;
const nine: Stroke = [[1, 12], [5.5, 12], [8, 9.5], [8, 2.5], [5.5, 0], [2.5, 0], [0, 2.5], [0, 4.5], [2.5, 6.5], [8, 6.5]];
const six: Stroke = nine.map(([x, y]) => [8 - x, 12 - y] as Point);

/** Each glyph: its strokes on a grid 12 units tall, and its width. */
const GLYPHS: Record<string, { width: number; strokes: Stroke[] }> = {
  A: { width: 8, strokes: [[[0, 12], [0, 3.5], [3.5, 0], [4.5, 0], [8, 3.5], [8, 12]], [[0, 7], [8, 7]]] },
  B: { width: 8, strokes: [[[0, 12], [0, 0], [5.5, 0], [7.5, 1.5], [7.5, 4.5], [5.5, 6], [0, 6]], [[5.5, 6], [6.5, 6], [8, 7.5], [8, 10.5], [6, 12], [0, 12]]] },
  E: { width: 8, strokes: [[[8, 0], [0, 0], [0, 12], [8, 12]], [[0, 6], [6, 6]]] },
  H: { width: 8, strokes: [[[0, 0], [0, 12]], [[8, 0], [8, 12]], [[0, 6], [8, 6]]] },
  I: { width: 0, strokes: [[[0, 0], [0, 12]]] },
  K: { width: 8, strokes: [[[0, 0], [0, 12]], [[8, 0], [0, 7]], [[2.5, 5], [8, 12]]] },
  M: { width: 9, strokes: [[[0, 12], [0, 0], [4.5, 6], [9, 0], [9, 12]]] },
  N: { width: 8, strokes: [[[0, 12], [0, 0], [8, 12], [8, 0]]] },
  O: { width: 8, strokes: [[[2.5, 0], [5.5, 0], [8, 2.5], [8, 9.5], [5.5, 12], [2.5, 12], [0, 9.5], [0, 2.5], [2.5, 0]]] },
  P: { width: 8, strokes: [[[0, 12], [0, 0], [5.5, 0], [8, 2.5], [8, 4.5], [5.5, 7], [0, 7]]] },
  R: { width: 8, strokes: [[[0, 12], [0, 0], [5.5, 0], [8, 2.5], [8, 4.5], [5.5, 7], [0, 7]], [[4, 7], [8, 12]]] },
  S: { width: 8, strokes: [[[8, 2.5], [5.5, 0], [2.5, 0], [0, 2.5], [0, 4], [2, 6], [6, 6], [8, 8], [8, 9.5], [5.5, 12], [2.5, 12], [0, 9.5]]] },
  T: { width: 8, strokes: [[[0, 0], [8, 0]], [[4, 0], [4, 12]]] },
  U: { width: 8, strokes: [[[0, 0], [0, 9.5], [2.5, 12], [5.5, 12], [8, 9.5], [8, 0]]] },
  X: { width: 8, strokes: [[[0, 0], [8, 12]], [[8, 0], [0, 12]]] },
  Y: { width: 8, strokes: [[[0, 0], [4, 6], [8, 0]], [[4, 6], [4, 12]]] },
  "0": { width: 8, strokes: [[[2.5, 0], [5.5, 0], [8, 2.5], [8, 9.5], [5.5, 12], [2.5, 12], [0, 9.5], [0, 2.5], [2.5, 0]], [[2, 10], [6, 2]]] },
  "1": { width: 8, strokes: [[[1.5, 2.5], [4, 0], [4, 12]], [[1.5, 12], [6.5, 12]]] },
  "2": { width: 8, strokes: [[[0, 2.5], [2.5, 0], [5.5, 0], [8, 2.5], [8, 4.5], [0, 12], [8, 12]]] },
  "3": { width: 8, strokes: [[[0, 0], [8, 0], [4.5, 5]], [[3, 5.5], [5.5, 5.5], [8, 7.5], [8, 9.5], [5.5, 12], [2.5, 12], [0, 9.5]]] },
  "4": { width: 8, strokes: [[[6, 12], [6, 0], [0, 8], [8, 8]]] },
  "5": { width: 8, strokes: [[[8, 0], [0, 0], [0, 5.5], [5.5, 5.5], [8, 7.5], [8, 9.5], [5.5, 12], [2.5, 12], [0, 9.5]]] },
  "6": { width: 8, strokes: [six] },
  "7": { width: 8, strokes: [[[0, 0], [8, 0], [3, 12]]] },
  "8": {
    width: 8,
    strokes: [
      [[2, 0], [6, 0], [8, 1.6], [8, 4.4], [6, 6.2], [2, 6.2], [0, 4.4], [0, 1.6], [2, 0]],
      [[2, 5.8], [6, 5.8], [8, 7.6], [8, 10.4], [6, 12], [2, 12], [0, 10.4], [0, 7.6], [2, 5.8]],
    ],
  },
  "9": { width: 8, strokes: [nine] },
  "-": { width: 5, strokes: [[[0, 6], [5, 6]]] },
  " ": { width: 4, strokes: [] },
};

export interface Lettering {
  /** The `d` of one path: stroke it, never fill it. */
  d: string;
  /** A line width that suits the height, in the same units. */
  width: number;
}

/**
 * The path of some capital letters, digits and hyphens.
 *
 * @param text What to write.
 * @param at Where the top of the letters is (`y`), their height, and which end of the line `x` is (the left by default).
 */
export function lettering(text: string, at: { x: number; y: number; height: number; anchor?: "start" | "middle" | "end" }): Lettering {
  const scale = at.height / GRID;
  const gap = 4;
  const glyphs = [...text.toUpperCase()].map((character) => {
    const glyph = GLYPHS[character];
    if (!glyph) throw new Error(`no letter ${character}`);
    return glyph;
  });
  const total = glyphs.reduce((sum, glyph) => sum + glyph.width, 0) + gap * (glyphs.length - 1);
  const start = at.x - (at.anchor === "end" ? total * scale : at.anchor === "middle" ? (total * scale) / 2 : 0);
  let cursor = 0;
  const parts: string[] = [];
  for (const glyph of glyphs) {
    for (const stroke of glyph.strokes) parts.push(stroke.map(([x, y], i) => `${i ? "L" : "M"}${Number((start + (cursor + x) * scale).toFixed(1))} ${Number((at.y + y * scale).toFixed(1))}`).join(""));
    cursor += glyph.width + gap;
  }
  return { d: parts.join(""), width: Number((at.height * 0.17).toFixed(1)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [text = "SPX", x = "0", y = "0", height = "12", anchor = "start", width] = process.argv.slice(2);
  const made = lettering(text, { x: Number(x), y: Number(y), height: Number(height), anchor: anchor as "start" | "middle" | "end" });
  console.log(`<path d="${made.d}" fill="none" stroke-width="${width ?? made.width}" stroke-linecap="square" stroke-linejoin="miter"/>`);
}
