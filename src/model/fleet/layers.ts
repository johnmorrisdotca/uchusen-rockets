// Hull layers: a numbered stack from the outside in, each with a thickness in millimetres and a material, a few presets by a ship's role, and the real concentric shells that show at a cutaway's edge. The stacks
// are data that every ship shares; a module's cutaway draws the stack of the role it is given. Pure: no three.js and no DOM.
import type { MaterialName } from "../materials.ts";
import type { Lathe, Piece, Plate, Vec3 } from "../pieces.ts";

/**
 * One layer of a hull: its place in the stack (1 is the outside), what it is, what it is made of, its thickness in millimetres, and what it is for.
 *
 * @example
 * ```ts
 * import { HULL_STACKS, type HullLayer } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const outer: HullLayer = HULL_STACKS.transport.layers[0];
 * console.log(outer.n, outer.name, outer.mm);
 * ```
 */
export interface HullLayer {
  n: number;
  id: "ablative" | "whipple" | "armour" | "foam" | "pressure" | "frame" | "lining" | "water" | "radiation";
  name: string;
  /** What the mesh is drawn in. */
  material: MaterialName;
  /** The material in words. */
  made: string;
  /** Thickness in millimetres. */
  mm: number;
  note: string;
}

/**
 * A stack of hull layers for a role, outside in.
 *
 * @example
 * ```ts
 * import { HULL_STACKS, type HullStack } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const stack: HullStack = HULL_STACKS.explorer;
 * console.log(stack.role, stack.layers.length);
 * ```
 */
export interface HullStack {
  role: string;
  /** What the stack is chosen for. */
  why: string;
  layers: readonly HullLayer[];
}

/**
 * The name of a preset in `HULL_STACKS`.
 *
 * @example
 * ```ts
 * import type { HullStackName } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const role: HullStackName = "transport";
 * console.log(role);
 * ```
 */
export type HullStackName = "transport" | "explorer" | "command" | "liner" | "tanker";

const layer = (n: number, id: HullLayer["id"], name: string, material: MaterialName, made: string, mm: number, note: string): HullLayer => ({ n, id, name, material, made, mm, note });

/**
 * The hull-layer presets by role. Every stack runs outside in: ablative skin, micrometeoroid shield, armour, foam absorber, pressure hull, frame, lining; a role changes the thicknesses, drops layers it does
 * not need and adds the ones it does (a transport adds water and polymer radiation shielding). Thicknesses are millimetres; the cutaway draws them as separate shells at their real thickness.
 *
 * @example
 * ```ts
 * import { HULL_STACKS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const [name, stack] of Object.entries(HULL_STACKS)) console.log(name, stack.layers.reduce((sum, one) => sum + one.mm, 0), "mm");
 * ```
 */
