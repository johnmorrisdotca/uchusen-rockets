// Kyotori's parts as rows of the registry: each piece of the ships and the station with its record (real size in metres, where it stands) and how to build its pieces. All fictional, drawn wholly by this package's code from the tables in
// `fleet/ship-kyotori/`. Pure: no three.js and no DOM.
import { blank } from "../data/types.ts";
import type { PartEntry } from "./registry.ts";
import { KYOTORI_PARTS, KYOTORI_VARIANT_SLOTS } from "./fleet/ship-kyotori/variants.ts";

const NOTE = blank("A design of this package, with no source.");

/** Every part of Kyotori, each once, with the variants it is true for. */
export const KYOTORI_ENTRIES: readonly PartEntry[] = KYOTORI_PARTS.map((part): PartEntry => {
  const trueTo = Object.entries(KYOTORI_VARIANT_SLOTS).filter(([, slots]) => Object.values(slots).includes(part.id)).map(([variant]) => variant);
  return {
    record: {
      id: `fleet-kyotori-${part.id}`,
      kind: part.kind,
      name: part.name,
      rocket: "fleet-kyotori",
      trueTo,
      height: part.height,
      diameter: part.diameter,
      sourced: { height: NOTE, diameter: NOTE },
      joints: {},
      strapOn: { x: part.place.x, z: part.place.z, y: part.y0 },
      painted: null,
      drawnFrom: `This package's own design: ${part.note}`,
    },
    pieces: () => part.pieces(),
  };
});
