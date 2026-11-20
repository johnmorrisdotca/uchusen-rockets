// Viking Lander: the footpad triangle, the body and the launch, and a plain shape that keeps them.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("the Viking lander keeps the pages' triangle, body, mass and Viking 1's launch", () => {
  const craft = variantOf("viking-lander", "viking-lander");
  assert.ok(craft);
  assert.equal(craft.facts.diameter.value, 2.21);
  assert.equal(craft.facts.diameter.source, "nasa-viking-spacecraft");
  assert.equal(craft.facts.height.value, 2);
  assert.equal(craft.facts.height.source, "nasa-viking-facts");
  assert.equal(craft.facts.parts.craft?.value, 2);
  assert.equal(craft.facts.more.mass?.value, 576);
  assert.equal(craft.firstFlight?.value, "1975-08-20");
  const sizes = craft.facts.sizes;
  assert.ok(sizes);
  assert.equal(sizes["Body width"].value, 1.5);
  assert.equal(sizes["Body depth"].value, 0.46);
  assert.equal(sizes["Ground clearance"].value, 0.22);
  assert.equal(sizes["Leg length"].value, 1.3);
  assert.equal(sizes["Footpad diameter"].value, 0.305);
  assert.equal(ROCKETS["viking-lander"].maker, "nasa");
  assert.equal(ROCKETS["viking-lander"].country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "viking-lander"), false);
});

test("the line shape is 2 m tall across the 2.21 m triangle, and the coarse picture keeps it", () => {
  const near = build({ rocket: "viking-lander", variant: "viking-lander" });
  const far = build({ rocket: "viking-lander", variant: "viking-lander" }, { detail: "coarse" });
  for (const built of [near, far]) {
    const box = built.boundsOf("together");
    assert.ok(Math.abs(box.max[1] - box.min[1] - 2) < 0.05, `height ${box.max[1] - box.min[1]}`);
    assert.ok(Math.abs(box.max[0] - box.min[0] - 2.21) < 0.05, `width ${box.max[0] - box.min[0]}`);
  }
  assert.equal(near.parts[0]?.record.painted?.file, "viking-lander-craft.glb");
  assert.ok(near.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(near.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(near.glb().bytes.length < 600 * 1024);
  assert.equal(near.flamesOf("together").length, 0);
});
