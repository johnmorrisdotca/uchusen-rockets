---
title: Flight physics
section: how-to
order: 8
description: Orbits from a position and a speed, gravity from the bodies of a scene, a craft moved forward in time, the rocket equation, burns and transfers. Ported in part from Orbiter and measured against JPL Horizons.
---

The `physics` entry is the arithmetic of flying a craft: what orbit a position and a speed make, the pull of the bodies around it, where it is after a while, what a burn costs, and how to fly from one orbit to another. It is pure (no DOM, no clock, no dependency), so it runs in Node, in a test or under your own page, and it works in SI units throughout: metres, seconds, kilograms, newtons. A gravitational parameter is in m^3/s^2, so the journey's `GM_KM3_S2` values are multiplied by `1e9`.

Parts of it are ported from [Orbiter](https://github.com/orbitersim/orbiter), the open-source space flight simulator (MIT licence, Copyright (c) 2000-2026 Martin Schweiger); [Where it comes from](#where-it-comes-from) names each file. Burns and transfers are here; turning the craft with its thrusters, and the air, come in later releases.

## An orbit from a position and a speed

`elementsOf` gives the shape of the orbit and where the craft is on it; `stateOf` gives where it is a time later, by Kepler's equation, with no other pull. Both work for closed orbits and for open (hyperbolic) paths.

```ts
import { elementsOf, stateOf } from "@johnmorrisdotca/uchusen-rockets/physics";

const GM_EARTH = 3.986004418e14;
const orbit = elementsOf(GM_EARTH, [6_563_000, 0, 0], [0, 10_240, 0]);
console.log("eccentricity", orbit.e.toFixed(3), "apogee", ((orbit.apoapsis - 6_378_137) / 1000).toFixed(0), "km");
console.log("once round in", (orbit.period / 3600).toFixed(2), "hours");

const halfway = stateOf(orbit, orbit.period / 2);
console.log("at apogee:", (halfway.position[0] / 1000).toFixed(0), "km,", halfway.velocity[1].toFixed(0), "m/s");
```

## Gravity from the bodies of a scene

`gravityAt(position, bodies)` adds up the pull of every body you hand it, each a point mass, and a body's flattening when you give its `zonal` terms (J2, and J3 and J4 if you have them, with the radius they are given for and the body's pole). The flattening is what turns a low orbit's plane round the Earth by several degrees a day; leave it out far from a planet.

```ts
import { gravityAt, type GravityBody } from "@johnmorrisdotca/uchusen-rockets/physics";

const earth: GravityBody = { gm: 3.986004418e14, position: [0, 0, 0], zonal: { radius: 6_378_137, pole: [0, 0, 1], j: [0.00108262545] } };
const g = gravityAt([6_778_137, 0, 0], [earth]);
console.log(Math.hypot(...g).toFixed(3), "m/s^2 at 400 km over the equator");
```

The bodies must be in the craft's frame and at the craft's time. For the best answer that frame should not itself be pulled: the solar system's barycentre is the right one for a flight between the planets. A frame centred on the Sun or on the Earth works for drawing, but leaves out how the others pull that centre: flown from the Sun's centre, the Tesla Roadster of the table below is about 900 km off after a month.

## Moving a craft forward

`propagate(start, seconds, options)` moves a craft in steps of at most `options.step` seconds, under any `acceleration(t, position, velocity)` you give: gravity from the scene, an engine's thrust over the craft's mass, or both. `path` gives evenly spaced points for drawing an orbit, and `step` takes one step.

```ts
import { elementsOf, gravityAt, path, propagate, type GravityBody } from "@johnmorrisdotca/uchusen-rockets/physics";

const earth: GravityBody[] = [{ gm: 3.986004418e14, position: [0, 0, 0] }];
const start = { t: 0, position: [7_000_000, 0, 0] as const, velocity: [0, 8_200, 1_200] as const };
const turn = elementsOf(earth[0]!.gm, start.position, start.velocity).period;

const later = propagate(start, 10 * turn, { step: 20, method: "sy6", acceleration: (_t, p) => gravityAt(p, earth) });
console.log("after ten turns:", Math.hypot(later.position[0] - start.position[0], later.position[1] - start.position[1], later.position[2] - start.position[2]).toFixed(2), "m from the start");

const line = path(start, turn, 64, { step: 20, acceleration: (_t, p) => gravityAt(p, earth) });
console.log(line.length, "points to draw the orbit");
```

