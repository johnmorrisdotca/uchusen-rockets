---
title: Architecture
section: explanation
order: 11
description: How the data, the part records, the drawing, the mesh and the element fit together, and why none of them can disagree.
---

The package is built so that a number is typed once. A mesh, a drawing and the table beside them are made from the same sourced figures, so they cannot disagree.

## The layers

| Layer | Where | Depends on |
| --- | --- | --- |
| Data | `src/data/` | Nothing. Figures with sources, variants, flights, credits. |
| Part records | `src/parts.ts`, `src/model/registry.ts` | Data. One record for every part. |
| Pieces | `src/model/` | Part records. Plain geometry from sourced sizes: lathes, boxes, rings. |
| Meshes | `src/build/glb.ts` | Pieces. Triangles and a `.glb` file. |
| Drawings | `src/draw/` | Pieces. SVG from the same pieces. |
| Rules | `src/fit.ts`, `src/layout.ts`, `src/framing.ts`, `src/looks.ts`, `src/flight.ts` | Part records. Pure functions. |
| The element | `src/element.ts`, `src/element/` | All of the above, and three.js for a 3D view only. |

The root and `build` entries import neither three.js nor the DOM. The element loads three.js only for a 3D view, so a page of drawings never fetches it.

## A part is a table of numbers

A change of block is a change of numbers, for example in `src/model/starship.ts`. The same pieces become a mesh and a drawing, which is why they cannot disagree. A part's record holds its real size in metres, the joints it mates at, and where its shape came from.

```ts
import { PART_ENTRIES } from "@johnmorrisdotca/uchusen-rockets";

const kinds = new Map<string, number>();
for (const { record } of PART_ENTRIES) kinds.set(record.kind, (kinds.get(record.kind) ?? 0) + 1);
console.log(PART_ENTRIES.length, "parts;", Object.fromEntries(kinds));
```

## A mesh is a pure function of its description

No clock, no unseeded random number. The same description gives the same bytes, and a test holds it. The same goes for a drawing.

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const a = build({ rocket: "falcon-9", variant: "block-5" }).glb().bytes;
const b = build({ rocket: "falcon-9", variant: "block-5" }).glb().bytes;
console.log(a.length === b.length && a.every((byte, i) => byte === b[i]));
```

## A look is one table entry

`LOOKS` changes lines, colours and fills, never a shape. So every look works for every variant, together, apart and each part alone, with no special cases.

## The element

The drawing shows first, made by code. When the element is on screen and the browser can draw WebGL, it loads three.js and takes over with a cross-fade (`CROSSFADE_MS`). If WebGL is missing, or the context is lost, the drawing takes over again. The element then draws only while something moves, and gives its WebGL context back after 30 seconds out of sight.

The canvas is the element's size times the screen's pixel ratio, held by `pixelRatioFor` to a ratio of 2, to 4096 pixels a side and to 6 million pixels in all.

```ts
import { MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor } from "@johnmorrisdotca/uchusen-rockets";

console.log(MAX_RATIO, MAX_SIDE, MAX_PIXELS, pixelRatioFor(2560, 1440, 2));
```

## Nothing from outside is trusted

Every attribute is read as text and checked against a table. An unknown rocket, variant or part is refused by name, and an unknown look, view or show falls back to the default (`cleanLook`, `cleanView`, `cleanShow`). A new option that reaches markup has a test with a hostile value.

## Adding a rocket

Add its variants to `src/data/`, its parts to `src/model/registry.ts` with pieces from plain geometry, and its row to `ROCKETS`. Nothing else changes: the element, the drawing, the fit check and the demo read those. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the rules a figure and a model must meet.
