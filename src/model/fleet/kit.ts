// The fleet module kit. Every ship of the fleet is a list of modules on a spine, built from the modules here: engine assemblies, thruster pods, fuel tanks, cargo containers and bays, habitat rings and drums,
// laboratories, sensor masts, reactors, radiator arrays, docking nodes, trusses, adapters and a forward shield. Each module has its name, mass and size in metres and the standard docking collars at its ends;
// each is built from the detail kit, so no surface is bare. `docs/fleet/kit.md` has the interfaces. Pure: no three.js and no DOM.
import type { Figure } from "../../data/types.ts";
import { blank } from "../../data/types.ts";
import type { PartKind, PartRecord } from "../../parts.ts";
import type { Piece, Vec3 } from "../pieces.ts";
import { COLLARS, mates } from "./collars.ts";
import { beam, place, rod } from "./detail.ts";
import { isCoarse } from "./levels.ts";
import { type PartMesh, meshOf } from "../pieces.ts";
import { INSETS } from "./insets.ts";
import { KIT } from "./modules.ts";
import type { KitModule, ModuleOptions, ShipList, ShipPlace } from "./types.ts";

export { COLLARS, COLLAR_CLASSES, collar, mates } from "./collars.ts";
export type { CollarClass, CollarSpec } from "./collars.ts";
export * as DETAIL from "./detail.ts";
export { LIVERY } from "./detail.ts";
export { FLEET_PALETTE } from "./palette.ts";
export type { FleetColour } from "./palette.ts";
export type { Livery, LiveryName } from "./detail.ts";
export { BUILDERS, KIT } from "./modules.ts";
export { BUILD_BUDGET_MS, isCoarse } from "./levels.ts";
export { INSETS } from "./insets.ts";
export type { Inset, InsetPart } from "./insets.ts";
export type { KitModule, ModuleKind, ModuleOptions, Port, ShipList, ShipPlace } from "./types.ts";

/**
 * One module placed on a ship: where its origin stands and how it is turned.
 *
 * @example
 * ```ts
 * import { assemble, type Placed } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const placed: Placed[] = assemble([{ module: "engine-fusion-3" }, { module: "tank-cryo-12" }]).placed;
 * console.log(placed.map((one) => one.at[1]));
 * ```
 */
export interface Placed {
  index: number;
  module: KitModule;
  at: Vec3;
  turn: number;
  /** How it is held: on the spine, hung from a port, or beside the spine. */
  how: "spine" | "port" | "beside";
}

/**
 * What went wrong with a ship: which place, and why.
 *
 * @example
 * ```ts
 * import { assemble, type ShipIssue } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const issues: ShipIssue[] = assemble([{ module: "engine-fusion-7" }, { module: "container-12" }]).issues;
 * console.log(issues[0]?.code, issues[0]?.message);
 * ```
 */
export interface ShipIssue {
  place: number;
  code: "unknown-module" | "collar-mismatch" | "no-such-port" | "port-taken" | "no-spine";
  message: string;
}

/**
 * A ship put together: its places, its mass and size, and the problems found.
 *
 * @example
 * ```ts
 * import { assemble, type Assembly } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ship: Assembly = assemble([{ module: "engine-fusion-3" }, { module: "tank-cryo-12" }]);
 * console.log(ship.ok, ship.placed.length, ship.mass);
 * ```
 */
export interface Assembly {
  placed: Placed[];
  issues: ShipIssue[];
  /** Dry mass in tonnes, propellant when full in tonnes. */
  mass: number;
  propellant: number;
  /** Metres: the box the placed modules fill (from their declared sizes). */
  length: number;
  width: number;
  depth: number;
  ok: boolean;
}

/**
 * Puts a ship's list of modules in place and checks that every joint mates. On the spine each module stands on the end of the one before; hung from a port it stands on that port of an earlier place;
 * `beside` it stands parallel to the spine at an offset.
 *
 * @param ship A ship's list of places, the bottom of the spine first.
 * @returns Where each module stands, the ship's mass and size, and any problem (a collar of the wrong class, an unknown module, a port that is not there or is taken).
 * @example
 * ```ts
 * import { assemble } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ship = assemble([{ module: "engine-fusion-7" }, { module: "tank-cryo-12" }]);
 * console.log(ship.ok, ship.length, ship.mass);
 * ```
 */
