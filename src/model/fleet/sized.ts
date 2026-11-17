// The resizable kit parts: modules whose size in metres is the input. A ship that needs a 22 m container, an 80 m tank or a 165 m ring asks for one here and gets a normal `KitModule` (a name, a mass, a size, `pieces(options)`),
// drawn from the same numbers and the same detail as the ship that first needed it. A size outside a part's limits throws a RangeError that names the limit. The standard modules in `modules.ts` are not touched. Pure: no three.js and no DOM.
import { type CollarClass } from "./collars.ts";
import { checkContainer, containerPieces, CONTAINER_LIMITS } from "./heavy/container.ts";
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
export const SIZED = { container } as const;

/** The limits of each resizable part, in metres, as a ship's table can read them. */
export const SIZED_LIMITS = { container: CONTAINER_LIMITS } as const;
