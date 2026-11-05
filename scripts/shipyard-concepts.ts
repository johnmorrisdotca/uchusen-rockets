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
  const len = Math.max(made.max[1] - made.min[1], made.max[0] - made.min[0]);
  console.log(yard.id, "pieces", pieces.length, "span", len.toFixed(0));
  const wide: V3 = [centre[0] + len * 0.9, centre[1] - len * 0.05, centre[2] + len * 0.38];
  jobs.push({
    glb: made.file,
    shots: [{
      name: yard.id,
      eye: wide,
      target: centre,
      up: [0, 0, 1],
      size: [1800, 900],
      fill: 0.9,
      shadow: len * 0.8,
      shadowBias: 0.006,
      look: "painted",
      sunDir: [0.4, 0.8, 0.5],
    }, {
      name: `${yard.id}-store`,
      eye: [centre[0] - 260, 420, centre[2] + 140],
      target: [centre[0] - 40, 480, centre[2]],
      up: [0, 0, 1],
      fov: 42,
      size: [1800, 900],
      look: "painted",
      sunDir: [0.2, 0.6, 0.8],
      shadow: 200,
    }, {
      name: `${yard.id}-lit`,
      eye: [centre[0] + len * 0.35, centre[1] - len * 0.2, centre[2] + len * 0.2],
      target: centre,
      up: [0, 0, 1],
      size: [1800, 900],
      fill: 0.85,
      look: "lit",
      glow: 2.6,
      sun: 0.08,
      shadow: len * 0.6,
    }],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
