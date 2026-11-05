// What the fleet paints on its hulls: the public lettering (a ship's prefix, name and registry, the class, the operator), the small numbers (docking ports, hangars, decks) and the stencils, all made with `marking`.
// A ship's builder calls `nameplate`, `portMarker`, `hangarNumber`, `deckNumber` and `noStep` with its own hull's radius and heights; the kit's sample hauler and a demonstration hull for each ship show them. Pure: no
// three.js and no DOM.
import type { PartRecord } from "../../parts.ts";
import type { MaterialName } from "../materials.ts";
import type { Piece, Vec3 } from "../pieces.ts";
import { radiusAt } from "../pieces.ts";
import { place } from "./detail.ts";
import { contextOf, drum } from "./hull.ts";
import { type KitEntry, recordOf, SAMPLE_SHIPS, shipParts, type ShipParts } from "./kit.ts";
import { dockingMarking, FACES, type FaceName, hazardMarking, layoutOf, marking, type MarkingPlace, type MarkingStyle, markingWidth, type RoundPlace, stripeMarking } from "./marking.ts";
import { KIT } from "./modules.ts";
import { FLEET_OPERATOR } from "./glossary.ts";
import type { CollarClass } from "./collars.ts";
import { TANK } from "./ship-02/dims.ts";
import { tank } from "./ship-02/tanks.ts";
import { habitat } from "./ship-03/habitat.ts";

/**
 * One ship's public lettering. `registry` is null where John has not given the number yet: the hull then shows a placeholder.
 *
 * @example
 * ```ts
 * import { FLEET_MARKS, type ShipMarks } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kaminari: ShipMarks = FLEET_MARKS.ships.kaminari;
 * console.log(kaminari.name, kaminari.registry);
 * ```
 */
export interface ShipMarks {
  id: string;
  prefix: string;
  name: string;
  kanji: string;
  /** The registry, `SPX-` and a number, or null while there is none. */
  registry: string | null;
  /** The class written on the hull, or null. */
  classLine: { latin: string; kanji: string } | null;
}

/** The text a hull with no registry number shows until there is one. */
export const REGISTRY_PLACEHOLDER = "SPX-???";

/**
 * The words the fleet paints: the prefix ISV, each ship's name in capitals with its kanji, its registry and its class, and the operator's name, which is just SPX. These are the only words on a hull besides numbers and
 * stencils.
 *
 * @example
 * ```ts
 * import { FLEET_MARKS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.values(FLEET_MARKS.ships).map((ship) => `${ship.prefix} ${ship.name} ${ship.registry ?? "-"}`));
 * ```
 */
export const FLEET_MARKS: { operator: string; ships: Readonly<Record<string, ShipMarks>> } = {
  operator: FLEET_OPERATOR,
  ships: {
    kaminari: { id: "kaminari", prefix: "ISV", name: "KAMINARI", kanji: "加美鳴", registry: "SPX-207", classLine: null },
    miyamoto: { id: "miyamoto", prefix: "ISV", name: "MIYAMOTO", kanji: "宮本", registry: "SPX-452", classLine: { latin: "ROMURUSU CLASS", kanji: "ロムルス級" } },
    ariake: { id: "ariake", prefix: "ISV", name: "ARIAKE", kanji: "有明", registry: "SPX-186", classLine: { latin: "ROMURUSU CLASS", kanji: "ロムルス級" } },
    hanabusa: { id: "hanabusa", prefix: "ISV", name: "HANABUSA", kanji: "花房", registry: null, classLine: null },
  },
};

/** The same place moved `by` metres towards the bottom of the letters (a line below, for a registry under a name). */
export function lower(place: MarkingPlace, by: number): MarkingPlace {
  if ("at" in place) return { ...place, at: [place.at[0] - place.up[0] * by, place.at[1] - place.up[1] * by, place.at[2] - place.up[2] * by] };
  const run = place.run ?? "around";
  const r = typeof place.radius === "number" ? place.radius : place.radius(place.y);
  if (run === "around") return { ...place, y: place.y - by };
  return { ...place, az: place.az + (run === "up" ? by : -by) / r };
}

/** The text that fits `width` metres: the cap height at which it is just that wide, never above `most`. */
export function heightFor(text: string, width: number, most: number, style: MarkingStyle = {}): number {
  return Math.min(most, width / markingWidth(text, 1, style));
}

