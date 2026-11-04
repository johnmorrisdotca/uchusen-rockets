---
title: Journey mode
section: how-to
order: 7
description: Fly a real rocket or a ship of the SPX fleet from the Earth to the Moon or a planet. Launch windows from real positions, the burns, the flip and the numbers, as plain functions.
---

Journey mode plans a trip between two places in the solar system and plays it. The page is `journey.html` of the demo; the arithmetic under it is the `journey` entry of this package, with no DOM and no dependency, so a server, a test or your own page can use it.

## Two kinds of craft

A **ballistic** craft is a real rocket. It leaves on a Hohmann transfer: a burn from a parking orbit, a long coast along half an ellipse, and a braking burn at the other end. It can leave only on certain days, the launch windows, and the page finds them from the planets' real positions.

A craft that **burns all the way** is a ship of the SPX fleet. It accelerates to the halfway point, turns end for end, and burns the same acceleration to stop (flip and burn). The formulas are relativistic, so they hold for the interstellar trips of a later phase; in the solar system they reduce to `2 sqrt(d / a)`.

## The arithmetic

```ts
import { circularSpeed, flipAndBurn, G0, GM_KM3_S2, hohmann, synodicPeriod } from "@johnmorrisdotca/uchusen-rockets/journey";

const AU = 149_597_870.7;
const mars = hohmann(GM_KM3_S2.sun!, AU, 1.52371034 * AU);
console.log((mars.seconds / 86_400).toFixed(1), "days,", mars.dv1.toFixed(2), "and", mars.dv2.toFixed(2), "km/s");
console.log(synodicPeriod(365.256, 686.98).toFixed(1), "days between windows");
console.log(circularSpeed(GM_KM3_S2.earth!, 6378.137 + 185).toFixed(2), "km/s in a 185 km orbit");

const ship = flipAndBurn(0.5 * AU * 1000, 0.015 * G0, 600);
console.log((ship.frameSeconds / 86_400).toFixed(1), "days at 0.015 g, half an AU");
```

These numbers are checked against the ones NASA prints: about 259 days to Mars, 2.94 and 2.65 km/s, 779.9 days between windows.

## Places

The core imports no ephemeris. You hand it a `BodySource`: the places, and where they are at a time. The demo makes one from [wakusei-planets](https://github.com/johnmorrisdotca/wakusei-planets) (`demo/journey-bodies.ts`), whose positions come from NASA JPL's approximate orbit elements. A toy source of circular orbits is enough to try the planner:

```ts
import { craftOf, planTrip, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";

const AU = 149_597_870.7;
const day = 86_400_000;
const circle = (au: number, days: number) => (ms: number) => [au * Math.cos((2 * Math.PI * ms) / day / days), au * Math.sin((2 * Math.PI * ms) / day / days), 0] as const;
const source: BodySource = {
  stops: [
    { id: "earth", name: { en: "Earth", ja: "地球" }, kind: "planet", radiusKm: 6378.137, colour: "#4c88c4" },
    { id: "mars", name: { en: "Mars", ja: "火星" }, kind: "planet", radiusKm: 3396.19, colour: "#c76a3f" },
  ],
  positionAu: (id, ms) => (id === "earth" ? circle(1, 365.256)(ms) : circle(1.52371034, 686.98)(ms)),
  offsetKm: () => [0, 0, 0],
};

const trip = planTrip(source, craftOf("kaminari")!, "earth", "mars", Date.UTC(2026, 10, 4));
console.log(trip.verdict.line);
console.log(Math.round(trip.frameS / 86_400), "days,", Math.round(AU), "km to an AU");
```

## What a craft can do

`planTrip` never hides a craft. It returns a verdict in one plain line, and `playable` says whether Play is offered:

| Verdict | Meaning |
| --- | --- |
| `rated` | A published payload figure covers this trip, and the line names it. |
| `at-least` | No figure for this trip, but one for a harder trip: a rocket that puts 16.8 t on a Mars transfer puts at least that on the way to the Moon. |
| `not-rated` | No figure covers it. The burns are worked from the physics and nothing says the craft can lift them. |
| `flyby` | It can leave, but the spacecraft's own fuel cannot brake it: Orion's 1,050 m/s against the 2.2 km/s Mars capture needs. |
| `cannot` | Refused, with the reason in the line: not enough fuel, a rocket that lifts off from the Earth only, a straight path through the Sun. |
| `ok` | A ship that burns all the way, with fuel to spare. |

Every figure of a craft names its source, or is marked as an estimate and says what it is worked from. The page shows an estimate with "est.".

## Playing a trip

A trip is a list of phases (preheat, ignition, ascent, burn, coast, flip, brake, arrival). A real coast takes months, so each phase maps its mission time onto screen time on its own: `stateAt(trip, source, playbackSeconds)` returns everything true at that moment, from nothing but the trip and the time, so any frame can be drawn on its own and a test needs no clock.

```ts
import { CRAFTS, duration } from "@johnmorrisdotca/uchusen-rockets/journey";

for (const craft of CRAFTS) console.log(craft.name, craft.drive);
console.log(duration(258.8 * 86_400));
```

## What the page draws

One 2D canvas for the stars, SVG for the map and the route, and the package's own line drawing of the craft turned on its side: no WebGL, so the page makes no context to let go. It asks for a frame only while a trip plays and the page is on screen, at most 30 a second. The address keeps the choices (`?from=earth&to=mars&craft=falcon-heavy`).
