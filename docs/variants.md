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
| `v1.0-dragon` Falcon 9 v1.0 with Dragon 1 | 47.8 m as stated, with Dragon 1 and no fairing; the parts are drawn to more | 39.6 m, the stage alone | No source | Trunk, capsule | 2010-12-08 |
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
| `dragon` `crew-dragon-inside` Inside Crew Dragon | 4.5 m | 4 m | 2019-03-02 | Cut open, with a person of 1.8 m for scale. Four seats, the three-screen panel, the cargo and 9.3 cubic metres under pressure are from its article; their sizes and places have no source and are judged from one published picture of the cabin |
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

`stack` is painted by NASA's own models, each its part's sourced length, with every mark painted out and the orbiter's bay shut.

`discovery` is a real orbiter, the Smithsonian's scan, in its own variant: 37.24 m and first flown on 1984-08-30. Painted, it has its gear down as it stands on display, with plain patches where its marks and names are painted out. Its line looks are this package's own orbiter.

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

## Soyuz

| Variant | Whole | Block A, the core | Booster | Block I, third stage | Across | First flew |
| --- | --- | --- | --- | --- | --- | --- |
| `soyuz-2` | 46.3 m | 27.1 m, 2.95 m across | 19.6 m, 2.68 m across | 6.7 m, 2.66 m across | 10.3 m over the fins | 2004-11-08 |

The fairing's length is what the whole leaves, here a plain one. The waist and the boosters' lean are judged from photographs.

## Drone ships and landing zones

Each is drawn with a Falcon 9 Block 5 first stage standing on it, legs out, as its own part: `show="deck"` or `show="pad"` leaves it out.

| Variant | Size | In service |
| --- | --- | --- |
| `droneship` `ocisly` Of Course I Still Love You | Deck 91.44 by 51.82 m: 300 by 170 feet for the first barge of its kind, and its article says this one is nearly identical | June 2015 |
| `droneship` `jrti` Just Read the Instructions | No source for this ship; drawn at the same size | 2016-01-17, first use |
| `droneship` `asog` A Shortfall of Gravitas | No source for this ship; drawn at the same size | 2021-07-09, first sea trials |
| `landing-zone` `lz-1` Cape Canaveral | 85.95 m across (282 feet) | 2015-12-22, first landing |
| `landing-zone` `lz-4` Vandenberg | No source; drawn at LZ-1's size | 2018, landings began |

No name, target mark or logo is drawn: each deck and pad has a plain ring.

## Launch tower

| Variant | Tower | What is on it | First |
| --- | --- | --- | --- |
| `tower` | About 146.3 m (480 feet) with a 10-foot lightning rod, from the FAA's 2022 assessment; Wikipedia gives 479 feet | The mount and the arms | 2021-07, first tower fully stacked |
| `stack` | The same | Block 3 stacked on the mount | |
| `catch` | The same | The arms closed under Block 3's booster's grid fins, as on Flight 5 | 2024-10-13, first catch |

The tower's 13 m footprint is OpenStreetMap's. No source read here gives the arms' length or the mount's size, so those are judged from photographs. Its nine sections are Wikipedia's. The arms are a part: `check({ rocket: "launch-tower", variant: "stack", parts: { arms: "launch-tower-catch-arms" } })` is a custom build, and it says so.

## Starbase

A scene, built from OpenStreetMap's places and outlines (`© OpenStreetMap contributors`, ODbL, a handful of named places, read 2026-11-02). A building is one plain box, with no lettering or logo. Nothing announced is shown, and no concept picture was used.

| Variant | What | Sizes |
| --- | --- | --- |
| `launch-site` | Two towers and their mounts, the tank farm and the beach, with a plain rocket at Block 3's size on the first pad | 348 m between the towers; farm 314 by 78 m |
| `build-site` | The Mega Bays, Starfactory's outer outline, the rocket garden on the Sanchez site and a plain board at the sign's place | Mega Bay 54 by 38 m and 100 m tall, the map's height tag; Starfactory 293 by 327 m and 16.3 m tall |
| `city` | All of it, along the highway, with a few plain houses at the village | About 3.5 km end to end |

