// A swing past Jupiter on the way out. The first leg is the Hohmann the page already flies. At Jupiter the craft turns, unpowered, and the second leg is the ellipse that turn leaves it on. The turn is the one that comes closest to the destination. Nothing here changes a departure from the Moon.
import type { BodySource } from "./bodies.ts";
import { DAY_S, GM_KM3_S2 } from "./constants.ts";
import type { Conic } from "./lunar.ts";
import { conicPoint } from "./lunar.ts";
import { circularSpeed, hohmann, wrapPi } from "./physics.ts";
import { positionKm, windows } from "./trip.ts";

/** How close the flyby is allowed, in Jupiter radii. Voyager 1 passed about this close. It is an estimate, and the plan says so. */
const RADII = 5;
/** A swing is flown only when the destination is this close to the end of the path, in radians (about three degrees). */
const MISS = 0.05;
const BEYOND = new Set(["saturn", "uranus", "neptune"]);
const TAU = 2 * Math.PI;

/**
 * The two coasts of a swing, and where the second one ends relative to the destination.
 * `leg1S` is the coast from the Earth to Jupiter. The drawing asks `swingPoint` for a moment on either coast.
 */
export interface Swing {
  by: "jupiter";
  leg1S: number;
  leg2S: number;
  leg1: Conic;
  leg2: Conic;
  radii: number;
  /** How far the arrival longitude misses the destination, radians. */
  miss: number;
  /** Heliocentric speed change at the Earth, km/s. */
  vInfDepart: number;
  /** Speed relative to the destination at arrival, km/s. */
  vInfArrive: number;
}

/** Where one moment of a swing is: the same fields `conicPoint` returns. */
export function swingPoint(muKm3s2: number, swing: Swing, tau: number): { r: number; theta: number; v: number; x: number; y: number } {
  if (tau <= swing.leg1S) return conicPoint(muKm3s2, swing.leg1, Math.max(0, tau));
  return conicPoint(muKm3s2, swing.leg2, tau - swing.leg1S);
}

/** A Jupiter swing is offered for a rocket leaving the Earth for a planet beyond Jupiter. A ship that burns all the way, and a departure from the Moon, are not offered one. */
export function assistApplies(from: string, to: string, drive: "ballistic" | "continuous"): boolean {
  return drive === "ballistic" && from === "earth" && BEYOND.has(to);
}

const flat = (p: readonly [number, number, number]): number => Math.hypot(p[0], p[1]);
const lon = (p: readonly [number, number, number]): number => Math.atan2(p[1], p[0]);

const meanOf = (nu: number, e: number): number => {
  const wrapped = wrapPi(nu);
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(wrapped / 2), Math.sqrt(1 + e) * Math.cos(wrapped / 2));
  return E - e * Math.sin(E);
};

/** Seconds from the craft's place on an ellipse until it reaches `rStop` on the way out, or null when that radius is outside the ellipse. */
function timeOut(mu: number, conic: Conic, rStop: number): number | null {
  const ra = conic.a * (1 + conic.e);
  const rp = conic.a * (1 - conic.e);
  if (rStop > ra + 1 || rStop < rp - 1) return null;
  const p = conic.a * (1 - conic.e * conic.e);
  const cosT = (p / rStop - 1) / conic.e;
  if (cosT > 1 || cosT < -1) return null;
  const nuT = Math.acos(Math.max(-1, Math.min(1, cosT)));
  const dnu = nuT - wrapPi(conic.nu0);
  if (dnu < -1e-6) return null;
  if (dnu <= 1e-6) return 0;
  const n = Math.sqrt(mu / (conic.a * conic.a * conic.a));
  let dM = meanOf(wrapPi(conic.nu0) + dnu, conic.e) - meanOf(conic.nu0, conic.e);
  if (dM < 0) dM += TAU;
  return dM / n;
}

/** The ellipse of a craft at `r` km, longitude `angle`, with radial and tangential speed in km/s. Null when the path is not a bound ellipse. */
function conicFrom(mu: number, r: number, angle: number, vt: number, vr: number): Conic | null {
  const v2 = vt * vt + vr * vr;
  const energy = v2 / 2 - mu / r;
  if (energy >= -1e-6) return null;
  const h = r * vt;
  if (h <= 0) return null;
  const a = -mu / (2 * energy);
  const e2 = 1 + (2 * energy * h * h) / (mu * mu);
  if (e2 <= 0 || e2 >= 1) return null;
  const e = Math.sqrt(e2);
  const cosNu = (h * h) / (mu * r * e) - 1 / e;
  const sinNu = (vr * h) / (mu * e);
  const nu = Math.atan2(sinNu, cosNu);
  return { a, e, nu0: nu, periLon: angle - nu, dir: 1 };
}

function hohmannConic(r1: number, r2: number, theta0: number): Conic {
  return {
    a: (r1 + r2) / 2,
    e: Math.abs(r2 - r1) / (r1 + r2),
    nu0: r2 >= r1 ? 0 : Math.PI,
    periLon: theta0,
    dir: 1,
  };
}

function radiusOf(source: BodySource, id: string): number {
  return source.stops.find((stop) => stop.id === id)?.radiusKm || 71_492;
}

