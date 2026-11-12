// Which craft are lone spacecraft, and whether a variant has a launch stack to show. One place, so the main page, the compare page and the ship picker agree.
import { ROCKETS, spaceSlots } from "../src/index.ts";

/** Probes and telescopes that fly alone: no launcher is drawn with them, so they are not "rockets". Add a new one here and every list follows. */
export const SPACECRAFT: ReadonlySet<string> = new Set(["voyager", "juno", "jwst", "parker-solar-probe", "hubble"]);

/** Whether a craft is one of the lone spacecraft. */
export const isSpacecraft = (id: string): boolean => SPACECRAFT.has(id);

/**
 * Whether a variant has a launch stack whose lower stages leave it: the only craft for which "Launch stack" and "In space" differ.
 * @param rocket The rocket's id.
 * @param variant The variant's id.
 */
export function hasLaunchStack(rocket: string, variant: string): boolean {
  const found = ROCKETS[rocket]?.variants.find((one) => one.id === variant);
  return found !== undefined && spaceSlots(rocket, found.slots) !== null;
}