These are mappers' figures, not surveys. The tanks' and houses' numbers are not counts.

## Apollo lunar module

`lunar-module`: 7.04 m tall, 9.4 m across with its landing gear out, first flown on 1968-01-22. Its article gives the descent stage as 3.231 m and the ascent stage as 2.832 m; NASA's model is cut where its parts meet, so each is drawn taller, with what stands on it. Painted, it is NASA's model; its line looks are this package's own plain shapes.

## Apollo and Soyuz

`apollo-soyuz`: Apollo (11 m, 3.9 m across) docked to Soyuz (7.48 m, 2.72 m across) as flown on 1975-07-15, stood on end with Apollo's engine down. No source read here gives the docking module's size or the length of the three docked, so it is drawn at Apollo's scale and the whole is what they add to. Painted, it is NASA's model; its line looks are this package's own plain shapes.

## Gemini

`gemini`: 5.61 m long and 3 m wide, first flown on 1964-04-08, uncrewed, and with a crew on 1965-03-23. No source read here gives where the adapter ends: that is measured from NASA's model. Painted, it is NASA's model; its line looks are this package's own plain shapes.

## Mercury

`friendship-7`: the Mercury spacecraft, 3.3 m long without its escape tower and 1.8 m wide, as flown on 1962-02-20. Those are two scales, 19% apart, because NASA's file is stouter than its sources. NASA's copy leaves its materials all one grey, so their colours are judged from photographs. Its line looks are this package's own plain shape.

## Jupiter-C

`jupiter-c`: 21.3 m tall and 1.8 m across, first flown on 1956-09-20, as four stages in slots: `tail` (the tail unit with its four fins), `first-stage` (the Redstone body), `tub` (the spinning tub with stages 2 and 3) and `fourth-stage` (the top stage with Explorer 1, as NASA's model shows it). Its article gives no stage lengths, so where each begins is measured from NASA's model at the sourced height, and each stage's figure is blank with the model's length in its note. Painted, it is NASA's model with its lettering removed, one file a stage; its line looks are this package's own plain shapes.

## International Space Station

`iss`: 109 m long overall and 73 m across its solar arrays, its first module launched on 1998-11-20. NASA's model is scaled to the 109 m, and its arrays then span 71.7 m. It shows the station as it was when the model was made, not today's. NASA's copy leaves its materials all one grey, so their colours are judged from photographs. Its line looks are this package's own plain shapes.

It is 27 parts in slots, each cut from NASA's model by where it stands and painted by its own file: the module run stacks up the axis from Zvezda's aft (`zvezda`, `zarya`, `unity` with PMA-1, `destiny`, `harmony` with PMA-2), and the rest are placed: four visiting craft (`soyuz-aft`, `soyuz-zvezda-nadir`, `soyuz-zvezda-zenith`, `soyuz-zarya-nadir`, Soyuz or Progress as the model draws them), the `airlock` where the model hangs it under Unity, `columbus` and `kibo` across Harmony, the nine truss segments (`truss-s0`, `truss-s1`, `truss-p1`, `truss-s3-s4`, `truss-p3-p4`, `truss-s5`, `truss-p5`, `truss-s6`, `truss-p6`), four pairs of arrays (`arrays-s4`, `arrays-p4`, `arrays-s6`, `arrays-p6`) and the `radiators-starboard` and `radiators-port`. A module's drawn length is the model's at the station's scale; its article's figure stands beside it in the note, and in `facts.more` (`zvezda-length`, `destiny-length` and so on). A part that lies out from the run has its width as its height.

## Tiangong 天宮

`tiangong`: China's station, 55.6 m long and 39 m across as its article gives it, its first module launched on 2021-04-29. It stands on end like the ISS, Tianhe's axis up and its aft at the foot, so its height here is the laboratories' wings tip to tip and its width is across the two laboratories. Ten parts in slots, each drawn from its own published dimensions: `tianhe` (the core module's body, 4.2 m across) and `hub` (its docking node) stack up the axis with `shenzhou-forward` (9.25 m by 2.8 m, with its 17 m wings) at the forward port; `tianzhou` (10.6 m by 3.35 m, with its 14.9 m wings) hangs under the aft port; `wentian` and `mengtian` (17.9 m by 4.2 m each) lie out from the node, Wentian to the left; `wentian-arrays` and `mengtian-arrays` are each laboratory's two wings, over 55 m tip to tip and 110 m² each; `tianhe-arrays` are Tianhe's own, with no size in a source read here; and `shenzhou-nadir` lies out from the nadir port. Painted, it is w29572227's model with its flags and agency mark left out, one file a part, each at its own sourced size; its line looks are this package's own plain shapes.

