import { FLEET_KIT_ROCKETS } from "../src/data/fleet.ts";

/** The rockets a demo list shows: a ship or a rocket by its own name, not the fleet kit's boxes of parts (they stay drawn when the address asks for one). */
export const isListed = (id: string): boolean => !Object.hasOwn(FLEET_KIT_ROCKETS, id) && id !== "fleet-insets-ship-03";
