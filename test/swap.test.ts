import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOf, check, fitsMount, flightNow, KIT, kitSwaps, mates, matingOnly, SAMPLE_SHIPS, swapCandidates } from "../src/index.ts";
import { chosenSwap, mountsOf, swapParts, swapQuery } from "../src/swap.ts";

test("a mission pod swaps onto the same mount, and the variant's own pod is not a change", () => {
  assert.equal(mountsOf("starship").length, 0);
  assert.equal(mountsOf("fleet-ship-03")[0]?.choices.length, 3);
  assert.equal(swapParts("fleet-ship-03", "miyamoto", "pod:relay"), null);
  assert.deepEqual(swapParts("fleet-ship-03", "miyamoto", "pod:relief"), { pod: "fleet-ship-03-pod-relief" });
  assert.equal(swapParts("fleet-ship-ariake", "ariake", "pod:survey"), null);
  assert.deepEqual(swapParts("fleet-ship-ariake", "ariake", "pod:relief"), { pod: "fleet-ship-03-pod-relief" });
  const report = check({ rocket: "fleet-ship-03", variant: "miyamoto", parts: { pod: "fleet-ship-03-pod-survey" } });
  assert.equal(report.ok, true);
  assert.equal(report.parts.find((part) => part.slot === "pod")?.part.id, "fleet-ship-03-pod-survey");
  assert.equal(chosenSwap("fleet-ship-03", "miyamoto", "pod:relief").pod, "relief");
  assert.equal(swapQuery("fleet-ship-03", "miyamoto", { pod: "relay" }), null);
  assert.equal(swapQuery("fleet-ship-03", "miyamoto", { pod: "survey" }), "pod:survey");
});

test("the first design's hardpoints take the other modules", () => {
  assert.equal(mountsOf("fleet-02").length, 4);
  const parts = swapParts("fleet-02", "fleet-02", "pod:survey,tip-port:tug");
  assert.deepEqual(parts, { pod: "fleet-02-pod-survey", "tip-port": "fleet-02-tip-port-tug" });
  assert.equal(check({ rocket: "fleet-02", variant: "fleet-02", parts: parts ?? {} }).ok, true);
});

test("the build names the flight that is underway, from the keel", () => {
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  const first = flightNow(steps, 0);
  assert.equal(first?.n, 1);
  assert.equal(first?.slot, "drive");
  assert.equal(first?.title, "Drive");
  const later = flightNow(steps, 1);
  assert.ok(later && later.n > 1);
  assert.equal(flightNow([], 0), null);
});

test("a module is offered only when its collar mates with the mount's", () => {
  assert.equal(fitsMount({ collar: "L" }, { collar: "L" }), true);
  assert.equal(fitsMount({ collar: "L" }, { collar: "M" }), false);
  assert.equal(fitsMount({ collar: "L" }, {}), false);
  assert.equal(fitsMount({}, { collar: "M" }), true);
  const mount = matingOnly({ slot: "x", name: "X", collar: "M", choices: [{ id: "a", part: "a", name: "A", collar: "M" }, { id: "b", part: "b", name: "B", collar: "L" }, { id: "c", part: "c", name: "C" }] });
  assert.deepEqual(mount.choices.map((one) => one.id), ["a"]);
  for (const [rocket, variant] of [["fleet-ship-03", "miyamoto"], ["fleet-02", "fleet-02"], ["fleet-kyotori", "kyotori-a"], ["fleet-samples", "hauler"]]) {
    const mounts = mountsOf(rocket, variant);
    assert.ok(mounts.length > 0, `${rocket} has mounts`);
    for (const mount of mounts) for (const one of mount.choices) assert.equal(fitsMount(mount, one), true, `${rocket} ${mount.slot} ${one.id}`);
  }
});

test("the kit sample ship swaps by collar and the ship still checks", () => {
  const hauler = SAMPLE_SHIPS.hauler;
  const first = hauler.findIndex((spot) => spot.module === "container-12");
  assert.equal(swapCandidates(hauler, first).map((one) => one.id).join(), "container-12-cold");
  for (let i = 0; i < hauler.length; i++) for (const one of swapCandidates(hauler, i)) {
    const own = KIT[hauler[i].module];
    assert.equal(one.length, own.length, `${one.id} for ${own.id}: same length`);
    assert.equal(one.kind, own.kind);
    assert.equal(mates(own.bottom, one.bottom) || (own.bottom === undefined && one.bottom === undefined), true, `${one.id} for ${own.id}: base collar`);
  }
  const mounts = mountsOf("fleet-samples", "hauler");
  const slot = mounts.find((mount) => mount.slot.startsWith("container-12-5"))?.slot ?? "";
  assert.ok(slot);
  assert.deepEqual(swapParts("fleet-samples", "hauler", `${slot}:container-12-cold`), { [slot]: `fleet-samples-hauler-${slot}-as-container-12-cold` });
  assert.equal(swapQuery("fleet-samples", "hauler", { [slot]: "container-12-cold" }), `${slot}:container-12-cold`);
  assert.equal(swapQuery("fleet-samples", "hauler", { [slot]: "container-12" }), null);
  const report = check({ rocket: "fleet-samples", variant: "hauler", parts: swapParts("fleet-samples", "hauler", `${slot}:container-12-cold`) ?? {} });
  assert.equal(report.ok, true);
  assert.equal(report.parts.find((part) => part.slot === slot)?.part.strapOn?.y, check({ rocket: "fleet-samples", variant: "hauler" }).parts.find((part) => part.slot === slot)?.part.strapOn?.y);
  assert.equal(kitSwaps("t", hauler).mounts.every((mount) => mount.choices.length > 1), true);
});

test("an address that names a module that does not mate, or a mount that is not there, changes nothing", () => {
  const slot = mountsOf("fleet-samples", "hauler").find((mount) => mount.slot.startsWith("container-12-5"))?.slot ?? "";
  assert.equal(swapParts("fleet-samples", "hauler", `${slot}:habitat-drum-large`), null);
  assert.equal(swapParts("fleet-samples", "hauler", "nowhere-9:container-12-cold"), null);
  assert.equal(swapParts("fleet-kyotori", "kyotori", "role:crew"), null);
  assert.deepEqual(swapParts("fleet-kyotori", "kyotori-a", "role:crew"), { role: "fleet-kyotori-k-role-crew" });
  assert.equal(mountsOf("fleet-kyotori", "kyotori").length, 0);
});
