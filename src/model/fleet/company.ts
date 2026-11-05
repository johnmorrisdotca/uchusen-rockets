// Where each ship's crew lives and works. The numbers are that ship's own: a deck station from its section table, and a crew count from its specification. Nothing here is drawn.
import type { RoomKind } from "./detail.ts";
import { B } from "./kaminari-concepts/b.ts";
import { C } from "./kaminari-concepts/c.ts";
import { PEOPLE } from "./kaminari-concepts/specs.ts";
import { MASS, SECTIONS as HANABUSA } from "./ship-01/specs.ts";
import { DECKS, SPEC } from "./ship-02/specs.ts";
import { SECTIONS as MIYAMOTO, specification } from "./ship-03/specs.ts";

/**
 * The rooms every one of these ships has. A long voyage adds quarantine and a garden; an interstellar ship adds a storm shelter. These six are all three.
 *
 * @example
 * ```ts
 * import { COMPANY_KINDS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(COMPANY_KINDS.includes("bridge"));
 * ```
 */
export const COMPANY_KINDS = ["bridge", "cabin", "mess", "medical", "quarantine", "engineering", "lifesupport", "stores", "gym", "recreation", "garden", "airlock", "shelter"] as const satisfies readonly RoomKind[];

/**
 * Miyamoto, Ariake, Hanabusa, the shipped Kaminari, Emiake or Romaryū.
 *
 * @example
 * ```ts
 * import { companyOf, type CompanyShip } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ship: CompanyShip = "ariake";
 * console.log(companyOf(ship).crew > 0);
 * ```
 */
export type CompanyShip = "miyamoto" | "ariake" | "hanabusa" | "kaminari" | "emiake" | "romaryu";

/**
 * One room on a ship: what it is, which deck it stands on, where that deck is, and how many of the crew it is for.
 *
 * @example
 * ```ts
 * import { companyOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const bridge = companyOf("miyamoto").spaces.find((space) => space.kind === "bridge");
 * console.log(bridge?.deck, bridge?.serves);
 * ```
 */
export interface CrewSpace {
  kind: RoomKind;
  /** The name this ship uses for the room. */
  name: string;
  /** The deck it stands on, in that ship's own words. */
  deck: string;
  /** Metres from the ship's origin: across, along the length, and up. The length is the deck's own station. */
  at: readonly [number, number, number];
  /** How many of the crew this room is for. */
  serves: number;
}

/**
 * One ship's company: its crew, and every room they need.
 *
 * @example
 * ```ts
 * import { companyOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(companyOf("hanabusa").crew > 0);
 * ```
 */
export interface Company {
  ship: CompanyShip;
  /** The ship's nominal crew, from its own specification. */
  crew: number;
  spaces: readonly CrewSpace[];
}

const crewOfClass = (ship: "miyamoto" | "ariake"): number => {
  const line = specification(ship).find((row) => row.name === "Crew");
  const crew = Number(line?.value.split(" ")[0]);
  if (!Number.isFinite(crew)) throw new Error(`no crew for ${ship}`);
  return crew;
};

const sectionY = (rows: readonly { id: string; y0: number }[], id: string): number => {
  const row = rows.find((one) => one.id === id);
  if (!row) throw new Error(`no section ${id}`);
  return row.y0;
};

const deckY = (slot: string): number => {
  const row = DECKS.find((one) => one.slot === slot);
  if (!row) throw new Error(`no deck ${slot}`);
  return row.from;
};

interface Spot {
  kind: RoomKind;
  name: string;
  deck: string;
  y: number;
  x?: number;
}

const spaces = (crew: number, spots: readonly Spot[]): CrewSpace[] => spots.map((spot) => ({ kind: spot.kind, name: spot.name, deck: spot.deck, at: [spot.x ?? 0, spot.y, 0] as const, serves: crew }));

const classShip = (ship: "miyamoto" | "ariake"): Company => {
  const y = (id: string) => sectionY(MIYAMOTO, id);
  return {
    ship,
    crew: crewOfClass(ship),
    spaces: spaces(crewOfClass(ship), [
      { kind: "bridge", name: "Operations ring", deck: "Operations ring", y: y("ops-ring") },
      { kind: "cabin", name: "Crew quarters", deck: "Crew quarters", y: y("crew-quarters"), x: -4 },
      { kind: "cabin", name: "Resident quarters", deck: "Crew quarters", y: y("crew-quarters"), x: 4 },
      { kind: "mess", name: "Mess and galley", deck: "Crew quarters", y: y("crew-quarters"), x: 8 },
      { kind: "medical", name: "Medical bay", deck: "Medical link", y: y("medical-link") },
      { kind: "quarantine", name: "Quarantine", deck: "Medical link", y: y("medical-link"), x: 4 },
      { kind: "engineering", name: "Drive bay", deck: "Drive bay", y: y("drive-bay") },
      { kind: "lifesupport", name: "Life support", deck: "Crew quarters", y: y("crew-quarters"), x: -8 },
      { kind: "stores", name: "Stores", deck: "Survey bay", y: y("survey-bay"), x: 6 },
      { kind: "gym", name: "Exercise room", deck: "Crew quarters", y: y("crew-quarters"), x: 12 },
      { kind: "recreation", name: "Recreation room", deck: "Crew quarters", y: y("crew-quarters"), x: -12 },
      { kind: "garden", name: "Green room", deck: "Crew quarters", y: y("crew-quarters"), x: 16 },
      { kind: "airlock", name: "Suit room", deck: "Survey bay", y: y("survey-bay") },
      { kind: "shelter", name: "Storm shelter", deck: "Crew quarters", y: y("crew-quarters"), x: -16 },
    ]),
  };
};

