// Sputnik 1: the sphere NASA's history pages give. The antennas have no length or angle there, so they are not drawn. The Soviet Union has no code in this list.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Sputnik 1 keeps the 22-inch sphere beside the 23-inch one, and records the antennas it does not draw", () => {
  const craft = variantOf("sputnik-1", "sputnik-1");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 0.5588);
  assert.equal(craft.facts.diameter.others?.[0]?.value, 0.5842);
  assert.equal(craft.facts.height.value, 0.5588);
  assert.equal(craft.facts.more.mass?.value, 83.6);
  assert.equal(craft.facts.more.antennas?.value, 4);
  assert.equal(craft.firstFlight?.value, "1957-10-04");
  assert.equal(ROCKETS["sputnik-1"].maker, "ussr");
  assert.equal(ROCKETS["sputnik-1"].country.value, null);
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "sputnik-1"), false);
  const text = JSON.stringify(craft);
  assert.ok(!/wikipedia/i.test(text), "no figure of Sputnik 1 is from Wikipedia");
});

test("the drawing is the sphere, not the antennas", () => {
  const built = build({ rocket: "sputnik-1", variant: "sputnik-1" });
  const box = built.boundsOf("together");
  const span = box.max[0] - box.min[0];
  const tall = box.max[1] - box.min[1];
  assert.ok(Math.abs(span - 0.5588) < 0.01);
  assert.ok(Math.abs(tall - 0.5588) < 0.01);
  assert.ok(span < 1);
  assert.ok(built.parts[0]?.pieces.every((piece) => piece.kind === "lathe"));
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
