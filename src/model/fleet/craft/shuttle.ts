// The crew shuttle: a Dragon-and-Orion kind of craft, drawn round. A white pressure cabin on a service section with its radiators, four thruster quads and one main engine, and a nose that ends in a
// class M docking collar. Its axis is Y with the nose up (+Y), the way a kit module stands, and the cutaway opens on the side `cutYaw` says. Metres. Pure: no three.js and no DOM.
import { collar } from "../collars.ts";
import { annulus, antenna, disc, grabHandle, hatch, hazardBand, navLight, patch, pipeRun, porthole, ringOf, rod, stamp, cub } from "../detail.ts";
import { cyl, revolve } from "../solids.ts";
import { thrusterQuad } from "./fittings.ts";
import type { Piece } from "../../pieces.ts";
import type { ModuleOptions } from "../types.ts";

/** The shuttle's own sizes, metres: the cabin's radius, where its deck and nose stand, the service section's radius, the nose face the collar sits on. */
export const SHUTTLE = { cabin: 3, deck: 4.3, nose: 13, service: 3.3, seats: 6 } as const;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The seats: six couches in two rows of three on the deck, heads to the nose end, with a headrest each. */
function couches(): Piece[] {
  const y = SHUTTLE.deck + 0.18;
  const out: Piece[] = [];
  for (const x of [-1.5, 0, 1.5]) {
    for (const z of [-1.1, 1.1]) {
      out.push(cub("hull-blue", [x - 0.36, x + 0.36], [y, y + 0.12], [z - 0.8, z + 0.8]), cub("hull-grey-dark", [x - 0.3, x + 0.3], [y - 0.06, y], [z - 0.7, z + 0.7]));
      out.push(cub("hull-blue", [x - 0.3, x + 0.3], [y + 0.12, y + 0.4], [z - 0.84, z - 0.7]), rod("hull-grey", [x - 0.3, y + 0.1, z + 0.8], [x - 0.3, y + 0.1, z + 1.0], 0.04, 6), rod("hull-grey", [x + 0.3, y + 0.1, z + 0.8], [x + 0.3, y + 0.1, z + 1.0], 0.04, 6));
    }
  }
  return out;
}

/** The inside, drawn for a cutaway: the liner, the crew deck, couches, a console and its lamps, and the vestibule that leads to the collar. */
function inside(arc: (() => readonly [number, number]) | undefined): Piece[] {
  const R = SHUTTLE.cabin;
  const out: Piece[] = [revolve("hull-grey", [0, 0], [[R - 0.14, SHUTTLE.deck], [R - 0.14, 12.2]], 40, { arc, only: "mesh" })];
  out.push(disc("hull-grey-dark", [0, 0], R - 0.14, SHUTTLE.deck - 0.1, 0.12, 40), annulus("hull-grey", 0.75, R - 0.14, 10.8, 10.95, 40));
  out.push(...couches());
  // the console and handrails on the forward wall of the deck, lamps along it
  out.push(cub("panel-dark", [-1.4, 1.4], [8.2, 9.2], [-R + 0.55, -R + 0.2]), cub("lamp-blue", [-1.1, -0.4], [8.5, 8.7], [-R + 0.2, -R + 0.17]), cub("lamp-amber", [0.4, 1.1], [8.5, 8.7], [-R + 0.2, -R + 0.17]));
  out.push(...pipeRun([[-2.4, 5, -2.3], [-2.4, 10.3, -2.3]], 0.06, "pipe-steel"), ...pipeRun([[2.4, 5, -2.3], [2.4, 10.3, -2.3]], 0.06, "coolant"));
  // the vestibule: a short tube from the collar's door down to the deck's ladder
  out.push(...pipeRun([[0, 10.9, 0], [0, 12.3, 0]], 0.7, "hull-grey-dark", { ends: ["cap", "cap"] }));
  return out;
}

/**
 * The shuttle's pieces. `cutaway` opens the cabin on `cutYaw` degrees and shows the crew deck.
 *
 * @example
 * ```ts
 * import { shuttlePieces } from "./shuttle.ts";
 *
 * console.log(shuttlePieces().length > 100);
 * ```
 */
export function shuttlePieces(options: ModuleOptions = {}): Piece[] {
  const R = SHUTTLE.cabin;
  const cut = options.cutaway === true;
  const yaw = rad(options.cutYaw ?? 0);
  const arc = cut ? () => [yaw + 0.95, yaw + 2 * Math.PI - 0.95] as const : undefined;
  const out: Piece[] = [];
  // the cabin's skin: a cylinder, a short nose cone, and the ring the collar stands on
  out.push(revolve("hull-white", [0, 0], [[0.001, SHUTTLE.deck], [R, SHUTTLE.deck], [R, 12], [2.2, 12.9], [1.5, 12.9]], 48, { arc, body: true, outline: true }));
  out.push(...collar("M", SHUTTLE.nose, 1));
  // the service section: a drum, four wrapped radiator bands, the thrust cone and engine, and the quads
  out.push(cyl("hull-white-worn", [0, 0], SHUTTLE.service, 0.5, SHUTTLE.deck, 48, { body: true, outline: true }));
  for (let k = 0; k < 4; k++) out.push(revolve("radiator", [0, 0], [[SHUTTLE.service + 0.04, 1.2], [SHUTTLE.service + 0.04, 3.5]], 12, { arc: () => [rad(k * 90 + 12), rad(k * 90 + 78)] as const, only: "mesh" }));
  out.push(cyl("hull-grey-dark", [0, 0], SHUTTLE.service + 0.08, 3.9, 4.15, 48), revolve("engine-metal", [0, 0], [[0.6, 0.5], [0.75, 0.1], [1.6, -1.4]], 24, { outline: true }), revolve("bell-inside", [0, 0], [[0.55, 0.5], [0.7, 0.1], [1.5, -1.4]], 24));
  for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(rod("hull-grey-dark", [x * 1.1, 0.6, z * 1.1], [x * 0.7, 0.15, z * 0.7], 0.08, 8));
  out.push(...stamp(thrusterQuad(), ringOf(4, SHUTTLE.service, 3.0, 45)));
  // two propellant lines up the service section's side
  for (const az of [rad(140), rad(220)]) out.push(...pipeRun([[Math.sin(az) * 3.45, 0.9, Math.cos(az) * 3.45], [Math.sin(az) * 3.45, 3.8, Math.cos(az) * 3.45]], 0.07, "coolant", { ends: ["flange", "flange"] }));
  // on the cabin: four windows, a side hatch with a handwheel, grab handles, a hazard band at the deck line, running lights and two whips
  for (const a of [60, 120, 240, 300]) out.push(...porthole(R, rad(a), 9.4, 0.42));
  out.push(...hatch({ r: R, az: rad(180), y: 6.6, size: 1.5, round: true }));
  for (const a of [30, 150, 210, 330]) out.push(...grabHandle(patch(R, rad(a), 7.2), 0, 0, 1.2, 0.03));
  out.push(...hazardBand(R + 0.01, 4.3, 4.7, 36), ...navLight("port", R, rad(270), 11.4), ...navLight("starboard", R, rad(90), 11.4), ...navLight("strobe", R, rad(0), 4.5));
  out.push(...antenna("whip", [1.1, 12.9, 0.2], [0.15, 1, 0], 1.6), ...antenna("whip", [-1.1, 12.9, -0.2], [-0.15, 1, 0], 1.3));
  if (cut) out.push(...inside(arc));
  return out;
}
