import assert from "node:assert/strict";
import { test } from "node:test";
import { craftJets, endQuads, hasThrusters, PUFF_LIFE, PUFF_REACH, puffStep, pushJets, thrusterMode, turnPair, yardJets } from "../src/thrusters.ts";

test("the three thruster choices, and nothing else", () => {
  assert.equal(thrusterMode(null), "off");
  assert.equal(thrusterMode("show"), "show");
  assert.equal(thrusterMode("station-keeping"), "station-keeping");
  assert.equal(thrusterMode("all"), "off");
});

test("jets only for the fleet, the Shuttle, Dragon, Apollo and the station", () => {
  assert.equal(hasThrusters("fleet-ship-01"), true);
  assert.equal(hasThrusters("space-shuttle"), true);
  assert.equal(hasThrusters("dragon"), true);
  assert.equal(hasThrusters("apollo-soyuz"), true);
  assert.equal(hasThrusters("iss"), true);
  assert.equal(hasThrusters("starship"), false);
});

test("the Shuttle's jets sit in the nose and on the OMS pods", () => {
  const jets = craftJets("space-shuttle", "stack");
  assert.ok(Array.isArray(jets));
  if (!Array.isArray(jets)) return;
  assert.ok(jets.every((jet) => jet.slot === "orbiter" && jet.fuel === "hypergolic"));
  assert.ok(jets.some((jet) => jet.at[1] > 34));
  assert.ok(jets.filter((jet) => jet.at[1] < 12 && Math.abs(Math.abs(jet.at[0]) - 2) < 0.2).length > 4);
});

test("Dragon keeps its Draco count and Apollo has four quads", () => {
  const crew = craftJets("dragon", "dragon-2");
  const cargo = craftJets("dragon", "dragon-1");
  assert.ok(Array.isArray(crew) && crew.length === 16);
  assert.ok(Array.isArray(cargo) && cargo.length === 18);
  if (Array.isArray(crew)) assert.ok(crew.every((jet) => jet.fuel === "hypergolic" && jet.bell < 0.3));
  const apollo = craftJets("apollo-soyuz", "apollo-soyuz");
  assert.ok(Array.isArray(apollo) && apollo.length === 16);
  if (!Array.isArray(apollo)) return;
  assert.ok(apollo.every((jet) => jet.slot === "csm" && jet.fuel === "hypergolic"));
  const places = new Set(apollo.map((jet) => `${jet.at[0].toFixed(2)},${jet.at[2].toFixed(2)}`));
  assert.equal(places.size, 4);
});

test("Zvezda's two large bells and the small ring are at the aft end", () => {
  const jets = craftJets("iss", "iss");
  assert.ok(Array.isArray(jets));
  if (!Array.isArray(jets)) return;
  assert.equal(jets.filter((jet) => jet.bell > 0.6).length, 2);
  assert.ok(jets.every((jet) => jet.at[1] < 20 && jet.fuel === "hypergolic"));
  assert.ok(jets.filter((jet) => jet.bell < 0.4).length > 4);
});

test("a turn uses opposite corners and a push uses one side", () => {
  const jets = endQuads([0, 0, 0], [10, 80, 10]);
  const pair = turnPair(jets);
  assert.ok(pair);
  if (!pair) return;
  assert.ok(pair[0].at[1] > pair[1].at[1]);
  assert.ok(pair[0].dir[0] < 0);
  assert.ok(pair[1].dir[0] > 0);
  const push = pushJets(jets, 1, 1);
  assert.ok(push.length > 0);
  assert.ok(push.every((jet) => jet.dir[1] < 0));
});

test("a puff stays inside a few metres and then dies", () => {
  const mid = puffStep(PUFF_LIFE / 2, [0, 0, 0], [0, 1, 0]);
  assert.ok(mid);
  assert.ok(Math.abs((mid?.at[1] ?? 0) - PUFF_REACH / 2) < 1e-9);
  assert.ok((mid?.alpha ?? 0) > 0);
  assert.equal(puffStep(PUFF_LIFE, [0, 0, 0], [0, 1, 0]), null);
});

test("the yard's quads sit on the outer sides and at the dock", () => {
  const jets = yardJets();
  assert.ok(jets.some((jet) => jet.at[0] > 200));
  assert.ok(jets.some((jet) => jet.at[0] < -200));
  assert.ok(jets.some((jet) => jet.at[0] > 1400));
  assert.ok(jets.every((jet) => jet.fuel === "cold"));
});
