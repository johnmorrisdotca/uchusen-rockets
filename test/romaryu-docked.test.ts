// A ship docked on Romaryu is that ship, not the coarse hull.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { SLOTS_C, docked } from "../src/model/fleet/kaminari-concepts/c.ts";

test("Romaryu's docked Miyamoto has the same pieces as Miyamoto on its own", () => {
  const slot = SLOTS_C.find((one) => one.slot === "miyamoto-1");
  assert.ok(slot);
  const alone = docked("miyamoto", 1);
  const drawn = slot.pieces();
  assert.ok(alone.length > 100);
  assert.ok(Math.abs(drawn.length - alone.length) / alone.length < 0.1, `${drawn.length} against ${alone.length}`);
});

test("a second copy of the same docked ship is the first build", () => {
  assert.equal(docked("miyamoto", 1), docked("miyamoto", 1));
  assert.equal(docked("ariake", 1), docked("ariake", 1));
  assert.notEqual(docked("miyamoto", 1), docked("ariake", 1));
});

test("Romaryu's docked ships can be built coarse inside its full build, and nothing else changes", () => {
  const triangles = (part: ReturnType<typeof build>["parts"][number]): number => {
    let count = 0;
    for (const face of part.mesh.faces.values()) count += face.indices.length ? face.indices.length / 3 : face.positions.length / 9;
    return count;
  };
  const full = build({ rocket: "fleet-romaryu" }, { detail: "full" });
  const light = build({ rocket: "fleet-romaryu" }, { detail: "full", dockedDetail: "coarse" });
  assert.deepEqual(light.parts.map((part) => part.slot), full.parts.map((part) => part.slot));
  let fullTotal = 0;
  let lightTotal = 0;
  for (const [i, part] of full.parts.entries()) {
    const other = light.parts[i];
    assert.ok(other);
    fullTotal += triangles(part);
    lightTotal += triangles(other);
    if (!part.slot.startsWith("miyamoto-")) assert.equal(triangles(other), triangles(part), part.slot);
  }
  assert.ok(lightTotal < fullTotal / 2, `${lightTotal} against ${fullTotal}`);
  assert.equal(build({ rocket: "fleet-romaryu" }, { detail: "full" }).parts.reduce((sum, part) => sum + triangles(part), 0), fullTotal);
});
