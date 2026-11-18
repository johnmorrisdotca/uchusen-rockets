// Leaving the Moon. A craft in a low lunar orbit burns to escape the Moon, then coasts in the Earth's frame. Two returns are worked here: the cheapest Hohmann, which takes about five days, and the faster one the page flies, which meets the atmosphere in three days, as Apollo did. A trip on to another planet uses the Moon's orbital speed around the Earth as a help. Pure.
import { circularSpeed, escapeBurn, hohmann, kepler } from "./physics.ts";

/** How high above the Earth the faster return is aimed, kilometres: 400,000 feet, the entry interface Apollo used. */
export const ENTRY_ALTITUDE_KM = 122;
/** The coast Saturn V's return is solved for, seconds: 72 hours. Apollo 12's trans-Earth burn was at 172:27:16 ground elapsed time and its entry interface at 244:22:18, 71 h 55 min later (Apollo Flight Journal, Apollo 12 days 7 and 10). */
export const APOLLO_RETURN_S = 72 * 3600;

/**
 * A coast about one body that is not the half-ellipse `transferPoint` draws: its semi-major axis and eccentricity, the true anomaly at departure, the longitude of periapsis, and which way the anomaly grows.
 */
export interface Conic {
  a: number;
  e: number;
  nu0: number;
  periLon: number;
  dir: 1 | -1;
}

const TAU = 2 * Math.PI;
const wrap = (angle: number): number => angle - TAU * Math.floor((angle + Math.PI) / TAU);

/** True anomaly to mean anomaly, for an ellipse. */
const meanOf = (nu: number, e: number): number => {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return E - e * Math.sin(E);
};

/**
 * Where a craft is on a `Conic`, `t` seconds after departure: distance and longitude in the frame, and speed.
 * @param muKm3s2 The central body's gravitational parameter, km^3/s^2.
 * @param conic The coast.
 * @param t Seconds after departure.
 * @returns The radius (km), the longitude (radians), the speed (km/s) and the plane coordinates (km).
 */
