// The multi-bay yard: a hall, a spine and a dock side by side, each with a ship under way. `SHOTS_PORT=8285 node scripts/yard-447.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { build } from "../src/build/index.ts";
import { toGlb } from "../src/build/glb.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { place } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { SLOTS_A } from "../src/model/fleet/kaminari-concepts/a.ts";
import { docked } from "../src/model/fleet/kaminari-concepts/c.ts";
import { BAYS, multiBay } from "../src/model/fleet/shipyard-concepts/multibay.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "yard-447");
mkdirSync(join(out, "renders"), { recursive: true });
type V3 = [number, number, number];

const aft = SLOTS_A.filter((slot) => slot.slot === "spine" || slot.at[1] < 1100);
const kaminari = aft.flatMap((slot) => place(slot.pieces(), { at: [slot.at[0], slot.at[1], slot.at[2]] }));
const miyamoto = docked("miyamoto", 1, "fine");
const pieces: Piece[] = [
  ...multiBay(),
  ...place(kaminari, { at: [...BAYS.hall.shipAt] }),
  ...place(miyamoto, { at: [...BAYS.spine.shipAt] }),
  ...place(miyamoto, { at: [...BAYS.loose.shipAt] }),
];
const dragonDraw = DRAGON_DRAWS["dragon-2"];
const dragonNose = dragonDraw.trunk + dragonDraw.capsule - dragonDraw.nest;
const visitor = [...trunk(dragonDraw), ...place(capsule(dragonDraw), { at: [0, dragonDraw.trunk - dragonDraw.nest, 0] })];
pieces.push(...place(visitor, { at: [-980, 150 - dragonNose - 4, -22] }));
const hanabusa = build({ rocket: "fleet-ship-01", variant: "hanabusa" }, { detail: "coarse" });
const hFile = join(out, "hanabusa.glb");
writeFileSync(hFile, hanabusa.glb().bytes);
const hBox = hanabusa.boundsOf("together");
console.log("Hanabusa", (hBox.max[1] - hBox.min[1]).toFixed(0), "m");

const yardFile = join(out, "yard.glb");
writeFileSync(yardFile, toGlb([{ name: "yard", mesh: meshOf(pieces), at: [0, 0, 0] }]).bytes);
const box = boundsOf(meshOf(pieces));
const min: V3 = [Math.min(box.min[0], BAYS.dock.shipAt[0] + hBox.min[0]), Math.min(box.min[1], BAYS.dock.shipAt[1] + hBox.min[1]), Math.min(box.min[2], BAYS.dock.shipAt[2] + hBox.min[2])];
const max: V3 = [Math.max(box.max[0], BAYS.dock.shipAt[0] + hBox.max[0]), Math.max(box.max[1], BAYS.dock.shipAt[1] + hBox.max[1]), Math.max(box.max[2], BAYS.dock.shipAt[2] + hBox.max[2])];
const centre: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
const len = Math.max(max[1] - min[1], max[0] - min[0]);
const eye: V3 = [centre[0] + len * 0.05, centre[1] - len * 1.15, centre[2] + len * 0.48];
console.log("yard span", len.toFixed(0), "eye", eye.map((n) => n.toFixed(0)).join(","));

const wide = { eye, target: centre, up: [0, 0, 1] as V3, fov: 38, far: 16000, size: [1440, 900] as [number, number], shadow: len * 0.7 };
const nearEye: V3 = [centre[0] + len * 0.02, centre[1] - len * 0.72, centre[2] + len * 0.4];
const more = [{ glb: hFile, at: [...BAYS.dock.shipAt] as V3 }];
const jobs = [{
  glb: yardFile,
  more,
  shots: [
    { name: "yard", ...wide, look: "painted", sunDir: [0.35, 0.65, 0.55] },
    { name: "yard-night", ...wide, look: "lit", glow: 3.2, sun: 0.05 },
    { name: "yard-near", eye: nearEye, target: centre, up: [0, 0, 1], fov: 50, far: 16000, size: [1440, 900], look: "painted", sunDir: [0.35, 0.65, 0.55], shadow: len * 0.5 },
    { name: "lounge", eye: [...BAYS.lounge.eye], target: [...BAYS.lounge.at], up: [0, 0, 1], fov: 64, size: [1440, 900], look: "painted", sunDir: [0.4, 0.5, 0.6], shadow: 30 },
    { name: "hall", eye: [160, -40, 320], target: [0, 700, 20], up: [0, 0, 1], fov: 34, size: [1440, 900], look: "painted", shadow: 500 },
    { name: "spine", eye: [980, 20, 300], target: [760, 500, 0], up: [0, 0, 1], fov: 34, size: [1440, 900], look: "painted", shadow: 400 },
    { name: "latch", eye: [...BAYS.latch.eye], target: [...BAYS.latch.at], up: [0, 0, 1], fov: 42, size: [1440, 900], look: "painted", shadow: 80 },
    { name: "visitor", eye: [-1016, 108, 12], target: [-980, 140, -22], up: [0, 0, 1], fov: 28, size: [1440, 900], look: "painted", shadow: 24 },
    { name: "visitor-night", eye: [-1016, 108, 12], target: [-980, 140, -22], up: [0, 0, 1], fov: 28, size: [1440, 900], look: "lit", glow: 3.2, sun: 0.05, shadow: 24 },
    { name: "dock", eye: [1760, 40, 320], target: [1520, 600, 20], up: [0, 0, 1], fov: 34, size: [1440, 900], look: "painted", shadow: 500 },
  ],
}];
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
