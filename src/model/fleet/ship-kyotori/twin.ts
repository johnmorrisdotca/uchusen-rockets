// ISV Kyotori's two-shaft idea (John): two parallel shafts joined along their length so she can split into two ships. V1: one shaft is longer and carries the four-arm cross, the shorter ends before the cross and is a lean runner. V2: two equal shafts, and the
// end that carries the cross comes away as a third piece, a station, so the two ships that leave have no wheel. Each ship has its own drive (coil rings, no bell), its own crew space and its own docking port. Parts plus a variant: `twinParts` gives the parts,
// `TWIN_VARIANTS` says where each ship stands joined and apart. Concepts only. Pure: no three.js and no DOM.
import { box, collar, ibeam, KIT, place, rod, separationJoint, type Piece, type Vec3 } from "./adapter.ts";
import { crewPort, elevator, inlineDrive, mod, telescope, truss } from "./parts.ts";
import { cross, framedTank, payloadBay2 } from "./pods.ts";
import { K2 } from "./k2.ts";

const deg = (a: number): number => (a * Math.PI) / 180;

/** Each shaft's axis stands this far from the ship's centre line, so the two trusses are 14 m apart. */
export const SHAFT_X = 13.5;
export type Ship = "A" | "B" | "C";
export type TwinId = "v1" | "v2";
export interface TwinPart {
  id: string;
  ship: Ship;
  pieces: Piece[];
}
export interface TwinVariant {
  id: string;
  /** Where each ship stands from its joined place. */
  apart: Partial<Record<Ship, Vec3>>;
}

const trussEnd = (y0: number, length: number): number => y0 + Math.ceil(length / 24) * 24;

