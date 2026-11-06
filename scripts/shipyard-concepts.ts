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
  const len = Math.max(made.max[1] - made.min[1], made.max[0] - made.min[0], made.max[2] - made.min[2]);
  console.log(yard.id, "pieces", pieces.length, "span", len.toFixed(0));
  // Down the slot from outside the tail. No fill: a fit would back away the moment a chord crosses the lens.
  const aim: V3 = [yard.shipAt[0], 640, yard.shipAt[2]];
  const wide: V3 = [yard.shipAt[0] + 70, -420, yard.shipAt[2] + 90];
  const shots: unknown[] = [{
    name: yard.id,
    eye: wide,
    target: aim,
    up: [0, 0, 1],
    fov: 38,
    size: [1440, 900],
    shadow: len * 0.5,
    shadowBias: 0.006,
    look: "painted",
    sunDir: [0.4, 0.8, 0.5],
  }, {
    name: `${yard.id}-lit`,
    eye: [yard.shipAt[0] - 40, -280, yard.shipAt[2] + 140],
    target: aim,
    up: [0, 0, 1],
    fov: 42,
    size: [1440, 900],
    look: "lit",
    glow: 2.6,
    sun: 0.08,
    shadow: len * 0.4,
  }];
  for (const view of yard.close) {
    shots.push({
      name: `${yard.id}-${view.name}`,
      eye: [...view.eye],
      target: [...view.at],
      up: [0, 0, 1],
      fov: 32,
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
