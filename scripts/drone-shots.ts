// Pictures of the six detailed machines, and of each one working: the beam on, holding a part. The arms are shown latched to a truss. `node scripts/drone-shots.ts <folder>`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { tractorBeam } from "../src/beam.ts";
import { toGlb } from "../src/build/glb.ts";
import { DRONE_CONCEPTS } from "../src/model/fleet/drone/concepts.ts";
import { hoop, post, rod } from "../src/model/fleet/detail.ts";
import { meshOf, type Piece, type Vec3 } from "../src/model/pieces.ts";
import { chamfer, polygon } from "../src/model/fleet/drone/plates.ts";

const out = resolve(process.argv[2] ?? "drone");
mkdirSync(join(out, "glb"), { recursive: true });

const part = (at: Vec3): Piece => polygon("hull-orange", at, [0, 1, 0], [1, 0, 0], chamfer(0.12, 0.08, 0.03), 0.06);

function truss(): Piece[] {
  return [
    post("hull-grey", [0, 0], 0.04, -0.15, 0.04, 0.15, 10),
    rod("hull-grey", [-0.7, -0.02, 0], [0.9, -0.02, 0], 0.035, 8),
    hoop("hull-grey", 0.07, 0.02, 0.012, 14, 4),
    hoop("lamp-blue", 0.025, 0.02, 0.006, 10, 4),
    hoop("hull-grey", 0.07, -0.02, 0.012, 14, 4, { at: [0.75, 0] }),
    hoop("lamp-blue", 0.025, -0.02, 0.006, 10, 4, { at: [0.75, 0] }),
  ];
}

const jobs: unknown[] = [];
for (const make of DRONE_CONCEPTS) {
  const concept = make();
  const file = join(out, "glb", `${concept.id}.glb`);
  writeFileSync(file, toGlb([{ name: concept.id, mesh: meshOf(concept.pieces), at: [0, 0, 0] }]).bytes);
  const held: Vec3 = [concept.mouth[0], concept.mouth[1] + 0.45, concept.mouth[2]];
  const working: Piece[] = [...concept.pieces, ...tractorBeam({ from: concept.mouth, part: held, slot: held }, "carry"), part(held)];
  if (concept.id.startsWith("arm-")) working.push(...truss());
  const workFile = join(out, "glb", `${concept.id}-work.glb`);
  writeFileSync(workFile, toGlb([{ name: concept.id, mesh: meshOf(working), at: [0, 0, 0] }]).bytes);
  const eye = (name: string, at: [number, number, number], up: [number, number, number] = [0, 0, 1]) => ({
    name: `${concept.id}-${name}`,
    eye: at,
    target: [0, 0.3, 0] as [number, number, number],
    up,
    fov: 30,
    size: [900, 700] as [number, number],
    fill: 0.84,
    look: "painted" as const,
    shadow: 3,
  });
  jobs.push({
    glb: file,
    shots: [eye("quarter", [1.8, 0.5, 1.3]), eye("side", [2.4, 0.2, 0.25]), eye("top", [0.1, 0.3, 2.4], [0, 1, 0])],
  });
  jobs.push({
    glb: workFile,
    shots: [{ ...eye("work", [2.2, 0.4, 1.5]), look: "lit", sun: 0.15, glow: 2.2 }],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(join(out, "jobs.json"));
