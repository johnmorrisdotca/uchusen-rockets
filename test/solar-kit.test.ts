import assert from "node:assert/strict";
import test from "node:test";
import { KAMINARI_VARIANTS } from "../src/data/kaminari-concepts.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { solarKit, type SolarKit } from "../src/model/fleet/solarKit.ts";
import { boundsOfPieces } from "../src/model/pieces.ts";
import type { Piece } from "../src/model/pieces.ts";

const span = (pieces: readonly Piece[], axis: 0 | 1): number => {
  const box = boundsOfPieces(pieces);
  return box.max[axis] - box.min[axis];
};

const goldSides = (pieces: readonly Piece[]): { plus: boolean; minus: boolean } => {
  let plus = false;
  let minus = false;
  for (const piece of pieces) {
    if (piece.kind !== "plate" || piece.material !== "gold") continue;
    const mid = piece.outline.reduce((sum, [, b]) => sum + b, 0) / piece.outline.length;
    const y = piece.frame.o[1] + piece.frame.v[1] * mid;
    if (y > 2) plus = true;
    if (y < -2) minus = true;
  }
  return { plus, minus };
};

test("the three kits are a blanket mast, a roll-out and a square sail, and each faces the sun", () => {
  const kinds = ["blanket", "rollout", "sail"] as const satisfies readonly SolarKit[];
  for (const kind of kinds) {
    const pieces = solarKit(kind, 60);
    const move = pieces.find((piece) => piece.move)?.move;
    assert.equal(move?.name, "kit-track", kind);
    assert.deepEqual(move?.face, [0, 0, 1], kind);
    assert.deepEqual(move?.axis, [0, 1, 0], kind);
  }
  const blanket = solarKit("blanket", 60);
  const sides = goldSides(blanket);
  assert.equal(sides.plus && sides.minus, true, "a blanket each side of the mast");
  assert.ok(span(blanket, 0) > span(blanket, 1) * 1.4, "the mast is longer than the blankets are wide");
  const rollout = solarKit("rollout", 60);
  assert.equal(goldSides(rollout).plus || goldSides(rollout).minus, false, "one blanket, not one each side");
  assert.ok(span(rollout, 0) > span(rollout, 1) * 2, "the blanket unrolls farther than it is wide");
  const sail = solarKit("sail", 60);
  const across = span(sail, 0);
  const along = span(sail, 1);
  assert.ok(Math.abs(across - along) < across * 0.2, `a square, ${across} by ${along}`);
});

test("both ships offer the three kits", () => {
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-blanket"].kit, "kit-blanket");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-rollout"].kit, "kit-rollout");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-sail"].kit, "kit-sail");
  const kaminari = KAMINARI_VARIANTS.a.map((variant) => variant.id);
  for (const id of ["fleet-kaminari-blanket", "fleet-kaminari-rollout", "fleet-kaminari-sail"]) {
    assert.ok(kaminari.includes(id), id);
    const variant = KAMINARI_VARIANTS.a.find((one) => one.id === id);
    assert.ok(variant?.slots.includes("kit"), id);
  }
});
