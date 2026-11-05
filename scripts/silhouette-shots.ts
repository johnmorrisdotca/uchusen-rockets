// Side and top of every silhouette: `node scripts/silhouette-shots.ts <folder>`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { meshOf } from "../src/model/pieces.ts";
import { SILHOUETTES } from "../src/model/fleet/drone/silhouettes.ts";

const out = resolve(process.argv[2] ?? "silhouettes");
mkdirSync(join(out, "glb"), { recursive: true });
const jobs: unknown[] = [];
for (const make of SILHOUETTES) {
  const shape = make();
  const file = join(out, "glb", `${shape.kind}-${shape.id}.glb`);
  writeFileSync(file, toGlb([{ name: shape.id, mesh: meshOf(shape.pieces), at: [0, 0, 0] }]).bytes);
  const eye = (name: string, at: [number, number, number], up: [number, number, number]) => ({
    name: `${shape.kind}-${shape.id}-${name}`,
    eye: at,
    target: [0, 0, 0] as [number, number, number],
    up,
    fov: 28,
    size: [640, 480] as [number, number],
    fill: 0.86,
    look: "painted" as const,
    shadow: 2,
  });
  jobs.push({ glb: file, shots: [eye("side", [2.4, 0.05, 0.2], [0, 0, 1]), eye("top", [0.05, 0.15, 2.6], [0, 1, 0])] });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(join(out, "jobs.json"));
