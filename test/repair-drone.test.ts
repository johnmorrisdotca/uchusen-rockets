import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DRONE_EMITTER, DRONE_TOOL_POINT } from "../src/element/repair-drone.ts";

test("the repair drone levels are single-draw models with a smaller far view", () => {
  const triangles = (file: string) => {
    const bytes = readFileSync(file);
    const length = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString()) as {
      meshes: { primitives: { indices: number }[] }[];
      materials: unknown[];
      accessors: { count: number }[];
    };
    assert.equal(gltf.meshes.length, 1);
    assert.equal(gltf.meshes[0].primitives.length, 1);
    assert.equal(gltf.materials.length, 1);
    return gltf.accessors[gltf.meshes[0].primitives[0].indices].count / 3;
  };
  const full = triangles("models/spx-repair-drone.glb");
  const coarse = triangles("models/spx-repair-drone-coarse.glb");
  assert.equal(full, 83494);
  assert.equal(coarse, 4488);
  assert.ok(coarse < full / 10);
  assert.ok(DRONE_EMITTER[2] > 0);
  assert.ok(DRONE_TOOL_POINT[1] < 0);
});
