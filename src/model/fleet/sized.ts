// The resizable kit parts: modules whose size in metres is the input. A ship that needs a 22 m container, an 80 m tank or a 165 m ring asks for one here and gets a normal `KitModule` (a name, a mass, a size, `pieces(options)`),
// drawn from the same numbers and the same detail as the ship that first needed it. A size outside a part's limits throws a RangeError that names the limit. The standard modules in `modules.ts` are not touched. Pure: no three.js and no DOM.
import { type CollarClass } from "./collars.ts";
import { checkContainer, containerPieces, CONTAINER_LIMITS } from "./heavy/container.ts";
import { checkTruss, TRUSS_LIMITS, trussPieces } from "./heavy/truss.ts";
import { checkWing, stowedPieces, WING_LIMITS, wingPieces } from "./heavy/wing.ts";
import { checkRing, RING_LIMITS, ringInsidePieces, ringPieces } from "./heavy/ring.ts";
import { checkTank, tankInsidePieces, tankPieces, TANK_LIMITS, type TankBrace } from "./heavy/tank.ts";
import { isCoarse } from "./levels.ts";
import { rng as solidRng } from "./solids.ts";
import type { MaterialName } from "../materials.ts";
import type { KitModule, ModuleOptions } from "./types.ts";

/** A number from a string, the same each time: the seed of a module's generator. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** What every resizable part is asked for besides its size: the name it goes by and its mass. A figure names its source, so the mass is the ship's to give. */
export interface SizedBase {
  /** The module's id. Left out: `<kind>-<size>`. */
  id?: string;
  /** What it is called. Left out: the kind and its size. */
  name?: string;
  /** Dry mass in tonnes. */
  mass: number;
}

/**
 * A heavy cargo container's size: its width and height across and its length along the spine, in metres.
 *
 * @example
 * ```ts
 * import { SIZED, type ContainerSize } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const size: ContainerSize = { across: 22, long: 40, mass: 900 };
 * console.log(SIZED.container(size).length);
 * ```
 */
export interface ContainerSize extends SizedBase {
  /** Metres across, 15 to 60. Narrower is a standard container (`BUILDERS.container`). */
  across: number;
  /** Metres along the spine, 15 to 200. */
  long: number;
  /** Refrigerated: the same box with a cold-chain band. */
  cold?: boolean;
}

/**
 * A heavy propellant tank's size: its radius and its length along the spine, in metres.
 *
 * @example
 * ```ts
 * import { SIZED, type TankSize } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const size: TankSize = { radius: 40, length: 440, mass: 6000, propellant: 100000 };
 * console.log(SIZED.tank(size).width);
 * ```
 */
export interface TankSize extends SizedBase {
  /** Metres from the axis to the wall, 8 to 60. */
  radius: number;
  /** Metres from the tail of the aft dome to the nose of the forward one: 4 radii to 600. */
  length: number;
  /** Propellant it holds when full, in tonnes. */
  propellant: number;
  /** The angle from +z towards +x that the feed manifold faces. Left out: +z. */
  toward?: number;
  /** The tank's number, in lettering on its flat. */
  label?: string;
  /** A spine to brace the cradle rings to: how far it is and how wide. Left out: no braces. */
  brace?: TankBrace;
}

/**
 * A heavy habitat ring's size: the radius from its axis to the middle of its section, and the section's size, in metres.
 *
 * @example
 * ```ts
 * import { SIZED, type RingSize } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const size: RingSize = { major: 165, tube: 36, mass: 85000 };
 * console.log(SIZED.habitatRing(size).width);
 * ```
 */
export interface RingSize extends SizedBase {
  /** Metres from the axis to the middle of the section: 2.5 sections to 400. */
  major: number;
  /** The section's size, square, in metres: 4 to 60. It is also the ring's length along its axis. */
  tube: number;
  /** The colour of its rim bands. Left out: orange. */
  tone?: MaterialName;
}

