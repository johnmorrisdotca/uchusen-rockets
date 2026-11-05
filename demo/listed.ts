import { FLEET_KIT_ROCKETS } from "../src/data/fleet.ts";

/** The rockets a demo list shows: a ship or a rocket by its own name, not the fleet kit's boxes of parts (they stay drawn when the address asks for one). */
const HIDDEN = new Set(["fleet-insets-ship-03", "fleet-insets-ship-01", "fleet-02", "fleet-02-original"]);

/** Kit samples, the system insets and the first Kaminari hull stay off the Rocket list. The first hull is opened by address. */
export const isListed = (id: string): boolean => !Object.hasOwn(FLEET_KIT_ROCKETS, id) && !HIDDEN.has(id);
