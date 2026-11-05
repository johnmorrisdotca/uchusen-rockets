// The tractor beam: a soft cone from a drone to the part it carries, a flash when it takes hold and when it lets go, and a dotted line when motion is reduced. The shape is the same in every look. Pure: no three.js and no DOM.
import type { Vec3 } from "./framing.ts";
import type { MaterialName } from "./model/materials.ts";
import { strut, type Piece, type Plate } from "./model/pieces.ts";

/**
 * What the beam is doing: taking hold, carrying, letting go, or watching the part settle into its slot.
 *
 * @example
 * ```ts
 * import { tractorBeam, type BeamPhase } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const phase: BeamPhase = "carry";
 * console.log(tractorBeam({ from: [0, 0, 0], part: [0, 8, 0], slot: [0, 10, 0] }, phase).length > 0);
 * ```
 */
export type BeamPhase = "attach" | "carry" | "release" | "settle";

/**
 * The two ends of a carry, and the slot the part is heading for.
 *
 * @example
 * ```ts
 * import { tractorBeam, type BeamEnds } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ends: BeamEnds = { from: [0, 0, 0], part: [0, 8, 0], slot: [0, 10, 0] };
 * console.log(tractorBeam(ends, "carry").length > 0);
 * ```
 */
export interface BeamEnds {
  /** The emitter, on the drone. */
  from: Vec3;
  /** Where the part is. */
  part: Vec3;
  /** Where the part settles. */
  slot: Vec3;
}

const SIDES = 24;
const DOTS = 8;

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const apart = (a: Vec3, b: Vec3): number => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

function segments(from: Vec3, to: Vec3, width0: number, width1: number, material: MaterialName, steps: number, fraction = 1): Plate[] {
  const out: Plate[] = [];
  for (let i = 0; i < steps; i++) {
    const a = mix(from, to, i / steps);
    const b = mix(from, to, (i + fraction) / steps);
    const width = width0 + (width1 - width0) * ((i + 0.5) / steps);
    out.push(strut(material, a, b, width, width));
  }
  return out;
}

function basis(from: Vec3, to: Vec3): { u: Vec3; v: Vec3; w: Vec3 } {
  const along: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...along) || 1;
  const u: Vec3 = [along[0] / length, along[1] / length, along[2] / length];
  const seed: Vec3 = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const raw: Vec3 = [u[1] * seed[2] - u[2] * seed[1], u[2] * seed[0] - u[0] * seed[2], u[0] * seed[1] - u[1] * seed[0]];
  const l = Math.hypot(...raw) || 1;
  const v: Vec3 = [raw[0] / l, raw[1] / l, raw[2] / l];
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return { u, v, w };
}

function at(from: Vec3, frame: { u: Vec3; v: Vec3; w: Vec3 }, along: number, around: number, radius: number): Vec3 {
  const c = Math.cos(around);
  const s = Math.sin(around);
  return [
    from[0] + frame.u[0] * along + frame.v[0] * c * radius + frame.w[0] * s * radius,
    from[1] + frame.u[1] * along + frame.v[1] * c * radius + frame.w[1] * s * radius,
    from[2] + frame.u[2] * along + frame.v[2] * c * radius + frame.w[2] * s * radius,
  ];
}

/** A cone of 24 faces, narrow at the drone and wide at the part. */
function cone(from: Vec3, to: Vec3, material: MaterialName): Plate[] {
  const frame = basis(from, to);
  const length = apart(from, to);
  const narrow = 0.12;
  const wide = 1.2;
  const chord = 2 * wide * Math.sin(Math.PI / SIDES);
  const out: Plate[] = [];
  for (let i = 0; i < SIDES; i++) {
    const turn = (i / SIDES) * Math.PI * 2;
    out.push(strut(material, at(from, frame, 0, turn, narrow), at(from, frame, length, turn, wide), chord, 0.04));
  }
  return out;
}

function flashOf(at: Vec3, backToward: Vec3): Plate {
  const len = apart(at, backToward) || 1;
  const back = mix(at, backToward, Math.min(0.45, len) / len);
  return strut("strobe", back, at, 0.55, 0.55);
}

/**
 * The pieces of the beam. A carry is a cone of 24 faces, narrow at the drone and wide at the part. Attach and release add a flash at the part. While the part settles the cone runs to where the part is between its start and the slot, and it is gone once the part is home. Reduced motion draws a dotted line and no flash.
 *
 * @param ends The drone, the part and the slot.
 * @param phase Attach, carry, release or settle.
 * @param reduced True when the reader asked for reduced motion: a dotted line, and no flash.
 * @param settle How far the part has settled, from 0 to 1. Only the settle phase reads it.
 * @returns The pieces. Empty once the part is in its slot.
 * @example
 * ```ts
 * import { tractorBeam } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ends = { from: [0, 0, 0], part: [0, 8, 0], slot: [0, 10, 0] };
 * console.log(tractorBeam(ends, "settle", false, 1).length);
 * ```
 */
export function tractorBeam(ends: BeamEnds, phase: BeamPhase, reduced = false, settle = 0): Piece[] {
  const home = phase === "settle" ? Math.min(1, Math.max(0, settle)) : 0;
  if (home >= 1) return [];
  const to = phase === "settle" ? mix(ends.part, ends.slot, home) : ends.part;
  if (apart(ends.from, to) < 0.05) return [];
  const line = reduced ? segments(ends.from, to, 0.08, 0.08, "lamp-blue", DOTS, 0.4) : cone(ends.from, to, "lamp-blue");
  if (reduced || phase === "carry" || phase === "settle") return line;
  return [...line, flashOf(to, ends.from)];
}
