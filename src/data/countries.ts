// Whose country each rocket, maker and site is, as an ISO 3166-1 alpha-2 code. Most are the article's infobox (country of origin, country, location or headquarters), read 2026-11-11. ULA's and NASA's about pages, and Rocket Lab's payload guide, name the same United States headquarters, read 2026-11-19.
// A craft that two or more countries or an international body made or run (Apollo and Soyuz, the ISS, Hubble, Ariane 5 and 6) has none, and so does one whose source names two countries of origin (Electron): a blank, not a pick.
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
  "viking-lander": us("nasa-viking-spacecraft", "NASA's Viking mission, of the United States. One model for both landers."),
  crawler: us("nasa-the-crawlers", "NASA's crawler-transporters, at Kennedy Space Center, of the United States."),
  agena: us("nasa-early-years", "NASA's Agena target vehicle for Gemini, of the United States."),
  starlink: us("spacex-gen2-dimensions", "The sizes are from a filing with the United States' Federal Communications Commission by the operator, a company of the United States."),
  lageos: us("nasa-lageos", "NASA's mission page for LAGEOS, a United States mission."),
  "vanguard-1": us("wikipedia-vanguard-1", "The article names the United States Naval Research Laboratory, of the United States Navy."),
  skylab: us("nasa-nssdca-skylab", "NASA's catalogue page names the Office of Manned Space Flight of NASA as the funding agency, of the United States."),
  mir: blank("NASA SP-4225 records a 1986 launch and, writing in 1995, the Russian manned space program. The Soviet Union is not one of the ISO 3166-1 codes this package lists.", "Soviet Union"),
  "tiangong-1": { value: "CN", source: "space40-2011-053a", note: "The catalogue records a Chinese launch from Jiuquan and names Chinese organisations as the manufacturer and the operator." },
  "explorer-1": us("nasa-explorer-1-fast-facts", "NASA's page for the first United States satellite."),
  n1: blank("Its source names the USSR. The Soviet Union is not one of the ISO 3166-1 codes this package lists.", "Soviet Union"),
  "titan-ii-glv": us("wikipedia-titan-ii-glv"),
  "sputnik-1": blank("NASA's chronology names the USSR. The Soviet Union is not one of the ISO 3166-1 codes this package lists.", "Soviet Union"),
  droneship: us("wikipedia-asds", "Based at Port Canaveral, the Port of Long Beach and the Port of Brownsville."),
  "landing-zone": us("wikipedia-lz", "At Cape Canaveral Space Force Station; Landing Zone 4 is at Vandenberg."),
  "launch-tower": us("wikipedia-starbase", "The tower at Starbase, Texas."),
  starbase: us("wikipedia-starbase"),
  "vulcan-centaur": us("wikipedia-vulcan"),
  h3: { value: "JP", source: "wikipedia-h3" },
  "long-march-5": { value: "CN", source: "wikipedia-long-march-5" },
  "ariane-5": blank("Its source gives its origin as European multi-national.", "international"),
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
  nasa: us("nasa-about", "Headquarters in Washington, DC."),
  "blue-origin": us("wikipedia-blue-origin"),
  "rocket-lab": us("rocketlab-electron-guide", "The payload user's guide says the headquarters are in Long Beach, California, USA. The article says the company was founded in Auckland, New Zealand."),
  ula: us("ula-about", "Headquartered in Denver, Colorado. Manufacturing is in Decatur, Alabama."),
  europe: blank("An international group of countries, not one maker: the rocket's own country is blank for the same reason.", "international"),
  russia: { value: "RU", source: "wikipedia-soyuz-2" },
  "us-army": us("wikipedia-jupiter-c"),
  "us-navy": us("wikipedia-vanguard-1"),
  ussr: blank("The USSR no longer exists and is not one of the ISO 3166-1 codes this package lists.", "Soviet Union"),
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
