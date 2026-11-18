// Vanguard 1: a 152 mm sphere. The antennas have a length and no angle in the source, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Vanguard 1 keeps the article's diameter, mass and antenna count and NASA's date", () => {
  const craft = variantOf("vanguard-1", "vanguard-1");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 0.152);
  assert.equal(craft.facts.height.value, 0.152);
  assert.equal(craft.facts.diameter.others?.[0]?.value, 0.15);
  assert.equal(craft.facts.more.mass?.value, 1.46);
  assert.equal(craft.facts.more.antennas?.value, 6);
  assert.equal(craft.firstFlight?.value, "1958-03-17");
  assert.equal(craft.firstFlight?.source, "nasa-vanguard-satellite-1958");
  assert.equal(ROCKETS["vanguard-1"].maker, "us-navy");
  assert.equal(ROCKETS["vanguard-1"].country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "vanguard-1"), false);
});

test("the drawing is this package's own sphere and the code-made mesh stays small", () => {
  const built = build({ rocket: "vanguard-1", variant: "vanguard-1" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[0] - box.min[0] - 0.152) < 0.01);
  assert.ok(Math.abs(box.max[1] - box.min[1] - 0.152) < 0.01);
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
