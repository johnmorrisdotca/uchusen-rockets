// The five construction machines a yard sends out. Each is one mesh.
import { MACHINES, type Machine } from "./machines.ts";

export type { Machine as DroneConcept } from "./machines.ts";

/**
 * The five machines, in yard order: welder, repair saucer, carrier, tug, fitter.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.map((make) => make().role).join(","));
 * ```
 */
export const DRONE_CONCEPTS: readonly (() => Machine)[] = MACHINES;

/**
 * One machine by its id.
 *
 * @param id One of drone-weld, drone-repair, drone-carrier, drone-tug, drone-fitter.
 * @returns That machine, including where its lens and its tool are.
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const weld = droneConcept("drone-weld");
 * console.log(weld.role, weld.mouth[1] > 0);
 * ```
 */
export function droneConcept(id: Machine["id"]): Machine {
  const found = MACHINES.map((make) => make()).find((machine) => machine.id === id);
  if (!found) throw new Error(`no drone ${id}`);
  return found;
}
