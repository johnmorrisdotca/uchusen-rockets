// How the three long ships are built, as story time. Kaminari's bible lays the keel in 2511 and flies the ship in 2520, nine years, the longest build in the fleet. Emiake and Romaryū are the same class of about 1.8 km, and the planned assembly for that class is about five years.
import { buildSpan, type BuildStep } from "../buildSpan.ts";
import { SLOTS_A } from "./a.ts";
import { SLOTS_B } from "./b.ts";
import { SLOTS_C } from "./c.ts";

/** Days from Kaminari's keel to her first flight: 2511 to 2520. */
export const KAMINARI_BUILD_DAYS = 9 * 365 + 1;

/** Days for a ship of about 1.8 km. A planned figure, not a yard date. */
export const LONG_SHIP_BUILD_DAYS = 5 * 365 + 1;

const ids = (slots: readonly { slot: string }[]): string[] => slots.map((one) => one.slot);

const numbered = (all: readonly string[], prefix: string): string[] => all.filter((id) => id.startsWith(prefix)).sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

const same = (slot: string): string => slot;

/** The public ship. The first hull is a different rocket and is not this build. */
export function kaminariBuild(): BuildStep[] {
  const all = ids(SLOTS_A);
  return buildSpan(KAMINARI_BUILD_DAYS, ["spine", "thrusters", "drive-bay", "reactors", "shadow-shield", ...numbered(all, "quiver-"), ...numbered(all, "cargo-"), "carousel-a", "carousel-b", "bow", "shield"], [
    { slot: "radiators", after: "spine" },
    { slot: "array-blanket", after: "spine" },
    { slot: "array-blanket-b", after: "spine" },
    { slot: "array-blanket-c", after: "spine" },
    { slot: "array-ring", after: "spine" },
    { slot: "visiting", after: "spine" },
  ], same);
}

/** The flown ship, sails stowed. Swinging the outer sails down is a later state. */
export function emiakeBuild(): BuildStep[] {
  const all = ids(SLOTS_B);
  return buildSpan(LONG_SHIP_BUILD_DAYS, ["keel", "frame", "ridge", "thrusters", "bulkhead", "reactors", ...numbered(all, "tanks-"), ...numbered(all, "cargo-"), "plated-hull", "gallery", "nose"], [
    ...numbered(all, "fin-").map((slot) => ({ slot, after: "ridge" })),
    { slot: "bridge", after: "ridge" },
    { slot: "visiting", after: "plated-hull" },
  ], same);
}

/** The carrier. Each docked craft waits for its own cradle. */
export function romaryuBuild(): BuildStep[] {
  const all = ids(SLOTS_C);
  const cradles = numbered(all, "cradle-");
  const craft = numbered(all, "miyamoto-");
  return buildSpan(LONG_SHIP_BUILD_DAYS, ["shaft", "centre-drive", "pods", "coil-stack", "shadow-shield", "barrels", ...cradles, "rings", "bow", "shield"], [
    ...craft.map((slot, i) => {
      const after = cradles[i];
      if (!after) throw new Error(`no cradle for ${slot}`);
      return { slot, after };
    }),
    { slot: "visiting", after: "shaft" },
  ], same);
}
