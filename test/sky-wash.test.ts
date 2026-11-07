import assert from "node:assert/strict";
import { test } from "node:test";
import { gardenInterior, livingInterior } from "../src/model/fleet/ship-01/interiors.ts";
import type { Piece } from "../src/model/pieces.ts";

const hasWash = (pieces: readonly Piece[]): boolean => pieces.some((piece) => "material" in piece && piece.material === "sky-wash");

test("both painted rings carry a sky wash inside the glass", () => {
  assert.equal(hasWash(livingInterior(58, "coarse")), true);
  assert.equal(hasWash(gardenInterior(58, "coarse")), true);
});
