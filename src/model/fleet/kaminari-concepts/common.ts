// What the three concepts share: the shape of a slot (a module of the ship, where it stands, how to build it), the long truss, the bundle of slim tanks, a stack of the kit's crew modules, a radiator fin
// and a reactor cell. Every shape is built once and stamped at a pose, so a ship of a hundred thousand pieces builds in about a second. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { annulus, collar, foilBand, hoop, KIT, type Piece, place, porthole, revolve, rod, stamp, tileShield, type Vec3 } from "./adapter.ts";
import { cub, deg } from "./adapter.ts";

/** One module of a concept: its slot, where its base stands (metres: x across, y from the tail, z dorsal), its size and how to build its pieces in its own frame. */
export interface ConceptSlot {
  slot: string;
  name: string;
  kind: PartKind;
  at: readonly [number, number, number];
  /** Along the ship's axis, metres. */
  height: number;
  /** The widest across the axis, metres. */
  diameter: number;
  /** What it is, in a line, and the real hardware it descends from. */
  note: string;
  pieces: () => Piece[];
}

/** The standard conceptual density of a propellant mix in the tanks, tonnes a cubic metre (a dense solid-hydrogen and deuterium slush with a metal-hydride carrier: 0.85, as the shipped design's tanks hold). */
export const PROPELLANT_T_PER_M3 = 0.85;

/** How many tonnes a cylindrical tank with domed ends holds: the straight part plus two 2:1 domes. */
export const tankVolumeM3 = (r: number, length: number): number => Math.PI * r * r * (length - r) + (2 * Math.PI * r * r * r) / 3;

/** The truss: a square lattice `half` metres from the axis to the chords, a `bay` long; chords, frames, diagonals that turn each bay, joint nodes, and four service lines the whole length. Standing from y0 to y1; each chord is one piece the line drawings carry. */
export function truss(half: number, bay: number, y0: number, y1: number): Piece[] {
  const c = half - 0.9;
  const bays = Math.round((y1 - y0) / bay);
  const length = bays * bay;
  const out: Piece[] = [];
  const chord = half * 0.075;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(rod("hull-grey", [sx * c, y0, sz * c], [sx * c, y0 + length, sz * c], chord, 10, { only: undefined }));
  const frame = (): Piece[] => {
    const f: Piece[] = [];
    for (const s of [-1, 1]) f.push(rod("hull-grey-dark", [-c, 0, s * c], [c, 0, s * c], chord * 0.7, 8), rod("hull-grey-dark", [s * c, 0, -c], [s * c, 0, c], chord * 0.7, 8));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.push(cub("engine-metal", [sx * c - chord * 1.9, sx * c + chord * 1.9], [-chord * 1.6, chord * 1.6], [sz * c - chord * 1.9, sz * c + chord * 1.9]));
    return f;
  };
  const face = (flip: boolean): Piece[] => {
    const f: Piece[] = [];
    const d = flip ? 1 : -1;
    f.push(rod("hull-grey", [-c, flip ? 0 : bay, c], [c, flip ? bay : 0, c], chord * 0.6, 8), rod("hull-grey", [-c, flip ? bay : 0, -c], [c, flip ? 0 : bay, -c], chord * 0.6, 8));
    f.push(rod("hull-grey", [c, flip ? 0 : bay, -c], [c, flip ? bay : 0, c], chord * 0.6, 8), rod("hull-grey", [-c, flip ? bay : 0, -c], [-c, flip ? 0 : bay, c], chord * 0.6, 8));
    void d;
    return f;
  };
  const frames = frame();
  const odd = face(true);
  const even = face(false);
  for (let i = 0; i <= bays; i++) out.push(...place(frames, { at: [0, y0 + i * bay, 0] }));
  for (let i = 0; i < bays; i++) out.push(...place(i % 2 ? odd : even, { at: [0, y0 + i * bay, 0] }));
  // four service lines the length of the truss, on the faces, in colour that says what each carries; a bracket on every fourth bay
  const lines: [number, number, "coolant" | "hull-orange" | "hull-white" | "hull-yellow"][] = [[0, half + 0.9, "coolant"], [half + 0.9, 0, "hull-orange"], [0, -(half + 0.9), "hull-white"], [-(half + 0.9), 0, "hull-yellow"]];
  for (const [x, z, m] of lines) out.push(rod(m, [x, y0, z], [x, y0 + length, z], 0.5, 8, { only: undefined }));
  const bracket = [cub("black", [-0.9, 0.9], [-0.7, 0.7], [-0.9, 0.9])];
  for (let i = 1; i < bays; i += 4) for (const [x, z] of lines) out.push(...place(bracket, { at: [x * 0.92, y0 + i * bay + bay / 2, z * 0.92] }));
  return out;
}

