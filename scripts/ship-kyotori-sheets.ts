// ISV Kyotori (SPX-045) sheet pictures from the real parts: `node scripts/ship-kyotori-sheets.ts <folder>` builds a .glb for each variant from the registry's own parts and draws them (three-quarter, plan, close-ups of the station, the housing, the
// docks with their visitors, the wings in three states, a quarter cut open) and a true-scale lineup beside Hanabusa, Miyamoto and a Starship stack, with scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { PART_ENTRIES } from "../src/index.ts";
import { KYOTORI_PARTS, KYOTORI_VARIANT_SLOTS } from "../src/model/fleet/ship-kyotori/variants.ts";
import { HANABUSA_PARTS, HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";
import { place } from "../src/model/fleet/ship-kyotori/adapter.ts";

const out = resolve(process.argv[2] ?? "kyotori-sheets");
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const write = (name: string, parts: { name: string; pieces: Piece[]; at: V3 }[]) => {
  const t = performance.now();
  const made = parts.map((p) => ({ name: p.name, mesh: meshOf(p.pieces), at: p.at }));
  const ms = Math.round(performance.now() - t);
  const file = join(out, "glb", `${name}.glb`);
  const bytes = toGlb(made).bytes;
  writeFileSync(file, bytes);
  const b = boundsOf(meshOf(parts.flatMap((p) => place(p.pieces, { at: p.at }))));
  console.log(name, "parts", parts.length, "mesh ms", ms, "glb MB", (bytes.length / 1e6).toFixed(1));
  return { file, min: b.min as V3, max: b.max as V3 };
};
const variant = (id: string) => write(id, KYOTORI_PARTS.filter((p) => Object.values(KYOTORI_VARIANT_SLOTS[id]).includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.3 }), at: [p.place.x, p.y0, p.place.z] as V3 })));
const close = (name: string, eye: V3, target: V3, fov: number, shadow = 80, extra: Record<string, unknown> = {}) => ({ name, eye, target, up: [0, 1, 0], size: [1600, 900], fov, shadow, shadowBias: 0.004, look: "painted", sunDir: [0.5, 0.5, 0.8], ...extra });
const fit = (b: { min: V3; max: V3 }, name: string, dir: V3, up: V3, extra: Record<string, unknown> = {}) => {
  const len = b.max[1] - b.min[1];
  const mid: V3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  return { name, eye: [mid[0] + dir[0] * len, mid[1] + dir[1] * len, mid[2] + dir[2] * len], target: mid, up, size: [1800, 900], fill: 0.85, shadow: len * 0.7, shadowBias: 0.004, look: "painted", sunDir: [0.35, 1, 0.45], ...extra };
};
const jobs: unknown[] = [];
const main = variant("kyotori");
jobs.push({ glb: main.file, shots: [
  fit(main, "kyotori-three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), fit(main, "kyotori-plan", [0, 0, 1], [0, 1, 0]),
  close("kyotori-station", [150, 520, 190], [0, 380, 0], 38, 200), close("kyotori-visitors", [60, 300, 70], [0, 310, 48], 46, 90), close("kyotori-visitors2", [-40, 310, -110], [0, 310, -48], 46, 90),
  close("kyotori-housing", [28, 310, 50], [0, 340, 0], 48, 70), close("kyotori-hub", [40, 400, 44], [0, 366, 6], 52, 60), close("kyotori-wings", [70, 430, 70], [18, 384, 18], 40, 90),
] });
for (const id of ["kyotori-flared", "kyotori-stowed"]) jobs.push({ glb: variant(id).file, shots: [close(`${id}-station`, [150, 520, 190], [0, 380, 0], 38, 200), close(`${id}-wings`, [70, 430, 70], [18, 384, 18], 40, 90)] });
const four = variant("kyotori-four");
jobs.push({ glb: four.file, shots: [fit(four, "kyotori-four-three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), fit(four, "kyotori-four-plan", [0, 0, 1], [0, 1, 0]), close("kyotori-four-aft", [0, -120, 140], [0, 60, 0], 50, 200, { up: [0, 0, 1] }), close("kyotori-four-housing", [60, 290, 70], [0, 335, 0], 48, 90)] });
const sep = variant("kyotori-separated");
jobs.push({ glb: sep.file, shots: [fit(sep, "kyotori-separated-three-quarter", [0.9, 0.7, 0.6], [0, 0, 1])] });
const cut = variant("kyotori-cutaway");
jobs.push({ glb: cut.file, shots: [close("kyotori-cut-quarter", [48, 300, 0.1], [48, 362, 0], 34, 90, { up: [1, 0, 0] }), close("kyotori-cut-quarter2", [-60, 330, 12], [-44, 362, 0], 40, 70), close("kyotori-cut-top", [0, 460, 0.1], [0, 362, 0], 36, 160, { up: [0, 0, 1] })] });
for (const L of ["a", "b", "c", "d"]) {
  const one = variant(`kyotori-${L}`);
  jobs.push({ glb: one.file, shots: [fit(one, `kyotori-${L}-three-quarter`, [0.9, 0.7, 0.6], [0, 0, 1]), close(`kyotori-${L}-role`, [80, 190, 80], [20, 190, 0], 58, 100)] });
}
// the lineup, beside Hanabusa (611 m), Miyamoto (380 m) and a Starship stack
const slotsH = Object.values(HANABUSA_VARIANT_SLOTS.hanabusa);
const hana = write("hanabusa", HANABUSA_PARTS.filter((p) => slotsH.includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.3 }), at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] as V3 })));
const slotsM = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
const miya = write("miyamoto", MIYAMOTO_PARTS.filter((p) => slotsM.includes(p.id)).map((p) => ({ name: p.id, pieces: p.pieces({ detail: 0.3 }), at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] as V3 })));
const entry = (id: string) => PART_ENTRIES.find((e) => e.record.id === id) as { pieces: () => Piece[]; record: { height: number } };
const boosterH = entry("starship-v3-booster").record.height;
const star = write("starship", [{ name: "booster", pieces: entry("starship-v3-booster").pieces(), at: [0, 0, 0] }, { name: "ship", pieces: entry("starship-v3-ship").pieces(), at: [0, boosterH, 0] }]);
jobs.push({ glb: main.file, more: [{ glb: hana.file, at: [-330, 0, 0] }, { glb: miya.file, at: [200, 0, 0] }, { glb: star.file, at: [340, 0, 0] }], shots: [{ name: "kyotori-lineup", eye: [20, 320, 2200], target: [20, 320, 0], up: [0, 1, 0], ortho: 700, size: [2000, 800], shadow: 700, shadowBias: 0.004, look: "painted", sunDir: [0.3, 0.5, 1] }] });
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
