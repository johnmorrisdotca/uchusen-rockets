// The pull on a craft from the bodies of a scene: each a point mass, and a body's flattening (its J2, J3 and J4 terms) where the caller gives it. Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter), Src/Orbiter/Psys.cpp: SingleGacc, the J-coefficient branch of
// SingleGacc_perturbation, and PlanetarySystem::Gacc. Copyright (c) 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt).
// Changed in the port: a right-handed frame; Orbiter's polar unit vector (er x (er x pole)) is written out as -(pole - s r) / cos(latitude),
// and the cosine of the latitude in each polar term cancels it, so nothing is divided by zero over a pole; the bodies are a list the
// caller hands in, at the time asked, in place of Orbiter's planetary system; Orbiter's spherical-harmonic (Pines) model is not ported.
import { type Vec3 } from "./vector.ts";

const EPS = 1e-10;

/**
 * A body's flattening, as the zonal terms of its gravity field: `J2`, and if given `J3` and `J4`, which is as far as Orbiter reads them.
 *
 * @example
 * ```ts
 * import type { Zonal } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth: Zonal = { radius: 6_378_137, pole: [0, 0, 1], j: [0.00108262545] };
 * console.log(earth.j[0]);
 * ```
 */
export interface Zonal {
  /** The reference radius the coefficients are given for (usually the equatorial radius), metres. */
  radius: number;
  /** The body's north pole, a unit vector in the frame. */
  pole: Vec3;
  /** `[J2]`, `[J2, J3]` or `[J2, J3, J4]`, unnormalised. Further terms are ignored. */
  j: readonly number[];
}

/**
 * One body that pulls: its gravitational parameter, where it is at the time asked, and its flattening if it matters.
 *
 * @example
 * ```ts
 * import type { GravityBody } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const sun: GravityBody = { gm: 1.32712440041279419e20, position: [0, 0, 0] };
 * console.log(sun.gm);
 * ```
 */
export interface GravityBody {
  /** Gravitational parameter, m^3/s^2. */
  gm: number;
  /** Where the body's centre is, metres, in the craft's frame. */
  position: Vec3;
  zonal?: Zonal;
}

/** The pull of a flattened body beyond its point mass, at `offset` (the craft from the body's centre, metres), at distance `d`. */
function zonalPull(gm: number, zonal: Zonal, offset: Vec3, d: number): Vec3 {
  const [j2 = 0, j3 = 0, j4 = 0] = zonal.j;
  const rr = zonal.radius / d;
  let rrn = rr * rr;
  let jn = j2 * rrn;
  if (Math.abs(jn) <= EPS) return [0, 0, 0];
  const r: Vec3 = [offset[0] / d, offset[1] / d, offset[2] / d];
  const p = zonal.pole;
  const s = r[0] * p[0] + r[1] * p[1] + r[2] * p[2];
  const s2 = s * s;
  let radial = 1.5 * jn * (1 - 3 * s2);
  let polar = 3 * jn * s;
  if (zonal.j.length > 1) {
    rrn *= rr;
    jn = j3 * rrn;
    if (Math.abs(jn) > EPS) {
      radial += 2 * jn * s * (3 - 5 * s2);
      polar += 1.5 * jn * (-1 + 5 * s2);
      if (zonal.j.length > 2) {
        rrn *= rr;
        jn = j4 * rrn;
        if (Math.abs(jn) > EPS) {
          radial += -0.625 * jn * (3 + s2 * (-30 + 35 * s2));
          polar += 2.5 * jn * s * (-3 + 7 * s2);
        }
      }
    }
  }
  const t0 = gm / (d * d);
  const along = radial - polar * s;
  return [-t0 * (along * r[0] + polar * p[0]), -t0 * (along * r[1] + polar * p[1]), -t0 * (along * r[2] + polar * p[2])];
}

/**
 * The acceleration gravity gives a craft at a place: the sum of `gm (body - craft) / d^3` over the bodies, plus each flattened body's zonal terms (Orbiter's `SingleGacc` summed as in `PlanetarySystem::Gacc`).
 * For the best answer give the bodies in a frame that is not itself accelerating, such as the solar system's barycentre; a frame centred on a body that the others pull leaves out that pull on the frame.
 * @param position The craft's position, metres.
 * @param bodies The bodies that pull, at the same time and in the same frame.
 * @returns The acceleration, metres a second squared.
 * @example
 * ```ts
 * import { gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const g = gravityAt([6_378_137, 0, 0], [{ gm: 3.986004418e14, position: [0, 0, 0] }]);
 * console.log(g[0].toFixed(3), "m/s^2");
 * ```
 */
export function gravityAt(position: Vec3, bodies: readonly GravityBody[]): Vec3 {
  let ax = 0;
  let ay = 0;
  let az = 0;
  for (const body of bodies) {
    const dx = body.position[0] - position[0];
    const dy = body.position[1] - position[1];
    const dz = body.position[2] - position[2];
    const d = Math.hypot(dx, dy, dz);
    const k = body.gm / (d * d * d);
    ax += dx * k;
    ay += dy * k;
    az += dz * k;
    if (body.zonal) {
      const extra = zonalPull(body.gm, body.zonal, [-dx, -dy, -dz], d);
      ax += extra[0];
      ay += extra[1];
      az += extra[2];
    }
  }
  return [ax, ay, az];
}
