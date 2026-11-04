// System insets: the four systems every ship has, each as an assembly of five or six numbered sub-parts that come apart (the view's "apart" opens it, so a page can open it on a click). A sub-part is its own part
// of the registry, placed in the assembly rather than stacked, and drawn at a scale where its detail shows. All original designs of this package. Pure: no three.js and no DOM.
import { deg } from "../../framing.ts";
import type { Piece, Vec3 } from "../pieces.ts";
import { collar } from "./collars.ts";
import { annulus, antenna, beam, box, disc, hoop, horn, lamps, post, ringOf, rod, stamp, stencil } from "./detail.ts";

/**
 * One numbered sub-part of an inset: its number, name, what it does, its size in metres (width, height, depth), where it sits in the assembled inset and how to draw it.
 *
 * @example
 * ```ts
 * import { INSETS, type InsetPart } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const part: InsetPart = INSETS["reactor-core"].parts[0];
 * console.log(part.n, part.name, part.size);
 * ```
 */
export interface InsetPart {
  n: number;
  name: string;
  does: string;
  /** Width, height and depth in metres. */
  size: readonly [number, number, number];
  /** The middle of its base in the assembled inset, in metres. */
  at: Vec3;
  pieces: () => Piece[];
}

/**
 * A system inset: an id and name, what it is, and its numbered sub-parts.
 *
 * @example
 * ```ts
 * import { INSETS, type Inset } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const inset: Inset = INSETS["life-support"];
 * console.log(inset.name, inset.parts.length);
 * ```
 */
export interface Inset {
  id: string;
  name: string;
  note: string;
  parts: readonly InsetPart[];
}

const part = (n: number, name: string, does: string, size: readonly [number, number, number], at: Vec3, pieces: () => Piece[]): InsetPart => ({ n, name, does, size, at, pieces });

const reactorCore: Inset = {
  id: "reactor-core",
  name: "Reactor core",
  note: "A fusion core in six parts, from the coil to the injector.",
  parts: [
    part(1, "Toroidal field coil", "Superconducting hoops that hold the plasma off the walls.", [8, 3, 8], [0, 3, 0], () => [hoop("coil", 3.2, 1.5, 0.7, 36, 8), ...Array.from({ length: 12 }, (_, k) => hoop("copper", 3.2, 1.5, 0.78, 6, 4, { arc: () => [deg(30 * k), deg(30 * k + 9)] })), ...stamp([box("hull-grey-dark", [0, 0.2, 3.9], 0.9, 0.6, 0.5)], ringOf(12, 0, 0))]),
    part(2, "Plasma vessel", "The ring where the fuel burns.", [7, 1.6, 7], [0, 3.7, 0], () => [hoop("hull-grey-dark", 3.2, 0.8, 0.45, 36, 8), hoop("core", 3.2, 0.8, 0.28, 36, 8), ...stamp([box("hull-grey", [0, 0.2, 3.75], 0.4, 0.4, 0.4)], ringOf(8, 0, 0))]),
    part(3, "Breeding blanket", "Tiles that catch neutrons and make tritium.", [8.6, 2.4, 8.6], [0, 0.4, 0], () => stamp([box("hull-blue", [0, 0, 3.9], 1.2, 0.6, 1.6), box("hull-grey", [0, 1.6, 3.9], 1.3, 0.7, 0.12)], ringOf(16, 0, 0))),
    part(4, "Neutron shield", "Water and polymer between the core and the crew.", [10, 5, 10], [0, 6.4, 0], () => [{ kind: "lathe", material: "hull-blue", segs: 32, body: true, outline: true, profile: [[4.8, 0], [5, 0.2], [5, 4.8], [4.8, 5]], welds: [2.5] }, annulus("hull-grey", 4.6, 5.0, 4.9, 5.1, 32), ...stamp([box("hazard", [0, 1.4, 5.04], 1.2, 0.05, 0.4)], ringOf(8, 0, 0)), ...stencil("37", 5.05, 0, 2.5, 1.2)]),
    part(5, "Heat exchanger", "Takes the heat out to the radiators.", [3, 6, 3], [7.2, 0.4, 0], () => [{ kind: "lathe", material: "hull-white-worn", segs: 20, body: true, outline: true, profile: [[1.2, 0], [1.3, 0.3], [1.3, 5.7], [1.2, 6]], welds: [2, 4] }, ...Array.from({ length: 12 }, (_, f) => annulus("hull-grey", 1.3, 1.55, 0.4 + f * 0.44, 0.5 + f * 0.44, 20)), post("copper", [0, 0], 0.15, 5.9, 0.15, 6.8, 8)]),
    part(6, "Fuel injector", "Meters deuterium and helium-3 into the vessel.", [3, 3, 3], [-6.6, 2.2, 0], () => [{ kind: "lathe", material: "hull-grey-dark", segs: 16, body: true, outline: true, profile: [[0.6, 0], [0.9, 0.4], [0.9, 2], [0.5, 2.6]] }, ...stamp([rod("copper", [0.9, 0.6, 0], [1.9, 1.6, 0], 0.09, 6)], ringOf(4, 0, 0)), ...lamps([{ at: [0, 2.6, 0], colour: "blue", size: 0.2 }])]),
  ],
};

