// Which craft are spacecraft (probes, telescopes and crewed craft), and whether a variant has a launch stack to show. One place, so the main page, the compare page and the ship picker agree.
import { ROCKETS, spaceSlots } from "../src/index.ts";

/** Probes, telescopes and crewed craft: the vehicles that fly in space, not the launchers that lift them and not the stations. Add a new one here and every list follows. */
export const SPACECRAFT: ReadonlySet<string> = new Set(["voyager", "juno", "jwst", "parker-solar-probe", "hubble", "dragon", "gemini", "mercury", "lunar-module", "apollo-soyuz", "cassini", "galileo", "pioneer", "new-horizons", "europa-clipper", "starlink", "lageos", "vanguard-1", "sputnik-1"]);

/** Whether a craft is a spacecraft. */
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
