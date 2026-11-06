// The build order names every slot of the flown ship once, and it lasts the four years the bible states.
import assert from "node:assert/strict";
import test from "node:test";
import { type BuildStep } from "../src/model/fleet/buildSpan.ts";
import { emiakeBuild, kaminariBuild, KAMINARI_BUILD_DAYS, LONG_SHIP_BUILD_DAYS, romaryuBuild } from "../src/model/fleet/kaminari-concepts/buildOrder.ts";
import { SLOTS_A } from "../src/model/fleet/kaminari-concepts/a.ts";
import { SLOTS_B } from "../src/model/fleet/kaminari-concepts/b.ts";
import { SLOTS_C } from "../src/model/fleet/kaminari-concepts/c.ts";
import { hanabusaBuild, HANABUSA_BUILD_DAYS } from "../src/model/fleet/ship-01/buildOrder.ts";
import { HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
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

const endOf = (steps: readonly BuildStep[], slot: string): number => {
  const step = steps.find((one) => one.slot === slot);
  assert.ok(step, slot);
  return step.start + step.days;
};

function holds(name: string, steps: readonly BuildStep[], slots: readonly string[], days: number, first: string): void {
  test(name, () => {
    assert.deepEqual(steps.map((step) => step.slot).sort(), [...slots].sort());
    assert.equal(new Set(steps.map((step) => step.slot)).size, steps.length);
    assert.equal(Math.min(...steps.map((step) => step.start)), 0);
    assert.equal(Math.max(...steps.map((step) => step.start + step.days)), days);
    const keel = steps.filter((step) => step.group === "keel");
    assert.equal(keel[0]?.slot, first);
    for (let i = 1; i < keel.length; i++) assert.equal(keel[i]?.start, (keel[i - 1]?.start ?? 0) + (keel[i - 1]?.days ?? 0));
    const fit = steps.filter((step) => step.group === "fit-out");
    const overlaps = fit.some((a) => fit.some((b) => a !== b && a.start < b.start + b.days && b.start < a.start + a.days));
    assert.equal(overlaps, true);
    for (const step of steps) assert.ok(step.days > 0);
  });
}

holds("Hanabusa: five years, 2456 to 2461, and each ring waits until the spine has reached it", hanabusaBuild(), Object.keys(HANABUSA_VARIANT_SLOTS.hanabusa ?? {}), HANABUSA_BUILD_DAYS, "drive");
holds("Kaminari: nine years, 2511 to 2520, the longest build", kaminariBuild(), SLOTS_A.map((one) => one.slot), KAMINARI_BUILD_DAYS, "spine");
holds("Emiake: the planned five years of a ship of about 1.8 km", emiakeBuild(), SLOTS_B.map((one) => one.slot), LONG_SHIP_BUILD_DAYS, "keel");
holds("Romaryū: the same planned five years, and each craft waits for its cradle", romaryuBuild(), SLOTS_C.map((one) => one.slot), LONG_SHIP_BUILD_DAYS, "shaft");

test("what stands out from the hull waits until its mount is finished", () => {
  const hanabusa = hanabusaBuild();
  assert.equal(hanabusa.find((step) => step.slot === "ring-garden")?.start, endOf(hanabusa, "tank-8"));
  assert.equal(hanabusa.find((step) => step.slot === "ring-research")?.start, endOf(hanabusa, "tank-7"));
  assert.equal(hanabusa.find((step) => step.slot === "ring-living")?.start, endOf(hanabusa, "tank-8"));
  const kaminari = kaminariBuild();
  assert.equal(kaminari.find((step) => step.slot === "radiators")?.start, endOf(kaminari, "spine"));
  const emiake = emiakeBuild();
  assert.equal(emiake.find((step) => step.slot === "fin-port")?.start, endOf(emiake, "ridge"));
  const romaryu = romaryuBuild();
  assert.equal(romaryu.find((step) => step.slot === "miyamoto-1")?.start, endOf(romaryu, "cradle-1"));
  for (const step of hanabusa) assert.equal(step.part, HANABUSA_VARIANT_SLOTS.hanabusa?.[step.slot]);
});
