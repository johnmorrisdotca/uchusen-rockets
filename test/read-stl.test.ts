// A binary STL is triangles in the file's own axes, and a move turns them before they are placed.
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, readBinaryStl } from "../scripts/read-stl.ts";

/** One triangle, (0,0,0) (1,0,0) (0,1,0), normal +Z. */
function oneTriangle(): Uint8Array {
  const bytes = new Uint8Array(84 + 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, 1, true);
  view.setFloat32(84 + 8, 1, true);
  view.setFloat32(84 + 12 + 12, 1, true);
  view.setFloat32(84 + 12 + 24 + 4, 1, true);
  return bytes;
}

test("a binary STL is its triangles, and a turn about Z then a shift lands a corner where it was asked", () => {
  const read = readBinaryStl(oneTriangle());
  assert.equal(read.positions.length / 9, 1);
  assert.deepEqual([...read.positions], [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual([...read.normals], [0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const p = [1, 0, 0];
  const n = [0, 0, 1];
  applyMove(p, n, [0, 0, 90], [5, 0, 0]);
  assert.ok(Math.abs(p[0] - 5) < 1e-6 && Math.abs(p[1] - 1) < 1e-6 && p[2] === 0, p.join(","));
  assert.ok(Math.abs(n[2] - 1) < 1e-6, n.join(","));
});

test("a file that is not a binary STL is refused", () => {
  assert.throws(() => readBinaryStl(new Uint8Array(100)), /not a binary STL/);
});