const hanabusa = (): Company => {
  const y = (id: string) => sectionY(HANABUSA, id);
  return {
    ship: "hanabusa",
    crew: MASS.crew,
    spaces: spaces(MASS.crew, [
      { kind: "bridge", name: "Navigation deck", deck: "Navigation deck", y: y("nav-deck") },
      { kind: "cabin", name: "Crew cabins", deck: "Habitat drum, aft", y: y("habitat-aft"), x: -6 },
      { kind: "cabin", name: "Resident quarters", deck: "Living ring", y: y("living-terraces"), x: 6 },
      { kind: "mess", name: "Mess and galley", deck: "Living ring", y: y("living-terraces"), x: 10 },
      { kind: "medical", name: "Medical bay", deck: "Habitat drum, aft", y: y("habitat-aft") },
      { kind: "quarantine", name: "Quarantine", deck: "Industrial wheel", y: y("industrial-yard"), x: 4 },
      { kind: "engineering", name: "Workshops", deck: "Industrial wheel", y: y("industrial-yard") },
      { kind: "lifesupport", name: "Life support", deck: "Habitat drum, aft", y: y("habitat-aft"), x: 8 },
      { kind: "stores", name: "Stores", deck: "Industrial wheel", y: y("industrial-yard"), x: -8 },
      { kind: "gym", name: "Exercise room", deck: "Living ring", y: y("living-terraces"), x: -10 },
      { kind: "recreation", name: "Recreation room", deck: "Living ring", y: y("living-terraces"), x: 14 },
      { kind: "garden", name: "Farm", deck: "Farm drum, aft", y: y("farm-aft") },
      { kind: "airlock", name: "Suit room", deck: "Crew drum", y: y("crew-drum") },
      { kind: "shelter", name: "Storm shelter", deck: "Habitat drum, aft", y: y("habitat-aft"), x: -10 },
      { kind: "school", name: "School", deck: "Living ring", y: y("living-terraces"), x: 18 },
      { kind: "plaza", name: "Plaza", deck: "Living ring", y: y("living-terraces"), x: -18 },
    ]),
  };
};

const kaminari = (): Company => ({
  ship: "kaminari",
  crew: SPEC.crewNominal,
  spaces: spaces(SPEC.crewNominal, [
    { kind: "bridge", name: "Bridge", deck: "Bridge deck", y: deckY("command-bridge") },
    { kind: "cabin", name: "Homes", deck: "Habitat ring B, deck 1", y: deckY("habitat-b-deck-1"), x: -8 },
    { kind: "cabin", name: "Resident quarters", deck: "Habitat ring A, deck 1", y: deckY("habitat-a-deck-1"), x: 8 },
    { kind: "mess", name: "Mess and galley", deck: "Habitat ring B, deck 2", y: deckY("habitat-b-deck-2") },
    { kind: "medical", name: "Sick bay", deck: "Sick bay", y: deckY("command-medbay") },
    { kind: "quarantine", name: "Quarantine", deck: "Sick bay", y: deckY("command-medbay"), x: 5 },
    { kind: "engineering", name: "Reactor hall", deck: "Reactor hall", y: deckY("reactor-inside") },
    { kind: "lifesupport", name: "Life support", deck: "Hub", y: deckY("habitat-a") },
    { kind: "stores", name: "Stores", deck: "Manufacturing hall", y: deckY("dock-works") },
    { kind: "gym", name: "Exercise room", deck: "Habitat ring B, deck 2", y: deckY("habitat-b-deck-2"), x: 8 },
    { kind: "recreation", name: "Parks", deck: "Habitat ring B, deck 3", y: deckY("habitat-b-deck-3") },
    { kind: "garden", name: "Farm", deck: "Farm terrace 1", y: deckY("farm-terrace-1") },
    { kind: "airlock", name: "Suit room", deck: "Drydock", y: deckY("dock-hangar") },
    { kind: "shelter", name: "Storm shelter", deck: "Habitat ring B, deck 1", y: deckY("habitat-b-deck-1"), x: 12 },
  ]),
});

