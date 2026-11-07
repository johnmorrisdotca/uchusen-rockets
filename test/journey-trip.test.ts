// Journey mode's crafts, verdicts, timeline and countdown: every figure has a source or is marked an estimate, every verdict says why, and every moment of a trip can be drawn on its own.
import assert from "node:assert/strict";
import test from "node:test";
import { WAKUSEI_SOURCE as S } from "../demo/journey-bodies.ts";
import { BUDGET, DESIGN } from "../src/model/fleet/ship-02/specs.ts";
import { DRY_T } from "../src/model/fleet/ship-02/dims.ts";
import { ROCKETS, SOURCES, variantOf } from "../src/index.ts";
import { bestDate, burnTimer, CRAFTS, craftOf, duration, ignition, percentOfLight, placeAt, planTrip, playSeconds, preheat, speedWords, stateAt, windows, type Craft, type Quantity } from "../src/journey/index.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const NOW = Date.UTC(2026, 10, 4);
const mars = windows(S, "earth", "mars", NOW, 1)[0]!.dateMs;
const fleetShip = craftOf("kaminari")! as Extract<Craft, { drive: "continuous" }>;

const quantities = (craft: Craft): [string, Quantity][] => {
  const out: [string, Quantity][] = [];
  const walk = (name: string, value: unknown): void => {
    if (value && typeof value === "object" && "value" in value && typeof (value as Quantity).value === "number") out.push([name, value as Quantity]);
    else if (value && typeof value === "object") for (const [key, inner] of Object.entries(value)) walk(`${name}.${key}`, inner);
  };
  walk(craft.id, craft);
  return out;
};

test("every figure of every craft names a source that exists, or says what it is estimated from", () => {
  for (const craft of CRAFTS) {
    const all = quantities(craft);
    assert.ok(all.length > 3, craft.id);
    for (const [name, q] of all) {
      if (q.source) assert.ok(Object.hasOwn(SOURCES, q.source), `${name}: unknown source ${q.source}`);
      else assert.ok(q.estimate && q.estimate.length > 10, `${name}: no source and no estimate`);
      assert.ok(Number.isFinite(q.value) && q.value > 0, name);
    }
  }
});

test("every craft is drawn by a rocket and variant the package has", () => {
  for (const craft of CRAFTS) {
    assert.ok(Object.hasOwn(ROCKETS, craft.rocket), craft.rocket);
    assert.ok(variantOf(craft.rocket, craft.variant), `${craft.rocket} ${craft.variant}`);
  }
});

test("the fleet ship's figures are the ones in its design tables, not a second copy that can drift", () => {
  assert.equal(fleetShip.drive, "continuous");
  assert.equal(fleetShip.g.value, DESIGN.g);
  assert.equal(fleetShip.exhaustOfC.value, DESIGN.exhaust);
  assert.equal(fleetShip.payloadT.value, DESIGN.payloadT);
  assert.equal(fleetShip.propellantT.value, DESIGN.propellantT);
  assert.equal(fleetShip.dryT.value, DRY_T);
  assert.ok(BUDGET.fullMassT > 0);
});

test("a rated trip names its figure; a higher-energy figure is 'at least'; no figure is 'not rated'; none of them hides the physics", () => {
  const moonSaturn = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  assert.equal(moonSaturn.verdict.level, "rated");
  assert.match(moonSaturn.verdict.line, /43\.5 t to the Moon/);
  const moonHeavy = planTrip(S, craftOf("falcon-heavy")!, "earth", "moon", NOW);
  assert.equal(moonHeavy.verdict.level, "flyby");
  assert.ok(moonHeavy.verdict.because.some((line) => /at least 16\.8 t/.test(line)));
  const marsHeavy = planTrip(S, craftOf("falcon-heavy")!, "earth", "mars", mars);
  assert.equal(marsHeavy.verdict.level, "flyby");
  const marsSaturn = planTrip(S, craftOf("saturn-v")!, "earth", "mars", mars);
  assert.equal(marsSaturn.verdict.level, "not-rated");
  assert.ok(marsSaturn.verdict.playable);
  assert.ok(marsSaturn.dv.departure > 3500 && marsSaturn.dv.departure < 3800);
});

