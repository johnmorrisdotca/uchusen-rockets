// The EVA work pod: a one-person pod for repairs, in the Shuttle's Manned Maneuvering Unit and the ISS robot arms' line. A round cab with a window ring and a seat, in a frame of round tubes, with two three-segment
// arms folded to its sides, a tool tray, four thruster quads on the frame's corners and a class S collar at the nose. Its axis is Y with the nose up (+Y), and the cutaway opens the cab on the side `cutYaw` says. Metres.
// Pure: no three.js and no DOM.
import { collar } from "../collars.ts";
import { annulus, antenna, cub, disc, hoop, navLight, rod, strut } from "../detail.ts";
import { cyl, revolve } from "../solids.ts";
import type { Piece } from "../../pieces.ts";
import type { ModuleOptions } from "../types.ts";

/** The pod's own sizes, metres: the cab's centre and radius, the frame's half width and the nose face the collar sits on. */
export const POD = { cab: [0, 1.7], r: 1.1, frame: 1.15, nose: 3.5 } as const;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** One arm folded along the frame at `side` (-1 or +1): a shoulder, an upper arm, an elbow, a forearm and a two-finger gripper. */
function arm(side: -1 | 1): Piece[] {
  const x = side * (POD.frame + 0.25);
  return [cyl("hull-grey-dark", [x, 0.4], 0.17, 2.1, 2.45, 14), rod("hull-white", [x, 2.3, 0.4], [x + side * 0.15, 1.1, 0.75], 0.09, 10), cyl("hull-yellow", [x + side * 0.15, 0.75], 0.12, 1.0, 1.2, 12), rod("hull-grey", [x + side * 0.15, 1.1, 0.75], [x + side * 0.1, 0.45, 0.55], 0.08, 10), rod("hull-grey-dark", [x + side * 0.1 - 0.06, 0.45, 0.55], [x + side * 0.1 - 0.06, 0.1, 0.55], 0.03, 6), rod("hull-grey-dark", [x + side * 0.1 + 0.06, 0.45, 0.55], [x + side * 0.1 + 0.06, 0.1, 0.55], 0.03, 6)];
}

/** The cab's inside for a cutaway: the liner, a seat with a harness, a hand controller and a display. */
function inside(arc: (() => readonly [number, number]) | undefined): Piece[] {
  const [, y] = POD.cab;
  return [revolve("hull-grey", [0, 0], [[POD.r - 0.1, y - 0.7], [POD.r - 0.1, y + 0.7]], 28, { arc, only: "mesh" }), cub("hull-blue", [-0.3, 0.3], [y - 0.55, y - 0.35], [-0.3, 0.3]), cub("hull-blue", [-0.3, 0.3], [y - 0.35, y + 0.45], [-0.36, -0.28]), cub("hull-grey-dark", [-0.1, 0.1], [y - 0.2, y + 0.0], [0.35, 0.55]), cub("panel-dark", [-0.35, 0.35], [y + 0.1, y + 0.4], [0.6, 0.72]), cub("lamp-blue", [-0.2, 0.0], [y + 0.18, y + 0.26], [0.58, 0.6])];
}

/**
 * The pod's pieces. `cutaway` opens the cab and shows the seat.
 *
 * @example
 * ```ts
 * import { podPieces } from "./pod.ts";
 *
 * console.log(podPieces().length > 100);
 * ```
 */
export function podPieces(options: ModuleOptions = {}): Piece[] {
  const [, cy] = POD.cab;
  const R = POD.r;
  const cut = options.cutaway === true;
  const yaw = rad(options.cutYaw ?? 0);
  const arc = cut ? () => [yaw + 0.95, yaw + 2 * Math.PI - 0.95] as const : undefined;
  const out: Piece[] = [];
  // the cab: a sphere (a lathe of a half circle twice), the window ring and a hatch collar on top
  const sphere = Array.from({ length: 17 }, (_, i) => [R * Math.sin((Math.PI * i) / 16), cy - R * Math.cos((Math.PI * i) / 16)] as [number, number]);
  sphere[0] = [0.001, cy - R];
  sphere[16] = [0.001, cy + R];
  out.push(revolve("hull-white", [0, 0], sphere, 32, { arc, body: true, outline: true }), hoop("hull-grey-dark", R * 0.99, cy + 0.15, 0.06, 32, 5), annulus("window", R * 0.93, R * 1.0, cy + 0.2, cy + 0.55, 32, { arc }));
  // the neck to the collar, and the collar
  out.push(cyl("hull-grey-dark", [0, 0], 0.8, cy + R - 0.1, POD.nose - 0.1, 24, { body: true }), ...collar("S", POD.nose, 1));
  // the frame: four round corner posts, rings at the top and the foot, and diagonals
  const h = POD.frame;
  for (const x of [-h, h]) for (const z of [-h, h]) out.push(rod("hull-grey", [x, 0.2, z], [x, 2.7, z], 0.06, 10));
  for (const y of [0.2, 2.7]) for (const [a, b] of [[[-h, -h], [h, -h]], [[h, -h], [h, h]], [[h, h], [-h, h]], [[-h, h], [-h, -h]]] as const) out.push(rod("hull-grey", [a[0], y, a[1]], [b[0], y, b[1]], 0.05, 8));
  out.push(...strut("hull-grey-dark", [-h, 0.2, h], [h, 2.7, h], 0.035, 8), ...strut("hull-grey-dark", [h, 0.2, -h], [-h, 2.7, -h], 0.035, 8));
  // a thruster quad on each lower corner: a small housing and four bells
  for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(cub("hull-grey", [x * h - 0.14, x * h + 0.14], [0.05, 0.35], [z * h - 0.14, z * h + 0.14]), rod("bell", [x * h + x * 0.14, 0.2, z * h], [x * h + x * 0.34, 0.2, z * h], 0.07, 8), rod("bell", [x * h, 0.2, z * h + z * 0.14], [x * h, 0.2, z * h + z * 0.34], 0.07, 8));
  // the propellant bottle, the tool tray with its tools, the arms and a work light
  out.push(revolve("hull-white-worn", [0, -0.6], [[0.001, 0.25], [0.3, 0.35], [0.3, 1.0], [0.001, 1.1]], 16, { outline: true }), cub("hull-grey-dark", [-0.5, 0.5], [0.12, 0.2], [0.75, 1.1]), rod("hull-yellow", [-0.3, 0.25, 0.9], [0.3, 0.25, 0.9], 0.03, 6), rod("hull-grey", [0, 0.25, 0.9], [0, 0.5, 0.95], 0.03, 6), cub("hazard", [-0.5, 0.5], [0.2, 0.22], [1.04, 1.1]));
  out.push(...arm(-1), ...arm(1), cub("flood", [-0.12, 0.12], [0.6, 0.72], [h + 0.02, h + 0.1]), ...navLight("port", 0.9, rad(270), 2.9, 0.05), ...navLight("starboard", 0.9, rad(90), 2.9, 0.05), ...antenna("whip", [0.5, POD.nose - 0.1, 0.3], [0.2, 1, 0], 0.6, "pod"));
  if (cut) out.push(...inside(arc), disc("hull-grey-dark", [0, 0], R * 0.9, cy - 0.76, 0.06, 24));
  return out;
}
