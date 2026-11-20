// Freedom 7: the early-years table's 2.9 m by 1.9 m, not Friendship 7's 3.3 m by 1.8 m, and NASA's model with no mark.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Freedom 7 keeps the table's length and diameter, and Friendship 7 keeps its own", () => {
  const craft = variantOf("freedom-7", "freedom-7");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "1961-05-05");
  assert.equal(craft.firstFlight?.source, "nasa-early-years");
  assert.equal(craft.facts.height.value, 2.9);
  assert.equal(craft.facts.diameter.value, 1.9);
  assert.equal(variantOf("mercury", "friendship-7")?.facts.height.value, 3.3);
  assert.equal(variantOf("mercury", "friendship-7")?.facts.diameter.value, 1.8);
  assert.equal(ROCKETS["freedom-7"].maker, "nasa");
  assert.equal(ROCKETS["freedom-7"].country.value, "US");
  assert.equal(craft.view?.tiltMax, 90);
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "freedom-7"), false);
});

test("the line look is the table's capsule and the painted look is NASA's file", () => {
  const built = build({ rocket: "freedom-7", variant: "freedom-7" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 2.9) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 1.9) < 0.05);
  assert.equal(built.parts[0]?.record.painted?.file, "freedom-7-capsule.glb");
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
});
