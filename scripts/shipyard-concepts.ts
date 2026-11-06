// Pictures of the three yard concepts with the aft half of Kaminari in the slot: `node scripts/shipyard-concepts.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { place } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { SLOTS_A } from "../src/model/fleet/kaminari-concepts/a.ts";
import { yardConcepts } from "../src/model/fleet/shipyard-concepts/concepts.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "shipyard");
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];

const write = (name: string, parts: { name: string; pieces: Piece[]; at: V3 }[]): { file: string; min: V3; max: V3 } => {
  const file = join(out, "glb", `${name}.glb`);
  writeFileSync(file, toGlb(parts.map((p) => ({ name: p.name, mesh: meshOf(p.pieces), at: p.at }))).bytes);
  const b = boundsOf(meshOf(parts.flatMap((p) => p.pieces)));
  return { file, min: b.min as V3, max: b.max as V3 };
};

const aft = SLOTS_A.filter((slot) => slot.slot === "spine" || slot.at[1] < 1100);
const ship = aft.flatMap((slot) => place(slot.pieces(), { at: [slot.at[0], slot.at[1], slot.at[2]] }));
const shipBox = boundsOf(meshOf(ship));
console.log("Kaminari aft", (shipBox.max[1] - shipBox.min[1]).toFixed(0), "m,", aft.length, "slots");

const jobs: unknown[] = [];
for (const yard of yardConcepts()) {
  const pieces = [...yard.pieces(), ...place(ship, { at: [yard.shipAt[0], yard.shipAt[1], yard.shipAt[2]] })];
  const made = write(yard.id, [{ name: yard.id, pieces, at: [0, 0, 0] }]);
  const centre: V3 = [(made.min[0] + made.max[0]) / 2, (made.min[1] + made.max[1]) / 2, (made.min[2] + made.max[2]) / 2];
  const len = made.max[1] - made.min[1];
  console.log(yard.id, "pieces", pieces.length, "span", len.toFixed(0));
  // Outside, above and to one side, a bit over two yard-lengths away. The same eye for day and night.
  const eye: V3 = [centre[0] + len * 1.7, centre[1] - len * 1.15, centre[2] + len * 1.15];
  const shots: unknown[] = [{
    name: yard.id,
    eye,
    target: centre,
    up: [0, 0, 1],
    fov: 18,
    far: 14000,
    size: [1440, 900],
    shadow: len * 0.8,
    shadowBias: 0.004,
    look: "painted",
    sunDir: [0.35, 0.7, 0.6],
  }, {
    name: `${yard.id}-night`,
    eye,
    target: centre,
    up: [0, 0, 1],
    fov: 18,
    far: 14000,
    size: [1440, 900],
    look: "lit",
    glow: 3.2,
    sun: 0.05,
    shadow: len * 0.6,
  }];
  for (const view of yard.close) {
    shots.push({
      name: `${yard.id}-${view.name}`,
      eye: [...view.eye],
      target: [...view.at],
      up: [0, 0, 1],
      fov: view.name === "booth" ? 78 : 32,
      size: [1440, 900],
      look: "painted",
      sunDir: [0.3, 0.7, 0.5],
      shadow: 220,
    });
  }
  jobs.push({ glb: made.file, shots });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