/**
 * A ship's name plate: the prefix and name on one line and the registry on a line below, both in the face the fleet uses, on one flank. The name line is `place`; the registry
 * goes `1.7` capital heights lower.
 *
 * @param ship The ship's lettering from `FLEET_MARKS`.
 * @param place Where the name line goes.
 * @param style The paint and details for both lines.
 * @returns The pieces.
 * @example
 * ```ts
 * import { FLEET_MARKS, nameplate } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pieces = nameplate(FLEET_MARKS.ships.miyamoto, { radius: 8, y: 20, az: Math.PI / 2, height: 1.4, run: "up", align: "middle" }, { field: "hull-white", flood: true });
 * console.log(pieces.length > 100);
 * ```
 */
export function nameplate(ship: ShipMarks, place: MarkingPlace, style: MarkingStyle = {}): Piece[] {
  const line = `${ship.prefix} ${ship.name}`;
  const registry = ship.registry ?? REGISTRY_PLACEHOLDER;
  // the registry is a little smaller than the name, and both stand on the one backing plate
  const field = typeof style.field === "string" ? { material: style.field } : style.field;
  const drop = place.height * 1.7;
  const plate = field ? { ...field, below: drop } : undefined;
  return [...marking(line, place, { ...style, field: plate }), ...marking(registry, lower({ ...place, height: place.height * 0.8 }, drop), { ...style, field: undefined, flood: false, onField: field ? (field.raise ?? 0.3) : 0 })];
}

/**
 * The kanji of a ship's name, and its class beside it where it has one, in one formal place.
 *
 * @param ship The ship's lettering.
 * @param place Where the name goes; the class goes a line lower.
 * @param style The paint and details.
 * @returns The pieces.
 * @example
 * ```ts
 * import { FLEET_MARKS, kanjiPlate } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(kanjiPlate(FLEET_MARKS.ships.kaminari, { radius: 6, y: 20, az: 0, height: 1.2, align: "middle" }).length > 50);
 * ```
 */
export function kanjiPlate(ship: ShipMarks, place: MarkingPlace, style: MarkingStyle = {}): Piece[] {
  const field = typeof style.field === "string" ? { material: style.field } : style.field;
  const drop = place.height * 1.5;
  if (!ship.classLine) return marking(ship.kanji, place, style);
  return [...marking(ship.kanji, place, { ...style, field: field ? { ...field, below: drop } : undefined }), ...marking(ship.classLine.kanji, lower({ ...place, height: place.height * 0.6 }, drop), { ...style, field: undefined, flood: false, onField: field ? (field.raise ?? 0.3) : 0 })];
}

/**
 * A docking port's marker: a ring with four ticks and the number in the middle, painted round the port so a ship lines up on it.
 *
 * @param n The port's number.
 * @param place Where; `height` is the ring's diameter.
 * @param style The paint and details.
 * @returns The pieces.
 * @example
 * ```ts
 * import { portMarker } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(portMarker(2, { radius: 6, y: 4, az: 0, height: 2.4 }).length > 20);
 * ```
 */
export const portMarker = (n: number, place: MarkingPlace, style: MarkingStyle = {}): Piece[] => dockingMarking(`P${n}`, place, style);

/**
 * A hangar's number, in a painted box.
 *
 * @param n The hangar's number.
 * @param place Where; `height` is the figures' height.
 * @param style The paint and details.
 * @returns The pieces.
 * @example
 * ```ts
 * import { hangarNumber } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(hangarNumber(3, { at: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], height: 0.8 }).length > 20);
 * ```
 */
export const hangarNumber = (n: number, place: MarkingPlace, style: MarkingStyle = {}): Piece[] => marking(`HANGAR ${n}`, place, { frame: true, ...style });

/**
 * A deck number, for beside a hatch.
 *
 * @param n The deck's number.
 * @param place Where; `height` is the figures' height.
 * @param style The paint and details.
 * @returns The pieces.
 * @example
 * ```ts
 * import { deckNumber } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(deckNumber(7, { radius: 6, y: 9, az: 0.4, height: 0.5 }).length > 20);
 * ```
 */
export const deckNumber = (n: number, place: MarkingPlace, style: MarkingStyle = {}): Piece[] => marking(`DECK ${String(n).padStart(2, "0")}`, place, { frame: true, ...style });

