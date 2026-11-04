// The docking collar standard. Every module of the fleet ends in one of four collar classes, and two modules mate when their facing collars are the same class. The classes differ by a factor of two, so a
// ship's spine can step up or down through an adapter. Sizes are metres. Pure: no three.js and no DOM.
import type { Lathe, Piece } from "../pieces.ts";
import { annulus, box, boltRing, disc, hoop, post, ringOf, rod, stamp } from "./detail.ts";

/**
 * The four collar classes: S for small craft and service ports, M for the ordinary module spine, L for heavy spines, H for the heaviest.
 *
 * @example
 * ```ts
 * import type { CollarClass } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const heavy: CollarClass = "L";
 * console.log(heavy);
 * ```
 */
export type CollarClass = "S" | "M" | "L" | "H";

/**
 * What a collar class is, in metres.
 *
 * @example
 * ```ts
 * import { COLLARS, type CollarSpec } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const medium: CollarSpec = COLLARS.M;
 * console.log(medium.outer, medium.bore, medium.bolts);
 * ```
 */
export interface CollarSpec {
  /** Outer diameter of the flange: the diameter of the joint. */
  outer: number;
  /** Diameter of the clear port through the middle. */
  bore: number;
  /** Bolts on the bolt circle, and latch dogs on the rim. */
  bolts: number;
  dogs: number;
  /** Flange thickness. */
  thick: number;
}

/**
 * The collar standard: four classes, each twice the one before.
 *
 * @example
 * ```ts
 * import { COLLARS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(COLLARS.M.outer, COLLARS.L.bore);
 * ```
 */
export const COLLARS: Readonly<Record<CollarClass, CollarSpec>> = {
  S: { outer: 3, bore: 1.4, bolts: 8, dogs: 4, thick: 0.1 },
  M: { outer: 6, bore: 3, bolts: 16, dogs: 8, thick: 0.14 },
  L: { outer: 12, bore: 6, bolts: 24, dogs: 12, thick: 0.24 },
  H: { outer: 24, bore: 12, bolts: 36, dogs: 18, thick: 0.44 },
};

/**
 * The collar classes in order of size.
 *
 * @example
 * ```ts
 * import { COLLAR_CLASSES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(COLLAR_CLASSES.join(" < "));
 * ```
 */
export const COLLAR_CLASSES = ["S", "M", "L", "H"] as const satisfies readonly CollarClass[];

/**
 * Whether two facing collars mate: the same class, and both there.
 *
 * @param a The collar on one module's end, or undefined for none.
 * @param b The collar on the module it meets.
 * @returns True when both are there and of one class.
 * @example
 * ```ts
 * import { mates } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(mates("L", "L"), mates("L", "M"));
 * ```
 */
export const mates = (a: CollarClass | undefined, b: CollarClass | undefined): boolean => a !== undefined && a === b;

/**
 * One collar's pieces. `y` is the face (the end of the module) and `facing` is +1 for a collar on a module's top (the face looks up) and -1 for one on its bottom. Nothing stands out past `y`:
 * the flange sits a little back from the face and the bolt heads fill the space to it, so two collars meet face to face.
 */
export function collar(cls: CollarClass, y: number, facing: 1 | -1): Piece[] {
  const c = COLLARS[cls];
  const t = c.thick;
  const R = c.outer / 2;
  const r = c.bore / 2;
  const back = (d: number) => y - facing * d;
  const lo = Math.min(back(t * 1.5), back(t * 0.5));
  const out: Piece[] = [annulus("hull-grey", r * 1.12, R, lo, lo + t, 64, { outline: false, body: true })];
  // the seal: a dark ring round the bore, on the flange's outer face
  out.push(hoop("black", r * 1.16, back(t * 0.5), t * 0.28, 32, 5));
  // hazard blocks between the seal and the bolts, on the flange face
  for (let i = 0; i < c.bolts; i++) {
    const a0 = (2 * Math.PI * i) / c.bolts;
    out.push({ kind: "lathe", material: i % 2 ? "black" : "hazard", segs: 3, only: "mesh", profile: [[r * 1.24, back(t * 0.46)], [r * 1.24 + (R - r) * 0.14, back(t * 0.46)]], arc: () => [a0, a0 + (2 * Math.PI) / c.bolts] });
  }
  // bolts on the bolt circle
  out.push(...boltRing(r + (R - r) * 0.62, back(t * 0.5), c.bolts, t * 0.83, facing === -1));
  // alignment pins, four, between bolts
  const pin: Lathe = { kind: "lathe", material: "hull-yellow", segs: 8, only: "mesh", profile: [[t * 0.55, back(t * 0.5)], [t * 0.35, y], [0.001, y]] };
  out.push(...stamp([pin], ringOf(4, r + (R - r) * 0.34, 0, 45)));
  // latch dogs on the rim
  out.push(...stamp([box("panel-dark", [0, lo, R - t], t * 2.6, t * 2.2, t * 1.5)], ringOf(c.dogs, 0, 0)));
  // the port: a tube down from the bore and a pressure door in it
  const doorY = back(Math.max(0.6, c.bore * 0.22));
  out.push(post("hull-grey-dark", [0, 0], r, Math.min(y, doorY), r, Math.max(y, doorY), 24));
  out.push(disc("hull-grey", [0, 0], r * 0.97, doorY - (facing === 1 ? 0.08 : 0), 0.08, 24));
  out.push(hoop("hull-grey-dark", r * 0.7, doorY + facing * 0.12, 0.05, 24, 5));
  out.push(rod("hull-grey", [-r * 0.55, doorY + facing * 0.12, 0], [r * 0.55, doorY + facing * 0.12, 0], 0.05, 6), rod("hull-grey", [0, doorY + facing * 0.12, -r * 0.55], [0, doorY + facing * 0.12, r * 0.55], 0.05, 6));
  return out;
}
