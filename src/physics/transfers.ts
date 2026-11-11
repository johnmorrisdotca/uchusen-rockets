// Planning a transfer: the speed a burn needs to reach a new orbit size, a change of plane, the bi-elliptic transfer, where two orbits
// in one plane cross, and where a craft's orbit crosses another plane (its nodes), with when it gets there. Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter): the speed change that keeps a chosen semi-major axis and the crossing of
// two orbits from Src/Orbiter/MfdTransfer.cpp (Instrument_Transfer::CalcElements and UpdateDraw), and the relative inclination, the
// nodes, the time to each and the speed there from Src/Orbiter/MfdAlign.cpp (Instrument_OPlaneAlign::UpdateDraw). Copyright (c)
// 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt). Changed in the port: functions of elements in place of the
// displays; a right-handed frame, so Orbiter's node line crossp(nm1, nm2) is nm2 x nm1 here; both crossings of two orbits are given
// (Orbiter's display picks one); angles by atan2. Written here: the bi-elliptic transfer and the plane change by the law of cosines
// (Orbiter's display estimates a plane change as the speed times the angle, for a push kept normal to the plane).
import { stateAtTrueAnomaly, timeToTrueAnomaly, type Elements } from "./elements.ts";
import { cross, dot, length, scale, type Vec3 } from "./vector.ts";

const TAU = 2 * Math.PI;
const posAngle = (angle: number): number => ((angle % TAU) + TAU) % TAU;

/**
 * The speed change at distance `r` that turns an orbit of semi-major axis `aNow` into one of `aNew`, burning along the speed (the vis-viva equation, as Orbiter's transfer display rescales a burn to keep a chosen orbit).
 * @param gm The body's gravitational parameter, m^3/s^2.
 * @param r The distance of the burn from the body's centre, metres.
 * @param aNow The semi-major axis before, metres (negative for an open path).
 * @param aNew The semi-major axis wanted, metres.
 * @returns The change of speed, metres a second: positive to speed up (prograde), negative to slow down.
 * @example
 * ```ts
 * import { speedChangeFor } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(speedChangeFor(3.986004418e14, 6_778_000, 6_778_000, (6_778_000 + 42_164_000) / 2).toFixed(1), "m/s");
 * ```
 */
export const speedChangeFor = (gm: number, r: number, aNow: number, aNew: number): number => Math.sqrt(gm * (2 / r - 1 / aNew)) - Math.sqrt(gm * (2 / r - 1 / aNow));

/**
 * The change of speed that turns a speed through an angle, and to a new size if given: `sqrt(v1^2 + v2^2 - 2 v1 v2 cos angle)`, which is `2 v sin(angle / 2)` for a pure change of plane. Orbiter's plane-alignment display estimates `v angle` instead, the cost of keeping the push normal to the plane all through the burn.
 * @param speed The speed before, metres a second.
 * @param angle The angle to turn through, radians.
 * @param newSpeed The speed after; the same as before when left out.
 * @returns The change of speed, metres a second.
 * @example
 * ```ts
 * import { planeChange } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(planeChange(7_669, (10 * Math.PI) / 180).toFixed(0), "m/s for 10 degrees in low orbit");
 * ```
 */
export function planeChange(speed: number, angle: number, newSpeed = speed): number {
  return Math.sqrt(Math.max(0, speed * speed + newSpeed * newSpeed - 2 * speed * newSpeed * Math.cos(angle)));
}

/**
 * The bi-elliptic transfer between two circular orbits about one body: out on one half-ellipse to a far point `rb`, a burn there, and back on a second half-ellipse to the final orbit. With `rb` equal to the final radius its speed changes are the Hohmann transfer's (and its time adds the half turn of the final circle that the second leg then is).
 * @param gm The body's gravitational parameter, m^3/s^2.
 * @param r1 The starting radius, metres.
 * @param r2 The final radius, metres.
 * @param rb The far point, metres (at least the larger of `r1` and `r2`).
 * @returns The three speed changes (metres a second, each positive), their sum, and the flight time (seconds).
 * @example
 * ```ts
 * import { biElliptic } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const far = biElliptic(3.986004418e14, 6_778_000, 384_400_000, 1_000_000_000);
 * console.log(far.total.toFixed(0), "m/s,", (far.seconds / 86_400).toFixed(1), "days");
 * ```
 */
export function biElliptic(gm: number, r1: number, r2: number, rb: number): { dv1: number; dv2: number; dv3: number; total: number; seconds: number } {
  const a1 = (r1 + rb) / 2;
  const a2 = (r2 + rb) / 2;
  const visViva = (r: number, a: number) => Math.sqrt(gm * (2 / r - 1 / a));
  const dv1 = Math.abs(visViva(r1, a1) - Math.sqrt(gm / r1));
  const dv2 = Math.abs(visViva(rb, a2) - visViva(rb, a1));
  const dv3 = Math.abs(visViva(r2, a2) - Math.sqrt(gm / r2));
  return { dv1, dv2, dv3, total: dv1 + dv2 + dv3, seconds: Math.PI * (Math.sqrt(a1 ** 3 / gm) + Math.sqrt(a2 ** 3 / gm)) };
}

/** The unit normal of an orbit's plane, along its angular momentum. */
const normalOf = (el: Elements): Vec3 => [Math.sin(el.i) * Math.sin(el.node), -Math.sin(el.i) * Math.cos(el.node), Math.cos(el.i)];

