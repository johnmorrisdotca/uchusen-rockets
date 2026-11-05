// Hanabusa's own system insets: the ring hall and the survey pod, each opening into six numbered sub-parts that come apart. (The reactor core, the navigation and sensor suite, life support and the docking port are the fleet kit's four,
// shared by every ship.) The two propulsion cards, a main magnetic-nozzle thruster and a trim pod, stand here too, each drawn on its own at a size where the chamber, the coils and the flare show. Every sub-part is its own part
// of the registry, placed in its inset's assembly. Pure: no three.js and no DOM.
import { antenna, cub, hoop, horn, type Inset, type InsetPart, type Lathe, type Piece, place, rod, roundStrut } from "./adapter.ts";
import { mnThruster } from "./drive.ts";
import { liftTube } from "./wheelparts.ts";

const part = (n: number, name: string, does: string, size: readonly [number, number, number], at: readonly [number, number, number], pieces: () => Piece[]): InsetPart => ({ n, name, does, size, at: [...at], pieces });
const tree = (x: number, z: number, tall: number): Piece[] => [rod("wood", [x, 0, z], [x, 1.2, z], 0.12, 6, { only: "mesh" }), ...horn("leaf", [x, 1.0, z], [x, 1.0 + tall, z], [1.2, 1.3, 1.0, 0.7, 0.4, 0.2], 10, { only: "mesh" })];

const hall: Inset = {
  id: "ship-01-hall",
  name: "Ring hall",
  note: "A glazed ring's hall opened into its six working parts.",
  parts: [
    part(1, "Glass roof and mullions", "A curved panel of glass in fine mullions and a lattice of rings, tinted and reflecting.", [14, 6, 14], [0, 0, 0], () => [hoop("glass-clear", 14, 0, 5, 48, 18, { arc: () => [-0.5, 0.5] }), ...[-0.4, -0.2, 0, 0.2, 0.4].map((a) => hoop("hull-grey", 14, 0, 5.1, 48, 18, { arc: () => [a - 0.012, a + 0.012] })), hoop("hull-grey", 14, 2.5, 0.12, 48, 6, { arc: () => [-0.5, 0.5] }), hoop("hull-grey", 14, -2.5, 0.12, 48, 6, { arc: () => [-0.5, 0.5] })]),
    part(2, "Terrace step and house", "Three steps up a side wall with a house on each: lit window band, balcony with rail, awning and green roof.", [8, 9, 9], [0, 0, 0], () => [cub("concrete", [-4, 4], [0, 1], [-4, 4]), cub("concrete", [-4, 4], [1, 2], [-1, 4]), cub("concrete", [-4, 4], [2, 3], [2, 4]), cub("hull-white", [-3.2, 3.2], [1, 4.2], [-0.5, 1.4]), cub("window", [-2.6, 2.6], [1.6, 3.4], [1.45, 1.55]), cub("hull-orange", [-3.3, 3.3], [3.4, 3.7], [1.4, 2.4]), cub("plant", [-3, 3], [4.2, 4.4], [-0.3, 1.2]), ...[-2.8, 0, 2.8].map((x) => cub("hull-grey", [x - 0.05, x + 0.05], [1, 1.9], [2.35, 2.45]))]),
    part(3, "Canal and tree row", "A canal with kerbs, a footpath and a row of trees.", [10, 5, 16], [0, 0, 0], () => [cub("water", [-1.4, 1.4], [0, 0.2], [-8, 8]), cub("hull-grey", [-1.7, -1.4], [0, 0.4], [-8, 8]), cub("hull-grey", [1.4, 1.7], [0, 0.4], [-8, 8]), cub("concrete", [1.7, 3.4], [0, 0.1], [-8, 8]), cub("plant", [3.4, 5], [0, 0.1], [-8, 8]), ...[-6, -2, 2, 6].flatMap((z) => tree(4.2, z, 3))]),
    part(4, "Glazed spoke lift", "A glass tube from the hub to the ring with its rail and lit car.", [18, 7, 7], [0, 0, 0], () => liftTube([-8, 3.6, 0], [8, 3.6, 0], "glass-clear", 3.4, [0.3, 0.7], Math.PI / 2)),
    part(5, "Hub bearing and slip ring", "A drum on a bearing round the keel, with rollers, a slip ring for power and the cross-beams to the booms.", [14, 7, 14], [0, 0, 0], () => [{ kind: "lathe", material: "hull-white", segs: 40, body: true, outline: true, profile: [[6, 0], [6, 5]] } as Lathe, hoop("hull-grey-dark", 6.2, 0.4, 0.4, 40, 8), hoop("copper", 6.2, 2.5, 0.35, 40, 8), hoop("hull-grey-dark", 6.2, 4.6, 0.4, 40, 8), ...Array.from({ length: 12 }, (_, k) => place([rod("hull-grey", [0, 0.6, 6.4], [0, 4.4, 6.4], 0.3, 8, { only: "mesh" })], { at: [0, 0, 0], yaw: 30 * k })).flat(), ...roundStrut("hull-grey", [6, 2.5, 0], [-7, 2.5, 0], 0.35)]),
    part(6, "Solar skirt panel", "A band of cells on a frame with ribs, standing off the rim.", [16, 3, 9], [0, 0, 0], () => [cub("solar", [-8, 8], [0, 0.15], [-4.5, 4.5]), ...[-8, -4, 0, 4, 8].map((x) => cub("hull-grey", [x - 0.1, x + 0.1], [0, 0.4], [-4.6, 4.6])), cub("hull-grey", [-8, 8], [0, 0.4], [-4.6, -4.4]), cub("hull-grey", [-8, 8], [0, 0.4], [4.4, 4.6]), ...[-6, 6].map((x) => cub("hull-grey-dark", [x - 0.3, x + 0.3], [-1.2, 0], [-0.3, 0.3]))]),
  ],
};

