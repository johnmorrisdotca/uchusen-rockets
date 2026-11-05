// W4, the stepped rings, round 3b: `node scripts/ship-01-wheels4.ts <folder> [aft]` builds the ship (smallest ring at the bow, or `aft` for the other order), the two cutaways (the living ring and the garden ring's hydroponic terraces) and draws them with
// scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { cutaway4, rings, ship4, TOWN4, type Order } from "../src/model/fleet/ship-01/rings.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "wheels4");
const order: Order = process.argv[3] === "aft" ? "aft" : "bow";
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const write = (name: string, pieces: Piece[]): { file: string; centre: V3; size: number } => {
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
  return { file, centre: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2], size: Math.max(b.max[1] - b.min[1], b.max[0] - b.min[0]) };
};
const rad = (a: number): number => (a * Math.PI) / 180;
const at = (az: number, r: number, y: number): V3 => [r * Math.sin(rad(az)), y, r * Math.cos(rad(az))];
const jobs: unknown[] = [];

const only = process.argv[4] === "cutaways";
const m = write(`w4-${order}`, only ? [] : ship4(order));
const ys = rings(order).map((r) => r.y);
const ringsMid: V3 = [0, ys.reduce((a, b) => a + b, 0) / ys.length, 0];
const frame = (name: string, dir: V3, up: V3, extra: Record<string, unknown> = {}) => ({ name, eye: [m.centre[0] + dir[0] * m.size, m.centre[1] + dir[1] * m.size, m.centre[2] + dir[2] * m.size], target: m.centre, up, size: [1800, 900], fill: 0.85, shadow: m.size * 0.6, shadowBias: 0.004, look: "painted", ...extra });
if (!only) jobs.push({ glb: m.file, shots: [
  // the hero: from the bow side, the three glazed rings leading and the industrial wheel behind, the sun ahead
  frame(`w4-${order}-hero`, [0.9, 0.95, 0.5], [0, 0, 1], { sunDir: [0.35, 1, 0.45] }),
  frame(`w4-${order}-three-quarter`, [0.8, -0.9, 0.55], [0, 0, 1]),
  frame(`w4-${order}-side`, [1, 0, 0], [0, 0, 1], { sunDir: [0.2, 1, 0.5] }),
  frame(`w4-${order}-front`, [0.1, 1, 0.08], [0, 0, 1], { sunDir: [0.3, 1, 0.4] }),
  { name: `w4-${order}-lit`, eye: [190, ringsMid[1] + 230, 120], target: ringsMid, up: [0, 0, 1], size: [1800, 900], fov: 40, shadow: 330, shadowBias: 0.004, look: "lit", glow: 3.4, sun: 0.08 },
  // the rings from close, in the sun, to see the terraces through the glass
  { name: `w4-${order}-close`, eye: [140, ringsMid[1] + 150, 90], target: [0, ringsMid[1], 20], up: [0, 0, 1], size: [1800, 900], fov: 34, shadow: 260, shadowBias: 0.004, look: "painted", sunDir: [0.3, 1, 0.5] },
  { name: `w4-${order}-close-lit`, eye: [140, ringsMid[1] + 150, 90], target: [0, ringsMid[1], 20], up: [0, 0, 1], size: [1800, 900], fov: 34, shadow: 260, shadowBias: 0.004, look: "lit", glow: 3.4, sun: 0.08 },
] });

for (const use of order === "aft" ? [] : (["living", "hydro"] as const)) {
  const ring = rings().find((r) => r.use === use);
  if (!ring) continue;
  const c = write(`w4-cut-${use}`, cutaway4(use));
  const rg = ring.rOut - 1.5;
  const eye = at(61, rg - 3.4, 0);
  const target = at(128, rg - 11, 0.4);
  const up: V3 = [-Math.sin(rad(61)), 0, -Math.cos(rad(61))];
  const sunDir: V3 = [-Math.sin(rad(61)), 0.35, -Math.cos(rad(61))];
  const points = TOWN4.filter((t) => t.side !== 0).map((t) => ({ id: t.id, at: at(t.az, rg - 3.2 * t.step - 1.5, t.side * (4.72 + 2.36 * (t.step - 1) + 1.2)) }));
  const base = { eye, target, up, size: [1800, 900], fov: 78, shadow: 150, shadowBias: 0.004 };
  jobs.push({ glb: c.file, shots: [{ name: `w4-cut-${use}`, ...base, look: "painted", background: "#4a78b8", sunDir, ...(use === "living" ? { points } : {}) }, { name: `w4-cut-${use}-lit`, ...base, look: "lit", glow: 3.4, sun: 0.08 }] });
}
if (order === "aft") for (const j of jobs as { shots: { name: string }[] }[]) j.shots = j.shots.filter((one) => one.name.endsWith("-hero"));
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
