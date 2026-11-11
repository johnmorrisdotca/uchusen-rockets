// The launch log: every orbital launch attempt since 1957, from GCAT (Jonathan McDowell, CC BY 4.0), with lookups and counts. Pure: no DOM, no clock, no dependency. The data is one packed string in ./data.ts, parsed on first use.
import { PACKED_LAUNCHES } from "./data.ts";
import { LAUNCH_VEHICLE_LINKS } from "./links.ts";

export { LAUNCH_LOG_SOURCE } from "./source.ts";
export { LAUNCH_VEHICLE_LINKS } from "./links.ts";
export type { VehicleLink, VehicleMatch } from "./links.ts";

/**
 * How a launch ended. `success` is GCAT's S, `failure` its F. `partial` is a launch GCAT scored between the two, such as an orbit that is usable but not the one aimed at (`score` says how well it went, from 1 to 99).
 *
 * @example
 * ```ts
 * import { launchesByOutcome, type LaunchOutcome } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const outcome: LaunchOutcome = "partial";
 * console.log(launchesByOutcome(outcome).length > 0);
 * ```
 */
export type LaunchOutcome = "success" | "partial" | "failure";

/**
 * The kind of orbit a launch aimed at, as GCAT's launch profile code names it. A launch carries it only when it reached an orbit.
 *
 * @example
 * ```ts
 * import { ORBIT_KINDS, type OrbitKind } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const kind: OrbitKind = "GTO";
 * console.log(ORBIT_KINDS[kind]);
 * ```
 */
export type OrbitKind = "LEO" | "SSO" | "ISS" | "LSS" | "MEO" | "MTO" | "MOL" | "HEO" | "GTO" | "STO" | "GEO" | "DSO" | "EEO";

/**
 * What each orbit kind means, in GCAT's words shortened.
 *
 * @example
 * ```ts
 * import { ORBIT_KINDS } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(Object.keys(ORBIT_KINDS).length);
 * ```
 */
export const ORBIT_KINDS: Readonly<Record<OrbitKind, string>> = {
  LEO: "Low Earth orbit (other than sun-synchronous, space station and ISS)",
  SSO: "Sun-synchronous orbit",
  ISS: "The International Space Station",
  LSS: "A low-orbit space station other than the ISS",
  MEO: "Medium Earth orbit",
  MTO: "Medium Earth orbit transfer, the payload circularizes it",
  MOL: "Molniya orbit",
  HEO: "Highly elliptical orbit (other than Molniya)",
  GTO: "Geosynchronous transfer orbit",
  STO: "Supersynchronous transfer orbit, apogee over 45,000 km",
  GEO: "Direct insertion to geosynchronous orbit",
  DSO: "Deep space orbit: Earth orbit with an apogee beyond 150,000 km",
  EEO: "Earth escape orbit",
};

/**
 * The orbit a launch reached. `kind` is what it aimed at; the numbers are the insertion orbit's, and each is there only where GCAT has it (about one launch in five has a perigee and an inclination).
 *
 * @example
 * ```ts
 * import { launchByTag, type LaunchOrbit } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const orbit: LaunchOrbit | null | undefined = launchByTag("1969-059")?.orbit;
 * console.log(orbit?.kind, orbit?.perigeeKm, orbit?.apogeeKm);
 * ```
 */
export interface LaunchOrbit {
  kind: OrbitKind;
  /** Height of the insertion orbit's apogee above the surface, in km. For a launch on an escape trajectory (207 of them) it is 150000, GCAT's round figure for "leaves Earth", not a measurement. */
  apogeeKm?: number;
  /** Height of its perigee, in km. It is negative (13 launches, Starship's flights among them) where the path GCAT gives dips below the surface, so the flight did not complete an orbit at that figure; it is not a height. */
  perigeeKm?: number;
  /** Its inclination, in degrees. */
  inclinationDeg?: number;
}

/**
 * One launch attempt.
 *
 * @example
 * ```ts
 * import { launchByTag, type Launch } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const launch: Launch | undefined = launchByTag("2018-017");
 * console.log(launch?.utc, launch?.vehicle, launch?.payloads);
 * ```
 */
