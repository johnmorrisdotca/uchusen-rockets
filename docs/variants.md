# Variants and sizes

Each rocket has variants, because its sizes changed over time. They are data with types. A variant goes in only if a source documents it, each size carries its source and, where it has one, its date, and a size no source gives is blank.

```ts
import { ROCKETS, SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";

ROCKETS.starship.variants.map((variant) => variant.id).includes("v3"); // true

const v3 = variantOf("starship", "v3");
v3.facts.height.value; // 124.4
v3.facts.parts.booster.value; // 72.3
SOURCES[v3.facts.parts.booster.source].publisher; // "Wikipedia"
v3.facts.parts.booster.others.some((other) => other.value === 81); // true
variantOf("starship", "2019").facts.diameter.value === null; // true
```

## Starship

| Variant | Whole | Super Heavy | Ship | Diameter | First flew | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `v1-flight1` Block 1 as it first flew: Ship 24, Booster 7, no ring | 121 m as stated; its parts add to 119.3 m | 69 m | 50.3 m | 9 m | 2023-04-20, Starship's first flight | Flown |
| `v1` Block 1 with the vented ring | 121.3 m | 71 m | 50.3 m | 9 m | 2023-11-18, the first with the ring | Flown |
| `v2` Block 2 | 123.1 m | 71 m | 52.1 m | 9 m | 2025-01-16 | Flown |
| `v3` Block 3 | 124.4 m | 72.3 m | 52.1 m | 9 m | 2026-05-22 | Flown |
| `v4` Block 4 | 142 m, an estimate | 81 m, announced | 61 m, announced | 9 m, announced | Not flown | Announced, not built |
| `2019` 2019 design (artist's model) | 50 m | | 50 m | No source | Never flew | A design, ship only |

A figure's `brief` is the words that must stay beside it wherever it is shown, and `figureWords` puts them together, so an announced figure cannot read as a measured one:

```ts
import { figureWords, variantOf } from "@johnmorrisdotca/uchusen-rockets";

figureWords(variantOf("starship", "v4").facts.height, " m"); // "142 m, announced, an estimate"
figureWords(variantOf("starship", "v1").firstFlight); // "2023-11-18, first with the ring"
figureWords(variantOf("starship", "v1-flight1").firstFlight); // "2023-04-20, Starship's first flight"
figureWords(variantOf("starship", "v4").firstFlight); // "Not flown"
```

Where sources disagree, the data keeps the one chosen and `others` says what else was said:

- **Block 3's booster.** 72.3 m was chosen. Wikipedia's table puts 81 m in the next cell, Block 4's: read without its colspans, it looks like Block 3's, which is how a site came to print 81 m for it. 81 m and 52.1 m do not make 124.4 m. SpaceX's own page, read only as a search engine quoted it, rounds to 72 m, 52 m and 124 m.
- **Block 2's height.** One article says 123.1 m and 123.3 m. 123.1 m is 71 m and 52.1 m.
- **Block 1 at its first flight.** Its article says 121 m, and its parts' own figures make 119.3 m. It is drawn to the parts.
- **Block 4.** Wikipedia marks 142 m an estimate in its infobox, and its table gives 81 m and 61 m, which add to it, with no mark. All three are announced plans.
- **Gunter's Space Page** gives one set of sizes for every version, so it is not used for sizes.

Every part's flaps, fins and chines are drawn from proportions, not from published figures: no source gives them. See `src/model/starship.ts`, whose table says which is which.

## Falcon 9

| Variant | Whole | First stage | Second stage | Fairing | First flew |
| --- | --- | --- | --- | --- | --- |
| `v1.0` | 54.9 m, to the fairing's top; 47.8 m with Dragon 1. One table says 53 m | 39.6 m, the stage alone | No source | No source | 2010-06-04 |
| `v1.1` | 68.4 m; 63.4 m with Dragon 1 | 41.2 m, the stage alone | No source | No source | 2013-09-29 |
| `ft` Full Thrust | 69.8 m; one table rounds to 70 m | 47.7 m with its interstage | 13.8 m | 13.1 m | 2015-12-22 |
| `block-5` Block 5 | 69.8 m; 65.7 m with Dragon 2, 63.7 m with Dragon 1. One table and SpaceX-API say 70 m | 47.7 m with its interstage | 13.8 m | 13.1 m | 2018-05-11 |
| `block-5-dragon-2` Block 5 with Dragon 2 | 65.7 m as stated; the parts add to 64.8 m | The same | The same | Trunk, capsule | 2019-03-02 |

All are 3.7 m across. The second stage's vacuum engine is drawn 3.3 m across at the end of its nozzle, the diameter Wikipedia's Merlin infobox gives for the vacuum engine (0.92 m at sea level); the v1.0's Merlin 1C Vacuum has no source here and keeps a narrower drawn bell. Block 4 first flew on 2017-08-14, and neither the Falcon 9 article nor the Full Thrust article gives it sizes of its own, so it is not listed apart. The Full Thrust article's infobox says 71 m with a fairing, citing SpaceX's user's guide, and its own Block 5 box says 69.8 m. `SpaceX-API` (Apache-2.0, archived in 2024) has one row for Falcon 9 and one for Falcon Heavy, not one per version, read from its repository's docs. It gives the fairing's 13.1 m; the Falcon 9 article rounds that to 13 m.

## Falcon Heavy, Dragon and Grasshopper

| Rocket | Whole | Across | First flew | Note |
| --- | --- | --- | --- | --- |
| `falcon-heavy` | 70 m | 12.2 m over its three cores, 3.7 m each | 2018-02-06 | Its painted model is one shell from the centre core to the fairing, so those stay one part. A side booster's height has no source and is drawn from the model |
| `dragon` `dragon-1` Dragon 1 | 6.1 m | 3.7 m | 2010-12-08 | The original cargo Dragon, with solar wings. Not the later Cargo Dragon 2 |
| `dragon` `dragon-2` Dragon 2 | 8.1 m; capsule 4.5 m | 4 m | 2019-03-02 | Crew Dragon, with windows |
| `dragon` `cargo-dragon-2` Cargo Dragon 2 | 8.1 m; capsule 4.5 m | 4 m | 2020-12-06 | No windows and no SuperDraco abort engines. Its article gives one set of sizes for both versions of Dragon 2 |
| `grasshopper` | 32 m | No source | 2012-09-21, a 1.8 m hop | A test vehicle, retired on 2013-10-07 |

## Falcon 1

| Variant | Whole | Fairing | Across | First flew | Status |
| --- | --- | --- | --- | --- | --- |
| `falcon-1` | 21.3 m (70 feet), SpaceX's guide; Wikipedia's infobox says 21 m, its table 21.3 m and 22.25 m | 3.5 m, 1.54 m across | 1.7 m; the guide says 5.5 feet | 2006-03-24 | Flown, five times |
| `falcon-1e` | 27.4 m (90 feet), announced; Wikipedia's table says 26.83 m | 4.4 m, 1.7 m across, announced | 1.7 m, announced | Never flew | Announced, never flown |

No source read here gives a stage's own length, so those are blank and drawn in proportion to the whole.

## Saturn V

| Variant | Whole | S-IC | S-II | S-IVB | Across | First flew |
| --- | --- | --- | --- | --- | --- | --- |
| `saturn-v` | 110.64 m (363 feet), with the Apollo spacecraft | 42.06 m | 24.87 m | 17.86 m | 10.06 m (33 feet); the third stage 6.6 m | 1967-11-09 |

The figures are the article's feet in metres, and each note keeps the feet. The adapter is added from two articles, the service module's 7.49 m includes its nozzle, and the capsule is 3.48 m. The escape tower has no size in a source read here, so it is what the whole leaves. The lunar module is hidden in the adapter and is not drawn.

## Space Shuttle

| Variant | Whole | External tank | Solid rocket booster | Orbiter | First flew |
| --- | --- | --- | --- | --- | --- |
| `stack` | 56 m, stacked | 46.88 m (153.8 feet), 8.41 m across (the Space Shuttle article says 8.7 m) | 45.46 m (149.16 feet), 3.71 m across | 37.24 m long, 23.79 m span | 1981-04-12 |

No source read here says where the parts stand against each other, so the gaps and the orbiter's outline are judged from photographs. Its front view is the orbiter's belly side, behind the tank.

## Space Launch System

| Variant | Whole | Core stage | Booster | Service module | Crew module | First flew |
| --- | --- | --- | --- | --- | --- | --- |
| `block-1` | 98.15 m (322 feet) | 64.6 m, 8.41 m across | 53.95 m (177 feet), 3.71 m across; its article rounds to 12 feet | 3.96 m (13 feet) | 3.3 m, 5.03 m across | 2022-11-16 |

No source read here gives the upper stage or the abort tower a length, so they share what the whole leaves.

## New Glenn

| Variant | Whole | First stage | Second stage | Across | First flew |
| --- | --- | --- | --- | --- | --- |
| `7x2` | 98 m | 57.5 m | 23.4 m | 7 m | 2025-01-16 |

The fairing has no length in a source read here, so it is what the whole leaves. The 9×4 is not listed: its article gives it only as about 400 feet, with no parts.

## Electron

| Variant | Whole | First stage | Second stage | Fairing | Across | First flew |
| --- | --- | --- | --- | --- | --- | --- |
| `electron` | 18 m | 12.1 m | 2.4 m | 2.5 m | 1.2 m | 2017-05-25 |

The parts add to 17 m, and no source read here says what the other metre is: it is drawn as an interstage, with no size of its own.

## Still to come

`PLANNED_ROCKETS` lists rockets with no mesh yet, with sourced facts and no shape.
