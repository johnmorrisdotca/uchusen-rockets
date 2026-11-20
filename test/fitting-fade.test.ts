import assert from "node:assert/strict";
import test from "node:test";
import { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { fadeFitting, fittingFadeMaterial } from "../src/element/fittingFade.ts";

test("a fitting fade uses its own material and lets that copy go when the fade ends", () => {
  const own = new MeshStandardMaterial({ opacity: 1, transparent: true, depthWrite: false });
  const mesh = new Mesh(new BufferGeometry(), own);
  fadeFitting(mesh, 1);
  assert.equal(mesh.material, own);
  assert.equal(mesh.visible, true);
  assert.equal(fittingFadeMaterial(mesh), null);

  fadeFitting(mesh, 0.5);
  const copy = mesh.material as MeshStandardMaterial;
  assert.notEqual(copy, own);
  assert.equal(copy.transparent, true);
  assert.equal(copy.depthWrite, false);
  assert.equal(copy.opacity, 0.5);
  assert.equal(own.transparent, true);
  assert.equal(own.opacity, 1, "the shared material is not the one that fades");
  let disposed = false;
  copy.addEventListener("dispose", () => {
    disposed = true;
  });

  fadeFitting(mesh, 0);
  assert.equal(mesh.material, own);
  assert.equal(mesh.visible, false);
  assert.equal(disposed, true);
  assert.equal(fittingFadeMaterial(mesh), null);
  assert.equal(own.opacity, 1);
});

test("two fittings that share a material each get their own fade, and the shared one stays opaque", () => {
  const own = new MeshStandardMaterial({ opacity: 1, transparent: false, depthWrite: true });
  const a = new Mesh(new BufferGeometry(), own);
  const b = new Mesh(new BufferGeometry(), own);
  fadeFitting(a, 0.5);
  fadeFitting(b, 0.25);
  assert.notEqual(a.material, b.material);
  assert.equal(own.transparent, false);
  assert.equal(own.depthWrite, true);
  fadeFitting(a, 1);
  fadeFitting(b, 1);
  assert.equal(a.material, own);
  assert.equal(b.material, own);
  assert.equal(a.visible && b.visible, true);
});
