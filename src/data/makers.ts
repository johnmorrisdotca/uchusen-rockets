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
export const MAKERS = { spacex: "SpaceX", nasa: "NASA", "blue-origin": "Blue Origin", "rocket-lab": "Rocket Lab", ula: "United Launch Alliance", europe: "Europe", japan: "Japan", russia: "Russia", "us-army": "US Army", china: "China", fleet: "SPX", sites: "Sites" } as const;
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
  "vulcan-centaur": { maker: "ula", madeBy: { value: "United Launch Alliance", source: "wikipedia-vulcan" } },
  "ariane-6": { maker: "europe", madeBy: { value: "ArianeGroup", source: "wikipedia-ariane-6" } },
  "atlas-v": { maker: "ula", madeBy: { value: "United Launch Alliance", source: "wikipedia-atlas-v" } },
  "delta-iv-heavy": { maker: "ula", madeBy: { value: "United Launch Alliance", source: "wikipedia-delta-iv-heavy" } },
  h3: { maker: "japan", madeBy: { value: "Mitsubishi Heavy Industries", source: "wikipedia-h3" } },
  "long-march-5": { maker: "china", madeBy: { value: "CALT", source: "wikipedia-long-march-5", note: "The infobox links that short name to the China Academy of Launch Vehicle Technology." } },
  electron: { maker: "rocket-lab", madeBy: { value: "Rocket Lab", source: "wikipedia-electron" } },
  soyuz: { maker: "russia", madeBy: { value: "RKTs Progress, Russia", source: "wikipedia-soyuz-2" } },
  "lunar-module": { maker: "nasa", madeBy: { value: "Operated by NASA; built by Grumman", source: "wikipedia-lunar-module" } },
  "apollo-soyuz": { maker: "nasa", madeBy: { value: "Operated by NASA and the Soviet space program; Apollo built by North American Rockwell, Soyuz by NPO Energia", source: "wikipedia-apollo-soyuz" } },
  gemini: { maker: "nasa", madeBy: { value: "NASA; its capsule built by McDonnell Aircraft", source: "wikipedia-gemini" } },
  mercury: { maker: "nasa", madeBy: { value: "NASA; built by McDonnell Aircraft", source: "wikipedia-mercury" } },
  "mercury-redstone": { maker: "nasa", madeBy: { value: "Chrysler Corporation", source: "wikipedia-mercury-redstone" } },
  "jupiter-c": { maker: "us-army", madeBy: { value: "Designed by the US Army Ballistic Missile Agency; built by Chrysler", source: "wikipedia-jupiter-c" } },
  iss: { maker: "nasa", madeBy: { value: "Its US segment built by NASA, ESA, JAXA and CSA, its Russian segment developed by Roscosmos", source: "wikipedia-iss" } },
  roadster: { maker: "spacex", madeBy: { value: "Launched by SpaceX on Falcon Heavy's test flight", source: "wikipedia-roadster-in-space" } },
  hubble: { maker: "nasa", madeBy: { value: "NASA's Great Observatories program; operated by STScI; built by Lockheed Martin and Perkin-Elmer", source: "wikipedia-hubble" } },
  tiangong: { maker: "china", madeBy: { value: "China Manned Space Agency; its modules built by the China Academy of Space Technology", source: "wikipedia-tiangong" } },
  voyager: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-voyager" } },
  juno: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-juno" } },
  jwst: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-webb-fact-sheet" } },
  "parker-solar-probe": { maker: "nasa", madeBy: { value: "NASA", source: "nasa-parker-press-kit" } },
  "new-horizons": { maker: "nasa", madeBy: { value: "NASA; built by the Johns Hopkins University Applied Physics Laboratory", source: "nasa-new-horizons" } },
  cassini: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-cassini" } },
  galileo: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-galileo" } },
  pioneer: { maker: "nasa", madeBy: { value: "NASA", source: "nasa-pioneer-10" } },
  "europa-clipper": { maker: "nasa", madeBy: { value: "NASA", source: "nasa-europa-clipper" } },
  starlink: { maker: "spacex", madeBy: { value: "SpaceX", source: "wikipedia-starlink" } },
  "fleet-ship-01": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-drone": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-kyotori": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-ship-03": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-ship-ariake": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-kit": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-design" } },
  "fleet-02": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-ship-02", note: "The first hull." } },
  "fleet-02-original": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-ship-02", note: "The first hull, opened by address." } },
  "fleet-kaminari": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-kaminari-concepts", note: "The Quiver hull." } },
  "fleet-emiake": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-kaminari-concepts", note: "The keel hull." } },
  "fleet-romaryu": { maker: "fleet", madeBy: { value: "SPX", source: "uchusen-fleet-kaminari-concepts", note: "The carrier hull." } },
  droneship: SITE,
  "landing-zone": SITE,
  "launch-tower": SITE,
  starbase: SITE,
};