/**
 * The angle between two orbits' planes.
 * @param a One orbit's elements.
 * @param b The other's.
 * @returns The angle, radians, 0 to pi.
 * @example
 * ```ts
 * import { elementsOf, relativeInclination } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const gm = 3.986004418e14;
 * const iss = elementsOf(gm, [6_778_000, 0, 0], [0, 4_766, 6_008]);
 * const equator = elementsOf(gm, [6_778_000, 0, 0], [0, 7_669, 0]);
 * console.log(((relativeInclination(iss, equator) * 180) / Math.PI).toFixed(1), "degrees");
 * ```
 */
export function relativeInclination(a: Elements, b: Elements): number {
  const na = normalOf(a);
  const nb = normalOf(b);
  return Math.atan2(length(cross(na, nb)), dot(na, nb));
}

/**
 * One crossing of a craft's orbit with another plane: where on its orbit, how long until it is there, its speed there and the change of speed that turns it into the other plane.
 *
 * @example
 * ```ts
 * import { elementsOf, nodes, type Node } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const gm = 3.986004418e14;
 * const crossing = nodes(elementsOf(gm, [6_778_000, 0, 0], [0, 4_766, 6_008]), elementsOf(gm, [0, 6_778_000, 0], [-7_669, 0, 0]));
 * const next: Node | undefined = crossing?.ascending;
 * console.log(next?.seconds.toFixed(0));
 * ```
 */
export interface Node {
  /** The craft's true anomaly there, radians. */
  trueAnomaly: number;
  /** Seconds from when the craft's elements were taken until it is there (the next time). */
  seconds: number;
  /** Its speed there, metres a second. */
  speed: number;
  /** An impulsive change of plane there, `2 v sin(angle / 2)`, metres a second. */
  dv: number;
}

/**
 * Where a craft's orbit crosses another orbit's plane, and when it gets there (Orbiter's plane-alignment display): the ascending node, where it passes to the north of the other plane, and the descending node.
 * @param ship The craft's elements.
 * @param target The elements of the orbit whose plane is wanted (another craft, a moon, or one made up for the plane).
 * @returns The angle between the planes and the two nodes, or null when the planes are the same (no nodes).
 * @example
 * ```ts
 * import { elementsOf, nodes } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const gm = 3.986004418e14;
 * const tilted = elementsOf(gm, [6_778_000, 0, 0], [0, 4_766, 6_008]);
 * const equator = elementsOf(gm, [6_778_000, 0, 0], [0, 7_669, 0]);
 * const n = nodes(tilted, equator);
 * console.log(n?.descending.seconds.toFixed(0), "s to the descending node,", n?.descending.dv.toFixed(0), "m/s there");
 * ```
 */
export function nodes(ship: Elements, target: Elements): { relativeInclination: number; ascending: Node; descending: Node } | null {
  const n1 = normalOf(ship);
  const n2 = normalOf(target);
  const line = cross(n2, n1);
  const l = length(line);
  if (l < 1e-12) return null;
  const nd = scale(line, 1 / l);
  const reli = Math.atan2(l, dot(n1, n2));
  const here = stateAtTrueAnomaly(ship, ship.trueAnomaly).position;
  const ahead = Math.atan2(dot(cross(here, nd), n1), dot(here, nd));
  const at = (trueAnomaly: number): Node => {
    const speed = length(stateAtTrueAnomaly(ship, trueAnomaly).velocity);
    return { trueAnomaly, seconds: timeToTrueAnomaly(ship, trueAnomaly), speed, dv: planeChange(speed, reli) };
  };
  const ascending = posAngle(ship.trueAnomaly + posAngle(ahead));
  return { relativeInclination: reli, ascending: at(ascending), descending: at(posAngle(ascending + Math.PI)) };
}

/**
 * Where two orbits about one body, in one plane, cross: the points that are on both (Orbiter's transfer display, which finds where a transfer orbit meets its target's). Both orbits must share their plane; for orbits in different planes, use the {@link nodes} first.
 * @param path The orbit flown (a transfer orbit).
 * @param target The orbit to reach.
 * @returns The true anomalies on `path` of the crossings, radians, 0 to 2 pi in increasing order: none, one (touching) or two (on an open path, only points it reaches).
 * @example
 * ```ts
 * import { crossings, elementsOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const gm = 3.986004418e14;
 * const transfer = elementsOf(gm, [6_778_000, 0, 0], [0, 9_000, 0]);
 * const higher = elementsOf(gm, [10_000_000, 0, 0], [0, Math.sqrt(gm / 10_000_000), 0]);
 * console.log(crossings(transfer, higher).map((nu) => ((nu * 180) / Math.PI).toFixed(1)));
 * ```
 */
export function crossings(path: Elements, target: Elements): number[] {
  const domega = target.longitudePeriapsis - path.longitudePeriapsis;
  const p1 = path.semiLatus;
  const p2 = target.semiLatus;
  const a = path.e / p1 - (target.e / p2) * Math.cos(domega);
  const b = (-target.e / p2) * Math.sin(domega);
  const c = 1 / p1 - 1 / p2;
  const r = Math.hypot(a, b);
  if (r === 0 || Math.abs(c) > r) return [];
  const centre = Math.atan2(b, a);
  const half = Math.acos(Math.max(-1, Math.min(1, -c / r)));
  const found = half === 0 ? [centre] : [centre - half, centre + half];
  const reached = (nu: number) => 1 + path.e * Math.cos(nu) > 0 && 1 + target.e * Math.cos(nu - domega) > 0;
  return found.map(posAngle).filter(reached).sort((x, y) => x - y);
}