test("Orion cannot brake into Mars orbit: it flies past, and the line says why", () => {
  const trip = planTrip(S, craftOf("sls")!, "earth", "mars", mars);
  assert.equal(trip.verdict.level, "flyby");
  assert.match(trip.verdict.line, /not enough fuel on board to stop at Mars/);
  assert.ok(trip.phases.some((p) => p.id === "flyby"));
  assert.ok(!trip.phases.some((p) => p.id === "brake"));
  const moon = planTrip(S, craftOf("sls")!, "earth", "moon", NOW);
  assert.equal(moon.verdict.level, "rated", "Orion's 1,050 m/s is enough for lunar orbit (0.82 km/s)");
});

test("Earth to Moon with Saturn V: 3.1 km/s out, 0.8 km/s in, about 5 days, the arrival burn near the 357 s Apollo 11 flew", () => {
  const trip = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  near(trip.dv.departure, 3138, 20, "m/s");
  near(trip.dv.arrival, 819, 20, "m/s");
  near(trip.ballistic!.transitS / 3600, 119.5, 8, "hours (the Moon is nearer or farther than its mean on the day)");
  near(trip.ballistic!.brakeS, 357, 60, "seconds");
});

test("a rocket leaves from the Earth or the Moon, and says so", () => {
  const trip = planTrip(S, craftOf("saturn-v")!, "mars", "earth", NOW);
  assert.equal(trip.verdict.level, "cannot");
  assert.equal(trip.verdict.playable, false);
  assert.match(trip.verdict.line, /Earth or the Moon/);
});

test("a ship that burns all the way: Earth to Moon in about a day, to Mars in weeks, fuel in the low per cents, and a refusal that says why", () => {
  const moon = planTrip(S, fleetShip, "earth", "moon", NOW);
  assert.equal(moon.verdict.level, "ok");
  near(moon.frameS / 3600, 28, 2, "hours to the Moon");
  const trip = planTrip(S, fleetShip, "earth", "mars", bestDate(S, fleetShip, "earth", "mars", NOW));
  assert.equal(trip.verdict.level, "ok");
  assert.ok(trip.frameS / 86400 > 10 && trip.frameS / 86400 < 40, `${trip.frameS / 86400} days`);
  assert.ok(trip.propellantUsedT! < 0.05 * trip.propellantCarriedT!);
  const hungry = { ...fleetShip, propellantT: { ...fleetShip.propellantT, value: 100 } };
  const refused = planTrip(S, hungry, "earth", "neptune", NOW);
  assert.equal(refused.verdict.level, "cannot");
  assert.equal(refused.verdict.playable, false);
  assert.match(refused.verdict.line, /^Not enough fuel: this trip needs [\d,]+ t of propellant and the ship carries 100 t\.$/);
});

test("the timeline: phases follow one another, mission time never goes back and is continuous across a phase", () => {
  for (const [craftId, to, date] of [["saturn-v", "moon", NOW], ["falcon-heavy", "mars", mars], ["kaminari", "mars", NOW]] as const) {
    const trip = planTrip(S, craftOf(craftId)!, "earth", to, date);
    for (let i = 1; i < trip.phases.length; i += 1) near(trip.phases[i]!.startS, trip.phases[i - 1]!.endS, 1e-9, `${craftId} phase ${i}`);
    assert.equal(trip.phases[0]!.id, "preheat");
    assert.equal(trip.phases.at(-1)!.id, "arrival");
    const total = playSeconds(trip);
    assert.ok(total > 40 && total < 70, `${total}`);
    let before = -Infinity;
    for (let s = 0; s <= total; s += 0.25) {
      const place = placeAt(trip, s);
      assert.ok(place.missionS >= before - 1e-9, `${craftId} at ${s}`);
      before = place.missionS;
    }
    near(placeAt(trip, 0).missionS, -13, 1e-9, "starts 13 s before lift-off");
    near(placeAt(trip, 1e9).missionS, trip.phases.at(-1)!.endS, 1e-6, "ends at the end");
    assert.deepEqual(placeAt(trip, 12), placeAt(trip, 12), "the same time is the same frame");
  }
});