/** A round ring frame that holds a bundle of tanks: a hoop with spokes in to the truss, braced, at height y. */
export function ringFrame(ringR: number, tankR: number, half: number, y: number, seed: number): Piece[] {
  const out: Piece[] = [hoop("hull-grey-dark", ringR, y, tankR * 0.09, 56, 8, { outline: true }), hoop("hull-grey", ringR - tankR * 1.05, y, tankR * 0.05, 40, 6), hoop("hull-grey", ringR + tankR * 1.05, y, tankR * 0.05, 40, 6)];
  for (let k = 0; k < 8; k++) {
    const a = deg(45 * k + 22.5 * (seed % 2));
    out.push(rod("hull-grey", [(half - 1) * Math.sin(a), y, (half - 1) * Math.cos(a)], [ringR * Math.sin(a), y, ringR * Math.cos(a)], tankR * 0.07, 8));
  }
  return out;
}

export interface Bundle {
  count: number;
  ringR: number;
  tankR: number;
  length: number;
}

const tankCache = new Map<string, Piece[]>();

/**
 * One cryogenic barrel, built once and stamped. A shell steps down to L collars, with girth rings, insulation cuffs at the shoulders and four hatches.
 * The kit drum's quilt is not copied onto every tank: that quilt is most of the triangles, and a quiver carries forty-eight of them.
 */
export function repeatedTank(r: number, length: number, detail = 0.4): Piece[] {
  const key = `${r}/${length}/${detail}`;
  const hit = tankCache.get(key);
  if (hit) return hit;
  const neck = 6;
  const shoulder = Math.min(2.4, length * 0.04);
  const y0 = shoulder;
  const y1 = length - shoulder;
  const span = y1 - y0;
  const cell = Math.max(0.9, (r * 0.1) / Math.max(detail, 0.25));
  const cuff = Math.min(1.6, span * 0.03);
  const out: Piece[] = [
    revolve("hull-white", [[neck, 0], [r, y0], [r, y1], [neck, length]], 32, [0, 0], { body: true, outline: true, welds: [y0, y1] }),
    ...collar("L", 0, -1),
    ...collar("L", length, 1),
  ];
  for (const f of [0.25, 0.5, 0.75]) out.push(hoop("hull-grey-dark", r + 0.12, y0 + span * f, Math.max(0.1, r * 0.018), 32, 6));
  out.push(...foilBand("blanket", r + 0.05, y0, y0 + cuff, 0, 2 * Math.PI, `${key}/a`, cell, 0.03));
  out.push(...foilBand("blanket-worn", r + 0.05, y1 - cuff, y1, 0, 2 * Math.PI, `${key}/b`, cell, 0.03));
  out.push(rod("pipe-steel", [r + 0.3, y0 + 1, 0], [r + 0.3, y1 - 1, 0], Math.max(0.12, r * 0.02), 8));
  for (const a of [0, 90, 180, 270]) {
    const rad = deg(a);
    const x = (r + 0.2) * Math.sin(rad);
    const z = (r + 0.2) * Math.cos(rad);
    const y = y0 + span * (a % 180 === 0 ? 0.38 : 0.62);
    const hatch = a === 90 ? "hull-orange" : "hull-grey";
    if (a % 180 === 0) out.push(cub(hatch, [x - r * 0.08, x + r * 0.08], [y - r * 0.12, y + r * 0.12], [z - 0.16, z + 0.16]));
    else out.push(cub(hatch, [x - 0.16, x + 0.16], [y - r * 0.12, y + r * 0.12], [z - r * 0.08, z + r * 0.08]));
  }
  tankCache.set(key, out);
  return out;
}

const drumCache = new Map<string, Piece[]>();

