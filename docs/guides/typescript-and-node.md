---
title: TypeScript and Node
section: how-to
order: 10
description: Use the package's types in TypeScript and its core in Node, with no DOM and no three.js, as examples that are type-checked and run.
---

The package ships its own types, so TypeScript needs nothing more. The root and `/build` entries import neither three.js nor the DOM, so they run in Node, a worker or a build step. Each example is a file in [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples) that `pnpm test:usage` type-checks in strict mode against the package as npm packs it, runs with Node, and holds on this page word for word.

## TypeScript

```ts
import { check, variantOf, type Description, type FitReport, type LookName, type Variant } from "@johnmorrisdotca/uchusen-rockets";
import { build, type Built } from "@johnmorrisdotca/uchusen-rockets/build";
import type { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/element";

const description: Description = { rocket: "starship", variant: "v3" };
const report: FitReport = check(description);
const v3: Variant | undefined = variantOf("starship", "v3");
const rocket: Built = build(description);
console.log(report.ok, v3?.name, rocket.shows.length);

export function paint(element: UchusenRocket): void {
  element.setAttribute("look", "painted");
}

// @ts-expect-error "neon" is not a look
export const look: LookName = "neon";
```

`check` and `build` take the same `Description`, and the last line is a type error on purpose: `"neon"` is not a look.

## Node

A server draws the same SVG a browser does, and reads the same sourced figures.

```js
import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

// A server draws the same SVG a browser does: pure, no DOM, no three.js.
const rocket = build({ rocket: "falcon-9", variant: "block-5" });
const svg = rocket.svg({ look: "thick", view: "front" });
const height = variantOf("falcon-9", "block-5")?.facts.height;
console.log(svg.startsWith("<svg"), height?.value, "m, from", height?.source ? SOURCES[height.source].publisher : "no source");
```

`rocket.glb()` gives the mesh's bytes the same way. [Build a rocket from parts](build-from-parts.md) has the details.
