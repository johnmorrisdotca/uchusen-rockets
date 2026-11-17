// The rescue cutter: a long white-and-orange pressure cabin with two decks of stretcher bays, a side lock for a hand-to-hand transfer, a tow hook on the service section and a class M collar at the nose. It
// takes the Soyuz descent module's lifeboat job and Dragon's trunk-and-capsule layout, drawn round. Its axis is Y with the nose up (+Y), and the cutaway opens on the side `cutYaw` says. Metres. Pure: no
// three.js and no DOM.
import { collar } from "../collars.ts";
import { annulus, antenna, cub, disc, floodlight, grabHandle, hatch, hazardBand, hoop, navLight, patch, pipeRun, porthole, ringOf, rod, stamp } from "../detail.ts";
import { cyl, revolve } from "../solids.ts";
import { thrusterQuad } from "./fittings.ts";
import type { Piece } from "../../pieces.ts";
import type { ModuleOptions } from "../types.ts";

/** The cutter's own sizes, metres: the cabin's radius, the decks' heights, the cabin's top, the service section's radius and the nose face the collar sits on. */
export const CUTTER = { cabin: 3, decks: [5.2, 10.0], top: 15, service: 3.3, nose: 16.6, cots: 4 } as const;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** A stretcher cot: a frame, a mattress and two straps, lying across the deck, head to the wall. */
function cot(x: number, y: number, z: number): Piece[] {
  return [cub("hull-grey-dark", [x - 0.45, x + 0.45], [y, y + 0.1], [z - 1.0, z + 1.0]), cub("hull-blue", [x - 0.4, x + 0.4], [y + 0.1, y + 0.22], [z - 0.95, z + 0.95]), cub("hazard", [x - 0.42, x + 0.42], [y + 0.22, y + 0.25], [z - 0.2, z - 0.1]), cub("hazard", [x - 0.42, x + 0.42], [y + 0.22, y + 0.25], [z + 0.3, z + 0.4])];
}

/** The inside, for a cutaway: the liner, two decks each with two cots and a medic's seat, a med console, the ladder between decks and the vestibule to the collar. */
function inside(arc: (() => readonly [number, number]) | undefined): Piece[] {
  const R = CUTTER.cabin;
  const out: Piece[] = [revolve("hull-grey", [0, 0], [[R - 0.14, CUTTER.decks[0]], [R - 0.14, CUTTER.top - 0.5]], 40, { arc, only: "mesh" })];
  for (const y of CUTTER.decks) {
    out.push(disc("hull-grey-dark", [0, 0], R - 0.14, y - 0.1, 0.12, 40));
    for (const x of [-1.2, 1.2]) out.push(...cot(x, y + 0.18, 0));
    out.push(cub("hull-blue", [-0.3, 0.3], [y + 0.18, y + 0.9], [-R + 0.6, -R + 0.2]), cub("panel-dark", [-0.9, 0.9], [y + 0.5, y + 1.3], [R - 0.5, R - 0.2]), cub("lamp-blue", [-0.6, -0.2], [y + 0.8, y + 0.95], [R - 0.2, R - 0.17]), cub("lamp-amber", [0.2, 0.6], [y + 0.8, y + 0.95], [R - 0.2, R - 0.17]));
  }
  out.push(...pipeRun([[2.3, CUTTER.decks[0], -1.8], [2.3, CUTTER.decks[1] + 3.5, -1.8]], 0.05, "coolant"), ...pipeRun([[0, CUTTER.top - 0.6, 0], [0, CUTTER.top + 0.9, 0]], 0.7, "hull-grey-dark", { ends: ["cap", "cap"] }));
  out.push(annulus("hull-grey", 0.75, R - 0.14, CUTTER.decks[1] + 3.4, CUTTER.decks[1] + 3.55, 40));
  return out;
}

/** The side lock: a short tube out of the cabin's side with a flat ring and a round pressure door, 1.4 m across, for a transfer with a craft alongside. */
function sideLock(y: number): Piece[] {
  const R = CUTTER.cabin;
  return [rod("hull-grey-dark", [R - 0.2, y, 0], [R + 0.9, y, 0], 0.8, 18), rod("hull-grey", [R + 0.9, y, 0], [R + 1.0, y, 0], 0.95, 18), rod("hull-grey-dark", [R + 1.0, y, 0], [R + 1.04, y, 0], 0.6, 18), rod("lamp-amber", [R + 1.04, y + 0.75, 0.55], [R + 1.1, y + 0.75, 0.55], 0.06, 6), rod("hazard", [R + 0.96, y - 0.95, 0], [R + 1.02, y - 0.95, 0], 0.12, 6)];
}

