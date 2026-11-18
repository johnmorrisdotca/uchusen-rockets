// The world's spaceports and launch sites, from Wikidata (CC0) and GCAT (CC BY 4.0), with lookups. Pure: no DOM, no clock, no dependency. The places are one array in ./data.ts, shared and frozen.
import { SITE_DATA } from "./data.ts";
import type { Site, SiteKind } from "./types.ts";

export { SITES_SOURCE } from "./source.ts";
export type { Site, SiteKind, SiteLaunches, SiteSources } from "./types.ts";

for (const site of SITE_DATA) {
  for (const part of [site.name, site.codes, site.wikidata, site.launches, site.sources]) if (part !== null) Object.freeze(part);
  Object.freeze(site.codes.gcat);
  Object.freeze(site.codes.celestrak);
  Object.freeze(site.operators);
  Object.freeze(site);
}
Object.freeze(SITE_DATA);

/**
 * Every spaceport and launch site, as plain objects. The array and every place in it are frozen, because every caller shares them: copy a place to change it.
 *
 * @returns Every place, in the order of the package's list: by country, the United States first.
 * @example
 * ```ts
 * import { sites } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * for (const site of sites().slice(0, 3)) console.log(site.id, site.name.en, site.name.ja, site.lat, site.lon);
 * ```
 */
export function sites(): readonly Site[] {
  return SITE_DATA;
}

/**
 * One place by its id.
 *
 * @param id A place's id, such as "kourou" or "tanegashima".
 * @returns The place, or undefined where there is none with that id.
 * @example
 * ```ts
 * import { siteById } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * console.log(siteById("kourou")?.name.ja, siteById("kourou")?.country); // ギアナ宇宙センター GF
 * ```
 */
export function siteById(id: string): Site | undefined {
  return SITE_DATA.find((site) => site.id === id);
}

/**
 * What to keep. Every field given must hold, so each one narrows the others.
 *
 * @example
 * ```ts
 * import { findSites, type SiteFilter } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * const filter: SiteFilter = { kind: "spaceport", country: "JP", since: "2020-01-01" };
 * console.log(findSites(filter).map((site) => site.id));
 * ```
 */
export interface SiteFilter {
  kind?: SiteKind;
  /** An ISO 3166-1 alpha-2 code, such as "JP". `null` keeps the places at sea. */
  country?: string | null;
  /** One of the place's codes, in any of the systems: a GCAT launch-site code ("NIIP-5", the `Launch.site.code` of the launch log), a CelesTrak one ("TYMSC") or a Wikidata item ("Q177477"). Case does not matter. */
  code?: string;
  /** True keeps the places with a launch in GCAT's log, false those with none. */
  launched?: boolean;
  /** The first day of the latest launch to keep, `YYYY-MM-DD`: the places that launched on or after it. A place with no launch in the log is never kept. */
  since?: string;
}

const same = (a: string, b: string | null | undefined): boolean => b !== null && b !== undefined && a.toLowerCase() === b.toLowerCase();

/**
 * The places that meet every field of a filter.
 *
 * @param filter What to keep; none keeps all.
 * @returns The matching places, in the order of `sites()`.
 * @example
 * ```ts
 * import { findSites } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * console.log(findSites({ code: "NIIP-5" })[0]?.id); // "baikonur"
 * console.log(findSites({ launched: false }).map((site) => site.id));
 * ```
 */
export function findSites(filter: SiteFilter = {}): readonly Site[] {
  return SITE_DATA.filter(
    (site) =>
      (filter.kind === undefined || site.kind === filter.kind) &&
      (filter.country === undefined || (filter.country === null ? site.country === null : same(filter.country, site.country))) &&
      (filter.code === undefined || site.codes.gcat.some((code) => same(filter.code as string, code)) || site.codes.celestrak.some((code) => same(filter.code as string, code)) || same(filter.code, site.wikidata?.id)) &&
      (filter.launched === undefined || (site.launches !== null) === filter.launched) &&
      (filter.since === undefined || (site.launches !== null && site.launches.last >= filter.since)),
  );
}
