// Pictures of the three yard concepts with Miyamoto standing in the slot: `node scripts/shipyard-concepts.ts <folder>`.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
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

const slots = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
const miya = write("miyamoto", MIYAMOTO_PARTS.filter((p) => slots.includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.2 }), at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] as V3 })));
const shipLen = miya.max[1] - miya.min[1];
console.log("Miyamoto", shipLen.toFixed(0), "m");

const jobs: unknown[] = [];
for (const yard of yardConcepts()) {
  const pieces = yard.pieces();
  const made = write(yard.id, [{ name: yard.id, pieces, at: [0, 0, 0] }]);
  const centre: V3 = [(made.min[0] + made.max[0]) / 2, (made.min[1] + made.max[1]) / 2, (made.min[2] + made.max[2]) / 2];
  const len = made.max[1] - made.min[1];
  const eye: V3 = [centre[0] + len * 0.85, centre[1] - len * 0.15, centre[2] + len * 0.42];
  const at: V3 = [yard.shipAt[0] - (miya.min[0] + miya.max[0]) / 2, yard.shipAt[1] - miya.min[1], yard.shipAt[2] - (miya.min[2] + miya.max[2]) / 2];
  console.log(yard.id, "pieces", pieces.length, "ship at", at.map((n) => n.toFixed(0)).join(","));
  jobs.push({
    glb: made.file,
    more: [{ glb: miya.file, at }],
    shots: [{
      name: yard.id,
      eye,
      target: centre,
      up: [0, 0, 1],
      size: [1800, 900],
      fill: 0.82,
      shadow: len * 0.8,
      shadowBias: 0.006,
      look: "painted",
      sunDir: [0.4, 0.8, 0.5],
    }, {
      name: `${yard.id}-lit`,
      eye: [centre[0] + len * 0.7, centre[1] - len * 0.35, centre[2] + len * 0.35],
      target: [at[0], at[1] + shipLen * 0.35, at[2]],
      up: [0, 0, 1],
      size: [1800, 900],
      fill: 0.7,
      look: "lit",
      glow: 2.4,
      sun: 0.12,
      shadow: len * 0.5,
    }],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