/** The tow hook: a bracket off the service drum, an eye on a short arm and a safety latch. */
function towHook(): Piece[] {
  const r = CUTTER.service;
  return [cub("hull-grey-dark", [-0.4, 0.4], [1.0, 1.9], [-r - 0.6, -r + 0.1]), rod("hull-grey", [0, 1.45, -r - 0.5], [0, 0.4, -r - 1.2], 0.18, 10), hoop("hull-yellow", 0.4, 0.3, 0.07, 24, 6, { at: [0, -r - 1.2] }), rod("hull-grey-dark", [0.3, 0.45, -r - 1.2], [0.3, 0.3, -r - 1.2], 0.05, 6)];
}

/**
 * The cutter's pieces. `cutaway` opens the cabin on `cutYaw` degrees and shows both decks.
 *
 * @example
 * ```ts
 * import { cutterPieces } from "./cutter.ts";
 *
 * console.log(cutterPieces().length > 100);
 * ```
 */
export function cutterPieces(options: ModuleOptions = {}): Piece[] {
  const R = CUTTER.cabin;
  const cut = options.cutaway === true;
  const yaw = rad(options.cutYaw ?? 0);
  const arc = cut ? () => [yaw + 0.95, yaw + 2 * Math.PI - 0.95] as const : undefined;
  const out: Piece[] = [];
  // the cabin: a cylinder, a nose cone, and the orange rescue bands that tell it from the shuttle
  out.push(revolve("hull-white", [0, 0], [[0.001, 4.3], [R, 4.3], [R, CUTTER.top], [2.3, CUTTER.top + 0.9], [1.5, CUTTER.top + 0.9]], 48, { arc, body: true, outline: true }));
  out.push(...collar("M", CUTTER.nose, 1));
  for (const [y0, y1] of [[7.2, 8.0], [12.4, 13.2]] as const) out.push(revolve("hull-orange", [0, 0], [[R + 0.03, y0], [R + 0.03, y1]], 36, { arc, only: "mesh" }));
  // the service section: a drum, radiator bands, the thrust cone and engine, and four quads
  out.push(cyl("hull-white-worn", [0, 0], CUTTER.service, 0.5, 4.3, 48, { body: true, outline: true }));
  for (let k = 0; k < 4; k++) out.push(revolve("radiator", [0, 0], [[CUTTER.service + 0.04, 1.2], [CUTTER.service + 0.04, 3.5]], 12, { arc: () => [rad(k * 90 + 12), rad(k * 90 + 78)] as const, only: "mesh" }));
  out.push(cyl("hull-grey-dark", [0, 0], CUTTER.service + 0.08, 4.1, 4.4, 48), revolve("engine-metal", [0, 0], [[0.6, 0.5], [0.75, 0.1], [1.6, -1.4]], 24, { outline: true }), revolve("bell-inside", [0, 0], [[0.55, 0.5], [0.7, 0.1], [1.5, -1.4]], 24));
  out.push(...stamp(thrusterQuad(), ringOf(4, CUTTER.service, 3.0, 45)), ...towHook(), ...pipeRun([[Math.sin(rad(140)) * 3.45, 0.9, Math.cos(rad(140)) * 3.45], [Math.sin(rad(140)) * 3.45, 4.0, Math.cos(rad(140)) * 3.45]], 0.07, "coolant", { ends: ["flange", "flange"] }));
  // on the cabin: four windows on each deck, the side lock, the hatch, grab handles, floodlights, lights, hazard band and whips
  for (const a of [60, 120, 240, 300]) out.push(...porthole(R, rad(a), 6.8, 0.38), ...porthole(R, rad(a), 11.6, 0.38));
  out.push(...sideLock(8.7), ...hatch({ r: R, az: rad(180), y: 9.4, size: 1.4, round: true }));
  for (const a of [30, 150, 210, 330]) out.push(...grabHandle(patch(R, rad(a), 9.4), 0, 0, 1.4, 0.03));
  out.push(...floodlight(R, rad(45), 13.8, 0.2), ...floodlight(R, rad(315), 13.8, 0.2), ...hazardBand(R + 0.01, 4.3, 4.7, 36), ...navLight("port", R, rad(270), 14.2), ...navLight("starboard", R, rad(90), 14.2), ...navLight("strobe", R, rad(0), 4.5));
  out.push(...antenna("whip", [1.1, CUTTER.top + 0.9, 0.2], [0.15, 1, 0], 1.6), ...antenna("whip", [-1.1, CUTTER.top + 0.9, -0.2], [-0.15, 1, 0], 1.3));
  if (cut) out.push(...inside(arc));
  return out;
}
