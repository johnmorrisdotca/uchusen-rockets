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
| Discovery | This package's own orbiter | The Smithsonian's scan, under CC0, with its marks painted out, 116,672 triangles and 3.6 MB |
| Space Shuttle | This package's code, from sourced sizes; the orbiter's outline and the gaps judged from photographs | NASA's models, with their marks painted out: orbiter 30,000 triangles and 842 KB, tank 6,326 and 153 KB, booster 4,136 and 123 KB |
| Space Launch System | This package's code, from sourced sizes; the upper stage's and the abort tower's lengths are what the whole leaves | This package's code. No model is used, and no name, flag or mark is drawn |
| New Glenn | This package's code, from sourced sizes; the fairing is what the whole leaves, and the legs, strakes and paint are judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Electron | This package's code, from sourced sizes; the metre the sources leave over is drawn as an interstage | This package's code. No model is used, and no name or mark is drawn |
| Soyuz-2 | This package's code, from sourced sizes; the waist, the boosters' lean, the fairing and the paint judged from photographs | This package's code. No model is used, and no name or mark is drawn |
| Drone ships and landing zones | This package's code; hull, equipment and legs judged from photographs | This package's code. No name, mark or logo is drawn |
| Launch tower | This package's code; the height and lightning rod from the FAA, the rest judged from photographs | This package's code, with Block 3 painted by this package's code here to keep the scene light. No lettering or mark is drawn |
| Apollo lunar module | This package's plain shapes, from sourced sizes, where its parts stand measured from NASA's model | NASA's model, its flag and name removed: 59,949 triangles and 972 KB in two files |
| Apollo and Soyuz | This package's plain shapes, from sourced sizes, where their parts begin measured from NASA's model | NASA's model, flags and names painted out: 29,314 triangles and 497 KB in three files |
| Gemini | This package's plain shapes, from sourced sizes, where the adapter ends measured from NASA's model | NASA's model, flag and name painted out: 27,007 triangles and 548 KB in two files |
| Mercury, Friendship 7 | This package's plain shape, from sourced sizes | NASA's model, its colours judged from photographs: 40,000 triangles and 591 KB |
| Jupiter-C | This package's plain shapes, from sourced sizes | NASA's model, its lettering removed: 8,933 triangles and 136 KB |
| International Space Station | This package's plain shapes, from sourced sizes, where its arrays and modules stand measured from NASA's model | NASA's model, its colours judged from photographs: 60,701 triangles and 1,050 KB |
| Hubble Space Telescope | This package's plain shapes, from sourced sizes, its arrays and door measured from NASA's model | NASA's model, a lettered plate painted out: 7,672 triangles and 470 KB |
| Starbase | This package's code: places, outlines and the map's heights from OpenStreetMap | This package's code. No lettering or logo |

Parts belong to one interface, so one rocket can use another's: Falcon 9 `block-5-dragon-2` is Block 5's own stages and Dragon 2's own capsule and trunk, joined at their joints, and its credits name both authors.

## A new rocket

Its variants go in `src/data/`, its parts in `src/model/registry.ts` with pieces of plain geometry, and a row in `ROCKETS`. Nothing else changes. A rocket drawn wholly by this package's code is a table: see `src/model/falcon1.ts`, with the small shapes of `src/model/kit.ts`.
