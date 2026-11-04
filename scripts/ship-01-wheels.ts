// The three wheel-layout concepts of ISV Hanabusa from the real kit: `node scripts/ship-01-wheels.ts <folder>` builds a .glb for each and draws side, top, front, three-quarter and lit pictures with scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { LAYOUTS } from "../src/model/fleet/ship-01/wheels.ts";
import { boundsOf, meshOf } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "wheels");
mkdirSync(join(out, "glb"), { recursive: true });
const jobs = LAYOUTS().map((c) => {
  const start = performance.now();
  const pieces = c.pieces();
  const mesh = meshOf(pieces);
  const took = Math.round(performance.now() - start);
  const file = join(out, "glb", `${c.id}.glb`);
  const glb = toGlb([{ name: c.id, mesh, at: [0, 0, 0] }]).bytes;
  writeFileSync(file, glb);
  const b = boundsOf(mesh);
  const centre = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] as [number, number, number];
  const len = Math.max(b.max[1] - b.min[1], b.max[0] - b.min[0]);
  let triangles = 0;
  for (const faces of mesh.faces.values()) triangles += faces.indices.length / 3;
  console.log(c.id, c.name, "length", (b.max[1] - b.min[1]).toFixed(0), "width", (b.max[0] - b.min[0]).toFixed(0), "pieces", pieces.length, "triangles", triangles, "build ms", took, "glb MB", (glb.length / 1e6).toFixed(1));
  const shot = (name: string, dir: [number, number, number], up: [number, number, number], look: "painted" | "lit" = "painted") => ({ name: `${c.id}-${name}`, eye: [centre[0] + dir[0] * len, centre[1] + dir[1] * len, centre[2] + dir[2] * len], target: centre, up, size: [1800, 900], fill: 0.85, shadow: len * 0.6, shadowBias: 0.004, look });
  return { glb: file, shots: [shot("side", [1, 0, 0], [0, 0, 1]), shot("top", [0, 0, 1], [-1, 0, 0]), shot("front", [0.15, 1, 0.1], [0, 0, 1]), shot("three-quarter", [0.8, -0.9, 0.55], [0, 0, 1]), shot("lit", [1, -0.45, 0.25], [0, 0, 1], "lit")] };
});
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
