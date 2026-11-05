// The pictures of the three Kaminari concepts, from the real model: `node scripts/concept-shots.ts <folder>` writes the .glb of each concept and of the craft beside it (Starship with Super Heavy, ISV Miyamoto and,
// when its worktree is there to read, ISV Hanabusa's latest concept) and `jobs.json`, which `node scripts/concept-render.ts <folder>/jobs.json <folder>/png` draws in a headless browser in software. Every craft stands nose
// up on one ground, at its true size and apart from the others: the lineup boards. Not part of the package.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { coarsen, detail } from "../src/model/detail.ts";
import { BERTHS, CONCEPT_KEYS, CONCEPT_SLOTS, type ConceptKey, ROCKET_OF, SPECS } from "../src/model/fleet/kaminari-concepts/index.ts";
import { miyamoto } from "../src/model/fleet/kaminari-concepts/c.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/concept-shots.ts <folder>");
mkdirSync(out, { recursive: true });
type V3 = [number, number, number];

const save = (name: string, pieces: Piece[], at: V3 = [0, 0, 0]): string => {
  const file = join(out, `${name}.glb`);
  writeFileSync(file, toGlb([{ name, mesh: meshOf(pieces), at }]).bytes);
  return file;
};

// the craft beside: Starship with Super Heavy (Block 3) and ISV Miyamoto, as the package draws them, and Hanabusa's latest concept when it can be read
const refs: { id: string; name: string; file: string; min: V3; max: V3 }[] = [];
{
  const stack = build({ rocket: "starship", variant: "v3" }, { detail: "full" });
  const b = stack.boundsOf("together");
  writeFileSync(join(out, "ref-starship.glb"), stack.glb().bytes);
  refs.push({ id: "starship", name: "Starship with Super Heavy", file: join(out, "ref-starship.glb"), min: b.min as V3, max: b.max as V3 });
  const m = coarsen(miyamoto(1, "fine"));
  const mb = boundsOf(meshOf(m));
  refs.push({ id: "miyamoto", name: "ISV Miyamoto", file: save("ref-miyamoto", m), min: mb.min as V3, max: mb.max as V3 });
  const w4 = process.env.HANABUSA_W4 ?? "";
  if (w4 && existsSync(w4)) {
    const { ship4 } = (await import(w4)) as { ship4: () => Piece[] };
    const h = coarsen(ship4());
    const hb = boundsOf(meshOf(h));
    refs.push({ id: "hanabusa", name: "ISV Hanabusa, concept W4", file: save("ref-hanabusa", h), min: hb.min as V3, max: hb.max as V3 });
  }
}

const concepts = CONCEPT_KEYS.map((key) => {
  detail.level = "coarse";
  const parts = CONCEPT_SLOTS[key].map((slot) => ({ name: slot.slot, mesh: meshOf(coarsen(slot.pieces())), at: slot.at }));
  detail.level = "full";
  const file = join(out, `concept-${key}.glb`);
  writeFileSync(file, toGlb(parts).bytes);
  const b = build({ rocket: ROCKET_OF[key], variant: SPECS[key].id }, { detail: "coarse" }).boundsOf("together");
  return { key, file, min: b.min as V3, max: b.max as V3 };
});

/** Where each craft beside stands, on the side of the concept that a view looks from: a row along `axis` (0 across, 2 up), nearest first, with 24 m between. */
function row(axis: 0 | 2, sign: 1 | -1, edge: number, only?: readonly string[]): { id: string; at: V3 }[] {
  let cursor = edge + 30;
  const placed: { id: string; at: V3 }[] = [];
  for (const ref of refs.filter((r) => !only || only.includes(r.id)).sort((a, b) => b.max[0] - b.min[0] - (a.max[0] - a.min[0]))) {
    const half = axis === 0 ? Math.max(Math.abs(ref.min[0]), ref.max[0]) : Math.max(Math.abs(ref.min[2]), ref.max[2]);
    const at: V3 = [0, 0, 0];
    at[axis] = sign * (cursor + half);
    cursor += 2 * half + 24;
    placed.push({ id: ref.id, at });
  }
  return placed;
}

