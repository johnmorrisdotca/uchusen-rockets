// The compare page's picker: which kind a rocket belongs to, how many craft this device can draw, and a small painted picture from the rocket's own drawing.
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/index.ts";

const thumbs = new Map<string, string>();

/** Real rockets, real stations, or the SPX fleet. A site stays with the rockets so it can still be chosen. */
export type PickerKind = "rocket" | "station" | "fleet";

/**
 * How many craft this device can draw at once, from its memory. Eight is the most. A small device stops at four.
 * @returns The cap, including the first craft.
 */
export function craftBudget(): number {
  const raw = typeof navigator === "undefined" ? 8 : Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory);
  const memory = Number.isFinite(raw) && raw > 0 ? raw : 8;
  if (memory >= 8) return 8;
  if (memory >= 4) return 6;
  return 4;
}

/**
 * Which column a rocket belongs in.
 * @param rocketId The rocket's id.
 */
export function kindOf(rocketId: string): PickerKind {
  const maker = ROCKETS[rocketId]?.maker;
  if (maker === "fleet" || rocketId.startsWith("fleet-")) return "fleet";
  if (rocketId === "iss" || rocketId === "tiangong") return "station";
  return "rocket";
}

/**
 * The rocket's own painted drawing, kept so a second paint does not build it again. A line drawing stands in when the painted one cannot be built.
 * @param rocket The rocket's id.
 * @param variant The variant's id.
 * @returns An SVG string, or nothing when the rocket cannot be drawn.
 */
export function thumbOf(rocket: string, variant: string): string {
  const key = `${rocket}:${variant}`;
  const hit = thumbs.get(key);
  if (hit !== undefined) return hit;
  let svg = "";
  try {
    svg = build({ rocket, variant }).svg({ look: "painted" });
  } catch {
    try {
      svg = build({ rocket, variant }).svg({ look: "line" });
    } catch {
      svg = "";
    }
  }
  thumbs.set(key, svg);
  return svg;
}

/**
 * A small picture of a craft, from its own drawing.
 * @param rocket The rocket's id.
 * @param variant The variant's id.
 */
export function craftPicture(rocket: string, variant: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "craft-pic";
  span.innerHTML = thumbOf(rocket, variant);
  return span;
}
