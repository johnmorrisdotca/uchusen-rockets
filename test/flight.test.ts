import assert from "node:assert/strict";
import { test } from "node:test";

import { build } from "../src/build/index.ts";
import { FLIGHTS } from "../src/data/flights.ts";
import { SOURCES } from "../src/data/sources.ts";
import { bellsOf, pickBells } from "../src/engines.ts";
import { burnsOf, clockWords, FlightClock, flightOf, frameAt, lastPosition, phaseAt, phasePosition, SECONDS_PER_PHASE } from "../src/flight.ts";
import { variantOf } from "../src/rockets.ts";

test("every flight is of a real variant, names its source, and its times run forward", () => {
  assert.ok(FLIGHTS.length >= 5);
  for (const flight of FLIGHTS) {
    assert.ok(variantOf(flight.rocket, flight.variant), flight.id);
    assert.ok(SOURCES[flight.source], flight.id);
    assert.ok(flight.basis.length > 20, flight.id);
    const known = flight.phases.flatMap((phase) => (phase.at.value === null ? [] : [phase.at.value]));
    assert.ok(known.length >= flight.phases.length - 3, `${flight.id} is mostly sourced times`);
    for (let i = 1; i < known.length; i++) assert.ok(known[i] >= known[i - 1], `${flight.id}: ${known[i - 1]} then ${known[i]}`);
    assert.equal(new Set(flight.phases.map((phase) => phase.id)).size, flight.phases.length, flight.id);
    for (const phase of flight.phases) {
      // a time is sourced, or blank with a word why
      if (phase.at.value === null) assert.ok(phase.at.note, `${flight.id} ${phase.id}`);
      else assert.ok(phase.at.source && SOURCES[phase.at.source], `${flight.id} ${phase.id}`);
      for (const [slot, burn] of Object.entries(phase.burns)) {
        if (burn.engines.value === null) {
          assert.ok(burn.engines.note, `${flight.id} ${phase.id} ${slot}: a blank says why`);
          assert.ok(burn.drawn, `${flight.id} ${phase.id} ${slot}: a blank says how many are drawn`);
        } else assert.ok(burn.engines.source && SOURCES[burn.engines.source], `${flight.id} ${phase.id} ${slot}`);
      }
    }
  }
});

test("no phase burns an engine a part does not have, or a part the rocket does not have", () => {
  for (const flight of FLIGHTS) {
    const built = build({ rocket: flight.rocket, variant: flight.variant });
    const slots = built.parts.map((part) => part.slot);
    for (const phase of flight.phases) {
      for (const slot of [...Object.keys(phase.burns), ...Object.keys(phase.pose)]) assert.ok(slots.includes(slot), `${flight.id} ${phase.id} ${slot}`);
      for (const [slot, count] of Object.entries(burnsOf(phase))) {
        const bells = bellsOf(built.parts.find((part) => part.slot === slot)?.pieces ?? []);
        assert.ok(count <= bells.length, `${flight.id} ${phase.id} ${slot}: ${count} of ${bells.length}`);
        assert.equal(pickBells(bells, count).length, count, `${flight.id} ${phase.id} ${slot}`);
      }
    }
  }
});

test("the engines that burn are the published ones", () => {
  const counts = (id: string, phase: string) => {
    const flight = FLIGHTS.find((one) => one.id === id);
    return flight ? burnsOf(flight.phases[phasePosition(flight, phase) ?? 0]) : {};
  };
  assert.deepEqual(counts("starship-flight-5", "liftoff"), { booster: 33 });
  assert.deepEqual(counts("starship-flight-5", "hot-staging"), { booster: 3, ship: 6 });
  assert.equal(counts("starship-flight-5", "boostback").booster, 13);
  assert.equal(counts("starship-flight-5", "booster-landing").booster, 13);
  assert.equal(counts("starship-flight-5", "booster-three").booster, 3);
  assert.equal(counts("starship-flight-5", "ship-burn").ship, 3);
  assert.deepEqual(counts("starship-flight-12", "hot-staging"), { booster: 5, ship: 6 });
  assert.equal(counts("starship-flight-12", "boostback").booster, 33);
  assert.deepEqual(counts("starship-flight-12", "ship-two"), { ship: 2 });
  assert.deepEqual(counts("starship-flight-12", "ship-one"), { ship: 1 });
  assert.deepEqual(counts("falcon-9-crs-16", "liftoff"), { "first-stage": 9 });
  assert.equal(counts("falcon-9-crs-16", "boostback")["first-stage"], 3);
  assert.equal(counts("falcon-9-crs-16", "entry-burn")["first-stage"], 3);
  assert.equal(counts("falcon-9-crs-16", "landing-burn")["first-stage"], 1);
  assert.deepEqual(counts("falcon-heavy-test-flight", "liftoff"), { centre: 9, "side-left": 9, "side-right": 9 });
  assert.deepEqual(counts("falcon-heavy-test-flight", "beco"), { centre: 9 });
});

