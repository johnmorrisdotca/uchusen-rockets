// Whose country each rocket, maker and site is, as an ISO 3166-1 alpha-2 code, read 2026-11-11 from each one's own article (its infobox's country of origin, country, location or headquarters).
// A craft that two or more countries or an international body made or run (Apollo and Soyuz, the ISS, Hubble, Ariane 6) has none, and so does one whose source names two countries of origin (Electron): a blank, not a pick.
import type { MakerId } from "./makers.ts";
import { blank, type Figure } from "./types.ts";

/**
 * Every country code that ISO 3166-1 assigns, two capital letters each, in order.
 *
 * @example
 * ```ts
 * import { COUNTRY_CODES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(COUNTRY_CODES.length, COUNTRY_CODES.includes("JP"));
 * ```
 */
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS",
  "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
  "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

/**
 * An ISO 3166-1 alpha-2 country code.
 *
 * @example
 * ```ts
 * import type { CountryCode } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const japan: CountryCode = "JP";
 * console.log(japan);
 * ```
 */
export type CountryCode = (typeof COUNTRY_CODES)[number];

const us = (source: Figure<CountryCode>["source"], note?: string): Figure<CountryCode> => ({ value: "US", source, ...(note ? { note } : {}) });
const SPACEX = "SpaceX, whose headquarters are at Starbase, Texas, United States.";

/** By rocket id: the built ones and the planned ones. A ship of the SPX fleet is the package's own design and has none (see `countryOf`). */
export const ROCKET_COUNTRIES: Readonly<Record<string, Figure<CountryCode>>> = {
  starship: us("wikipedia-spacex", SPACEX),
  "falcon-9": us("wikipedia-falcon-9"),
  "falcon-heavy": us("wikipedia-falcon-heavy"),
  dragon: us("wikipedia-dragon-2"),
  grasshopper: us("wikipedia-spacex", SPACEX),
  "falcon-1": us("wikipedia-falcon-1"),
  "saturn-v": us("wikipedia-saturn-v"),
  "space-shuttle": us("wikipedia-space-shuttle"),
  sls: us("wikipedia-sls"),
  "new-glenn": us("wikipedia-new-glenn"),
  electron: blank("Its source names two countries of origin, New Zealand and the United States.", "two countries"),
  soyuz: { value: "RU", source: "wikipedia-soyuz-2" },
  "lunar-module": us("wikipedia-lunar-module"),
  "apollo-soyuz": blank("Flown by NASA and the Soviet space program together.", "two countries"),
  gemini: us("wikipedia-gemini"),
  mercury: us("wikipedia-mercury"),
  "mercury-redstone": us("wikipedia-mercury-redstone"),
  "jupiter-c": us("wikipedia-jupiter-c"),
  iss: blank("Built and run by the space agencies of several countries.", "international"),
  hubble: blank("A NASA and ESA space telescope.", "international"),
  tiangong: { value: "CN", source: "wikipedia-tiangong" },
  roadster: us("wikipedia-roadster-in-space"),
  voyager: us("wikipedia-nasa", "Operated by NASA with the Jet Propulsion Laboratory, which built it."),
  juno: us("wikipedia-nasa", "Operated by NASA with the Jet Propulsion Laboratory."),
  jwst: blank("A NASA, ESA and Canadian Space Agency space telescope.", "international"),
  "parker-solar-probe": us("wikipedia-nasa", "Operated by NASA with the Johns Hopkins Applied Physics Laboratory, which built it."),
  "new-horizons": us("wikipedia-nasa", "Operated by NASA with the Johns Hopkins University Applied Physics Laboratory, which built it."),
  cassini: us("wikipedia-nasa", "Led by NASA with the Jet Propulsion Laboratory, with ESA and the Italian Space Agency; the Huygens probe is not in the model."),
  galileo: us("wikipedia-nasa", "Operated by NASA with the Jet Propulsion Laboratory."),
  pioneer: us("wikipedia-nasa", "Operated by NASA."),
  "europa-clipper": us("wikipedia-nasa", "Operated by NASA with the Jet Propulsion Laboratory."),
  starlink: us("wikipedia-starlink", "The article names SpaceX, of the United States, as the operator."),
  droneship: us("wikipedia-asds", "Based at Port Canaveral, the Port of Long Beach and the Port of Brownsville."),
  "landing-zone": us("wikipedia-lz", "At Cape Canaveral Space Force Station; Landing Zone 4 is at Vandenberg."),
  "launch-tower": us("wikipedia-starbase", "The tower at Starbase, Texas."),
  starbase: us("wikipedia-starbase"),
  "vulcan-centaur": us("wikipedia-vulcan"),
  h3: { value: "JP", source: "wikipedia-h3" },
  "long-march-5": { value: "CN", source: "wikipedia-long-march-5" },
  "ariane-6": blank("Its source gives its origin as European multi-national.", "international"),
  "atlas-v": us("wikipedia-atlas-v"),
  "delta-iv-heavy": us("wikipedia-delta-iv-heavy"),
};

/**
 * Each maker group's country as an ISO 3166-1 alpha-2 code with its source. The SPX fleet is this package's own design, the sites are a group of places, and Europe is an international group, not one country: all three are blank.
 *
 * @example
 * ```ts
 * import { MAKER_COUNTRIES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MAKER_COUNTRIES.spacex.value, MAKER_COUNTRIES.fleet.value);
 * ```
 */
export const MAKER_COUNTRIES: Readonly<Record<MakerId, Figure<CountryCode>>> = {
  spacex: us("wikipedia-spacex"),
  nasa: us("wikipedia-nasa"),
  "blue-origin": us("wikipedia-blue-origin"),
  "rocket-lab": us("wikipedia-rocket-lab", "Headquartered in Long Beach, California; founded in Auckland, New Zealand."),
  ula: us("wikipedia-vulcan", "The Vulcan Centaur infobox names United Launch Alliance as its manufacturer and the United States as its country of origin."),
  europe: blank("An international group of countries, not one maker: the rocket's own country is blank for the same reason.", "international"),
  russia: { value: "RU", source: "wikipedia-soyuz-2" },
  "us-army": us("wikipedia-jupiter-c"),
  china: { value: "CN", source: "wikipedia-tiangong" },
  japan: { value: "JP", source: "wikipedia-h3", note: "The H3 infobox names Japan as its country of origin." },
  fleet: blank("The SPX fleet is this package's own design.", "none"),
  sites: blank("A group of places, not one maker.", "none"),
};

const FLEET = blank<CountryCode>("A ship of the SPX fleet, this package's own design.", "none");

/**
 * A rocket's country, as an ISO 3166-1 alpha-2 code with its source, or a blank that says why there is none: a craft of several countries or an international body, or a ship of the SPX fleet.
 *
 * @param rocket A rocket's id, built or planned.
 * @returns The figure: `value` is the code, or null.
 * @example
 * ```ts
 * import { countryOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(countryOf("falcon-9").value, countryOf("iss").value, countryOf("iss").brief);
 * ```
 */
export function countryOf(rocket: string): Figure<CountryCode> {
  if (Object.hasOwn(ROCKET_COUNTRIES, rocket)) return ROCKET_COUNTRIES[rocket] as Figure<CountryCode>;
  return rocket.startsWith("fleet-") ? FLEET : blank("Not read for this id.");
}