The methods are Orbiter's:

| Method | What it is | Use it for |
| --- | --- | --- |
| `sy4` (the default) | Yoshida's fourth-order symplectic method | Long coasts under gravity: the energy of an orbit does not drift, however many turns |
| `sy6`, `sy8` | Sixth and eighth order | The same with longer steps or fewer metres of error, for more pulls a step |
| `sy2` | The leapfrog | Quick looks: second order |
| `rk4` | The classic fourth-order Runge-Kutta | A pull that depends on the speed, such as air; its energy creeps over many turns |

Over 100 turns of an oval orbit at 20-second steps, `sy4`, `sy6` and `sy8` keep the orbit's energy and angular momentum to 1.5 parts in ten million million (1.5e-13), and `rk4` lets the energy creep by 5 parts in a hundred million (5e-8).

## The rocket equation

An `Engine` is what Orbiter calls a thruster: its thrust in vacuum and its exhaust speed in vacuum, which is the specific impulse times standard gravity (`exhaustSpeedOf`). The propellant it burns is the thrust over the exhaust speed. In air, as in Orbiter, the propellant flow stays the same and the thrust falls on a straight line through a second exhaust speed at a reference pressure (`thrustAt`).

```ts
import { burnSeconds, deltaV, exhaustSpeedOf, massAfter, massFlow, thrustAt, type Engine } from "@johnmorrisdotca/uchusen-rockets/physics";

const engine: Engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
console.log(massFlow(engine).toFixed(1), "kg/s");
console.log(deltaV(engine.exhaustSpeed, 30_000, 20_000).toFixed(0), "m/s from 10 t of propellant");
console.log((30_000 - massAfter(engine.exhaustSpeed, 30_000, 1_000)).toFixed(0), "kg for 1,000 m/s, a burn of", burnSeconds(engine, 30_000, 1_000).toFixed(0), "s");

const firstStage: Engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(330), reference: { exhaustSpeed: exhaustSpeedOf(300), pressure: 101_325 } };
console.log(thrustAt(firstStage, 101_325).toFixed(0), "N at sea level");
```

The same arithmetic on a server, as a plain script (`examples/node/orbit.mjs`, run against the package as npm packs it):

```js
import { GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
import { deltaV, elementsOf, exhaustSpeedOf, gravityAt, propagate } from "@johnmorrisdotca/uchusen-rockets/physics";

// A craft 400 km above the Earth on a circle, flown once round with the Earth's pull. Metres, seconds, kilograms.
const earth = [{ gm: GM_KM3_S2.earth * 1e9, position: [0, 0, 0] }];
const start = { t: 0, position: [6_778_137, 0, 0], velocity: [0, 7_668.6, 0] };
const orbit = elementsOf(earth[0].gm, start.position, start.velocity);
const end = propagate(start, orbit.period, { step: 10, method: "sy8", acceleration: (_t, p) => gravityAt(p, earth) });
const missed = Math.hypot(end.position[0] - start.position[0], end.position[1] - start.position[1]);
console.log((orbit.period / 60).toFixed(1), "minutes round,", missed < 1 ? "back where it started" : `${missed.toFixed(0)} m off`);

// The rocket equation: an engine of specific impulse 314 s, burning a third of a 30 t craft.
console.log(deltaV(exhaustSpeedOf(314), 30_000, 20_000).toFixed(0), "m/s");
```

It prints `92.6 minutes round, back where it started` and `1249 m/s`.

## Burns

