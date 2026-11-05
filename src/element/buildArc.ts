// A ring under construction is an open arc, not a smaller copy of the finished ring. Two clipping planes through the hub keep the wedge that has been built. The hub itself, a small piece around the axis, stays whole.
import { Group, Material, Mesh, Plane, Vector3 } from "three";

/** A piece this small, centred on the hub, is the collar and is not cut. */
const HUB_M = 8;

const sourceOf = new WeakMap<Mesh, Material | Material[]>();
const cloneOf = new WeakMap<Mesh, Material[]>();

/** The two inward normals of a wedge of half-angle `half` radians about the forward axis. */
export function sectorNormals(half: number): [Vector3, Vector3] {
  return [new Vector3(Math.cos(half), 0, Math.sin(half)), new Vector3(-Math.cos(half), 0, Math.sin(half))];
}

function listOf(material: Material | Material[]): Material[] {
  return Array.isArray(material) ? material : [material];
}

/** Puts a mesh's own materials back and drops the clipped copies. */
export function clearArc(holder: Group): void {
  holder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = sourceOf.get(child);
    if (!source) return;
    for (const material of cloneOf.get(child) ?? []) material.dispose();
    child.material = source;
    sourceOf.delete(child);
    cloneOf.delete(child);
  });
}

function planesThrough(mesh: Mesh, holder: Group, half: number): Plane[] {
  holder.updateWorldMatrix(true, false);
  mesh.updateWorldMatrix(true, false);
  const hub = mesh.worldToLocal(holder.localToWorld(new Vector3()));
  const inv = mesh.matrixWorld.clone().invert();
  return sectorNormals(half).map((normal) => {
    normal.transformDirection(holder.matrixWorld).transformDirection(inv);
    return new Plane().setFromNormalAndCoplanarPoint(normal, hub);
  });
}

function aroundHub(mesh: Mesh, holder: Group): boolean {
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const sphere = geometry.boundingSphere;
  if (!sphere || sphere.radius >= HUB_M) return false;
  holder.updateWorldMatrix(true, false);
  mesh.updateWorldMatrix(true, false);
  const hub = mesh.worldToLocal(holder.localToWorld(new Vector3()));
  return sphere.center.distanceTo(hub) < sphere.radius + 1;
}

/**
 * Grows a section in place. A ring opens as an arc of `grown` of the circle. Anything else scales up from its own middle.
 * @param holder The section.
 * @param grown How much of it stands, from 0 to 1.
 * @param ring A wheel or a habitat ring, built as an arc rather than scaled.
 */
export function growPart(holder: Group, grown: number, ring: boolean): void {
  if (!ring || grown >= 0.995) {
    holder.scale.setScalar(ring ? 1 : Math.max(0.05, grown));
    clearArc(holder);
    return;
  }
  holder.scale.setScalar(1);
  const half = Math.PI * Math.min(1, Math.max(0.02, grown));
  holder.traverse((child) => {
    if (!(child instanceof Mesh) || aroundHub(child, holder)) return;
    const planes = planesThrough(child, holder, half);
    let clones = cloneOf.get(child);
    if (!clones) {
      const source = child.material;
      sourceOf.set(child, source);
      clones = listOf(source).map((material) => material.clone());
      cloneOf.set(child, clones);
      child.material = Array.isArray(source) ? clones : (clones[0] ?? source);
    }
    for (const material of clones) material.clippingPlanes = planes;
  });
}
