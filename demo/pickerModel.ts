// The ship picker's data, apart from how it is drawn. layout is the one attribute that switches Card, Browser and Grid.
import { figureWords, MAKERS, ROCKETS, variantOf, type MakerId } from "../src/index.ts";
import { isSpacecraft } from "./craftKind.ts";
import { isListed } from "./listed.ts";

/** Real rockets, real spacecraft, real stations, or the SPX fleet. */
export type PickerKind = "rocket" | "craft" | "station" | "fleet";

/** Card is concept A (the strip inside the Card window). Browser is concept B. Grid is concept C. */
export type PickerLayout = "card" | "browser" | "grid";

export interface PickerCraft {
  rocket: string;
  variant: string;
  name: string;
  variantName: string;
  kind: PickerKind;
  family: MakerId;
  familyName: string;
  fact: string;
}

const KINDS: readonly PickerKind[] = ["rocket", "craft", "station", "fleet"];

/**
 * Reads the layout attribute. `strip` is Card. Anything else unknown is Browser, the layout John picked.
 * @param raw The attribute or the address value.
 */
export function parseLayout(raw: string | null | undefined): PickerLayout {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "card" || value === "strip") return "card";
  if (value === "grid") return "grid";
  return "browser";
}

/** Which column a listed craft belongs in. A lone probe or telescope is a spacecraft. Sites and the stations sit with the stations. The fleet is its own column. */
export function pickerKind(id: string): PickerKind {
  const maker = ROCKETS[id]?.maker;
  if (maker === "fleet" || id.startsWith("fleet-")) return "fleet";
  if (isSpacecraft(id)) return "craft";
  if (maker === "sites" || id === "iss" || id === "tiangong") return "station";
  return "rocket";
}

/** One row per listed craft, at its default variant, in catalogue order. */
export function pickerCatalogue(): PickerCraft[] {
  return Object.values(ROCKETS).filter((rocket) => rocket.status === "built" && isListed(rocket.id)).map((rocket) => {
    const variant = variantOf(rocket.id, rocket.defaultVariant);
    return {
      rocket: rocket.id,
      variant: rocket.defaultVariant,
      name: rocket.name,
      variantName: variant?.name ?? rocket.defaultVariant,
      kind: pickerKind(rocket.id),
      family: rocket.maker,
      familyName: MAKERS[rocket.maker],
      fact: figureWords(variant?.facts.height, " m"),
    };
  });
}

/**
 * The rows a kind, a family and a search leave.
 * @param rows The catalogue.
 * @param query Kind `all` is every kind. Family `all` is every family. Search matches the name, the variant and the family.
 */
export function filterCraft(rows: readonly PickerCraft[], query: { kind: PickerKind | "all"; family: MakerId | "all"; search: string }): PickerCraft[] {
  const q = query.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (query.kind !== "all" && row.kind !== query.kind) return false;
    if (query.family !== "all" && row.family !== query.family) return false;
    if (q === "") return true;
    return `${row.name} ${row.variantName} ${row.familyName} ${row.rocket}`.toLowerCase().includes(q);
  });
}

/** Families that still have a craft under the kind, in catalogue order. */
export function familiesOf(rows: readonly PickerCraft[], kind: PickerKind | "all"): MakerId[] {
  const seen: MakerId[] = [];
  for (const row of rows) {
    if (kind !== "all" && row.kind !== kind) continue;
    if (!seen.includes(row.family)) seen.push(row.family);
  }
  return seen;
}

/** The four kinds, in the order the column lists them. */
export function pickerKinds(): readonly PickerKind[] {
  return KINDS;
}
