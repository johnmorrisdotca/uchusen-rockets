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
    module: `c-quarter-${kind}`,
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
    { name: "Layout", value: "Two equal ships (ship A and ship B) side by side, docked into the housing at the stern of a station", note: "they can part; the station stays" },
    { name: "Station rim", value: `${RIM.radius} m, ${RIM.rpm.toFixed(2)} rpm = ${RIM.g.toFixed(2)} g`, note: "computed from the radius" },
    { name: "Quarters", value: `four towers of ${TOWER.floors} decks, each ${TOWER_H.toFixed(1)} m tall and ${2 * TOWER.r} m across, control, laboratory, observatory and engineering` },
    { name: "Docking", value: `${PORTS.length} ports: an H dock at each quarter for large ships, two L bays in the housing, four S ports on the hub, a crew arm on each ship and an M dock in the long ship's bay`, note: "the quarters' docks sit on despun rings, so a ship docks at rest" },
    { name: "Drive", value: `${ENGINES.count} drives of ${ENGINES.coilRings} coil rings, no bell` },
    { name: "Solar wings", value: "four, stowed or deployed, on diagonal masts" },
    { name: "Mirror", value: "eighteen figured segments with a backplane and a five-layer sunshield" },
  ];
}
