// The Kaminari concepts at another size: which craft take the slider, what its range is, and the report of a build made at a size, with every length in it scaled. Pure: no three.js and no DOM.
import type { Inspector } from "./data/types.ts";
import type { FitReport } from "./fit.ts";
import type { PartRecord } from "./parts.ts";
import { CONCEPT_ROCKETS } from "./model/fleet/kaminari-concepts/index.ts";
import { scalePercent } from "./model/fleet/kaminari-concepts/scale.ts";

export { SCALE_PERCENT, scalePercent, scalePieces } from "./model/fleet/kaminari-concepts/scale.ts";
export { CONCEPT_IDS, CONCEPT_ROCKETS } from "./model/fleet/kaminari-concepts/index.ts";

/**
 * Whether a craft takes the size slider: the three Kaminari concept hulls.
 *
 * @param rocket A rocket's id.
 * @param variant A variant's id.
 * @returns True for a Kaminari concept.
 * @example
 * ```ts
 * import { canScale } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(canScale("fleet-kaminari"), canScale("saturn-v"));
 * ```
 */
export function canScale(rocket: string, variant?: string): boolean {
  void variant;
  return (CONCEPT_ROCKETS as readonly string[]).includes(rocket);
}

/**
 * The factor a size in per cent asks for: 1 for any craft that does not take the slider, and the size between 60 and 100 per cent, in steps of 5, for a concept.
 *
 * @param rocket A rocket's id.
 * @param variant A variant's id.
 * @param percent The size asked for, in per cent, or the text of one.
 * @returns A number from 0.6 to 1; 1 for a craft that does not scale.
 * @example
 * ```ts
 * import { scaleFactor } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(scaleFactor("fleet-emiake", "fleet-emiake", "80"), scaleFactor("saturn-v", "saturn-v", 80));
 * ```
 */
export const scaleFactor = (rocket: string, variant: string, percent: unknown): number => (canScale(rocket, variant) ? scalePercent(percent) / 100 : 1);

const triple = (p: readonly [number, number, number], k: number): readonly [number, number, number] => [p[0] * k, p[1] * k, p[2] * k];

const scaledInspector = (inspector: Inspector, k: number): Inspector => ({
  ...inspector,
  sections: inspector.sections.map((s) => ({ ...s, at: triple(s.at, k) })),
  places: Object.fromEntries(Object.entries(inspector.places).map(([slot, at]) => [slot, triple(at, k)])),
  insets: inspector.insets.map((i) => ({ ...i, target: triple(i.target, k), distance: i.distance * k, parts: i.parts.map((p) => ({ ...p, at: triple(p.at, k) })) })),
});

const scaledPart = (part: PartRecord, k: number): PartRecord => ({
  ...part,
  height: part.height * k,
  diameter: part.diameter * k,
  ...(part.strapOn ? { strapOn: { x: part.strapOn.x * k, z: part.strapOn.z * k, ...(part.strapOn.y === undefined ? {} : { y: part.strapOn.y * k }) } } : {}),
});

/**
 * The report of a fit checked at a size: every part's height, diameter and place, the whole size and the viewer's labels, `k` times what they are at full size.
 *
 * @param report The fit report of the concept at its full size.
 * @param k The factor, 0.6 to 1.
 * @returns A report like it with every length scaled; the same report when `k` is 1.
 * @example
 * ```ts
 * import { check, scaleReport } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const full = check({ rocket: "fleet-kaminari", variant: "fleet-kaminari" });
 * console.log(scaleReport(full, 0.6).size?.height);
 * ```
 */
export function scaleReport(report: FitReport, k: number): FitReport {
  if (k === 1) return report;
  return {
    ...report,
    parts: report.parts.map(({ slot, part }) => ({ slot, part: scaledPart(part, k) })),
    size: report.size ? { height: Math.round(report.size.height * k * 1000) / 1000, diameter: Math.round(report.size.diameter * k * 1000) / 1000 } : null,
    variant: report.variant && report.variant.inspector ? { ...report.variant, inspector: scaledInspector(report.variant.inspector, k) } : report.variant,
  };
}
