// Miyamoto's own system insets, each opening into six numbered sub-parts that come apart: the command citadel, the hangars and the medical bay. (The reactor core, the navigation and sensor suite, life support and the
// docking port are the fleet kit's four, shared by every ship.) The two propulsion cards, the main nozzle and a vernier, stand here too, each drawn on its own at a size where the throat, the coils and the feed lines
// show. Every sub-part is its own part of the registry, placed in its inset's assembly. Pure: no three.js and no DOM.
import { antenna, box, cub, HULL_STACKS, type Inset, type InsetPart, type Piece, rod } from "./adapter.ts";
import { nozzle, vernier } from "./drive.ts";
import { cutter, drone } from "./hangar.ts";
import { pipe } from "./hulls.ts";
import { capsule, collarAt, ringAt, tubeAt } from "./shapes.ts";

const part = (n: number, name: string, does: string, size: readonly [number, number, number], at: readonly [number, number, number], pieces: () => Piece[]): InsetPart => ({ n, name, does, size, at: [...at], pieces });

const citadel: Inset = {
  id: "ship-03-citadel",
  name: "Command citadel",
  note: "Miyamoto's command citadel opened into its six working parts.",
  parts: [
    part(1, "Communications core", "A tall tube through every deck, ringed with equipment and a cooling jacket.", [8, 20, 8], [0, 0, 0], () => [tubeAt("hull-grey", 0, 0, 3.6, 0, 20, { segs: 24 }), tubeAt("lamp-blue", 0, 0, 2.4, 0.5, 19.5, { segs: 16 }), ...[...Array(8).keys()].flatMap((k) => [ringAt("hull-grey-dark", 0, 0, 3.7, 1 + k * 2.4, 0.2), ringAt("copper", 0, 0, 4, 1.6 + k * 2.4, 0.12)]), ...antenna("dish", [0, 20, 0], [0, 1, 0], 5, "core")]),
    part(2, "Operations ring", "Fourteen consoles facing the core, a lit display above each.", [26, 4, 26], [0, 0, 0], () => [collarAt("deck", 0, 0, 4.4, 12.2, 0, 0.4), collarAt("hull-yellow", 0, 0, 12.2, 12.5, 0, 0.5), ...[...Array(14).keys()].flatMap((k) => { const a = (Math.PI * 2 * k) / 14; return [box("hull-grey-dark", [10.2 * Math.sin(a), 0.4, 10.2 * Math.cos(a)], 2.4, 1.2, 1.1, (a * 180) / Math.PI), cub("lamp-blue", [11.5 * Math.sin(a) - 0.5, 11.5 * Math.sin(a) + 0.5], [1.7, 3], [11.5 * Math.cos(a) - 0.5, 11.5 * Math.cos(a) + 0.5])]; })]),
    part(3, "Navigation desk", "A star-map table with three seats.", [12, 2, 10], [0, 0, 0], () => [cub("hull-grey-dark", [-6, 6], [0, 1], [-3, 3]), cub("lamp-blue", [-5.4, 5.4], [1, 1.08], [-2.4, 2.4]), ...[-4, 0, 4].map((x) => cub("hull-white-worn", [x - 0.6, x + 0.6], [0, 1.2], [4, 5.2])), cub("deck", [-7, 7], [-0.3, 0], [-5, 7])]),
    part(4, "Medical link", "A transfer corridor to the habitation hull, with a hazard door.", [4, 8, 4], [0, 0, 0], () => [tubeAt("hull-white-worn", 0, 0, 1.6, 0, 8, { segs: 12 }), cub("hazard", [-1.8, 1.8], [0, 0.2], [-1.8, 1.8]), ringAt("hull-grey-dark", 0, 0, 1.7, 4, 0.12)]),
    part(5, "Escape passage", "A tube with a ladder from the ring to a hatch in the armour.", [3, 24, 3], [0, 0, 0], () => [cub("hull-white-worn", [-1, 1], [0, 24], [-1, 1]), cub("hazard", [-1.1, 1.1], [0, 0.3], [-1.1, 1.1]), ...[...Array(40).keys()].map((k) => rod("hull-yellow", [-0.4, 0.6 * k, 0.9], [0.4, 0.6 * k, 0.9], 0.03, 4))]),
    part(6, "Armour laminate", "The eight layers of the citadel's wall, outside in, stepped so each shows.", [10, 1.2, 10], [0, 0, 0], () => HULL_STACKS.command.layers.map((layer, i) => cub(layer.material, [-5 + i * 0.3, 5 - i * 0.3], [i * 0.1, i * 0.1 + 0.5], [-5 + i * 0.3, 5 - i * 0.3]))),
  ],
};

