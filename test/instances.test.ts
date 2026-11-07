// Repeated detail is one template and a pose per copy: the mesh, the file and the box all keep every copy, and the file does not repeat the triangles.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { place, ringOf, stamp } from "../src/model/fleet/detail.ts";
import { expandInstances } from "../src/model/instances.ts";
import { boundsOf, meshOf, type Lathe } from "../src/model/pieces.ts";

const bolt: Lathe = { kind: "lathe", material: "hull-grey", segs: 8, only: "mesh", profile: [[0.001, 0], [0.05, 0], [0.05, 0.1], [0.001, 0.1]] };

test("a stamp of many copies is one piece, and expanding it gives every copy", () => {
  const poses = ringOf(8, 2, 1);
  const stamped = stamp([bolt], poses);
  assert.equal(stamped.length, 1);
  assert.equal(stamped[0].kind, "instances");
  assert.equal(expandInstances(stamped).length, 8);
  assert.equal(stamp([bolt], [poses[0]]).length, 1);
  assert.equal(stamp([bolt], [poses[0]])[0].kind, "lathe");
});

test("the mesh keeps the template once, the file instances it, and the box still reaches the copies", () => {
  const poses = ringOf(6, 3, 2, 15);
  const mesh = meshOf(stamp([bolt], poses));
  assert.equal(mesh.stamps.length, 1);
  assert.equal(mesh.stamps[0].poses.length, 6);
  assert.equal(mesh.faces.size, 0);
  const box = boundsOf(mesh);
  assert.ok(box.max[0] > 2.5 && box.min[0] < -2.5, `${box.min[0]}..${box.max[0]}`);
  assert.ok(box.max[1] > 2 && box.min[1] < 2.2);
  const glb = toGlb([{ name: "ring", mesh, at: [0, 0, 0] }]);
  const view = new DataView(glb.bytes.buffer, glb.bytes.byteOffset, glb.bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.bytes.slice(20, 20 + jsonLength)).trim()) as {
    extensionsUsed: string[];
    nodes: { extensions?: { EXT_mesh_gpu_instancing?: { attributes: { TRANSLATION: number } } }; scale?: number[] }[];
    accessors: { bufferView: number; count: number; componentType: number; type: string }[];
    bufferViews: { byteOffset: number; byteLength: number }[];
  };
  assert.ok(json.extensionsUsed.includes("EXT_mesh_gpu_instancing"));
  const node = json.nodes.find((one) => one.extensions?.EXT_mesh_gpu_instancing);
  assert.ok(node?.scale);
  const half = node.scale[0];
  const accessor = json.accessors[node.extensions!.EXT_mesh_gpu_instancing!.attributes.TRANSLATION];
  assert.equal(accessor.count, 6);
  assert.equal(accessor.type, "VEC3");
  const bufferView = json.bufferViews[accessor.bufferView];
  const bin = 20 + jsonLength + (4 - (jsonLength % 4)) % 4 + 8;
  const floats = new Float32Array(glb.bytes.buffer, glb.bytes.byteOffset + bin + bufferView.byteOffset, accessor.count * 3);
  assert.ok(poses.every((pose, i) => pose.at.every((value, c) => Math.abs(value - floats[i * 3 + c] * half) < 1e-3)), "instance translations are the poses");
  const moved = place(stamp([bolt], poses), { at: [10, 0, 0], yaw: 90 });
  assert.equal(moved.length, 1);
  assert.equal(moved[0].kind, "instances");
  if (moved[0].kind === "instances") assert.ok(moved[0].poses.every((pose) => Math.hypot(pose.at[0] - 10, pose.at[2]) > 2));
});