const navSuite: Inset = {
  id: "nav-sensors",
  name: "Navigation and sensor suite",
  note: "How the ship knows where it is, in six parts.",
  parts: [
    part(1, "Star tracker", "Fixes the ship's place against the stars.", [2.4, 3, 2.4], [-5, 0, 3], () => [{ kind: "lathe", material: "hull-white", segs: 20, body: true, outline: true, profile: [[1.0, 0], [1.1, 0.3], [1.1, 1.4], [0.7, 1.7]] }, ...horn("hull-grey-dark", [0, 1.7, 0], [0, 3.0, 0], [0.7, 0.55, 0.4], 12), rod("glass", [0, 3.0, 0], [0, 3.06, 0], 0.4, 12)]),
    part(2, "Inertial platform", "Keeps its own sense of direction.", [3, 3, 3], [0, 0, 3.5], () => [{ kind: "lathe", material: "hull-grey", segs: 24, body: true, outline: true, profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, 1.1 * Math.sin((Math.PI * i) / 12)), 1.4 - 1.1 * Math.cos((Math.PI * i) / 12)] as const), rings: [1.4] }, hoop("hull-grey-dark", 1.35, 1.4, 0.07, 24, 4), rod("hull-grey-dark", [-1.4, 1.4, 0], [1.4, 1.4, 0], 0.12, 6), ...lamps([{ at: [0, 2.5, 0], colour: "amber", size: 0.1 }])]),
    part(3, "Radar array", "Looks ahead for dust and rocks.", [5, 4, 1.4], [5, 0, 3], () => antenna("phased", [0, 0.2, 0], [0, 0.6, 0.8], 4.4, "radar")),
    part(4, "Optical telescope", "A long tube for faint things far off.", [2.2, 5, 2.2], [-4, 0, -3], () => [box("hull-grey-dark", [0, 0, 0], 2.0, 2.0, 0.9), ...horn("hull-white", [0, 0.9, 0], [0, 4.6, 0], [0.85, 0.82, 0.8, 0.78, 0.76], 16), rod("glass", [0, 4.6, 0], [0, 4.66, 0], 0.72, 16), hoop("hull-grey-dark", 0.86, 3.6, 0.05, 16, 4)]),
    part(5, "Navigation computer", "Works out the course, three times over.", [4, 3, 2.4], [0, 0, -3.5], () => stamp([box("panel-dark", [0, 0, 0], 1.0, 1.6, 2.6), box("lamp-blue", [0, 1.8, 0.82], 0.7, 0.04, 0.12)], [{ at: [-1.5, 0, 0] }, { at: [0, 0, 0] }, { at: [1.5, 0, 0] }])),
    part(6, "Beacon receiver", "Hears the beacons of ports and other ships.", [3, 3.4, 3], [4.6, 0, -3.2], () => antenna("dish", [0, 0.2, 0], [0.3, 1, 0.2], 3.0, "beacon")),
  ],
};

