// The shape of a place in the `sites` entry. Types only: reading them loads nothing.

/**
 * What a place is. `spaceport` is a fixed place on land. `launch-area` is where there is none to point at: a sea zone, a platform, or the air base an aircraft took off from to launch in the air.
 *
 * @example
 * ```ts
 * import { findSites, type SiteKind } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * const kind: SiteKind = "launch-area";
 * console.log(findSites({ kind }).length > 0);
 * ```
 */
export type SiteKind = "spaceport" | "launch-area";

/**
 * What the launch log says of the launches from a place: the count and the outcomes, and the dates of the first and the last, as GCAT gives them.
 *
 * @example
 * ```ts
 * import { siteById, type SiteLaunches } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * const launches: SiteLaunches | null | undefined = siteById("kourou")?.launches;
 * console.log(launches?.total, launches?.first, launches?.last);
 * ```
 */
export interface SiteLaunches {
  /** Every orbital launch attempt in the log from the place's GCAT codes. It is `success + partial + failure`. */
  readonly total: number;
  readonly success: number;
  /** Launches GCAT scored between a success and a failure. */
  readonly partial: number;
  readonly failure: number;
  /** The UTC date of the first launch, `YYYY-MM-DD`. */
  readonly first: string;
  /** The UTC date of the latest launch in the log. */
  readonly last: string;
}

/**
 * Where each part of a place's record comes from. `wikidata` is a statement of the place's Wikidata item (CC0), `gcat` is GCAT's sites table (CC BY 4.0), and `typed` is written by hand in the package's list, for a reader to check: a name where the item has none or its label is not the name people use, or a country Wikidata does not give as the ISO code.
 *
 * @example
 * ```ts
 * import { siteById, type SiteSources } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * const sources: SiteSources | undefined = siteById("starbase")?.sources;
 * console.log(sources?.position, sources?.ja);
 * ```
 */
export interface SiteSources {
  readonly position: "wikidata" | "gcat";
  readonly en: "wikidata" | "typed";
  readonly ja: "wikidata" | "typed";
  /** `null` where the place is at sea and has no country. */
  readonly country: "wikidata" | "typed" | null;
  /** `typed` where the package's list names the operator's Wikidata item because the place's own item names none, or only a facility of the agency. `null` where there is none to name. */
  readonly operators: "wikidata" | "typed" | null;
}

/**
 * A spaceport or a launch site.
 *
 * @example
 * ```ts
 * import { siteById, type Site } from "@johnmorrisdotca/uchusen-rockets/sites";
 *
 * const site: Site | undefined = siteById("tanegashima");
 * console.log(site?.name.ja, site?.lat, site?.lon, site?.operators);
 * ```
 */
export interface Site {
  /** A lowercase slug, unique in the entry and stable: `cape-canaveral`, `tanegashima`. Written with the kind (`spaceport/kourou`) when something outside the entry names one. */
  readonly id: string;
  readonly kind: SiteKind;
  /** The name in English and in Japanese. Both are always there. */
  readonly name: { readonly en: string; readonly ja: string };
  /** The ISO 3166-1 alpha-2 code of the territory the place is in, or `null` at sea. It is where the place is, not who runs it: Baikonur is `KZ`, and Kourou is `GF`, French Guiana. */
  readonly country: string | null;
  /** Latitude in degrees, north positive, to four places (about 10 m). A point in the place, not a pad or an outline: a spaceport covers many kilometres. */
  readonly lat: number;
  /** Longitude in degrees, east positive. */
  readonly lon: number;
  /** True where the source's own precision is coarser than 0.005 degrees (about 500 m), or unstated. */
  readonly approximate: boolean;
  /** The operator, else the owner, that Wikidata names today, in English; empty where it names none. */
  readonly operators: readonly string[];
  readonly codes: {
    /** GCAT's launch-site codes for the place, as `Launch.site.code` in the launch log has them. Empty where GCAT has no launch from it. */
    readonly gcat: readonly string[];
    /** CelesTrak's launch-site codes for the place. Identifiers only. */
    readonly celestrak: readonly string[];
  };
  /** The place's Wikidata item and the revision of it that was read, or `null` where it has none. */
  readonly wikidata: { readonly id: string; readonly revision: number } | null;
  /** The launches from it in the launch log, or `null` where GCAT's log has none. */
  readonly launches: SiteLaunches | null;
  readonly sources: SiteSources;
}
