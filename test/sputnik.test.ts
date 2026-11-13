// Sputnik 1: the infobox sphere. The antennas have lengths and no angle, so they are not drawn. The Soviet Union has no code in this list.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Sputnik 1 keeps the infobox sphere and records the antennas and the shell it does not draw", () => {
  const craft = variantOf("sputnik-1", "sputnik-1");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 0.58);
  assert.equal(craft.facts.diameter.others?.[0]?.value, 0.585);
  assert.equal(craft.facts.height.value, 0.58);
  assert.equal(craft.facts.more.mass?.value, 83.6);
  assert.equal(craft.facts.sizes?.["Shorter antenna"]?.value, 2.4);
  assert.equal(craft.facts.sizes?.["Longer antenna"]?.value, 2.9);
  assert.equal(craft.facts.sizes?.["Shell thickness"]?.value, 0.002);
  assert.equal(craft.facts.sizes?.["Heat shield"]?.value, 0.001);
  assert.equal(craft.firstFlight?.value, "1957-10-04");
  assert.equal(ROCKETS["sputnik-1"].maker, "okb-1");
  assert.equal(ROCKETS["sputnik-1"].country.value, null);
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "sputnik-1"), false);
});

test("the drawing is the outer sphere, not the antennas", () => {
  const built = build({ rocket: "sputnik-1", variant: "sputnik-1" });
  const box = built.boundsOf("together");
  const span = box.max[0] - box.min[0];
  const tall = box.max[1] - box.min[1];
  assert.ok(Math.abs(span - 0.58) < 0.01);
  assert.ok(Math.abs(tall - 0.58) < 0.01);
  assert.ok(span < 1);
  assert.ok(built.parts[0]?.pieces.every((piece) => piece.kind === "lathe"));
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
