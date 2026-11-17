// The assembly order of the fleet ships that had none: the first design, and the ships made of kit modules. Every slot is one flight, the keel goes up from the first module, and what hangs waits for what it stands on.
import assert from "node:assert/strict";
import test from "node:test";
import { buildOf, flightNow, kitAssembly, playFrame, SAMPLE_SHIPS } from "../src/index.ts";
import type { BuildStep } from "../src/model/fleet/buildSpan.ts";
import { SHIP_02_BUILD_DAYS } from "../src/model/fleet/ship-02/buildOrder.ts";
import { variantOf } from "../src/rockets.ts";

const endOf = (steps: readonly BuildStep[], slot: string): number => {
  const step = steps.find((one) => one.slot === slot);
  assert.ok(step, slot);
  return step.start + step.days;
};

test("the first design builds every slot of every variant once, from the spine, in the nine years of her bible", () => {
  for (const id of ["fleet-02", "fleet-02-survey", "fleet-02-tanker", "fleet-02-arrays", "fleet-02-rescue"]) {
    const steps = buildOf(id) as BuildStep[] | undefined;
    assert.ok(steps, id);
    const slots = variantOf("fleet-02", id)?.slots ?? [];
    assert.deepEqual(steps.map((step) => step.slot).sort(), [...slots].sort(), id);
    assert.equal(steps.filter((step) => step.group === "keel")[0].slot, "spine");
    assert.equal(playFrame(steps, 1).total, SHIP_02_BUILD_DAYS);
    assert.equal(steps.every((step) => (step.title ?? "").length > 0), true);
  }
  const steps = buildOf("fleet-02") as BuildStep[];
  const start = (slot: string) => steps.find((one) => one.slot === slot)?.start ?? -1;
  assert.equal(start("pod") >= endOf(steps, "tank-4"), true);
  assert.equal(start("tip-port") >= endOf(steps, "spine"), true);
  assert.equal(start("habitat-a-deck-2") >= endOf(steps, "habitat-a"), true);
  assert.equal(flightNow(steps, 0)?.n, 1);
  assert.equal(flightNow(steps, 0)?.title, "Truss spine");
});

test("a kit ship goes up the spine in list order, and what hangs from a port waits for the place it hangs on", () => {
  const list = SAMPLE_SHIPS.hauler;
  const steps = kitAssembly("t", list);
  const slots = variantOf("fleet-samples", "hauler")?.slots ?? [];
  assert.deepEqual(steps.map((step) => step.slot).sort(), [...slots].sort());
  const keel = steps.filter((step) => step.group === "keel");
  assert.equal(keel[0].slot, "engine-fusion-7-1");
  for (let i = 1; i < keel.length; i++) assert.equal(keel[i].start, keel[i - 1].start + keel[i - 1].days);
  const bay = steps.find((step) => step.slot === "cargo-bay-4-4");
  const box = steps.find((step) => step.slot === "container-12-5");
  assert.ok(bay && box);
  assert.equal(bay.group, "keel");
  assert.equal(box.group, "fit-out");
  assert.equal(box.start, bay.start + bay.days);
  assert.equal(new Set(steps.map((step) => step.title)).size, steps.length, "every flight has its own name");
  assert.match(steps.find((step) => step.slot === "container-12-7")?.title ?? "", / 2$/);
  assert.equal(kitAssembly("t", []).length, 0);
  assert.equal(buildOf("hauler")?.length, list.length);
  const seen = new Set<number>();
  for (let at = 0; at <= 1; at += 0.01) seen.add(flightNow(steps, at)?.n ?? 0);
  assert.equal(seen.has(1), true);
  assert.equal(Math.max(...seen) > keel.length - 1, true);
});

test("a ship hung from its last spine place still builds, and a ship of one place is all keel", () => {
  const steps = kitAssembly("t", [{ module: "tank-cryo-12" }, { module: "node-four" }, { module: "container-12", on: { place: 1, port: "bay1" } }]);
  const hung = steps.find((step) => step.slot === "container-12-3");
  assert.ok(hung && hung.start < playFrame(steps, 1).total);
  const one = kitAssembly("t", [{ module: "tank-cryo-12" }]);
  assert.equal(one.length, 1);
  assert.equal(one[0].group, "keel");
});

test("every Kyotori variant builds every slot once, the station before the ships, and each class part waits for its shaft", () => {
  const ids = ["kyotori-a", "kyotori-b", "kyotori-c", "kyotori-d", "kyotori", "kyotori-flared", "kyotori-stowed", "kyotori-separated", "kyotori-cutaway", "kyotori-four"];
  for (const id of ids) {
    const steps = buildOf(id) as BuildStep[] | undefined;
    assert.ok(steps, id);
    const slots = variantOf("fleet-kyotori", id)?.slots ?? [];
    assert.deepEqual(steps.map((step) => step.slot).sort(), [...slots].sort(), id);
    assert.equal(steps.every((step) => (step.title ?? "").length > 0), true, id);
  }
  const four = buildOf("kyotori-four") as BuildStep[];
  assert.equal(four.filter((step) => step.group === "keel")[0].slot, "s-core");
  assert.equal((four.find((step) => step.slot === "c-role")?.start ?? 0) >= endOf(four, "c-shaft"), true);
  assert.equal((four.find((step) => step.slot === "s-wings")?.start ?? 0) >= endOf(four, "s-housing"), true);
  const a = buildOf("kyotori-a") as BuildStep[];
  assert.equal(a.filter((step) => step.group === "keel")[0].slot, "drive");
  assert.equal(buildOf("kyotori-nowhere"), undefined);
});