test("the state at any moment: starts at rest, reaches the destination, speed and path continuous at the phase edges", () => {
  const trip = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  const first = stateAt(trip, S, 0);
  assert.equal(first.speedMs, 0);
  assert.equal(first.doneKm, 0);
  const last = stateAt(trip, S, 1e6);
  near(last.progress, 1, 1e-9, "progress at the end");
  near(last.speedMs, trip.ballistic!.captureSpeedOut * 1000, 1, "ends in orbit round the Moon");
  let at = 0;
  for (const p of trip.phases) {
    if (p.id === "coast") break;
    at += p.screenS;
  }
  const edge = stateAt(trip, S, at - 1e-6);
  const after = stateAt(trip, S, at + 1e-6);
  near(edge.speedMs, after.speedMs, 20, "speed across the end of the departure burn");
  let previous = -1;
  for (let s = 0; s <= playSeconds(trip); s += 0.5) {
    const state = stateAt(trip, S, s);
    assert.ok(state.doneKm >= previous - 1e-6, `path never goes back at ${s}`);
    previous = state.doneKm;
    assert.ok(state.speedMs >= 0 && Number.isFinite(state.signalS), `${s}`);
  }
});

test("a ship that burns all the way: speed rises, is greatest at the turn, falls to zero at the end, and the two halves mirror", () => {
  const trip = planTrip(S, fleetShip, "earth", "mars", bestDate(S, fleetShip, "earth", "mars", NOW));
  const screenAt = (id: string, f: number): number => {
    let s = 0;
    for (const p of trip.phases) {
      if (p.id === id) return s + p.screenS * f;
      s += p.screenS;
    }
    return s;
  };
  const turn = stateAt(trip, S, screenAt("flip", 0));
  near(turn.speedMs, trip.peakSpeed, 1, "peak speed at the flip");
  near(turn.progress, 0.5, 0.01, "the flip is about halfway");
  for (const f of [0.1, 0.4, 0.8]) {
    const a = stateAt(trip, S, screenAt("accelerate", f));
    const d = stateAt(trip, S, screenAt("decelerate", 1 - f));
    near(a.speedMs, d.speedMs, 1, `mirror at ${f}`);
    near(a.doneKm + d.doneKm, trip.pathKm, trip.pathKm * 1e-7, "distances add to the whole");
  }
  assert.equal(stateAt(trip, S, 1e6).speedMs, 0);
  near(stateAt(trip, S, screenAt("accelerate", 0.5)).accelG, 0.015, 1e-9, "accelerates at its rated g");
  assert.ok(stateAt(trip, S, screenAt("decelerate", 0.5)).accelG < 0);
  near(stateAt(trip, S, 1e6).shipS, trip.shipS, 1, "time on board at the end");
});

test("a rocket's plan names the escape speed of the parking orbit and of the surface", () => {
  const moon = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  near(moon.escape?.parkingKmS ?? 0, (moon.ballistic?.parkSpeed ?? 0) * Math.SQRT2, 1e-9, "parking escape is the circular speed times sqrt(2)");
  assert.ok((moon.escape?.surfaceKmS ?? 0) > (moon.escape?.parkingKmS ?? 0), "the surface is deeper in the well");
  const back = planTrip(S, craftOf("saturn-v")!, "moon", "earth", NOW);
  assert.ok((back.escape?.surfaceKmS ?? 0) > (back.escape?.parkingKmS ?? 0));
  assert.ok((back.escape?.surfaceKmS ?? 0) < (moon.escape?.surfaceKmS ?? 0), "the Moon's surface escape is the smaller one");
  assert.equal(planTrip(S, fleetShip, "earth", "mars", NOW).escape, undefined);
});

test("the mass ratio is the rocket equation, and a craft with no exhaust speed is not given one", () => {
  const ship = planTrip(S, fleetShip, "earth", "mars", NOW);
  const full = fleetShip.dryT.value + fleetShip.payloadT.value + fleetShip.propellantT.value;
  near(ship.massRatio ?? 0, full / (full - ship.propellantUsedT!), 1e-6, "full mass over what is left");
  assert.ok((ship.propellantUsedT ?? 0) <= (ship.propellantCarriedT ?? 0), "the tanks hold it");
  const moon = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  assert.ok((moon.massRatio ?? 0) > 1, "the braking burn has a ratio");
  assert.equal(planTrip(S, craftOf("falcon-heavy")!, "earth", "mars", NOW).massRatio, null);
  assert.equal(planTrip(S, craftOf("saturn-v")!, "moon", "earth", NOW).massRatio, null);
});

