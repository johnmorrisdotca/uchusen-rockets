// A ship docked on Romaryu is that ship, not the coarse hull.
import assert from "node:assert/strict";
import { test } from "node:test";
import { SLOTS_C, docked } from "../src/model/fleet/kaminari-concepts/c.ts";

test("Romaryu's docked Miyamoto has the same pieces as Miyamoto on its own", () => {
  const slot = SLOTS_C.find((one) => one.slot === "miyamoto-1");
  assert.ok(slot);
  const alone = docked("miyamoto", 1);
  const drawn = slot.pieces();
  assert.ok(alone.length > 100);
  assert.ok(Math.abs(drawn.length - alone.length) / alone.length < 0.1, `${drawn.length} against ${alone.length}`);
});