A burn is either all at once (`impulse`, the way a plan treats a short burn) or flown (`flyBurn`): the engine pushes for a time, or until it has given a change of speed, while gravity pulls and the craft's mass falls at the engine's flow. The push points `prograde` (along the speed), `retrograde`, `normal` (along the orbit's angular momentum), `antinormal`, `radial-out`, `radial-in`, or along a fixed vector; the named directions are taken from the body the craft orbits (`centre`, still at the origin unless you say). `flyPlan` flies a list of burns with the coasts between them, starting each so that its middle falls on its planned time (`burnStart`), as Orbiter's plane-alignment display times one, and a burn stops early, marked `short`, if the propellant runs out (`dryMass`).

```ts
import { elementsOf, exhaustSpeedOf, flyBurn, gravityAt, impulse } from "@johnmorrisdotca/uchusen-rockets/physics";

const gm = 3.986004418e14;
const earth = [{ gm, position: [0, 0, 0] as const }];
const leo = { t: 0, position: [6_778_000, 0, 0] as const, velocity: [0, 7_669, 0] as const };

const kick = impulse(leo, 100, "prograde");
console.log("all at once:", ((elementsOf(gm, kick.position, kick.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");

const engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
const flown = flyBurn(leo, 20_000, { engine, direction: "prograde", dv: 100 }, { step: 1, gravity: (_t, p) => gravityAt(p, earth) });
console.log("flown:", flown.seconds.toFixed(1), "s,", flown.propellant.toFixed(0), "kg,", ((elementsOf(gm, flown.state.position, flown.state.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");
```

## Transfers

The closed forms plan a transfer and the burns fly it. `hohmann` of the `journey` entry gives the two burns and the time of a Hohmann transfer in any one set of units, so it takes metres and m^3/s^2 too. Here `biElliptic` adds the three-burn transfer by a far point, `speedChangeFor` the burn that sets an orbit's size (the vis-viva equation, as Orbiter's transfer display rescales a burn), `planeChange` the change of speed that turns the orbit's plane, with or without a change of size (the law of cosines), `nodes` where and when a craft's orbit crosses another plane, and the cost there (Orbiter's plane-alignment display), `relativeInclination` the angle between two planes, and `crossings` where two orbits in one plane meet (Orbiter's transfer display). `timeToTrueAnomaly` and `stateAtTrueAnomaly` say when the craft reaches a point of its orbit and how it moves there, for timing a burn.

```ts
import { biElliptic, elementsOf, nodes, planeChange, timeToTrueAnomaly } from "@johnmorrisdotca/uchusen-rockets/physics";

const gm = 3.986004418e14;
const tilted = elementsOf(gm, [6_778_000, 0, 0], [0, 6_739, 3_660]);
const equator = elementsOf(gm, [6_778_000, 0, 0], [0, 7_669, 0]);
const n = nodes(tilted, equator);
console.log(((n!.relativeInclination * 180) / Math.PI).toFixed(1), "degrees apart; the next node in", Math.min(n!.ascending.seconds, n!.descending.seconds).toFixed(0), "s, costing", n!.ascending.dv.toFixed(0), "m/s");
const [low, high] = [6_778_000, 42_164_000];
const atApogee = Math.sqrt(gm * (2 / high - 2 / (low + high)));
console.log(planeChange(atApogee, (28.5 * Math.PI) / 180, Math.sqrt(gm / high)).toFixed(0), "m/s to turn 28.5 degrees and circularise at once, at the far point of a transfer to", high / 1000, "km");
console.log((timeToTrueAnomaly(tilted, Math.PI) / 60).toFixed(1), "minutes to the far side");

const far = biElliptic(gm, 6_778_000, 20 * 6_778_000, 100 * 6_778_000);
console.log(far.total.toFixed(0), "m/s in", (far.seconds / 86_400).toFixed(1), "days by a far point");
```

A Hohmann transfer flown with two finite burns, each centred on its point, as a plain script (`examples/node/transfer.mjs`, run against the package as npm packs it):

```js
import { hohmann, GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
import { elementsOf, exhaustSpeedOf, flyPlan, gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";

// From a 400 km circle to the geostationary radius, with two burns of a 1 MN engine, each centred on its point. Metres and seconds.
const gm = GM_KM3_S2.earth * 1e9;
const earth = [{ gm, position: [0, 0, 0] }];
const [r1, r2] = [6_778_137, 42_164_000];
const plan = hohmann(gm, r1, r2);
const engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(314) };
const burns = [
  { at: 600, engine, direction: "prograde", dv: plan.dv1 },
  { at: 600 + plan.seconds, engine, direction: "prograde", dv: plan.dv2 },
];
const start = { t: 0, position: [r1, 0, 0], velocity: [0, Math.sqrt(gm / r1), 0] };
const flown = flyPlan(start, 20_000, burns, 600 + plan.seconds + 3_600, { step: 2, gravity: (_t, p) => gravityAt(p, earth) });
const orbit = elementsOf(gm, flown.state.position, flown.state.velocity);
console.log((plan.dv1 + plan.dv2).toFixed(0), "m/s,", (20_000 - flown.mass).toFixed(0), "kg of propellant");
console.log("ends", Math.round(Math.abs(orbit.a - r2) / 1000), "km from the circle, eccentricity", orbit.e.toFixed(4));
```

