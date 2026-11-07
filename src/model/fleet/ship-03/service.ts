// What the hangar boxes and the service berths hold: the package's own Starship ship, on cradles, with the racks and the ports. Super Heavy is not carried in space. The bodies are not redrawn. Pure: no three.js and no DOM.
import { STARSHIP_DRAWS, shipPieces } from "../../starship.ts";
import { aimedPort, berthArm, deepTruss, transferCoupling } from "../dockJoints.ts";
import { cub, ibeam, type Piece, place, rod, roundStrut } from "./adapter.ts";
import type { Vec3 } from "../../pieces.ts";
import { type BayId, bayBox } from "./dims.ts";

const DRAW = STARSHIP_DRAWS.v3;
/** Half the width of a Super Heavy across its grid fins, measured from the package's own model. */
export const FIN_HALF = 9.15;
const GAP = 2;
const WALL = 1.4;
let shipTemplate: Piece[] | undefined;
const shipBody = (): Piece[] => (shipTemplate ??= shipPieces(DRAW));

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

/** The ship, bells at `y0`, axis at (`x`, `z`). A berth in space does not carry Super Heavy. */
function body(x: number, y0: number, z: number): Piece[] {
  return place(shipBody(), { at: [x, y0, z] });
}

/** Two bodies side by side in one box: the booster with its engine bay open to the aft, the ship with panels off onto the rack, and the platforms and racks around them. */
export function starshipBay(bay: BayId): Piece[] {
  const h = bayBox(bay);
  const a = cradleAxes(bay);
  const z = a.floor + 1.2 + 5.42;
  const out: Piece[] = [...cradle(a.spine, a.y0, BODY.booster, a.floor), ...cradle(a.outer, a.y0, BODY.ship, a.floor)];
  out.push(...body(a.spine, a.y0, z), ...body(a.outer, a.y0, z));
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

/** Two Starship ships on the starboard aft box's saddles, side by side. Super Heavy stays on Earth. */
export function exteriorLoad(): Piece[] {
  const h = bayBox("starboard-aft");
  const a = cradleAxes("starboard-aft");
  const z = a.floor + 1.2 + 5.42;
  const x0 = h.x[1] + 10;
  return [...body(x0, a.y0, z), ...body(x0 + FIN_HALF * 2 + GAP, a.y0, z)];
}

/** Turn a ship end for end about its tail, so the bells stay put and the nose goes the other way. */
function aboutTail(pieces: readonly Piece[]): Piece[] {
  const flip = (p: Vec3): Vec3 => [p[0], -p[1], -p[2]];
  return pieces.map((piece) => {
    const move = piece.move ? { ...piece.move, pivot: flip(piece.move.pivot), axis: flip(piece.move.axis) } : undefined;
    const common = move ? { move } : {};
    if (piece.kind === "plate") {
      const f = piece.frame;
      return { ...piece, ...common, frame: { o: flip(f.o), u: flip(f.u), v: flip(f.v), w: flip(f.w) } };
    }
    if (piece.kind === "lines") return { ...piece, ...common, paths: piece.paths.map((path) => path.map(flip)) };
    if (piece.kind === "instances") {
      // 180 degrees about X sends y and z the other way and reverses a yaw.
      return { ...piece, ...common, template: aboutTail(piece.template), poses: piece.poses.map((pose) => ({ ...pose, at: flip(pose.at), yaw: -(pose.yaw ?? 0) })) };
    }
    const [ox, oz] = piece.at ?? [0, 0];
    const arc = piece.arc;
    return {
      ...piece,
      ...common,
      at: [ox, -oz] as const,
      // Negating y reverses the profile, which would face the shell inward, so the points are put back in upward order.
      profile: piece.profile.map(([r, y]) => [r, -y] as const).reverse(),
      ...(piece.rings ? { rings: piece.rings.map((y) => -y) } : {}),
      ...(piece.welds ? { welds: piece.welds.map((y) => -y) } : {}),
      ...(arc ? { arc: (y: number) => arc(-y) } : {}),
    };
  });
}

/** A Starship ship and a tanker, tails together at the transfer coupling. The tanker is the same ship turned end for end. Super Heavy is not berthed. */
function stackAt(x: number, y0: number, z: number): Piece[] {
  const gap = 1.2;
  return [
    ...place(shipBody(), { at: [x, y0 + gap, z] }),
    ...place(aboutTail(shipBody()), { at: [x, y0 - gap, z] }),
    ...place(transferCoupling(), { at: [x, y0, z] }),
  ];
}

/** The pair under the spine, just below the barrels, in the gap between them. */
export function keelBerth(): Piece[] {
  return stackAt(0, 214, -32);
}

/** The pair to port, a few metres clear of the spine. */
export function portBerth(): Piece[] {
  return stackAt(-16, 160, 0);
}

/** Miyamoto's two visiting collars, side by side on the ventral side, ahead of the keel dock. Collar L faces a Starship, collar M a Dragon. */
export function miyamotoPorts(): Piece[] {
  const y = 240;
  const z = -28;
  const out: Piece[] = [];
  out.push(...aimedPort("L", 2, [-8, y, z], [0, 0, -1]));
  out.push(...aimedPort("M", 2, [8, y, z], [0, 0, -1]));
  out.push(...deepTruss([-8, y, -10], [-8, y, z + 2], 3));
  out.push(...deepTruss([8, y, -10], [8, y, z + 2], 3));
  out.push(...place(berthArm(), { at: [0, y, -8], yaw: 90 }));
  return out;
}

export const SERVICE_PORTS = [
  { name: "Starship port", collar: "L", at: [-8, 240, -28], direction: [0, 0, -1], craft: ["starship"] },
  { name: "Dragon port", collar: "M", at: [8, 240, -28], direction: [0, 0, -1], craft: ["dragon"] },
] as const;
