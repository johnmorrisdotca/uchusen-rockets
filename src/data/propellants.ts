// What each engine burns, each from the page that says so. The flame's colour in a picture is chosen from this record and from nothing else: an engine with no record here has a neutral flame.
// The colours themselves are a picture, not a measurement of a flame.
import type { Figure } from "./types.ts";

/**
 * The kinds of flame the pictures have a colour for. `neutral` is for an engine whose propellant no page read here names.
 *
 * @example
 * ```ts
 * import type { FlameKind } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kinds: FlameKind[] = ["kerosene", "methane", "hydrogen", "solid", "hypergolic", "neutral"];
 * console.log(kinds.length);
 * ```
 */
export type FlameKind = "kerosene" | "methane" | "hydrogen" | "solid" | "hypergolic" | "neutral";

/**
 * What one engine burns: its name as the variants' data spells it, the propellant as its page words it (a figure with its source), and the kind of flame that picks the colour.
 *
 * @example
 * ```ts
 * import { PROPELLANTS, type EnginePropellant } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const merlin: EnginePropellant | undefined = PROPELLANTS.find((one) => one.id === "merlin");
 * console.log(merlin?.propellant.value, merlin?.flame);
 * ```
 */
export interface EnginePropellant {
  id: string;
  name: string;
  /** Words that, found in a variant's engine text, say this is the engine. */
  names: readonly string[];
  /** Left out: any rocket. A rocket's id when the same words mean another engine elsewhere (a "solid motor"). */
  rocket?: string;
  propellant: Figure<string>;
  flame: Exclude<FlameKind, "neutral">;
}

/**
 * The engines whose propellant a page read here names. Each propellant is a figure with its page; the flame kind follows from it (a test holds the two together).
 *
 * @example
 * ```ts
 * import { PROPELLANTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PROPELLANTS.map((one) => `${one.name}: ${one.propellant.value}`));
 * ```
 */
export const PROPELLANTS: readonly EnginePropellant[] = [
  { id: "merlin", name: "Merlin", names: ["Merlin"], propellant: { value: "LOX / RP-1", source: "wikipedia-merlin", date: "2026-11-03", note: "The article's lead: \"Merlin engines use RP-1 and liquid oxygen as rocket propellants in a gas-generator power cycle.\"" }, flame: "kerosene" },
  { id: "kestrel", name: "Kestrel", names: ["Kestrel"], propellant: { value: "LOX / RP-1", source: "wikipedia-kestrel", date: "2026-11-03", note: "The infobox, and the lead: \"an LOX/RP-1 pressure-fed rocket engine\"." }, flame: "kerosene" },
  { id: "raptor", name: "Raptor", names: ["Raptor"], propellant: { value: "LOX / CH4", source: "wikipedia-raptor", date: "2026-11-03", note: "The infobox, and the lead: \"cryogenic liquid methane and liquid oxygen, a combination known as methalox\"." }, flame: "methane" },
  { id: "f-1", name: "F-1", names: ["F-1"], propellant: { value: "LOX / RP-1", source: "wikipedia-f-1", date: "2026-11-03", note: "The infobox." }, flame: "kerosene" },
  { id: "j-2", name: "J-2", names: ["J-2"], propellant: { value: "Liquid oxygen / Liquid hydrogen", source: "wikipedia-j-2", date: "2026-11-03", note: "The infobox, and the lead: \"burned cryogenic liquid hydrogen (LH2) and liquid oxygen (LOX) propellants\"." }, flame: "hydrogen" },
  { id: "rs-25", name: "RS-25", names: ["RS-25"], propellant: { value: "LOX / LH2", source: "wikipedia-rs-25", date: "2026-11-03", note: "The infobox, and the lead: \"burns cryogenic (very low temperature) liquid hydrogen and liquid oxygen propellants\"." }, flame: "hydrogen" },
  { id: "shuttle-srb", name: "Space Shuttle solid rocket booster", names: ["solid motor"], rocket: "space-shuttle", propellant: { value: "Ammonium perchlorate, aluminium powder and PBAN (APCP)", source: "wikipedia-shuttle-srb", date: "2026-11-03", note: "\"The primary propellants were ammonium perchlorate as the oxidizer along with aluminum powder and PBAN as fuel.\"" }, flame: "solid" },
  { id: "sls-srb", name: "SLS solid rocket booster", names: ["solid motor"], rocket: "sls", propellant: { value: "PBAN-APCP", source: "wikipedia-sls-srb", date: "2026-11-03", note: "The infobox." }, flame: "solid" },
  { id: "be-4", name: "BE-4", names: ["BE-4"], propellant: { value: "LOX / CH4", source: "wikipedia-be-4", date: "2026-11-03", note: "The infobox, and the lead: \"It uses liquefied methane fuel\"." }, flame: "methane" },
  { id: "be-3", name: "BE-3", names: ["BE-3"], propellant: { value: "LOX / LH2", source: "wikipedia-be-3", date: "2026-11-03", note: "The infobox of the BE-3 and of the BE-3U." }, flame: "hydrogen" },
  { id: "rutherford", name: "Rutherford", names: ["Rutherford"], propellant: { value: "LOX / RP-1", source: "wikipedia-rutherford", date: "2026-11-03", note: "The infobox, and the lead: \"LOX (liquid oxygen) and RP-1 (refined kerosene)\"." }, flame: "kerosene" },
  { id: "rd-107", name: "RD-107 and RD-108", names: ["RD-107", "RD-108"], propellant: { value: "LOX / RG-1", source: "wikipedia-rd-107", date: "2026-11-03", note: "The infobox; its design section: \"liquid oxygen and highly refined kerosene (RG-1)\"." }, flame: "kerosene" },
  { id: "lm-descent", name: "Lunar module descent engine", names: ["LM descent engine"], propellant: { value: "Aerozine 50 fuel / nitrogen tetroxide oxidizer", source: "wikipedia-lunar-module", date: "2026-11-03", note: "The article's specifications: \"DPS propellants: Aerozine 50 fuel / nitrogen tetroxide oxidizer\"." }, flame: "hypergolic" },
];

/**
 * The record of what an engine burns, found by the engine's name in a variant's engine text, or null when no page read here names it. A rocket's `rocket` makes "solid motor" mean its own.
 *
 * @param rocket A rocket's id.
 * @param engineText The engine text of a part, as a variant's data words it ("9 Merlin 1D"), or null or undefined.
 * @returns What that engine burns, or null.
 * @example
 * ```ts
 * import { propellantOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(propellantOf("falcon-9", "9 Merlin 1D")?.propellant.value, propellantOf("starship", "3 sea-level and 3 vacuum"));
 * ```
 */
export function propellantOf(rocket: string, engineText: string | null | undefined): EnginePropellant | null {
  if (!engineText) return null;
  return PROPELLANTS.find((one) => (one.rocket === undefined || one.rocket === rocket) && one.names.some((name) => engineText.includes(name))) ?? null;
}