export function assemble(ship: ShipList): Assembly {
  const placed: Placed[] = [];
  const issues: ShipIssue[] = [];
  const taken = new Set<string>();
  let cursor = 0;
  let last: KitModule | undefined;
  let mass = 0;
  let propellant = 0;
  let length = 0;
  let width = 0;
  let depth = 0;
  ship.forEach((spot, index) => {
    const module = KIT[spot.module];
    if (!module) {
      issues.push({ place: index, code: "unknown-module", message: `There is no module "${spot.module}".` });
      return;
    }
    let at: Vec3 = [0, cursor, 0];
    let how: Placed["how"] = "spine";
    if (spot.on) {
      how = "port";
      const parent = placed.find((p) => p.index === spot.on?.place);
      const port = parent?.module.ports.find((one) => one.id === spot.on?.port);
      if (!parent || !port) issues.push({ place: index, code: "no-such-port", message: `Place ${spot.on.place} has no port "${spot.on.port}".` });
      else {
        const key = `${parent.index}/${port.id}`;
        if (taken.has(key)) issues.push({ place: index, code: "port-taken", message: `Port ${key} already holds a module.` });
        taken.add(key);
        if (!mates(port.collar, module.bottom)) issues.push({ place: index, code: "collar-mismatch", message: `${module.name} stands on a ${module.bottom ?? "no"} collar; the port is ${port.collar}.` });
        at = [parent.at[0] + port.at[0], parent.at[1] + port.at[1], parent.at[2] + port.at[2]];
      }
    } else if (spot.beside) {
      how = "beside";
      at = [spot.beside.x, spot.beside.y ?? Math.max(0, cursor - module.length), spot.beside.z];
    } else {
      if (last && !mates(last.top, module.bottom)) issues.push({ place: index, code: "collar-mismatch", message: last.top ? `${last.name} ends in a ${last.top} collar and ${module.name} starts with ${module.bottom ? `a ${module.bottom}` : "none"}.` : `${last.name} has no collar on its top: nothing stands on it.` });
      if (!last && module.bottom === undefined && index > 0) issues.push({ place: index, code: "no-spine", message: `${module.name} has no bottom collar.` });
      cursor += module.length;
      last = module;
    }
    placed.push({ index, module, at, turn: spot.turn ?? 0, how });
    mass += module.mass;
    propellant += module.propellant;
    length = Math.max(length, at[1] + module.length);
    width = Math.max(width, 2 * Math.abs(at[0]) + module.width);
    depth = Math.max(depth, 2 * Math.abs(at[2]) + module.depth);
  });
  return { placed, issues, mass, propellant, length, width, depth, ok: issues.length === 0 };
}

/**
 * The pieces of a whole ship: every module in its place, with clamps from the spine to the modules hung beside it. A ship's mesh is these pieces.
 *
 * @param ship A ship's list of places.
 * @param options What to draw, for every module. `detail` is lowered for a ship of many modules.
 * @returns The pieces, in metres, the bottom of the spine at y = 0.
 * @example
 * ```ts
 * import { shipPieces } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pieces = shipPieces([{ module: "tank-cryo-12" }], { detail: 0.5 });
 * console.log(pieces.length > 100);
 * ```
 */
export function shipPieces(ship: ShipList, options: ModuleOptions = {}): Piece[] {
  const { placed } = assemble(ship);
  const out: Piece[] = [];
  for (const p of placed) {
    const spot = ship[p.index];
    out.push(...place(p.module.pieces({ ...options, seed: spot.seed ?? `${options.seed ?? ""}${p.index}` }), { at: p.at, yaw: p.turn }));
    if (p.how !== "spine") out.push(...clamps(p));
  }
  return out;
}

