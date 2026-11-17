// The resizable kit parts: modules whose size in metres is the input. A ship that needs a 22 m container, an 80 m tank or a 165 m ring asks for one here and gets a normal `KitModule` (a name, a mass, a size, `pieces(options)`),
// drawn from the same numbers and the same detail as the ship that first needed it. A size outside a part's limits throws a RangeError that names the limit. The standard modules in `modules.ts` are not touched. Pure: no three.js and no DOM.
import { type CollarClass } from "./collars.ts";
import { checkContainer, containerPieces, CONTAINER_LIMITS } from "./heavy/container.ts";
import { checkTank, tankInsidePieces, tankPieces, TANK_LIMITS, type TankBrace } from "./heavy/tank.ts";
import { isCoarse } from "./levels.ts";
import { rng as solidRng } from "./solids.ts";
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
export const SIZED = { container, tank } as const;

/** The limits of each resizable part, in metres, as a ship's table can read them. */
export const SIZED_LIMITS = { container: CONTAINER_LIMITS, tank: TANK_LIMITS } as const;
