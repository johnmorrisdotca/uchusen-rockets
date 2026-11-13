# Build from parts

Every part from every source has the same record: its real size, an origin and named joints, all in metres at real scale. A part's origin is the middle of its base on its axis, Y is up and the windward side faces +Z. There is one material naming scheme, so a part from anywhere looks as if it belongs.

```ts
import { check, partEntry } from "@johnmorrisdotca/uchusen-rockets";

const ship = partEntry("starship-v3-ship").record;
ship.height; // 52.1
ship.joints.bottom.diameter; // 9

const real = check({ rocket: "starship", variant: "v3" });
real.ok; // true
real.custom; // false
real.label; // "Block 3 (V3)"
real.credits[0].creator; // "Clarence365"
```

A description names a rocket and a variant, and may put another part in a slot. The check reads only the records. A mix that fits is built, and is labelled as what it is: never a vehicle that flew.

```ts
import { check } from "@johnmorrisdotca/uchusen-rockets";

const mix = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } });
mix.ok; // true
mix.custom; // true
mix.label.startsWith("Custom build"); // true

const wrong = check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } });
wrong.ok; // false
wrong.issues[0].code; // "wrong-kind"
```

`build` makes one mesh and one drawing from one description, and throws `FitError` when it does not fit. It needs no three.js.

```ts
import { build, buildPart } from "@johnmorrisdotca/uchusen-rockets/build";

const rocket = build({ rocket: "starship", variant: "v3" });
rocket.shows.join(); // "together,apart,booster,ship"
rocket.glb().bytes.length > 1000; // true
rocket.svg({ look: "thick", view: "below", show: "booster" }).startsWith("<svg"); // true
buildPart("raptor-vacuum").record.kind; // "engine"
```

## Which part comes from where

`record.painted` says which licensed model paints a part, and `record.drawnFrom` where its shape comes from.

