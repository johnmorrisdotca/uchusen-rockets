// Two Miyamoto berthed on Romaryu, and a Dragon a few metres off the collar, nose toward the port, on a line of small lamps. `SHOTS_PORT=7933 node scripts/romaryu-approach.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { coarsen, detail } from "../src/model/detail.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { cub, hoop, lamps, place, rod } from "../src/model/fleet/kaminari-concepts/adapter.ts";
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
// The concept C Dragon port, outside the 18 m truss. The collar sits on a tunnel from that face, and the Dragon stops a few metres short, nose toward the hatch.
const collarAt: V3 = [0, 522 + nose, 76];
const dragonAt: V3 = [0, collarAt[1] - nose - 5, collarAt[2]];
const dragon = place([...trunk(drawn), ...place(capsule(drawn), { at: [0, drawn.trunk - drawn.nest, 0] })], { at: dragonAt });

const y = collarAt[1];
const z = collarAt[2];
const face = 18;
const half = 1.35;
const port: Piece[] = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  port.push(rod("hull-grey", [sx * half, y + sy * half, face], [sx * half, y + sy * half, z - 2.4], 0.28, 8));
}
for (let zz = face; zz <= z - 2.4; zz += 6) {
  port.push(rod("hull-grey-dark", [-half, y - half, zz], [half, y - half, zz], 0.16, 6));
  port.push(rod("hull-grey-dark", [half, y - half, zz], [half, y + half, zz], 0.16, 6));
  port.push(rod("hull-grey-dark", [half, y + half, zz], [-half, y + half, zz], 0.16, 6));
  port.push(rod("hull-grey-dark", [-half, y + half, zz], [-half, y - half, zz], 0.16, 6));
}
port.push(...place([hoop("hull-white", 2.4, y, 0.34, 32, 8)], { at: [0, 0, z] }));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  port.push(rod("hull-grey", [sx * half, y + sy * half, z - 2.4], [sx * 1.9, y + sy * 0.2, z], 0.24, 6));
}
port.push(cub("hull-white", [-0.2, 0.85], [y - 0.9, y - 0.35], [z - 0.7, z + 0.55]));
port.push(rod("hull-grey-dark", [-0.28, y - 1.15, z], [-0.28, y - 0.25, z], 0.1, 6));

const railZ = z + 4.2;
for (const sx of [-1, 1]) {
  const x = sx * 3.2;
  port.push(rod("hull-grey", [sx * 1.8, y - 1.4, z - 2.2], [x, y - 1, railZ], 0.2, 6));
  port.push(rod("hull-grey", [sx * 1.8, y + 1.2, z - 2.2], [x, y - 1, railZ], 0.16, 6));
  port.push(rod("hull-grey", [x, y - 58, railZ], [x, y - 1, railZ], 0.14, 6));
}
for (let step = 0; step <= 7; step++) {
  const yy = y - 6 - step * 7;
  port.push(rod("hull-grey-dark", [-3.2, yy, railZ], [3.2, yy, railZ], 0.1, 6));
  for (const sx of [-1, 1]) port.push(...lamps([{ at: [sx * 3.2, yy, railZ], colour: step % 2 === 0 ? "starboard" : "amber", size: 0.28 }]));
}

parts.push({ name: "approach", mesh: meshOf([...dragon, ...port]), at: [0, 0, 0] });
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
    eye: [18, collarAt[1] - 5, collarAt[2] + 12],
    target: [0, collarAt[1] - 5, collarAt[2] - 10],
    up: [0, 1, 0],
    fov: 48,
    size: [1440, 900],
    look: "painted",
    sunDir: [0.4, 0.6, 0.5],
    shadow: 80,
  }],
}];
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
