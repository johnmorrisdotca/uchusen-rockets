// The to-scale lineup stands three famous things beside the rockets, at heights taken from a source.
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPARES, lineupSvg } from "../src/build/index.ts";

test("the Statue of Liberty, a 747 and the Eiffel Tower stand at sourced heights", () => {
  assert.equal(COMPARES.liberty.height, 93);
  assert.equal(COMPARES.jet.height, 19.6);
  assert.equal(COMPARES.tower.height, 330);
  const picture = lineupSvg({ items: ["person", "jet", "liberty", "tower"], unit: 1, labels: true });
  assert.deepEqual(picture.items.map((item) => item.height), [1.8, 19.6, 93, 330]);
  assert.ok(picture.svg.includes("Statue of Liberty, 93 m"));
  assert.ok(picture.svg.includes("A 747, 19.6 m"));
  assert.ok(picture.svg.includes("The Eiffel Tower, 330 m"));
});
