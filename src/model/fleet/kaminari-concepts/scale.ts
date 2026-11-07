// A concept at another size: every piece of it made smaller or larger by one factor about the tail of the ship (its origin), so a length of 1,800 m at 100 per cent is 1,080 m at 60 per cent and every part, hatch and rod
// with it. Pure: no three.js and no DOM.
import type { Frame, Piece, Vec3 } from "../../pieces.ts";

/**
 * The smallest and largest size the demo's slider offers, in per cent of the concept's drawn size, and the step between sizes.
 *
 * @example
 * ```ts
 * import { SCALE_PERCENT } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(SCALE_PERCENT.min, SCALE_PERCENT.max, SCALE_PERCENT.step);
 * ```
 */
export const SCALE_PERCENT = { min: 60, max: 100, step: 5, default: 100 } as const;

/**
 * Clamps a size asked for to the slider's range and steps.
 *
 * @param value A number of per cent, or a string of one (an address's value).
 * @returns A whole number of per cent between 60 and 100, stepping by 5; 100 when the value is not a number.
 * @example
 * ```ts
 * import { scalePercent } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(scalePercent("73"), scalePercent("nonsense"), scalePercent(10));
 * ```
 */
export function scalePercent(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return SCALE_PERCENT.default;
  const stepped = Math.round(n / SCALE_PERCENT.step) * SCALE_PERCENT.step;
  return Math.min(SCALE_PERCENT.max, Math.max(SCALE_PERCENT.min, stepped));
}

const v = (p: Vec3, k: number): Vec3 => [p[0] * k, p[1] * k, p[2] * k];
const frameOf = (f: Frame, k: number): Frame => ({ ...f, o: v(f.o, k) });

/**
 * The same pieces at `k` times the size: lengths, radii, thicknesses and offsets all scale; directions and angles do not, so a scaled ship is the same ship.
 *
 * @param pieces A part's pieces, in metres.
 * @param k The factor: 1 leaves them as they are.
 * @returns New pieces, `k` times the size.
 * @example
 * ```ts
 * import { scalePieces } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(scalePieces([], 0.6).length);
 * ```
 */
export function scalePieces(pieces: readonly Piece[], k: number): Piece[] {
  if (k === 1) return [...pieces];
  return pieces.map((piece): Piece => {
    const move = piece.move ? { ...piece.move, pivot: v(piece.move.pivot, k) } : undefined;
    const common = move ? { move } : {};
    if (piece.kind === "plate") {
      return {
        ...piece,
        ...common,
        frame: frameOf(piece.frame, k),
        outline: piece.outline.map(([a, b]) => [a * k, b * k] as const),
        thickness: piece.thickness * k,
        ...(piece.ribs ? { ribs: piece.ribs.map(([p, q]) => [[p[0] * k, p[1] * k], [q[0] * k, q[1] * k]] as const) } : {}),
        ...(piece.quilt ? { quilt: { ...piece.quilt, bulge: piece.quilt.bulge * k } } : {}),
        ...(piece.inset ? { inset: { margin: piece.inset.margin * k, depth: piece.inset.depth * k } } : {}),
        ...(piece.facets ? { facets: piece.facets.map((t) => [v(t[0], k), v(t[1], k), v(t[2], k)] as const) } : {}),
      };
    }
    if (piece.kind === "instances") return { ...piece, ...common, template: scalePieces(piece.template, k), poses: piece.poses.map((pose) => ({ at: v(pose.at, k), yaw: pose.yaw })) };
    if (piece.kind === "lines") return { ...piece, ...common, paths: piece.paths.map((path) => path.map((p) => v(p, k))) };
    const arc = piece.arc;
    return {
      ...piece,
      ...common,
      profile: piece.profile.map(([r, y]) => [r * k, y * k] as const),
      ...(piece.at ? { at: [piece.at[0] * k, piece.at[1] * k] as const } : {}),
      ...(piece.rings ? { rings: piece.rings.map((y) => y * k) } : {}),
      ...(piece.welds ? { welds: piece.welds.map((y) => y * k) } : {}),
      ...(piece.flute ? { flute: piece.flute * k } : {}),
      ...(arc ? { arc: (y: number) => arc(y / k) } : {}),
    };
  });
}