test("a variant with no page has no flight, and each block keeps its own", () => {
  assert.equal(flightOf("starship", "v3")?.id, "starship-flight-12");
  assert.equal(flightOf("starship", "v2")?.id, "starship-flight-7");
  assert.equal(flightOf("starship", "v1")?.id, "starship-flight-5");
  assert.equal(flightOf("starship", "v4"), null);
  assert.equal(flightOf("starship", "2019"), null);
  assert.equal(flightOf("dragon", "dragon-2"), null);
  assert.equal(flightOf("no-such-rocket", undefined), null);
});

test("the clock only moves when told to, stops at its end, and a nonsense place is the start", () => {
  const flight = FLIGHTS[0];
  const clock = new FlightClock(flight);
  clock.advance(10);
  assert.equal(clock.position, 0);
  clock.play();
  clock.advance(SECONDS_PER_PHASE);
  assert.ok(Math.abs(clock.position - 1) < 1e-9);
  clock.pause();
  clock.advance(10);
  assert.ok(Math.abs(clock.position - 1) < 1e-9);
  clock.play();
  clock.advance(SECONDS_PER_PHASE * 1000);
  assert.equal(clock.position, lastPosition(flight));
  assert.equal(clock.playing, false);
  assert.equal(clock.ended, true);
  // played again from the end, it starts over
  clock.play();
  assert.equal(clock.position, 0);
  clock.seek(Number.NaN);
  assert.equal(clock.position, 0);
  clock.seek(-5);
  assert.equal(clock.position, 0);
  clock.seek(1e9);
  assert.equal(clock.position, lastPosition(flight));
  assert.equal(phaseAt(flight, 2.5).index, 2);
  assert.equal(phasePosition(flight, '"><script>'), null);
});

test("a frame holds every part, moves smoothly, and a part at rest stands on the ground", () => {
  const flight = FLIGHTS.find((one) => one.id === "starship-flight-5");
  assert.ok(flight);
  if (!flight) return;
  const parts = [{ slot: "booster", baseY: 0 }, { slot: "ship", baseY: 72 }];
  const first = frameAt(flight, 0, parts, 124);
  assert.deepEqual(first.burns, { booster: 33 });
  assert.equal(first.separated, false);
  const end = frameAt(flight, lastPosition(flight), parts, 124);
  // both on the ground, side by side
  assert.equal(end.poses.ship.dy, -72);
  assert.ok(Object.is(Math.abs(end.poses.booster.dy), 0));
  assert.notEqual(end.poses.ship.dx, end.poses.booster.dx);
  assert.equal(end.separated, true);
  assert.equal(Math.abs(end.groundY), 0);
  const a = frameAt(flight, 4.5, parts, 124);
  const b = frameAt(flight, 4.51, parts, 124);
  assert.ok(Math.abs(a.poses.ship.dy - b.poses.ship.dy) < 1);
});

test("a time reads as a clock, and a blank says so", () => {
  assert.equal(clockWords({ value: 155, source: null }), "T+2:35");
  assert.equal(clockWords({ value: -3, source: null }), "T-0:03");
  assert.equal(clockWords({ value: 3920, source: null }), "T+1:05:20");
  assert.equal(clockWords({ value: null, source: null }), "Time: no source");
});

test("a drawing burns just the engines a phase names, and is unchanged with none asked for", () => {
  const built = build({ rocket: "falcon-9", variant: "block-5" });
  const flames = (svg: string) => svg.match(/data-plume=/g)?.length ?? 0;
  assert.equal(flames(built.svg({ look: "line", show: "apart", engines: { "first-stage": 3 } })), 3);
  assert.equal(flames(built.svg({ look: "painted", show: "apart", engines: { "first-stage": 1, "second-stage": 1 } })), 2);
  assert.equal(flames(built.svg({ look: "line", engines: {} })), 0);
  assert.equal(built.svg({ look: "line", engines: {} }), built.svg({ look: "line" }));
  assert.match(built.svg({ look: "line", show: "apart", engines: { "first-stage": 1 } }), /data-diamond=/);
});
