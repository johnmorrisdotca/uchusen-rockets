// The hangar doors a craft has to pass, read from the ships' own tables, so a change to a hangar changes the test. Metres. Pure: no three.js and no DOM.
import { HANGAR_DOOR } from "../ship-02/dims.ts";
import { doorOf } from "../ship-03/dims.ts";

/** A door: the clear opening, and where the number comes from. */
export interface Door {
  ship: string;
  wide: number;
  high: number;
  source: string;
}

const rescue = doorOf("starboard-aft");
const survey = doorOf("port-fore");

/** The doors, from the tightest. Miyamoto's two bays have the same door height; Kaminari (the first design, with the dorsal hangar) has one large cage. */
export const DOORS: readonly Door[] = [
  { ship: "SPX-03 Miyamoto, rescue bay", wide: rescue.wide, high: rescue.high, source: "ship-03/dims.ts doorOf(starboard-aft)" },
  { ship: "SPX-03 Miyamoto, survey bay", wide: survey.wide, high: survey.high, source: "ship-03/dims.ts doorOf(port-fore)" },
  { ship: "SPX-207 Kaminari, dorsal hangar", wide: HANGAR_DOOR.wide, high: HANGAR_DOOR.high, source: "ship-02/dims.ts HANGAR_DOOR" },
];

/** The margin a craft keeps from a door's edge on every side, metres. */
export const DOOR_MARGIN = 1;