/** Clamps from a hung module to the axis: a ring of struts at three heights. */
function clamps(p: Placed): Piece[] {
  const out: Piece[] = [];
  const d = Math.hypot(p.at[0], p.at[2]);
  if (d < 0.5) return out;
  const dir: Vec3 = [p.at[0] / d, 0, p.at[2] / d];
  const r = p.module.width / 2;
  for (const f of [0.12, 0.5, 0.88]) {
    const y = p.at[1] + p.module.length * f;
    const a: Vec3 = [p.at[0] - dir[0] * r, y, p.at[2] - dir[2] * r];
    const b: Vec3 = [dir[0] * Math.max(0.5, d - r - 4), y, dir[2] * Math.max(0.5, d - r - 4)];
    out.push(beam("hull-grey-dark", a, b, 0.5, 0.35), rod("hazard", [a[0], y + 0.28, a[2]], [a[0] - dir[0] * 0.4, y + 0.28, a[2] - dir[2] * 0.4], 0.28, 8));
  }
  return out;
}

const KIND_OF: Readonly<Record<string, PartKind>> = { engine: "engine", thruster: "engine", tank: "tank", cargo: "module", habitat: "module", lab: "module", sensor: "module", reactor: "module", radiator: "module", node: "module", truss: "module", adapter: "adapter", shield: "module" };

const NOTE: Figure = blank("This package's own design, with no source.");

/** The record every part has, for a kit module. */
export function recordOf(module: KitModule, id = module.id, rocket = "fleet-kit"): PartRecord {
  return {
    id,
    kind: KIND_OF[module.kind],
    name: module.name,
    rocket,
    trueTo: [id],
    height: module.length,
    diameter: Math.max(module.width, module.depth),
    sourced: { height: NOTE, diameter: NOTE },
    joints: {
      ...(module.top ? { top: { kind: "stage" as const, y: module.length, diameter: COLLARS[module.top].outer } } : {}),
      ...(module.bottom ? { bottom: { kind: "stage" as const, y: 0, diameter: COLLARS[module.bottom].outer } } : {}),
    },
    painted: null,
    drawnFrom: `This package's own design, from real hardware (${module.ancestor}): ${module.note}`,
  };
}

/** A part entry's shape, as the registry has it. */
export interface KitEntry {
  record: PartRecord;
  pieces: () => Piece[];
}

/** Every module as a part of the registry, drawn at full detail, plus its cutaway where it has one. */
export function kitEntries(groupOf: (module: KitModule) => string): KitEntry[] {
  const out: KitEntry[] = [];
  for (const module of Object.values(KIT)) {
    const rocket = groupOf(module);
    out.push({ record: recordOf(module, module.id, rocket), pieces: () => module.pieces() });
    if (module.inside) out.push({ record: { ...recordOf(module, `${module.id}-cutaway`, rocket), name: `${module.name}, cutaway` }, pieces: () => module.pieces({ cutaway: true }) });
  }
  return out;
}

/**
 * What a ship hands the registry: one part for each place, with its record, so together, apart and one-part-alone work.
 *
 * @example
 * ```ts
 * import { shipParts, type ShipParts } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const parts: ShipParts = shipParts("demo", [{ module: "engine-fusion-3" }, { module: "tank-cryo-12" }]);
 * console.log(parts.slots, Object.keys(parts.partIds).length);
 * ```
 */
export interface ShipParts {
  entries: KitEntry[];
  slots: string[];
  partIds: Record<string, string>;
  assembly: Assembly;
}

/**
 * A ship's parts for the registry: one entry for each place, named `<ship>-<place>-<module>`, with a record that carries its joints and, for a module hung beside or on a port, where it stands.
 *
 * @param ship The ship's id, as its rocket and variant will name it.
 * @param list The ship's list of places.
 * @param options What to draw, for every module.
 * @param rocket The rocket the parts belong to. Left out: the ship's id.
 * @param variant The variant the parts are true for. Left out: the ship's id.
 * @returns The entries, the slot names in stacking order, the slot-to-part ids, and the assembly.
 * @example
 * ```ts
 * import { shipParts } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const parts = shipParts("demo", [{ module: "engine-fusion-3" }, { module: "tank-cryo-12" }]);
 * console.log(parts.slots, parts.assembly.ok);
 * ```
 */