## Hubble Space Telescope

`hubble`: 13.2 m by 4.2 m, launched on 1990-04-24, as nine parts in slots: `aft-shroud`, `equipment-section`, `forward-shell`, `light-shield` and `aperture-door` stack up the axis, `array-left` and `array-right` lie out from the forward shell along X, and `antenna-near` and `antenna-far` along Z. Its parts' lengths and its arrays' size have no figure in a source read here: they are the licensed model's, at the sourced length and width, each a blank with the model's figure in its note. Painted, it is Cybertron B-127's model with its wordmark and logos painted out and its door turned shut, one file a part; its line looks are this package's own plain shapes.

## Roadster

`first-generation`: the car Falcon Heavy carried on its test flight, launched on 2018-02-06 at 20:45 UTC from Kennedy LC-39A, about 1,300 kg, with Starman, a mannequin in a pressure suit, in the driver's seat. Its article calls it a 2010 car of the first generation. The first generation is 3,946 mm long, 1,873 mm wide and 1,127 mm high with its roof on, on a 2,352 mm wheelbase; the model, its author's 2008 car of the same generation, is scaled to that length, and the small differences between the years are not drawn. It flew with its roof off and its bonnet bare carbon, and is drawn so. Its orbit round the Sun, from the same article at the epoch of 1 May 2018: 0.98613 to 1.6637 astronomical units, once in 1.525 years. No source gives Starman's size: he is drawn at a grown man's size, seated, in a white suit with dark trim and a white helmet with a dark visor, his right hand on the wheel and his left arm on the door. He is this package's own shapes in every look and shares the car's origin, so he sits in the seat of whichever car he is built with.

`second-generation` and `second-generation-2`: two models of the second generation, by two authors, the second with a third author's wheels. It was shown as a prototype on 2017-11-16 and has not been produced or flown. Its article gives only its wheelbase, 2,825 mm, and its width as about 2,000 mm: each model is scaled to the wheelbase, and its length and height are the model's. They are painted the first generation's red under the same materials, so the three compare under one light, and Starman sits in them for comparison only. metarex.4d's model has no picture: its lamps, glass and wheels are modelled, each in one of the shared materials. Michael's body is one baked picture, its white made the shared red, on minchou19's modelled wheels.

Falcon Heavy's `test-flight` is the same vehicle as `falcon-heavy` with the first-generation car and Starman in its `car` and `starman` slots, standing level inside the fairing. The car was mounted inclined above its payload adapter; the adapter is not drawn. Together the fairing hides them, as it did; apart they stand beside the cores, and `form="space"` shows the two alone. In space the car stayed on the upper stage, which the painted model has as one shell with the centre core, so it is not drawn there.
## Voyager

`voyager`: one model for Voyager 1 and Voyager 2, launched in 1977. The high-gain antenna is 3.7 m across, the bus about 1.8 m across, the spacecraft about 3.8 m from the reflector to the feet, and the magnetometer boom 13 m, all from NASA's questions page. Painted, it is NASA's model scaled so the antenna is 3.7 m; at that scale the file stands 7.74 m, because the booms rise past the dish. The record's marked face is left out. Its line look is this package's own plain shape. The 10 m antennas are not drawn: the page gives their length and not which way they point.

## Juno

