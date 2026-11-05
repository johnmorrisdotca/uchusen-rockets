// Kyotori V2's numbers and words: its identity, the spin of the station's rim (computed, not typed), the drive of each ship, the docking plan in words, the real ancestors of its parts, and the decks of the quarters. Every figure is a design of this
// package and says so. Pure: no three.js and no DOM.
import { ROOMS } from "../detail.ts";
import { gAt, rpmFor } from "../ship-01/spin.ts";
import { PORTS } from "./docking.ts";
import { STATION } from "./station.ts";
import { TOWER, TOWER_H } from "./quarters.ts";

export const IDENTITY = { name: "ISV 鏡鳥 Kyotori", registry: "SPX-045", class: "explorer", plain: "The mirror bird." } as const;

/** The rim: the station's cross turns on its own bearing; 60 m to the rim and 1.00 g at the quarters' floors. */
export const RIM = { radius: STATION.rim, rpm: rpmFor(STATION.rim, 1), g: gAt(STATION.rim, rpmFor(STATION.rim, 1)) };

export const ANCESTORS = {
  quarters: "the Stanford torus's apartment towers and the ISS's Destiny and Harmony racks",
  wings: "the ISS solar wings on their rotary joints and masts",
  housing: "the ISS's common berthing mechanism and the NASA docking system's latch ring",
  bay: "the Space Shuttle's payload bay doors, their radiators and latch gangs",
  mirror: "the James Webb Space Telescope's eighteen segments, backplane and five-layer sunshield",
  hub: "the ISS's Node 3 and Cupola, and Nautilus-X's centrifuge",
  tanks: "the Space Shuttle's external tank blankets and the ISS's pressurant tank valve clusters",
  drive: "magnetic-nozzle plasma drives, drawn as field coils: no bell",
} as const;

export const ENGINES = { count: 2, coilRings: 12, note: "Each ship has its own drive of twelve field coils flaring out of a reactor chamber. The ships can fly apart: a ship alone is a lean runner, and the station is a destination." } as const;

/** The decks of every quarter, as the panel names them: the quarter, the deck and what is on it. */
export const SECTIONS = STATION.kinds.flatMap((kind, k) =>
  Array.from({ length: TOWER.floors }, (_, f) => ({
    id: `${kind}/deck-${f + 1}`,
    module: `s-quarter-${kind}`,
    name: `${kind[0].toUpperCase()}${kind.slice(1)} quarter, deck ${f + 1}`,
    does: `Rooms for the people of the quarter: ${["cabin", "mess", "gym", "medical", "lounge", "school", "garden", "recreation", "shelter"].map((r) => ROOMS[r as keyof typeof ROOMS].name.toLowerCase()).slice(0, 3).join(", ")} and more, furnished in the kit's rooms.`,
    at: [(STATION.base - TOWER_H * (f + 0.5) / TOWER.floors) * Math.sin((Math.PI / 2) * k), 0, (STATION.base - TOWER_H * (f + 0.5) / TOWER.floors) * Math.cos((Math.PI / 2) * k)] as const,
    y: STATION.y,
  })),
);

/** The specification lines the panel prints. */
export function specification(): { name: string; value: string; note?: string }[] {
  return [
    { name: "Name", value: `${IDENTITY.name}, ${IDENTITY.registry}` },
    { name: "Layout", value: "Two ships (A and B) side by side, docked into the housing at the stern of a station that has room for four, in a 2x2 cluster or one at each quarter", note: "they can part; the station stays" },
    { name: "Station rim", value: `${RIM.radius} m, ${RIM.rpm.toFixed(2)} rpm = ${RIM.g.toFixed(2)} g`, note: "computed from the radius" },
    { name: "Quarters", value: `four towers of ${TOWER.floors} decks, each ${TOWER_H.toFixed(1)} m tall and ${2 * TOWER.r} m across, control, laboratory, observatory and engineering` },
    { name: "Docking", value: `${PORTS.length} ports: an H dock at each quarter (facing aft, as the ISS nodes' zenith and nadir ports do, so ships and visitors dock from below), four L bays in the housing for a 2x2 cluster of four ships, four S ports on the hub, a crew arm on each ship and an M dock in the long ship's bay`, note: "the quarters' docks sit on despun rings, so a ship docks at rest" },
    { name: "Drive", value: `${ENGINES.count} drives of ${ENGINES.coilRings} coil rings, no bell` },
    { name: "Solar wings", value: "four, in three states (stowed, flared, full), on diagonal extending-lattice masts; the blanket doubles in length when the mast extends", note: "as the ISS arrays" },
    { name: "Mirror", value: "eighteen figured segments with a backplane and a five-layer sunshield" },
  ];
}

/** The four ships of the class, by their placeholder letters (John picks the names later). */
export type Letter = "A" | "B" | "C" | "D";
export const LETTERS: readonly Letter[] = ["A", "B", "C", "D"];

/** What the table of the class says, as facts the data can be checked against: each ship's hull, the role part it carries and what that part is. */
export const CLASS_FACTS = {
  A: { id: "a", hull: "long", role: "survey", feature: "sensor-booms", count: 2 },
  B: { id: "b", hull: "runner", role: "laboratory", feature: "clean-room", count: 1 },
  C: { id: "c", hull: "long", role: "astronomy", feature: "second-telescope", count: 1 },
  D: { id: "d", hull: "runner", role: "crew", feature: "sick-bay", count: 1 },
} as const;

/** The table of how the four ships differ, the one place its words are written. The bible, the README, the viewer's spec tab and the sheet all read it, and a test holds the data and the parts to it (LESSONS 30). */
export const CLASS_TABLE: readonly { row: string; A: string; B: string; C: string; D: string }[] = [
  { row: "Role", A: "survey and mapping", B: "laboratory", C: "astronomy", D: "crew and medical" },
  { row: "Hull", A: "the long hull with the payload bay and the glass lift", B: "the short hull with the crew space", C: "the long hull with the payload bay and the glass lift", D: "the short hull with the crew space" },
  { row: "Its own compartments", A: "two sensor booms with radar, lidar and camera heads", B: "sample labs, a clean room and a cold store", C: "a second telescope on its own mast", D: "extra quarters and a sick bay" },
  { row: "Instruments", A: "radar, lidar, cameras and star trackers on 34 m booms", B: "two laboratory modules and a refrigerated sample store", C: "a seven-segment mirror with a sun shield", D: "a medical pod with a treatment bay and isolation room" },
  { row: "Crew", A: "the standard crew", B: "the standard crew and a laboratory staff", C: "the standard crew and an observing staff", D: "the standard crew and about a hundred more" },
  { row: "Shared", A: "drive of twelve coil rings, tank bouquet, latch frames, bows and docking arms", B: "same", C: "same", D: "same" },
  { row: "Name", A: "to be chosen (A)", B: "to be chosen (B)", C: "to be chosen (C)", D: "to be chosen (D)" },
];

/** The table as Markdown, for the bible and the README. */
export const classTableMarkdown = (): string => ["| | Ship A | Ship B | Ship C | Ship D |", "|---|---|---|---|---|", ...CLASS_TABLE.map((r) => `| ${r.row} | ${r.A} | ${r.B} | ${r.C} | ${r.D} |`)].join("\n");
