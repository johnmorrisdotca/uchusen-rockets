// The kit's small vocabulary: what a module is, what a port is, what a ship is made of. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../pieces.ts";
import type { CollarClass } from "./collars.ts";
import type { LiveryName } from "./detail.ts";
import type { HullStackName } from "./layers.ts";

/**
 * What a module is for. Ships are picked from these, and the viewer groups by them.
 *
 * @example
 * ```ts
 * import type { ModuleKind } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kind: ModuleKind = "tank";
 * console.log(kind);
 * ```
 */
export type ModuleKind = "engine" | "thruster" | "tank" | "cargo" | "habitat" | "lab" | "sensor" | "reactor" | "radiator" | "node" | "truss" | "adapter" | "shield";

/**
 * A mounting port on a module, off the spine: a collar that faces up (parallel to the spine), where another module of the same collar class can stand with its bottom on it. `at` is the middle of the
 * port's face in the module's own metres. A tank farm, a cargo cradle and a docking node have them; they are how ships get strapped-on tanks, side pods and parallel cargo.
 *
 * @example
 * ```ts
 * import { KIT, type Port } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ports: readonly Port[] = KIT["node-four"]?.ports ?? [];
 * console.log(ports.map((port) => port.id));
 * ```
 */
export interface Port {
  id: string;
  collar: CollarClass;
  at: Vec3;
}

/**
 * What a module draws with: how much small detail, whether to open the hull, a different colour scheme, a seed for the weathering.
 *
 * @example
 * ```ts
 * import { KIT, type ModuleOptions } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const options: ModuleOptions = { detail: 0.5, cutaway: true };
 * console.log(KIT["tank-cryo-12"].pieces(options).length);
 * ```
 */
export interface ModuleOptions {
  /** How much small detail, 0.25 to 1: a ship of many modules lowers it so its mesh stays small. Left out: 1. */
  detail?: number;
  /** Open the hull on the windward side and show the inside, for the modules that have one. */
  cutaway?: boolean;
  /** A different colour scheme. */
  livery?: LiveryName;
  /** The hull layers a cutaway shows: a role's stack from `HULL_STACKS`. Left out: the module's own. */
  hull?: HullStackName;
  /** Which of several of the same module this is, so the weathering differs. */
  seed?: string;
  /** Where a cutaway opens, in degrees round the spine from +Z towards +X: 0 opens on +Z (the default), 90 on +X, 180 on -Z. A ship whose own axes differ turns it to face its own camera. */
  cutYaw?: number;
  /** `coarse` builds the hull, the collars and the big shapes only: a first picture in a moment. `fine` (the default) adds all the detail; the detail pass of a ship is `fineOnly`. */
  level?: "coarse" | "fine";
}

/**
 * One module of the kit: its name, mass and size in metres, the collars at its ends, the ports on its side, and how to draw it. The origin is the middle of its base on the spine, Y up the spine, and the
 * module stands from y = 0 to y = `length`.
 *
 * @example
 * ```ts
 * import { KIT } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const tank = KIT["tank-cryo-12"];
 * console.log(tank.name, tank.mass, tank.length, tank.width);
 * ```
 */
export interface KitModule {
  id: string;
  name: string;
  kind: ModuleKind;
  /** What it is, in a line a catalogue could print. */
  note: string;
  /** Dry mass in tonnes. */
  mass: number;
  /** Propellant it holds when full, in tonnes; 0 for a module with none. */
  propellant: number;
  /** Metres along the spine (Y). */
  length: number;
  /** Metres across its widest reach in X and in Z. */
  width: number;
  depth: number;
  /** The collar on its top (the end the spine continues to) and on its bottom. A module with neither is not on a spine: it hangs from a port. */
  top?: CollarClass;
  bottom?: CollarClass;
  /** Ports on its side. */
  ports: readonly Port[];
  /** The real hardware it descends from, in a line a reader can look up. */
  ancestor: string;
  /** Whether it has an inside to show. */
  inside: boolean;
  /** A slot name shared by modules that swap for one another: the same collars, the same size. */
  slot?: string;
  livery: LiveryName;
  /** The pieces, in metres. */
  pieces: (options?: ModuleOptions) => Piece[];
}

/**
 * One place on a ship: a module by id. On the spine it stands on the end of the one before. Hung from a port it stands on that port of an earlier place. Hung `beside` it stands parallel to the spine
 * at an offset, held by clamps.
 *
 * @example
 * ```ts
 * import type { ShipPlace } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const place: ShipPlace = { module: "tank-cryo-12" };
 * console.log(place);
 * ```
 */
export interface ShipPlace {
  /** A module's id in `KIT`. */
  module: string;
  /** Hung from a port of an earlier place (its index in the list) instead of standing on the spine. */
  on?: { place: number; port: string };
  /** Hung beside the spine, parallel to it: its axis is at (x, z) and its base at height y (left out: where the spine has got to). */
  beside?: { x: number; z: number; y?: number };
  /** Degrees to turn it about its own axis before it is placed. */
  turn?: number;
  /** A different seed for this one, so its weathering differs. */
  seed?: string;
}

/**
 * A ship as the kit sees it: a list of modules, bottom of the spine first.
 *
 * @example
 * ```ts
 * import { assemble, type ShipList } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ship: ShipList = [{ module: "engine-fusion-1" }, { module: "tank-cryo-12" }];
 * console.log(assemble(ship).length);
 * ```
 */
export type ShipList = readonly ShipPlace[];
