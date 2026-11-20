// The crawler-transporter: the fact sheet's length, width and retracted height, and NASA's model for the painted look.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("the crawler keeps the fact sheet's size and the day it first moved itself", () => {
  const craft = variantOf("crawler", "crawler");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "1965-01-23");
  assert.equal(craft.firstFlight?.source, "nasa-the-crawlers");
  assert.equal(craft.facts.height.value, 6.1);
  assert.equal(craft.facts.diameter.value, 34.75);
  assert.equal(craft.facts.more.mass?.value, 2_993_710);
  assert.equal(craft.facts.sizes?.Length?.value, 39.93);
  assert.equal(ROCKETS.crawler.maker, "nasa");
  assert.equal(ROCKETS.crawler.country.value, "US");
  assert.equal(craft.view?.tiltMax, 45);
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "crawler"), false);
});

test("the line look is the fact sheet's slab and the painted look is NASA's file", () => {
  const built = build({ rocket: "crawler", variant: "crawler" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 6.1) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 34.75) < 0.05);
  assert.ok(Math.abs(box.max[2] - box.min[2] - 39.93) < 0.05);
  assert.equal(built.parts[0]?.record.painted?.file, "crawler-craft.glb");
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
});
