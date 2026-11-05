// Kyotori V2, the pictures: `node scripts/ship-kyotori-v2.ts <folder> [set]` builds the station and the parts of V2 from the real code and draws them with scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { PART_ENTRIES } from "../src/index.ts";
import { HANABUSA_PARTS, HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { station } from "../src/model/fleet/ship-kyotori/station.ts";
import { bay, bowLong, bowRunner, figuredMirror, insulatedTank, latchHalf } from "../src/model/fleet/ship-kyotori/hardware.ts";
import { v2 } from "../src/model/fleet/ship-kyotori/v2.ts";
import { place } from "../src/model/fleet/ship-kyotori/adapter.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "kyotori-v2");
const only = process.argv[3] ?? "";
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const write = (name: string, pieces: Piece[]) => {
  const t = performance.now();
  const mesh = meshOf(pieces);
  const ms = Math.round(performance.now() - t);
  const file = join(out, "glb", `${name}.glb`);
  const glb = toGlb([{ name, mesh, at: [0, 0, 0] }]).bytes;
  writeFileSync(file, glb);
  const b = boundsOf(mesh);
  let tri = 0;
  for (const f of mesh.faces.values()) tri += f.indices.length / 3;
  console.log(name, "pieces", pieces.length, "triangles", tri, "mesh ms", ms, "glb MB", (glb.length / 1e6).toFixed(1), "size", b.max.map((v, i) => (v - b.min[i]).toFixed(0)).join("x"));
  return { file, min: b.min as V3, max: b.max as V3 };
};
const close = (name: string, eye: V3, target: V3, fov: number, shadow = 80, extra: Record<string, unknown> = {}) => ({ name, eye, target, up: [0, 1, 0], size: [1600, 900], fov, shadow, shadowBias: 0.004, look: "painted", sunDir: [0.5, 0.5, 0.8], ...extra });
const jobs: unknown[] = [];
if (!only || only === "station") {
  const dep = write("station-deployed", station({ wings: "full", cutQuarter: 1 }));
  jobs.push({ glb: dep.file, shots: [
    close("station-three-quarter", [150, 520, 190], [0, 380, 0], 38, 200),
    close("station-front", [0, 560, 0.1], [0, 362, 0], 36, 160, { up: [0, 0, 1] }),
    close("station-side", [240, 380, 0], [0, 380, 0], 30, 200),
    close("station-quarter-cut", [48, 300, 0.1], [48, 362, 0], 34, 90, { up: [1, 0, 0] }),
    close("station-quarter-cut2", [72, 318, 24], [46, 362, 0], 40, 70),
    close("station-hub", [40, 400, 44], [0, 366, 6], 52, 60),
    close("station-stub", [90, 420, 60], [0, 380, 58], 42, 90),
    close("station-housing", [28, 310, 50], [0, 340, 0], 48, 70),
  ] });
  const stow = write("station-stowed", station({ wings: "stowed" }));
  jobs.push({ glb: stow.file, shots: [close("station-stowed-three-quarter", [150, 520, 190], [0, 380, 0], 38, 200)] });
}
if (!only || only === "ships") {
  const j = write("v2-joined", v2("joined", { wings: "full" }));
  const len = j.max[1] - j.min[1];
  const mid: V3 = [(j.min[0] + j.max[0]) / 2, (j.min[1] + j.max[1]) / 2, (j.min[2] + j.max[2]) / 2];
  const fit = (name: string, dir: V3, up: V3) => ({ name, eye: [mid[0] + dir[0] * len, mid[1] + dir[1] * len, mid[2] + dir[2] * len], target: mid, up, size: [1800, 900], fill: 0.85, shadow: len * 0.7, shadowBias: 0.004, look: "painted", sunDir: [0.35, 1, 0.45] });
  jobs.push({ glb: j.file, shots: [fit("v2-joined-three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), fit("v2-joined-plan", [0, 0, 1], [0, 1, 0])] });
  const sp = write("v2-separated", v2("separated", { wings: "stowed" }));
  const lens = sp.max[1] - sp.min[1];
  const mids: V3 = [(sp.min[0] + sp.max[0]) / 2, (sp.min[1] + sp.max[1]) / 2, (sp.min[2] + sp.max[2]) / 2];
  jobs.push({ glb: sp.file, shots: [{ ...fit("v2-separated-three-quarter", [0.9, 0.7, 0.6], [0, 0, 1]), eye: [mids[0] + 0.9 * lens, mids[1] + 0.7 * lens, mids[2] + 0.6 * lens], target: mids }] });
  const slotsH = Object.values(HANABUSA_VARIANT_SLOTS.hanabusa);
  const hana = write("hanabusa", HANABUSA_PARTS.filter((p) => slotsH.includes(p.id)).flatMap((p) => place(p.pieces({ detail: 0.3 }), { at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] })));
  const slotsM = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
  const miya = write("miyamoto", MIYAMOTO_PARTS.filter((p) => slotsM.includes(p.id)).flatMap((p) => place(p.pieces({ detail: 0.3 }), { at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] })));
  const entry = (id: string) => PART_ENTRIES.find((e) => e.record.id === id) as { pieces: () => Piece[]; record: { height: number } };
  const boosterH = entry("starship-v3-booster").record.height;
  const star = write("starship", [...entry("starship-v3-booster").pieces(), ...place(entry("starship-v3-ship").pieces(), { at: [0, boosterH, 0] })]);
  jobs.push({ glb: j.file, more: [{ glb: hana.file, at: [-330, 0, 0] }, { glb: miya.file, at: [200, 0, 0] }, { glb: star.file, at: [340, 0, 0] }], shots: [{ name: "v2-lineup", eye: [20, 320, 2200], target: [20, 320, 0], up: [0, 1, 0], ortho: 700, size: [2000, 800], shadow: 700, shadowBias: 0.004, look: "painted", sunDir: [0.3, 0.5, 1] }] });
  const parts: [string, Piece[], V3, V3, number][] = [
    ["tank", place(insulatedTank(4.5, 60), { at: [0, 0, 0] }), [20, 40, 24], [0, 56, 0], 40],
    ["bay", bay(0, 100), [60, 48, 34], [0, 20, 0], 56],
    ["mirror", figuredMirror(0), [0, 140, 0.1], [0, -4, 0], 46],
    ["mirror-side", figuredMirror(0), [60, 16, 46], [0, -4, 0], 56],
    ["latch", [...latchHalf(0, 6.35, -13.5, true), ...place(latchHalf(0, 6.35, -13.5, false), { at: [-27, 0, 0], yaw: 180 })], [-13, 0, 28], [-13.5, 0, 0], 38],
    ["bow-long", bowLong(0), [30, 18, 26], [0, 17, 0], 52],
    ["bow-runner", bowRunner(0), [30, 18, 26], [0, 17, 0], 52],
  ];
  for (const [name, pieces, eye, target, fov] of parts) {
    const f = write(`part-${name}`, pieces);
    jobs.push({ glb: f.file, shots: [close(`part-${name}`, eye, target, fov, 60)] });
  }
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