| Part | Line and thick looks | Painted look |
| --- | --- | --- |
| Block 1, Block 2 and Block 4 | This package's code | This package's code. No model shows them |
| Block 1 as it first flew | This package's code | Clarence365's Ship 24 and Booster 7 |
| Block 3 | This package's code, its proportions measured from Clarence365's model | Clarence365's Block 3 |
| 2019 design | This package's code, its proportions measured from MartianDays' model | MartianDays' model |
| Falcon 9 v1.0, v1.1 and Full Thrust | This package's code | This package's code. No model shows them |
| Falcon 9 Block 5 | This package's code, its proportions taken from Stanley Creative's model | Stanley Creative's model. Its second stage has no nozzle, so this package's own shows with it, 3.3 m across at the exit (Wikipedia's Merlin infobox), when the stage is apart or alone and not when it is nested in the first stage |
| Dragon 2 | This package's code, its proportions taken from KUBAHA's model | KUBAHA's model |
| Cargo Dragon 2 | This package's code, on Dragon 2's sourced sizes, with no windows | This package's code. No model shows it |
| Inside Crew Dragon | This package's code, cut open; the inside judged from one published picture | This package's code |
| Dragon 1 | This package's code, its proportions taken from ProgressTH's model | ProgressTH's model |
| Falcon Heavy | This package's code, its proportions taken from Antonio_Adams's model | Antonio_Adams's low-poly model |
| Grasshopper | This package's code, its proportions taken from Echo_3's model | Echo_3's low-poly model |
| Falcon 1 and 1e | This package's code, from SpaceX's user's guide; the stages' share of the whole judged from photographs | This package's code. No model shows them |
| Saturn V, with the Apollo spacecraft | This package's code, from sourced sizes; the paint and the foot judged from photographs | This package's code. No model shows it, and no flag or lettering is drawn |
| Discovery | This package's own orbiter | The Smithsonian's scan, under CC0, with its marks painted out, 73,707 triangles and 2.6 MB |
| Space Shuttle | This package's code, from sourced sizes; the orbiter's outline and the gaps judged from photographs | NASA's models, with their marks painted out: orbiter 30,000 triangles and 842 KB, tank 6,326 and 153 KB, booster 4,136 and 123 KB |
| Space Launch System | This package's code, from sourced sizes; the upper stage's and the abort tower's lengths are what the whole leaves | This package's code. No model is used, and no name, flag or mark is drawn |
| Vulcan Centaur | This package's code, from sourced sizes; the adapter is what the whole leaves, and the engines, the boosters' place and the paint are judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Ariane 6 | This package's code, from sourced sizes; the two liquid stages are what the whole leaves, and the boosters' place, the engine's size and the paint are judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Atlas V | This package's code, from sourced sizes; the family's height is not this form's, and the changes of diameter are drawn inside the sourced lengths | This package's code. No model is used, and no name or mark is drawn |
| Delta IV Heavy | This package's code, from sourced sizes; the fairing is what the whole leaves, and where the cores stand, the engine sizes and the paint are judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| New Glenn | This package's code, from sourced sizes; the fairing is what the whole leaves, and the legs, strakes and paint are judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Electron | This package's code, from sourced sizes; the metre the sources leave over is drawn as an interstage | This package's code. No model is used, and no name or mark is drawn |
| Soyuz-2 | This package's code, from sourced sizes; the waist, the boosters' lean, the fairing and the paint judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Drone ships and landing zones | This package's code; hull, equipment and legs judged from photographs | This package's code. No name, mark or logo is drawn |
| Launch tower | This package's code; the height and lightning rod from the FAA, the rest judged from photographs | This package's code, with Block 3 painted by this package's code here to keep the scene light. No lettering or mark is drawn |
| Apollo lunar module | This package's plain shapes, from sourced sizes, where its parts stand measured from NASA's model | NASA's model, its flag and name removed: 59,949 triangles and 972 KB in two files |
| Apollo and Soyuz | This package's plain shapes, from sourced sizes, where their parts begin measured from NASA's model | NASA's model, flags and names painted out: 29,314 triangles and 497 KB in three files |
| Gemini | This package's plain shapes, from sourced sizes, where the adapter ends measured from NASA's model | NASA's model, flag and name painted out: 27,007 triangles and 548 KB in two files |
| Mercury, Friendship 7 | This package's plain shape, from sourced sizes | NASA's model, its colours judged from photographs: 40,000 triangles and 591 KB |
| Jupiter-C | This package's plain shapes, from sourced sizes, where each stage begins measured from NASA's model | NASA's model, its lettering removed, cut into its four stages by its own named objects: 8,471 triangles and 140 KB in four files |
| International Space Station | This package's plain shapes, from sourced sizes, where each part stands measured from NASA's model | NASA's model, its colours judged from photographs, cut into 27 parts by where each stands: 76,940 triangles and 1,378 KB in 27 files |
| Tiangong 天宮 | This package's plain shapes, from the sourced lengths and widths of each module and craft; where the ports and the wings stand judged from w29572227's model and photographs | w29572227's model, its flags and mark left out, each module at its own sourced size, cut into ten parts: 105,529 triangles and 2,130 KB in ten files |
| Hubble Space Telescope | This package's plain shapes, from sourced sizes, where each part begins and its arrays and antennas stand measured from Cybertron B-127's model | Cybertron B-127's model, its wordmark and logos painted out and its door turned shut, cut into nine parts: 21,688 triangles and 1,243 KB in nine files |
| Roadster, with Starman | This package's plain shapes, the car's length, wheels and seat measured from each model at its sourced scale; Starman this package's own | The 86 guy's model of the first generation: 38,517 triangles and 547 KB. Two models of the second generation, metarex.4d's (77,622 triangles and 1,272 KB) and Michael's with minchou19's wheels (39,191 triangles and 1,092 KB). Badges and lettering left out of all three; Starman is this package's own in every look |
| Voyager | This package's plain shape, from the sourced antenna, bus, height and magnetometer boom | NASA's model, the record's marked face removed, scaled so the antenna is 3.7 m: 4,529 triangles and 74 KB |
| Juno | This package's plain shape, from the sourced body, span and array width | NASA's model, scaled so the arrays span 20 m: 5,710 triangles and 97 KB |
| James Webb Space Telescope | This package's plain shape, from the sourced sunshield and the 6.5 m mirror | NASA's model, scaled so the sunshield's long side is 21.197 m: 18,599 triangles and 281 KB |
| Parker Solar Probe | This package's plain shape, from the sourced height, body and heat shield | NASA's model, its pictures left out, scaled so the heat shield is 2.4 m, with the loose pieces under 7 cm left out: 3,366 triangles and 59 KB |
| Cassini | This package's plain shape, from the sourced height and antenna | NASA's model, its pictures left out, scaled so the antenna is 4 m: 5,968 triangles and 99 KB |
| Galileo | This package's plain shape, from the sourced height and magnetometer boom | NASA's model, scaled so its longest side is the 11 m boom: 4,857 triangles and 70 KB |
| Pioneer | This package's plain shape, from the sourced antenna and magnetometer boom | NASA's model, its pictures left out, the antenna already 2.74 m: 3,992 triangles and 74 KB |
| New Horizons | This package's plain shape, from the sourced body and antenna | NASA's model, its pictures left out, scaled so the antenna is 2.1 m: 5,999 triangles and 92 KB |
| Europa Clipper | This package's plain shape, from the sourced span and antenna | NASA VTAD's model, its pictures left out, scaled so the arrays span about 30 m: 14,942 triangles and 223 KB |
| Starbase | This package's code: places, outlines and the map's heights from OpenStreetMap | This package's code. No lettering or logo |

Parts belong to one interface, so one rocket can use another's: Falcon 9 `block-5-dragon-2` is Block 5's own stages and Dragon 2's own capsule and trunk, joined at their joints, and its credits name both authors.

## A new rocket

Its variants go in `src/data/`, its parts in `src/model/registry.ts` with pieces of plain geometry, and a row in `ROCKETS`. Nothing else changes. A rocket drawn wholly by this package's code is a table: see `src/model/falcon1.ts`, with the small shapes of `src/model/kit.ts`.

## The demo's builder

`builderState(picks)` is what the demo's builder offers: rows from the bottom up, for parts of every rocket. Each row holds only what fits on the row below, so nothing it offers can fail. A row with one answer, like a Falcon Heavy's side boosters, is answered for the reader; a part placed beside the stack stands only by its own foot, and a row offers only what can still be finished. A change lower down keeps what still fits and picks what belongs with it for the rest. A real set of parts takes its real name, and anything else says it is a custom build. It reads only `ROCKETS` and `PART_ENTRIES`, so a new rocket is offered with no change.

```ts
import { builderState } from "@johnmorrisdotca/uchusen-rockets";

const { rows, report, description } = builderState(["falcon-9-block-5-first-stage"]);
rows[1].chosen; // "falcon-9-block-5-second-stage"
report.label; // "Falcon 9 Block 5"
description.rocket; // "falcon-9"
builderState(["falcon-heavy-falcon-heavy-centre"]).rows[1].auto; // true
```
