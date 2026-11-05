// How far each variant's view may be tipped: 90 degrees for a craft in space, 45 for a rocket or a site on the ground.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ROCKETS, variantOf } from "../src/index.ts";

const SPACE = ["dragon", "lunar-module", "apollo-soyuz", "gemini", "mercury", "iss", "hubble", "fleet-ship-03", "fleet-ship-ariake", "fleet-02"];
const GROUND = ["starship", "falcon-9", "falcon-heavy", "saturn-v", "space-shuttle", "sls", "new-glenn", "electron", "soyuz", "jupiter-c", "grasshopper", "falcon-1", "droneship", "landing-zone", "launch-tower", "starbase"];

test("every variant says how far its view may tip, and it is 45 or 90", () => {
  for (const rocket of Object.values(ROCKETS)) for (const variant of rocket.variants) assert.ok([45, 90].includes(variant.view?.tiltMax ?? 0), `${rocket.id} ${variant.id}`);
});

test("craft in space and the fleet tip to 90, rockets on the ground to 45", () => {
  for (const id of SPACE) for (const variant of ROCKETS[id].variants) assert.equal(variant.view?.tiltMax, 90, `${id} ${variant.id}`);
  for (const id of GROUND) for (const variant of ROCKETS[id].variants) assert.equal(variant.view?.tiltMax, 45, `${id} ${variant.id}`);
});

test("every fleet kit sample is a craft in space; the lists above leave no rocket out", () => {
  for (const [id, rocket] of Object.entries(ROCKETS)) {
    if (id.startsWith("fleet")) for (const variant of rocket.variants) assert.equal(variant.view?.tiltMax, 90, `${id} ${variant.id}`);
    else assert.ok([...SPACE, ...GROUND].includes(id), `${id} is in neither list`);
  }
  assert.equal(variantOf("starship", "v3")?.view?.tiltMax, 45);
  assert.equal(variantOf("iss")?.view?.tiltMax, 90);
});
