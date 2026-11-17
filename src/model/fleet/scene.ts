// The docking scene (MODULES-415 and MODULES-418): two Miyamoto-class ships berthed at Kaminari, one on each side of its dock module, with the small craft (ATC) flying between them. Everything is read from the ships' own
// tables: Kaminari's first design (the one with a hangar, as the craft plan decided) at the origin; each Miyamoto moored beside the dock arms, nose to the bow; each craft on a lane that leaves one ship's hangar door,
// rises clear of Kaminari and enters the other ship's door. A lane is a list of points and a trip is a pure function of time. Metres, ship space of Kaminari: x to starboard, y to the bow, z up. Pure: no three.js and
// no DOM.
import type { Vec3 } from "../../framing.ts";
import { bayBox, doorOf, ENVELOPE as MIYAMOTO, type BayId } from "./ship-03/dims.ts";
import { PORTS as ARMS } from "./ship-02/docking.ts";
import { SPINE, STATION } from "./ship-02/dims.ts";
import { ATC, type AtcId } from "./craft/index.ts";

/** How far a Miyamoto's hull stands from the tip of the dock arms, metres: room for the arms' collars and the mooring struts. */
export const MOORING_GAP = 50;
/** Where along Kaminari a Miyamoto's stern stands: the dock module's start, less what lets the 380 m hull centre on the module's arms. */
export const MOORING_Y = STATION.dock.y - 152;
/** How far a craft flies straight out of a door before it turns, in metres. */
export const EXIT_RUN = 25;
/** The clearance a lane keeps from every hull, metres, beyond the craft's own size. */
export const LANE_CLEAR = 20;

export interface SceneShip {
  id: "miyamoto-port" | "miyamoto-starboard";
  rocket: "fleet-ship-03";
  variant: "miyamoto";
  /** Where the ship's own origin (its stern, on its axis) stands in Kaminari's space. */
  at: Vec3;
  /** The bay of this ship whose door faces Kaminari. */
  bay: BayId;
  /** +1 when Kaminari is to its port side. */
  facing: 1 | -1;
}

const armX = Math.max(...ARMS.map((a) => Math.abs(a.at[0])));

/** The two ships: the starboard one has Kaminari on its port side (its survey bay faces the dock), the port one has Kaminari on its starboard side (its rescue bay faces it). */
export const SHIPS: readonly SceneShip[] = [
  { id: "miyamoto-starboard", rocket: "fleet-ship-03", variant: "miyamoto", at: [armX + MOORING_GAP + MIYAMOTO.beam / 2, MOORING_Y, 0], bay: "port-fore", facing: 1 },
  { id: "miyamoto-port", rocket: "fleet-ship-03", variant: "miyamoto", at: [-(armX + MOORING_GAP + MIYAMOTO.beam / 2), MOORING_Y, 0], bay: "starboard-aft", facing: -1 },
];

/** A door in Kaminari's space: its centre on the outer wall, the way a craft goes out (a unit vector along X) and the clear opening. */
export function doorOfShip(ship: SceneShip): { at: Vec3; out: Vec3; wide: number; high: number; y: readonly [number, number]; z: readonly [number, number] } {
  const door = doorOf(ship.bay);
  const box = bayBox(ship.bay);
  const wall = ship.facing === 1 ? box.x[0] : box.x[1];
  const out: Vec3 = [ship.facing === 1 ? -1 : 1, 0, 0];
  return {
    at: [ship.at[0] + wall, ship.at[1] + (door.y[0] + door.y[1]) / 2, ship.at[2] + (door.z[0] + door.z[1]) / 2],
    out,
    wide: door.wide,
    high: door.high,
    y: [ship.at[1] + door.y[0], ship.at[1] + door.y[1]],
    z: [ship.at[2] + door.z[0], ship.at[2] + door.z[1]],
  };
}

/** One trip of one craft: from a ship's door to the other's and back, on its own lane. */
export interface Trip {
  craft: AtcId;
  from: SceneShip["id"];
  to: SceneShip["id"];
  /** Metres above the tightest clear height at which the lane crosses, so no two lanes share a height. */
  lift: number;
  /** Seconds for the whole round trip at the scene's pace. */
  period: number;
  /** Where in the cycle it starts, 0 to 1. */
  phase: number;
}

