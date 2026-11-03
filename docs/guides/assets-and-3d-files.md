---
title: Ready files and 3D models
section: how-to
order: 9
description: Use the shipped .glb and .svg files directly, make your own with build, and know what is inside them.
---

The package ships ready files under `@johnmorrisdotca/uchusen-rockets/assets/`: a `.glb` mesh and a set of `.svg` drawings for every rocket, variant and part. Use them when you do not want the element, or want to take a rocket into other software.

## What is there

| File | What |
| --- | --- |
| `starship-v3.glb` | A rocket's code-made mesh, its parts as nodes named for their slots (`booster`, `ship`), with the line looks' lines as line primitives. |
| `starship-v3-booster.glb`, `starship-v3-ship.glb` | Each part on its own. |
| `starship-v3.svg`, `starship-v3.thick.svg`, `starship-v3.painted.svg` | Together, in each look. |
| `starship-v3-apart.svg`, `starship-v3-booster.svg` | Apart, and one part. |
| `parts/raptor-vacuum.glb` | A small part. |
| `models/starship-v3-booster.glb` | A painted model, under CC BY 4.0. |

Everything is in metres, Y up, the base of a part on its axis, the windward side towards +Z. Positions and normals are packed with `KHR_mesh_quantization`, which three.js and other viewers read with no decoder.

## Use one directly

```html
Picture: [Starship Block 3](https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets@0/dist/assets/starship-v3.svg)
```

`assetPathOf(options)` gives the path of a file for a set of options, or `null` when none is shipped for them.

```ts
import { assetPathOf } from "@johnmorrisdotca/uchusen-rockets";

console.log(assetPathOf({ rocket: "falcon-9", variant: "block-5", show: "apart", look: "thick" }));
console.log(assetPathOf({ rocket: "falcon-9", variant: "block-5", view: "side" }));
```

## Make your own

`build` makes the same bytes, in Node or a browser, with no dependency. The same description always gives the same bytes: no clock, no random number.

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const rocket = build({ rocket: "saturn-v" });
const glb = rocket.glb();
console.log(glb.bytes.length, "bytes,", glb.triangles, "triangles");
console.log(rocket.svg({ look: "painted", view: "side" }).length, "characters of SVG");
```

Write the bytes to a file in Node with `writeFileSync("saturn-v.glb", glb.bytes)`.

## Size budgets

A code-made mesh stays under 600 KB and a drawing under 80 KB, in every look. A painted model stays under 8 MB and is loaded only when the painted look asks for it. A browser test measures what each scene costs.

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const size = build({ rocket: "starship", variant: "v4" }).glb().bytes.length;
console.log(size < 600_000);
```

## Painted models and their credit

The files in `models/` come from other people's licensed work. A painted rocket must carry the credit of the parts showing, and `check(description).credits` says which belong to a rocket. [Licences and credits](licences-and-credits.md) has the rules.
