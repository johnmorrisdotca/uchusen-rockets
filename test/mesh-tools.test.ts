// The model-reduction script's own helpers: finding a vertex within a tolerance, the connected pieces of an instanced mesh, and the stop for a recipe part nothing falls in.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Document } from "@gltf-transform/core";
import { piecesOf } from "../scripts/pieces.ts";
import { skipsEmptyPart } from "../scripts/recipe-parts.ts";
import { PointIndex } from "../scripts/point-index.ts";
import { weld } from "../scripts/weld.ts";

test("two points a hair apart are one, wherever the grid's edge falls between them", () => {
  const tolerance = 0.1;
  // 0.0999999 and 0.1000001 round to different cells of a grid 0.1 wide, and are 2e-7 apart
  for (const at of [0.1, 0.2, 0.3, 1.0, 12.3]) {
    const index = new PointIndex(tolerance, [0, 0, 0]);
    const first = index.add(at - 1e-7, 0.5, 0.5);
    assert.equal(index.find(at + 1e-7, 0.5, 0.5), first, `either side of ${at}`);
  }
  const index = new PointIndex(tolerance, [0, 0, 0]);
  index.add(0, 0, 0);
  assert.equal(index.find(0.11, 0, 0), undefined, "further than the tolerance on one axis");
  assert.equal(index.find(0.1, 0.1, 0.1), 0, "at the tolerance on every axis");
  assert.equal(index.find(0, 0, 0, () => false), undefined, "a candidate the caller turns down");
  assert.equal(index.size, 1);
  assert.throws(() => new PointIndex(0, [0, 0, 0]));
});

/** A one-triangle mesh. */
function triangle(doc: Document) {
  const buffer = doc.getRoot().listBuffers()[0] ?? doc.createBuffer();
  const position = doc.createAccessor().setType("VEC3").setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])).setBuffer(buffer);
  return doc.createMesh("tri").addPrimitive(doc.createPrimitive().setAttribute("POSITION", position));
}

test("a mesh drawn by two nodes has its own pieces for each, not the last one's", () => {
  const doc = new Document();
  const mesh = triangle(doc);
  const near = doc.createNode("near").setMesh(mesh);
  const far = doc.createNode("far").setMesh(mesh).setTranslation([10, 0, 0]);
  const scene = doc.createScene();
  scene.addChild(near);
  scene.addChild(far);
  const prim = mesh.listPrimitives()[0]!;
  const pieces = piecesOf([near, far]);
  const a = pieces.pieceOf(near, prim);
  const b = pieces.pieceOf(far, prim);
  assert.ok(a && b);
  assert.equal(pieces.boxes.length, 2, "two separate triangles are two pieces");
  assert.notEqual(a[0], b[0]);
  assert.deepEqual(pieces.boxes[a[0] as number]?.min, [0, 0, 0]);
  assert.deepEqual(pieces.boxes[b[0] as number]?.min, [10, 0, 0]);
  assert.equal(pieces.pieceOf(near, doc.createPrimitive()), undefined);
});

test("triangles that meet within the tolerance are one piece, on either side of a rounding edge", () => {
  const doc = new Document();
  const buffer = doc.createBuffer();
  // the second triangle's corner is 0.2 from the first's, either side of the rounding edge at 4999.5 (which rounds them to 4999 and 5000); the file is 10000 wide, so the tolerance is 1
  const positions = new Float32Array([0, 0, 0, 4999.4, 0, 0, 0, 5000, 0, 4999.6, 0, 0, 10000, 0, 0, 4999.6, 5000, 0]);
  const prim = doc.createPrimitive().setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buffer));
  const mesh = doc.createMesh("two").addPrimitive(prim);
  const node = doc.createNode("n").setMesh(mesh);
  doc.createScene().addChild(node);
  const pieces = piecesOf([node]);
  assert.equal(pieces.boxes.length, 1);
  assert.deepEqual([...(pieces.pieceOf(node, prim) as Int32Array)], [0, 0]);
});

test("a recipe part nothing falls in stops the run unless it is marked optional", () => {
  assert.throws(() => skipsEmptyPart("iss", { id: "truss" }, false), /nothing fell in the part "truss"/);
  assert.throws(() => skipsEmptyPart("iss", { id: "truss", optional: false }, false), /optional: true/);
  assert.equal(skipsEmptyPart("iss", { id: "truss", optional: true }, false), true);
  assert.equal(skipsEmptyPart("iss", { id: "truss" }, true), false);
  // the run asks it for every part that has no triangles, and every part has a committed file today, so none is marked
  assert.match(readFileSync("scripts/reduce-nasa.ts", "utf8"), /skipsEmptyPart\(recipe\.id, part, false\)/);
});

test("a faceted pair of triangles welds to four vertices when normals may differ, and a different picture stays split", () => {
  // two triangles of a quad, each face its own normal, the same picture coordinate
  const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
  const uvs = [0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1];
  assert.equal(weld(positions, normals, uvs, 1, [0, 0, 0]).positions.length / 3, 6);
  assert.equal(weld(positions, normals, uvs, 1, [0, 0, 0], true).positions.length / 3, 4);
  const other = [0, 0, 1, 0, 0, 1, 0.4, 0.4, 0.8, 0.8, 0.2, 0.6];
  assert.equal(weld(positions, normals, other, 1, [0, 0, 0], true).positions.length / 3, 6);
});
