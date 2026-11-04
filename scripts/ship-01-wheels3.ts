// The wheel concepts of ISV Hanabusa, round three: `node scripts/ship-01-wheels3.ts <folder>` builds the .glb of W1, W3 and W4, their town cutaways and the inflatable module variant, and draws them with scripts/ship-01-render.ts.
// One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { cutaway, inflatableScene, LAYOUTS3, placeRadius, SPIN4, TOWN_PLACES } from "../src/model/fleet/ship-01/wheels3.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "wheels3");
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const write = (name: string, pieces: Piece[]): { file: string; centre: V3; size: number; min: V3; max: V3 } => {
  const start = performance.now();
  const mesh = meshOf(pieces);
  const took = Math.round(performance.now() - start);
  const file = join(out, "glb", `${name}.glb`);
  const glb = toGlb([{ name, mesh, at: [0, 0, 0] }]).bytes;
  writeFileSync(file, glb);
  const b = boundsOf(mesh);
  let triangles = 0;
  for (const faces of mesh.faces.values()) triangles += faces.indices.length / 3;
  console.log(name, "length", (b.max[1] - b.min[1]).toFixed(0), "width", (b.max[0] - b.min[0]).toFixed(0), "pieces", pieces.length, "triangles", triangles, "mesh ms", took, "glb MB", (glb.length / 1e6).toFixed(1));
  return { file, centre: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2], size: Math.max(b.max[1] - b.min[1], b.max[0] - b.min[0]), min: b.min as V3, max: b.max as V3 };
};
const jobs: unknown[] = [];
for (const layout of LAYOUTS3()) {
  const built = layout.pieces();
  const m = write(layout.id, built);
  const shot = (name: string, dir: V3, up: V3) => ({ name: `${layout.id}-${name}`, eye: [m.centre[0] + dir[0] * m.size, m.centre[1] + dir[1] * m.size, m.centre[2] + dir[2] * m.size], target: m.centre, up, size: [1800, 900], fill: 0.85, shadow: m.size * 0.6, shadowBias: 0.004, look: "painted" });
  // the lit frame looks at the wheels from low and aft, in the dark, with the LEDs strong
  const wheelY = layout.id === "w4" ? 405 : 405;
  const lit = { name: `${layout.id}-lit`, eye: [150, 405 + 250, 130], target: [0, 405, 0], up: [0, 0, 1], size: [1800, 900], fov: 40, shadow: 330, shadowBias: 0.004, look: "lit", glow: 3.4, sun: 0.1 };
  jobs.push({ glb: m.file, shots: [shot("three-quarter", [0.8, -0.9, 0.55], [0, 0, 1]), shot("side", [1, 0, 0], [0, 0, 1]), shot("front", [0.12, 1, 0.1], [0, 0, 1]), lit] });
  const rOut = layout.id === "w4" ? SPIN4.rings[2].rOut : 56;
  const depth = layout.id === "w4" ? SPIN4.rings[2].depth : 26;
  const c = write(`${layout.id}-cutaway`, cutaway(layout.id === "w3" ? "beads" : "ring", rOut, depth));
  const points = TOWN_PLACES.map((p) => ({ id: p.id, at: [placeRadius(p.id, rOut) * Math.sin((p.az * Math.PI) / 180), 0, placeRadius(p.id, rOut) * Math.cos((p.az * Math.PI) / 180)] as V3 }));
  // the camera stands inside the mouth of the cut ring and looks down the street, floors stacked above one another, the ground at the bottom of the picture
  const rad = (a: number): number => (a * Math.PI) / 180;
  const at = (azDeg: number, r: number, yy: number): V3 => [r * Math.sin(rad(azDeg)), yy, r * Math.cos(rad(azDeg))];
  const eye: V3 = at(14, rOut - 13, 4);
  const target: V3 = at(80, rOut - 13, -1);
  const up: V3 = [-Math.sin(rad(14)), 0, -Math.cos(rad(14))];
  const base = { eye, target, up, size: [1800, 900], fov: 66, shadow: rOut * 1.6, shadowBias: 0.004 };
  jobs.push({ glb: c.file, shots: [{ name: `${layout.id}-cutaway`, ...base, look: "painted", points }, { name: `${layout.id}-cutaway-lit`, ...base, look: "lit", glow: 3.4, sun: 0.1 }] });
}
const inf = write("inflatable", inflatableScene());
jobs.push({ glb: inf.file, shots: [{ name: "inflatable", eye: [58, 26, 34], target: [0, 15, 0], up: [0, 1, 0], size: [1800, 900], fov: 38, shadow: 60, look: "painted" }, { name: "inflatable-side", eye: [0, 14, 95], target: [0, 14, 0], up: [0, 1, 0], size: [1800, 800], fov: 36, shadow: 60, look: "painted" }] });
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
