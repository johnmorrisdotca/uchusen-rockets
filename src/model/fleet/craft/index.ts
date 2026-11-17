// The Auxiliary Transfer Craft (ATC): the small craft every hangar and port of the fleet shares. Each is a table row (its collar, its lineage, its envelope measured from its own pieces) and a builder. Pure: no
// three.js and no DOM.
import { COLLARS, type CollarClass } from "../collars.ts";
import type { Piece } from "../../pieces.ts";
import type { ModuleOptions } from "../types.ts";
import { carriedBy, type Carry } from "./carries.ts";
import { type Envelope, envelopeOf, tightest } from "./clearance.ts";
import { ATC_IDS, ATC_NAMES, type AtcId } from "./names.ts";
import { CUTTER, cutterPieces } from "./cutter.ts";
import { dronePieces } from "./drone.ts";
import { LANDER, landerPieces } from "./lander.ts";
import { SHUTTLE, shuttlePieces } from "./shuttle.ts";
import { TUG, tugPieces } from "./tug.ts";

export { ATC_IDS, ATC_NAMES } from "./names.ts";
export type { AtcId, AtcName } from "./names.ts";
export { CARRIES, carriedBy } from "./carries.ts";
export type { Carry } from "./carries.ts";
export { DOORS, DOOR_MARGIN } from "./doors.ts";
export { envelopeOf, spareOf, tightest } from "./clearance.ts";
export type { Envelope } from "./clearance.ts";

/** A craft as data. */
export interface Atc {
  id: AtcId;
  /** What it does, in a line. */
  role: string;
  /** The collar class of its docking ring, or null for a craft a cradle clamp holds (the survey drone). */
  collar: CollarClass | null;
  crewed: boolean;
  /** The height of the face its collar sits on, metres, or null when it has no collar. */
  nose: number | null;
  /** The real hardware it descends from, in a line a reader can look up. */
  ancestor: string;
  pieces: (options?: ModuleOptions) => Piece[];
  /** Its envelope, metres, from its own pieces. */
  envelope: Envelope;
  /** The ships that carry it. */
  carriedBy: readonly Carry[];
}

const make = (id: AtcId, role: string, collar: CollarClass | null, crewed: boolean, nose: number | null, ancestor: string, pieces: (options?: ModuleOptions) => Piece[]): Atc => ({ id, role, collar, crewed, nose, ancestor, pieces, envelope: envelopeOf(pieces()), carriedBy: carriedBy(id) });

/** The craft built so far, by id. */
export const ATC: Readonly<Partial<Record<AtcId, Atc>>> = {
  "crew-shuttle": make("crew-shuttle", "Carries people between ships and to orbit", "M", true, SHUTTLE.nose, "SpaceX Dragon (capsule and trunk), NASA Orion with the European Service Module, and the Apollo service module's reaction-control quads", shuttlePieces),
  "rescue-cutter": make("rescue-cutter", "Rescue bay craft and lifeboat: two decks of stretcher bays, a side lock and a tow hook", "M", true, CUTTER.nose, "The Soyuz descent module as a lifeboat, SpaceX Dragon's capsule and trunk, and Orion with the European Service Module, drawn long", cutterPieces),
  "survey-lander": make("survey-lander", "Lands on small bodies to survey and take samples", "S", false, LANDER.nose, "The Apollo Lunar Module: an eight-sided descent stage on four legs under a round ascent cabin", landerPieces),
  "survey-drone": make("survey-drone", "Flies survey runs from a cradle and returns to it", null, false, null, "The package's own survey probes (Voyager's instrument boom, Cassini's high-gain dish), scaled down to a free-flying drone", dronePieces),
  "cargo-tug": make("cargo-tug", "Moves a 22 by 22 by 40 m container between a cargo station and a hangar or port", "L", false, TUG.nose, "The ISS's Canadarm2 and Dextre robot arms, and the Shuttle's Manned Maneuvering Unit as a free-flying work pack, scaled up", tugPieces),
};

/** The ids of the craft built so far, in the family's order. */
export const BUILT: readonly AtcId[] = ATC_IDS.filter((id) => ATC[id] !== undefined);

/** A craft's one-line spec rows for a card: size, collar, the tightest door, who carries it. */
export function specRows(id: AtcId): [string, string][] {
  const craft = ATC[id];
  if (!craft) throw new RangeError(`no craft ${id}`);
  const c = craft.collar ? COLLARS[craft.collar] : undefined;
  const { door, spare } = tightest(craft.envelope);
  const e = craft.envelope;
  return [
    ["Name", ATC_NAMES[id].name],
    ["Role", craft.role],
    ["Length", `${e.long} m`],
    ["Width", `${Math.max(e.across, e.deep)} m across the thruster quads and arms`],
    ["Docking collar", c ? `Class ${craft.collar}: ${c.outer} m ring, ${c.bore} m bore` : "None: a cradle clamp holds it"],
    ["Tightest hangar door", `${door.ship}, ${door.wide} by ${door.high} m: ${spare} m to spare after a 1 m margin each side`],
    ["Carried by", craft.carriedBy.map((x) => `${x.shipName} (${x.where})`).join("; ")],
    ["Descends from", craft.ancestor],
  ];
}