It prints `3854 m/s, 14279 kg of propellant` and `ends 4 km from the circle, eccentricity 0.0000`. A weaker engine burns longer, and more of each burn is off its point: with this craft's 91 kN engine the same plan ends 404 km short, with an eccentricity of 0.025, so a plan for a weak engine splits a long burn or corrects it afterwards.

## How exact it is

Each figure below is a test, measured on 2026-11-11 against saved answers: the tests never call the network.

| Case | Against | Result |
| --- | --- | --- |
| Six orbits, closed and open: elements, and the position at five times | Orbiter's own `Elements` class, compiled unchanged | The same to the millimetre, and to 0.19 m on a circle, where Orbiter's own answer misses its starting point by that much |
| The Moon flown 28 days, the Sun and the planets as point masses | JPL Horizons | 1.8 km off at the end |
| The same with the Earth's J2 | JPL Horizons | 0.76 km |
| The Tesla Roadster flown half a year round the Sun | JPL Horizons | 4,047 km off (20,969 km with the Sun alone). Horizons fits a push from sunlight on it that gravity leaves out |
| The ISS flown 100 minutes | JPL Horizons | 0.20 km with the Earth's J2, 48 km without |
| The period of the Earth-Moon barycentre's orbit | Horizons' sidereal year, 365.25636 days | 365.2574 days |
| A burn of 300 s flown step by step | The rocket equation | The same to 1e-10 m/s |
| A Hohmann transfer to the geostationary radius, all at once | `hohmann` of `journey/physics.ts` | The far circle to the millimetre, eccentricity below 1e-9 |
| The same flown with finite burns of a 20 t craft | `hohmann` | 1.3 km off with a 3 MN engine, 3.5 km with 1 MN, 39 km with 300 kN, 404 km with 91 kN |
| A Hohmann transfer from a 28.5-degree orbit, its second burn turning the plane | The law of cosines | The equator's circle, inclination and eccentricity below 1e-9 |
| A burn along the normal of Orbiter's estimate, speed times 5 degrees | The angle | 4.995 degrees |
| Positions, speeds and times at five points of each of the six orbits | Orbiter's `PosVel_TA`, `Spd_TA` and `MeanAnomaly_from_TrueAnomaly`, compiled | The same to the millimetre |

What is left over is what each flight leaves out (the higher terms of a body's gravity, the air, the push of sunlight), not the integrator.

## Where it comes from

Ported from Orbiter, https://github.com/orbitersim/orbiter (MIT licence, Copyright (c) 2000-2026 Martin Schweiger; the licence is in `LICENSES/Orbiter-MIT.txt`), rewritten in TypeScript:

- `elementsOf`, `stateOf`, `eccentricAnomaly`: `Src/Orbiter/Element.cpp` (the `Elements` class).
- `gravityAt`: `Src/Orbiter/Psys.cpp` (`SingleGacc`, its J2 to J4 terms, and the sum over the bodies).
- `propagate`, `step`, `path`: `Src/Orbiter/BodyIntegrator.cpp` (the fourth-order Runge-Kutta and the symplectic methods).
- `massFlow`, `thrustAt`: `Src/Orbiter/Vessel.cpp` and `Vessel.h`; `deltaV`: the rocket equation as the DeltaGlider's fuel display has it (`Src/Vessel/DeltaGlider/FuelMfd.cpp`).
- `stateAtTrueAnomaly`, `timeToTrueAnomaly`: `Src/Orbiter/Element.cpp` (`PosVel_TA`, `MeanAnomaly_from_TrueAnomaly`).
- `directionOf`, `impulse`, `burnStart`: the attitude modes of `Src/Orbiter/Vessel.cpp`, the burn timing of `Src/Orbiter/MfdAlign.cpp` and the burn of `Src/Orbiter/MfdTransfer.cpp`; `flyBurn` and `flyPlan` are written here on the propagator.
- `speedChangeFor`, `crossings`: `Src/Orbiter/MfdTransfer.cpp`; `nodes`, `relativeInclination`: `Src/Orbiter/MfdAlign.cpp`. `biElliptic` and `planeChange` are written here.

Each source file says what was changed. The answers the tests compare with are from JPL Horizons (NASA/JPL, public domain), saved by `scripts/fetch-orbit-reference.ts`, and from Orbiter's own code, by `scripts/orbiter-reference.ts`. [NOTICE.md](../../NOTICE.md) has the credits.
