---
title: Spaceports and launch sites
section: how-to
order: 9
description: 55 spaceports and launch sites as plain data, with ids, names in English and Japanese, positions, operators, countries and the launches from each, for placing on a map or a globe.
---

The `sites` entry is the places rockets fly from: 47 spaceports on land and 8 launch areas (sea zones, a platform and two air bases). Each has an id, its name in English and in Japanese, a point, its country, its operators, its codes in GCAT, CelesTrak and Wikidata, and what GCAT's launch log says of the launches from it. It is plain data and plain functions, with no DOM, no clock and no dependency, so a map, a globe, a server or a test can use it. Nothing else in the package loads it: a page that never imports `@johnmorrisdotca/uchusen-rockets/sites` pays nothing for it.

**The data is not this package's own and is not MIT.** The points, names and operators are from Wikidata (CC0, public domain), and the launch counts and some points are from GCAT, the General Catalog of Artificial Space Objects by Jonathan C. McDowell (https://planet4589.org/space/gcat), under the Creative Commons Attribution 4.0 licence. Wherever you show GCAT's part (the launch counts, the first and last dates), print the credit: **Data from GCAT (J. McDowell, planet4589.org/space/gcat)**, which is `SITES_SOURCE.gcat.credit`. [NOTICE.md](../../NOTICE.md) says what was taken, what was typed by hand and what was changed.

## Read a place

```ts
import { siteById, SITES_SOURCE } from "@johnmorrisdotca/uchusen-rockets/sites";

const site = siteById("tanegashima");
console.log(site?.name.en, site?.name.ja, site?.country, site?.lat, site?.lon);
console.log(site?.operators, site?.launches?.total, "launches, the last on", site?.launches?.last);
console.log(SITES_SOURCE.gcat.credit);
```

A place has these fields. A value a source does not have is `null` or an empty list: the entry never fills a gap with a guess.

| Field | What it is |
| --- | --- |
| `id` | A lowercase slug, unique and stable: `cape-canaveral`, `tanegashima`. When something outside the entry names a place, write it with its kind (`spaceport/kourou`). |
| `kind` | `spaceport`, a fixed place on land, or `launch-area`, where there is none to point at: a sea zone, a platform, or the air base an aircraft took off from to launch in the air. |
| `name` | `{ en, ja }`, the name in English and in Japanese. Both are always there. |
| `country` | The ISO 3166-1 alpha-2 code of the territory the place is in, or `null` at sea. It is where the place is, not who runs it: Baikonur is `KZ` and Kourou is `GF` (French Guiana), whereas the launch log's `site.iso` is the operator's state. |
| `lat`, `lon` | Degrees, to four places. A point in the place, not a pad or an outline: a spaceport covers many kilometres, and Vandenberg's point is near the middle of the base, not at a pad. |
| `approximate` | True where the source's own precision is coarser than 0.005 degrees (about 500 m), or not stated. A sea zone's point is always approximate. |
| `operators` | The operator, else the owner, in English, as Wikidata states it; empty where it names none. |
| `codes` | `gcat`: GCAT's launch-site codes for the place, as `site.code` in the launch log has them (Baikonur is `NIIP-5` and `GIK-5`); `celestrak`: CelesTrak's, as identifiers only. |
| `wikidata` | `{ id, revision }`: the place's Wikidata item and the revision that was read, or `null` where it has none (the sea zones). |
| `launches` | `{ total, success, partial, failure, first, last }`: the orbital launch attempts in GCAT's log from the place's GCAT codes, and the UTC dates of the first and the latest; `null` where the log has none (Spaceport America, Esrange). |
| `sources` | Where each part came from: `position` (`wikidata` or `gcat`), `en`, `ja` (`wikidata` or `typed`), `country` and `operators` (`wikidata`, `typed` or `null`). `typed` means written by hand in the package's list, for a reader to check. |

## Look places up

```ts
import { findSites } from "@johnmorrisdotca/uchusen-rockets/sites";

findSites({ code: "NIIP-5" })[0]?.id; // "baikonur"
console.log(findSites({ country: "JP" }).map((site) => site.name.ja));
console.log(findSites({ kind: "spaceport", since: "2025-11-09" }).length);
console.log(findSites({ launched: false }).map((site) => site.id));
```

