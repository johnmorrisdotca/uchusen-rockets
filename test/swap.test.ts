import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOf, check, flightNow } from "../src/index.ts";
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
