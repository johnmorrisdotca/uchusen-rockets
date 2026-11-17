// How much two renders differ: the share of pixels where any colour channel is more than `--tolerance` (default 8 of 255) apart. A plain PNG reader (8-bit, not interlaced) so no package is needed.
//
//   node scripts/render-diff.ts <before.png> <after.png> [--tolerance 8] [--max-share 0.002]
//
// Exits 1 when the share is over `--max-share`. Pure apart from reading the two files.
import { readFileSync } from "node:fs";
import process from "node:process";
import { inflateSync } from "node:zlib";

export interface Raster {
  width: number;
  height: number;
  /** RGBA, four bytes a pixel. */
  data: Uint8Array;
}

/** Reads an 8-bit, non-interlaced PNG of colour type 2 (RGB), 6 (RGBA), 0 (grey) or 4 (grey and alpha). */
export function readPng(bytes: Uint8Array): Raster {
  const buf = Buffer.from(bytes);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let at = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  const parts: Buffer[] = [];
  while (at < buf.length) {
    const length = buf.readUInt32BE(at);
    const kind = buf.toString("latin1", at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + length);
    if (kind === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      type = body[9];
      if (body[8] !== 8 || body[12] !== 0) throw new Error("only 8-bit, non-interlaced PNG");
    } else if (kind === "IDAT") parts.push(body);
    at += 12 + length;
  }
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (!channels) throw new Error(`PNG colour type ${type} is not read`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = (line[i] + add) & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = x * channels;
      if (channels >= 3) [out[o], out[o + 1], out[o + 2], out[o + 3]] = [line[s], line[s + 1], line[s + 2], channels === 4 ? line[s + 3] : 255];
      else [out[o], out[o + 1], out[o + 2], out[o + 3]] = [line[s], line[s], line[s], channels === 2 ? line[s + 1] : 255];
    }
    prev = line;
  }
  return { width, height, data: out };
}

/** The share of pixels (0 to 1) where a channel differs by more than `tolerance`. Sizes must match. */
export function differing(a: Raster, b: Raster, tolerance = 8): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`sizes differ: ${a.width}x${a.height} against ${b.width}x${b.height}`);
  let count = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) > tolerance || Math.abs(a.data[i + 1] - b.data[i + 1]) > tolerance || Math.abs(a.data[i + 2] - b.data[i + 2]) > tolerance) count++;
  }
  return count / (a.width * a.height);
}

if (process.argv[1]?.endsWith("render-diff.ts")) {
  const args = process.argv.slice(2);
  const flag = (name: string, fallback: number) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback);
  const files = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
  const share = differing(readPng(readFileSync(files[0])), readPng(readFileSync(files[1])), flag("--tolerance", 8));
  const max = flag("--max-share", 0.002);
  console.log(`${(share * 100).toFixed(4)} per cent of pixels differ (limit ${(max * 100).toFixed(2)})`);
  process.exit(share > max ? 1 : 0);
}
