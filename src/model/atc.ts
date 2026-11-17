// The Auxiliary Transfer Craft as rows of the registry: parts drawn by this package's code, for every look. Pure: no three.js and no DOM.
import { ATC_SLOT, extraSlot } from "../data/atc.ts";
import { placeOf, PROPULSION, STACK_OF } from "./fleet/craft/cards.ts";
import { ATC, ATC_NAMES, BUILT } from "./fleet/craft/index.ts";
import { ENGINE_CARD, enginePieces, layerPieces } from "./fleet/craft/extras.ts";
import type { StackBuild } from "./stacks.ts";

const DRAWN = "This package's own design, made in code (docs/fleet/craft.md). No licensed model and no real vehicle is behind it; the lineage line on each card names the hardware it descends from.";

const label = (id: (typeof BUILT)[number]) => ATC_NAMES[id].name;

export const ATC_BUILDS: readonly StackBuild[] = BUILT.map((id): StackBuild => {
  const craft = ATC[id];
  if (!craft) throw new Error(`ATC craft ${id} is missing`);
  const wide = Math.max(craft.envelope.across, craft.envelope.deep);
  const where = placeOf(wide, craft.crewed);
  return {
    rocket: "fleet-atc",
    variant: id,
    drawnFrom: DRAWN,
    parts: [
      { slot: ATC_SLOT[id], kind: "spacecraft", name: label(id), height: craft.envelope.long, diameter: wide, pieces: () => craft.pieces() },
      ...(craft.crewed ? [{ slot: extraSlot(id, "inside"), kind: "spacecraft" as const, name: `${label(id)}, cutaway`, height: craft.envelope.long, diameter: wide, place: { x: where.inside, z: 0, y: 0 }, pieces: () => craft.pieces({ cutaway: true }) }] : []),
      { slot: extraSlot(id, "engine"), kind: "spacecraft", name: `${label(id)}, ${PROPULSION[id].name.toLowerCase()}`, height: ENGINE_CARD.height, diameter: ENGINE_CARD.width, place: { x: where.engine, z: 0, y: 0 }, pieces: () => enginePieces(id) },
      { slot: extraSlot(id, "layers"), kind: "spacecraft", name: `${label(id)}, hull layers (${STACK_OF[id]} stack)`, height: 1.6, diameter: 8, place: { x: where.layers, z: 0, y: 0 }, pieces: () => layerPieces(id) },
    ],
  };
});
