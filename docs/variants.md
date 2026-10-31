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

## Still to come

`PLANNED_ROCKETS` lists rockets with no mesh yet, with sourced facts and no shape.
