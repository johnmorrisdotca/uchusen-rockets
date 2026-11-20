// Emiake's three folding arrays and the hinged panels between them. Stowed, the gores are stacked and tagged so the viewer can spread them. Deployed, the open pose is baked and nothing moves. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { moving } from "../motion.ts";
import { place } from "./adapter.ts";
import { type ConceptSlot } from "./common.ts";
import { FOLD, fanPieces, leafPieces } from "./folding.ts";

const tag = (pieces: readonly Piece[], name: string, pivot: Vec3, axis: Vec3): Piece[] => moving(pieces, { name, pivot, axis });

const local = (pieces: Piece[], y0: number): Piece[] => place(pieces, { at: [0, -y0, 0] });

const fanSlot = (hub: (typeof FOLD.hubs)[number], deployed: boolean): ConceptSlot => ({
  slot: hub.slot,
  name: hub.name,
  kind: "arms",
  at: [0, hub.y, 0],
  height: 22,
  diameter: 161,
  note: `A fan of five gores on the dorsal ridge, 160 m out, ${deployed ? "spread 72 degrees to either side" : "stacked into a thin fin"}. The gores swing about the ship's cross axis, so the side view shows the fold. The run stays aft of the glazed gallery. Descends from the ISS radiator wings.`,
  pieces: () => local(fanPieces(hub.y, hub.key, deployed, tag), hub.y),
});

const leafSlot = (leaf: (typeof FOLD.leaves)[number], index: number, deployed: boolean): ConceptSlot => ({
  slot: leaf.slot,
  name: `Hinged panel ${index}`,
  kind: "arms",
  at: [0, leaf.y, 0],
  height: 45,
  diameter: 48,
  note: `A panel on the ridge between the folding arrays, ${deployed ? "swung down toward the flank" : "standing up"}. It hinges along the ship and folds one after the next. Descends from an accordion radiator.`,
  pieces: () => local(leafPieces(leaf.y, index, leaf.degrees, deployed, tag), leaf.y),
});

/** The three fans stowed, which is how Emiake is drawn unless the deployed variant is chosen. */
export const SAIL_SLOTS: readonly ConceptSlot[] = FOLD.hubs.map((hub) => fanSlot(hub, false));

/** The fans and the hinged panels, stowed. */
export const FOLD_SLOTS: readonly ConceptSlot[] = [...SAIL_SLOTS, ...FOLD.leaves.map((leaf, i) => leafSlot(leaf, i + 1, false))];

/** The same slots with the arrays open and the panels folded out. */
export const SAIL_DEPLOYED_SLOTS: readonly ConceptSlot[] = [...FOLD.hubs.map((hub) => fanSlot(hub, true)), ...FOLD.leaves.map((leaf, i) => leafSlot(leaf, i + 1, true))];
