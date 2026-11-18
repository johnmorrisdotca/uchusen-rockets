// Explorer 1: a 2.03 m tube. The antennas have no length in a source, so they are not drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

test("Explorer 1 keeps NASA's length, diameter, mass and date, and the article's other figures beside them", () => {
  const craft = variantOf("explorer-1", "explorer-1");
  assert.ok(craft);
  assert.equal(craft.facts.height.value, 2.03);
  assert.equal(craft.facts.diameter.value, 0.159);
  assert.equal(craft.facts.diameter.source, "nasa-explorer-1-fast-facts");
  assert.equal(craft.facts.diameter.others?.[0]?.value, 0.152);
  assert.equal(craft.facts.more.mass?.value, 14);
  assert.equal(craft.facts.more.mass?.others?.[0]?.value, 13.97);
  assert.equal(craft.facts.more.antennas?.value, 4);
  assert.equal(craft.firstFlight?.value, "1958-01-31");
  assert.equal(ROCKETS["explorer-1"].maker, "nasa");
  assert.equal(ROCKETS["explorer-1"].country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "explorer-1"), false);
});

test("the drawing is this package's own tube and cone at the sourced size, and the code-made mesh stays small", () => {
  const built = build({ rocket: "explorer-1", variant: "explorer-1" });
  const box = built.boundsOf("together");
  assert.ok(Math.abs(box.max[1] - box.min[1] - 2.03) < 0.02);
  assert.ok(Math.abs(box.max[0] - box.min[0] - 0.159) < 0.01);
  assert.equal(built.parts[0]?.record.painted, null);
  assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
  assert.ok(built.glb().bytes.length < 600 * 1024);
  assert.equal(built.flamesOf("together").length, 0);
});
