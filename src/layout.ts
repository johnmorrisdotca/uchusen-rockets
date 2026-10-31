// Where each part stands for a choice of what to show: together on one axis, apart side by side on the ground, or one alone. Pure: the drawing and the 3D view both ask here, so they agree.
import type { Vec3 } from "./framing.ts";
import type { PartRecord } from "./parts.ts";

export type ShowName = "together" | "apart" | (string & {});

/** A part's own width from the axis, for keeping apart parts clear of each other. */
export type WidthOf = (part: PartRecord) => number;

/** Seen square-on to the diagonal the parts take the whole distance; from the front or the side, seven tenths of it. */
const APART_SPREAD = 1.45;

export interface Place {
  slot: string;
  at: Vec3;
  shown: boolean;
}

/** The first choices of `show`, then one per slot. */
export const showsOf = (slots: readonly string[]): string[] => (slots.length > 1 ? ["together", "apart", ...slots] : [...slots]);

export function cleanShow(value: unknown, slots: readonly string[]): string {
  const shows = showsOf(slots);
  return typeof value === "string" && shows.includes(value) ? value : shows[0];
}

export function placesFor(parts: readonly { slot: string; part: PartRecord }[], show: string, widthOf: WidthOf): Place[] {
  if (show === "apart") {
    const widths = parts.map(({ part }) => widthOf(part));
    const total = widths.reduce((sum, width) => sum + width * 2, 0) + (parts.length - 1) * 3;
    let x = -total / 2;
    // along a diagonal of the ground, so they stand clear of each other from the front, the back and the side alike
    return parts.map(({ slot }, i) => {
      const along = (x + widths[i]) * APART_SPREAD;
      const at: Vec3 = [along * Math.SQRT1_2, 0, -along * Math.SQRT1_2];
      x += widths[i] * 2 + 3;
      return { slot, at, shown: true };
    });
  }
  // up the stack, joint to joint; a side booster stands on the ground beside it
  let y = 0;
  return parts.map(({ slot, part }) => {
    const together = show === "together";
    if (part.strapOn) return { slot, at: [together ? part.strapOn.x : 0, 0, together ? part.strapOn.z : 0] as Vec3, shown: together || show === slot };
    const base = y - (part.joints.bottom?.y ?? 0);
    const at: Vec3 = [0, together ? base : 0, 0];
    y = base + (part.joints.top ? part.joints.top.y : part.height);
    return { slot, at, shown: together || show === slot };
  });
}
