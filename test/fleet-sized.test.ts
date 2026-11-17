// The resizable kit parts: the size in metres is the input, the limits are named, a part is the size it says, and its detail scales with it.
import assert from "node:assert/strict";
import test from "node:test";
import { SIZED, SIZED_LIMITS } from "../src/index.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const size = (pieces: Piece[]) => {
  const b = boundsOf(meshOf(pieces));
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
};
const json = (pieces: Piece[]) => JSON.stringify(pieces);

test("container: a size outside 15 to 60 m across or 15 to 200 m long throws and says which limit", () => {
  assert.equal(SIZED_LIMITS.container.across[1], 60);
  for (const across of [6, 14.9, 60.1, Number.NaN]) assert.throws(() => SIZED.container({ across, long: 40, mass: 1 }), /m across/, String(across));
  for (const long of [10, 200.1]) assert.throws(() => SIZED.container({ across: 22, long, mass: 1 }), /m long/, String(long));
  assert.doesNotThrow(() => SIZED.container({ across: 15, long: 15, mass: 1 }));
  assert.doesNotThrow(() => SIZED.container({ across: 60, long: 200, mass: 1 }));
});

test("container: it is the size it says (its length to a metre, its width to the fittings that stand out), the base on y = 0", () => {
  for (const [across, long] of [[22, 40], [30, 60], [16, 24]] as const) {
    const box = SIZED.container({ across, long, mass: 900 });
    assert.equal(box.length, long);
    const b = boundsOf(meshOf(box.pieces()));
    const s = across / 22;
    assert.ok(Math.abs(b.min[1]) < 1.5 * s && Math.abs(b.max[1] - long) < 1.5 * s, `${across}x${long} spans y ${b.min[1]} to ${b.max[1]}`);
    const [x, , z] = size(box.pieces());
    assert.ok(x >= across - 0.5 && x <= across * 1.2 && z >= across - 0.5 && z <= across * 1.2, `${across}: ${x} by ${z}`);
  }
});

test("container: detail scales with size, so a box twice as wide is twice the size with more fittings and not a stretched mesh", () => {
  const small = SIZED.container({ across: 22, long: 40, mass: 900 }).pieces();
  const big = SIZED.container({ across: 44, long: 80, mass: 7200 }).pieces();
  assert.ok(big.length >= small.length + 16, `${big.length} pieces against ${small.length}: nine ribs a face become eighteen`);
  const [sx, sy] = size(small);
  const [bx, by] = size(big);
  assert.ok(Math.abs(bx / sx - 2) < 0.1 && Math.abs(by / sy - 2) < 0.1, "twice the size");
  // the fittings are the same share of the box: the middle piece is about twice as thick
  const middle = (pieces: Piece[]) => {
    const t = pieces.flatMap((p) => (p.kind === "plate" ? [p.thickness] : [])).sort((x, y) => x - y);
    return t[Math.floor(t.length / 2)];
  };
  assert.ok(middle(big) > middle(small) * 1.6, `${middle(big)} against ${middle(small)}: the fittings grow with the box`);
});

test("container: the same input is the same bytes, another seed is not, and coarse is the box and its castings only", () => {
  const box = SIZED.container({ across: 22, long: 40, mass: 900 });
  assert.equal(json(box.pieces({ seed: "a" })), json(box.pieces({ seed: "a" })));
  assert.notEqual(json(box.pieces({ seed: "a" })), json(box.pieces({ seed: "b" })));
  const coarse = box.pieces({ level: "coarse" });
  assert.ok(coarse.length > 8 && coarse.length < box.pieces().length / 10, `${coarse.length} coarse pieces`);
});
