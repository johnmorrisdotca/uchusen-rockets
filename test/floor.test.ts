// Detached pieces under 2 cm are specks. Parker had them floating beside the craft; none may remain.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PART_FLOOR, paintedMesh, specksBelowFloor } from "../scripts/floor.ts";

test("Parker has no detached piece below the 2 cm floor", () => {
  const specks = specksBelowFloor(paintedMesh(new Uint8Array(readFileSync("models/parker-solar-probe-craft.glb"))), PART_FLOOR);
  assert.equal(specks.pieces, 0, `${specks.pieces} pieces, ${specks.triangles} triangles, are under ${PART_FLOOR} m`);
});