`findSites` takes a filter of any of `kind`, `country` (`null` for the places at sea), `code`, `launched` and `since`, and every field given must hold. A `code` is any one of a place's codes, in any system, without regard to case: GCAT's (`NIIP-5`), CelesTrak's (`TYMSC`) or a Wikidata item (`Q177477`). CelesTrak lists Cape Canaveral and Kennedy under one code, `AFETR`, so that code finds both. `since` keeps the places whose latest launch in the log is on or after that day, which is one way to say "still in use"; a place with no launch in the log is never kept by it, though it may still be in use for rockets the log leaves out.

## Put places on a map

Every place has a point, so a map or a globe takes the list as it is. The launch log joins by GCAT's code, so a launch finds its place:

```ts
import { launchByTag } from "@johnmorrisdotca/uchusen-rockets/launches";
import { findSites } from "@johnmorrisdotca/uchusen-rockets/sites";

const launch = launchByTag("1969-059");
const place = findSites({ code: launch?.site.code })[0];
console.log(place?.name.en, place?.lat, place?.lon, place?.launches?.total);
```

The two entries are separate files, and each loads only itself: the places do not load the log, and the log does not load the places.

## Where the places come from

- **Which places.** The places are the 65 launch sites in GCAT's log, joined into one place where they are one (Baikonur's two GCAT codes, Vandenberg's five, Cape Canaveral's three), and seven more that a reader would look for, suborbital and new ones (Spaceport America, Esrange, Corn Ranch, Hokkaido Spaceport, Etlaq, Arnhem, Koonibba). GCAT's own doubtful site `TYSC?`, one launch with no place or state, is on no row. Closed places stay, with their last launch's date.
- **The point.** Wikidata's coordinate for the place's item. Where Wikidata has no item (the sea zones) or its point is not the place, GCAT's point is used and `sources.position` says `gcat`: that is Starbase, where Wikidata's point is the village 3 km from the pad. Each point was checked to lie within 100 km of GCAT's.
- **The names.** The English and Japanese labels of the Wikidata item, except where there is none or it is not the name people use; those are typed (`sources.en`, `sources.ja`) and listed in the NOTICE and the changelog for review. A sea zone's name is a plain description, such as "Yellow Sea launch area". No name carries a logo or a mark.
- **The operators.** The operator, else the owner, Wikidata's item names, leaving out one that has been dissolved, as of the day it was read. Where the item names none, or only a facility of the agency (Tanegashima's says "Kagoshima Space Center", JAXA's own site), the package's list names the operator's Wikidata item and `sources.operators` says `typed`. They are not checked against the operators' own pages: the operator of a range changes more often than a point does.
- **The launches.** Counted from this package's launch log, so they are GCAT's, and a test holds that the counts equal the log's. A re-packed log asks for the places to be made again.
- **What is not here.** Pads, outlines, agency centres and tracking stations, airports and harbours, and the coming launches. No OpenStreetMap or Wikipedia data, and no non-commercial or share-alike list, is used. CelesTrak's codes are kept as identifiers; none of its coordinates or text is.

## Size and loading

The data is 55 places in one file, `dist/sites/data.js`, about 28 kB as it is. The entry bundled and minified as a bundler would is 27 kB, and 6 kB sent compressed; a test holds that against its own baseline. Only the `sites` entry imports it. The credit is a small file of its own, `dist/sites/source.js`, also imported as `@johnmorrisdotca/uchusen-rockets/sites/source`: a page that only prints the credit can read it without loading the places. Every place `sites()` returns is frozen, because all callers share the same rows; copy one to change it.

`scripts/make-sites.ts` makes the file from the list in `scripts/sites-list.ts`, Wikidata and GCAT's `sites.tsv` (`node scripts/make-sites.ts <folder> --release 1.8.9`). It asks Wikidata twice, for the places' items and for their operators and countries, and stops when a place has no English or Japanese name, when a point lies over 100 km from GCAT's, or when a site in the launch log is on no row.
