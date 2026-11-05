// (twin) The two-shaft versions of Kyotori of ISV Kyotori from the real kit: `node scripts/ship-kyotori-concepts.ts <folder>` builds a .glb for each, for Hanabusa, Miyamoto and a Starship stack, and draws side, three-quarter, front and top pictures and one lineup at true scale with
// scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { PART_ENTRIES } from "../src/index.ts";
import { K2, k2Numbers } from "../src/model/fleet/ship-kyotori/k2.ts";
import { shipPieces, SHAFT_X, twin, type TwinId } from "../src/model/fleet/ship-kyotori/twin.ts";
import { HANABUSA_PARTS, HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "kyotori");
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const write = (name: string, parts: { name: string; pieces: Piece[]; at: V3 }[]): { file: string; min: V3; max: V3 } => {
  const file = join(out, "glb", `${name}.glb`);
  const made = parts.map((p) => ({ name: p.name, mesh: meshOf(p.pieces), at: p.at }));
  writeFileSync(file, toGlb(made).bytes);
  const b = boundsOf(meshOf(parts.flatMap((p) => p.pieces)));
  return { file, min: b.min as V3, max: b.max as V3 };
};

// the three to stand beside: Hanabusa (611 m), Miyamoto (380 m) and a Starship with Super Heavy (124 m), each from the package's own models
const slotsH = Object.values(HANABUSA_VARIANT_SLOTS.hanabusa);
const hana = write("hanabusa", HANABUSA_PARTS.filter((p) => slotsH.includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.3 }), at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] as V3 })));
const slotsM = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
const miya = write("miyamoto", MIYAMOTO_PARTS.filter((p) => slotsM.includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.3 }), at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] as V3 })));
const entry = (id: string) => PART_ENTRIES.find((e) => e.record.id === id) as { pieces: () => Piece[]; record: { height: number } };
const boosterH = entry("starship-v3-booster").record.height;
const star = write("starship", [{ name: "booster", pieces: entry("starship-v3-booster").pieces(), at: [0, 0, 0] }, { name: "ship", pieces: entry("starship-v3-ship").pieces(), at: [0, boosterH, 0] }]);
console.log("Starship stack", (boosterH + 52.1).toFixed(0), "m; Miyamoto", miya.max[1].toFixed(0), "m; Hanabusa", hana.max[1].toFixed(0), "m");


const jobs: unknown[] = [];
const shots = (id: TwinId, state: "joined" | "separated", centre: V3, len: number, file: string) => {
  const nm = `${id}-${state}`;
  const shot = (name: string, dir: V3, up: V3, extra: Record<string, unknown> = {}) => ({ name: `${nm}-${name}`, eye: [centre[0] + dir[0] * len, centre[1] + dir[1] * len, centre[2] + dir[2] * len], target: centre, up, size: [1800, 900], fill: 0.85, shadow: len * 0.7, shadowBias: 0.004, look: "painted", sunDir: [0.35, 1, 0.45], ...extra });
  return { glb: file, shots: [shot("three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), shot("plan", [0, 0, 1], [0, 1, 0], { sunDir: [0.4, 0.5, 1] }), shot("front", [0.1, 1, 0.05], [0, 0, 1]), { ...shot("lit", [0.9, -0.5, 0.5], [0, 0, 1]), look: "lit", glow: 3.4, sun: 0.1, sunDir: undefined }] };
};
const close = (name: string, eye: V3, target: V3, fov: number, shadow = 60, extra: Record<string, unknown> = {}) => ({ name, eye, target, up: [0, 1, 0], size: [1600, 900], fov, shadow, shadowBias: 0.004, look: "painted", sunDir: [0.5, 0.4, 0.9], ...extra });
const info: Record<string, unknown> = {};
for (const id of ["v1", "v2"] as TwinId[]) {
  for (const state of ["joined", "separated"] as const) {
    const k = write(`${id}-${state}`, [{ name: `${id}-${state}`, pieces: twin(id, state), at: [0, 0, 0] }]);
    const len = k.max[1] - k.min[1];
    const centre: V3 = [(k.min[0] + k.max[0]) / 2, (k.min[1] + k.max[1]) / 2, (k.min[2] + k.max[2]) / 2];
    info[`${id}-${state}`] = { len: +len.toFixed(0), width: +(k.max[0] - k.min[0]).toFixed(0), depth: +(k.max[2] - k.min[2]).toFixed(0) };
    const job = shots(id, state, centre, len, k.file) as { shots: unknown[] };
    if (state === "joined") {
      job.shots.push(
        close(`${id}-joint`, [34, 150, 46], [0, 150, 0], 46, 80), close(`${id}-joint-top`, [0, 136, 60], [0, 136, 0], 50, 80), close(`${id}-drives`, [30, 30, 64], [0, 36, 0], 56, 80),
        ...(id === "v1" ? [close("v1-runner-bow", [-52, 300, 60], [-13.5, 296, 0], 50, 80), close("v1-cross-hub", [50, 330, 62], [13.5, 362, 0], 58, 80, { up: [0, 0, 1] })] : [close("v2-yoke", [60, 330, 60], [0, 346, 0], 54, 80), close("v2-yoke-front", [0, 346, 84], [0, 346, 0], 50, 80)]),
      );
    } else {
      { const off = id === "v1" ? 34 : 56; job.shots.push(close(`${id}-seam`, [off - 20, 150, 56], [off, 150, 0], 46, 80), close(`${id}-seam-b`, [-off + 20, 150, -56], [-off, 150, 0], 46, 80)); }
    }
    jobs.push(job);
  }
  // the lineup: the joined ship beside Hanabusa, Miyamoto and a Starship stack
  const f = join(out, "glb", `${id}-joined.glb`);
  jobs.push({ glb: f, more: [{ glb: hana.file, at: [-330, 0, 0] }, { glb: miya.file, at: [200, 0, 0] }, { glb: star.file, at: [340, 0, 0] }], shots: [{ name: `${id}-lineup`, eye: [20, 320, 2200], target: [20, 320, 0], up: [0, 1, 0], ortho: 700, size: [2000, 800], shadow: 700, shadowBias: 0.004, look: "painted", sunDir: [0.3, 0.5, 1] }] });
}
for (const id of ["v1", "v2"] as TwinId[]) for (const ship of ["A", "B", "C"] as const) { const p = shipPieces(id, ship); if (p.length) { const b = boundsOf(meshOf(p)); info[`${id}-${ship}`] = { pieces: p.length, len: +(b.max[1] - b.min[1]).toFixed(0) }; } }
console.log(JSON.stringify(info), "ring", JSON.stringify(k2Numbers()), "shaft x", SHAFT_X, "K2", K2.ringY);
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