/**
 * A heavy truss spine's size: its width (square) and the pitch of its bays, and its length along the axis, in metres.
 *
 * @example
 * ```ts
 * import { SIZED, type TrussSize } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const size: TrussSize = { square: 36, bay: 24, length: 1760, mass: 62000 };
 * console.log(SIZED.trussSpine(size).length);
 * ```
 */
export interface TrussSize extends SizedBase {
  /** Metres across, in x and z: 3 to 60. */
  square: number;
  /** Metres from one frame to the next: 2 to 48, and a quarter to twice the width. */
  bay: number;
  /** Metres along the axis: one bay to 3,000. */
  length: number;
}

/**
 * A heavy radiator wing's size: the boom's length, a panel's width and the number of panels, in metres.
 *
 * @example
 * ```ts
 * import { SIZED, type WingSize } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const size: WingSize = { length: 560, panelWidth: 56, panels: 6, mass: 15000 };
 * console.log(SIZED.radiatorWing(size).width);
 * ```
 */
export interface WingSize extends SizedBase {
  /** Metres along the boom: four panel widths to 1,500. */
  length: number;
  /** Metres across one panel: 8 to 120. */
  panelWidth: number;
  /** How many panels hang from the boom: 1 to 12. */
  panels: number;
  /** Metres from the axis to the boom. Left out: 44 m at a 56 m panel, and in proportion. */
  root?: number;
  /** Which side the wing reaches to: +1 for +x, -1 for -x. Left out: +1. */
  side?: 1 | -1;
  /** The same panels folded into a stack on a short arm, `length` long. */
  folded?: boolean;
}

const NO_COLLAR: { top?: CollarClass; bottom?: CollarClass } = {};

/** A heavy container: Kaminari's box, at any size from 15 m across. Its pieces stand with the middle of the base on the origin, the length up Y, and its outward faces on +X and +Z. */
function container(size: ContainerSize): KitModule {
  checkContainer(size.across, size.long);
  const id = size.id ?? `container-${size.across}x${size.long}${size.cold ? "-cold" : ""}`;
  return {
    id,
    name: size.name ?? `Container, ${size.across} m by ${size.long} m${size.cold ? ", cold" : ""}`,
    kind: "cargo",
    note: `A heavy cargo container ${size.across} m across and ${size.long} m long: a corrugated box with corner castings, a door end with lock rods and, on its two outward faces, conduits, a recessed panel, a vent, a power receptacle and lifting eyes. Its fittings grow with its size.`,
    mass: size.mass,
    propellant: 0,
    length: size.long,
    width: size.across,
    depth: size.across,
    ...NO_COLLAR,
    ports: [],
    ancestor: "ISO 668 freight containers: corner castings, corrugated sides and cam-locked door rods, at heavy-lift size",
    inside: false,
    livery: "transport",
    pieces: (options: ModuleOptions = {}) => {
      const coarse = options.level === "coarse";
      const made = containerPieces(size, [0, size.long / 2, 0], 1, 1, solidRng(seedOf(`${options.seed ?? ""}/${id}`)), (options.seed ?? id).slice(0, 5).toUpperCase(), "hull-grey-dark", !coarse);
      return coarse ? made.filter(isCoarse) : made;
    },
  };
}

/** A heavy tank: Kaminari's domed drum with its cradle rings, manifold, valve houses and hatches, at any radius from 8 m. With `cutaway` the propellant, baffle rings and pumps show inside. */
function tank(size: TankSize): KitModule {
  checkTank(size.radius, size.length);
  const id = size.id ?? `tank-${size.radius}x${size.length}`;
  return {
    id,
    name: size.name ?? `Tank, ${2 * size.radius} m across, ${size.length} m`,
    kind: "tank",
    note: `A heavy propellant tank ${2 * size.radius} m across and ${size.length} m long, domed at both ends: banded insulation, cradle rings, a feed manifold, vent stacks, valve houses, access hatches and service lettering, all growing with its size.`,
    mass: size.mass,
    propellant: size.propellant,
    length: size.length,
    width: 2 * size.radius,
    depth: 2 * size.radius,
    ...NO_COLLAR,
    ports: [],
    ancestor: "the Saturn V S-IC and the Space Shuttle external tank: banded insulation, cradle rings and a feed line up the side, at heavy-lift size",
    inside: true,
    livery: "industrial",
    pieces: (options: ModuleOptions = {}) => {
      const outer = tankPieces(size, { seed: seedOf(`${options.seed ?? ""}/${id}`), ...(size.toward !== undefined ? { toward: size.toward } : {}), ...(size.label ? { label: size.label } : {}), ...(size.brace ? { brace: size.brace } : {}) });
      const made = options.cutaway ? [...outer, ...tankInsidePieces(size, [0, 0], solidRng(seedOf(`${options.seed ?? ""}/${id}/inside`)))] : outer;
      return options.level === "coarse" ? made.filter(isCoarse) : made;
    },
  };
}

