// Whose each rocket is, as its own article's infobox and first lines say, read 2026-11-02. `maker` is how the demo groups them; `by` says what the source says, with the companies that built it where it names them. The sites have no maker here: a blank, not a guess.
import { blank, type Figure } from "./types.ts";

/**
 * The groups the demo lists rockets under, by id, with the name shown for each.
 *
 * @example
 * ```ts
 * import { MAKERS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MAKERS.spacex, Object.keys(MAKERS).length);
 * ```
 */
export const MAKERS = { spacex: "SpaceX", nasa: "NASA", "blue-origin": "Blue Origin", "rocket-lab": "Rocket Lab", russia: "Russia", "us-army": "US Army", fleet: "SPX", sites: "Sites" } as const;
/**
 * The id of a group in `MAKERS`.
 *
 * @example
 * ```ts
 * import type { MakerId } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const maker: MakerId = "nasa";
 * console.log(maker);
 * ```
 */
export type MakerId = keyof typeof MAKERS;

export interface MadeBy {
  maker: MakerId;
  madeBy: Figure<string>;
}

const SITE: MadeBy = { maker: "sites", madeBy: blank("A place or a ship, not a vehicle: its maker is not read here.") };

export const MADE_BY: Readonly<Record<string, MadeBy>> = {
  starship: { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-starship" } },
  "falcon-9": { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-falcon-9" } },
  "falcon-heavy": { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-falcon-heavy" } },
  dragon: { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-dragon-2" } },
  grasshopper: { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-grasshopper" } },
  "falcon-1": { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-falcon-1" } },
  "saturn-v": { maker: "nasa", madeBy: { value: "Developed by NASA; built by Boeing, North American and Douglas", source: "wikipedia-saturn-v" } },
  "space-shuttle": { maker: "nasa", madeBy: { value: "Operated by NASA; built by United Space Alliance, Thiokol and Alliant Techsystems, Lockheed Martin and Martin Marietta, Boeing and Rockwell", source: "wikipedia-space-shuttle" } },
  sls: { maker: "nasa", madeBy: { value: "Used by NASA; built by Aerojet Rocketdyne, Boeing, Northrop Grumman and United Launch Alliance", source: "wikipedia-sls" } },
  "new-glenn": { maker: "blue-origin", madeBy: { value: "Blue Origin", source: "wikipedia-new-glenn" } },
  electron: { maker: "rocket-lab", madeBy: { value: "Rocket Lab", source: "wikipedia-electron" } },
  soyuz: { maker: "russia", madeBy: { value: "RKTs Progress, Russia", source: "wikipedia-soyuz-2" } },
  "lunar-module": { maker: "nasa", madeBy: { value: "Operated by NASA; built by Grumman", source: "wikipedia-lunar-module" } },
  "apollo-soyuz": { maker: "nasa", madeBy: { value: "Operated by NASA and the Soviet space program; Apollo built by North American Rockwell, Soyuz by NPO Energia", source: "wikipedia-apollo-soyuz" } },
  gemini: { maker: "nasa", madeBy: { value: "NASA; its capsule built by McDonnell Aircraft", source: "wikipedia-gemini" } },
  mercury: { maker: "nasa", madeBy: { value: "NASA; built by McDonnell Aircraft", source: "wikipedia-mercury" } },
  "jupiter-c": { maker: "us-army", madeBy: { value: "Designed by the US Army Ballistic Missile Agency; built by Chrysler", source: "wikipedia-jupiter-c" } },
  iss: { maker: "nasa", madeBy: { value: "Its US segment built by NASA, ESA, JAXA and CSA, its Russian segment developed by Roscosmos", source: "wikipedia-iss" } },
  hubble: { maker: "nasa", madeBy: { value: "NASA's Great Observatories program; operated by STScI; built by Lockheed Martin and Perkin-Elmer", source: "wikipedia-hubble" } },
  "fleet-ship-03": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-ship-ariake": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-kit": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-02-concepts": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-kaminari-concepts", note: "Original concept designs." } },
  "fleet-02": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-ship-02", note: "An original design." } },
  droneship: SITE,
  "landing-zone": SITE,
  "launch-tower": SITE,
  starbase: SITE,
};
