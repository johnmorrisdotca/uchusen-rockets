// A ring under construction is an open arc, not a smaller copy of the finished ring. The triangles outside the wedge are left out of the draw. A piece around the hub, the collar, stays whole.
import { BufferGeometry, Group, Mesh, Vector3 } from "three";

/** A piece this close to the axis is the collar and is not cut. */
const HUB_M = 8;

const sourceOf = new WeakMap<Mesh, BufferGeometry>();

/** The two inward normals of a wedge of half-angle `half` radians about the forward axis. */
export function sectorNormals(half: number): [Vector3, Vector3] {
  return [new Vector3(Math.cos(half), 0, Math.sin(half)), new Vector3(-Math.cos(half), 0, Math.sin(half))];
}

function inside(x: number, z: number, left: Vector3, right: Vector3): boolean {
  if (Math.hypot(x, z) < HUB_M) return true;
  return left.x * x + left.z * z >= 0 && right.x * x + right.z * z >= 0;
}

function wedgeOf(source: BufferGeometry, half: number): BufferGeometry {
  const made = source.clone();
  const position = made.getAttribute("position");
  const index = made.getIndex();
  if (!position || !index) return made;
  const [left, right] = sectorNormals(half);
  const keep: number[] = [];
  const raw = index.array;
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const a = raw[i] ?? 0;
    const b = raw[i + 1] ?? 0;
    const c = raw[i + 2] ?? 0;
    const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
    const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
    if (inside(x, z, left, right)) keep.push(a, b, c);
  }
  made.setIndex(keep);
  return made;
}

/** Puts each mesh's own geometry back. */
export function clearArc(holder: Group): void {
  holder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = sourceOf.get(child);
    if (!source) return;
    if (child.geometry !== source) child.geometry.dispose();
    child.geometry = source;
    sourceOf.delete(child);
    delete child.userData.arcBucket;
  });
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
  const bucket = Math.round(grown * 24);
  holder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (child.userData.arcBucket === bucket) return;
    const source = sourceOf.get(child) ?? child.geometry;
    sourceOf.set(child, source);
    if (child.geometry !== source) child.geometry.dispose();
    child.geometry = wedgeOf(source, half);
    child.userData.arcBucket = bucket;
  });
}
