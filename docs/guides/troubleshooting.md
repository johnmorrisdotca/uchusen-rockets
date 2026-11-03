---
title: Troubleshooting
section: troubleshooting
order: 12
description: Why the tag does nothing, why the 3D view does not appear, why a painted model is missing, and what the errors mean.
---

## The tag shows nothing

`<uchusen-rocket>` is defined by importing the element. Check the page imports `@johnmorrisdotca/uchusen-rockets/element` once, as a module (`type="module"`). Without it the tag is an empty box.

## The drawing shows but the 3D view never comes

The drawing is a fallback by design. The 3D view needs WebGL and three.js. Look at `data-state` on the element: `picture` (waiting), `loading`, `3d`, `fallback` (no WebGL, so the drawing stays) or `error`.

- **No import map** (CDN page): the browser cannot find `three`. Add the import map from [Getting started](getting-started.md).
- **three.js missing** (bundler): install it. It is an optional peer dependency, `>=0.170.0`.
- **`mode="drawing"`** is set: that attribute keeps the drawing and never loads three.js.
- **Save-Data** is on in the browser: the drawing stays by design.
- **Reduced motion** does not stop the 3D view; it stops the spin, the flames and animated moves.

## A painted rocket looks plain

A licensed model is fetched only when the painted look asks for it. Until it is in, or if it fails, the package's own paint shows.

- With a bundler the module moves, so the default `./assets/` beside it is wrong. Copy `dist/assets` to a folder your site serves and call `setAssetBase("/your/folder/")`, or set the `assets` attribute. See [React and other frameworks](react-and-frameworks.md).
- Watch the element's `uchusen-painted` and `uchusen-error` events.

## A strict content security policy blocks it

The element works under a strict policy with no inline script or style. It needs `connect-src` for a painted model, and `img-src blob:`. The embed page and the code builder run under `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' blob: data:`.

## `HTMLElement is not defined` on the server

Importing the element in Node is safe: it falls back to an empty base class when there is no DOM. If the error comes from another library, import the element only in the browser (a client-only effect, or the React wrapper, which imports it inside `useEffect`). The core and `build` entries never touch the DOM.

## `There is no part "..."`

`buildPart` and `build` throw for a part id that is not in `PART_ENTRIES`. Check the spelling.

```ts
import { partEntry } from "@johnmorrisdotca/uchusen-rockets";

console.log(partEntry("starship-v3-ship") !== undefined, partEntry("starship-v9-ship"));
```

## `FitError`

`build` throws `FitError` when the parts do not go together. Its `report` holds the issues in the same words `check` gives; show those to the user.

```ts
import { check } from "@johnmorrisdotca/uchusen-rockets";

for (const issue of check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } }).issues) console.log(issue.level, issue.code, issue.message);
```

## A value I typed is ignored

Attributes are checked against tables. A look, view or show that is not in its list falls back to the default instead of failing, and a misspelt `rocket` or `variant` is refused by name. `cleanLook`, `cleanView` and `cleanShow` show what a value becomes.

## The engines are dark

`engines="on"` lights only engines that a source tells of and the drawing has, and a reader who asked for reduced motion has them off. See [Lit engines and flights](engines-and-flights.md).

## Node says it cannot run my script

Using the package needs Node 22 or later. Working on it needs 22.18 or later, because its tests and scripts run TypeScript directly with Node's own type stripping.

## Still stuck

Open an issue at https://github.com/johnmorrisdotca/uchusen-rockets/issues with the code, the browser and what `data-state` says. A security problem goes to the address in [SECURITY.md](../../SECURITY.md).