export const HULL_STACKS: Readonly<Record<HullStackName, HullStack>> = {
  transport: {
    role: "Heavy transport",
    why: "Thick radiation shielding for a hull that carries people and cargo for years: water and polymer between a heavy bumper and the pressure hull.",
    layers: [
      layer(1, "ablative", "Ablative skin", "tile-plain", "ceramic-felt tile on a carbon mat", 40, "Takes dust and gas at speed and sheds heat."),
      layer(2, "whipple", "Micrometeoroid shield", "hull-grey", "spaced aluminium-ceramic bumper sheets", 120, "Breaks a fast grain into vapour before it reaches the armour."),
      layer(3, "armour", "Armour plate", "hull-grey-dark", "steel-titanium laminate", 180, "Stops what the bumper does not."),
      layer(4, "radiation", "Radiation shield", "hull-blue", "borated polymer", 260, "Slows neutrons from the drive and the cosmic background."),
      layer(5, "water", "Water jacket", "fuel", "water in cells", 300, "Absorbs radiation, and doubles as the emergency reserve."),
      layer(6, "foam", "Foam absorber", "foam", "metal foam", 90, "Spreads an impact's load before the pressure hull."),
      layer(7, "pressure", "Pressure hull", "hull-white", "aluminium-lithium shell", 60, "Holds the air in."),
      layer(8, "frame", "Frame", "hull-grey-dark", "titanium ring frames and stringers", 350, "Carries the loads of thrust and docking."),
      layer(9, "lining", "Interior lining", "hull-white-worn", "fire-proof panels on cable runs", 30, "What a crew sees, with services behind it."),
    ],
  },
  explorer: {
    role: "Explorer",
    why: "A lighter whipple shield: two bumpers and a thin armour layer, because a survey ship trades mass for speed.",
    layers: [
      layer(1, "ablative", "Ablative skin", "tile-plain", "ceramic-felt tile", 20, "Dust and gas at speed."),
      layer(2, "whipple", "Whipple bumper", "hull-grey", "thin aluminium sheet, spaced", 60, "Turns a grain to vapour."),
      layer(3, "whipple", "Second bumper", "hull-grey", "woven ceramic cloth, spaced", 50, "Spreads the vapour."),
      layer(4, "foam", "Foam absorber", "foam", "aluminium foam", 70, "Takes the rest."),
      layer(5, "pressure", "Pressure hull", "hull-white", "aluminium-lithium shell", 40, "Holds the air in."),
      layer(6, "frame", "Frame", "hull-grey-dark", "carbon-fibre frames", 200, "Light structure."),
      layer(7, "lining", "Interior lining", "hull-white-worn", "panels on cable runs", 25, "The cabin wall."),
    ],
  },
  command: {
    role: "Command ship",
    why: "Armour: a thick laminate and an impact absorber that spreads a hit, for a ship made to be shot at or to take a collision.",
    layers: [
      layer(1, "ablative", "Ablative skin", "tile-plain", "ceramic tile", 50, "Heat and dust."),
      layer(2, "armour", "Outer armour", "hull-grey-dark", "ceramic-metal composite", 260, "Defeats a hard hit."),
      layer(3, "foam", "Impact absorber", "foam", "layered metal foam", 160, "Spreads the shock."),
      layer(4, "armour", "Inner armour", "hull-grey", "titanium laminate", 140, "Catches spall."),
      layer(5, "whipple", "Micrometeoroid shield", "hull-blue", "spaced fabric bumpers", 80, "Dust and small grains."),
      layer(6, "pressure", "Pressure hull", "hull-white", "aluminium-lithium shell", 60, "Holds the air in."),
      layer(7, "frame", "Frame", "hull-grey-dark", "titanium frames", 320, "Carries the armour."),
      layer(8, "lining", "Interior lining", "hull-white-worn", "panels on cable runs", 30, "The wall of the rooms."),
    ],
  },
  liner: {
    role: "Passenger liner",
    why: "Comfort and safety for many people: a medium shield, a thick foam layer and a quiet lining.",
    layers: [
      layer(1, "ablative", "Ablative skin", "tile-plain", "ceramic-felt tile", 30, "Dust and gas."),
      layer(2, "whipple", "Micrometeoroid shield", "hull-grey", "spaced aluminium sheets", 90, "Breaks a grain."),
      layer(3, "radiation", "Radiation shield", "hull-blue", "polyethylene", 180, "Slows neutrons and protons."),
      layer(4, "foam", "Foam absorber", "foam", "metal foam", 100, "Spreads an impact."),
      layer(5, "pressure", "Pressure hull", "hull-white", "aluminium-lithium shell", 50, "Holds the air in."),
      layer(6, "frame", "Frame", "hull-grey-dark", "titanium frames", 260, "Structure."),
      layer(7, "lining", "Interior lining", "hull-white-worn", "padded panels", 45, "A quiet cabin wall, services behind."),
    ],
  },
  tanker: {
    role: "Tanker",
    why: "A tank wall: a bumper, an insulating foam and a thick pressure wall, with little else, because the cargo is the shield.",
    layers: [
      layer(1, "ablative", "Ablative skin", "tile-plain", "ceramic-felt tile", 25, "Dust and gas."),
      layer(2, "whipple", "Micrometeoroid shield", "hull-grey", "aluminium bumper, spaced", 80, "Breaks a grain."),
      layer(3, "foam", "Insulating foam", "foam", "closed-cell foam", 140, "Keeps the propellant cold."),
      layer(4, "pressure", "Tank wall", "hull-white", "aluminium-lithium shell", 80, "Holds the propellant."),
      layer(5, "frame", "Frame", "hull-grey-dark", "ring frames", 220, "Baffle and ring supports."),
      layer(6, "lining", "Inner lining", "frost", "frost-proof liner", 20, "Faces the cold liquid."),
    ],
  },
};

/**
 * The total thickness of a stack in metres.
 *
 * @param stack A stack from `HULL_STACKS`.
 * @returns Its thickness in metres.
 * @example
 * ```ts
 * import { HULL_STACKS, stackDepth } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(stackDepth(HULL_STACKS.transport));
 * ```
 */
export const stackDepth = (stack: HullStack): number => stack.layers.reduce((sum, one) => sum + one.mm, 0) / 1000;

/**
 * The shells of a stack at a cutaway: one concentric shell for each layer at its real thickness, outside in from the radius `R`, and at the two cut edges a flat face for each layer, so the stack reads layer by layer.
 * `arc` is the part of the circle the hull covers.
 */
export function layerShells(R: number, y0: number, y1: number, stack: HullStack, arc: readonly [number, number], segs = 40): Piece[] {
  const out: Piece[] = [];
  let r = R;
  for (const l of stack.layers) {
    const inner = r - l.mm / 1000;
    const shell: Lathe = { kind: "lathe", material: l.material, segs, only: "mesh", profile: [[inner, y0], [inner, y1], [r, y1], [r, y0], [inner, y0]], arc: () => arc };
    out.push(shell);
    r = inner;
  }
  // a flat face at each cut edge for each layer: a plate standing across the stack's radius
  for (const a of arc) {
    let outer = R;
    for (const l of stack.layers) {
      const thick = l.mm / 1000;
      const mid = outer - thick / 2;
      const u: Vec3 = [Math.sin(a), 0, Math.cos(a)];
      const w: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
      const plate: Plate = { kind: "plate", material: l.material, frame: { o: [u[0] * mid, (y0 + y1) / 2, u[2] * mid], u, v: [0, 1, 0], w }, outline: [[-thick / 2, -(y1 - y0) / 2], [thick / 2, -(y1 - y0) / 2], [thick / 2, (y1 - y0) / 2], [-thick / 2, (y1 - y0) / 2]], thickness: 0.02, plain: true, only: "mesh" };
      out.push(plate);
      outer -= thick;
    }
  }
  return out;
}
