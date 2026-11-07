// In space the lower stages are gone. The launch stack is what a picture shows until it is asked otherwise.
import assert from "node:assert/strict";
import { test } from "node:test";
import { besideCraft } from "../src/beside.ts";
import { build } from "../src/build/index.ts";
import { spaceLength, spaceSlots } from "../src/inspace.ts";
import { variantOf } from "../src/rockets.ts";

test("in space a launch stack keeps the part that is still flying, closed up on the axis", () => {
  const ship = build({ rocket: "starship", variant: "v3", form: "space" }, { named: true });
  assert.deepEqual(ship.parts.map((part) => part.slot), ["ship"]);
  assert.match(ship.names[0], /, 52 m$/);
  const starship = variantOf("starship", "v3");
  assert.equal(spaceLength("starship", starship?.slots ?? [], starship?.facts.parts), 52);
  const height = ship.boundsOf("together").max[1] - ship.boundsOf("together").min[1];
  assert.ok(height > 45 && height < 70, String(height));
  assert.ok(build({ rocket: "starship", variant: "v3" }).parts.some((part) => part.slot === "booster"));

  const orbiter = build({ rocket: "space-shuttle", variant: "stack", form: "space" });
  assert.deepEqual(orbiter.parts.map((part) => part.slot), ["orbiter"]);
  assert.equal(orbiter.placesOf("together")[0]?.at[0], 0);

  assert.deepEqual(build({ rocket: "saturn-v", variant: "saturn-v", form: "space" }).parts.map((part) => part.slot), ["third-stage", "adapter", "service-module", "capsule"]);
  assert.deepEqual(build({ rocket: "sls", variant: "block-1", form: "space" }).parts.map((part) => part.slot), ["upper-stage", "service-module", "capsule"]);
  assert.deepEqual(build({ rocket: "falcon-9", variant: "block-5", form: "space" }).parts.map((part) => part.slot), ["second-stage", "fairing"]);

  assert.equal(spaceSlots("iss", ["modules"]), null);
  assert.equal(spaceSlots("starship", ["ship"]), null);
  assert.equal(spaceSlots("falcon-heavy", variantOf("falcon-heavy", "falcon-heavy")?.slots ?? []), null);
});

test("a craft beside another can be asked for in space", () => {
  assert.deepEqual(besideCraft("starship:v3:space", "falcon-9"), [{ rocket: "starship", variant: "v3", form: "space" }]);
  assert.deepEqual(besideCraft("starship:v3", "falcon-9"), [{ rocket: "starship", variant: "v3" }]);
});
