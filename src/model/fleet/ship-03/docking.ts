// Miyamoto's visiting ports. The two collars drawn on the ventral side, ahead of the keel, are the ones a person can put a craft on. The collar opens toward -Z, so the craft's nose points up into it (+Z) and the craft hangs below the keel. The L collars between modules are joints of the ship, not berths. Pure: no three.js and no DOM.
import { SERVICE_PORTS } from "./service.ts";

export interface DockPort {
  id: string;
  name: string;
  at: readonly [number, number, number];
  /** The way a visiting craft's nose points. The collar itself opens the other way. */
  dir: readonly [number, number, number];
  models: readonly ("dragon" | "soyuz" | "orion" | "starship")[];
}

/** Nose up into a collar that opens toward -Z. */
const INTO: readonly [number, number, number] = [0, 0, 1];

export const PORTS: readonly DockPort[] = SERVICE_PORTS.map((port) => ({
  id: port.craft[0] === "starship" ? "starship-ventral" : "dragon-ventral",
  name: port.name,
  at: port.at,
  dir: INTO,
  models: port.craft[0] === "starship" ? (["starship"] as const) : (["dragon"] as const),
}));
