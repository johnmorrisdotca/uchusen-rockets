// The build order names every slot of the flown ship once, and it lasts the four years the bible states.
import assert from "node:assert/strict";
import test from "node:test";
import { BUILD_DAYS, buildSteps } from "../src/model/fleet/ship-03/buildOrder.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";

const KEEL = ["drive", "engineering", "fuel-aft", "fuel-fore", "habitat", "command", "bow"];

for (const variant of ["miyamoto", "ariake"] as const) {
  test(`${variant}: every slot of the flown ship is built once, and the story lasts the stated four years`, () => {
    const steps = buildSteps(variant);
    const slots = Object.keys(MIYAMOTO_VARIANT_SLOTS[variant]);
    assert.deepEqual(steps.map((step) => step.slot).sort(), [...slots].sort());
    assert.equal(new Set(steps.map((step) => step.slot)).size, steps.length);
    for (const step of steps) assert.equal(step.part, MIYAMOTO_VARIANT_SLOTS[variant][step.slot]);
    assert.equal(Math.min(...steps.map((step) => step.start)), 0);
    assert.equal(Math.max(...steps.map((step) => step.start + step.days)), BUILD_DAYS);
    const keel = steps.filter((step) => step.group === "keel");
    assert.deepEqual(keel.map((step) => step.slot), KEEL);
    for (let i = 1; i < keel.length; i++) assert.equal(keel[i].start, keel[i - 1].start + keel[i - 1].days);
    const fit = steps.filter((step) => step.group === "fit-out");
    const overlaps = fit.some((a) => fit.some((b) => a !== b && a.start < b.start + b.days && b.start < a.start + a.days));
    assert.equal(overlaps, true);
  });
}