/** Emiake's crewed decks are the plated gallery; the reactors sit at the tail. */
const emiake = (): Company => ({
  ship: "emiake",
  crew: PEOPLE.crew,
  spaces: spaces(PEOPLE.crew, [
    { kind: "bridge", name: "Bridge", deck: "Gallery", y: B.gallery[1] },
    { kind: "cabin", name: "Crew cabins", deck: "Gallery", y: B.gallery[0], x: -6 },
    { kind: "cabin", name: "Resident quarters", deck: "Gallery", y: B.gallery[0], x: 6 },
    { kind: "mess", name: "Mess and galley", deck: "Gallery", y: B.gallery[0] + 40 },
    { kind: "medical", name: "Medical bay", deck: "Gallery", y: B.gallery[1] - 40 },
    { kind: "quarantine", name: "Quarantine", deck: "Gallery", y: B.gallery[1] - 40, x: 5 },
    { kind: "engineering", name: "Reactor hall", deck: "Reactors", y: B.reactors.y },
    { kind: "lifesupport", name: "Life support", deck: "Gallery", y: B.gallery[0] + 80 },
    { kind: "stores", name: "Stores", deck: "Cargo", y: B.cargo.y },
    { kind: "gym", name: "Exercise room", deck: "Gallery", y: B.gallery[0] + 120, x: 8 },
    { kind: "recreation", name: "Recreation room", deck: "Gallery", y: B.gallery[0] + 120, x: -8 },
    { kind: "garden", name: "Green room", deck: "Gallery", y: B.gallery[0] + 160 },
    { kind: "airlock", name: "Suit room", deck: "Nose", y: B.yNose },
    { kind: "shelter", name: "Storm shelter", deck: "Gallery", y: B.gallery[0] + 200 },
  ]),
});

/** Romaryū's crew is in the bow stack and the habitat ring; the reactors are aft of the shield. */
const romaryu = (): Company => ({
  ship: "romaryu",
  crew: PEOPLE.crew,
  spaces: spaces(PEOPLE.crew, [
    { kind: "bridge", name: "Bridge", deck: "Crew bow", y: C.bow.y },
    { kind: "cabin", name: "Crew cabins", deck: "Habitat ring", y: C.ring.y[0], x: -6 },
    { kind: "cabin", name: "Resident quarters", deck: "Habitat ring", y: C.ring.y[0], x: 6 },
    { kind: "mess", name: "Mess and galley", deck: "Crew bow", y: C.bow.y, x: 6 },
    { kind: "medical", name: "Medical bay", deck: "Crew bow", y: C.bow.y, x: -6 },
    { kind: "quarantine", name: "Quarantine", deck: "Crew bow", y: C.bow.y, x: -10 },
    { kind: "engineering", name: "Reactor hall", deck: "Reactors", y: C.reactors.y },
    { kind: "lifesupport", name: "Life support", deck: "Habitat ring", y: C.ring.y[1] },
    { kind: "stores", name: "Stores", deck: "Habitat ring", y: C.ring.y[0], x: 10 },
    { kind: "gym", name: "Exercise room", deck: "Habitat ring", y: C.ring.y[1], x: 8 },
    { kind: "recreation", name: "Recreation room", deck: "Crew bow", y: C.bow.y, x: 10 },
    { kind: "garden", name: "Farm", deck: "Crew bow", y: C.bow.y, x: 14 },
    { kind: "airlock", name: "Suit room", deck: "Crew bow", y: C.bow.y, x: -14 },
    { kind: "shelter", name: "Storm shelter", deck: "Habitat ring", y: C.ring.y[0], x: 14 },
  ]),
});

/**
 * The company of every shipped ship: Miyamoto, Ariake, Hanabusa, Kaminari, Emiake and Romaryū.
 *
 * @example
 * ```ts
 * import { COMPANIES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(COMPANIES.map((company) => company.ship).join(","));
 * ```
 */
export const COMPANIES: readonly Company[] = [classShip("miyamoto"), classShip("ariake"), hanabusa(), kaminari(), emiake(), romaryu()];

/**
 * One ship's company.
 *
 * @param ship Miyamoto, Ariake, Hanabusa, Kaminari, Emiake or Romaryū.
 * @returns That ship's crew and rooms.
 * @example
 * ```ts
 * import { companyOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(companyOf("kaminari").spaces.length > 0);
 * ```
 */
export function companyOf(ship: CompanyShip): Company {
  const found = COMPANIES.find((company) => company.ship === ship);
  if (!found) throw new Error(`no company for ${ship}`);
  return found;
}