const survey: Inset = {
  id: "ship-01-survey",
  name: "Survey pod and laboratory",
  note: "The survey pod and its laboratory opened into their six working parts.",
  parts: [
    part(1, "Survey drone", "An autonomous probe: a body with a sensor head, four rotor arms with fans, and solar fins.", [8, 3, 8], [0, 0, 0], () => [cub("hull-white", [-1.2, 1.2], [0.6, 1.8], [-1.2, 1.2]), cub("window", [-0.8, 0.8], [1.8, 2.2], [-0.8, 0.8]), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([sx, sz]) => [rod("hull-grey", [sx * 1.2, 1.2, sz * 1.2], [sx * 3.2, 1.2, sz * 3.2], 0.1, 6, { only: "mesh" }), { kind: "lathe", material: "hull-grey-dark", at: [sx * 3.2, sz * 3.2], segs: 20, only: "mesh", profile: [[1.0, 1.15], [1.0, 1.3]] } as Lathe]), cub("solar", [-0.9, 0.9], [1.82, 1.9], [-2.2, 2.2])]),
    part(2, "Probe rack", "A rack of four probes on clamps, each with a nose, fins and a dish.", [10, 6, 4], [0, 0, 0], () => [cub("hull-grey-dark", [-5, 5], [0, 0.3], [-2, 2]), ...[-3.6, -1.2, 1.2, 3.6].flatMap((x) => [cub("hull-grey", [x - 0.15, x + 0.15], [0, 5], [-0.2, 0.2]), ...horn("hull-white", [x, 0.5, 0], [x, 4.6, 0], [0.7, 0.7, 0.6, 0.3], 10, { only: "mesh" }), ...antenna("dish", [x, 4.6, 0], [0, 1, 0], 1.2, `p${x}`)])]),
    part(3, "Laboratory bench", "A bench with a microscope, a sample cabinet and a fume hood.", [8, 4, 4], [0, 0, 0], () => [cub("hull-white", [-4, 4], [0, 1], [-1.5, 1.5]), cub("hull-grey-dark", [-4, 4], [1, 1.1], [-1.5, 1.5]), ...horn("hull-grey", [-2, 1.1, 0], [-2, 2.2, 0], [0.4, 0.3], 10, { only: "mesh" }), cub("hull-grey", [1, 3.6], [1.1, 3.4], [-1.4, 0]), cub("glass-clear", [1.2, 3.4], [1.3, 3.2], [-0.1, 0.1]), cub("hull-yellow", [-4, -3], [1, 3.6], [0.5, 1.4])]),
    part(4, "Telescope and sensor head", "A tube telescope on a mount with a baffle and a spectrometer.", [6, 8, 6], [0, 0, 0], () => [cub("hull-grey-dark", [-2, 2], [0, 1.4], [-2, 2]), cub("hull-grey", [-0.5, 0.5], [1.4, 3], [-0.5, 0.5]), ...horn("hull-white", [0, 3, 0], [3.4, 6.6, 0], [1.2, 1.2, 1.1, 1.0], 14, { only: "mesh" }), { kind: "lathe", material: "lamp-blue", at: [0, 0], segs: 16, only: "mesh", profile: [[0.4, 0.2], [0.4, 0.3]] } as Lathe]),
    part(5, "Deep-space dish", "A high-gain dish on a gimbal mast.", [8, 9, 8], [0, 0, 0], () => [rod("hull-grey", [0, 0, 0], [0, 4, 0], 0.4, 10, { only: "mesh" }), ...antenna("dish", [0, 4, 0], [0.3, 0.9, 0], 7, "dish")]),
    part(6, "Lander cradle, empty", "Two guide rails on sleepers, four clamp arms, hazard chocks and a stencilled number: the bay is empty.", [10, 3, 16], [0, 0, 0], () => [...[-3, 3].map((x) => cub("hull-yellow", [x - 0.2, x + 0.2], [0.4, 0.8], [-8, 8])), ...[-7, -3.5, 0, 3.5, 7].map((z) => cub("hull-grey-dark", [-4, 4], [0, 0.4], [z - 0.3, z + 0.3])), ...[-5, 5].flatMap((z) => [-1, 1].map((sx) => cub("hull-grey", [sx * 3.4 - 0.25, sx * 3.4 + 0.25], [0.8, 2.6], [z - 0.25, z + 0.25]))), ...[-8, 8].map((z) => cub("hazard", [-5, 5], [0, 0.3], [z - 0.3, z + 0.3]))]),
  ],
};

/** Hanabusa's two insets. */
export const SHIP_INSETS: Readonly<Record<string, Inset>> = { [hall.id]: hall, [survey.id]: survey };

/** The two propulsion cards: a main magnetic-nozzle thruster and a trim pod, each on its own at a size where the chamber, the coils and the flare of rings show. */
export const CARDS = {
  main: { id: "card-main", name: "Propulsion card: main thruster", size: [24, 32, 24] as const, pieces: (): Piece[] => place(mnThruster(3.5), { at: [0, 17, 0] }) },
  trim: { id: "card-trim", name: "Propulsion card: plasma trim pod", size: [8, 10, 8] as const, pieces: (): Piece[] => place(mnThruster(0.9), { at: [0, 4, 0] }) },
} as const;
