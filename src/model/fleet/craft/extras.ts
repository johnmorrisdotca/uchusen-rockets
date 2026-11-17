// The two extra parts a craft's card shows beside it: its engine on its own, at a size where the throat, the chamber and the feed pipes show, and a short length of its hull cut open to show the stack's separate
// shells. Both are drawn from the craft's own table rows. Pure: no three.js and no DOM.
import { cub, hoop, pipeRun, rod } from "../detail.ts";
import { layerShells } from "../layers.ts";
import { cyl, revolve } from "../solids.ts";
import type { Piece } from "../../pieces.ts";
import { CRAFT_STACKS, PROPULSION, STACK_OF } from "./cards.ts";
import type { AtcId } from "./names.ts";

/** The engine card's size, metres: one bell 3.2 m tall on a card that stands 5.2 m with its gimbal. */
export const ENGINE_CARD = { height: 5.2, width: 3.4 } as const;

/** A bell engine on its own, drawn at twice the size of the craft's own bells: bell with a coloured inside, throat, chamber, injector plate, two feed manifolds on flanges and a gimbal ring with two actuators. */
function bell(): Piece[] {
  const out: Piece[] = [revolve("engine-metal", [0, 0], [[0.45, 2.2], [0.6, 1.9], [1.05, 1.3], [1.6, 0.0]], 36, { outline: true }), revolve("bell-inside", [0, 0], [[0.4, 2.2], [0.55, 1.9], [1.0, 1.3], [1.5, 0.0]], 36)];
  out.push(hoop("hull-grey", 0.62, 1.95, 0.07, 28, 6), revolve("hull-grey-dark", [0, 0], [[0.001, 2.9], [0.55, 2.8], [0.7, 2.4], [0.6, 2.0]], 28, { outline: true }), cyl("hull-grey", [0, 0], 0.62, 2.9, 3.05, 28), cyl("hull-yellow", [0, 0], 0.5, 3.05, 3.2, 28));
  for (const x of [-1, 1]) out.push(...pipeRun([[x * 1.3, 4.6, 0], [x * 1.3, 3.5, 0], [x * 0.5, 3.1, 0]], 0.1, x < 0 ? "coolant" : "pipe-steel", { ends: ["flange", "flange"] }));
  out.push(hoop("hull-grey-dark", 1.0, 3.3, 0.07, 28, 6), ...[-1, 1].map((x) => rod("hull-grey", [x * 1.0, 3.3, 0], [x * 1.6, 4.9, 0], 0.07, 8)), cub("hull-grey-dark", [-1.8, 1.8], [4.9, 5.2], [-0.25, 0.25]));
  return out;
}

/** A cold-gas quad on its own, four times the size: a housing, four nozzles with valves and a manifold. */
function quad(): Piece[] {
  const out: Piece[] = [cub("hull-grey", [-1.2, 1.2], [-0.9, 0.9], [0, 0.9]), cub("hull-grey-dark", [-1.3, 1.3], [-0.2, 0.2], [0, 0.25])];
  for (const [x, y] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]] as const) out.push(rod("hull-grey-dark", [x, y, 0.9], [x, y, 1.3], 0.3, 12), rod("bell", [x, y, 1.3], [x, y, 1.9], 0.24, 12), rod("lamp-blue", [x, y, 0.6], [x, y, 0.75], 0.12, 8));
  out.push(...pipeRun([[-1.4, 0, 0.5], [1.4, 0, 0.5]], 0.1, "coolant", { ends: ["flange", "flange"] }));
  return out;
}

/** A craft's engine on its own, standing at the origin with its axis up the Y axis (a bell) or its nozzles facing +Z (a quad of jets). */
export function enginePieces(id: AtcId): Piece[] {
  return PROPULSION[id].parts[0].name === "Bell" ? bell() : quad();
}

/** The hull stack's shells cut open: a 1.6 m length of a hull wall at the size the craft's own stack gives, each layer its own shell with a flat face at each cut. Layers this thin would not show at their real thickness, so the card scales them 10 times and says so. */
export const LAYER_SCALE = 10;
export function layerPieces(id: AtcId): Piece[] {
  const stack = CRAFT_STACKS[STACK_OF[id]];
  const scaled = { ...stack, layers: stack.layers.map((l) => ({ ...l, mm: l.mm * LAYER_SCALE })) };
  return layerShells(4, 0, 1.6, scaled, [-0.5, 0.5], 24);
}
