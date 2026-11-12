---
title: Looks, views and parts
section: how-to
order: 3
description: Choose how a rocket is drawn, from where, and which parts of it show, with the same words in HTML, React and code.
---

Three choices change what you see, and they are independent: **look** (how it is drawn), **view** (where from) and **show** (which parts). Every look works for every variant, together, apart and each part alone.

![The same rocket as a light line drawing on night blue, its tiled side a mosaic of hexagons.](../images/main-line.jpg)

## Looks

| `look` | What it is |
| --- | --- |
| `line` | Thin light lines on night blue. The default. |
| `thick` | The same drawing with heavier lines, for small sizes and for print. |
| `painted` | Materials and light. A licensed model where there is one, otherwise this package's own paint. |

Changing the look keeps the angle: it changes materials, not the camera. A look is one table entry (`LOOKS`) that changes lines, colours and fills, never a shape.

```ts
import { LOOKS, LOOK_NAMES, cleanLook } from "@johnmorrisdotca/uchusen-rockets";

console.log(LOOK_NAMES, LOOKS.thick.outline, cleanLook("glossy"));
```

`cleanLook` turns anything from outside into a look's name, and gives the default for anything it does not know. The same is true of `cleanView` and `cleanShow`: a hostile or misspelt attribute draws the default and nothing else.

A craft in space can be lit as it is there: `sun="1, 0.2, -0.5"`, the direction towards the Sun in the craft's own frame, gives one light from that side, the far side dark and next to no fill. Left out, the showroom light stays. `parseSun` reads the attribute, and anything that is not three numbers is no Sun.

## Views

![The booster from below: 33 engines in their rings, three grid fins and the long chines.](../images/booster-below.jpg)

`view` is `three-quarter` (the default), `front`, `back`, `side` or `below`. **Front is the windward, tiled side; back is the steel side.** Each name is an angle:

```ts
import { VIEWS, VIEW_NAMES, directionOf } from "@johnmorrisdotca/uchusen-rockets";

for (const name of VIEW_NAMES) console.log(name, VIEWS[name], directionOf(VIEWS[name]).map((n) => n.toFixed(2)).join(" "));
```

Drag turns the view from the chosen angle, the arrow keys nudge it, the wheel over the view, a pinch, `+` and `-` zoom, and Home or a double-click puts it back. `spin` sets a slow turn of its own: `off`, `slow`, `medium`, `fast` or seconds a turn, and `way` is `cw` or `ccw`. With the family's view controls the turn is theirs instead: their speed buttons (0.5×, 1× and 2×) set how fast it goes, and `spin` stands down while they drive the element.

## Zoom and Wide in the demo

The demo's view bar shows the zoom between the minus and plus buttons (1×, 2.4×, 19×), in the family's form. It follows the buttons, the wheel and a pinch, and a polite live region says it once the zoom has settled. The poster's zoom slider has the same readout.

The Wide button (or the T key) gives the view the whole width of the page, 16:9 and no taller than 80% of the window, and moves the side panel below it as a row of boxes. It is on every demo page that has a side panel (the rocket, the fleet record, the yard, the journey, the code builder and the embed page). The choice is kept in the address as `?wide=on` and on this device, and a phone, which is one column already, hides the button.

## The Earth behind the rocket, in the demo

The demo's Background row is None by default. Choose Earth and the rocket floats in front of the turning Earth, as it would look in orbit. The choice is kept in the address (`?background=earth`). It belongs to the demo page: the embed page and the code the demo copies carry the rocket alone, and say so, and nothing of it is in the published package.

The Earth comes from `@johnmorrisdotca/chikyu-earth`, a dependency of the demo only. It matches the look: a line-drawn globe behind Line drawing and Thick lines (one SVG, no extra WebGL context), and the painted Earth behind Painted (a second WebGL context, made only while Earth is chosen and given back when it is turned off or the look changes). A page that never chooses it loads none of its code and none of its pictures.

It keeps to the same budgets as the rocket: one frame request each per page frame, a turn of two to four draws a second, nothing drawn out of sight or on a hidden tab, and a stand-still under reduced motion or when nobody has touched the page for five minutes. `pnpm test:freeze` holds all of it, including contexts, graphics objects and memory staying flat over many on and off changes.

## Showing parts

`show` is `together`, `apart` or the slot of one part. The slots depend on the variant.

```ts
import { showsOf, variantOf } from "@johnmorrisdotca/uchusen-rockets";

console.log(showsOf(variantOf("falcon-9", "block-5-dragon-2")?.slots ?? []));
```

![Falcon 9 Block 5 with Dragon 2, taken apart and painted.](../images/falcon-9-apart.jpg)

Changing `show` is an animated move, and a cut for a reader who asked for reduced motion. A part alone fills the frame and lists its own size.

## In HTML, React and code

The attributes, the React props and the options are the same words.

```html
<uchusen-rocket rocket="falcon-heavy" look="thick" view="below" show="apart"></uchusen-rocket>
```

```ts
import { attributesFromOptions, optionsFromAttributes } from "@johnmorrisdotca/uchusen-rockets";

const attributes = attributesFromOptions({ rocket: "falcon-heavy", look: "thick", view: "below", show: "apart" });
console.log(attributes, optionsFromAttributes((name) => attributes[name] ?? null));
```

## Read the state from a script

`element.state` is `picture`, `loading`, `3d`, `fallback` or `error`, and `element.angle` is the current `{ az, el }`. The element sends `uchusen-ready`, `uchusen-change`, `uchusen-painted`, `uchusen-fallback` and `uchusen-error` events. See the [element reference](api:element.UchusenRocket).
