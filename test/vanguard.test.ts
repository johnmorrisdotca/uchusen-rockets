// Vanguard 1: the infobox sphere. The antennas have lengths and a span, and no angle, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Vanguard 1 keeps the infobox sphere and records the antennas it does not place", () => {
  const craft = variantOf("vanguard-1", "vanguard-1");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 0.152);
  assert.equal(craft.facts.diameter.others?.[0]?.value, 0.15);
  assert.equal(craft.facts.height.value, 0.152);
  assert.equal(craft.facts.more.mass?.value, 1.46);
  assert.equal(craft.facts.sizes?.["Antenna span"]?.value, 0.91);
  assert.equal(craft.facts.sizes?.["Antenna length"]?.value, 0.3);
  assert.equal(craft.facts.sizes?.["Antenna diameter"]?.value, 0.008);
  assert.equal(craft.facts.more.antennas?.value, 6);
  assert.equal(craft.firstFlight?.value, "1958-03-17");
  assert.equal(ROCKETS["vanguard-1"].maker, "nrl");
  assert.equal(ROCKETS["vanguard-1"].country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "vanguard-1"), false);
});

test("the drawing is the sphere alone, not the antenna span", () => {
  const built = build({ rocket: "vanguard-1", variant: "vanguard-1" });
  const box = built.boundsOf("together");
  const span = box.max[0] - box.min[0];
  const tall = box.max[1] - box.min[1];
  assert.ok(Math.abs(span - 0.152) < 0.005);
  assert.ok(Math.abs(tall - 0.152) < 0.005);
  assert.ok(span < 0.3);
  assert.equal(built.parts[0]?.pieces.some((piece) => piece.kind === "strut"), false);
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
