// Emiake's three folding arrays and the hinged panels on the ridge. Stowed, the gores lie along the hull and are tagged so the viewer can swing them out. Deployed, the open pose is baked and nothing moves. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { moving } from "../motion.ts";
import { place } from "./adapter.ts";
import { type ConceptSlot } from "./common.ts";
import { FOLD, fanPieces, leafPieces } from "./folding.ts";

const tag = (pieces: readonly Piece[], name: string, pivot: Vec3, axis: Vec3): Piece[] => moving(pieces, { name, pivot, axis });

const local = (pieces: Piece[], at: Vec3): Piece[] => place(pieces, { at: [-at[0], -at[1], -at[2]] });

const fanSlot = (hub: (typeof FOLD.hubs)[number], deployed: boolean): ConceptSlot => {
  const at: Vec3 = [hub.x, hub.y, hub.key === "centre" ? 32 : 14];
  return {
    slot: hub.slot,
    name: hub.name,
    kind: "arms",
    at,
    height: 4,
    diameter: 82,
    note: `Four radiator panels, 160 m out, ${deployed ? "open, a filled grid in a frame" : "lying along the hull"}. Port, centre and starboard, hubs from 400 m to 1,040 m so the run is 240 m to 1,200 m, clear of the gallery. Descends from the ISS radiator wings.`,
    pieces: () => local(fanPieces(hub, deployed, tag), at),
  };
};

const leafSlot = (leaf: (typeof FOLD.leaves)[number], index: number, deployed: boolean): ConceptSlot => {
  const at: Vec3 = [leaf.x, leaf.y, FOLD.z];
  return {
    slot: leaf.slot,
    name: `Hinged panel ${index}`,
    kind: "arms",
    at,
    height: 20,
    diameter: 71,
    note: `A panel on the ridge beside the folding arrays, ${deployed ? "leaned along the hull, still face-on from the side" : "standing up"}. Descends from an accordion radiator.`,
    pieces: () => local(leafPieces(leaf.x, leaf.y, index, leaf.degrees, deployed, tag), at),
  };
};

/** The three wings stowed, which is how Emiake is drawn unless the deployed variant is chosen. */
export const SAIL_SLOTS: readonly ConceptSlot[] = FOLD.hubs.map((hub) => fanSlot(hub, false));

/** The wings and the hinged panels, stowed. */
export const FOLD_SLOTS: readonly ConceptSlot[] = [...SAIL_SLOTS, ...FOLD.leaves.map((leaf, i) => leafSlot(leaf, i + 1, false))];

/** The same slots with the wings open and the panels leaned out. */
export const SAIL_DEPLOYED_SLOTS: readonly ConceptSlot[] = [...FOLD.hubs.map((hub) => fanSlot(hub, true)), ...FOLD.leaves.map((leaf, i) => leafSlot(leaf, i + 1, true))];