const lifeSupport: Inset = {
  id: "life-support",
  name: "Life support",
  note: "Air, water, food and waste, in six parts, so a closed ship stays alive.",
  parts: [
    part(1, "Air scrubber", "Takes carbon dioxide out of the air.", [3, 4.6, 3], [-4.6, 0, 3], () => [{ kind: "lathe", material: "hull-white", segs: 20, body: true, outline: true, profile: [[1.3, 0], [1.4, 0.3], [1.4, 4.0], [1.0, 4.4]], welds: [1.5, 3] }, ...Array.from({ length: 6 }, (_, k) => post("copper", [1.6 * Math.sin(deg(60 * k)), 1.6 * Math.cos(deg(60 * k))], 0.1, 0.5, 0.1, 3.8, 6))]),
    part(2, "Water recycler", "Cleans every drop again.", [4, 3.6, 3], [0, 0, 3.4], () => [box("hull-blue", [-0.9, 0, 0], 1.6, 2.2, 3.0), box("hull-blue", [0.9, 0, 0], 1.6, 2.2, 3.0), rod("copper", [-0.9, 3.0, 0], [0.9, 3.0, 0], 0.14, 8), box("hull-grey-dark", [0, 3.0, 0], 0.5, 0.5, 0.5)]),
    part(3, "Oxygen generator", "Splits water into oxygen and hydrogen.", [3.4, 3, 3], [4.6, 0, 3], () => stamp([{ kind: "lathe", material: "hull-white", segs: 14, body: true, outline: true, profile: [[0.5, 0], [0.55, 0.2], [0.55, 2.3], [0.4, 2.6]] }], [{ at: [-1.1, 0, -0.8] }, { at: [0, 0, 0.8] }, { at: [1.1, 0, -0.8] }, { at: [0, 0, -1.1] }]).concat([beam("copper", [-1.1, 2.4, -0.8], [1.1, 2.4, -0.8], 0.12, 0.12)])),
    part(4, "Waste processor", "Turns waste into water and mulch.", [3, 3, 3.4], [-4.6, 0, -3.4], () => [{ kind: "lathe", material: "hull-grey", segs: 18, body: true, outline: true, profile: [[1.2, 0], [1.3, 0.3], [1.3, 2.4], [0.8, 3.0]] }, box("hull-grey-dark", [0, 0, 1.6], 1.2, 0.8, 1.0), rod("copper", [0, 2.2, 1.3], [0, 2.2, 2.2], 0.1, 6), rod("hull-grey", [0, 1.2, 1.3], [0, 1.2, 2.2], 0.1, 6), ...lamps([{ at: [0, 3.0, 0], colour: "amber", size: 0.12 }])]),
    part(5, "Hydroponic rack", "Grows greens under blue light.", [4, 3.2, 2], [0, 0, -3.6], () => [box("hull-grey", [0, 0, 0], 3.6, 1.6, 0.3), ...[0.4, 1.4, 2.4].flatMap((y) => [box("plant", [0, y, 0], 3.4, 1.4, 0.35), box("lamp-blue", [0, y + 0.8, 0], 3.4, 0.4, 0.05)]), ...[-1.7, 1.7].map((x) => box("hull-grey-dark", [x, 0, 0], 0.15, 1.6, 3.2))]),
    part(6, "Control panel", "Shows the state of the air, water and food.", [2.6, 2.4, 1.2], [4.6, 0, -3.4], () => [box("panel-dark", [0, 0, 0], 2.4, 0.9, 1.8), box("lamp-blue", [0, 0.9, 0.2], 1.6, 0.8, 0.05), box("lamp-amber", [0.9, 0.95, 0.5], 0.3, 0.2, 0.06), box("lamp-red", [-0.9, 0.95, 0.5], 0.3, 0.2, 0.06)]),
  ],
};

