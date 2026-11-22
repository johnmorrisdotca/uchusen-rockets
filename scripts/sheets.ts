// Turns a flat panel that a model draws as thousands of separate cells into pictures. The cells lie in one plane, so looked at from above they are a pattern: each rectangle of them is drawn once into a small picture, and the part then holds one quad for each face of it. Pure: no files, no clock.
import { deflateSync } from "node:zlib";

/** One face of a rectangle of cells: where it lies along the axis the cells lie across, and its picture. */
export interface Face {
  height: number;
  /** The share of the picture's pixels some cell covered. */
  fill: number;
  /** The picture, an 8-bit RGB PNG. */
  png: Uint8Array;
}

/** One rectangle of cells, in the file's own units: its box on the two axes it spreads along, and a picture of each of its two faces, the one looking towards +across and the one looking away. */
export interface Sheet {
  /** Lowest and highest corner along the first axis, then the second. */
  box: readonly [number, number, number, number];
  width: number;
  rows: number;
  front: Face;
  back: Face;
}

export interface SheetOptions {
  /** The material names whose cells make a rectangle. */
  blanket: RegExp;
  /** Pixels a unit, on the picture. */
  perUnit: number;
  /** The axis the cells lie across: 0, 1 or 2. The picture spreads along the other two, in order. */
  across: number;
  /** How far a triangle may stand above or below the cells and still be drawn into the picture, in units. */
  reach: number;
}

export interface Baked {
  sheets: Sheet[];
  /** For each triangle, the number of the sheet that drew it, or -1 where it stands outside every sheet and is left to the mesh. */
  sheetOf: Int16Array;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

/**
 * An 8-bit RGB PNG, the same bytes every time.
 * @param width Pixels across.
 * @param rows Pixels down.
 * @param rgb The pixels, three bytes each, from the top left.
 * @returns The file's bytes.
 * @example
 * console.log(pngOf(1, 1, new Uint8Array([255, 0, 0])).length > 0);
 */
export function pngOf(width: number, rows: number, rgb: Uint8Array): Uint8Array {
  const chunk = (type: string, data: Uint8Array): Buffer => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "latin1");
    out.set(data, 8);
    let c = -1;
    for (let i = 4; i < 8 + data.length; i++) c = (CRC[(c ^ (out[i] as number)) & 255] as number) ^ (c >>> 8);
    out.writeUInt32BE((c ^ -1) >>> 0, 8 + data.length);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(rows, 4);
  head[8] = 8;
  head[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * rows);
  for (let y = 0; y < rows; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array(0))]));
}

/**
 * Draws a model's flat panels as pictures.
 * @param positions The triangles' corners, nine numbers a triangle.
 * @param normals The corners' normals, in the same order. A triangle is drawn only where it faces towards +`across` on the front picture and away on the back one.
 * @param material The index into `names` of each triangle's material.
 * @param names The material names.
 * @param colours Each material's colour as 8-bit sRGB, in the order of `names`.
 * @param options Which materials are the cells, the picture's density and the axis they lie across.
 * @returns The sheets, and which sheet drew each triangle.
 * @example
 * const flat = [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1];
 * const { sheets } = bakeSheets(flat, [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], [0, 0], ["solar_blue"], [[0, 0, 200]], { blanket: /^solar_/, perUnit: 8, across: 1, reach: 0.1 });
 * console.log(sheets.length, sheets[0].width);
 */
