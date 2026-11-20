// Mir: the base block and Kvant as two tubes at the lengths and diameters in NASA SP-4225. The side modules have no clock angle in that book, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, partnersOf, variantOf } from "../src/index.ts";

test("Mir keeps the 1986 launch and the base block's mass, and the height is the sum of the two sourced lengths", () => {
  const craft = variantOf("mir", "mir");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "1986-02-19");
  assert.equal(craft.firstFlight?.source, "nasa-sp-4225");
  assert.equal(craft.facts.more.mass?.value, 20400);
  assert.equal(craft.facts.more.baseLength?.value, 13.13);
  assert.equal(craft.facts.more.kvantLength?.value, 5.8);
  assert.equal(craft.facts.more.kvant2Length?.value, 13.73);
  assert.equal(craft.facts.more.kristallLength?.value, 13.73);
  assert.equal(craft.facts.diameter.value, 4.15);
  assert.equal(craft.facts.height.value, 18.93);
  assert.equal(craft.facts.height.source, "nasa-sp-4225");
  assert.equal(ROCKETS.mir.maker, "ussr");
  assert.equal(ROCKETS.mir.country.value, null);
  assert.equal(partnersOf("mir")[0]?.country, "SUHH");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "mir"), false);
});

test("the drawing is two tubes at the sourced size, and the far picture keeps both because each tube is the line drawing", () => {
  const built = build({ rocket: "mir", variant: "mir" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 18.93) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 4.15) < 0.05);
  const far = build({ rocket: "mir", variant: "mir" }, { detail: "coarse" });
  const farBox = far.boundsOf("together");
  assert.ok(Math.abs(farBox.max[1] - farBox.min[1] - 18.93) < 0.05);
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
