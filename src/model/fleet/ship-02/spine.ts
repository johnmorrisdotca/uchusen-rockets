// The spine: a square truss the whole length of the ship that every module hangs from. Chords, bay frames, diagonals, joint nodes, and on each face a cable tray, a pipe pair with clamps and a service rail.
import { lampHalo } from "../lights.ts";
import { rng, type Piece } from "./adapter.ts";
import { trussPieces } from "../heavy/truss.ts";
import { SPINE } from "./dims.ts";

/** The spine: the kit draws the truss (`../heavy/truss.ts`) at this ship's size, and the ship's own navigation lamps go on it. */
export function spinePieces(): Piece[] {
  return [
    ...trussPieces({ square: 2 * SPINE.half, bay: SPINE.bay, length: SPINE.length }, rng(2002)),
    ...lampHalo("port", [-8, 220, 0]), ...lampHalo("starboard", [8, 740, 0]), ...lampHalo("strobe", [0, 1120, 0]), ...lampHalo("beacon", [0, 1500, 0]), ...lampHalo("nav-white", [0, 80, 0]),
  ];
}