const lit = (key: ConceptKey): { at: V3; dir: V3; r: number; len: number }[] => {
  const plumes: { at: V3; dir: V3; r: number; len: number }[] = [];
  for (const slot of CONCEPT_SLOTS[key].filter((s) => s.kind === "engine")) {
    detail.level = "coarse";
    for (const p of slot.pieces())
      if (p.kind === "lathe" && p.material === "bell") plumes.push({ at: [(p.at?.[0] ?? 0) + slot.at[0], p.profile[0][1] + slot.at[1], (p.at?.[1] ?? 0) + slot.at[2]], dir: [0, -1, 0], r: p.profile[0][0] * 1.2, len: 120 });
    detail.level = "full";
  }
  return plumes;
};

const H = 2000;
const jobs: unknown[] = [];
const wide = (lo: number, hi: number): number => Math.ceil((hi - lo + 140) / 20) * 20;
for (const c of concepts) {
  const hx = Math.max(Math.abs(c.min[0]), c.max[0]);
  const hzRight = c.max[2];
  const mid = (c.min[1] + c.max[1]) / 2;
  // each view puts the craft beside on the side it looks from, and the picture is as wide as the row and no wider
  const extent = (placed: { id: string; at: V3 }[], axis: 0 | 2, own: readonly [number, number]): [number, number] => {
    let lo = own[0];
    let hi = own[1];
    for (const r of placed) {
      const ref = refs.find((x) => x.id === r.id)!;
      lo = Math.min(lo, r.at[axis] + ref.min[axis]);
      hi = Math.max(hi, r.at[axis] + ref.max[axis]);
    }
    return [lo, hi];
  };
  const files = (placed: { id: string; at: V3 }[]) => placed.map((r) => ({ glb: refs.find((x) => x.id === r.id)!.file, at: r.at }));
  const topRow = row(0, -1, hx);
  const sideRow = row(2, 1, hzRight);
  const frontRow = row(0, 1, hx);
  const [tx0, tx1] = extent(topRow, 0, [c.min[0], c.max[0]]);
  const [sz0, sz1] = extent(sideRow, 2, [c.min[2], c.max[2]]);
  const [fx0, fx1] = extent(frontRow, 0, [c.min[0], c.max[0]]);
  const base = { glb: c.file };
  jobs.push({ ...base, more: files(topRow), shots: [{ name: `${c.key}-top`, eye: [(tx0 + tx1) / 2, mid, 3000], target: [(tx0 + tx1) / 2, mid, 0], up: [0, 1, 0], ortho: 2000, size: [wide(tx0, tx1), H], look: "painted", shadow: 1300, sunDir: [0.2, 0.3, 1] }] });
  jobs.push({ ...base, more: files(sideRow), shots: [{ name: `${c.key}-side`, eye: [3000, mid, (sz0 + sz1) / 2], target: [0, mid, (sz0 + sz1) / 2], up: [0, 1, 0], ortho: 2000, size: [wide(sz0, sz1), H], look: "painted", shadow: 1300, sunDir: [1, 0.3, 0.5] }] });
  jobs.push({ ...base, more: files(frontRow), shots: [{ name: `${c.key}-front`, eye: [(fx0 + fx1) / 2, 3000, 0], target: [(fx0 + fx1) / 2, 0, 0], up: [0, 0, 1], ortho: 700, size: [wide(fx0, fx1), 700], look: "painted", shadow: 700, sunDir: [0.3, 1, 0.6] }] });
  // the three-quarter views look at the same row as the top
  const cx = (tx0 + tx1) / 2;
  const view = { eye: [cx + 900, -700, 1100] as V3, target: [cx, mid, 0] as V3, up: [0, 1, 0] as V3, fov: 28, size: [wide(tx0, tx1) + 300, H] as [number, number], shadow: 1300, fill: 0.92 };
  jobs.push({ ...base, more: files(topRow), shots: [{ name: `${c.key}-3q`, ...view, look: "painted", sunDir: [0.5, 0.5, 0.8] }] });
  jobs.push({ ...base, more: files(topRow), shots: [{ name: `${c.key}-lit`, ...view, look: "lit", plumes: lit(c.key), glow: 2.2 }] });
  // no fill: the fitter would back the camera up until the whole kilometre-long hull fits, and a docked craft would vanish
  const berth = BERTHS[c.key][0];
  const face = berth.direction[0] || 1;
  jobs.push({ ...base, shots: [{ name: `${c.key}-berth`, eye: [berth.at[0] + face * 90, berth.at[1] - 30, berth.at[2] + 150], target: [berth.at[0], berth.at[1], berth.at[2]], up: [0, 1, 0], fov: 42, size: [1400, 900], look: "painted", shadow: 180, sunDir: [0.4, 0.55, 0.7] }] });
}
{
  const deployed = build({ rocket: "fleet-emiake", variant: "fleet-emiake-deployed" }, { detail: "coarse" });
  const file = join(out, "emiake-deployed.glb");
  writeFileSync(file, deployed.glb().bytes);
  const box = deployed.boundsOf("together");
  const mid = (box.min[1] + box.max[1]) / 2;
  jobs.push({ glb: file, shots: [
    { name: "b-sails-deployed", eye: [900, mid - 400, 700], target: [0, mid, 40], up: [0, 1, 0], fov: 28, size: [1600, 1200], look: "painted", shadow: 900, fill: 0.9, sunDir: [0.4, 0.5, 0.8] },
    { name: "b-sails-end", eye: [0, 1040, 36], target: [0, 480, 36], up: [0, 0, 1], fov: 26, size: [1400, 900], look: "painted", shadow: 240, sunDir: [0.3, -0.5, 0.85] },
    { name: "b-sail-hinge", eye: [42, 990, 30], target: [42, 640, 30], up: [0, 0, 1], fov: 20, size: [1400, 900], look: "painted", shadow: 90, sunDir: [0.4, -0.3, 0.85] },
  ] });
}
// all three side by side, with the craft beside once, from the dorsal side and from starboard
{
  const edges = concepts.map((c) => Math.max(Math.abs(c.min[0]), c.max[0]));
  const gap = 50;
  let cursor = 0;
  const xs = edges.map((e) => {
    const at = cursor + e;
    cursor += 2 * e + gap;
    return at;
  });
  const total = cursor - gap;
  const shift = -total / 2;
  const topAt = (i: number): V3 => [shift + xs[i], 0, 0];
  const refRow = row(0, -1, -shift).map((r) => ({ glb: refs.find((x) => x.id === r.id)!.file, at: r.at }));
  jobs.push({
    glb: concepts[1].file,
    more: [{ glb: concepts[0].file, at: [topAt(0)[0] - topAt(1)[0], 0, 0] }, { glb: concepts[2].file, at: [topAt(2)[0] - topAt(1)[0], 0, 0] }, ...refRow.map((r) => ({ glb: r.glb, at: [r.at[0] - topAt(1)[0], 0, 0] as V3 }))],
    shots: [
      { name: "all-top", eye: [0, 900, 3000], target: [0, 900, 0], up: [0, 1, 0], ortho: 2000, size: [2400, 2000], look: "painted", shadow: 1500, sunDir: [0.2, 0.3, 1] },
      { name: "all-3q", eye: [1500, -900, 1300], target: [0, 900, 0], up: [0, 1, 0], fov: 30, size: [2400, 2000], look: "painted", shadow: 1500, fill: 0.9, sunDir: [0.5, 0.5, 0.8] },
    ],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs.filter((j) => (j as { shots: unknown[] }).shots.length), null, 1));
writeFileSync(join(out, "refs.json"), JSON.stringify({ refs: refs.map(({ id, name, min, max }) => ({ id, name, min, max })), concepts: concepts.map(({ key, min, max }) => ({ key, min, max })) }, null, 1));
console.log(`${jobs.length} jobs, ${refs.length} craft beside, in ${out}`);