/**
 * The swing that leaves at `t0`, or null when Jupiter is not at the end of the first leg, or no turn at five radii can reach the destination, or the closest arrival misses it by more than the gate.
 */
export function swingAt(source: BodySource, to: string, t0: number): { swing: Swing; r1: number; r2: number; theta0: number } | null {
  if (!BEYOND.has(to)) return null;
  const mu = GM_KM3_S2.sun!;
  const muJ = GM_KM3_S2.jupiter!;
  const earth = positionKm(source, "earth", t0, "sun");
  const r1 = flat(earth);
  const theta0 = lon(earth);
  let leg1S = hohmann(mu, r1, flat(positionKm(source, "jupiter", t0, "sun"))).seconds;
  let jupiter = positionKm(source, "jupiter", t0, "sun");
  for (let i = 0; i < 4; i += 1) {
    jupiter = positionKm(source, "jupiter", t0 + leg1S * 1000, "sun");
    leg1S = hohmann(mu, r1, flat(jupiter)).seconds;
  }
  const rJ = flat(jupiter);
  const meet = lon(jupiter);
  if (Math.abs(wrapPi(meet - theta0 - Math.PI)) > 0.08) return null;
  const h = hohmann(mu, r1, rJ);
  const vArr = Math.sqrt(mu * (2 / rJ - 1 / h.a));
  const vJ = circularSpeed(mu, rJ);
  const vInf = vJ - vArr;
  if (vInf <= 0.2) return null;
  const rp = RADII * radiusOf(source, "jupiter");
  const eHyp = 1 + (rp * vInf * vInf) / muJ;
  const delta = 2 * Math.asin(Math.min(1, 1 / eHyp));
  const leg1 = hohmannConic(r1, rJ, theta0);

  const held: { best: { swing: Swing; r2: number; sign: 1 | -1; theta: number } | null } = { best: null };
  const consider = (sign: 1 | -1, theta: number): void => {
    if (theta < 0 || theta > delta + 1e-9) return;
    const vt = vJ - vInf * Math.cos(theta);
    const vr = sign * vInf * Math.sin(theta);
    const leg2 = conicFrom(mu, rJ, meet, vt, vr);
    if (!leg2) return;
    let flight = hohmann(mu, rJ, flat(positionKm(source, to, t0, "sun"))).seconds;
    let dest = positionKm(source, to, t0, "sun");
    for (let n = 0; n < 5; n += 1) {
      dest = positionKm(source, to, t0 + (leg1S + flight) * 1000, "sun");
      const next = timeOut(mu, leg2, flat(dest));
      if (next === null || next > 40 * 365.25 * DAY_S) return;
      flight = next;
    }
    const arrive = conicPoint(mu, leg2, flight);
    const miss = wrapPi(arrive.theta - lon(dest));
    if (held.best && Math.abs(miss) >= Math.abs(held.best.swing.miss)) return;
    const ang = Math.sqrt(mu * leg2.a * (1 - leg2.e * leg2.e));
    const nu = wrapPi(arrive.theta - leg2.periLon);
    const vrOut = (mu / ang) * leg2.e * Math.sin(nu);
    const vtOut = (mu / ang) * (1 + leg2.e * Math.cos(nu));
    held.best = {
      r2: flat(dest),
      sign,
      theta,
      swing: {
        by: "jupiter",
        leg1S,
        leg2S: flight,
        leg1,
        leg2,
        radii: RADII,
        miss,
        vInfDepart: h.dv1,
        vInfArrive: Math.hypot(vrOut, vtOut - circularSpeed(mu, arrive.r)),
      },
    };
  };
  for (const sign of [1, -1] as const) {
    for (let k = 0; k <= 24; k += 1) consider(sign, (delta * k) / 24);
  }
  if (held.best) {
    const sign = held.best.sign;
    const theta = held.best.theta;
    const span = delta / 24;
    for (let k = -8; k <= 8; k += 1) consider(sign, theta + (k * span) / 8);
  }
  if (!held.best || Math.abs(held.best.swing.miss) > MISS) return null;
  return { swing: held.best.swing, r1, r2: held.best.r2, theta0 };
}

/**
 * The next dates a rocket can leave the Earth so that a swing past Jupiter arrives near `to`. Soonest first.
 * @param source Where the planets are.
 * @param to The destination's id. A planet inside Jupiter's orbit yields no dates.
 * @param afterMs The earliest departure, milliseconds since 1970.
 * @param count How many dates.
 */
export function assistWindows(source: BodySource, to: string, afterMs: number, count: number): { dateMs: number; days: number; miss: number }[] {
  if (!BEYOND.has(to) || count < 1) return [];
  const found: { dateMs: number; days: number; miss: number }[] = [];
  for (const date of windows(source, "earth", "jupiter", afterMs, 18)) {
    const swing = swingAt(source, to, date.dateMs);
    if (!swing) continue;
    found.push({ dateMs: date.dateMs, days: (swing.swing.leg1S + swing.swing.leg2S) / DAY_S, miss: swing.swing.miss });
    if (found.length >= count) break;
  }
  return found;
}
