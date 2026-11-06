// Two Miyamoto berthed on Romaryu, and a Dragon a few metres off the collar, nose toward the port, on a line of small lamps. `SHOTS_PORT=7933 node scripts/romaryu-approach.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { coarsen, detail } from "../src/model/detail.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { hoop, lamps, place, rod } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { docked } from "../src/model/fleet/kaminari-concepts/c.ts";
import { CONCEPT_SLOTS } from "../src/model/fleet/kaminari-concepts/index.ts";
import { meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "romaryu-approach");
mkdirSync(join(out, "renders"), { recursive: true });
type V3 = [number, number, number];

const STRUCTURE = new Set(["shaft", "cradle-1", "cradle-3"]);
detail.level = "coarse";
const parts = CONCEPT_SLOTS.c.filter((slot) => STRUCTURE.has(slot.slot)).map((slot) => ({
  name: slot.slot,
  mesh: meshOf(coarsen(slot.pieces())),
  at: [slot.at[0], slot.at[1], slot.at[2]] as V3,
}));
// The slot builds a coarse ship and a second coarsen breaks the bands. These are the package's own ships, whole, at the same keel the cradles hold.
const berthed = (az: number, y: number): Piece[] => {
  const a = (az * Math.PI) / 180;
  const r = 74;
  return place(docked("miyamoto", 1, "fine"), { at: [r * Math.sin(a), y, r * Math.cos(a)], yaw: az });
};
parts.push(
  { name: "miyamoto-1", mesh: meshOf(berthed(0, 560)), at: [0, 0, 0] },
  { name: "miyamoto-3", mesh: meshOf(berthed(90, 980)), at: [0, 0, 0] },
);

const drawn = DRAGON_DRAWS["dragon-2"];
const nose = drawn.trunk + drawn.capsule - drawn.nest;
// The concept C Dragon port: berth at [0, 600, 0], the docked nose at the collar. The flying Dragon stops short of it.
const collarAt: V3 = [0, 522 + nose, 76];
const dragonAt: V3 = [0, collarAt[1] - nose - 5, collarAt[2]];
const dragon = place([...trunk(drawn), ...place(capsule(drawn), { at: [0, drawn.trunk - drawn.nest, 0] })], { at: dragonAt });
const collar = place([hoop("hull-grey", 2.4, collarAt[1], 0.28, 28, 8)], { at: [collarAt[0], 0, collarAt[2]] });

const lights: Piece[] = [];
for (let step = 0; step <= 12; step++) {
  const at: V3 = [5, collarAt[1] - 3 - step * 7, collarAt[2]];
  const tip: V3 = [at[0] + 1.2, at[1], at[2]];
  lights.push(rod("hull-grey", at, tip, 0.05, 6));
  lights.push(...lamps([{ at: tip, colour: step % 2 === 0 ? "starboard" : "amber", size: 0.32 }]));
}

parts.push({ name: "approach", mesh: meshOf([...dragon, ...collar, ...lights]), at: [0, 0, 0] });
const glb = join(out, "berth.glb");
writeFileSync(glb, toGlb(parts).bytes);

const wide = { eye: [980, 200, 160] as V3, target: [20, 860, 50] as V3, up: [0, 1, 0] as V3, fov: 42, size: [1440, 900] as [number, number], shadow: 800 };
const jobs = [{
  glb,
  shots: [{
    name: "wide",
    ...wide,
    look: "painted",
    sunDir: [0.45, 0.55, 0.5],
  }, {
    name: "wide-night",
    ...wide,
    look: "lit",
    glow: 3.4,
    sun: 0.05,
  }, {
    name: "dragon",
    eye: [26, dragonAt[1] + nose * 0.5, 96],
    target: [0, collarAt[1] - 1, 76],
    up: [0, 1, 0],
    fov: 32,
    size: [1440, 900],
    look: "painted",
    sunDir: [0.4, 0.6, 0.5],
    shadow: 80,
  }],
}];
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
