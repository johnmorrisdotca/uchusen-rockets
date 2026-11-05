// What the hangar boxes and the service berths hold: the package's own Starship ship and Super Heavy, on cradles, with the racks and the ports. The bodies are not redrawn. Pure: no three.js and no DOM.
import { STARSHIP_DRAWS, boosterPieces, shipPieces } from "../../starship.ts";
import { cub, discZ, ibeam, type Piece, place, rod, roundStrut } from "./adapter.ts";
import { type BayId, bayBox } from "./dims.ts";

const DRAW = STARSHIP_DRAWS.v3;
/** Half the width of a Super Heavy across its grid fins, measured from the package's own model. */
export const FIN_HALF = 9.15;
const GAP = 2;
const WALL = 1.4;
let shipTemplate: Piece[] | undefined;
let boosterTemplate: Piece[] | undefined;
const shipBody = (): Piece[] => (shipTemplate ??= shipPieces(DRAW));
const boosterBody = (): Piece[] => (boosterTemplate ??= boosterPieces(DRAW));

export const BODY = { ship: DRAW.shipHeight, booster: DRAW.boosterHeight, stack: DRAW.boosterHeight + DRAW.shipHeight, radius: DRAW.radius } as const;

/** The two cradle axes in a box, spine side first, with the clearance to the inner walls. */
export function cradleAxes(bay: BayId): { spine: number; outer: number; floor: number; y0: number; clearance: number } {
  const h = bayBox(bay);
  const [x0, x1] = h.x;
  const spineX = Math.abs(x0) < Math.abs(x1) ? x0 : x1;
  const dir = Math.sign((spineX === x0 ? x1 : x0) - spineX) || 1;
  const spine = spineX + dir * (WALL + GAP + FIN_HALF);
  const outer = spine + dir * (FIN_HALF * 2 + GAP);
  const wall = spineX + dir * WALL;
  return { spine, outer, floor: h.z[0] + 1.7, y0: h.y[0] + 6, clearance: Math.abs(spine - dir * FIN_HALF - wall) };
}

const cradle = (x: number, y0: number, len: number, floor: number): Piece[] => {
  const out: Piece[] = [];
  for (const s of [-1, 1]) out.push(...ibeam("hull-grey", [x + s * 5, y0, floor + 0.8], [x + s * 5, y0 + len, floor + 0.8], 1, 0.6, [0, 0, 1]));
  for (let k = 0; k <= 4; k++) out.push(...ibeam("hull-grey-dark", [x - 5, y0 + (k * len) / 4, floor + 0.8], [x + 5, y0 + (k * len) / 4, floor + 0.8], 0.7, 0.4, [0, 0, 1]));
  return out;
};

/** A body of the package's own model, bells or skirt at `y0`, axis at (`x`, `z`). */
function body(which: "ship" | "booster", x: number, y0: number, z: number): Piece[] {
  return place(which === "ship" ? shipBody() : boosterBody(), { at: [x, y0, z] });
}

/** Two bodies side by side in one box: the booster with its engine bay open to the aft, the ship with panels off onto the rack, and the platforms and racks around them. */
export function starshipBay(bay: BayId): Piece[] {
  const h = bayBox(bay);
  const a = cradleAxes(bay);
  const z = a.floor + 1.2 + 5.42;
  const out: Piece[] = [...cradle(a.spine, a.y0, BODY.booster, a.floor), ...cradle(a.outer, a.y0, BODY.ship, a.floor)];
  out.push(...body("booster", a.spine, a.y0, z), ...body("ship", a.outer, a.y0, z));
  // work platforms: one along the booster's open engine bay, one along the ship's flank where the panels come off
  out.push(cub("hull-yellow", [a.spine - 7, a.spine - 5.4], [a.y0, a.y0 + 16], [a.floor + 1.2, a.floor + 1.5]));
  out.push(cub("hull-yellow", [a.outer + 5.4, a.outer + 7], [a.y0 + 8, a.y0 + 28], [a.floor + 1.2, a.floor + 1.5]));
  // the rack at the fore end, clear of both bodies: Raptors on pegs and tiles in trays
  const rackY = h.y[1] - 8;
  out.push(...ibeam("hull-grey", [h.x[0] + 3, rackY, a.floor + 1], [h.x[1] - 3, rackY, a.floor + 1], 0.6, 0.4, [0, 0, 1]));
  for (let i = 0; i < 6; i++) {
    const x = h.x[0] + 6 + i * 6;
    out.push(rod("soot", [x, rackY, a.floor + 1.2], [x, rackY, a.floor + 4.2], 0.7, 16), rod("copper", [x, rackY, a.floor + 4.2], [x, rackY, a.floor + 4.6], 0.9, 16));
  }
  for (let i = 0; i < 8; i++) out.push(cub("black", [h.x[0] + 4 + i * 4, h.x[0] + 7 + i * 4], [rackY - 0.3, rackY + 0.3], [a.floor + 5.2, a.floor + 5.5]));
  return out;
}