const bays: Inset = {
  id: "ship-03-hangars",
  name: "Hangars",
  note: "The two bays opened into their six working parts.",
  parts: [
    part(1, "Bay door and shutters", "Five orange leaves on rails, a hazard sill and a grey frame.", [30, 10, 3], [0, 0, 0], () => [cub("hull-grey", [-15, 15], [0, 10], [-0.5, 0.2]), ...[...Array(5).keys()].map((k) => cub(k % 2 ? "hull-orange" : "hull-orange-worn", [-15 + k * 6 + 0.1, -9 + k * 6 - 0.1 + 6], [0.5, 9.5], [0.2, 0.8 + (k % 2) * 0.3])), cub("hazard", [-15, 15], [0, 0.4], [0.2, 0.7])]),
    part(2, "Gantry crane", "Two rails, a bridge, a trolley and a hook.", [20, 8, 40], [0, 0, 0], () => [cub("hull-yellow", [-10, -9.3], [0, 40], [7, 7.6]), cub("hull-yellow", [9.3, 10], [0, 40], [7, 7.6]), cub("hull-orange", [-10, 10], [19, 20.6], [6, 7.4]), cub("hull-yellow", [-1.6, 1.6], [18.4, 21.6], [4.8, 6]), rod("hull-grey-dark", [0, 20, 4.8], [0, 20, 0.5], 0.08, 6), cub("hazard", [-0.5, 0.5], [19.5, 20.5], [0, 0.8])]),
    part(3, "Rescue cutter", "A small craft on its cradle, nose to the door.", [14, 32, 6], [0, 0, 0], () => cutter(0, 16, 0, 32, 14)),
    part(4, "Maintenance racks", "Four shelves of crates along the wall.", [3, 12, 18], [0, 0, 0], () => [...[0, 1, 2, 3].map((t) => cub("hull-grey-dark", [0, 2.2], [0, 12], [t * 5, t * 5 + 0.25])), ...[0, 1, 2, 3].flatMap((t) => [0, 1, 2].map((k) => cub(k % 2 ? "hull-orange-worn" : "hull-yellow", [0.2, 1.9], [0.2 + k * 3.8, 3.6 + k * 3.8], [t * 5 + 0.25, t * 5 + 1.7])))]),
    part(5, "Pressure vestibule", "A box with two doors and a status lamp between the bay and the spine.", [12, 5, 8], [0, 0, 0], () => [cub("hull-white-worn", [-6, 6], [0, 5], [0, 7]), cub("hull-grey-dark", [-3, 3], [5, 5.2], [0.2, 5.9]), cub("hazard", [-3.3, 3.3], [5.2, 5.35], [5.9, 6.4]), cub("lamp-blue", [-0.3, 0.3], [5.2, 5.4], [6.6, 7])]),
    part(6, "Drone rack", "Six drones on a rack, three above three.", [14, 44, 14], [0, 0, 0], () => [...[0, 1, 2].flatMap((r) => [cub("hull-grey-dark", [-7, 7], [r * 14 + 2, r * 14 + 14], [0, 0.4]), ...drone(-3, r * 14 + 5, 0.4), ...drone(3, r * 14 + 10, 0.4)])]),
  ],
};