export interface Launch {
  /** GCAT's launch tag: the international (COSPAR) designation of a launch that reached orbit ("1957 ALP", "2018-017"), or one GCAT made up for a failure ("1957-F01"). Unique. */
  tag: string;
  /** The UTC date, `YYYY-MM-DD`. */
  date: string;
  /** The UTC time, `HH:MM` or `HH:MM:SS`, or null where GCAT has none. */
  time: string | null;
  /** The date and time in UTC as an ISO 8601 string, or just the date where there is no time. */
  utc: string;
  /** The launch in milliseconds since 1970, in UTC (midnight where there is no time). */
  ms: number;
  /** True where GCAT marks the date or time as uncertain. */
  approximate: boolean;
  /** The vehicle's type name in GCAT, as `LAUNCH_VEHICLE_LINKS` and `launchesByVehicle` take it. */
  vehicle: string;
  /** The vehicle's variant (an upper stage, a series), or null. */
  variant: string | null;
  /** GCAT's name for the family the vehicle belongs to ("R-7", "Falcon9"), or null. */
  family: string | null;
  /** The id of this package's rocket the vehicle is, or is a member of the family of, or null. See `LAUNCH_VEHICLE_LINKS`. */
  rocket: string | null;
  /** The variant of that rocket that this vehicle is, where one is, or null. */
  rocketVariant: string | null;
  /** The launch site: GCAT's code and its name ("NIIP-5", "Baikonur"). */
  site: { code: string; name: string };
  /** The pad, as GCAT writes it ("LC1", "LC39A"), or null. */
  pad: string | null;
  /** The organization that launched: GCAT's code and short name ("SPX", "SpaceX"). */
  agency: { code: string; name: string };
  /** The country of that organization, as GCAT gives it ("SU", "USSR"), or null. */
  country: { code: string; name: string } | null;
  /** GCAT's name for the flight or mission ("Apollo 11", "Tesla Roadster"), or null. */
  flight: string | null;
  /** The names of the payloads, at most the first eight. */
  payloads: readonly string[];
  /** How many payloads the launch carried in all; more than `payloads.length` for a launch of a constellation. */
  payloadCount: number;
  outcome: LaunchOutcome;
  /** For a `partial` launch, GCAT's score from 1 (a tiny part of the job done) to 99 (nearly all of it); 75 and over is within GCAT's pass mark. Null otherwise. */
  score: number | null;
  /** The orbit reached, or null for a launch that failed to reach one. */
  orbit: LaunchOrbit | null;
}

interface Packed {
  vehicles: [string, string][];
  sites: [string, string][];
  agencies: [string, string, string][];
  countries: [string, string][];
  orbits: OrbitKind[];
  rows: [string, string, string, number, string | null, number, string | null, number, "s" | "p" | "f", number, number, number, number | null, number | null, string | null, 0 | 1, number, string[]][];
}

const OUTCOMES = { s: "success", p: "partial", f: "failure" } as const;
const LINKS = new Map(LAUNCH_VEHICLE_LINKS.map((link) => [link.vehicle, link]));

let parsed: readonly Launch[] | undefined;

function parse(): readonly Launch[] {
  const packed = JSON.parse(PACKED_LAUNCHES) as Packed;
  const countries = new Map(packed.countries);
  const rows = packed.rows.map((row): Launch => {
    const [tag, date, time, v, variant, s, pad, a, outcome, score, o, apogee, perigee, inclination, flight, approximate, count, payloads] = row;
    const vehicle = packed.vehicles[v] as [string, string];
    const agency = packed.agencies[a] as [string, string, string];
    const link = LINKS.get(vehicle[0]);
    const orbitNumbers = { ...(apogee > 0 ? { apogeeKm: apogee } : {}), ...(perigee === null ? {} : { perigeeKm: perigee }), ...(inclination === null ? {} : { inclinationDeg: inclination }) };
    return {
      tag,
      date,
      time: time === "" ? null : time,
      utc: time === "" ? date : `${date}T${time.length === 5 ? `${time}:00` : time}Z`,
      ms: Date.parse(`${date}T${time === "" ? "00:00:00" : time.length === 5 ? `${time}:00` : time}Z`),
      approximate: approximate === 1,
      vehicle: vehicle[0],
      variant,
      family: vehicle[1] === "" ? null : vehicle[1],
      rocket: link?.rocket ?? null,
      rocketVariant: link?.variant ?? null,
      site: { code: (packed.sites[s] as [string, string])[0], name: (packed.sites[s] as [string, string])[1] },
      pad,
      agency: { code: agency[0], name: agency[1] },
      country: agency[2] === "" ? null : { code: agency[2], name: countries.get(agency[2]) ?? agency[2] },
      flight,
      payloads,
      payloadCount: count,
      outcome: OUTCOMES[outcome],
      score: score === 0 ? null : score,
      orbit: o < 0 ? null : Object.freeze({ kind: packed.orbits[o] as OrbitKind, ...orbitNumbers }),
    };
  });
  return Object.freeze(rows.map(freezeLaunch));
}