/** One habitat drum, built once and stamped: a shell, end rings and two rows of windows. The kit drum's plating is not copied onto every drum. */
export function repeatedDrum(r: number, length: number): Piece[] {
  const key = `${r}/${length}`;
  const hit = drumCache.get(key);
  if (hit) return hit;
  const out: Piece[] = [
    revolve("hull-white", [[r * 0.7, 0], [r, 1.8], [r, length - 1.8], [r * 0.7, length]], 28, [0, 0], { body: true, outline: true, welds: [1.8, length / 2, length - 1.8] }),
    hoop("hull-grey-dark", r + 0.16, 1.8, 0.16, 28, 6),
    hoop("hull-grey-dark", r + 0.16, length - 1.8, 0.16, 28, 6),
  ];
  for (let k = 0; k < 6; k++) {
    out.push(...porthole(r, deg(60 * k), length * 0.34, 0.65, "open"));
    out.push(...porthole(r, deg(60 * k + 30), length * 0.66, 0.65, k % 2 === 0 ? "open" : "closed"));
  }
  out.push(rod("hull-grey", [r + 0.4, 3, 0], [r + 0.4, length - 3, 0], 0.08, 6));
  drumCache.set(key, out);
  return out;
}

/** A bundle of slim tanks round the truss: `count` of them on a ring, one barrel drawn once and stamped, held at both ends by a ring frame and tied to the truss, with a feed ring of pipe round the heads. y is the foot of the tanks. */
export function bundle(b: Bundle, half: number, y: number, seed: number, detail = 0.4): Piece[] {
  const template = repeatedTank(b.tankR, b.length, detail);
  const poses = Array.from({ length: b.count }, (_, i) => ({ at: [b.ringR * Math.sin(deg((360 * i) / b.count)), y, b.ringR * Math.cos(deg((360 * i) / b.count))] as Vec3, yaw: (360 * i) / b.count }));
  const out: Piece[] = stamp(template, poses);
  out.push(...ringFrame(b.ringR, b.tankR, half, y + 4, seed), ...ringFrame(b.ringR, b.tankR, half, y + b.length - 4, seed + 1));
  // the feed ring: a pipe ring round the tank heads with a branch down to each
  out.push(hoop("pipe-steel", b.ringR, y + b.length + 1.2, b.tankR * 0.06, 56, 8), hoop("coolant", b.ringR, y - 1.2, b.tankR * 0.06, 56, 8));
  for (let i = 0; i < b.count; i++) {
    const a = deg((360 * i) / b.count);
    out.push(rod("pipe-steel", [b.ringR * Math.sin(a), y + b.length - 2, b.ringR * Math.cos(a)], [b.ringR * Math.sin(a), y + b.length + 1.2, b.ringR * Math.cos(a)], b.tankR * 0.05, 8));
  }
  return out;
}

/** The kit's modules stood end to end from y0, each at its own length: where each stands and the pieces. */
export function stackOf(ids: readonly string[], y0: number, detail: number, seed = "s"): { pieces: Piece[]; end: number; at: Map<string, number> } {
  const pieces: Piece[] = [];
  const at = new Map<string, number>();
  let y = y0;
  ids.forEach((id, i) => {
    const m = KIT[id];
    if (!m) throw new Error(`no module ${id}`);
    pieces.push(...place(m.pieces({ detail, seed: `${seed}${i}` }), { at: [0, y, 0] }));
    at.set(id, y);
    y += m.length;
  });
  return { pieces, end: y, at };
}

