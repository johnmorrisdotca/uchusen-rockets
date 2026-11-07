import assert from "node:assert/strict";
import { test } from "node:test";
import { tree } from "../src/model/fleet/ship-01/interiors.ts";
import type { Piece } from "../src/model/pieces.ts";

const shaded = (pieces: readonly Piece[]): boolean => pieces.some((piece) => "material" in piece && piece.material === "black");

test("every tree sits on a dark contact patch", () => {
  for (const species of ["spruce", "poplar", "oak", "blossom", "fruit"] as const) assert.equal(shaded(tree(species, 0, 0, 10, 4, 3, true)), true, species);
});