/** Freezes a launch and the objects inside it: every caller reads the same rows, so one that wrote to a row would change them for all. */
function freezeLaunch(launch: Launch): Launch {
  Object.freeze(launch.site);
  Object.freeze(launch.agency);
  if (launch.country) Object.freeze(launch.country);
  Object.freeze(launch.payloads);
  return Object.freeze(launch);
}

/**
 * Every launch in the log, oldest first, each as a plain object. The first call parses the log; the rest return the same array. The array and every launch in it are frozen, because every caller shares them: copy a launch to change it.
 *
 * @returns Every orbital launch attempt in the log.
 * @example
 * ```ts
 * import { launches } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const all = launches();
 * console.log(all[0]?.date, all.length > 7000);
 * ```
 */
export function launches(): readonly Launch[] {
  parsed ??= parse();
  return parsed;
}

/**
 * One launch by its GCAT tag.
 *
 * @param tag A launch tag, such as "1957 ALP" or "2018-017".
 * @returns The launch, or undefined where the log has none with that tag.
 * @example
 * ```ts
 * import { launchByTag } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(launchByTag("1957 ALP")?.site.name); // "Baikonur"
 * ```
 */
export function launchByTag(tag: string): Launch | undefined {
  return launches().find((launch) => launch.tag === tag);
}

/**
 * What to keep. Every field given must hold, so each one narrows the others. Names and codes match without regard to case.
 *
 * @example
 * ```ts
 * import { findLaunches, type LaunchFilter } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const filter: LaunchFilter = { rocket: "falcon-9", year: 2020, outcome: "success" };
 * console.log(findLaunches(filter).length > 10);
 * ```
 */
export interface LaunchFilter {
  /** A vehicle's type name in GCAT ("Falcon 9", "Soyuz-U"). */
  vehicle?: string;
  /** GCAT's name for a vehicle's family ("R-7"). */
  family?: string;
  /** The id of one of this package's rockets: every vehicle linked to it counts. */
  rocket?: string;
  /** A launch site's code or name ("NIIP-5", "Baikonur"): a name that several codes share holds for all of them. */
  site?: string;
  /** An organization's code or short name ("SPX", "SpaceX"). */
  agency?: string;
  /** A country's code or name ("SU", "USSR", "China"). */
  country?: string;
  /** A UTC year. */
  year?: number;
  /** The first day to keep, `YYYY-MM-DD`. */
  from?: string;
  /** The last day to keep, `YYYY-MM-DD`. */
  to?: string;
  outcome?: LaunchOutcome;
}

const same = (a: string, b: string | undefined | null): boolean => b !== undefined && b !== null && a.toLowerCase() === b.toLowerCase();

/**
 * The launches that meet every field of a filter, oldest first.
 *
 * @param filter What to keep; none keeps all.
 * @returns The matching launches.
 * @example
 * ```ts
 * import { findLaunches } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const shuttle = findLaunches({ rocket: "space-shuttle", outcome: "failure" });
 * console.log(shuttle.length); // 0
 * ```
 */
export function findLaunches(filter: LaunchFilter = {}): readonly Launch[] {
  return launches().filter(
    (launch) =>
      (filter.vehicle === undefined || same(filter.vehicle, launch.vehicle)) &&
      (filter.family === undefined || same(filter.family, launch.family)) &&
      (filter.rocket === undefined || launch.rocket === filter.rocket) &&
      (filter.site === undefined || same(filter.site, launch.site.code) || same(filter.site, launch.site.name)) &&
      (filter.agency === undefined || same(filter.agency, launch.agency.code) || same(filter.agency, launch.agency.name)) &&
      (filter.country === undefined || same(filter.country, launch.country?.code) || same(filter.country, launch.country?.name)) &&
      (filter.year === undefined || launch.date.startsWith(`${String(filter.year).padStart(4, "0")}-`)) &&
      (filter.from === undefined || launch.date >= filter.from) &&
      (filter.to === undefined || launch.date <= filter.to) &&
      (filter.outcome === undefined || launch.outcome === filter.outcome),
  );
}

/**
 * Every launch of one vehicle, by GCAT's type name.
 *
 * @param vehicle A vehicle's type name, such as "Falcon 9" or "Soyuz-U".
 * @returns Its launches, oldest first.
 * @example
 * ```ts
 * import { launchesByVehicle } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(launchesByVehicle("Saturn V").length); // 13
 * ```
 */