export function conicPoint(muKm3s2: number, conic: Conic, t: number): { r: number; theta: number; v: number; x: number; y: number } {
  const n = Math.sqrt(muKm3s2 / (conic.a * conic.a * conic.a));
  const M = meanOf(conic.nu0, conic.e) + conic.dir * n * t;
  const E = kepler(M, conic.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + conic.e) * Math.sin(E / 2), Math.sqrt(1 - conic.e) * Math.cos(E / 2));
  const r = conic.a * (1 - conic.e * Math.cos(E));
  const theta = conic.periLon + nu;
  return { r, theta, v: Math.sqrt(muKm3s2 * (2 / r - 1 / conic.a)), x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

interface Ellipse {
  a: number;
  e: number;
  rp: number;
  nu0: number;
  dir: 1 | -1;
  vt: number;
  vr: number;
}

/** The Earth-frame ellipse of a craft that leaves the Moon's distance with a hyperbolic excess `vInf` aimed `deg` degrees from the Moon's direction of motion (180 is straight back along that motion, 90 is straight in toward the Earth). */
function ellipseAt(muEarth: number, rMoon: number, vInf: number, deg: number): Ellipse | null {
  const vMoon = circularSpeed(muEarth, rMoon);
  const a = (deg * Math.PI) / 180;
  const vt = vMoon + vInf * Math.cos(a);
  const vr = -vInf * Math.sin(a);
  const v2 = vr * vr + vt * vt;
  const energy = v2 / 2 - muEarth / rMoon;
  if (energy >= 0) return null;
  const h = rMoon * vt;
  const ex = (vt * h) / muEarth - 1;
  const ey = (-vr * h) / muEarth;
  const e = Math.hypot(ex, ey);
  if (e >= 1) return null;
  const sma = -muEarth / (2 * energy);
  const nu0 = wrap(-Math.atan2(ey, ex));
  return { a: sma, e, rp: sma * (1 - e), nu0, dir: h >= 0 ? 1 : -1, vt, vr };
}

/** Seconds from departure until the radius is `rStop`, or null when the orbit never gets that low. */
function timeTo(muEarth: number, orbit: Ellipse, rStop: number): number | null {
  if (orbit.rp > rStop + 1) return null;
  const p = orbit.a * (1 - orbit.e * orbit.e);
  const cosT = (p / rStop - 1) / orbit.e;
  if (cosT > 1 || cosT < -1) return null;
  const nuT = Math.acos(cosT);
  const n = Math.sqrt(muEarth / (orbit.a * orbit.a * orbit.a));
  let best: number | null = null;
  for (const target of [nuT, -nuT]) {
    let d = wrap(target - orbit.nu0);
    if (orbit.dir * d < 0) d += orbit.dir * TAU;
    const dt = Math.abs(meanOf(orbit.nu0 + d, orbit.e) - meanOf(orbit.nu0, orbit.e)) / n;
    if (best === null || dt < best) best = dt;
  }
  return best;
}

/** The excess speed that puts periapsis on `rEntry` for one aim angle. Periapsis is not monotone in the excess, and a large excess is a hyperbola, so the search samples the bound range and bisects each crossing. When two crossings exist, the one whose coast is nearer 72 hours wins. */
function excessFor(muEarth: number, rMoon: number, rEntry: number, deg: number, targetS?: number): { vInf: number; orbit: Ellipse } | null {
  const sample = (v: number): Ellipse | null => ellipseAt(muEarth, rMoon, v, deg);
  const steps: { v: number; orbit: Ellipse }[] = [];
  for (let v = 0.35; v <= 2.2; v += 0.05) {
    const orbit = sample(v);
    if (orbit) steps.push({ v, orbit });
  }
  let best: { vInf: number; orbit: Ellipse; miss: number } | null = null;
  for (let i = 1; i < steps.length; i += 1) {
    const before = steps[i - 1]!;
    const after = steps[i]!;
    if ((before.orbit.rp - rEntry) * (after.orbit.rp - rEntry) > 0) continue;
    let lo = before.v;
    let hi = after.v;
    let loRp = before.orbit.rp;
    for (let k = 0; k < 40; k += 1) {
      const mid = (lo + hi) / 2;
      const got = sample(mid);
      if (!got) break;
      if ((loRp - rEntry) * (got.rp - rEntry) <= 0) hi = mid;
      else {
        lo = mid;
        loRp = got.rp;
      }
    }
    const orbit = sample((lo + hi) / 2);
    if (!orbit) continue;
    const transit = timeTo(muEarth, orbit, rEntry);
    if (transit === null) continue;
    const miss = targetS === undefined ? (lo + hi) / 2 : Math.abs(transit - targetS);
    if (!best || miss < best.miss) best = { vInf: (lo + hi) / 2, orbit, miss };
  }
  return best ? { vInf: best.vInf, orbit: best.orbit } : null;
}

/** Aim angles tried for the return, degrees from the Moon's direction of motion, and the step between them. */
const AIM_FROM = 110;
const AIM_TO = 165;
const AIM_STEP = 0.05;

/**
 * The return the page flies: leave a circular lunar orbit so the coast meets the atmosphere at the entry interface. With a flight time from a real mission (`targetS`) the aim is the one whose coast is closest to it; without one it is the one that costs the least burn.
 * Transit time is not monotone in the aim, so every aim is tried and the best kept, not found by bisecting from a coarse guess.
 * @param muEarth The Earth's gravitational parameter, km^3/s^2.
 * @param muMoon The Moon's gravitational parameter, km^3/s^2.
 * @param rMoonKm The Moon's distance from the Earth's centre, km.
 * @param rLloKm The parking orbit's radius from the Moon's centre, km.
 * @param rEntryKm The radius of the entry interface from the Earth's centre, km.
 * @param moonLon The Moon's longitude in the Earth's frame, radians.
 * @param targetS The coast of a real mission, seconds, or undefined for the cheapest burn.
 * @returns The burn (km/s), the coast, and the conic that draws it.
 */
export function atmosphereReturn(muEarth: number, muMoon: number, rMoonKm: number, rLloKm: number, rEntryKm: number, moonLon: number, targetS?: number): { dvKmS: number; vInfKmS: number; transitS: number; parkSpeed: number; burnEndSpeed: number; entrySpeed: number; conic: Conic } {
  const cost = (c: { vInf: number; transit: number }): number => (targetS === undefined ? c.vInf : Math.abs(c.transit - targetS));
  let best: { deg: number; vInf: number; orbit: Ellipse; transit: number } | null = null;
  for (let deg = AIM_FROM; deg <= AIM_TO + 1e-9; deg += AIM_STEP) {
    const hit = excessFor(muEarth, rMoonKm, rEntryKm, deg, targetS);
    if (!hit) continue;
    const transit = timeTo(muEarth, hit.orbit, rEntryKm);
    if (transit === null) continue;
    const found = { deg, vInf: hit.vInf, orbit: hit.orbit, transit };
    if (!best || cost(found) < cost(best)) best = found;
  }
  if (!best) throw new Error("No return from this lunar distance.");
  if (targetS !== undefined) {
    // Between two neighbouring aims the coast does move one way, so bisect it onto the flight time.
    let lo = Math.max(AIM_FROM, best.deg - AIM_STEP);
    let hi = Math.min(AIM_TO, best.deg + AIM_STEP);
    const at = (deg: number): number | null => {
      const hit = excessFor(muEarth, rMoonKm, rEntryKm, deg, targetS);
      return hit ? timeTo(muEarth, hit.orbit, rEntryKm) : null;
    };
    const loT = at(lo);
    const hiT = at(hi);
    if (loT !== null && hiT !== null && (loT - targetS) * (hiT - targetS) <= 0) {
      for (let i = 0; i < 30; i += 1) {
        const mid = (lo + hi) / 2;
        const hit = excessFor(muEarth, rMoonKm, rEntryKm, mid, targetS);
        const transit = hit ? timeTo(muEarth, hit.orbit, rEntryKm) : null;
        if (!hit || transit === null) break;
        const found = { deg: mid, vInf: hit.vInf, orbit: hit.orbit, transit };
        if (cost(found) < cost(best)) best = found;
        if ((transit - targetS) * (loT - targetS) > 0) lo = mid;
        else hi = mid;
      }
    }
  }
  const dv = escapeBurn(muMoon, rLloKm, best.vInf);
  const park = circularSpeed(muMoon, rLloKm);
  const entrySpeed = Math.sqrt(muEarth * (2 / rEntryKm - 1 / best.orbit.a));
  return {
    dvKmS: dv,
    vInfKmS: best.vInf,
    transitS: best.transit,
    parkSpeed: park,
    burnEndSpeed: park + dv,
    entrySpeed,
    conic: { a: best.orbit.a, e: best.orbit.e, nu0: best.orbit.nu0, periLon: moonLon - best.orbit.nu0, dir: best.orbit.dir },
  };
}

/**
 * The cheapest return: a Hohmann transfer from the Moon's distance down to a parking orbit at the Earth, and the burn that leaves low lunar orbit onto it.
 * @returns The lunar burn (km/s) and the coast (seconds). About 0.82 km/s and five days from a mean Moon.
 */
export function hohmannReturn(muEarth: number, muMoon: number, rMoonKm: number, rEarthParkKm: number, rLloKm: number): { dvKmS: number; transitS: number; vInfKmS: number } {
  const h = hohmann(muEarth, rMoonKm, rEarthParkKm);
  return { dvKmS: escapeBurn(muMoon, rLloKm, h.dv1), transitS: h.seconds, vInfKmS: h.dv1 };
}

/**
 * The burn that leaves low lunar orbit for another planet: escape the Moon onto an Earth-escape path whose speed at infinity is the heliocentric transfer's, with the Moon's own orbital speed taken as helping.
 * @param vInfEarthKmS The speed the craft must still have, relative to the Earth, once it has left the Earth, km/s.
 * @returns The lunar burn, km/s, and the speeds in lunar orbit.
 */
export function leaveForPlanet(muEarth: number, muMoon: number, rMoonKm: number, rLloKm: number, vInfEarthKmS: number): { dvKmS: number; vInfMoon: number; parkSpeed: number; burnEndSpeed: number } {
  const vAtMoon = Math.sqrt(vInfEarthKmS * vInfEarthKmS + (2 * muEarth) / rMoonKm);
  const vInfMoon = Math.abs(vAtMoon - circularSpeed(muEarth, rMoonKm));
  const park = circularSpeed(muMoon, rLloKm);
  const dv = escapeBurn(muMoon, rLloKm, vInfMoon);
  return { dvKmS: dv, vInfMoon, parkSpeed: park, burnEndSpeed: park + dv };
}
