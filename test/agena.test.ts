// The Agena target vehicle: the early-years summary's length and diameter, and NASA's model with its flag painted out.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("the Agena keeps the summary's length, diameter and Gemini 8's day", () => {
  const craft = variantOf("agena", "agena");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "1966-03-16");
  assert.equal(craft.firstFlight?.source, "nasa-early-years");
  assert.equal(craft.facts.height.value, 9.75);
  assert.equal(craft.facts.diameter.value, 1.5);
  assert.equal(ROCKETS.agena.maker, "nasa");
  assert.equal(ROCKETS.agena.country.value, "US");
  assert.equal(craft.view?.tiltMax, 90);
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "agena"), false);
});

test("the line look is the summary's tube and the painted look is NASA's file", () => {
  const built = build({ rocket: "agena", variant: "agena" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 9.75) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 1.5) < 0.05);
  assert.equal(built.parts[0]?.record.painted?.file, "agena-craft.glb");
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
});
