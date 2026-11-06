// Another rocket standing beside the one on screen, at true scale: where it stands and the box the camera must hold. Pure, so the drawing, the 3D view and the tests all ask here.
import type { Description } from "./fit.ts";
import type { Vec3 } from "./framing.ts";
import type { Bounds } from "./model/pieces.ts";
import { ROCKETS, variantOf } from "./rockets.ts";

/**
 * The rocket that can stand beside another for scale: the real Starship stack, Super Heavy and the ship, Block 3. Beside another craft it is drawn in this package's own paint, so no licensed model comes in unseen.
 *
 * @example
 * ```ts
 * import { BESIDE_ROCKET } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(BESIDE_ROCKET.rocket, BESIDE_ROCKET.variant);
 * ```
 */
export const BESIDE_ROCKET: Readonly<Description> = { rocket: "starship", variant: "v3" };

/** What the stack beside is called. */
export const BESIDE_NAME = "Starship with Super Heavy";

/**
 * The words that say what the craft beside it is: its name and its sourced length, such as "Starship with Super Heavy, 124.4 m".
 *
 * @returns The label the 3D view puts under the stack.
 * @example
 * ```ts
 * import { besideLabel } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(besideLabel());
 * ```
 */
export function besideLabel(): string {
  const height = variantOf(BESIDE_ROCKET.rocket, BESIDE_ROCKET.variant)?.facts.height.value;
  return typeof height === "number" ? `${BESIDE_NAME}, ${height.toLocaleString("en-US")} m` : BESIDE_NAME;
}

/**
 * The words that name one craft in a picture of several: its name, then its length in metres, such as "Saturn V (Apollo), 110.64 m". A real craft's length is its sourced height when a source gave one; otherwise the model's own height in the picture, `tall`.
 *
 * @param description The craft's rocket and variant.
 * @param tall The height of its model, in metres, used when no source gave its length.
 * @returns The label.
 * @example
 * ```ts
 * import { craftName } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(craftName({ rocket: "saturn-v", variant: "saturn-v" }, 110.6));
 * ```
 */
export function craftName(description: Readonly<Description>, tall: number): string {
  const rocket = Object.hasOwn(ROCKETS, description.rocket) ? ROCKETS[description.rocket] : undefined;
  const variant = variantOf(description.rocket, description.variant);
  if (!rocket || !variant) return description.rocket;
  const name = variant.name.includes(rocket.name) || rocket.name.includes(variant.name) ? variant.name : `${rocket.name}, ${variant.name}`;
  const sourced = variant.facts.height.value;
  const metres = typeof sourced === "number" && !description.rocket.startsWith("fleet-") ? sourced : Math.round(tall);
  return `${name}, ${metres.toLocaleString("en-US")} m`;
}

/**
 * The most craft that stand beside the one on screen: seven, so eight in all.
 *
 * @example
 * ```ts
 * import { BESIDE_MOST } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(BESIDE_MOST + 1);
 * ```
 */
export const BESIDE_MOST = 7;

/**
 * The craft that stand beside a rocket, from the element's `beside` attribute: `on` is Starship with Super Heavy (never beside Starship itself), and a list such as `saturn-v:saturn-v,iss:iss` is those craft, at most seven, each a rocket and a variant (the rocket's default variant when none is given). Anything that is not a craft is left out.
 *
 * @param value The attribute's value.
 * @param rocket The rocket on screen.
 * @returns The craft that stand beside it, in order from the left.
 * @example
 * ```ts
 * import { besideCraft } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(besideCraft("saturn-v:saturn-v,iss:iss,hubble:hubble", "starship").map((craft) => craft.rocket), besideCraft("on", "starship"));
 * ```
 */
export function besideCraft(value: string | null | undefined, rocket: string): Description[] {
  if (value === "on") return canBeside(rocket) ? [{ ...BESIDE_ROCKET }] : [];
  const out: Description[] = [];
  for (const key of (value ?? "").split(",")) {
    const [id, variantId] = key.trim().split(":");
    if (!id || !Object.hasOwn(ROCKETS, id)) continue;
    const variant = variantOf(id, variantId || undefined);
    if (variant) out.push({ rocket: id, variant: variant.id });
    if (out.length === BESIDE_MOST) break;
  }
  return out;
}

/** The least room between the two, in metres. */
export const BESIDE_GAP = 4;

/**
 * Whether Starship can stand beside this rocket: every rocket but Starship itself.
 *
 * @param rocket A rocket's id.
 * @returns False for Starship, true for any other.
 * @example
 * ```ts
 * import { canBeside } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(canBeside("saturn-v"), canBeside("starship"));
 * ```
 */
export const canBeside = (rocket: string): boolean => rocket !== BESIDE_ROCKET.rocket;

/**
 * Where the other rocket stands: its offset in metres, to add to where its own parts stand, and the box it fills there. It is never scaled. Its foot is on the ground line (y = 0) as every rocket's is, it keeps its own
 * line (z = 0), and its nearest side is a gap clear of the craft's widest, to the right (+X).
 *
 * @param craft The box the craft fills, in metres.
 * @param other The box the other rocket fills on its own, in metres.
 * @returns The offset and the box the other rocket fills once it is there.
 * @example
 * ```ts
 * import { besideLayout } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const { at, bounds } = besideLayout({ min: [-4, 0, -4], max: [4, 70, 4] }, { min: [-9, 0, -5], max: [9, 124, 9] });
 * console.log(at, bounds.max[1]);
 * ```
 */
export function besideLayout(craft: Bounds, other: Bounds): { at: Vec3; bounds: Bounds } {
  const gap = Math.max(BESIDE_GAP, (craft.max[0] - craft.min[0]) * 0.1);
  const at: Vec3 = [craft.max[0] + gap - other.min[0], 0 - other.min[1], 0];
  return { at, bounds: { min: [other.min[0] + at[0], other.min[1] + at[1], other.min[2]], max: [other.max[0] + at[0], other.max[1] + at[1], other.max[2]] } };
}

/**
 * The box that holds both: what the camera must frame, and what Fit fits.
 *
 * @param craft The box the craft fills.
 * @param placed The box the other rocket fills where `besideLayout` put it.
 * @returns The smallest box that holds both.
 * @example
 * ```ts
 * import { besideBounds } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(besideBounds({ min: [-4, 0, -4], max: [4, 70, 4] }, { min: [8, 0, -5], max: [26, 124, 9] }).max);
 * ```
 */
export function besideBounds(craft: Bounds, placed: Bounds): Bounds {
  return {
    min: [Math.min(craft.min[0], placed.min[0]), Math.min(craft.min[1], placed.min[1]), Math.min(craft.min[2], placed.min[2])],
    max: [Math.max(craft.max[0], placed.max[0]), Math.max(craft.max[1], placed.max[1]), Math.max(craft.max[2], placed.max[2])],
  };
}
