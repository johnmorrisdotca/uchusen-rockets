// Skylab: three tubes at NASA SP-400's lengths and diameters. The shroud's other diameters, the telescope mount and the solar wings have no place or size in a source, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Skylab keeps NASA's date and mass from the catalogue and the lengths from SP-400", () => {
  const craft = variantOf("skylab", "skylab");
  assert.ok(craft);
  assert.equal(craft.firstFlight?.value, "1973-05-14");
  assert.equal(craft.firstFlight?.source, "nasa-nssdca-skylab");
  assert.equal(craft.facts.more.mass?.value, 90607);
  assert.equal(craft.facts.more.workshopLength?.value, 14.66);
  assert.equal(craft.facts.more.airlockLength?.value, 5.36);
  assert.equal(craft.facts.more.dockingAdapterLength?.value, 5.27);
  assert.equal(craft.facts.more.telescopeMountLength?.value, 4.05);
  assert.equal(craft.facts.diameter.value, 6.7);
  assert.equal(craft.facts.height.value, 25.29);
  assert.equal(craft.facts.height.source, "nasa-sp-400-chapter-2");
  assert.equal(ROCKETS.skylab.maker, "nasa");
  assert.equal(ROCKETS.skylab.country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "skylab"), false);
});

test("the drawing is the three tubes at the sourced size and the code-made mesh stays small", () => {
  const built = build({ rocket: "skylab", variant: "skylab" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 25.29) < 0.05);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 6.7) < 0.05);
  assert.equal(built.parts[0]?.record.painted?.file, "skylab-craft.glb");
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
