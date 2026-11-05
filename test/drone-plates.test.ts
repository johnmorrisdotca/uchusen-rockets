// A chamfered plate is a real outline, and it becomes a mesh.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chamfer, polygon, wedge } from "../src/model/fleet/drone/plates.ts";
import { meshOf } from "../src/model/pieces.ts";

test("a chamfer cuts the corners and still meshes", () => {
  const outline = chamfer(0.4, 0.2, 0.06);
  assert.equal(outline.length, 8);
  assert.ok(outline.every(([u, v]) => Math.abs(u) < 0.4 || Math.abs(v) < 0.2), "no square corner survives");
  const mesh = meshOf([polygon("hull-white", [0, 0, 0], [0, 0, 1], [0, 1, 0], outline, 0.05)]);
  let count = 0;
  for (const buffers of mesh.faces.values()) count += buffers.indices.length / 3;
  assert.ok(count >= 8, `${count}`);
});

test("a wedge is narrow at the nose", () => {
  const outline = wedge(0.3, 0.2, 0.04);
  const nose = outline.filter(([u]) => u > 0).map(([, v]) => Math.abs(v));
  const tail = outline.filter(([u]) => u < 0).map(([, v]) => Math.abs(v));
  assert.ok(Math.max(...nose) < Math.max(...tail));
});
