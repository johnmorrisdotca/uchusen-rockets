// The fleet kit as rockets and variants: each module on its own (and opened, where it has an inside), grouped by what it is, and the kit's sample ships. All fictional: this package's own design, so every
// figure is blank and says so.
import { designation, INSETS, KIT, SAMPLE_SHIPS, shipParts } from "../model/fleet/kit.ts";
import type { KitModule, ModuleKind } from "../model/fleet/types.ts";
import { blank, type Variant } from "./types.ts";

const FICTION = "This package's own design, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

/** The groups the kit's modules are listed in: a rocket for each, so a picker row never holds more than a dozen. */
export const FLEET_GROUPS: readonly { id: string; name: string; kinds: readonly ModuleKind[]; /** Modules chosen by id, for a group that is not one kind. */ ids?: readonly string[] }[] = [
  { id: "fleet-engines", name: "Fleet engines and thrusters", kinds: ["engine", "thruster"] },
  { id: "fleet-tanks", name: "Fleet tanks", kinds: ["tank"] },
  { id: "fleet-cargo", name: "Fleet cargo", kinds: ["cargo"] },
  { id: "fleet-habitats", name: "Fleet habitat rings and drums", kinds: [], ids: ["habitat-ring-16", "habitat-ring-30", "habitat-drum-crew", "habitat-drum-large"] },
  { id: "fleet-decks", name: "Fleet crew and service decks", kinds: [], ids: ["farm-drum", "common-area-m", "store-drum-m", "eva-lock-m"] },
  { id: "fleet-labs", name: "Fleet labs, pods and bridge", kinds: [], ids: ["lab-m", "pod-survey-m", "pod-medical-m", "deck-nav-m"] },
  { id: "fleet-systems", name: "Fleet reactors, radiators and sensors", kinds: ["reactor", "radiator", "sensor"] },
  { id: "fleet-structure", name: "Fleet nodes, trusses and shields", kinds: ["node", "truss", "adapter", "shield"] },
];

/** The id of a group's part for a module. */
export const groupOf = (module: KitModule): string => FLEET_GROUPS.find((group) => group.ids?.includes(module.id) ?? group.kinds.includes(module.kind))?.id ?? "fleet-structure";

const moduleVariant = (module: KitModule, rocket: string, cutaway: boolean): Variant => {
  const id = cutaway ? `${module.id}-cutaway` : module.id;
  return {
    id,
    rocket,
    name: `${module.name}${cutaway ? ", cutaway" : ""}`,
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots: ["module"],
    partIds: { module: id },
    note: `${module.note} ${module.length} m long, ${module.width} m across, ${module.mass} t dry${module.propellant ? `, ${module.propellant} t of propellant when full` : ""}.`,
    facts: { height: fiction(metres(module.length)), diameter: fiction(metres(Math.max(module.width, module.depth))), parts: { module: fiction(metres(module.length)) }, engines: {}, more: {} },
  };
};

const CODES: Readonly<Record<string, string>> = { hauler: "KIT-H", scout: "KIT-S", bulwark: "KIT-B" };

/** What to call each slot of the fleet's variants: a module by its name, a ship's place with its number, an inset's part with its number. */
export const FLEET_SLOT_NAMES: Readonly<Record<string, string>> = (() => {
  const names: Record<string, string> = { module: "Module" };
  for (const inset of Object.values(INSETS)) for (const one of inset.parts) names[`part-${one.n}`] = `${one.n}. ${one.name}`;
  for (const [i, place] of SAMPLE_SHIPS.hauler.entries()) names[`${place.module}-${i + 1}`] = `${i + 1}. ${KIT[place.module].name}`;
  return names;
})();

const sample = (rocket: string, id: string, name: string): Variant => {
  const parts = shipParts(`${rocket}-${id}`, SAMPLE_SHIPS[id], { detail: 0.25 });
  return {
    id,
    rocket,
    name: `${designation(CODES[id])} ${name}`,
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots: parts.slots,
    partIds: parts.partIds,
    note: `A sample ship made only of kit modules, ${parts.assembly.length.toFixed(0)} m long and ${(parts.assembly.mass / 1000).toFixed(1)} thousand tonnes dry. It shows the modules on a spine; it is not one of the fleet's three ships.`,
    facts: { height: fiction(metres(parts.assembly.length)), diameter: fiction(metres(Math.max(parts.assembly.width, parts.assembly.depth))), parts: Object.fromEntries(parts.slots.map((slot) => [slot, fiction(metres(KIT[slot.replace(/-\d+$/, "")].length))])), engines: {}, more: {} },
  };
};

const insetVariant = (inset: (typeof INSETS)[string]): Variant => ({
  id: inset.id,
  rocket: "fleet-insets",
  name: `${inset.name} inset`,
  status: "fictional",
  firstWord: "Designed",
  firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
  slots: inset.parts.map((one) => `part-${one.n}`),
  partIds: Object.fromEntries(inset.parts.map((one) => [`part-${one.n}`, `inset-${inset.id}-${one.n}`])),
  note: `${inset.note} ${inset.parts.map((one) => `${one.n} ${one.name}`).join(", ")}. Press "apart" to open it.`,
  facts: { height: fiction("about 6 m, as designed"), diameter: fiction("about 12 m, as designed"), parts: Object.fromEntries(inset.parts.map((one) => [`part-${one.n}`, fiction(metres(one.size[1]))])), engines: {}, more: {} },
});

/**
 * The fleet kit's rockets, by id: each module on its own and opened, in groups, and the sample ships.
 *
 * @example
 * ```ts
 * import { FLEET_KIT_ROCKETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(FLEET_KIT_ROCKETS));
 * ```
 */
export const FLEET_KIT_ROCKETS: Readonly<Record<string, { name: string; variants: readonly Variant[] }>> = {
  "fleet-insets": { name: "Fleet system insets", variants: Object.values(INSETS).map(insetVariant) },
  "fleet-samples": { name: "Fleet kit sample ship", variants: [sample("fleet-samples", "hauler", "Kit hauler")] },
  ...Object.fromEntries(
    FLEET_GROUPS.map((group) => [
      group.id,
      {
        name: group.name,
        variants: Object.values(KIT)
          .filter((module) => groupOf(module) === group.id)
          .flatMap((module) => [moduleVariant(module, group.id, false), ...(module.inside ? [moduleVariant(module, group.id, true)] : [])]),
      },
    ]),
  ),
};
