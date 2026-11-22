// A flat panel drawn as cells is drawn into a picture: a rectangle of cells is one sheet, a gap between rectangles is a gap, and the front and the back of a cell are two pictures.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bakeSheets, pngOf } from "../scripts/sheets.ts";

/** A flat square cell in the x-z plane at height y, two triangles facing up, from (x, z) to (x + 1, z + 1). */
const cell = (x: number, z: number, y: number, up: boolean) => {
  const [a, b, c, d] = [[x, y, z], [x + 1, y, z], [x, y, z + 1], [x + 1, y, z + 1]];
  return { positions: [...a, ...c, ...b, ...b, ...c, ...d], normals: Array.from({ length: 6 }, () => [0, up ? 1 : -1, 0]).flat() };
};
const options = { blanket: /^cell/, perUnit: 4, across: 1, reach: 0.1 };

test("two blankets apart are two sheets, and the cells of one blanket are one", () => {
  const flats = [cell(0, 0, 0, true), cell(1, 0, 0, true), cell(10, 0, 0, true)];
  const positions = flats.flatMap((flat) => flat.positions);
  const normals = flats.flatMap((flat) => flat.normals);
  const { sheets, sheetOf } = bakeSheets(positions, normals, [0, 0, 0, 0, 0, 0], ["cell"], [[10, 20, 200]], options);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0]?.width, 8);
  assert.equal(sheets[1]?.width, 4);
  assert.deepEqual([...sheetOf], [0, 0, 0, 0, 1, 1]);
});

test("a triangle standing well off the cells is left to the mesh", () => {
  const flat = cell(0, 0, 0, true);
  const tall = cell(0, 0, 5, true);
  const { sheetOf } = bakeSheets([...flat.positions, ...tall.positions], [...flat.normals, ...tall.normals], [0, 0, 1, 1], ["cell", "other"], [[10, 20, 200], [0, 0, 0]], options);
  assert.deepEqual([...sheetOf], [0, 0, -1, -1]);
});

test("a cell's front and back are drawn in their own colours", () => {
  const front = cell(0, 0, 0.5, true);
  const back = cell(0, 0, 0, false);
  const { sheets } = bakeSheets([...front.positions, ...back.positions], [...front.normals, ...back.normals], [0, 0, 1, 1], ["cell blue", "cell gold"], [[0, 0, 200], [200, 150, 20]], { ...options, reach: 0.6 });
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0]?.front.height, 0.5);
  assert.equal(sheets[0]?.back.height, 0);
  assert.notDeepEqual(sheets[0]?.front.png, sheets[0]?.back.png);
});

test("the same cells make the same picture", () => {
  const flat = cell(0, 0, 0, true);
  const run = () => bakeSheets(flat.positions, flat.normals, [0, 0], ["cell"], [[10, 20, 200]], options).sheets[0]?.front.png;
  assert.deepEqual(run(), run());
  assert.equal(Buffer.from(pngOf(1, 1, new Uint8Array([1, 2, 3])).subarray(1, 4)).toString("latin1"), "PNG");
});
