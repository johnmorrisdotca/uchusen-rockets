// What the docking scene's lanes have to clear: the boxes of Kaminari's parts (from the registry's own pieces, at their slots) and the two Miyamoto hulls. Kept apart from `scene.ts`, which is pure data and time, because
// it builds every Kaminari part to measure it. Metres, Kaminari's space.
import { boundsOfPieces } from "../pieces.ts";
import { partEntry } from "../registry.ts";
import { ENVELOPE as MIYAMOTO } from "./ship-03/dims.ts";
import { SHIP_02_SLOTS } from "./ship-02/index.ts";
import { SHIPS } from "./scene.ts";
import type { Vec3 } from "../../framing.ts";

export interface Box {
  name: string;
  min: Vec3;
  max: Vec3;
}

/** The boxes of Kaminari's outside parts, each moved to its slot. */
export function kaminariBoxes(): Box[] {
  const out: Box[] = [];
  for (const slot of SHIP_02_SLOTS) {
    if (slot.inside) continue;
    const entry = partEntry(`fleet-02-fleet-02-${slot.slot}`);
    if (!entry) throw new RangeError(`no part for slot ${slot.slot}`);
    const b = boundsOfPieces(entry.pieces());
    out.push({ name: slot.slot, min: [b.min[0] + slot.at[0], b.min[1] + slot.at[1], b.min[2] + slot.at[2]], max: [b.max[0] + slot.at[0], b.max[1] + slot.at[1], b.max[2] + slot.at[2]] });
  }
  return out;
}

/** The two Miyamoto hulls as boxes: their length along y, their beam across and their height from the envelope. */
export function miyamotoBoxes(): Box[] {
  return SHIPS.map((ship) => ({ name: ship.id, min: [ship.at[0] - MIYAMOTO.beam / 2, ship.at[1], ship.at[2] + MIYAMOTO.zLow], max: [ship.at[0] + MIYAMOTO.beam / 2, ship.at[1] + MIYAMOTO.length, ship.at[2] + MIYAMOTO.zHigh] }));
}

/** The highest point of anything a lane crosses between the two ships: every box whose y and x overlap the span from one door to the other. */
export function sceneTop(boxes: readonly Box[], span: { x: readonly [number, number]; y: readonly [number, number] }): number {
  return Math.max(...boxes.filter((b) => b.max[0] >= span.x[0] && b.min[0] <= span.x[1] && b.max[1] >= span.y[0] && b.min[1] <= span.y[1]).map((b) => b.max[2]));
}