const dockingPort: Inset = {
  id: "docking-port",
  name: "Docking port",
  note: "A standard collar port in five parts, from the flange to the guide lights.",
  parts: [
    part(1, "Collar flange", "The standard S collar: bolts, pins and latch dogs.", [3, 0.4, 3], [0, 0, 0], () => collar("S", 0.4, 1)),
    part(2, "Capture ring", "Soft-captures the other ship before the latches close.", [3.6, 0.8, 3.6], [0, 0.4, 0], () => [annulus("hull-grey", 1.3, 1.8, 0, 0.5, 36), hoop("hull-yellow", 1.55, 0.55, 0.1, 28, 5), ...stamp([box("hull-grey-dark", [0, 0, 1.6], 0.5, 0.5, 0.7), rod("copper", [0, 0.7, 1.5], [0, 0.7, 1.0], 0.07, 6)], ringOf(6, 0, 0))]),
    part(3, "Pressure door", "Holds the air in when no one is docked.", [2, 0.5, 2], [0, 1.2, 0], () => [disc("hull-grey", [0, 0], 0.95, 0, 0.2, 24), hoop("hull-grey-dark", 0.6, 0.22, 0.05, 20, 4), rod("hull-grey", [-0.6, 0.3, 0], [0.6, 0.3, 0], 0.05, 6), rod("hull-grey", [0, 0.3, -0.6], [0, 0.3, 0.6], 0.05, 6)]),
    part(4, "Docking tunnel", "The way through, with handrails and lights.", [2.2, 3, 2.2], [0, 1.8, 0], () => [{ kind: "lathe", material: "hull-white-worn", segs: 20, outline: true, profile: [[1.05, 0], [1.05, 3]], welds: [1, 2] }, ...Array.from({ length: 4 }, (_, k) => rod("hull-yellow", [0.9 * Math.sin(deg(90 * k + 45)), 0.2, 0.9 * Math.cos(deg(90 * k + 45))], [0.9 * Math.sin(deg(90 * k + 45)), 2.8, 0.9 * Math.cos(deg(90 * k + 45))], 0.03, 5)), ...lamps(ringOf(4, 0.95, 2.9, 0).map((p) => ({ at: p.at, colour: "blue" as const, size: 0.08 })))]),
    part(5, "Guide lights and sensors", "Show the other pilot where to come in.", [3, 1.6, 3], [0, 5, 0], () => [...stamp([post("hull-grey-dark", [0, 1.55], 0.1, 0, 0.1, 0.9, 6), ...horn("hull-white", [0, 0.9, 1.55], [0, 1.1, 1.55], [0.2], 8)], ringOf(4, 0, 0)), ...lamps(ringOf(4, 1.55, 0.9, 45).map((p, i) => ({ at: p.at, colour: i % 2 ? ("blue" as const) : ("amber" as const), size: 0.16 })))]),
  ],
};

/**
 * The four system insets by id: reactor core, navigation and sensor suite, life support, docking port, each with five or six numbered sub-parts. Each sub-part is a part of the registry, placed in the assembly,
 * so a page's "apart" view opens the inset.
 *
 * @example
 * ```ts
 * import { INSETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const inset of Object.values(INSETS)) console.log(inset.name, inset.parts.map((one) => `${one.n} ${one.name}`).join("; "));
 * ```
 */
export const INSETS: Readonly<Record<string, Inset>> = { [reactorCore.id]: reactorCore, [navSuite.id]: navSuite, [lifeSupport.id]: lifeSupport, [dockingPort.id]: dockingPort };