/** A radiator fin: a flat, thin wing from the truss out to `reach`, along y from y0 to y1, at azimuth `az`: a boom truss at the root, four coolant headers, panels of white quilted radiator in bays with a rib at each, and a hinge strut at every bay. Built to be seen edge-on from a long way and up close. */
export function radiatorFin(az: number, r0: number, reach: number, y0: number, y1: number, bays: number, seed: number): Piece[] {
  const n: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  const t: Vec3 = [n[2], 0, -n[0]];
  const at = (r: number, y: number, side = 0): Vec3 => [n[0] * r + t[0] * side, y, n[2] * r + t[2] * side];
  const out: Piece[] = [];
  const bay = (y1 - y0) / bays;
  // the boom: two chords along the root and cross-ties at each bay
  for (const s of [-1, 1]) out.push(rod("hull-grey", at(r0, y0, s * 1.4), at(r0, y1, s * 1.4), 0.5, 8, { only: undefined }));
  for (let i = 0; i <= bays; i++) out.push(rod("hull-grey-dark", at(r0, y0 + i * bay, -1.4), at(r0, y0 + i * bay, 1.4), 0.35, 8), rod("hull-grey", at(r0 + reach, y0 + i * bay, 0), at(r0, y0 + i * bay, 0), 0.22, 6));
  // each bay is a panel on a frame: a flat plate with ribs and four coolant headers on each face
  const frameOf = (r: number, y: number) => ({ o: at(r, y), u: n, v: [0, 1, 0] as Vec3, w: t });
  for (let i = 0; i < bays; i++) {
    const y = y0 + (i + 0.5) * bay;
    out.push({ kind: "plate", material: i === 0 && seed % 2 === 0 ? "radiator-hot" : "radiator", frame: frameOf(r0 + reach / 2, y), outline: [[-reach / 2, -bay / 2 + 0.6], [reach / 2, -bay / 2 + 0.6], [reach / 2, bay / 2 - 0.6], [-reach / 2, bay / 2 - 0.6]], thickness: 0.25, ribs: Array.from({ length: 6 }, (_, k) => [[-reach / 2, -bay / 2 + 0.6 + ((k + 1) * (bay - 1.2)) / 7], [reach / 2, -bay / 2 + 0.6 + ((k + 1) * (bay - 1.2)) / 7]] as const), quilt: undefined });
    for (let k = 0; k < 4; k++) out.push(rod("copper", at(r0 + 2, y - bay / 2 + 1 + ((k + 0.5) * (bay - 2)) / 4, 0.2), at(r0 + reach - 2, y - bay / 2 + 1 + ((k + 0.5) * (bay - 2)) / 4, 0.2), 0.12, 6));
    out.push(rod("hull-grey", at(r0 + reach, y - bay / 2 + 0.6, 0), at(r0 + reach, y + bay / 2 - 0.6, 0), 0.3, 6));
  }
  out.push(rod("lamp-amber", at(r0 + reach, y1 - 1, 0), at(r0 + reach, y1, 0), 0.5, 8), rod("lamp-red", at(r0 + reach, y0, 0), at(r0 + reach, y0 + 1, 0), 0.5, 8));
  return out;
}

/** The reactor cells: `rows` of `count` of the kit's fusion reactor modules round the axis at radius `r`, from y, with a cooling-loop ring between each row. */
export function reactorCells(count: number, r: number, rows: number, y: number, detail = 0.6): { pieces: Piece[]; end: number } {
  const module = KIT["reactor-fusion"];
  const out: Piece[] = [];
  for (let row = 0; row < rows; row++) {
    const poses = Array.from({ length: count }, (_, i) => ({ at: [r * Math.sin(deg((360 * i) / count + 45 * (row % 2))), y + row * (module.length + 1.5), r * Math.cos(deg((360 * i) / count + 45 * (row % 2)))] as Vec3 }));
    out.push(...stamp(module.pieces({ detail, seed: `rx${row}` }), poses));
    out.push(hoop("coolant", r, y + row * (module.length + 1.5) + module.length + 0.7, 0.45, 40, 8));
  }
  return { pieces: out, end: y + rows * (module.length + 1.5) };
}

/** A solid round cone or dome shield with a tile mosaic: the dust-and-radiation shield at the bow and the shadow shield at the drive. */
export function shieldDisc(rBack: number, rFront: number, y0: number, y1: number, seed: string): Piece[] {
  const profile: [number, number][] = [[rBack, y0 + 1.5], [rFront, y1 - 1.5]];
  return [revolve("hull-grey-dark", [[rBack, y0], [rBack, y0 + 1.5], [rFront, y1 - 1.5], [rFront * 0.4, y1], [0.01, y1]], 56, [0, 0], { body: true, outline: true }), annulus("hull-orange", rBack * 0.92, rBack, y0 + 0.2, y0 + 1.6, 56, { outline: true }), ...tileShield(profile, seed, 48, 24)];
}

/** The reactor modules in rows across the hull: `cols` of them `pitch` apart across x, `rows` deep along y. */
export function reactorRows(cols: number, pitch: number, rows: number, y: number, detail = 0.6): { pieces: Piece[]; end: number } {
  const module = KIT["reactor-fusion"];
  const out: Piece[] = [];
  for (let row = 0; row < rows; row++) {
    const poses = Array.from({ length: cols }, (_, i) => ({ at: [(i - (cols - 1) / 2) * pitch, y + row * (module.length + 1.5), 0] as Vec3 }));
    out.push(...stamp(module.pieces({ detail, seed: `rr${row}` }), poses));
    out.push(rod("coolant", [-((cols - 1) / 2) * pitch, y + row * (module.length + 1.5) + module.length + 0.7, 0], [((cols - 1) / 2) * pitch, y + row * (module.length + 1.5) + module.length + 0.7, 0], 0.45, 8));
  }
  return { pieces: out, end: y + rows * (module.length + 1.5) };
}
