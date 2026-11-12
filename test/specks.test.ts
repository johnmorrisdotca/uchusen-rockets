// Parker's painted model has no loose specks, and the trimming that took them out finds the rest of the painted craft untouched.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { loosePiecesOf, SPECK_FLOOR, trimSpecks } from "../scripts/trim-specks.ts";

const read = (file: string) => new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(new Uint8Array(readFileSync(`models/${file}`)));
const metresPerUnit = (doc: Awaited<ReturnType<typeof read>>) => {
  const m = doc.getRoot().listNodes().find((node) => node.getMesh())?.getWorldMatrix() as number[];
  return Math.hypot(m[0], m[1], m[2]);
};

test("Parker's painted model has no connected piece under the speck floor", async () => {
  const doc = await read("parker-solar-probe-craft.glb");
  const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const pieces = loosePiecesOf(primitive, metresPerUnit(doc));
  assert.ok(pieces.length > 20, "the craft is still whole");
  const smallest = Math.min(...pieces.map((piece) => piece.size));
  assert.ok(smallest >= SPECK_FLOOR, `the smallest piece is ${(smallest * 100).toFixed(1)} cm, under the ${SPECK_FLOOR * 100} cm floor`);
});

test("trimming a model that has no specks changes nothing, and one with a speck loses only the speck", async () => {
  const doc = await read("parker-solar-probe-craft.glb");
  const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const before = (primitive.getIndices()?.getCount() ?? 0) / 3;
  assert.deepEqual(await trimSpecks(doc), { pieces: 0, triangles: 0 });
  assert.equal((primitive.getIndices()?.getCount() ?? 0) / 3, before);
  // a floor above the smallest pieces takes them out and leaves the larger ones
  const larger = await trimSpecks(doc, 0.2);
  assert.ok(larger.pieces > 0 && larger.triangles > 0);
  const after = (primitive.getIndices()?.getCount() ?? 0) / 3;
  assert.equal(after, before - larger.triangles);
  assert.ok(after > before / 3, "the body stays");
});
