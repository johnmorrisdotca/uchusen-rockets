// The two-ship scene: two Miyamoto berthed on Romaryu, and a Dragon on a lit path to the collar that takes it. `SHOTS_PORT=7933 node scripts/romaryu-approach.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { coarsen, detail } from "../src/model/detail.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { ball, hoop, place } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { CONCEPT_SLOTS } from "../src/model/fleet/kaminari-concepts/index.ts";
import { meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "romaryu-approach");
mkdirSync(join(out, "renders"), { recursive: true });
type V3 = [number, number, number];

const KEEP = new Set(["shaft", "miyamoto-1", "miyamoto-3", "cradle-1", "cradle-3"]);
detail.level = "coarse";
const parts = CONCEPT_SLOTS.c.filter((slot) => KEEP.has(slot.slot)).map((slot) => ({
  name: slot.slot,
  mesh: meshOf(coarsen(slot.pieces())),
  at: [slot.at[0], slot.at[1], slot.at[2]] as V3,
}));

const drawn = DRAGON_DRAWS["dragon-2"];
const nose = drawn.trunk + drawn.capsule - drawn.nest;
const dragonAt: V3 = [150, 920, 150];
const collarAt: V3 = [0, 522 + nose, 76];
const dragon = place([...trunk(drawn), ...place(capsule(drawn), { at: [0, drawn.trunk - drawn.nest, 0] })], { at: dragonAt });
const collar = place([hoop("hull-grey", 4, collarAt[1], 1.2, 28, 8)], { at: [collarAt[0], 0, collarAt[2]] });

const lamp = (at: V3, material: "nav-green" | "nav-red" | "lamp-amber"): Piece => ball(material, at, 12);

const lights: Piece[] = [];
for (let step = 1; step <= 12; step++) {
  const t = step / 12;
  const at: V3 = [dragonAt[0] + (collarAt[0] - dragonAt[0]) * t, dragonAt[1] + (collarAt[1] - dragonAt[1]) * t, dragonAt[2] + (collarAt[2] - dragonAt[2]) * t];
  lights.push(lamp(at, step % 2 === 0 ? "nav-green" : "lamp-amber"));
}
for (let step = 1; step <= 6; step++) lights.push(lamp([dragonAt[0] + step * 16, dragonAt[1] + step * 24, dragonAt[2] + step * 16], step % 2 === 0 ? "nav-green" : "nav-red"));

parts.push({ name: "approach", mesh: meshOf([...dragon, ...collar, ...lights]), at: [0, 0, 0] });
const glb = join(out, "berth.glb");
writeFileSync(glb, toGlb(parts).bytes);

const jobs = [{
  glb,
  shots: [{
    name: "between",
    eye: [380, 280, 420],
    target: [30, 980, 30],
    up: [0, 1, 0],
    fov: 30,
    size: [1440, 900],
    look: "painted",
    sunDir: [0.45, 0.6, 0.5],
    shadow: 600,
  }, {
    name: "between-lit",
    eye: [820, 780, 860],
    target: [40, 960, 40],
    up: [0, 1, 0],
    fov: 36,
    size: [1440, 900],
    look: "lit",
    glow: 3.2,
    sun: 0.05,
    shadow: 500,
  }, {
    name: "dragon",
    eye: [230, 860, 240],
    target: dragonAt,
    up: [0, 1, 0],
    fov: 26,
    size: [1440, 900],
    look: "painted",
    sunDir: [0.3, 0.7, 0.45],
    shadow: 120,
  }],
}];
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
