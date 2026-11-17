// The Auxiliary Transfer Craft (ATC): the small craft every hangar and port of the fleet shares. Each is a table row (its collar, its lineage, its envelope measured from its own pieces) and a builder. Pure: no
// three.js and no DOM.
import { COLLARS, type CollarClass } from "../collars.ts";
import type { Piece } from "../../pieces.ts";
import type { ModuleOptions } from "../types.ts";
import { carriedBy, type Carry } from "./carries.ts";
import { type Envelope, envelopeOf, tightest } from "./clearance.ts";
import { ATC_NAMES, type AtcId } from "./names.ts";
import { shuttlePieces } from "./shuttle.ts";

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
  /** The collar class of its docking ring, and the facing it uses. */
  collar: CollarClass;
  crewed: boolean;
  /** The real hardware it descends from, in a line a reader can look up. */
  ancestor: string;
  pieces: (options?: ModuleOptions) => Piece[];
  /** Its envelope, metres, from its own pieces. */
  envelope: Envelope;
  /** The ships that carry it. */
  carriedBy: readonly Carry[];
}

const make = (id: AtcId, role: string, collar: CollarClass, crewed: boolean, ancestor: string, pieces: (options?: ModuleOptions) => Piece[]): Atc => ({ id, role, collar, crewed, ancestor, pieces, envelope: envelopeOf(pieces()), carriedBy: carriedBy(id) });

/** The craft built so far, by id. */
export const ATC: Readonly<Partial<Record<AtcId, Atc>>> = {
  "crew-shuttle": make("crew-shuttle", "Carries people between ships and to orbit", "M", true, "SpaceX Dragon (capsule and trunk), NASA Orion with the European Service Module, and the Apollo service module's reaction-control quads", shuttlePieces),
};

/** A craft's one-line spec rows for a card: size, collar, the tightest door, who carries it. */
export function specRows(id: AtcId): [string, string][] {
  const craft = ATC[id];
  if (!craft) throw new RangeError(`no craft ${id}`);
  const c = COLLARS[craft.collar];
  const { door, spare } = tightest(craft.envelope);
  const e = craft.envelope;
  return [
    ["Name", ATC_NAMES[id].name],
    ["Role", craft.role],
    ["Length", `${e.long} m`],
    ["Width", `${Math.max(e.across, e.deep)} m across the thruster quads and arms`],
    ["Docking collar", `Class ${craft.collar}: ${c.outer} m ring, ${c.bore} m bore`],
    ["Tightest hangar door", `${door.ship}, ${door.wide} by ${door.high} m: ${spare} m to spare after a 1 m margin each side`],
    ["Carried by", craft.carriedBy.map((x) => `${x.shipName} (${x.where})`).join("; ")],
    ["Descends from", craft.ancestor],
  ];
}
