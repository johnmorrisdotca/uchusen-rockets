// The shared docking choice: a craft meets the collar it is allowed at, one to a port, and a later build does not keep the previous craft.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { CREW_PORT_Y, dockedCraft, dockedReach, dockMenu, dockPlan } from "../src/model/fleet/docked.ts";
import { DOCK } from "../src/model/fleet/ship-01/docking.ts";
import { PORTS } from "../src/model/fleet/ship-kyotori/docking.ts";

test("a craft the port does not list is not drawn, and the last named craft is the one that stays", () => {
  assert.equal(dockedCraft("fleet-ship-01", "starship@crew-s").length, 0);
  assert.equal(dockedCraft("fleet-ship-01", "").length, 0);
  assert.equal(dockedCraft("fleet-ship-01", null).length, 0);
  const both = dockedReach("fleet-ship-01", "dragon@crew-s,orion@crew-s");
  const orion = dockedReach("fleet-ship-01", "orion@crew-s");
  assert.ok(both && orion);
  assert.ok(Math.abs(both.min[1] - orion.min[1]) < 0.01);
});

test("Dragon's nose meets Hanabusa's crew port, and the Starship lies in its berth", () => {
  const dragon = dockedReach("fleet-ship-01", "dragon@crew-s");
  assert.ok(dragon);
  assert.ok(Math.abs(dragon.max[1] - CREW_PORT_Y) < 0.05, String(dragon.max[1]));
  assert.ok(dragon.max[1] - dragon.min[1] > 8);
  const stage = dockedReach("fleet-ship-01", "starship@starship");
  assert.ok(stage);
  assert.ok(Math.abs(stage.min[1] - DOCK.berth.y0) < 0.05, String(stage.min[1]));
  assert.ok(Math.abs(stage.max[1] - (DOCK.berth.y0 + DOCK.berth.length)) < 0.2);
});

test("a nose-down port holds the craft off the collar, not through it", () => {
  const port = PORTS.find((one) => one.id === "hub-0");
  assert.ok(port);
  const reach = dockedReach("fleet-kyotori", "dragon@hub-0");
  assert.ok(reach);
  assert.ok(Math.abs(reach.min[1] - port.at[1]) < 0.05, String(reach.min[1]));
  assert.ok(reach.max[1] > port.at[1] + 7);
});

test("a Dragon hangs below Miyamoto's ventral port, nose on the collar", () => {
  const reach = dockedReach("fleet-ship-03", "dragon@dragon-ventral");
  assert.ok(reach);
  assert.ok(Math.abs(reach.max[2] - -28) < 0.2, String(reach.max[2]));
  assert.ok(reach.min[2] < -34, String(reach.min[2]));
  assert.ok(Math.abs((reach.min[0] + reach.max[0]) / 2 - 8) < 1.5);
  assert.equal(dockedCraft("fleet-ship-03", "dragon@starship-ventral").length, 0);
  assert.equal(dockMenu("fleet-ship-03").length, 2);
  const bare = build({ rocket: "fleet-ship-03", variant: "miyamoto" }, { detail: "coarse" });
  const docked = build({ rocket: "fleet-ship-03", variant: "miyamoto" }, { detail: "coarse", docked: "dragon@dragon-ventral" });
  const again = build({ rocket: "fleet-ship-03", variant: "miyamoto" }, { detail: "coarse" });
  const count = (built: typeof bare) => built.parts.find((part) => part.slot === "fuel-fore")?.pieces.length ?? 0;
  assert.ok(count(docked) > count(bare));
  assert.equal(count(again), count(bare));
});

test("a Dragon hangs off the first design's starboard dock arm", () => {
  const reach = dockedReach("fleet-02", "dragon@starboard-26");
  assert.ok(reach);
  assert.ok(Math.abs(reach.min[0] - 158) < 0.3, String(reach.min[0]));
  assert.ok(reach.max[0] > 164, String(reach.max[0]));
  assert.equal(dockMenu("fleet-02").length, 4);
  assert.equal(dockMenu("fleet-02-original").length, 4);
});

test("Kaminari's Dragon port holds the nose up, and the three concept ships offer the same four berths", () => {
  const reach = dockedReach("fleet-kaminari", "dragon@dragon");
  assert.ok(reach);
  assert.ok(Math.abs((reach.min[0] + reach.max[0]) / 2 - -36) < 2, String(reach.min[0]));
  assert.ok(reach.max[1] > reach.min[1] + 6);
  for (const rocket of ["fleet-kaminari", "fleet-emiake", "fleet-romaryu"]) assert.equal(dockMenu(rocket).length, 4);
});

test("the menu is the ports that name a craft, and a build does not keep a craft it was not asked for", () => {
  assert.ok(dockMenu("fleet-ship-01").some((port) => port.id === "crew-s" && port.craft.some((craft) => craft.id === "dragon")));
  assert.equal(dockMenu("starship").length, 0);
  assert.equal(dockPlan("fleet-kyotori").includes("dragon@quarter-control"), true);
  const bare = build({ rocket: "fleet-ship-01", variant: "hanabusa" }, { detail: "coarse" });
  const docked = build({ rocket: "fleet-ship-01", variant: "hanabusa" }, { detail: "coarse", docked: "dragon@crew-s" });
  const again = build({ rocket: "fleet-ship-01", variant: "hanabusa" }, { detail: "coarse" });
  const count = (built: typeof bare) => built.parts.find((part) => part.slot === "docks")?.pieces.length ?? 0;
  assert.ok(count(docked) > count(bare));
  assert.equal(count(again), count(bare));
});
