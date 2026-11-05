import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { FOV_DEG, scaleBarMetres, transitionReferenceDistance } from "../src/framing.ts";

test("objects in the same camera plane project at their real length ratio", () => {
  const camera = new PerspectiveCamera(FOV_DEG, 4 / 3, 0.1, 20000);
  const oldDistance = 300;
  const reference = transitionReferenceDistance(oldDistance, 5000);
  camera.position.set(0, 0, reference);
  camera.zoom = reference / oldDistance;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const pixels = (length: number) => {
    const start = new Vector3(0, 0, 0).project(camera);
    const end = new Vector3(0, length, 0).project(camera);
    return end.y - start.y;
  };
  assert.ok(Math.abs(pixels(1820) / pixels(110.6) - 1820 / 110.6) < 0.01);
});

test("a narrow picture still gets a scale bar long enough to read", () => {
  assert.equal(scaleBarMetres(0.229, 500), 10);
  assert.equal(scaleBarMetres(0.1, 800), 10);
  assert.equal(scaleBarMetres(4.5, 600), 1000);
});
