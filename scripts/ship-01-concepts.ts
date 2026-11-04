// The three silhouette concepts of ISV Hanabusa from the real kit: `node scripts/ship-01-concepts.ts <folder>` builds a .glb for each and draws a side, a top and a three-quarter picture with scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { CONCEPTS } from "../src/model/fleet/ship-01/concepts.ts";
import { boundsOf, meshOf } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "concepts");
mkdirSync(join(out, "glb"), { recursive: true });
const jobs = CONCEPTS().map((c) => {
  const mesh = meshOf(c.pieces);
  const file = join(out, "glb", `${c.id}.glb`);
  writeFileSync(file, toGlb([{ name: c.id, mesh, at: [0, 0, 0] }]).bytes);
  const b = boundsOf(mesh);
  const centre = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] as [number, number, number];
  const len = b.max[1] - b.min[1];
  console.log(c.id, c.name, "length", len.toFixed(0), "beam", (b.max[0] - b.min[0]).toFixed(0), "height", (b.max[2] - b.min[2]).toFixed(0), "pieces", c.pieces.length);
  const shot = (name: string, dir: [number, number, number], up: [number, number, number]) => ({ name: `${c.id}-${name}`, eye: [centre[0] + dir[0] * len, centre[1] + dir[1] * len, centre[2] + dir[2] * len], target: centre, up, size: [1800, 900], fill: 0.8, shadow: len * 0.6, look: "painted" });
  return { glb: file, shots: [shot("side", [1, 0, 0], [0, 0, 1]), shot("top", [0, 0, 1], [-1, 0, 0]), shot("three-quarter", [0.8, -0.9, 0.55], [0, 0, 1])] };
});
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