test("a chemical rocket aimed past the solar system cannot, and names the delta-v instead of a fuel load", () => {
  const saturn = planTrip(S, craftOf("saturn-v")!, "earth", "beyond", NOW);
  const dv = saturn.dv.total;
  assert.ok(dv > 8_000 && dv < 9_500, `${dv} m/s from a parking orbit`);
  for (const id of ["saturn-v", "sls", "falcon-heavy"]) {
    const trip = planTrip(S, craftOf(id)!, "earth", "beyond", NOW);
    assert.equal(trip.verdict.level, "cannot", id);
    assert.equal(trip.verdict.playable, false, id);
    assert.equal(trip.dv.total, dv, id);
    assert.match(trip.verdict.line, new RegExp(`${Math.round(dv).toLocaleString("en-US")} m/s`));
    assert.equal(trip.fuel.usedT, null, id);
    assert.equal(trip.massRatio, null, id);
    assert.match(trip.fuel.note, /not invented/);
  }
  const moon = planTrip(S, craftOf("saturn-v")!, "moon", "beyond", NOW);
  assert.equal(moon.verdict.level, "cannot");
  assert.match(moon.verdict.line, /leaves from the Earth/);
  const ship = planTrip(S, fleetShip, "earth", "beyond", NOW);
  assert.ok(ship.massRatio !== null && ship.massRatio > 1, "a ship that burns all the way still gets the rocket equation");
  assert.ok(ship.propellantUsedT !== undefined && ship.propellantCarriedT !== undefined);
});

test("asking a ship for 1 g shortens the trip and says the ship is not built for it", () => {
  const rated = planTrip(S, fleetShip, "earth", "mars", NOW);
  const one = planTrip(S, fleetShip, "earth", "mars", NOW, 1);
  assert.equal(one.peakG, 1);
  assert.ok(one.frameS < rated.frameS / 2, `${one.frameS} against ${rated.frameS}`);
  assert.match(one.verdict.line, /at 1 g/);
  assert.ok(one.verdict.because.some((line) => line.includes("rated at 0.015 g")));
  assert.equal(planTrip(S, fleetShip, "earth", "mars", NOW, 0.015).frameS, rated.frameS);
  const rocket = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  assert.equal(planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW, 1).peakG, rocket.peakG);
});

test("the countdown: the preheat bar fills in ten segments, the ignition counts 3, 2, 1, and the burn timer runs down", () => {
  assert.deepEqual(preheat(-13), { percent: 0, full: 0, partial: 0 });
  assert.equal(preheat(-8).percent, 50);
  assert.equal(preheat(-8).full, 5);
  assert.equal(preheat(-3).percent, 100);
  assert.equal(preheat(-3).full, 10);
  assert.equal(preheat(5).percent, 100);
  assert.equal(ignition(-2.5).count, 3);
  assert.equal(ignition(-1.5).count, 2);
  assert.equal(ignition(-0.5).count, 1);
  assert.equal(ignition(0).count, 0);
  const trip = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  const brake = trip.phases.find((p) => p.id === "brake")!;
  assert.equal(burnTimer(trip, brake.startS - 11.4)?.kind, "burn-in");
  near(burnTimer(trip, brake.startS - 11.4)!.seconds, 11.4, 1e-9, "seconds");
  assert.equal(burnTimer(trip, brake.startS + 10)?.kind, "complete-in");
  assert.equal(burnTimer(trip, brake.endS + 1), null);
  assert.equal(burnTimer(trip, -5), null);
});

test("the words: digits near c are never rounded up to 100 per cent, and speeds and times read plainly", () => {
  assert.equal(percentOfLight(29_780), "0.0099 %");
  assert.ok(percentOfLight(299_792_458 * (1 - 1e-11)).startsWith("99.999\u202f999\u202f999"));
  assert.notEqual(percentOfLight(299_792_457.9999), "100.00 %");
  assert.equal(speedWords(7790), "7.79 km/s");
  assert.equal(speedWords(340), "340 m/s");
  assert.equal(duration(700), "11 min 40 s");
  assert.equal(duration(258.8 * 86400), "258 d 19 h");
});

