// Where the Sun is, for a craft drawn in space: one direction, read from text. Pure: no three.js and no DOM.

/**
 * Reads the `sun` attribute: the direction towards the Sun in the craft's own frame (Y up, +Z its nose or windward side), as three numbers. Anything else is no Sun, and the view keeps its showroom light.
 *
 * @param text The attribute's text, such as `"1, 0.2, -0.5"`.
 * @returns The direction, one metre long, or null for a missing, malformed or zero value.
 * @example
 * ```ts
 * import { parseSun } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(parseSun("2, 0, 0"), parseSun("east"), parseSun("0,0,0"));
 * ```
 */
export function parseSun(text: string | null | undefined): readonly [number, number, number] | null {
  if (typeof text !== "string" || text.length > 80) return null;
  const parts = text.split(",").map((one) => one.trim());
  if (parts.length !== 3 || parts.some((one) => !/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(one))) return null;
  const [x, y, z] = parts.map(Number);
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-9) return null;
  return [x / length, y / length, z / length];
}