export function shipParts(ship: string, list: ShipList, options: ModuleOptions = {}, rocket = ship, variant = ship): ShipParts {
  const assembly = assemble(list);
  const entries: KitEntry[] = [];
  const slots: string[] = [];
  const partIds: Record<string, string> = {};
  for (const p of assembly.placed) {
    const spot: ShipPlace = list[p.index];
    const slot = `${p.module.id}-${p.index + 1}`;
    const id = `${ship}-${slot}`;
    const base = recordOf(p.module, id);
    const record: PartRecord = { ...base, ...(p.how !== "spine" ? { strapOn: { x: p.at[0], z: p.at[2], y: p.at[1] } } : {}), rocket, trueTo: [variant] };
    entries.push({ record, pieces: () => p.module.pieces({ ...options, seed: spot.seed ?? `${options.seed ?? ""}${p.index}` }) });
    slots.push(slot);
    partIds[slot] = id;
  }
  return { entries, slots, partIds, assembly };
}

/**
 * The kit's sample ships: three lists of modules, from a hauler with parallel cargo to a short scout and a bulwark with a shield. Each is a good ship list to copy.
 *
 * @example
 * ```ts
 * import { assemble, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(assemble(SAMPLE_SHIPS.hauler).length);
 * ```
 */
export const SAMPLE_SHIPS: Readonly<Record<string, ShipList>> = {
  hauler: [
    { module: "engine-fusion-7" },
    { module: "tank-cryo-24" },
    { module: "reactor-fusion" },
    { module: "cargo-bay-4" },
    { module: "container-12", on: { place: 3, port: "bay1" } },
    { module: "container-12-cold", on: { place: 3, port: "bay2" } },
    { module: "container-12", on: { place: 3, port: "bay3" } },
    { module: "container-12", on: { place: 3, port: "bay4" } },
    { module: "habitat-drum-large" },
    { module: "adapter-l-m" },
    { module: "common-area-m" },
    { module: "habitat-ring-16" },
    { module: "eva-lock-m" },
    { module: "pod-survey-m" },
    { module: "lab-m" },
    { module: "deck-nav-m" },
    { module: "mast-sensor-40" },
  ],
  scout: [{ module: "engine-fusion-3" }, { module: "tank-cryo-12" }, { module: "reactor-fusion" }, { module: "adapter-l-m" }, { module: "tank-header-9" }, { module: "habitat-ring-16" }, { module: "pod-medical-m" }, { module: "lab-m" }, { module: "radiator-deployed" }, { module: "deck-nav-m" }, { module: "mast-sensor-40" }],
  bulwark: [{ module: "engine-fusion-4" }, { module: "reactor-fusion" }, { module: "truss-l-24" }, { module: "farm-drum" }, { module: "node-four" }, { module: "shield-forward" }],
};
/**
 * The modules that swap for a module: those that share its slot, with the same collars and the same length. A mission pod is one: the survey pod and the medical pod stand in the same place on a ship.
 *
 * @param id A module's id.
 * @returns The other modules of its slot, or none for a module with no slot.
 * @example
 * ```ts
 * import { swapsFor } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(swapsFor("pod-survey-m").map((module) => module.name));
 * ```
 */
export function swapsFor(id: string): KitModule[] {
  const own = KIT[id];
  if (!own?.slot) return [];
  return Object.values(KIT).filter((one) => one.id !== id && one.slot === own.slot && one.top === own.top && one.bottom === own.bottom && one.length === own.length);
}

/** The registry's entries for the system insets: one part for each numbered sub-part, placed in its inset's assembly. */
export function insetEntries(): KitEntry[] {
  return Object.values(INSETS).flatMap((inset) =>
    inset.parts.map((one) => ({
      record: {
        id: `inset-${inset.id}-${one.n}`,
        kind: "module" as const,
        name: `${one.n}. ${one.name}`,
        rocket: "fleet-insets",
        trueTo: [inset.id],
        height: one.size[1],
        diameter: Math.max(one.size[0], one.size[2]),
        sourced: { height: NOTE, diameter: NOTE },
        joints: {},
        strapOn: { x: one.at[0], z: one.at[2], y: one.at[1] },
        painted: null,
        drawnFrom: `This package's own design: ${one.does}`,
      },
      pieces: one.pieces,
    })),
  );
}

