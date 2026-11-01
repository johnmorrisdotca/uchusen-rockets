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
| Dragon 1 | This package's code, its proportions taken from ProgressTH's model | ProgressTH's model |
| Falcon Heavy | This package's code, its proportions taken from Antonio_Adams's model | Antonio_Adams's low-poly model |
| Grasshopper | This package's code, its proportions taken from Echo_3's model | Echo_3's low-poly model |

Parts belong to one interface, so one rocket can use another's: Falcon 9 `block-5-dragon-2` is Block 5's own stages and Dragon 2's own capsule and trunk, joined at their joints, and its credits name both authors.

## A new rocket

Its variants go in `src/data/`, its parts in `src/model/registry.ts` with pieces of plain geometry, and a row in `ROCKETS`. Nothing else changes.
