# Lit engines and flights

`engines="on"` lights each engine that shows, at full thrust: a flame with shock diamonds and a glow on the hull in the painted look, and a drawn flame and ring in the line looks. An engine lights where a source tells of it and the drawing has it: a part with neither, or a stage that has landed, has no flame. A `phase` or a played flight lights only the engines that burn at that point.

```html
<uchusen-rocket id="rocket" rocket="falcon-9" variant="block-5" look="painted"></uchusen-rocket>
<uchusen-flight for="rocket"></uchusen-flight>

<script type="module">
  import "@johnmorrisdotca/uchusen-rockets/element";
</script>
```

`<uchusen-flight>` is a play button, a slider, Back, Next, where the flight is, what happens there, a chart of each part's engines from below with the burning ones filled, and where it all comes from. It says so when a version has no flight. The words it says itself (Play, Back, Next and the rest) are English; `flight.words = { play: "…" }` gives it another language's (the keys are `play`, `pause`, `again`, `back`, `next`, `leave`, `range`, `none`, `sourced`, `reduced` and `from`, and any left out stay English). A phase's name, what happens in it and a flight's note are the data's and stay as they are.

## What is sourced and what is a picture

| | |
| --- | --- |
| **Sourced** | When each step comes and how many engines burn, each from a named page, in `src/data/flights.ts`. A blank is a blank: a step with no time says so, and a flame drawn with no count says how many are drawn and that no page says. |
| **Illustrative** | Everything about how the picture moves: where the parts stand, how fast the flight plays (2.4 seconds a phase, whatever the real time), the ground falling away, smoke and water, the flip. A flame's length, shape and colour. A rule places the engines: a source says how many burn, and they are taken from the middle out, evenly round a ring that is only partly used. |

Each flight says whose timing it is and whether it was the plan or what happened: `flight.basis`.

| Variant | Flight | Timing from |
| --- | --- | --- |
| Starship Block 1, as it first flew | Flight test 1, to the destruction of the stack: no separation | Wikipedia's flight timeline |
| Starship Block 1 with the vented ring | Flight test 5 | Wikipedia's flight timeline |
| Starship Block 2 | Flight test 7, as planned | Wikipedia's flight timeline |
| Starship Block 3 | Flight test 12, as published before the flight | Wikipedia's flight timeline, from SpaceX |
| Falcon 9 v1.1 | CASSIOPE, September 2013, the first v1.1 | Spaceflight Now's live coverage |
| Falcon 9 Full Thrust | ABS-2A and Eutelsat 117 West B, June 2016, as planned; the first stage is not followed | Spaceflight Now, with the version from Wikipedia's ABS-2A |
| Falcon 9 Block 5 | Starlink, November 2019, landing on a drone ship | Spaceflight Now |
| Falcon 9 Block 5 with Dragon 2 | CRS-16, returning to land, which flew the first Dragon | Spaceflight Now |
| Falcon 9 v1.0 with Dragon 1 | COTS Demo Flight 1, December 2010, as planned; the first stage is not followed and the trunk stays with the second stage | SpaceX's press kit and Spaceflight Now's launch timeline |
| Dragon 1 | The same flight from Dragon's separation to its water landing: the deorbit burn, entry, both parachutes and the landing, as planned | SpaceX's COTS Demo Flight 1 press kit |
| Falcon Heavy | The test flight | Wikipedia's timeline |
| Grasshopper | Its highest hop, 744 m in 79 s | Wikipedia's table of its eight hops |

The other variants have no flight, and a custom build never has one: Falcon 9 v1.0 with its fairing (it never flew with one: the vehicle that flew is `v1.0-dragon`), Block 4 of Starship (it has not flown), the 2019 design and the rest. There is no tower, no catch arms and no drone ship yet: the parts come down on a plain pad.

## Altitude and speed

A phase carries an altitude or a speed only where its page gives one, in the page's own words and units: Starship flight test 1's 39 km and 29 km, flight test 5's 69 km and 212 km, flight test 7's 146 km, flight test 12's 195 km and its booster's 1,450 km/h at the water, CASSIOPE's "more than 20 miles" at two minutes and "310 kilometers" at seven minutes twenty, "Mach 1" on the Full Thrust flight, Grasshopper's 744 m, the planned orbit of CRS-16, and COTS Demo Flight 1's "186-mile-high orbit", its drogue parachutes at "45,000 feet" and main parachutes at "about 10,000 feet". The flight bar shows them beside the time. A blank is a blank: no figure is worked out from another.

## What turns

The grid fins, the legs and the flaps are groups that a flight can turn, each a node of its own in the `.glb` (`booster~grid-fins~0`, with its pivot and its axis) and a piece of the drawing that `moved` turns. The pages say: the Falcon 9's grid fins are "stowed on ascent and deployed on reentry" and its legs open in the landing burn, before the touchdown (Falcon 9 first-stage landing tests); Super Heavy steers with its grid fins for minor course corrections after the boostback (Super Heavy); the Ship controls its reentry with four flaps, two aft and two forward (Starship). How far each turns, in degrees, and the moment inside a phase, are a picture. `PartPose.moves` carries the angles, `frameAt` mixes them between phases, and `svg({ moves })` draws them. Where a painted look uses a licensed model that is one shell, the model stays as it is and nothing is cut to fake a move: only this package's own parts turn.

```ts
import { burnsOf, clockWords, flightOf, phasePosition } from "@johnmorrisdotca/uchusen-rockets";

const flight = flightOf("starship", "v3");
flight.name; // "Starship flight test 12"
const staging = flight.phases[phasePosition(flight, "hot-staging")];
clockWords(staging.at); // "T+2:24"
burnsOf(staging).booster; // 5
burnsOf(staging).ship; // 6
flightOf("starship", "v4"); // null
```

## From a script

`element.flight` is the flight for what is showing, or `null`. `element.play()`, `pause()` and `seek(position)` move it: `seek(2.5)` is half way from the third phase to the fourth. `element.endFlight()` puts the rocket back, as does choosing another `show`. `element.flightState` says where it is, and an `uchusen-flight` event says when that changes: at once for a new phase, and otherwise at most 8 times a second. `element.engineCharts()` gives each part's chart as text. The `phase` attribute goes to a phase by its id, and works for a drawing with no WebGL too: a drawing shows the flames of that phase, and separated parts stand apart.

## It asks little of the machine

- A flight has no clock of its own: it moves inside the view's one frame loop, so it adds no frame request. It stands still out of sight and on a hidden tab, ends by itself, and then nothing draws.
- One instanced draw for a part's flames, however many burn. Lighting and dousing engines, and going in and out of a flight, makes and frees nothing on the graphics card after the first flame.
- A flame flickers at most 30 times a second, and stops moving after 15 seconds with no one touching anything.
- Under reduced motion no flame shows, nothing plays, and the slider and the charts still work.

`e2e/freeze.demo.ts` holds all of it.
