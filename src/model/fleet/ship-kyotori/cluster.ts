// How the ships stand to the station and to each other: four identical-class ships, two arrangements, one housing. In the 2x2 cluster four ships are latched along two faces each at the corners of a square 27 m on a side, drives side by side, tanks
// on the outer faces only; in the quadrant arrangement each ship docks at one quarter's dock, 62 m from the axis. The housing takes either (its four bays are for the cluster, the quarters' docks for the quadrants) and the data here is what the
// tests read: where each ship stands, which way it faces, and its drive's exhaust cone. The drive is a magnetic nozzle (coil rings, no bell): its exhaust is a narrow collimated beam, and the coil currents can steer it a few degrees outward. Pure.
export const SHAFT_X = 13.5;
/** The distance between the axes of two neighbouring ships in the cluster. */
export const SPACING = 2 * SHAFT_X;
/** Where the ships' axes stand, seen down the station's axis: x across and z up, metres; and the corner of the cluster each stands in. */
export type Slot = readonly [sx: 1 | -1, sz: 1 | -1];
export const CLUSTER_SLOTS: readonly Slot[] = [[1, -1], [-1, -1], [1, 1], [-1, 1]];

/** The drive of a ship, for the exhaust: the nozzle's exit radius, the beam's half angle, how far the beam is held to be a hazard, and the outward steer the coil currents give it in the cluster, degrees. */
export const DRIVE = { exitR: 11, halfAngle: 3, plume: 120, cantInCluster: 3 } as const;
/** The envelope of a ship's body round its axis, on its inner faces (the truss, the latch frames, the crew port arms stay inside it): the tank bouquet is on the outer faces only. */
export const INNER_ENVELOPE = 14;
/** The lowest point of every ship: the tail ring of its drive, at the same height for every ship, so no ship stands over another's exhaust. */
export const TAIL_Y = 0;

export interface Placed {
  id: string;
  x: number;
  z: number;
  /** The direction the exhaust is steered towards, a unit vector across the axis (zero: straight aft). */
  steer: readonly [number, number];
}
export type ArrangementId = "cluster" | "quadrants";

/** The ships' places in each arrangement. In the quadrants the ships stand at the four quarters' docks, `radius` from the axis, and are not steered. */
export function arrangement(id: ArrangementId, radius: number): Placed[] {
  if (id === "cluster") return CLUSTER_SLOTS.map(([sx, sz], i) => ({ id: "abcd"[i], x: sx * SHAFT_X, z: sz * SHAFT_X, steer: [sx * Math.SQRT1_2, sz * Math.SQRT1_2] as const }));
  return [0, 1, 2, 3].map((k) => ({ id: "abcd"[k], x: radius * Math.sin((Math.PI / 2) * k), z: radius * Math.cos((Math.PI / 2) * k), steer: [0, 0] as const }));
}

/** The exhaust cone of a ship at a depth `t` metres aft of its tail: where its axis is across, and how wide it is. */
export function coneAt(ship: Placed, t: number, steer = true): { x: number; z: number; r: number } {
  const cant = steer ? Math.tan((DRIVE.cantInCluster * Math.PI) / 180) : 0;
  return { x: ship.x + ship.steer[0] * cant * t, z: ship.z + ship.steer[1] * cant * t, r: DRIVE.exitR + t * Math.tan((DRIVE.halfAngle * Math.PI) / 180) };
}

/** The pairs of ships whose exhaust hits the other: the beam of one reaching the body of the other (the bodies stand at `TAIL_Y` and above, the beams below it, so a beam can only meet a body that stands lower than the tail), or two beams overlapping within `DRIVE.plume` metres. */
export function exhaustClashes(ships: readonly Placed[], tails: Readonly<Record<string, number>> = {}, steer = true): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < ships.length; i++) for (let j = 0; j < ships.length; j++) {
    if (i === j) continue;
    const a = ships[i];
    const b = ships[j];
    const lowestOfB = tails[b.id] ?? TAIL_Y;
    // a body lower than the tail of `a` could stand in its beam: the beam starts at the tail and goes aft
    if (lowestOfB < (tails[a.id] ?? TAIL_Y) && Math.hypot(b.x - a.x, b.z - a.z) < coneAt(a, (tails[a.id] ?? TAIL_Y) - lowestOfB, steer).r + INNER_ENVELOPE) out.push([a.id, b.id]);
    if (i < j) for (let t = 0; t <= DRIVE.plume; t += 2) {
      const ca = coneAt(a, t, steer);
      const cb = coneAt(b, t, steer);
      if (Math.hypot(ca.x - cb.x, ca.z - cb.z) < ca.r + cb.r) {
        out.push([a.id, b.id]);
        break;
      }
    }
  }
  return out;
}
