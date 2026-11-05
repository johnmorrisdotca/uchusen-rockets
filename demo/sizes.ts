// What a fleet ship measures, from its own model: it lies lengthwise, so its size is a length, a beam and a stowed height. Shared by the demo's pages.
import { build } from "../src/build/index.ts";
import type { Variant } from "../src/index.ts";

export const keyOf = (variant: Variant) => `${variant.rocket}:${variant.id}`;
export const isFleetVariant = (variant: Variant) => variant.rocket.startsWith("fleet-");
/** What a fleet ship measures, from its own model: it lies lengthwise, so its size is a length, a beam and a stowed height. */
const fleetSizes = new Map<string, { length: number; beam: number; height: number }>();
export const fleetSize = (variant: Variant): { length: number; beam: number; height: number } => {
  const key = keyOf(variant);
  const known = fleetSizes.get(key);
  if (known) return known;
  const b = build({ rocket: variant.rocket, variant: variant.id }).boundsOf("together");
  const size = { length: b.max[1] - b.min[1], beam: b.max[0] - b.min[0], height: b.max[2] - b.min[2] };
  fleetSizes.set(key, size);
  return size;
};
