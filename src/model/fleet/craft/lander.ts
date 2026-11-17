// The survey lander: a Lunar Module's kind of craft, drawn round. An eight-sided descent stage with a gold-foil skirt and one engine, four splayed legs with footpads, a round ascent cabin, a sample arm, a mast with a dish
// and a class S collar at the nose. Its axis is Y with the nose up (+Y). Metres. Pure: no three.js and no DOM.
import { collar } from "../collars.ts";
import { antenna, cub, hoop, navLight, pipeRun, prism, ringOf, rod, stamp } from "../detail.ts";
import { cyl, ngon, revolve } from "../solids.ts";
import type { Piece } from "../../pieces.ts";

/** The lander's own sizes, metres: the descent stage's radius and its two heights, the foot circle's radius, the pad radius, the ascent cabin's radius and the nose face the collar sits on. */
export const LANDER = { stage: 2.7, deck: [1.7, 3.5], foot: 4.2, pad: 0.5, cabin: 1.9, nose: 7 } as const;

/** One leg at azimuth `a` degrees: a main strut from the stage's rim to the pad, two side struts, a footpad with a probe and a ladder rung set. */
function leg(a: number): Piece[] {
  const s = Math.sin(rad(a));
  const c = Math.cos(rad(a));
  const at = (r: number, y: number, side = 0): [number, number, number] => [s * r + c * side, y, c * r - s * side];
  const out: Piece[] = [rod("hull-white", at(LANDER.stage - 0.2, 3.1), at(LANDER.foot, 0.55), 0.17, 12), rod("hull-grey", at(LANDER.stage - 0.2, 2.1, 0.5), at(LANDER.foot, 0.55, 0), 0.09, 10), rod("hull-grey", at(LANDER.stage - 0.2, 2.1, -0.5), at(LANDER.foot, 0.55, 0), 0.09, 10)];
  out.push(cyl("hull-grey-dark", [at(LANDER.foot, 0)[0], at(LANDER.foot, 0)[2]], LANDER.pad, 0, 0.18, 24, { body: true }), revolve("hull-grey", [at(LANDER.foot, 0)[0], at(LANDER.foot, 0)[2]], [[0.001, 0.62], [0.16, 0.6], [0.2, 0.18]], 12));
  out.push(rod("pipe-steel", at(LANDER.stage - 0.15, 3.0), at(LANDER.stage - 0.15, 2.0), 0.06, 8));
  return out;
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The sample arm: a shoulder on the stage, an upper arm, an elbow, a forearm and a scoop, folded to the stage's side. */
function sampleArm(): Piece[] {
  const x = LANDER.stage * 0.9;
  return [cyl("hull-grey-dark", [x, -1.6], 0.35, 2.3, 2.9, 16), rod("hull-white", [x, 2.6, -1.6], [x + 0.9, 1.9, -2.5], 0.12, 10), cyl("hull-yellow", [x + 0.9, -2.5], 0.18, 1.78, 2.02, 12), rod("hull-grey", [x + 0.9, 1.9, -2.5], [x + 1.0, 0.9, -3.2], 0.1, 10), revolve("hull-grey-dark", [x + 1.0, -3.2], [[0.001, 0.55], [0.22, 0.8], [0.22, 1.0]], 10), rod("hull-grey", [x + 1.0, 0.8, -3.2], [x + 1.0, 0.9, -3.2], 0.12, 8)];
}

/**
 * The lander's pieces.
 *
 * @example
 * ```ts
 * import { landerPieces } from "./lander.ts";
 *
 * console.log(landerPieces().length > 100);
 * ```
 */
export function landerPieces(): Piece[] {
  const R = LANDER.stage;
  const [y0, y1] = LANDER.deck;
  const out: Piece[] = [];
  // the descent stage: an eight-sided drum in gold foil with a skirt, a thrust plate and one engine
  out.push(prism("gold", ngon(8, R), y0, y1), prism("hull-grey-dark", ngon(8, R + 0.06), y0 - 0.12, y0 + 0.12), prism("hull-grey-dark", ngon(8, R + 0.06), y1 - 0.12, y1 + 0.12), revolve("engine-metal", [0, 0], [[0.45, y0], [0.6, y0 - 0.3], [1.2, y0 - 1.15]], 20, { outline: true }), revolve("bell-inside", [0, 0], [[0.4, y0], [0.55, y0 - 0.3], [1.1, y0 - 1.15]], 20));
  for (const a of [0, 90, 180, 270]) out.push(...leg(a));
  // the ascent cabin: a round shell on the stage, a nose cone, windows, and the S collar
  out.push(revolve("hull-white", [0, 0], [[0.001, y1], [LANDER.cabin, y1], [LANDER.cabin, 5.6], [1.2, 6.5], [1.0, 6.5]], 36, { body: true, outline: true }), ...collar("S", LANDER.nose, 1));
  out.push(hoop("hull-grey-dark", LANDER.cabin, y1 + 0.1, 0.1, 36, 6), ...stamp([cub("window", [-0.28, 0.28], [4.6, 5.3], [LANDER.cabin - 0.02, LANDER.cabin + 0.06])], ringOf(2, 0, 0, 30)));
  // thruster quads: four small blocks of four bells on the cabin's shoulder
  for (const a of [45, 135, 225, 315]) {
    const s = Math.sin(rad(a));
    const c = Math.cos(rad(a));
    out.push(cub("hull-grey", [s * 1.85 - 0.25, s * 1.85 + 0.25], [3.7, 4.2], [c * 1.85 - 0.25, c * 1.85 + 0.25]), rod("bell", [s * 2.2, 3.95, c * 2.2], [s * 2.5, 3.95, c * 2.5], 0.12, 8));
  }
  // the mast, a dish, the radar and the sample arm
  out.push(...antenna("dish", [0.9, 6.4, -0.3], [0.3, 1, 0], 1.7, "lander"), ...antenna("whip", [-0.8, 6.4, 0.2], [-0.2, 1, 0], 1.5), cub("hull-grey-dark", [-0.5, 0.5], [y0 - 0.1, y0 + 0.4], [-0.5, 0.5]), ...sampleArm());
  out.push(...pipeRun([[R - 0.3, y1, 0.8], [R - 0.3, y1 + 0.9, 0.8]], 0.05, "coolant", { ends: ["flange", "flange"] }), ...navLight("port", LANDER.cabin, rad(270), 4.9), ...navLight("starboard", LANDER.cabin, rad(90), 4.9), ...navLight("strobe", LANDER.cabin, rad(0), 5.6));
  return out;
}
