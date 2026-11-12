// A faceted file stores a fresh normal on every face, so a weld that insists on the normal never joins them and a simplifier has no edge to collapse.
import assert from "node:assert/strict";
import { test } from "node:test";
import { weld } from "../scripts/weld.ts";

// Two triangles of a quad. The shared corners are stored twice, once for each face.
const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0];
const uvs = [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1];
const faceted = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];

test("a loose weld joins a faceted corner, and the strict weld leaves it split", () => {
  const loose = weld(positions, faceted, uvs, 1, [0, 0, 0], true);
  const strict = weld(positions, faceted, uvs, 1, [0, 0, 0], false);
  assert.equal(loose.positions.length / 3, 4);
  assert.equal(strict.positions.length / 3, 6);
});

test("a loose weld still keeps a picture seam split", () => {
  const samePlace = [0, 0, 0, 0, 0, 0];
  const sameNormal = [0, 0, 1, 0, 0, 1];
  const twoPictures = [0, 0, 0.5, 0.5];
  const joined = weld(samePlace, sameNormal, twoPictures, 1, [0, 0, 0], true);
  assert.equal(joined.positions.length / 3, 2);
});
