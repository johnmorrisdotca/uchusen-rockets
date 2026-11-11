---
title: The launch log
section: how-to
order: 8
description: Every orbital launch attempt since 1957 as plain data, with lookups by vehicle, site, year and outcome, counts, and a link from each vehicle to the rocket this package draws.
---

The `launches` entry is a log of every orbital launch attempt since the first Sputnik: when, on what, from where, who launched it, what it carried, how it ended and the orbit it reached. It is plain data and plain functions, with no DOM, no clock and no dependency, so a server, a test or your own page can use it. Nothing else in the package loads it: a page that never imports `@johnmorrisdotca/uchusen-rockets/launches` pays nothing for it.

**The data is not this package's own and is not MIT.** It is GCAT, the General Catalog of Artificial Space Objects, by Jonathan C. McDowell (https://planet4589.org/space/gcat), under the Creative Commons Attribution 4.0 licence. Wherever you show it, print the credit: **Data from GCAT (J. McDowell, planet4589.org/space/gcat)**. The same line is `LAUNCH_LOG_SOURCE.credit`, and [NOTICE.md](../../NOTICE.md) says what was taken and what was changed.

## Read a launch

```ts
import { launchByTag, LAUNCH_LOG_SOURCE } from "@johnmorrisdotca/uchusen-rockets/launches";

const apollo = launchByTag("1969-059");
console.log(apollo?.utc, apollo?.vehicle, apollo?.site.name, apollo?.pad);
console.log(apollo?.flight, apollo?.payloads.join(", "));
console.log(apollo?.outcome, apollo?.orbit);
console.log(LAUNCH_LOG_SOURCE.credit, "release", LAUNCH_LOG_SOURCE.release);
```

A launch has these fields. A value GCAT does not have is `null` (or absent, for the numbers of an orbit): the log never fills a gap with a guess.

| Field | What it is |
| --- | --- |
| `tag` | GCAT's launch tag, unique: the international (COSPAR) designation of a launch that reached orbit (`1957 ALP`, `2018-017`), or one GCAT made for a failure (`1957-F01`). |
| `date`, `time`, `utc`, `ms` | The UTC date (`1957-10-04`), the UTC time (`19:28:34`, or `20:45` where GCAT has no seconds, or `null`), both as an ISO string, and the milliseconds since 1970. `approximate` is true where GCAT marks the date or time as uncertain. |
| `vehicle`, `variant`, `family` | The vehicle as GCAT names it (`Falcon 9`, `Sputnik 8K71PS`), its variant where it has one, and GCAT's name for its family (`R-7`, `Falcon9`). |
| `rocket`, `rocketVariant` | The id of this package's rocket the vehicle is, and its variant id: see "Link to the rockets" below. Otherwise `null`. |
| `site`, `pad` | The launch site (`{ code: "NIIP-5", name: "Baikonur" }`) and the pad as GCAT writes it (`LC1`). |
| `agency`, `country` | The organization that launched (`{ code: "SPX", name: "SpaceX" }`) and its country as GCAT gives it (`{ code: "SU", name: "USSR" }`): the country of the day, so a Baikonur launch of 1957 is the USSR's and one of 2020 is Russia's. |
| `flight` | GCAT's name for the flight or mission (`Apollo 11`, `Tesla Roadster`). |
| `payloads`, `payloadCount` | The names of the payloads, at most the first eight, and how many there were in all. A constellation launch has a `payloadCount` of 60 and eight names. |
| `outcome`, `score` | `success`, `partial` or `failure`. A `partial` launch has GCAT's score. |
| `orbit` | The orbit reached, or `null` for a launch that did not reach one. `kind` is the orbit aimed at (`LEO`, `SSO`, `GTO`, `EEO` and the rest, in `ORBIT_KINDS`); `apogeeKm`, `perigeeKm` and `inclinationDeg` are the insertion orbit's, each only where GCAT has it. |

## Look launches up

Every lookup gives launches oldest first. A vehicle is matched by GCAT's name for it, a site by its code or its name, without regard to case, and a name that several codes share (Baikonur is two of GCAT's sites, `NIIP-5` and `GIK-5`) holds for all of them.

```ts
import { countLaunches, launchesByOutcome, launchesBySite, launchesByVehicle, launchesByYear, launchTotals } from "@johnmorrisdotca/uchusen-rockets/launches";

launchesByVehicle("Saturn V").length; // 13
launchesByYear(1957).length; // 3
launchesBySite("Baikonur")[0]?.date; // "1957-10-04"
launchesByOutcome("failure")[0]?.tag; // "1957-F01"

const shuttle = launchTotals({ rocket: "space-shuttle" });
console.log(shuttle.total, "launches,", shuttle.failure, "failed");

for (const one of countLaunches("year", { rocket: "electron" })) console.log(one.key, one.count);
```

`findLaunches` takes a filter of any of `vehicle`, `family`, `rocket`, `site`, `agency`, `country`, `year`, `from`, `to` and `outcome`, and every field given must hold. `countLaunches(by, filter)` groups by `vehicle`, `family`, `rocket`, `site`, `agency`, `country`, `year`, `outcome` or `orbit` and gives `{ key, count }` rows, the most first (the years oldest first). A launch with no value for the group, such as a vehicle that is not linked to a rocket, is left out of that count. `launchTotals(filter)` gives the total and the count of each outcome.

```ts
import { countLaunches, findLaunches } from "@johnmorrisdotca/uchusen-rockets/launches";

const heavy = findLaunches({ rocket: "falcon-heavy" })[0];
console.log(heavy?.date, heavy?.flight, heavy?.payloads);
console.log(countLaunches("country", { from: "2020-01-01" }).slice(0, 3));
```