test("the Moon to the Earth with Saturn V is the Apollo return: rated, about 1 km/s, about three days, the command module, no ascent and no braking burn", () => {
  const trip = planTrip(S, craftOf("saturn-v")!, "moon", "earth", NOW);
  assert.equal(trip.verdict.level, "rated");
  assert.equal(trip.verdict.playable, true);
  assert.match(trip.verdict.line, /Apollo 11/);
  assert.match(trip.verdict.line, /3,279 ft\/s/);
  assert.doesNotMatch(trip.verdict.line, /43\.5/);
  assert.equal(trip.payload.kg, null);
  assert.equal(trip.liftoffBeforeS, 0);
  assert.equal(trip.frame, "earth");
  assert.equal(trip.dv.arrival, 0);
  near(trip.dv.departure, 1000, 150, "m/s");
  near(trip.ballistic!.transitS / 3600, 72, 2, "hours");
  assert.equal(trip.ballistic!.burnS, 151.4);
  assert.equal(trip.ballistic!.entry, true);
  assert.ok(trip.ballistic!.conic);
  assert.deepEqual(
    trip.phases.map((p) => p.id),
    ["preheat", "ignition", "burn", "coast", "arrival"],
  );
  const burn = stateAt(trip, S, 10);
  assert.equal(burn.phase.id, "burn");
  assert.equal(burn.speedFrame, "start");
  assert.ok(burn.speedMs > 1500 && burn.speedMs < 3000, String(burn.speedMs));
  const coast = stateAt(trip, S, 16);
  assert.equal(coast.phase.id, "coast");
  assert.equal(coast.speedFrame, "earth");
  const radius = Math.hypot(coast.positionKm[0], coast.positionKm[1], coast.positionKm[2]);
  assert.ok(radius > 50_000 && radius < 400_000, `coast radius ${radius}`);
  const end = stateAt(trip, S, playSeconds(trip) - 0.5);
  near(Math.hypot(end.positionKm[0], end.positionKm[1], end.positionKm[2]), 6378 + 122, 200, "entry radius, km");
});

test("Orion's return is rated from Artemis I, and the line says that flight was not this three-day path", () => {
  const trip = planTrip(S, craftOf("sls")!, "moon", "earth", NOW);
  assert.equal(trip.verdict.level, "rated");
  assert.equal(trip.verdict.playable, true);
  assert.match(trip.verdict.line, /Artemis I/);
  assert.match(trip.verdict.line, /not this three-day return/);
  assert.ok(trip.dv.departure < 1050, String(trip.dv.departure));
});

test("Falcon Heavy cannot leave the Moon, and a lunar start never shows an Earth launch figure", () => {
  const heavy = planTrip(S, craftOf("falcon-heavy")!, "moon", "earth", NOW);
  assert.equal(heavy.verdict.level, "cannot");
  assert.equal(heavy.verdict.playable, false);
  assert.match(heavy.verdict.line, /no engine/);
  assert.doesNotMatch(heavy.verdict.line, /16\.8|43\.5/);
});

test("leaving the Moon for Mars uses the Moon's orbital speed, and says when no figure covers it", () => {
  const saturn = planTrip(S, craftOf("saturn-v")!, "moon", "mars", mars);
  assert.equal(saturn.verdict.level, "not-rated");
  assert.equal(saturn.verdict.playable, true);
  assert.equal(saturn.frame, "sun");
  assert.doesNotMatch(saturn.verdict.line, /43\.5/);
  near(saturn.dv.departure / 1000, 1.6, 0.35, "km/s");
  assert.ok(!saturn.phases.some((phase) => phase.id === "ascent"));
  assert.ok(saturn.estimated.some((line) => /helping/.test(line)));
  const sls = planTrip(S, craftOf("sls")!, "moon", "mars", mars);
  assert.equal(sls.verdict.level, "cannot");
  assert.match(sls.verdict.line, /1,050/);
  const ship = planTrip(S, fleetShip, "moon", "mars", NOW);
  assert.equal(ship.verdict.playable, true);
  assert.equal(ship.frame, "sun");
});

test("a payload without an engine flies past and never brakes", () => {
  const trip = planTrip(S, craftOf("falcon-heavy")!, "earth", "mars", mars);
  assert.equal(trip.verdict.level, "flyby");
  assert.match(trip.verdict.line, /no braking engine/);
  assert.ok(trip.phases.some((phase) => phase.id === "flyby"));
  assert.ok(!trip.phases.some((phase) => phase.id === "brake"));
  assert.equal(trip.dv.arrival, 0);
  assert.equal(trip.ballistic!.brakeS, 0);
  assert.equal(trip.fuel.usedT, null);
});