/** A heavy habitat ring: Kaminari's spinning torus with six spokes to a hub, window cells, rim bands and fins, at any size from a 4 m section. With `cutaway` the three decks show inside. */
function habitatRing(size: RingSize): KitModule {
  checkRing(size.major, size.tube);
  const id = size.id ?? `ring-${size.major}x${size.tube}`;
  const reach = 2 * (size.major + size.tube / 2);
  return {
    id,
    name: size.name ?? `Habitat ring, ${size.major} m radius`,
    kind: "habitat",
    note: `A rotating habitat ring ${size.major} m from its axis to the middle of a ${size.tube} m section, on a hub with six spokes: window cells, rim bands, radiator fins and service collars, all growing with its section.`,
    mass: size.mass,
    propellant: 0,
    length: size.tube,
    width: reach,
    depth: reach,
    ...NO_COLLAR,
    ports: [],
    ancestor: "the Stanford torus and the 2001 wheel station: a spinning ring on spokes, with the floor on the rim",
    inside: true,
    livery: "industrial",
    pieces: (options: ModuleOptions = {}) => {
      const seed = seedOf(`${options.seed ?? ""}/${id}`);
      const outer = ringPieces(size, size.tone ?? "hull-orange", solidRng(seed));
      const made = options.cutaway ? [...outer, ...ringInsidePieces(size, 0, undefined, solidRng(seed + 1))] : outer;
      return options.level === "coarse" ? made.filter(isCoarse) : made;
    },
  };
}

/** A heavy truss spine: Kaminari's square truss with chords, bay frames, turning diagonals, nodes, trays and rails, at any width from 3 m. */
function trussSpine(size: TrussSize): KitModule {
  checkTruss(size.square, size.bay, size.length);
  const id = size.id ?? `truss-${size.square}x${size.length}`;
  return {
    id,
    name: size.name ?? `Truss spine, ${size.square} m square, ${size.length} m`,
    kind: "truss",
    note: `An open truss spine ${size.square} m square and ${size.length} m long in ${size.bay} m bays: four chords, a frame at each bay, diagonals that turn bay by bay, joint nodes, and on each face a cable tray, a pipe pair with clamps and a service rail.`,
    mass: size.mass,
    propellant: 0,
    length: size.length,
    width: size.square,
    depth: size.square,
    ...NO_COLLAR,
    ports: [],
    ancestor: "the International Space Station's integrated truss: square bays with diagonal braces, trays and rails along each face",
    inside: false,
    livery: "industrial",
    pieces: (options: ModuleOptions = {}) => {
      const made = trussPieces(size, solidRng(seedOf(`${options.seed ?? ""}/${id}`)));
      return options.level === "coarse" ? made.filter(isCoarse) : made;
    },
  };
}

