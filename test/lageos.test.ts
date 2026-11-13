// LAGEOS-1: a 0.60 m sphere. The retroreflectors have a count and no size, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("LAGEOS-1 keeps the ILRS page's diameter, mass, reflector count and launch date", () => {
  const craft = variantOf("lageos", "lageos-1");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 0.6);
  assert.equal(craft.facts.height.value, 0.6);
  assert.equal(craft.facts.parts.craft?.value, 0.6);
  assert.equal(craft.facts.more.mass?.value, 406.965);
  assert.equal(craft.facts.more.mass?.source, "ilrs-lageos-1");
  assert.equal(craft.facts.more.mass?.others, undefined, "no other mass: the page gives one");
  assert.equal(craft.firstFlight?.value, "1976-05-04");
  assert.equal(craft.facts.more.reflectors?.value, 426);
  assert.equal(ROCKETS.lageos.maker, "nasa");
  assert.equal(ROCKETS.lageos.country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "lageos"), false);
});

test("the drawing is this package's own sphere and the code-made mesh stays small", () => {
  const built = build({ rocket: "lageos", variant: "lageos-1" });
  const box = built.boundsOf("together");
  const span = box.max[0] - box.min[0];
  const tall = box.max[1] - box.min[1];
  assert.ok(Math.abs(span - 0.6) < 0.02);
  assert.ok(Math.abs(tall - 0.6) < 0.02);
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