/** A pair of clamp saddles outside a box's door, empty. The loaded variant stands the bodies on them. */
export function exteriorSaddles(bay: BayId): Piece[] {
  const h = bayBox(bay);
  const a = cradleAxes(bay);
  const outer = Math.abs(h.x[0]) > Math.abs(h.x[1]) ? h.x[0] : h.x[1];
  const dir = Math.sign(outer) || 1;
  const out: Piece[] = [];
  for (const [n, len] of [[0, BODY.booster], [1, BODY.ship]] as const) {
    const sx = outer + dir * (10 + n * (FIN_HALF * 2 + GAP));
    out.push(...ibeam("hull-yellow", [sx, a.y0, a.floor + 4], [sx, a.y0 + len, a.floor + 4], 0.8, 0.5, [0, 0, 1]));
    // the outer joint is the ship's beam, so the coarse level keeps it
    out.push(...roundStrut("hull-grey", [outer, a.y0 + 6, a.floor + 4], [sx, a.y0 + 6, a.floor + 4], 0.45, { outline: true }));
    out.push(...roundStrut("hull-grey", [outer, a.y0 + len - 6, a.floor + 4], [sx, a.y0 + len - 6, a.floor + 4], 0.45, { outline: true }));
  }
  return out;
}

/** The two components on the starboard aft box's saddles: a Super Heavy and a Starship ship, side by side. */
export function exteriorLoad(): Piece[] {
  const h = bayBox("starboard-aft");
  const a = cradleAxes("starboard-aft");
  const z = a.floor + 1.2 + 5.42;
  const x0 = h.x[1] + 10;
  return [...body("booster", x0, a.y0, z), ...body("ship", x0 + FIN_HALF * 2 + GAP, a.y0, z)];
}

/** A full stack, booster aft and ship forward, and the two depot tanks beside its mid point. */
function stackAt(x: number, y0: number, z: number): Piece[] {
  const out = [...body("booster", x, y0, z), ...body("ship", x, y0 + BODY.booster, z)];
  const mid = y0 + BODY.stack / 2;
  out.push(rod("hull-orange", [x + 16, mid - 14, z], [x + 16, mid + 14, z], 4, 24), rod("hull-white", [x - 16, mid - 14, z], [x - 16, mid + 14, z], 4, 24));
  out.push(...roundStrut("copper", [x + 12, mid, z], [x + 4.6, mid, z], 0.35), ...roundStrut("hull-white", [x - 12, mid, z], [x - 4.6, mid, z], 0.35));
  return out;
}

/** Placement (a): the stack under the spine, aft of the bow, on a run of 140 m. */
export function keelBerth(): Piece[] {
  return stackAt(0, 214, -42);
}

/** Placement (b): the stack to port, on the run the moved boxes leave, 146 m clear. */
export function portBerth(): Piece[] {
  return stackAt(-80, 108, 6);
}

/** Miyamoto's two visiting collars, side by side on the ventral side, ahead of the keel dock. Collar L faces a Starship, collar M a Dragon. */
export function miyamotoPorts(): Piece[] {
  const y = 240;
  const z = -28;
  const out: Piece[] = [];
  out.push(discZ("hull-grey", -8, y, z - 0.6, z, 6, 24), discZ("hull-orange", -8, y, z - 0.9, z - 0.6, 5, 24));
  out.push(discZ("hull-grey", 8, y, z - 0.6, z, 3, 20), discZ("hull-orange", 8, y, z - 0.9, z - 0.6, 2.4, 20));
  for (const x of [-8, 8]) out.push(...roundStrut("hull-grey-dark", [x, y, -10], [x, y, z], 0.6));
  return out;
}

export const SERVICE_PORTS = [
  { name: "Starship port", collar: "L", at: [-8, 240, -28], direction: [0, 0, -1], craft: ["starship"] },
  { name: "Dragon port", collar: "M", at: [8, 240, -28], direction: [0, 0, -1], craft: ["dragon"] },
] as const;
