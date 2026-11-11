---
title: Licences, credits and trademarks
section: explanation
order: 10
description: What is MIT, what is CC BY 4.0, what is public domain and ODbL, and how a rocket you show carries the right credit.
---

This package holds work under several licences, and the difference matters when you ship a painted rocket.

## Five kinds of work

| What | Licence |
| --- | --- |
| The code, the code-made meshes and the drawings | MIT |
| The painted models in `models/` | CC BY 4.0, except one under CC0 and NASA's, which are public domain |
| Starbase's coordinates, outlines and map heights, and the tower's 13 m footprint | © OpenStreetMap contributors, ODbL 1.0 |
| The launch log's data (`launches`) | CC BY 4.0, from GCAT by Jonathan C. McDowell |
| Nothing else from outside | Anything else must be MIT, ISC, BSD or Apache |

**The painted models are not MIT: using them means crediting them.** The package's own licence line reads `MIT AND CC-BY-4.0 AND ODbL-1.0` for that reason.

## Find the credit for what you show

`check(description).credits` lists every licensed model a rocket uses, with `usedFor` naming the parts. `creditLine(id)` writes one as a line of text. `MODEL_CREDITS` is the whole table.

```ts
import { check, creditLine } from "@johnmorrisdotca/uchusen-rockets";

const report = check({ rocket: "starship", variant: "v3" });
for (const credit of report.credits) console.log(credit.id, credit.licence, "-", creditLine(credit.id));
```

A rocket shown as one part credits that part only. A variant this package paints itself, like Starship Blocks 2 and 4, needs no credit because no licensed model is used: no model is stretched to stand in for another version.

## Embeds carry the credit for you

`embedCode` writes the credit into every painted form, and `paintedCredit` gives the line on its own, so a page can print it beside the picture.

```ts
import { embedCode, paintedCredit } from "@johnmorrisdotca/uchusen-rockets";

const options = { rocket: "falcon-9", variant: "block-5", look: "painted" };
console.log(paintedCredit(options));
console.log(embedCode(options, "element").includes("Stanley"));
```

If you save a picture or a file yourself, keep the credit with it.

## NASA's models

NASA's models are named as the source, as its guidelines ask, with no suggestion that NASA endorses this package. No NASA logo, insignia, flag or lettering is shipped. `NOTICE.md` says what that rests on.

## The demo site's pictures

The demo site shows more than the package ships: the Earth behind a rocket, the planets and moons on the journey page, and the map of Starbase. Their credits are in `NOTICE.md`, and every demo page links to it in its footer, with a short line of who is credited. The Earth's pictures are NASA's, through `@johnmorrisdotca/chikyu-earth`. The planets' and moons' pictures come from `@johnmorrisdotca/wakusei-planets`, which names each source and licence in its own `NOTICE.md`. Starbase's map is © OpenStreetMap contributors, under the ODbL.

The launch log (the `launches` entry, see [the launch log](launch-log.md)) is data from GCAT, the General Catalog of Artificial Space Objects by Jonathan C. McDowell, under CC BY 4.0, not MIT. Whatever shows it must credit it: Data from GCAT (J. McDowell, planet4589.org/space/gcat).

## No logos, no marks, no flags

No mesh or drawing carries a maker's logo, wordmark, flag or printed name. A test (`test/legal.test.ts`) holds it on the generated files and on the models. Rocket names appear only as plain descriptive words. All trademarks belong to their owners, and this project is not affiliated with or endorsed by SpaceX, NASA or any other maker or agency named. See [NOTICE.md](../../NOTICE.md) for each source and what was changed.

## Adding a model

A new licensed model needs a row in `NOTICE.md`, its licence read from its own files, and its page checked for any notice against use. Remove marks first; credit the author with what was changed. That rule is in [CONTRIBUTING.md](../../CONTRIBUTING.md).