const medical: Inset = {
  id: "ship-03-medical",
  name: "Medical bay",
  note: "The triage bay opened into its six working parts.",
  parts: [
    part(1, "Triage berth", "A bed, a monitor arm, a glass hood and a lamp: six of them in two rows.", [2.4, 5, 4], [0, 0, 0], () => [cub("hull-white", [-1.1, 1.1], [0, 4.6], [0, 0.9]), cub("hull-grey-dark", [-0.9, 0.9], [0.2, 4.4], [0.9, 1.15]), cub("glass", [-1.15, 1.15], [0.2, 2.2], [1.2, 2.2]), rod("hull-grey", [0, -0.4, 0.9], [0, -0.4, 2.9], 0.07, 6), cub("lamp-blue", [-0.4, 0.4], [-0.7, -0.1], [2.9, 3])]),
    part(2, "Monitor arm and curtain rail", "An arm for the screen and a rail for the curtain.", [4, 1, 3], [0, 0, 0], () => [rod("hull-yellow", [-1.5, 0, 3], [1.5, 0, 3], 0.03, 5), rod("hull-grey", [0, 0, 0], [0, 0, 3], 0.07, 6), cub("hull-grey-dark", [-0.5, 0.5], [-0.1, 0.1], [2.2, 2.9]), cub("lamp-blue", [-0.4, 0.4], [-0.12, -0.1], [2.3, 2.8])]),
    part(3, "Quarantine room", "A glass-walled room with two berths and its own air.", [6, 5, 5], [0, 0, 0], () => [cub("glass", [-0.1, 0.1], [0, 5], [0, 5]), cub("hull-white-worn", [0.4, 5.6], [0.4, 2.6], [0, 0.9]), cub("hull-white-worn", [0.4, 5.6], [2.8, 4.6], [0, 0.9]), cub("hazard", [-0.2, 0.2], [0, 0.2], [0, 5]), capsule("hull-white", 3, 3, 0.5, 0, 2.4)]),
    part(4, "Transfer lock", "An orange box with a door each way and a hazard frame.", [3.2, 8, 6], [0, 0, 0], () => [cub("hull-orange", [0, 3.2], [0, 8], [0, 5.2]), cub("hazard", [0, 3.2], [-0.2, 0.1], [0, 5.2]), cub("lamp-amber", [0.2, 0.8], [6, 6.4], [4.6, 5])]),
    part(5, "Air and power isolation", "A panel that cuts the medical air and power from both bays.", [3, 3, 1], [0, 0, 0], () => [cub("panel-dark", [0, 3], [0, 3], [0, 0.5]), ...[0, 1, 2].flatMap((k) => [cub("hazard", [0.3 + k * 0.9, 0.9 + k * 0.9], [0.3, 2.7], [0.5, 0.6]), cub("lamp-red", [0.5 + k * 0.9, 0.7 + k * 0.9], [2.5, 2.7], [0.6, 0.7])]), ...pipe([0, 1, 0.5], [3, 1, 0.5], 0.1)]),
    part(6, "Medical stores", "Three racks of cases, a cold box and a locked cabinet.", [6, 4, 3], [0, 0, 0], () => [...[0, 1, 2].map((k) => cub(k === 1 ? "frost" : "hull-white", [k * 2, k * 2 + 1.8], [0, 4], [0, 2.6])), cub("hull-grey-dark", [0, 6], [0, 0.2], [0, 3]), ...[0, 1, 2].map((k) => cub("lamp-blue", [k * 2 + 0.7, k * 2 + 1.1], [3, 3.2], [2.6, 2.7]))]),
  ],
};

/** Miyamoto's three insets. */
export const SHIP_INSETS: Readonly<Record<string, Inset>> = { [citadel.id]: citadel, [bays.id]: bays, [medical.id]: medical };

/** The two propulsion cards: an engine on its own, true to its size, with its bell, throat, chamber, feed manifolds, coils and gimbal. */
export const CARDS = {
  main: { id: "card-main", name: "Propulsion card: main nozzle", size: [44, 56, 44] as const, pieces: (): Piece[] => nozzle(0, true, "card") },
  vernier: { id: "card-vernier", name: "Propulsion card: plasma vernier", size: [6, 12, 6] as const, pieces: (): Piece[] => vernier(0, 0) },
} as const;