/** The six craft, each on a trip between the two ships. A craft that is a trip's `from` leaves that ship first. */
export const TRIPS: readonly Trip[] = [
  { craft: "crew-shuttle", from: "miyamoto-starboard", to: "miyamoto-port", lift: 0, period: 60, phase: 0 },
  { craft: "rescue-cutter", from: "miyamoto-port", to: "miyamoto-starboard", lift: 25, period: 66, phase: 0.2 },
  { craft: "eva-pod", from: "miyamoto-starboard", to: "miyamoto-port", lift: 50, period: 54, phase: 0.45 },
  { craft: "survey-drone", from: "miyamoto-port", to: "miyamoto-starboard", lift: 75, period: 48, phase: 0.65 },
  { craft: "survey-lander", from: "miyamoto-starboard", to: "miyamoto-port", lift: 100, period: 72, phase: 0.8 },
  { craft: "cargo-tug", from: "miyamoto-port", to: "miyamoto-starboard", lift: 125, period: 78, phase: 0.1 },
];

const shipOf = (id: SceneShip["id"]): SceneShip => {
  const found = SHIPS.find((s) => s.id === id);
  if (!found) throw new RangeError(`no ship ${id}`);
  return found;
};

/** The lane height: clear of Kaminari at the dock module and of both hulls, from the heights the caller measured (`top` is the highest point of anything the lane crosses). */
export const laneHeight = (top: number, trip: Trip): number => top + LANE_CLEAR + (ATC[trip.craft]?.envelope.deep ?? 0) + trip.lift;

/** A trip's lane, in order: out of the first door, up to the lane's height, across, down, into the second door. `top` is the highest point the lane must clear. */
export function laneOf(trip: Trip, top: number): Vec3[] {
  const a = doorOfShip(shipOf(trip.from));
  const b = doorOfShip(shipOf(trip.to));
  const z = laneHeight(top, trip);
  const exitA: Vec3 = [a.at[0] + a.out[0] * EXIT_RUN, a.at[1], a.at[2]];
  const exitB: Vec3 = [b.at[0] + b.out[0] * EXIT_RUN, b.at[1], b.at[2]];
  return [a.at, exitA, [exitA[0], exitA[1], z], [exitB[0], exitB[1], z], exitB, b.at];
}

/** Where a craft is at time `t` seconds: along the lane there, and back along it, with a pause at each door; the heading is the lane's direction. */
export function tripAt(trip: Trip, top: number, t: number): { at: Vec3; heading: Vec3; leg: "out" | "back" | "docked" } {
  const lane = laneOf(trip, top);
  const lengths = lane.slice(1).map((p, i) => Math.hypot(p[0] - lane[i][0], p[1] - lane[i][1], p[2] - lane[i][2]));
  const total = lengths.reduce((s, n) => s + n, 0);
  const cycle = (((t / trip.period + trip.phase) % 1) + 1) % 1;
  const hold = 0.08;
  const move = (1 - 2 * hold) / 2;
  let leg: "out" | "back" | "docked" = "docked";
  let u = 0;
  if (cycle >= hold && cycle < hold + move) {
    leg = "out";
    u = (cycle - hold) / move;
  } else if (cycle >= 2 * hold + move && cycle < 2 * hold + 2 * move) {
    leg = "back";
    u = 1 - (cycle - 2 * hold - move) / move;
  } else u = cycle < hold || cycle >= 2 * hold + 2 * move ? 0 : 1;
  const eased = u * u * (3 - 2 * u);
  let d = eased * total;
  let i = 0;
  while (i < lengths.length - 1 && d > lengths[i]) d -= lengths[i++];
  const p = lane[i];
  const q = lane[i + 1];
  const f = lengths[i] === 0 ? 0 : Math.min(1, d / lengths[i]);
  const dir: Vec3 = [(q[0] - p[0]) / (lengths[i] || 1), (q[1] - p[1]) / (lengths[i] || 1), (q[2] - p[2]) / (lengths[i] || 1)];
  return { at: [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f], heading: leg === "back" ? [-dir[0], -dir[1], -dir[2]] : dir, leg };
}

/** The Kaminari in the scene: where the dock module and the spine stand, which the lanes pass. */
export const KAMINARI = { spineHalf: SPINE.half, dock: STATION.dock } as const;
