// Waymark's parts as rows of the registry: each module with its record (real size in metres, its joints and where it stands) and how to build its pieces. All fictional, drawn wholly by this package's code from the tables in
// `fleet/ship-03/`. Pure: no three.js and no DOM.
import { blank } from "../data/types.ts";
import type { PartEntry } from "./registry.ts";
import { COLLAR_L } from "./fleet/ship-03/index.ts";
import { WAYMARK_PARTS, WAYMARK_VARIANT_SLOTS } from "./fleet/ship-03/variants.ts";

const NOTE = blank("A fictional design: this package's own, with no source.");

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
      drawnFrom: `This package's own fictional design: ${part.note}`,
    },
    pieces: () => part.pieces(),
  };
});
