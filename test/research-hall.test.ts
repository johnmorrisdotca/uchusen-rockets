import assert from "node:assert/strict";
import { test } from "node:test";
import { livingInterior } from "../src/model/fleet/ship-01/interiors.ts";
import { researchInterior } from "../src/model/fleet/ship-01/researchPaint.ts";
import type { Piece } from "../src/model/pieces.ts";
import { ringPieces, rings } from "../src/model/fleet/ship-01/rings.ts";

const materials = (pieces: readonly Piece[]): Set<string> => new Set(pieces.flatMap((piece) => ("material" in piece && piece.material ? [String(piece.material)] : [])));

test("the research ring is laboratories round an atrium, and the living ring keeps its canal", () => {
  const research = rings().find((ring) => ring.use === "research");
  const living = rings().find((ring) => ring.use === "living");
  assert.ok(research && living);
  const labs = materials(ringPieces(research));
  const town = materials(ringPieces(living));
  assert.equal(labs.has("water"), false);
  assert.equal(labs.has("lamp-blue"), true);
  assert.equal(labs.has("window"), true);
  assert.equal(town.has("water"), true);
  const painted = materials(researchInterior(58, "coarse"));
  const street = materials(livingInterior(58, "coarse"));
  assert.equal(painted.has("water"), false);
  assert.equal(painted.has("lawn"), false);
  assert.equal(painted.has("soil"), false);
  assert.equal(painted.has("leaf"), false);
  assert.equal(painted.has("lamp-blue"), true);
  assert.equal(painted.has("wood"), true);
  assert.equal(painted.has("window"), true);
  assert.equal(painted.has("sky-wash"), true);
  assert.equal(street.has("water"), true);
  assert.equal(street.has("leaf"), true);
});
