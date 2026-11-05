// Pictures of the three construction machines: `node scripts/drone-shots.ts <folder>` writes a .glb and a jobs file. Draw them with scripts/concept-render.ts on a port in 7940-7949.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { DRONE_CONCEPTS } from "../src/model/fleet/drone/concepts.ts";
import { meshOf } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "drone");
mkdirSync(join(out, "glb"), { recursive: true });

const jobs: unknown[] = [];
for (const make of DRONE_CONCEPTS) {
  const concept = make();
  const file = join(out, "glb", `${concept.id}.glb`);
  writeFileSync(file, toGlb([{ name: concept.id, mesh: meshOf(concept.pieces), at: [0, 0, 0] }]).bytes);
  const eye = (name: string, at: [number, number, number], up: [number, number, number] = [0, 0, 1]) => ({
    name: `${concept.id}-${name}`,
    eye: at,
    target: [0, 0, 0] as [number, number, number],
    up,
    fov: 32,
    size: [1200, 900] as [number, number],
    fill: 0.82,
    look: "painted" as const,
    shadow: 4,
  });
  jobs.push({
    glb: file,
    shots: [
      eye("quarter", [1.6, 0.7, 1.4]),
      eye("side", [2.2, 0.15, 0.15]),
      eye("above", [0.2, 0.4, 2.2], [0, 1, 0]),
      { ...eye("lit", [1.5, 0.9, 1.2]), look: "lit", sun: 0.12, glow: 2.4 },
    ],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(join(out, "jobs.json"));
