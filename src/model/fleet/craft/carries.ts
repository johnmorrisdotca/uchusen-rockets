// Which ships carry which craft, and where. A craft stands in a hangar cradle or hangs on a port; a port row names the port in the ship's own table, so a test can hold the craft's collar to the one the ship
// records. Pure: no three.js and no DOM.
import { PORTS as HANABUSA } from "../ship-01/docking.ts";
import { PORTS as KYOTORI } from "../ship-kyotori/docking.ts";
import type { CollarClass } from "../collars.ts";
import type { AtcId } from "./names.ts";

/** One carry: the ship (the rocket id), the place it stands and, for a port, that port's id in the ship's table and the collar it records. */
export interface Carry {
  craft: AtcId;
  ship: string;
  shipName: string;
  where: string;
  port?: { id: string; collar: CollarClass };
}

const portOf = (ports: readonly { id: string; collar: CollarClass }[], id: string) => {
  const found = ports.find((p) => p.id === id);
  if (!found) throw new RangeError(`carries: no port ${id}`);
  return { id: found.id, collar: found.collar };
};

/** The carry table. Collars come from the ships' own port tables, never retyped. */
export const CARRIES: readonly Carry[] = [
  { craft: "crew-shuttle", ship: "fleet-ship-01", shipName: "SPX-01 Hanabusa", where: "small-craft berth", port: portOf(HANABUSA, "berth-m") },
  { craft: "crew-shuttle", ship: "fleet-kyotori", shipName: "Kyotori", where: "payload bay dock, ship A", port: portOf(KYOTORI, "ship-a-bay") },
  { craft: "crew-shuttle", ship: "fleet-02", shipName: "SPX-207 Kaminari", where: "dorsal hangar, in a cradle" },
  { craft: "crew-shuttle", ship: "fleet-ship-03", shipName: "SPX-03 Miyamoto", where: "rescue bay, sharing the cradle" },
  { craft: "cargo-tug", ship: "fleet-02", shipName: "SPX-207 Kaminari", where: "dorsal hangar, in a cradle" },
  { craft: "cargo-tug", ship: "fleet-ship-01", shipName: "SPX-01 Hanabusa", where: "hub node port 1", port: portOf(HANABUSA, "hub-1") },
  { craft: "cargo-tug", ship: "fleet-kyotori", shipName: "Kyotori", where: "stern housing, bay A", port: portOf(KYOTORI, "housing-a") },
  { craft: "rescue-cutter", ship: "fleet-ship-03", shipName: "SPX-03 Miyamoto", where: "rescue bay, in the large cradle" },
  { craft: "rescue-cutter", ship: "fleet-ship-ariake", shipName: "Ariake", where: "rescue bay, in the large cradle" },
  { craft: "rescue-cutter", ship: "fleet-02", shipName: "SPX-207 Kaminari", where: "dorsal hangar, in a cradle" },
  { craft: "rescue-cutter", ship: "fleet-ship-01", shipName: "SPX-01 Hanabusa", where: "small-craft berth", port: portOf(HANABUSA, "berth-m") },
];

/** The rows of one craft. */
export const carriedBy = (craft: AtcId): readonly Carry[] => CARRIES.filter((c) => c.craft === craft);