/** Tanks standing round a shaft on its outer side only, so the gap between the shafts stays free for the joints. */
function tanksAt(y0: number, angles: number[], R: number, r: number, len: number): Piece[] {
  const out: Piece[] = [];
  const tank = framedTank(r, len);
  for (const d of angles) {
    const a = deg(d);
    out.push(...place(tank, { at: [R * Math.sin(a), y0, R * Math.cos(a)] }));
    for (const f of [0.1, 0.5, 0.9]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(a), y0 + len * f, 6.6 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}
const bouquet = (): Piece[] => [...tanksAt(90, [30, 90, 150], 14, 4.5, 60), ...tanksAt(98, [0, 60, 120, 180], 25, 3.6, 44)];

/**
 * One half of a joint between the shafts, in a shaft's own frame with the seam on its inner side (-X). The long ship's half carries the hooks and the plugs, the other's the keepers and the sockets: two I-beam arms from the shaft's wall, a
 * hazard-striped face plate, four latch hooks (or keeper lugs), three umbilical plugs (or sockets) with a hose and a copper line each along the arms, and a strobe. Both halves stay on their ships when they part.
 */
function jointHalf(y: number, wall: number, hooks: boolean): Piece[] {
  const seam = -SHAFT_X;
  const face = seam + 0.15;
  const back = seam + 0.65;
  const out: Piece[] = [];
  for (const z of [-3.2, 3.2]) out.push(...ibeam("hull-grey", [-wall * 0.92, y, z], [back, y, z], 1.5, 0.9, [0, 1, 0]));
  out.push(box("hull-grey-dark", [(face + back) / 2, y - 3.6, 0], 0.5, 9.4, 7.2), box("hazard", [face - 0.02, y - 3.4, 0], 0.05, 9.0, 0.5), box("hazard", [face - 0.02, y + 2.9, 0], 0.05, 9.0, 0.5));
  for (const z of [-4.9, 4.9]) for (const dy of [-2.6, 1.6]) {
    if (hooks) out.push(box("hull-grey-dark", [(face + back) / 2, y + dy, z], 1.6, 0.7, 1.4), box("hull-grey", [seam - 0.6, y + dy + 0.35, z], 1.5, 0.5, 0.7), rod("hull-yellow", [seam - 0.2, y + dy + 0.2, z - 0.35], [seam - 0.2, y + dy + 0.2, z + 0.35], 0.07, 6, { only: "mesh" }));
    else out.push(box("hull-grey-dark", [(face + back) / 2, y + dy, z], 1.2, 0.7, 1.4), rod("hull-grey", [seam - 0.1, y + dy + 0.4, z - 0.5], [seam - 0.1, y + dy + 0.4, z + 0.5], 0.14, 8, { only: "mesh" }));
  }
  for (const z of [-1.7, 0, 1.7]) {
    if (hooks) out.push(rod("pipe-steel", [face, y - 0.8, z], [seam - 0.45, y - 0.8, z], 0.17, 8, { only: "mesh" }), rod("lamp-blue", [seam - 0.45, y - 0.8, z], [seam - 0.5, y - 0.8, z], 0.1, 8, { only: "mesh" }));
    else out.push(box("black", [face, y - 1.0, z], 0.4, 0.7, 0.7), rod("hull-grey-dark", [seam + 0.1, y - 0.8, z], [seam + 0.2, y - 0.8, z], 0.28, 8, { only: "mesh" }));
    out.push(rod("pipe-steel", [-wall * 0.92, y + 1.0, z * 0.9], [back, y - 0.8, z], 0.16, 8, { only: "mesh" }), rod("copper", [-wall * 0.92, y + 1.5, z * 0.9], [back, y + 0.1, z], 0.1, 8, { only: "mesh" }));
  }
  out.push(box("lamp-amber", [face - 0.05, y + 2.6, hooks ? 3.6 : -3.6], 0.15, 0.4, 0.4));
  return out;
}

/** The joints between the shafts: where along them (y), and how far each ship's wall stands from its axis there. */
type Station = readonly [y: number, wallA: number, wallB: number];
const frames = (list: readonly Station[]): { a: Piece[]; b: Piece[] } => ({ a: list.flatMap(([y, wa]) => jointHalf(y, wa, true)), b: list.flatMap(([y, , wb]) => jointHalf(y, wb, false)) });

const modules = (ids: readonly string[], y0: number): { pieces: Piece[]; end: number } => {
  const pieces: Piece[] = [];
  let y = y0;
  for (const id of ids) {
    pieces.push(...mod(id, y));
    y += KIT[id].length;
  }
  return { pieces, end: y };
};

/** The runner's crew space: a habitat drum, a common area, a second drum and a navigation deck, on an adapter off the truss. */
const CREW = ["adapter-l-m", "habitat-drum-crew", "common-area-m", "habitat-drum-crew"] as const;

const V1_JOINTS: readonly Station[] = [[48, 7, 7], [68, 7, 7], [96, 6.4, 6.4], [132, 6.4, 6.4], [168, 6.4, 6.4], [204, 6.4, 6.4], [236, 6.4, 6.4], [272, 9, 8], [294, 9, 8], [309, 6.4, 7.5]];
const V2_JOINTS: readonly Station[] = [...V1_JOINTS.slice(0, 9), [316, 6.4, 8], [331, 6.4, 7.5]];

/** The parts of one version, each in its ship's own frame (the shaft's axis up Y, its outer side +X). */
export function twinParts(v: TwinId): TwinPart[] {
  const parts: TwinPart[] = [];
  const add = (id: string, ship: Ship, pieces: Piece[]): void => void parts.push({ id: `${ship.toLowerCase()}-${id}`, ship, pieces });
  const fr = frames(v === "v1" ? V1_JOINTS : V2_JOINTS);
  // ship A: the long ship, with the barrel, the elevator, the crew port, and in V1 the cross
  add("drive", "A", inlineDrive(0, 11));
  add("shaft", "A", [...truss(74, 188), ...truss(302, v === "v1" ? 80 : 24)]);
  add("tanks", "A", bouquet());
  add("bay", "A", [...payloadBay2(262), ...crewPort(308)]);
  add("elevator", "A", elevator(150, v === "v1" ? 380 : 330));
  add("joints", "A", fr.a);
  // ship B: the other shaft with its own drive, tanks, crew port and crew space
  add("drive", "B", inlineDrive(0, 11));
  add("shaft", "B", truss(74, 168));
  add("tanks", "B", bouquet());
  const crew = modules(v === "v1" ? [...CREW, "deck-nav-m", "comms-array-m"] : [...CREW, "lab-m", "deck-nav-m", "comms-array-m", "eva-lock-m"], trussEnd(74, 168));
  add("crew", "B", [...crew.pieces, ...crewPort(228)]);
  add("joints", "B", fr.b);
  if (v === "v1") {
    add("cross", "A", cross({ y: K2.ringY, R: K2.R }));
    const bow = modules(["adapter-l-m", "deck-nav-m"], 382);
    add("bow", "A", [...bow.pieces, ...telescope(bow.end, 24, 19, 19, 5.4).pieces]);
  } else {
    // the two shafts end level at 339 m, B with a spacer; the station's yoke takes both on separation collars
    add("spacer", "B", [{ kind: "lathe", material: "hull-grey", segs: 32, body: true, outline: true, profile: [[6.5, crew.end - 3], [6.5, 339.3]] }]);
    add("spacer", "A", [{ kind: "lathe", material: "hull-grey", segs: 32, body: true, outline: true, profile: [[6.5, 330], [6.5, 339.3]] }]);
    const yoke: Piece[] = [box("hull-grey-dark", [0, 345, 0], 30, 16, 8.4), box("hull-grey", [0, 339.6, 0], 30, 16, 5.4), box("hazard", [0, 344.9, 8.1], 30, 0.1, 0.5)];
    for (const x of [-12, -6, 0, 6, 12]) yoke.push(...ibeam("hull-grey", [x, 345, 8.2], [x, 353, 8.2], 1.0, 0.6, [0, 0, 1]), ...ibeam("hull-grey", [x, 345, -8.2], [x, 353, -8.2], 1.0, 0.6, [0, 0, 1]));
    for (const s of [-1, 1]) {
      yoke.push(...place(separationJoint(6.7, 339.5, { latches: 12, umbilicals: 4 }), { at: [s * SHAFT_X, 0, 0] }));
      yoke.push(...place(collar("L", 0, -1), { at: [s * SHAFT_X, 339.6, 0] }), { kind: "lathe", material: "hull-grey-dark", segs: 32, only: "mesh", at: [s * SHAFT_X, 0], profile: [[8.4, 339.8], [8.4, 346]] }, ...ibeam("hull-grey", [s * 20, 343, 5], [s * 9, 353, 5], 1.4, 0.9, [0, 0, 1]), ...ibeam("hull-grey", [s * 20, 343, -5], [s * 9, 353, -5], 1.4, 0.9, [0, 0, 1]));
    }
    add("yoke", "C", yoke);
    add("cross", "C", cross({ y: K2.ringY, R: K2.R }));
    const bow = modules(["adapter-l-m", "deck-nav-m"], 382);
    add("bow", "C", [...bow.pieces, ...telescope(bow.end, 24, 19, 19, 5.4).pieces]);
  }
  return parts;
}

/** Where each ship stands in each state, the shafts at +/-SHAFT_X side by side when joined, and apart along X when separated. */
export const TWIN_VARIANTS: Readonly<Record<TwinId, readonly TwinVariant[]>> = {
  v1: [{ id: "joined", apart: {} }, { id: "separated", apart: { A: [34, 0, 0], B: [-34, 0, 0] } }],
  v2: [{ id: "joined", apart: {} }, { id: "separated", apart: { A: [56, 0, 0], B: [-56, 0, 0], C: [0, 0, 0] } }],
};

const BASE: Record<TwinId, Record<Ship, Vec3>> = { v1: { A: [SHAFT_X, 0, 0], B: [-SHAFT_X, 0, 0], C: [0, 0, 0] }, v2: { A: [SHAFT_X, 0, 0], B: [-SHAFT_X, 0, 0], C: [0, 0, 0] } };

/** All the pieces of one version in one state, each part moved to its ship's place (ship B turned about its axis so its outer side is -X). */
export function twin(v: TwinId, state: "joined" | "separated"): Piece[] {
  const variant = TWIN_VARIANTS[v].find((x) => x.id === state);
  return twinParts(v).flatMap((p) => {
    const base = BASE[v][p.ship];
    const off = variant?.apart[p.ship] ?? [0, 0, 0];
    return place(p.pieces, { at: [base[0] + off[0], base[1] + off[1], base[2] + off[2]], yaw: p.ship === "B" ? 180 : 0 });
  });
}

/** The pieces of one ship alone, standing on its own axis (for measuring it). */
export const shipPieces = (v: TwinId, ship: Ship): Piece[] => twinParts(v).filter((p) => p.ship === ship).flatMap((p) => p.pieces);
