// The service fittings of MODULES-435: two Starship bodies in each box, the exterior saddles, the two stack berths, and Miyamoto's two collars.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BAYS, ENVELOPE } from "../src/model/fleet/ship-03/dims.ts";
import { BODY, SERVICE_PORTS, cradleAxes } from "../src/model/fleet/ship-03/service.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";

test("each box's cradles keep the clearance the beam grew for", () => {
  assert.equal(ENVELOPE.beam, 138);
  assert.ok(BODY.stack >= 124 && BODY.stack < 125, `stack ${BODY.stack}`);
  for (const bay of Object.keys(BAYS) as (keyof typeof BAYS)[]) {
    const axes = cradleAxes(bay);
    assert.ok(axes.clearance >= 1.5, `${bay} clearance ${axes.clearance}`);
    assert.ok(Math.abs(axes.outer - axes.spine) >= BODY.radius * 2 + 2, bay);
  }
});

test("Ariake's looks: loaded saddles, empty mounts, and both berths of at least 135 m", () => {
  const slots = (id: string) => Object.values(MIYAMOTO_VARIANT_SLOTS[id]);
  assert.ok(slots("ariake").includes("exterior-load"));
  assert.ok(!slots("ariake-empty").includes("exterior-load"));
  assert.ok(slots("ariake-berth-keel").includes("stack-berth-keel"));
  assert.ok(slots("ariake-berth-keel").includes("fuel-aft-inboard"));
  assert.ok(slots("ariake-berth-port").includes("stack-berth-port"));
  assert.ok(slots("ariake-berth-port").includes("hangar-port-ariake-moved"));
  assert.ok(BODY.stack <= 140 && BODY.stack <= 146);
  assert.ok(214 + BODY.stack <= 214 + 140);
  assert.ok(108 + BODY.stack <= 108 + 146);
});

test("Miyamoto's visiting ports are two collars, one for each craft", () => {
  assert.deepEqual(SERVICE_PORTS.map((port) => port.collar), ["L", "M"]);
  assert.deepEqual(SERVICE_PORTS.map((port) => port.craft[0]), ["starship", "dragon"]);
  for (const port of SERVICE_PORTS) {
    const length = Math.hypot(...port.direction);
    assert.ok(Math.abs(length - 1) < 1e-9, port.name);
  }
});
