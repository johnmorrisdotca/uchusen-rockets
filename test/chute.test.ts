// Chute arrays (MODULES-491): one part, three forms, shared by Miyamoto and Kaminari. A ring is an annulus on spokes, an umbrella is petals to the hub, a fan is pleated fins in one plane. Each opens from a slim bundle.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chute, CHUTE_FORMS, type ChuteForm } from "../src/model/fleet/chute.ts";
import { motionsOf } from "../src/model/fleet/motion.ts";
import { KAMINARI_VARIANTS } from "../src/data/kaminari-concepts.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { movingGroupsOf } from "../src/model/moves.ts";
import { boundsOfPieces, type Piece } from "../src/model/pieces.ts";

const gold = (pieces: readonly Piece[]) => pieces.filter((piece) => piece.kind === "plate" && piece.material === "gold");

/** How far the pieces stand from the mast, in the plane of the disc. */
const reach = (pieces: readonly Piece[]): number => {
  const box = boundsOfPieces(pieces);
  return Math.max(Math.abs(box.min[0]), box.max[0], Math.abs(box.min[1]), box.max[1]);
};

test("each form opens from a slim bundle to its radius, and half sits between", () => {
  for (const form of CHUTE_FORMS) {
    for (const radius of [60, 200]) {
      const stowed = reach(chute(form, "stowed", radius));
      const half = reach(chute(form, "half", radius));
      const open = reach(chute(form, "open", radius));
      assert.ok(stowed < radius * 0.3, `${form} ${radius} stowed ${stowed}`);
      assert.ok(open > radius * 0.75, `${form} ${radius} open ${open}`);
      assert.ok(half > stowed + radius * 0.15 && half < open - radius * 0.1, `${form} ${radius} half ${half}`);
    }
  }
});

test("the ring leaves a hole, the umbrella reaches the hub, and the fan stays in one plane", () => {
  const ring = gold(chute("ring", "open", 200));
  assert.ok(ring.length >= 12);
  for (const piece of ring) {
    if (piece.kind !== "plate") continue;
    assert.ok(Math.hypot(piece.frame.o[0], piece.frame.o[1]) > 70, `a ring cell at ${piece.frame.o[0]}`);
  }
  const umbrella = gold(chute("umbrella", "open", 60));
  assert.ok(umbrella.some((piece) => piece.kind === "plate" && Math.hypot(piece.frame.o[0], piece.frame.o[1]) < 20));
  const fan = chute("fan", "open", 200);
  let x = 0;
  let y = 0;
  for (const piece of fan) {
    if (piece.kind !== "plate") continue;
    x = Math.max(x, Math.abs(piece.frame.o[0]));
    y = Math.max(y, Math.abs(piece.frame.o[1]));
  }
  assert.ok(x < 8, `fan leaves the plane at x ${x}`);
  assert.ok(y > 140, `fan span ${y}`);
});

test("cells shine and the hub and the rib tips carry lamps", () => {
  for (const form of CHUTE_FORMS) {
    const pieces = chute(form, "open", 60);
    const names = new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));
    assert.ok(names.has("gold"), form);
    assert.ok(names.has("kapton"), form);
    assert.ok(names.has("lamp-amber"), form);
    assert.ok(names.has("lamp-red"), form);
    assert.ok(gold(pieces).length >= 24, form);
  }
});

test("the stowed chute is what motion deploys, and the open chute is already there", () => {
  for (const form of ["umbrella", "ring", "fan"] as const satisfies readonly ChuteForm[]) {
    assert.ok(movingGroupsOf(chute(form, "stowed", 60)).includes("chute-deploy"), form);
    assert.deepEqual(movingGroupsOf(chute(form, "open", 60)), []);
  }
  for (const ship of ["fleet-ship-03", "fleet-kaminari"]) {
    const motions = motionsOf(ship).filter((motion) => motion.group === "chute-deploy");
    assert.equal(motions.length, 1, ship);
    assert.equal(motions[0]?.kind, "swing");
  }
  const box = boundsOfPieces(chute("umbrella", "stowed", 60));
  assert.ok(box.max[2] > box.min[2]);
});

test("both ships offer the three forms", () => {
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-umbrella"].chute, "chute-umbrella-stowed");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-umbrella-open"].chute, "chute-umbrella-open");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-ring"].chute, "chute-ring-open");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-fan"].chute, "chute-fan-open");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-wing"].chute, "chute-umbrella-stowed");
  assert.equal("chute" in MIYAMOTO_VARIANT_SLOTS.miyamoto, false);
  const kaminari = KAMINARI_VARIANTS.a.map((variant) => variant.id);
  for (const id of ["fleet-kaminari-ring", "fleet-kaminari-ring-open", "fleet-kaminari-umbrella", "fleet-kaminari-fan"]) assert.ok(kaminari.includes(id), id);
  for (const variant of KAMINARI_VARIANTS.a) if (variant.id !== "fleet-kaminari") assert.ok(variant.slots.includes("chute"), variant.id);
});
