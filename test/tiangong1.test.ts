// Tiangong-1: the catalogue's 10.4 m, 3.35 m and 2.8 m, with the experiment section as the remainder. The front cone and the solar panels are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, partnersOf, variantOf } from "../src/index.ts";

test("Tiangong-1 keeps the catalogue's day, mass and module sizes", () => {
  const craft = variantOf("tiangong-1", "tiangong-1");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "2011-09-29");
  assert.equal(craft.firstFlight?.source, "space40-2011-053a");
  assert.equal(craft.facts.more.mass?.value, 8506);
  assert.equal(craft.facts.more.experimentLength?.value, 5.6);
  assert.equal(craft.facts.more.coneLength?.value, 1.6);
  assert.equal(craft.facts.more.serviceLength?.value, 3.2);
  assert.equal(craft.facts.more.serviceDiameter?.value, 2.8);
  assert.equal(craft.facts.diameter.value, 3.35);
  assert.equal(craft.facts.height.value, 10.4);
  assert.equal(craft.facts.height.source, "space40-2011-053a");
  assert.equal(ROCKETS["tiangong-1"].maker, "china");
  assert.equal(ROCKETS["tiangong-1"].country.value, "CN");
  assert.equal(partnersOf("tiangong-1")[0]?.country, "CN");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "tiangong-1"), false);
});

test("the drawing is the two tubes and the cone, and the far picture keeps all three", () => {
  const built = build({ rocket: "tiangong-1", variant: "tiangong-1" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 10.4) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 3.35) < 0.05);
  const far = build({ rocket: "tiangong-1", variant: "tiangong-1" }, { detail: "coarse" });
  const farBox = far.boundsOf("together");
  assert.ok(Math.abs(farBox.max[1] - farBox.min[1] - 10.4) < 0.05, "each section is the line drawing, so the far picture keeps it");
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