export function bakeSheets(positions: ArrayLike<number>, normals: ArrayLike<number>, material: ArrayLike<number>, names: readonly string[], colours: readonly (readonly number[])[], options: SheetOptions): Baked {
  const { across, perUnit, reach } = options;
  const [a, b] = [0, 1, 2].filter((k) => k !== across) as [number, number];
  const count = Math.floor(positions.length / 9);
  const isCell = names.map((name) => options.blanket.test(name));
  const centre = (t: number, k: number) => ((positions[t * 9 + k] as number) + (positions[t * 9 + 3 + k] as number) + (positions[t * 9 + 6 + k] as number)) / 3;
  // the cells' own thickness: the height range of the first blanket material that has any triangle
  let lo = Infinity;
  let hi = -Infinity;
  const used = new Set<number>(Array.from({ length: count }, (_, t) => material[t] as number));
  const first = names.findIndex((_, i) => isCell[i] && used.has(i));
  for (let t = 0; t < count; t++)
    if (material[t] === first) {
      lo = Math.min(lo, centre(t, across));
      hi = Math.max(hi, centre(t, across));
    }
  const inPlane = (t: number) => centre(t, across) >= lo - reach && centre(t, across) <= hi + reach;
  // a coarse mask of where cells are, grown by a pixel, so the thin gaps between one blanket's panels close and the wider gaps between blankets stay
  const grid = 40;
  let [minA, minB, maxA, maxB] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let t = 0; t < count; t++)
    if (isCell[material[t] as number] && inPlane(t)) {
      for (let c = 0; c < 3; c++) {
        minA = Math.min(minA, positions[t * 9 + c * 3 + a] as number);
        maxA = Math.max(maxA, positions[t * 9 + c * 3 + a] as number);
        minB = Math.min(minB, positions[t * 9 + c * 3 + b] as number);
        maxB = Math.max(maxB, positions[t * 9 + c * 3 + b] as number);
      }
    }
  const sheetOf = new Int16Array(count).fill(-1);
  if (!(maxA >= minA)) return { sheets: [], sheetOf };
  const [wide, tall] = [Math.ceil((maxA - minA) * grid) + 6, Math.ceil((maxB - minB) * grid) + 6];
  const mask = new Uint8Array(wide * tall);
  const cellAt = (t: number) => [Math.floor((centre(t, a) - minA) * grid) + 1, Math.floor((centre(t, b) - minB) * grid) + 1] as const;
  // every grid square a cell's box touches, and the ring round it
  for (let t = 0; t < count; t++)
    if (isCell[material[t] as number] && inPlane(t)) {
      const at = (k: number, from: number) => [0, 1, 2].map((c) => Math.floor(((positions[t * 9 + c * 3 + k] as number) - from) * grid) + 1);
      const [ga, gb] = [at(a, minA), at(b, minB)];
      for (let y = Math.min(...gb) - 1; y <= Math.max(...gb) + 1; y++) for (let x = Math.min(...ga) - 1; x <= Math.max(...ga) + 1; x++) mask[Math.min(tall - 1, Math.max(0, y)) * wide + Math.min(wide - 1, Math.max(0, x))] = 1;
    }
  const label = new Int32Array(wide * tall).fill(-1);
  let groups = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start] !== -1) continue;
    const stack = [start];
    label[start] = groups;
    while (stack.length) {
      const at = stack.pop() as number;
      for (const next of [at - 1, at + 1, at - wide, at + wide])
        if (next >= 0 && next < mask.length && mask[next] && label[next] === -1) {
          label[next] = groups;
          stack.push(next);
        }
    }
    groups++;
  }
  // each group's exact box, from the corners of its cells
  const boxes = Array.from({ length: groups }, () => [Infinity, Infinity, -Infinity, -Infinity]);
  for (let t = 0; t < count; t++) {
    if (!isCell[material[t] as number] || !inPlane(t)) continue;
    const [x, y] = cellAt(t);
    const g = label[y * wide + x] as number;
    const box = boxes[g] as number[];
    for (let c = 0; c < 3; c++) {
      box[0] = Math.min(box[0] as number, positions[t * 9 + c * 3 + a] as number);
      box[1] = Math.min(box[1] as number, positions[t * 9 + c * 3 + b] as number);
      box[2] = Math.max(box[2] as number, positions[t * 9 + c * 3 + a] as number);
      box[3] = Math.max(box[3] as number, positions[t * 9 + c * 3 + b] as number);
    }
  }
  // every triangle of the plane whose middle is inside a box belongs to that sheet
  const kept = boxes.map((box, g) => ({ box: box as [number, number, number, number], g })).filter(({ box }) => box[2] > box[0] && box[3] > box[1]);
  for (let t = 0; t < count; t++) {
    if (!inPlane(t)) continue;
    const [ca, cb] = [centre(t, a), centre(t, b)];
    const at = kept.findIndex(({ box }) => ca >= box[0] && ca <= box[2] && cb >= box[1] && cb <= box[3]);
    sheetOf[t] = at;
  }
  const sample = 4;
  const draw = (box: readonly number[], width: number, rows: number, side: 1 | -1): Face => {
    const [W, H] = [width * sample, rows * sample];
    const depth = new Float32Array(W * H).fill(-Infinity);
    const paint = new Uint8Array(W * H * 3);
    const seen = new Uint8Array(W * H);
    for (let t = 0; t < count; t++) {
      if (sheetOf[t] === -1 || kept[sheetOf[t] as number]?.box !== box) continue;
      if (side * ((normals[t * 9 + across] as number) + (normals[t * 9 + 3 + across] as number) + (normals[t * 9 + 6 + across] as number)) <= 0) continue;
      const corner = [0, 1, 2].map((c) => [(((positions[t * 9 + c * 3 + a] as number) - (box[0] as number)) / ((box[2] as number) - (box[0] as number))) * W, (((positions[t * 9 + c * 3 + b] as number) - (box[1] as number)) / ((box[3] as number) - (box[1] as number))) * H, side * (positions[t * 9 + c * 3 + across] as number)]) as [number[], number[], number[]];
      const colour = colours[material[t] as number] as readonly number[];
      const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = corner as unknown as [[number, number, number], [number, number, number], [number, number, number]];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-12) continue;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(H - 1, Math.ceil(Math.max(ay, by, cy))); y++)
        for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
          const [px, py] = [x + 0.5, y + 0.5];
          const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den;
          const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
          const l3 = 1 - l1 - l2;
          if (l1 < 0 || l2 < 0 || l3 < 0) continue;
          // the face nearest the viewer wins: the highest for the front, the lowest for the back
          const height = l1 * az + l2 * bz + l3 * cz;
          if (height > (depth[y * W + x] as number)) {
            depth[y * W + x] = height;
            paint.set(colour, (y * W + x) * 3);
            seen[y * W + x] = 1;
          }
        }
    }
    // a pixel no cell covers takes the mean colour of the ones that do
    const mean = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < W * H; i++)
      if (seen[i]) {
        for (let c = 0; c < 3; c++) mean[c] = (mean[c] as number) + (paint[i * 3 + c] as number);
        n++;
      }
    const out = new Uint8Array(width * rows * 3);
    let covered = 0;
    let total = 0;
    let heights = 0;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < width; x++) {
        const sum = [0, 0, 0];
        let hit = 0;
        for (let sy = 0; sy < sample; sy++)
          for (let sx = 0; sx < sample; sx++) {
            const i = Math.min(H - 1, y * sample + sy) * W + Math.min(W - 1, x * sample + sx);
            if (!seen[i]) continue;
            hit++;
            for (let c = 0; c < 3; c++) sum[c] = (sum[c] as number) + (paint[i * 3 + c] as number);
            heights += depth[i] as number;
            total++;
          }
        for (let c = 0; c < 3; c++) out[(y * width + x) * 3 + c] = Math.round(hit ? (sum[c] as number) / hit : n ? (mean[c] as number) / n : 128);
        if (hit === sample * sample) covered++;
      }
    return { height: total ? (side * heights) / total + 0 : 0, fill: covered / (width * rows), png: pngOf(width, rows, out) };
  };
  const sheets: Sheet[] = kept.map(({ box }) => {
    const width = Math.max(2, Math.ceil((box[2] - box[0]) * perUnit));
    const rows = Math.max(2, Math.ceil((box[3] - box[1]) * perUnit));
    return { box, width, rows, front: draw(box, width, rows, 1), back: draw(box, width, rows, -1) };
  });
  return { sheets, sheetOf };
}
