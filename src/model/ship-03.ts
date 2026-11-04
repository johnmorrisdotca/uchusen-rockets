// Waymark's parts as rows of the registry: each module with its record (real size in metres, its joints and where it stands) and how to build its pieces. All fictional, drawn wholly by this package's code from the tables in
// `fleet/ship-03/`. Pure: no three.js and no DOM.
import { blank } from "../data/types.ts";
import type { PartEntry } from "./registry.ts";
import { COLLAR_L } from "./fleet/ship-03/index.ts";
import { CARDS, SHIP_INSETS } from "./fleet/ship-03/insets.ts";
import { WAYMARK_PARTS, WAYMARK_VARIANT_SLOTS } from "./fleet/ship-03/variants.ts";

const NOTE = blank("A design of this package, with no source.");

/** Every part of Waymark, each once, with the variants it is true for. */
export const SHIP_03_ENTRIES: readonly PartEntry[] = WAYMARK_PARTS.map((part): PartEntry => {
  const trueTo = Object.entries(WAYMARK_VARIANT_SLOTS).filter(([, slots]) => Object.values(slots).includes(part.id)).map(([variant]) => variant);
  return {
    record: {
      id: `fleet-ship-03-${part.id}`,
      kind: part.kind,
      name: part.name,
      rocket: "fleet-ship-03",
      trueTo,
      height: part.height,
      diameter: part.diameter,
      sourced: { height: NOTE, diameter: NOTE },
      joints: { ...(part.bottom ? { bottom: { kind: "stage" as const, y: 0, diameter: COLLAR_L } } : {}), ...(part.top ? { top: { kind: "stage" as const, y: part.height, diameter: COLLAR_L } } : {}) },
      ...(part.place ? { strapOn: { x: part.place.x, z: part.place.z, y: part.y0 } } : {}),
      painted: null,
      drawnFrom: `This package's own design: ${part.note}`,
    },
    pieces: () => part.pieces(),
  };
});

/** The sub-parts of Waymark's insets and its two engine cards, each its own part, placed in its assembly. */
export const SHIP_03_INSET_ENTRIES: readonly PartEntry[] = [
  ...Object.values(SHIP_INSETS).flatMap((inset) =>
    inset.parts.map((one): PartEntry => ({
      record: { id: `fleet-ship-03-inset-${inset.id}-${one.n}`, kind: "module", name: `${one.n}. ${one.name}`, rocket: "fleet-insets-ship-03", trueTo: [inset.id], height: one.size[1], diameter: Math.max(one.size[0], one.size[2]), sourced: { height: NOTE, diameter: NOTE }, joints: {}, strapOn: { x: one.at[0], z: one.at[2], y: one.at[1] }, painted: null, drawnFrom: `This package's own design: ${one.does}` },
      pieces: one.pieces,
    })),
  ),
  ...Object.values(CARDS).map((card): PartEntry => ({
    record: { id: `fleet-ship-03-${card.id}`, kind: "engine", name: card.name, rocket: "fleet-insets-ship-03", trueTo: [card.id], height: card.size[1], diameter: Math.max(card.size[0], card.size[2]), sourced: { height: NOTE, diameter: NOTE }, joints: {}, painted: null, drawnFrom: "This package's own design: an engine on its own, true to its size." },
    pieces: card.pieces,
  })),
];