/**
 * A "NO STEP" stencil, over a surface that will not take a person's weight.
 *
 * @param place Where; `height` is the letters' height.
 * @param style The paint and details.
 * @returns The pieces.
 * @example
 * ```ts
 * import { noStep } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(noStep({ at: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], height: 0.3 }).length > 20);
 * ```
 */
export const noStep = (place: MarkingPlace, style: MarkingStyle = {}): Piece[] => marking("NO STEP", place, { frame: true, ...style });

// ---------------------------------------------------------------------------------------------------------------------------------
// shown on the kit's sample hauler

/** The radius of a module's hull at a height: its round body, read from its own coarse pieces. */
export function hullRadius(pieces: readonly Piece[], y: number): number {
  let r = 0;
  for (const piece of pieces) if (piece.kind === "lathe" && piece.body && !piece.arc) r = Math.max(r, radiusAt(piece.profile, y));
  return r;
}

const FIELD = { material: "hull-white", raise: 0.55 } as const;
/** A dark plate, for the yellow of a docking marker to stand out on. */
const DARK = { material: "panel-dark", raise: 0.55 } as const;

/** A flat face of a box-like module: the wall at `x` or `z`, facing out, written on at height `y` and at `along` the other horizontal axis. */
function wall(face: "+x" | "-x" | "+z" | "-z", offset: number, along: number, y: number, height: number, align: "start" | "middle" | "end" = "middle"): MarkingPlace {
  const up: Vec3 = [0, 1, 0];
  if (face === "+x") return { at: [offset, y, along], right: [0, 0, -1], up, height, align };
  if (face === "-x") return { at: [-offset, y, along], right: [0, 0, 1], up, height, align };
  if (face === "+z") return { at: [along, y, offset], right: [1, 0, 0], up, height, align };
  return { at: [along, y, -offset], right: [-1, 0, 0], up, height, align };
}

/** The markings the hauler carries, by the module of each place (a place is an index of the ship's list). */
function haulerMarks(module: string, index: number): Piece[] {
  const own = KIT[module].pieces({ level: "coarse" });
  const R = hullRadius(own, KIT[module].length / 2);
  const out: Piece[] = [];
  const round = (az: number, y: number, height: number, run: RoundPlace["run"] = "around"): RoundPlace => ({ radius: R, y, az, height, align: "middle", run, sides: 56 });
  if (module === "tank-cryo-24") {
    const length = KIT[module].length;
    const h = heightFor("SPX-KIT-H", length * 0.6, 1.5);
    for (const az of [Math.PI / 2, (3 * Math.PI) / 2]) {
      out.push(...marking("SPX-KIT-H", round(az, length / 2, h, "up"), { field: FIELD, flood: true }));
    }
    out.push(...hazardMarking(round(0, length * 0.18, 0.7), 6));
    out.push(...marking("NO STEP", round(Math.PI, length * 0.3, 0.45), { frame: true, field: FIELD }));
  } else if (module === "habitat-drum-large") {
    const length = KIT[module].length;
    out.push(...deckNumber(7, round(0.5, length * 0.35, 0.6), { field: FIELD }));
    out.push(...deckNumber(8, round(0.5, length * 0.55, 0.6), { field: FIELD }));
    out.push(...hangarNumber(2, round(Math.PI, length * 0.5, 0.9), { field: FIELD }));
    out.push(...marking(FLEET_MARKS.operator, round(Math.PI / 2, length * 0.5, 1.6, "up"), { field: FIELD }));
  } else if (module === "common-area-m") {
    out.push(...portMarker(1, round(0, KIT[module].length * 0.5, 2.2), { field: DARK }));
    out.push(...portMarker(2, round(Math.PI, KIT[module].length * 0.5, 2.2), { field: DARK }));
  } else if (module === "eva-lock-m") {
    out.push(...marking("EVA 2", round(0, KIT[module].length * 0.5, 0.7), { frame: true, field: FIELD }));
  } else if (module === "deck-nav-m") {
    out.push(...deckNumber(1, round(0.3, KIT[module].length * 0.5, 0.6), { field: FIELD }));
  } else if (module === "container-12" || module === "container-12-cold") {
    const side = KIT[module].width / 2 - 0.05;
    const n = String(index - 3).padStart(2, "0");
    out.push(...marking(`C-${n}`, wall("+x", side, 0, 8.5, 0.9), { frame: true }));
    out.push(...hazardMarking(wall("+x", side, 0, 1.1, 0.5), 4));
    out.push(...noStep(wall("+x", side, 0, 5.5, 0.4)));
  }
  return out;
}

