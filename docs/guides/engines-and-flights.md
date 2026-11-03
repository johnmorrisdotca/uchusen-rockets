---
title: Lit engines and flights
section: how-to
order: 5
description: Light the engines at full thrust, play a flight phase by phase from a published timeline, and know which parts of the picture are sourced.
---

`engines="on"` lights every engine that shows, at full thrust. A flight plays a rocket through its phases with only the engines that burn in each one.

Picture: [The Falcon 9 first stage with its engines lit.](https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/engines.jpg)

## Light the engines

```html
<uchusen-rocket rocket="falcon-9" variant="block-5" look="painted" engines="on"></uchusen-rocket>
```

A painted rocket gets a flame with shock diamonds and a glow on the hull; the line looks get a drawn flame and a ring. An engine lights only where a source tells of it and the drawing has it, so a part with neither, or a stage that has landed, has no flame. A reader who asked for reduced motion has the engines off whatever the page says.

```ts
import { enginesWanted } from "@johnmorrisdotca/uchusen-rockets";

console.log(enginesWanted("on", false), enginesWanted("on", true), enginesWanted("maybe", false));
```

## Which engines burn

The count of burning engines comes from a source. Which ones is a rule: from the middle outwards, and a ring that is only partly used has them spread evenly round it.

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";
import { bellsOf, pickBells, ringsOf } from "@johnmorrisdotca/uchusen-rockets";

const booster = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
if (booster) {
  const bells = bellsOf(booster.pieces);
  console.log(bells.length, ringsOf(bells).map((ring) => ring.length), pickBells(bells, 3).length);
}
```

## Play a flight

`<uchusen-flight for="rocket">` is a play button, a slider, Back and Next, a line saying where the flight is and what happens there, and a chart of each part's engines from below with the burning ones filled.

```html
<uchusen-rocket id="rocket" rocket="falcon-9" variant="block-5" look="painted"></uchusen-rocket>
<uchusen-flight for="rocket"></uchusen-flight>
```

Picture: [The flight bar below a rocket at hot staging, with its chart of engines.](https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/flight.jpg)

A variant has a flight only where a page gives one. The other variants say so, and a custom build never has one.

## A flight as data

```ts
import { burnsOf, clockWords, flightOf, phasePosition } from "@johnmorrisdotca/uchusen-rockets";

const flight = flightOf("starship", "v3");
if (flight) {
  console.log(flight.name, "-", flight.basis);
  const at = phasePosition(flight, "hot-staging");
  const phase = at === null ? undefined : flight.phases[Math.round(at)];
  if (phase) console.log(phase.name, clockWords(phase.at), burnsOf(phase));
}
console.log(flightOf("starship", "v4"));
```

`flightOf` gives `null` for a variant with no flight. Each flight says whose timing it is and whether it was the plan or what happened (`flight.basis`).

## From a script

`element.flight`, `element.play()`, `element.pause()`, `element.seek(position)` and `element.endFlight()` move it; `element.flightState` says where it is. `FlightClock` is the same clock without the element: it moves only when told to, once a frame by whoever draws.

```ts
import { FlightClock, flightOf, lastPosition } from "@johnmorrisdotca/uchusen-rockets";

const flight = flightOf("falcon-9", "block-5");
if (flight) {
  const clock = new FlightClock(flight);
  clock.play();
  clock.advance(2.4);
  console.log(clock.position, lastPosition(flight), clock.ended);
}
```

## Sourced, and only a picture

| Sourced | Illustrative |
| --- | --- |
| When each phase comes and how many engines burn, each from a named page. | Where the parts stand, how fast the flight plays (2.4 seconds a phase), the ground falling away, smoke, and a flame's length and colour. |

A blank is a blank: a phase with no time says so, and a flame drawn with no count says how many are drawn and that no page says.

## What it costs the machine

A flight has no clock of its own: it moves inside the view's one frame loop. It stands still out of sight and ends by itself. A flame flickers at most 30 times a second and stops moving after 15 seconds with nobody touching anything (`FLAME_SETTLE_MS`). Lighting and dousing engines makes and frees nothing on the graphics card after the first flame.
