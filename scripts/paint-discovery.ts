// The Smithsonian's scan of Discovery with its marks painted out, by hand and never by the build: its picture is cut into thousands of islands, so a mark is found by where it stands on the orbiter, not where it lies in the picture. Each texel a triangle covers is taken back to the orbiter's surface, and one inside a box here on a surface facing that way takes the box's own paint colour. Needs ffmpeg.
//
//   UCHUSEN_MODEL_SOURCES=<folder> node scripts/paint-discovery.ts
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const FOLDER = "shuttle-discovery-smithsonian";
const sources = process.env.UCHUSEN_MODEL_SOURCES;
if (!sources) throw new Error("Say where the source models are: UCHUSEN_MODEL_SOURCES=<folder>");

interface Mark {
  name: string;
  /** Inside this box, in the file's units. */
  x: readonly [number, number];
  y: readonly [number, number];
  z: readonly [number, number];
  /** The way its surface faces. */
  face: readonly [number, number, number];
}

// nose towards +z, top towards +y. Read from flat views of the scan
const MARKS: readonly Mark[] = [
  { name: "flag and name, wing", x: [-8, -3.5], y: [-5, 3], z: [-9.8, -6.9], face: [0, 1, 0] },
  { name: "agency mark, wing", x: [4, 7.2], y: [-5, 3], z: [-9.8, -6.8], face: [0, 1, 0] },
  { name: "agency mark, country and flag, left", x: [-4, 0], y: [-3.9, -1.9], z: [-9.7, -0.2], face: [-1, 0, 0] },
  { name: "agency mark, country and flag, right", x: [0, 4], y: [-3.9, -1.9], z: [-9.7, -0.2], face: [1, 0, 0] },
  { name: "name, left", x: [-4, 0], y: [-1, 0.1], z: [9.9, 12.8], face: [-1, 0, 0] },
  { name: "name, right", x: [0, 4], y: [-1, 0.1], z: [9.9, 12.8], face: [1, 0, 0] },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const file = join(sources, FOLDER, "Orbiter_Space_Shuttle_OV-103_Discovery-150k-4096.glb");
const doc = await io.read(file);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const position = prim.getAttribute("POSITION")?.getArray() as Float32Array;
const uv = prim.getAttribute("TEXCOORD_0")?.getArray() as Float32Array;
const index = prim.getIndices()?.getArray() as Uint32Array;
const texture = prim.getMaterial()?.getBaseColorTexture();
if (!texture) throw new Error("no picture");
const SIZE = 4096;
const scratch = mkdtempSync(join(tmpdir(), "paint-"));
const inFile = join(scratch, "in.jpg");
writeFileSync(inFile, texture.getImage() as Uint8Array);
const rawFile = join(scratch, "in.rgb");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", inFile, "-f", "rawvideo", "-pix_fmt", "rgb24", rawFile]);
const pixels = readFileSync(rawFile);

/** Calls back for every texel of every triangle inside a mark's box. */
function eachTexel(mark: Mark, visit: (offset: number) => void): void {
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    const p = (i: number, k: number) => position[i * 3 + k];
    const ux = p(b, 0) - p(a, 0), uy = p(b, 1) - p(a, 1), uz = p(b, 2) - p(a, 2);
    const vx = p(c, 0) - p(a, 0), vy = p(c, 1) - p(a, 1), vz = p(c, 2) - p(a, 2);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    if ((nx * mark.face[0] + ny * mark.face[1] + nz * mark.face[2]) / l < 0.25) continue;
    const hits = (k: number, range: readonly [number, number]) => Math.max(p(a, k), p(b, k), p(c, k)) >= range[0] && Math.min(p(a, k), p(b, k), p(c, k)) <= range[1];
    if (!hits(0, mark.x) || !hits(1, mark.y) || !hits(2, mark.z)) continue;
    const tx = [uv[a * 2] * SIZE, uv[b * 2] * SIZE, uv[c * 2] * SIZE];
    const ty = [uv[a * 2 + 1] * SIZE, uv[b * 2 + 1] * SIZE, uv[c * 2 + 1] * SIZE];
    const d = (ty[1] - ty[2]) * (tx[0] - tx[2]) + (tx[2] - tx[1]) * (ty[0] - ty[2]);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = Math.max(0, Math.floor(Math.min(...ty)) - 1); y <= Math.min(SIZE - 1, Math.ceil(Math.max(...ty)) + 1); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...tx)) - 1); x <= Math.min(SIZE - 1, Math.ceil(Math.max(...tx)) + 1); x++) {
        const w0 = ((ty[1] - ty[2]) * (x - tx[2]) + (tx[2] - tx[1]) * (y - ty[2])) / d;
        const w1 = ((ty[2] - ty[0]) * (x - tx[2]) + (tx[0] - tx[2]) * (y - ty[2])) / d;
        const w2 = 1 - w0 - w1;
        // a little past the edge, so no thread of a mark stays on an island's rim
        if (w0 < -0.15 || w1 < -0.15 || w2 < -0.15) continue;
        const [wx, wy, wz] = [0, 1, 2].map((k) => w0 * p(a, k) + w1 * p(b, k) + w2 * p(c, k));
        if (wx < mark.x[0] || wx > mark.x[1] || wy < mark.y[0] || wy > mark.y[1] || wz < mark.z[0] || wz > mark.z[1]) continue;
        visit((y * SIZE + x) * 3);
      }
  }
}

for (const mark of MARKS) {
  const bright: number[][] = [];
  eachTexel(mark, (o) => {
    if (pixels[o] + pixels[o + 1] + pixels[o + 2] > 630 && Math.abs(pixels[o] - pixels[o + 2]) < 24) bright.push([pixels[o], pixels[o + 1], pixels[o + 2]]);
  });
  const paint = [0, 1, 2].map((k) => Math.round(bright.reduce((sum, c) => sum + c[k], 0) / Math.max(1, bright.length)));
  let count = 0;
  eachTexel(mark, (o) => {
    pixels[o] = paint[0];
    pixels[o + 1] = paint[1];
    pixels[o + 2] = paint[2];
    count++;
  });
  console.log(`${mark.name}: ${count} texels to ${paint.join()}`);
}

const outRaw = join(scratch, "out.rgb");
writeFileSync(outRaw, pixels);
const outJpg = join(scratch, "out.jpg");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${SIZE}x${SIZE}`, "-i", outRaw, "-q:v", "3", outJpg]);
texture.setImage(new Uint8Array(readFileSync(outJpg)));
doc.getRoot().getAsset().extras = {
  title: "Orbiter, Space Shuttle, OV-103, Discovery",
  author: "Smithsonian Institution, National Air and Space Museum",
  license: "CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)",
  source: "https://3d.si.edu/object/3d/orbiter-space-shuttle-ov-103-discovery:d8c636ce-4ebc-11ea-b77f-2e728ce88125",
};
await io.write(join(sources, FOLDER, "discovery-marks-painted-out.glb"), doc);
rmSync(scratch, { recursive: true, force: true });
console.log("written");
