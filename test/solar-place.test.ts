// The belts are the published spans, and a major moon sits where the package says it does.
import assert from "node:assert/strict";
import { test } from "node:test";
import { beltAim, beltPlaces, bodyScene, majorMoons } from "../src/element/solarPlace.ts";

const when = Date.UTC(2026, 10, 6);

const apart = (a: readonly [number, number, number], b: readonly [number, number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("the asteroid band sits between Mars and Jupiter, and the Kuiper band at the outer mark", () => {
  const sun = bodyScene("sun", when);
  const au = 149_597_870_700;
  const asteroids = beltPlaces("asteroids", when);
  const kuiper = beltPlaces("kuiper", when);
  assert.equal(asteroids.length, 420);
  assert.equal(kuiper.length, 560);
  for (const place of asteroids) {
    const reach = apart(place.at, sun) / au;
    assert.ok(reach > 2.1 && reach < 3.3, String(reach));
  }
  for (const place of kuiper) {
    const reach = apart(place.at, sun) / au;
    assert.ok(reach > 29 && reach < 51, String(reach));
  }
});

test("a belt mark aims at the middle of that band", () => {
  const sun = bodyScene("sun", when);
  const au = 149_597_870_700;
  const asteroids = apart(beltAim("asteroids", when), sun) / au;
  const kuiper = apart(beltAim("kuiper", when), sun) / au;
  assert.ok(asteroids > 2.6 && asteroids < 2.8, String(asteroids));
  assert.ok(kuiper > 39 && kuiper < 41, String(kuiper));
});

test("Io is a major moon, nearer to Jupiter than Callisto", () => {
  const jupiter = bodyScene("jupiter", when);
  const moons = majorMoons(when);
  const io = moons.find((moon) => moon.id === "io");
  const callisto = moons.find((moon) => moon.id === "callisto");
  assert.ok(io);
  assert.ok(callisto);
  const ioKm = apart(io.at, jupiter) / 1000;
  const callistoKm = apart(callisto.at, jupiter) / 1000;
  assert.ok(ioKm > 350_000 && ioKm < 500_000, String(ioKm));
  assert.ok(callistoKm > ioKm);
});