/** The modules of the hauler that carry lettering. */
const HAULER_MARKED: readonly string[] = ["tank-cryo-24", "habitat-drum-large", "common-area-m", "eva-lock-m", "deck-nav-m", "container-12", "container-12-cold"];

/**
 * The kit's sample hauler with its markings: the ship's number along both flanks of the long tank, hangar, deck and port numbers on the drums, container numbers and stencils on the boxes. The markings are one part of their own, laid over the hauler's modules, which are not changed. Its parts go to the registry as `fleet-markings-hauler-<slot>`.
 *
 * @returns The parts, as `shipParts` gives them for any ship, with one more for the lettering.
 * @example
 * ```ts
 * import { markedHauler } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(markedHauler().slots.length);
 * ```
 */
export function markedHauler(): ShipParts {
  const parts = shipParts("fleet-markings-hauler", SAMPLE_SHIPS.hauler, { detail: 0.25 }, "fleet-markings", "hauler");
  const id = "fleet-markings-hauler-markings";
  const record: PartRecord = { ...recordOf(KIT["lab-m"], id, "fleet-markings"), name: "Hull markings", trueTo: ["hauler"], height: parts.assembly.length, diameter: parts.assembly.width, joints: {}, strapOn: { x: 0, z: 0, y: 0 } };
  const pieces = (): Piece[] => parts.assembly.placed.filter((p) => HAULER_MARKED.includes(p.module.id)).flatMap((p) => place(haulerMarks(p.module.id, p.index), { at: p.at, yaw: p.turn }));
  parts.entries.push({ record, pieces });
  parts.slots.push("markings");
  parts.partIds.markings = id;
  return parts;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// shown on a demonstration hull for each ship

/** A demonstration hull's size: a drum with the ship's own typical radius, long enough to carry the whole set. */
const DEMO: Readonly<Record<string, { R: number; L: number; collar: CollarClass }>> = {
  kaminari: { R: 8, L: 30, collar: "L" },
  miyamoto: { R: 6, L: 26, collar: "L" },
  ariake: { R: 6, L: 26, collar: "L" },
  hanabusa: { R: 5, L: 24, collar: "M" },
};

/** The markings of a ship's demonstration hull: its name plate on both flanks, its kanji in one place, the operator's name, the port, hangar and deck numbers and the stencils. */
function demoMarks(ship: ShipMarks, R: number, L: number): Piece[] {
  const round = (az: number, y: number, height: number, run: RoundPlace["run"] = "around"): RoundPlace => ({ radius: R, y, az, height, align: "middle", run, sides: 56 });
  const nameHeight = heightFor(`${ship.prefix} ${ship.name}`, L * 0.62, R * 0.2);
  return [
    ...[Math.PI / 2, (3 * Math.PI) / 2].flatMap((az) => nameplate(ship, round(az, L * 0.52, nameHeight, "up"), { field: FIELD, flood: true })),
    ...kanjiPlate(ship, round(0, L * 0.7, R * 0.14), { field: FIELD, flood: true }),
    ...marking(FLEET_MARKS.operator, round(Math.PI, L * 0.7, R * 0.2), { field: FIELD }),
    ...[0, 1, 2, 3].flatMap((k) => portMarker(k + 1, round((k * Math.PI) / 2 + Math.PI / 4, L * 0.16, R * 0.28), { field: DARK })),
    ...hangarNumber(2, round(Math.PI, L * 0.45, R * 0.1), { field: FIELD }),
    ...[0, 1, 2].flatMap((k) => deckNumber(k + 3, round(0.55, L * (0.3 + k * 0.1), R * 0.07), { field: FIELD })),
    ...noStep(round((3 * Math.PI) / 4, L * 0.3, R * 0.06), { field: FIELD }),
    ...hazardMarking(round(Math.PI * 1.25, L * 0.3, R * 0.07), R * 0.7),
  ];
}

/**
 * A demonstration hull for one ship: a drum of the kit's own plating, with the ship's markings laid over it as a part of their own, to show the lettering at the distance a ship is seen from and close up. The ship's own
 * model is not touched: its builder places its own markings.
 *
 * @param id A ship in `FLEET_MARKS.ships`.
 * @returns The hull's part and the markings' part, for the registry.
 * @example
 * ```ts
 * import { demoHull } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(demoHull("kaminari").map((entry) => entry.record.name));
 * ```
 */
export function demoHull(id: string): KitEntry[] {
  const ship = FLEET_MARKS.ships[id];
  const size = DEMO[id];
  if (!ship || !size) throw new Error(`"${id}" is not a ship with markings.`);
  const partId = `fleet-markings-${id}`;
  const base: PartRecord = { ...recordOf(KIT["habitat-drum-large"], partId, "fleet-markings"), trueTo: [id], height: size.L, diameter: size.R * 2, joints: {} };
  const hull = (): Piece[] => drum(contextOf(partId, "transport", { detail: 0.25 }), { R: size.R, L: size.L, top: size.collar, bottom: size.collar, hatches: 2, conduits: 1, trays: 1, vents: 1, ladders: 1 });
  return [
    { record: { ...base, name: `${ship.prefix} ${ship.name} hull` }, pieces: hull },
    { record: { ...base, id: `${partId}-markings`, name: `${ship.prefix} ${ship.name} markings`, strapOn: { x: 0, z: 0, y: 0 } }, pieces: () => demoMarks(ship, size.R, size.L) },
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------------
// concepts: the registry large and the name smaller, on the real hulls, in each candidate face

/** The face the hulls are lettered in. Goldman Bold, used as drawn. */
export const CONCEPT_FACES: Readonly<Record<string, { face: FaceName; ink: "black" }>> = {
  goldman: { face: "goldman", ink: "black" },
};

/** The line of lettering the Kaminari concepts set. */
export const CONCEPT_TEXT = "SPX-207 KAMINARI";

/**
 * How a concept is painted: the face as drawn, a solid fill on a plain field, and lamps for the night view.
 *
 * @param id A face in `CONCEPT_FACES`.
 * @returns The paint, the face and the weight, which is none. The letters are a solid fill.
 * @example
 * ```ts
 * import { conceptStyle } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(conceptStyle("goldman").weight === 0);
 * ```
 */
export function conceptStyle(id: string): MarkingStyle {
  const concept = CONCEPT_FACES[id];
  if (!concept) throw new Error(`"${id}" is not a concept face.`);
  return { face: concept.face, ink: concept.ink, weight: 0, lift: 0.04, flood: true, lines: false };
}

/** The lock-up on one plain field of hull colour, so the plating under the letters is painted out, with the pinstripe on top of that field. */
function paintedLockup(registry: string, name: string, place: RoundPlace, style: MarkingStyle, raise: number): Piece[] {
  const painted: MarkingStyle = { ...style, field: { material: "hull-white", pad: 1.1, raise } };
  const out = lockup(registry, name, place, painted, undefined, 0.36);
  const width = markingWidth(registry, place.height, painted);
  const stripe = { ...lower(place, -(place.height / 2 + place.height * 0.16)), height: Math.max(0.3, place.height * 0.05) };
  out.push(...stripeMarking(stripe, width, "red", { onField: raise, lines: false }));
  return out;
}

/**
 * One concept on Kaminari's own No. 1 propellant tank: the registry is the large mark, tall enough to cross the tank's panels, with the name smaller above it and a pinstripe between, running along the outer face between the cradle rings.
 *
 * @param id A face in `CONCEPT_FACES`.
 * @returns The tank and the lettering, as two parts.
 * @example
 * ```ts
 * import { conceptHull } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(conceptHull("goldman").length === 2);
 * ```
 */
export function conceptHull(id: string): KitEntry[] {
  if (!CONCEPT_FACES[id]) throw new Error(`"${id}" is not a concept face.`);
  const partId = `fleet-markings-concept-${id}`;
  const base: PartRecord = { ...recordOf(KIT["tank-cryo-24"], partId, "fleet-markings"), trueTo: [`concept-${id}`], height: 440, diameter: TANK.radius * 2, joints: {} };
  // tank 1 stands outboard of the spine; its outer face is the opposite heading, where the blankets are and the feed manifold is not
  const toward = Math.atan2(-1, -1);
  const marks = (): Piece[] => {
    const style = conceptStyle(id);
    // 70 m keeps the registry and the whole name on the near face, inside the white band between the orange blankets
    const height = heightFor("SPX-207", 70, 10, style);
    const place: RoundPlace = { radius: TANK.radius + 1.2, y: 230, az: toward + Math.PI, height, run: "up", align: "middle", sides: 40 };
    return paintedLockup("SPX-207", "ISV KAMINARI", place, style, 1.1);
  };
  return [
    { record: { ...base, name: `Kaminari tank, ${id}` }, pieces: () => tank(toward, 2101, "T1", 1) },
    { record: { ...base, id: `${partId}-markings`, name: `Kaminari lettering, ${id}`, strapOn: { x: 0, z: 0, y: 0 } }, pieces: marks },
  ];
}

/**
 * The same arrangement on Miyamoto's own habitat drum. The registry runs along the drum between two columns of portholes, and it is the largest mark on that hull.
 *
 * @param id A face in `CONCEPT_FACES`.
 * @returns The habitat and the lettering, as two parts.
 * @example
 * ```ts
 * import { miyamotoHull } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(miyamotoHull("goldman").length === 2);
 * ```
 */
export function miyamotoHull(id: string): KitEntry[] {
  if (!CONCEPT_FACES[id]) throw new Error(`"${id}" is not a concept face.`);
  const partId = `fleet-markings-miyamoto-${id}`;
  const base: PartRecord = { ...recordOf(KIT["habitat-drum-large"], partId, "fleet-markings"), trueTo: [`miyamoto-${id}`], height: 302, diameter: 26, joints: {} };
  const marks = (): Piece[] => {
    const style = conceptStyle(id);
    // 36 m keeps the registry and the name on the 52 m drum
    const height = heightFor("SPX-452", 36, 6, style);
    const place: RoundPlace = { radius: 14.2, y: 276, az: 1.71, height, run: "up", align: "middle", sides: 56 };
    return paintedLockup("SPX-452", "MIYAMOTO", place, style, 0.7);
  };
  return [
    { record: { ...base, name: `Miyamoto habitat, ${id}` }, pieces: () => habitat(false) },
    { record: { ...base, id: `${partId}-markings`, name: `Miyamoto lettering, ${id}`, strapOn: { x: 0, z: 0, y: 0 } }, pieces: marks },
  ];
}

/** The extra letter-spacing, in capital heights, that sets `text` exactly `width` metres wide at a capital height: how a smaller line is justified to a larger one above or below it. */
export function trackingFor(text: string, height: number, width: number, face: FaceName = "michroma"): number {
  const n = [...text].length;
  if (n < 2) return FACES[face].tracking;
  const natural = layoutOf(text, 0, face).width * height;
  return Math.min(0.6, Math.max(0.04, (width - natural) / (height * (n - 1))));
}

/**
 * A lock-up of a big registry with the name set smaller above it, justified to its width, and an optional pinstripe between them: the arrangement of a ship's exterior marking. The registry's cap height is `place.height`
 * and its anchor is the middle of the lettering; the name stands `0.4` of that, a third of a registry height above.
 *
 * @param registry The big line, such as "SPX-207".
 * @param name The small line, such as "ISV KAMINARI".
 * @param place Where the registry goes.
 * @param style The face, paint and inline outline for both lines.
 * @param pinstripe A paint colour for a thin stripe between the two lines, as wide as the registry.
 * @param nameRatio The name's capital height as a share of the registry's; 0.4 by default.
 * @returns The pieces.
 * @example
 * ```ts
 * import { lockup } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pieces = lockup("SPX-207", "ISV KAMINARI", { radius: 40, y: 200, az: 0, height: 6, align: "middle" }, { face: "orbitron", inline: "hull-white" }, "red");
 * console.log(pieces.length > 100);
 * ```
 */
export function lockup(registry: string, name: string, place: MarkingPlace, style: MarkingStyle = {}, pinstripe?: MaterialName, nameRatio = 0.4): Piece[] {
  const face = style.face ?? "michroma";
  const H = place.height;
  const width = markingWidth(registry, H, style);
  const small = H * nameRatio;
  const gap = H * 0.32;
  const up = (by: number): MarkingPlace => lower(place, -by);
  const namePlace = { ...up(H / 2 + gap + small / 2), height: small };
  const out = [...marking(registry, place, style), ...marking(name, namePlace, { ...style, tracking: trackingFor(name, small, width, face) })];
  // the pinstripe runs in the gap between the two lines, the width of the registry
  if (pinstripe) out.push(...stripeMarking({ ...up(H / 2 + gap / 2), height: H * 0.05 }, width, pinstripe, style));
  return out;
}