export function launchesByVehicle(vehicle: string): readonly Launch[] {
  return findLaunches({ vehicle });
}

/**
 * Every launch from one site, by GCAT's code or its name.
 *
 * @param site A launch site, such as "Baikonur" or "KSC".
 * @returns Its launches, oldest first.
 * @example
 * ```ts
 * import { launchesBySite } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(launchesBySite("Baikonur")[0]?.date); // "1957-10-04"
 * ```
 */
export function launchesBySite(site: string): readonly Launch[] {
  return findLaunches({ site });
}

/**
 * Every launch of one UTC year.
 *
 * @param year A year, such as 1969.
 * @returns Its launches, oldest first.
 * @example
 * ```ts
 * import { launchesByYear } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(launchesByYear(1957).length); // 3
 * ```
 */
export function launchesByYear(year: number): readonly Launch[] {
  return findLaunches({ year });
}

/**
 * Every launch that ended one way.
 *
 * @param outcome `success`, `partial` or `failure`.
 * @returns Those launches, oldest first.
 * @example
 * ```ts
 * import { launchesByOutcome } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(launchesByOutcome("failure")[0]?.tag); // "1957-F01"
 * ```
 */
export function launchesByOutcome(outcome: LaunchOutcome): readonly Launch[] {
  return findLaunches({ outcome });
}

/**
 * What a count can be grouped by.
 *
 * @example
 * ```ts
 * import { countLaunches, type LaunchGroup } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const by: LaunchGroup = "year";
 * console.log(countLaunches(by, { rocket: "electron" })[0]);
 * ```
 */
export type LaunchGroup = "vehicle" | "family" | "rocket" | "site" | "agency" | "country" | "year" | "outcome" | "orbit";

/**
 * One group of a count.
 *
 * @example
 * ```ts
 * import { countLaunches, type LaunchCount } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const top: LaunchCount | undefined = countLaunches("vehicle")[0];
 * console.log(top?.key, top?.count);
 * ```
 */
export interface LaunchCount {
  /** The group: a vehicle name, a site name, a year, an outcome and so on. */
  key: string;
  count: number;
}

const KEYS: Record<LaunchGroup, (launch: Launch) => string | null> = {
  vehicle: (launch) => launch.vehicle,
  family: (launch) => launch.family,
  rocket: (launch) => launch.rocket,
  site: (launch) => launch.site.name,
  agency: (launch) => launch.agency.name,
  country: (launch) => launch.country?.name ?? null,
  year: (launch) => launch.date.slice(0, 4),
  outcome: (launch) => launch.outcome,
  orbit: (launch) => launch.orbit?.kind ?? null,
};

/**
 * Counts launches by a group, most first (oldest first for years). A launch with no value for the group, such as one with no linked rocket, is left out.
 *
 * @param by What to group by.
 * @param filter What to count; none counts all.
 * @returns The groups with their counts.
 * @example
 * ```ts
 * import { countLaunches } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(countLaunches("outcome").map((one) => one.key)); // ["success","failure","partial"]
 * ```
 */
export function countLaunches(by: LaunchGroup, filter: LaunchFilter = {}): readonly LaunchCount[] {
  const counts = new Map<string, number>();
  for (const launch of findLaunches(filter)) {
    const key = KEYS[by](launch);
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const list = [...counts].map(([key, count]) => ({ key, count }));
  return by === "year" ? list.sort((a, b) => a.key.localeCompare(b.key)) : list.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * How many launches there were, and how many of them ended each way.
 *
 * @example
 * ```ts
 * import { type LaunchTotals, launchTotals } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const totals: LaunchTotals = launchTotals({ year: 2020 });
 * console.log(totals.total === totals.success + totals.partial + totals.failure); // true
 * ```
 */
export interface LaunchTotals {
  total: number;
  success: number;
  partial: number;
  failure: number;
}

/**
 * The totals of the launches that meet a filter.
 *
 * @param filter What to count; none counts all.
 * @returns The total and the count of each outcome.
 * @example
 * ```ts
 * import { launchTotals } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const falcon = launchTotals({ rocket: "falcon-9" });
 * console.log(falcon.total > 500);
 * ```
 */
export function launchTotals(filter: LaunchFilter = {}): LaunchTotals {
  const totals: LaunchTotals = { total: 0, success: 0, partial: 0, failure: 0 };
  for (const launch of findLaunches(filter)) {
    totals.total++;
    totals[launch.outcome]++;
  }
  return totals;
}
