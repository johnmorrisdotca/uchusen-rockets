import assert from "node:assert/strict";
import { test } from "node:test";
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
});
