// ISV Kyotori, V2 (John's pick): two equal ships side by side that dock into the housing at the stern of a station, a destination with four quarters. The long ship A carries the payload bay and the glass lift; the other, B, the laboratory and the larger
// crew space; each has its own drive of coil rings, its own crew port and its own crew space. Joined, the ships are held together by latch frames along their length and by the station's housing at the bow; separated, the ships leave and the station
// stays. Parts plus a variant. Concepts for John's V2. Pure: no three.js and no DOM.
import { ibeam, KIT, place, type Piece, type Vec3 } from "./adapter.ts";
import { bay, bowLong, bowRunner, insulatedTank, latchHalf } from "./hardware.ts";
import { crewPort, elevator, inlineDrive, mod, truss } from "./parts.ts";
import { station } from "./station.ts";

const deg = (a: number): number => (a * Math.PI) / 180;
export const SHAFT_X = 13.5;
export type Ship = "A" | "B" | "C";
export interface V2Part {
  id: string;
  ship: Ship;
  pieces: Piece[];
}
/** The ships' bows end 335.4 m up the axis, at the housing's mouth. */
export const MOUTH = 335;
const BOW_Y = 305;

function tanks(y0: number, angles: number[], R: number, r: number, len: number): Piece[] {
  const out: Piece[] = [];
  const tank = insulatedTank(r, len);
  for (const d of angles) {
    const a = deg(d);
    out.push(...place(tank, { at: [R * Math.sin(a), y0, R * Math.cos(a)] }));
    for (const f of [0.1, 0.5, 0.9]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(a), y0 + len * f, 6.6 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}
const bouquet = (): Piece[] => [...tanks(90, [30, 90, 150], 14, 4.5, 60), ...tanks(98, [0, 60, 120, 180], 25, 3.6, 44)];

const modules = (ids: readonly string[], y0: number): { pieces: Piece[]; end: number } => {
  const pieces: Piece[] = [];
  let y = y0;
  for (const id of ids) {
    pieces.push(...mod(id, y));
    y += KIT[id].length;
  }
  return { pieces, end: y };
};

/** The joints along the shafts: height, the long ship's wall radius there, the other ship's. */
const JOINTS: readonly (readonly [number, number, number])[] = [[50, 7, 7], [78, 7, 7], [112, 6.4, 6.4], [160, 6.4, 6.4], [208, 6.4, 8], [244, 6.4, 8], [276, 9.4, 8], [298, 9.4, 8]];

/** The parts of V2, each in its ship's own frame (the shaft up Y, its outer side +X): the long ship A, the ship B and the station C. */
export function v2Parts(o: { wings?: "stowed" | "deployed"; cutQuarter?: number } = {}): V2Part[] {
  const parts: V2Part[] = [];
  const add = (id: string, ship: Ship, pieces: Piece[]): void => void parts.push({ id: `${ship.toLowerCase()}-${id}`, ship, pieces });
  const seam = -SHAFT_X;
  add("drive", "A", inlineDrive(0, 11));
  add("shaft", "A", truss(74, 188));
  add("tanks", "A", bouquet());
  add("bay", "A", [...bay(262, 100), ...crewPort(240)]);
  add("elevator", "A", elevator(150, 300));
  add("bow", "A", bowLong(BOW_Y));
  add("joints", "A", JOINTS.flatMap(([y, wa]) => latchHalf(y, wa, seam, true)));
  add("drive", "B", inlineDrive(0, 11));
  add("shaft", "B", truss(74, 144));
  add("tanks", "B", bouquet());
  const crew = modules(["adapter-l-m", "habitat-drum-crew", "common-area-m", "habitat-drum-crew", "lab-m", "deck-nav-m", "comms-array-m"], 218);
  add("crew", "B", [...crew.pieces, ...crewPort(212)]);
  add("bow", "B", bowRunner(BOW_Y));
  add("joints", "B", JOINTS.flatMap(([y, , wb]) => latchHalf(y, wb, seam, false)));
  add("station", "C", station({ wings: o.wings ?? "deployed", ...(o.cutQuarter !== undefined ? { cutQuarter: o.cutQuarter } : {}), shaftX: SHAFT_X }));
  return parts;
}

/** Where each ship stands joined and apart. */
export const V2_VARIANTS: Readonly<Record<"joined" | "separated", Partial<Record<Ship, Vec3>>>> = { joined: {}, separated: { A: [56, -50, 0], B: [-56, -50, 0] } };

/** All the pieces of V2 in a state; ship B turned about its axis so its outer side is -X. */
export function v2(state: "joined" | "separated", o: { wings?: "stowed" | "deployed"; cutQuarter?: number } = {}): Piece[] {
  const base: Record<Ship, Vec3> = { A: [SHAFT_X, 0, 0], B: [-SHAFT_X, 0, 0], C: [0, 0, 0] };
  return v2Parts(o).flatMap((p) => {
    const b = base[p.ship];
    const off = V2_VARIANTS[state][p.ship] ?? [0, 0, 0];
    return place(p.pieces, { at: [b[0] + off[0], b[1] + off[1], b[2] + off[2]], yaw: p.ship === "B" ? 180 : 0 });
  });
}
