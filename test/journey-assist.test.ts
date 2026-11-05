// A swing past Jupiter: it is offered on the way out, the path meets Jupiter and comes near the destination, and the Moon's own help is left as it was.
import assert from "node:assert/strict";
import test from "node:test";
import { WAKUSEI_SOURCE as S } from "../demo/journey-bodies.ts";
import { assistApplies, assistWindows, swingPoint } from "../src/journey/assist.ts";
import { craftOf, planTrip, windows } from "../src/journey/index.ts";
import { positionKm } from "../src/journey/trip.ts";

const NOW = Date.UTC(2026, 10, 4);
const falcon = craftOf("falcon-heavy")!;
const saturn = craftOf("saturn-v")!;
const ship = craftOf("kaminari")!;

const gap = (at: { x: number; y: number }, place: readonly [number, number, number]): number => Math.hypot(at.x - place[0], at.y - place[1]);

test("a swing is offered from the Earth to a planet beyond Jupiter, and nowhere else", () => {
  assert.equal(assistApplies("earth", "saturn", "ballistic"), true);
  assert.equal(assistApplies("earth", "neptune", "ballistic"), true);
  assert.equal(assistApplies("earth", "mars", "ballistic"), false);
  assert.equal(assistApplies("moon", "saturn", "ballistic"), false);
  assert.equal(assistApplies("earth", "saturn", "continuous"), false);
});

test("the Moon's departure is unchanged when a swing is asked for, and so is a ship that burns all the way", () => {
  const home = planTrip(S, saturn, "moon", "earth", NOW);
  const asked = planTrip(S, saturn, "moon", "earth", NOW, undefined, "jupiter");
  assert.equal(asked.dv.total, home.dv.total);
  assert.equal(asked.assist, undefined);
  assert.match(home.verdict.line, /Apollo 11/);
  const flown = planTrip(S, ship, "earth", "saturn", NOW);
  const ignored = planTrip(S, ship, "earth", "saturn", NOW, undefined, "jupiter");
  assert.equal(ignored.frameS, flown.frameS);
  assert.equal(ignored.assist, undefined);
});

test("Earth to Saturn can swing past Jupiter, the path meets Jupiter, and a flyby saves speed change against the direct trip", () => {
  const dates = assistWindows(S, "saturn", NOW, 1);
  assert.ok(dates.length === 1, `no swing lined up (miss gate). dates=${dates.length}`);
  const trip = planTrip(S, falcon, "earth", "saturn", dates[0]!.dateMs, undefined, "jupiter");
  const swing = trip.ballistic?.swing;
  assert.ok(trip.assist, trip.verdict.line);
  assert.ok(swing, "no swing on the plan");
  assert.equal(trip.assist.by, "jupiter");
  assert.equal(trip.verdict.level, "flyby");
  const depart = trip.departMs;
  const atJupiter = swingPoint(trip.ballistic!.mu, swing, swing.leg1S);
  const jupiter = positionKm(S, "jupiter", depart + swing.leg1S * 1000, "sun");
  const jupiterGap = gap(atJupiter, jupiter);
  assert.ok(jupiterGap < atJupiter.r * 0.03, `Jupiter is ${jupiterGap} km off a radius of ${atJupiter.r}`);
  const atEnd = swingPoint(trip.ballistic!.mu, swing, swing.leg1S + swing.leg2S);
  const dest = positionKm(S, "saturn", depart + (swing.leg1S + swing.leg2S) * 1000, "sun");
  const destGap = gap(atEnd, dest);
  assert.ok(Math.abs(swing.miss) < 0.05, `miss ${(swing.miss * 180) / Math.PI} degrees`);
  assert.ok(destGap < atEnd.r * 0.05, `Saturn is ${destGap} km off a radius of ${atEnd.r}`);
  assert.ok(trip.assist.savedMs > 500, `saved ${trip.assist.savedMs} m/s`);
  const directDate = windows(S, "earth", "saturn", NOW, 1)[0]!.dateMs;
  const direct = planTrip(S, falcon, "earth", "saturn", directDate);
  assert.equal(direct.assist, undefined);
  assert.ok(!direct.ballistic?.swing);
});
