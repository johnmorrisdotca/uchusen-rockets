import assert from "node:assert/strict";
import { test } from "node:test";
import { gardenInterior } from "../src/model/fleet/ship-01/interiors.ts";
import type { Piece } from "../src/model/pieces.ts";

const count = (pieces: readonly Piece[], name: string): number => pieces.filter((piece) => "material" in piece && piece.material === name).length;

test("the garden ring's racks have trays, a feed pipe, seedlings and a grow lamp", () => {
  const fine = gardenInterior(58, "fine");
  const coarse = gardenInterior(58, "coarse");
  assert.ok(count(fine, "lamp-blue") > 0);
  assert.ok(count(fine, "pipe-steel") > 0);
  assert.ok(count(fine, "soil") > 0);
  assert.equal(count(coarse, "lamp-blue"), count(fine, "lamp-blue"));
  assert.ok(count(fine, "crop-green") > count(coarse, "crop-green"));
});
