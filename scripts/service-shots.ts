// Pictures of the service fittings, from the real model: `node scripts/service-shots.ts <folder>` writes the .glb files and jobs.json, which
// `SHOTS_PORT=7943 node scripts/concept-render.ts <folder>/jobs.json <folder>/png` draws. Not part of the package.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { build } from "../src/build/index.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/service-shots.ts <folder>");
mkdirSync(out, { recursive: true });

const save = (name: string, rocket: string, variant: string): string => {
  const file = join(out, `${name}.glb`);
  writeFileSync(file, build({ rocket, variant }, { detail: "full" }).glb().bytes);
  return file;
};

const cut = save("cutaway", "fleet-ship-03", "miyamoto-cutaway");
const loaded = save("loaded", "fleet-ship-ariake", "ariake");
const empty = save("empty", "fleet-ship-ariake", "ariake-empty");
const keel = save("keel", "fleet-ship-ariake", "ariake-berth-keel");
const port = save("port", "fleet-ship-ariake", "ariake-berth-port");
const miyamoto = save("miyamoto", "fleet-ship-03", "miyamoto");
const stack = save("stack", "starship", "v3");
const dragon = save("dragon", "dragon", "dragon-2");

type V3 = [number, number, number];
const shot = (name: string, eye: V3, target: V3, extra: Record<string, unknown> = {}) => ({ name, eye, target, fov: 36, size: [1600, 1000], look: "painted", shadow: 80, sunDir: [0.4, 0.45, 0.7], ...extra });

const jobs = [
  { glb: cut, shots: [shot("box-interior", [150, 154, 18], [46, 154, 12], { fov: 48, shadow: 40 })] },
  { glb: loaded, shots: [shot("saddles-loaded", [180, 150, 36], [90, 150, 8], { fov: 40 })] },
  { glb: empty, shots: [shot("saddles-empty", [180, 150, 36], [90, 150, 8], { fov: 40 })] },
  { glb: keel, shots: [
    shot("berth-keel-side", [160, 214, 20], [0, 214, -8], { up: [0, 0, 1], fov: 28, size: [1800, 800] }),
    shot("berth-keel-top", [0, 214, -180], [0, 214, -8], { up: [0, 1, 0], fov: 42, size: [1800, 800] }),
    shot("berth-keel-3q", [140, 120, 50], [0, 214, -8], { fov: 32 }),
  ] },
  { glb: port, shots: [
    shot("berth-port-side", [-90, 160, 40], [-8, 160, 0], { up: [0, 0, 1], fov: 32, size: [1800, 800] }),
    shot("berth-port-top", [-8, 160, 160], [-8, 160, 0], { up: [0, 1, 0], fov: 40, size: [1800, 800] }),
    shot("berth-port-3q", [-70, 80, 70], [-8, 160, 0], { fov: 34 }),
  ] },
  { glb: miyamoto, more: [{ glb: stack, at: [-36, 140, -60] as V3 }, { glb: dragon, at: [0, 200, -75] as V3 }], shots: [shot("ports", [0, 190, -155], [0, 230, -40], { up: [0, 1, 0], fov: 50, hide: ["booster"] })] },
  { glb: stack, shots: [
    shot("ref-stack-side", [150, 62, 170], [0, 62, 0], { up: [0, 1, 0], fov: 36, size: [1000, 1600] }),
    shot("ref-ship-front", [50, 165, 55], [0, 105, 0], { up: [0, 1, 0], fov: 42, size: [900, 1400], hide: ["booster"] }),
  ] },
  { glb: dragon, shots: [shot("ref-dragon", [10, 3, 8], [0, 3, 0], { fov: 32, size: [1200, 900] })] },
];

writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(`wrote ${jobs.length} jobs to ${out}`);
