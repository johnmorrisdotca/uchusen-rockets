---
title: Rockets to scale
section: how-to
order: 6
description: Stand rockets on one baseline at one scale beside a ruler, a person and a building, as an element or as SVG text.
---

`<uchusen-lineup>` stands rockets side by side at one scale. It is how you see that Block 4 is taller than Block 3, or that a Falcon 9 would fit inside Starship's booster twice over.

![Block 1, 2, 3 and 4 side by side at one scale, with a ruler to 140 metres, a ten-storey building and a person.](../images/compare.jpg)

## The element

```html
<uchusen-lineup items="starship:v1,starship:v2,starship:v3,starship:v4,building,person" unit="3" ruler labels></uchusen-lineup>
```

| Attribute | What |
| --- | --- |
| `items` | A list of `rocket:variant` keys, and the comparison shapes `person` and `building`. An unknown item is left out. |
| `unit` | Pixels to a metre. |
| `look`, `view`, `show` | As on `<uchusen-rocket>`. |
| `ruler`, `labels` | Switches: a scale ruler, a name under each item. |

The front is what it shows unless `view` says otherwise, except that the stacked Space Shuttle is turned so its orbiter shows, and a rocket black all over takes a thin light outline in the painted look so it does not vanish on a dark ground.

## As SVG text

`lineupSvg` from the `build` entry makes the same picture with no DOM, for a server or a build step.

```ts
import { lineupSvg } from "@johnmorrisdotca/uchusen-rockets/build";

const picture = lineupSvg({ items: ["starship:v3", "falcon-9:block-5", "person"], unit: 4, ruler: true, labels: true });
console.log(picture.width, picture.height, picture.svg.startsWith("<svg"));
console.log(picture.items.map((item) => `${item.label}: ${item.height} m`));
```

## The comparison shapes

The person (1.8 m) and the ten-storey building (30 m) are plain round sizes, there for scale and not facts about anything.

```ts
import { COMPARES } from "@johnmorrisdotca/uchusen-rockets/build";

console.log(COMPARES);
```

## Every rocket at one scale

![Every rocket at one scale as line drawings beside a ruler, a building and a person.](../images/family.jpg)

Other makers' rockets share the same scale, and each lists its own sources. Because every height is a sourced `Figure`, the lineup cannot show a size the data does not have: a variant with no sourced height is left out rather than guessed.