/** A heavy radiator wing: Kaminari's boom with its hinged panels of tube rows, ribs and knuckles, at any panel width from 8 m, or the same panels folded. */
function radiatorWing(size: WingSize): KitModule {
  checkWing(size.length, size.panelWidth, size.panels);
  const id = size.id ?? `radiator-wing-${size.panels}x${size.panelWidth}x${size.length}${size.folded ? "-folded" : ""}`;
  const root = size.root ?? (size.panelWidth * 44) / 56;
  const reach = root + 3 + size.panels * (size.panelWidth + 2);
  return {
    id,
    name: size.name ?? (size.folded ? `Radiator pack, folded, ${size.length} m` : `Radiator wing, ${size.panels} panels of ${size.panelWidth} m`),
    kind: "radiator",
    note: size.folded ? `Six radiator panels ${size.panelWidth} m wide folded into a stack ${size.length} m long, held by latch brackets on a short arm.` : `A radiator wing of ${size.panels} hinged panels, each ${size.panelWidth} m wide, on a ${size.length} m boom: tube rows, ribs, hinge knuckles and a lit tip.`,
    mass: size.mass,
    propellant: 0,
    length: size.length,
    width: size.folded ? size.panelWidth : reach,
    depth: size.folded ? size.panelWidth : size.panelWidth / 8,
    ...NO_COLLAR,
    ports: [],
    ancestor: "the International Space Station's photovoltaic radiators and the Shuttle's radiator panels: deployed flat panels of coolant tubes on a boom",
    inside: false,
    livery: "industrial",
    pieces: (options: ModuleOptions = {}) => {
      const made = size.folded ? stowedPieces({ width: size.panelWidth, length: size.length }) : wingPieces({ ...size, root }, size.side ?? 1, solidRng(seedOf(`${options.seed ?? ""}/${id}`)));
      return options.level === "coarse" ? made.filter(isCoarse) : made;
    },
  };
}

/**
 * One part for each deck of a heavy habitat ring, each showing only the inside of its deck, so a viewer can show a deck alone. The ring's cutaway has all three together.
 *
 * @param size The ring's size, as `SIZED.habitatRing` takes it.
 * @param names What each of the three decks is called, from the outside in.
 * @param seed The seed of the generator each deck builds with. Left out: from the ring's id.
 * @returns Three modules, `<ring id>-deck-1` to `-3`, each with its inside pieces only.
 * @example
 * ```ts
 * import { ringDecks } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const decks = ringDecks({ major: 60, tube: 12, mass: 5000 }, ["homes", "streets", "parks"]);
 * console.log(decks.map((deck) => deck.name));
 * ```
 */
export function ringDecks(size: RingSize, names: readonly [string, string, string] = ["deck 1", "deck 2", "deck 3"], seed?: number): KitModule[] {
  checkRing(size.major, size.tube);
  const base = size.id ?? `ring-${size.major}x${size.tube}`;
  return names.map((name, i): KitModule => ({
    id: `${base}-deck-${i + 1}`,
    name: `${size.name ?? `Habitat ring, ${size.major} m radius`}, deck ${i + 1} (${name}), inside`,
    kind: "habitat",
    note: `Deck ${i + 1} of the ring (${name}): its floor, blocks, parks and lamp strip, shown on its own.`,
    mass: 0,
    propellant: 0,
    length: size.tube,
    width: 2 * (size.major + size.tube / 2),
    depth: 2 * (size.major + size.tube / 2),
    ports: [],
    ancestor: "the Stanford torus: a floor, blocks and parks on the inside of a ring",
    inside: true,
    livery: "industrial",
    pieces: (options: ModuleOptions = {}) => {
      const made = ringInsidePieces(size, 0, i, solidRng(seed ?? seedOf(`${options.seed ?? ""}/${base}/${i}`)));
      return options.level === "coarse" ? made.filter(isCoarse) : made;
    },
  }));
}

/**
 * The resizable kit parts: each takes its size in metres and returns a `KitModule`. A size outside the part's limits throws a RangeError that names the limit.
 *
 * @example
 * ```ts
 * import { SIZED } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const box = SIZED.container({ across: 22, long: 40, mass: 900 });
 * console.log(box.name, box.length, box.pieces({ level: "coarse" }).length);
 * ```
 */
export const SIZED = { container, tank, habitatRing, trussSpine, radiatorWing } as const;

/** The limits of each resizable part, in metres, as a ship's table can read them. */
export const SIZED_LIMITS = { container: CONTAINER_LIMITS, tank: TANK_LIMITS, habitatRing: RING_LIMITS, trussSpine: TRUSS_LIMITS, radiatorWing: WING_LIMITS } as const;