`jwst`: launched on 2021-12-25. The sunshield is 21.197 m by 14.162 m and its layers span 4.8 m (the demo labels that row "Sunshield layers height", not the telescope's height), and the primary mirror is about 6.5 m across, from the fact sheet. Painted, it is NASA's model scaled so the sunshield's long side is 21.197 m; at that scale the file stands 11.36 m, and the shield is shorter across than 14.162 m. Its line look draws the sunshield at the sourced size and the 6.5 m mirror, and stands 4.8 m, the fact sheet's figure for the layers. No mark was on the model.

`parker-solar-probe`: the August 2018 press kit targets a launch on 2018-08-11. The spacecraft is about 3 m tall and about 1 m across below the cooling system. The heat shield is 8 feet (2.4 m) on the page about fitting it; the press kit says about 2.3 m. Painted, it is NASA's model scaled so the shield is 2.4 m; at that scale the file stands 2.20 m. Its pictures are left out, and so are the loose pieces under 7 cm, which floated round it as specks. Its line look uses the 3 m height, the 1 m body and the 2.4 m shield. No mark is drawn.

`cassini`: launched on 1997-10-15 with Huygens. The spacecraft is 6.8 m tall, the high-gain antenna is 4 m across, and the magnetometer boom is 11 m, from NASA's spacecraft sheet. Painted, it is NASA's model scaled so the antenna is 4 m; at that scale the file stands 11.64 m. Its pictures are left out. Its line look uses the 6.8 m height and the 4 m antenna.

`galileo`: launched on 1989-10-18. It is 5.3 m high, and the magnetometer boom extends 11 m to one side, from the mission page. Painted, it is NASA's model scaled so its longest side is that 11 m boom; the file stands 11.00 m. Its line look uses the 5.3 m height and the 11 m boom. No mark was on the model.

`pioneer`: one model for Pioneer 10 and Pioneer 11. Pioneer 10 launched on 1972-03-02. The high-gain antenna is 2.74 m across and the magnetometer boom is 6.6 m, from NASA's spacecraft record. The file's antenna is already 2.74 m, so it is not scaled further, and the file stands 8.25 m. Its pictures are left out. Its line look uses the 2.74 m antenna and the 6.6 m boom.

`juno`: launched on 2011-08-05. The body is about 3.5 m high and wide, and the solar arrays give an overall width exceeding 20 m, from the mission page. Each array is 8.9 m by 2.65 m in the deployment-test caption, and the mission page says each extends about 9 m from the body. Painted, it is NASA's model scaled so the arrays' tip-to-tip is 20 m; at that scale the file stands 6.89 m. Its line look reaches that 20 m span, so each array is drawn 9.8 m from the body, and the antenna is drawn 3.46 m across from the model, because no source read here gives the antenna's diameter. No mark was on the model.

## Whose each one is

Each row of `ROCKETS` has a `maker`, one of the keys of `MAKERS`, and `madeBy`, what its source says, with the companies that built it where the source names them. The demo lists rockets under their maker. A site has the maker `sites` and a blank `madeBy`: its maker has not been read.

```ts
import { MAKERS, ROCKETS } from "@johnmorrisdotca/uchusen-rockets";

MAKERS[ROCKETS["new-glenn"].maker]; // "Blue Origin"
ROCKETS["new-glenn"].madeBy.value; // "Blue Origin"
ROCKETS.starbase.madeBy.value; // null
```

## Real flights

`FLIGHT_LOG` lists Falcon 1's five flights and Starship's fourteen with their dates, vehicles and outcomes, each with its source. It is a log, not a timeline: the flights that play are `FLIGHTS`, in [flights](flight.md).

```ts
import { flightLogOf } from "@johnmorrisdotca/uchusen-rockets";

const flight5 = flightLogOf("starship").find((flight) => flight.id === "starship-flight-5");
flight5.date; // "2024-10-13"
flight5.variant; // "v1"
```

## Still to come

`PLANNED_ROCKETS` lists rockets with no mesh yet, with sourced facts and no shape: Vulcan Centaur and Ariane 6.