## Link to the rockets

GCAT names a vehicle by its type, and this package draws some of them. `LAUNCH_VEHICLE_LINKS` is the table that joins the two: each row is a GCAT vehicle name, the id of the rocket in `ROCKETS`, the variant where one variant is the vehicle, and how close the two are. `same` is the vehicle that is drawn (a `Falcon 9`, a `Saturn V`, a `Soyuz-2-1A`). `family` is another member of the same named family: the Soyuz-U that flew from 1973 to 2004 is a `soyuz` here, though the Soyuz-2 is the one drawn. A test holds that every row names a vehicle that flew and a rocket and a variant that exist.

| Rocket | GCAT vehicles linked to it |
| --- | --- |
| `falcon-9`, `falcon-heavy`, `falcon-1` | Falcon 9, Falcon Heavy, Falcon 1 |
| `saturn-v` | Saturn V |
| `space-shuttle` | Space Shuttle |
| `sls`, `new-glenn`, `electron` | SLS Block 1, New Glenn 7x2, Electron |
| `starship` | Starship V2 and V3 (the variants drawn), Starship V1.0 |
| `jupiter-c` | Jupiter C |
| `soyuz` | Soyuz-2-1A and 2-1B (the variant drawn), and Soyuz-2-1V, ST-A, ST-B, FG, U, U2, U-PVB, 11A511, 11A511L and 11A511M |

A vehicle with no row, such as the R-7 that launched Sputnik, has `rocket: null`. Spacecraft such as Dragon, Gemini and Mercury are not vehicles in the log, so they have no row.

```ts
import { findLaunches, LAUNCH_VEHICLE_LINKS } from "@johnmorrisdotca/uchusen-rockets/launches";
import { ROCKETS } from "@johnmorrisdotca/uchusen-rockets";

const soyuz = LAUNCH_VEHICLE_LINKS.filter((link) => link.rocket === "soyuz");
console.log(ROCKETS["soyuz"]?.name, "has", soyuz.length, "linked vehicles and", findLaunches({ rocket: "soyuz" }).length, "launches");
```

## What was decided

GCAT's lists hold every kind of launch. These are the choices made to turn them into a log of orbital attempts, so you can decide whether they are yours:

- **Which launches are in.** A launch is kept when GCAT's launch code says it was an orbital launch, or a launch to deep space from Earth, which leaves through an Earth parking orbit (the Apollo flights to the Moon, the Falcon Heavy's Roadster), and says it ended in success or failure. Out are suborbital flights, missiles, sounding rockets, launches from the Moon, pad explosions and pad aborts (nothing lifted off), and the Starship flights GCAT calls near-orbital because they aim to come down within the first orbit. Starship flights that GCAT counts as orbital are in. A few suborbital tests that GCAT files with the deep-space launches, such as Apollo's AS-202, are in with `orbit: null`.
- **Outcome.** GCAT's `S` is `success` and its `F` is `failure`. Where GCAT gives a score from 1 to 99 (`S75`, `F40`) the launch is `partial` and `score` is that number: an orbit that is usable but not the one aimed at, a payload that did not separate, an orbit that was reached and was no use. GCAT itself counts a score under 75 as a failure; if you want that rule, count `failure` and every `partial` with a `score` under 75.
- **Time.** Every time is UTC, as GCAT gives it: the first motion of the rocket, which can differ by a few seconds from a source that counts ignition. About one launch in 460 has no time of day, and about one in a hundred has one GCAT marks uncertain.
- **Payloads.** The names are GCAT's names for the objects (`1-y ISZ` is Sputnik 1, spelled as the catalogue writes the Russian). A launch keeps the first eight names and the count of all of them, so the log stays small.
- **Orbit.** `kind` is the orbit the launch aimed at, from GCAT's launch profile code, kept only for a launch that reached an orbit; for a `partial` launch the orbit reached may be another one. The numbers are the insertion orbit's, and GCAT has them unevenly: about one launch in five has a perigee and an inclination (most of those are from 2020 on, or from the 1960s and 1970s), and nine in ten an apogee. The apogee of an escape trajectory (207 launches) is GCAT's round 150,000 km, a way of saying "leaves Earth" and not a measurement. A perigee can be negative (13 launches, Starship's flights among them): GCAT's path for the flight dips below the surface, so it did not complete an orbit at that figure, and the number is not a height.
- **Names.** Two site names are respelled, Baykonur as Baikonur and Vostochniy as Vostochny. Everything else is GCAT's spelling.

## Size and loading

The log is 7,425 launches in one file, `dist/launches/data.js`: about 1.1 MB as it is, and about 240 KB sent compressed. It is one packed JSON string, which the first lookup parses (about 16 ms) and every lookup after that reads from memory. Only the `launches` entry imports it, so a bundler that cannot tree-shake it still leaves it out of a page that does not import the entry. Reading it needs no network after the page has loaded the file.

`scripts/make-launches.ts` makes the file from GCAT's TSV files (`node scripts/make-launches.ts <folder> --release 1.8.9`), so a newer release can be packed again. GCAT's files carry the day of their data but not the release, so you give it with `--release`, as GCAT's home page names it; without it the script stops, so an old release is never stamped on new data. The release and the day of its data are `LAUNCH_LOG_SOURCE.release` and `.updated`.

The credit is a small file of its own, `dist/launches/source.js`, also imported as `@johnmorrisdotca/uchusen-rockets/launches/source`: a page that only prints the credit can read it without loading the 1.1 MB of data. Every launch `launches()` returns is frozen, because all callers share the same rows; copy one to change it.