/**
 * The maker of every ship of the fleet, as the maker field says it: SPX, short. A ship's designation starts with `SPX-` (`designation("03")` is "SPX-03"). Only this text: no logo or wordmark is drawn on any hull.
 *
 * @example
 * ```ts
 * import { FLEET_MAKER } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_MAKER);
 * ```
 */
export const FLEET_MAKER = "SPX";

/**
 * A fleet ship's designation: `SPX-` and its code, such as "02" or "KIT-H". It throws for a code that is empty or has anything but capitals, digits and hyphens.
 *
 * @param code The class code and number, such as "03".
 * @returns The designation, such as "SPX-03".
 * @example
 * ```ts
 * import { designation } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(designation("02"));
 * ```
 */
export function designation(code: string): string {
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(code)) throw new Error(`"${code}" is not a designation code.`);
  return `SPX-${code}`;
}

/**
 * A ship in two passes: the coarse pieces of every module at once, for a first picture, and the fine pass as one batch of pieces for each module, nearest first if `order` says so. Adding the batches one after another
 * gives the same ship as `shipPieces` at the fine level; a viewer adds one a frame, so the picture never waits for the detail.
 *
 * @param ship The ship's list.
 * @param options What to draw, for every module.
 * @param order The places in the order the fine pass should take them. Left out: the order of the list.
 * @returns The coarse pieces, and a function that yields the fine batches.
 * @example
 * ```ts
 * import { SAMPLE_SHIPS, shipLevels } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const { coarse, fine } = shipLevels(SAMPLE_SHIPS.scout);
 * console.log(coarse.length, [...fine()].length);
 * ```
 */
export function shipLevels(ship: ShipList, options: ModuleOptions = {}, order?: readonly number[]): { coarse: Piece[]; fine: () => Generator<{ place: number; pieces: Piece[] }> } {
  const { placed } = assemble(ship);
  const coarse = shipPieces(ship, { ...options, level: "coarse" });
  const sequence = order ? order.map((i) => placed.find((p) => p.index === i)).filter((p): p is Placed => p !== undefined) : placed;
  return {
    coarse,
    *fine() {
      for (const p of sequence) {
        const spot = ship[p.index];
        const own = p.module.pieces({ ...options, level: "fine", seed: spot.seed ?? `${options.seed ?? ""}${p.index}` }).filter((piece) => !isCoarse(piece));
        yield { place: p.index, pieces: place(own, { at: p.at, yaw: p.turn }) };
      }
    },
  };
}

/**
 * How long a build took, and what it made.
 *
 * @example
 * ```ts
 * import { SAMPLE_SHIPS, timeBuild, type BuildTime } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const took: BuildTime = timeBuild(SAMPLE_SHIPS.scout, "coarse");
 * console.log(took.level, took.ms < 1000, took.pieces);
 * ```
 */
export interface BuildTime {
  level: "coarse" | "fine";
  /** Milliseconds for the pieces of the whole ship and their mesh. */
  ms: number;
  pieces: number;
  triangles: number;
}

/**
 * Builds a ship at a level and times it: the pieces of every module and then the mesh the viewer would be handed. The budget for it is `BUILD_BUDGET_MS`.
 *
 * @param ship The ship's list.
 * @param level `coarse` or `fine`.
 * @param options What to draw, for every module.
 * @returns The milliseconds, the number of pieces and of triangles.
 * @example
 * ```ts
 * import { SAMPLE_SHIPS, timeBuild } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const coarse = timeBuild(SAMPLE_SHIPS.scout, "coarse");
 * console.log(coarse.ms < 1000, coarse.pieces, coarse.triangles);
 * ```
 */
export function timeBuild(ship: ShipList, level: "coarse" | "fine", options: ModuleOptions = {}): BuildTime {
  const start = performance.now();
  const pieces = shipPieces(ship, { ...options, level });
  const mesh: PartMesh = meshOf(pieces);
  let triangles = 0;
  for (const faces of mesh.faces.values()) triangles += faces.indices.length / 3;
  return { level, ms: performance.now() - start, pieces: pieces.length, triangles };
}
