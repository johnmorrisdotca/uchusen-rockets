// The three silhouette concepts of ISV Kyotori from the real kit: `node scripts/ship-kyotori-concepts.ts <folder>` builds a .glb for each, for Hanabusa, Miyamoto and a Starship stack, and draws side, three-quarter, front and top pictures and one lineup at true scale with
// scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { PART_ENTRIES } from "../src/index.ts";
import { k2, K2, k2Numbers } from "../src/model/fleet/ship-kyotori/k2.ts";
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
const pieces = k2();
const k = write("k2", [{ name: "k2", pieces, at: [0, 0, 0] }]);
const len = k.max[1] - k.min[1];
const centre: V3 = [(k.min[0] + k.max[0]) / 2, (k.min[1] + k.max[1]) / 2, (k.min[2] + k.max[2]) / 2];
const n = k2Numbers();
console.log("k2 length", len.toFixed(0), "width", (k.max[0] - k.min[0]).toFixed(0), "pieces", pieces.length, `cross rim ${n.R} m ${n.rpm.toFixed(2)} rpm ${n.g.toFixed(2)} g`);
const shot = (name: string, dir: V3, up: V3, extra: Record<string, unknown> = {}) => ({ name: `k2-${name}`, eye: [centre[0] + dir[0] * len, centre[1] + dir[1] * len, centre[2] + dir[2] * len], target: centre, up, size: [1800, 900], fill: 0.85, shadow: len * 0.7, shadowBias: 0.004, look: "painted", sunDir: [0.35, 1, 0.45], ...extra });
const close = (name: string, eye: V3, target: V3, fov: number, shadow = 60, extra: Record<string, unknown> = {}) => ({ name: `k2-${name}`, eye, target, up: [0, 0, 1], size: [1600, 900], fov, shadow, shadowBias: 0.004, look: "painted", sunDir: [0.5, 0.4, 0.8], ...extra });
jobs.push({ glb: k.file, shots: [shot("three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), shot("side", [1, 0, 0], [0, 0, 1], { sunDir: [0.3, 0.6, 0.9] }), shot("front", [0.15, 1, 0.1], [0, 0, 1]), shot("top", [0, 0, 1], [-1, 0, 0], { sunDir: [0.6, 0.6, 0.6] }),
  { ...shot("lit", [0.9, -0.5, 0.5], [0, 0, 1]), look: "lit", glow: 3.4, sun: 0.1, sunDir: undefined },
  close("bay", [62, 282, 30], [0, 282, 0], 52), close("bay-back", [-40, 270, -45], [0, 282, 0], 56), close("tanks", [48, 118, 48], [4, 118, 12], 50, 80), close("cross-hub", [50, 330, 62], [0, 362, 0], 58, 80), close("pods", [90, 392, 84], [34, 362, 38], 46, 80), close("pod-control", [14, 362, 82], [0, 362, 60], 38, 30), close("pod-lab", [84, 364, 12], [60, 362, 0], 38, 30), close("pod-observatory", [-12, 362, -82], [0, 362, -60], 38, 30), close("pod-engineering", [-84, 366, -10], [-60, 362, 0], 38, 30),
  close("ref-bay-aft", [0, 236, 22], [0, 300, 0], 52, 70), close("ref-mirror-front", [0, 560, 0], [0, 424, 0], 26, 80, { up: [1, 0, 0] }), close("ref-mirror-side", [80, 424, 50], [0, 424, 0], 42, 80), close("ref-truss", [26, 200, 30], [0, 190, 0], 44, 70), close("ref-dome", [16, 392, 72], [0, 362, 60], 34, 40)] });
jobs.push({ glb: k.file, more: [{ glb: hana.file, at: [-330, 0, 0] }, { glb: miya.file, at: [200, 0, 0] }, { glb: star.file, at: [340, 0, 0] }], shots: [{ name: "k2-lineup", eye: [20, 320, 2200], target: [20, 320, 0], up: [0, 1, 0], ortho: 700, size: [2000, 800], shadow: 700, shadowBias: 0.004, look: "painted", sunDir: [0.3, 0.5, 1] }] });
void K2;
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
