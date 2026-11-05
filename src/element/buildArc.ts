// A ring under construction is an open arc, not a smaller copy of the finished ring. The hub and the spokes stay whole. The rim is left out until the spokes are there, and then it grows both ways until the last of it closes the circle.
import { BufferGeometry, Group, Matrix4, Mesh, Vector3 } from "three";

/** A piece this close to the axis is the collar and is not cut. Hanabusa's hub is 15.5 m. */
const HUB_M = 22;
/** Inside this fraction of the ring's radius the piece is a spoke, and it stays once the collar is in. */
const SPOKE_END = 0.72;
/** The rim starts after the spokes, and it has closed by this fraction of the step. */
const RIM_FROM = 0.2;
const RIM_DONE = 0.8;

const sourceOf = new WeakMap<Mesh, BufferGeometry>();
const scratch = new Vector3();
const intoHolder = new Matrix4();
const meshToHolder = new Matrix4();

/** The two inward normals of a wedge of half-angle `half` radians about the forward axis. */
export function sectorNormals(half: number): [Vector3, Vector3] {
  return [new Vector3(Math.cos(half), 0, Math.sin(half)), new Vector3(-Math.cos(half), 0, Math.sin(half))];
}

/**
 * Whether a point in the ring's own space is drawn at `grown`. The hub and the spokes are drawn from the start. The rim is an arc that opens both ways about the forward axis.
 * @param x Metres to the side of the keel.
 * @param z Metres forward of the keel.
 * @param major The ring's outer radius, in metres.
 * @param grown How much of the ring stands, from 0 to 1.
 */
export function ringPiece(x: number, z: number, major: number, grown: number): boolean {
  const radius = Math.hypot(x, z);
  if (radius < HUB_M || radius < major * SPOKE_END) return grown > 0.02;
  if (grown < RIM_FROM) return false;
  const half = Math.PI * Math.min(1, (grown - RIM_FROM) / (RIM_DONE - RIM_FROM));
  return Math.abs(Math.atan2(x, z)) <= half + 1e-6;
}

function wedgeOf(source: BufferGeometry, toHolder: Matrix4, major: number, grown: number): BufferGeometry {
  const made = source.clone();
  const position = made.getAttribute("position");
  if (!position) return made;
  const index = made.getIndex();
  const raw = index?.array;
  const count = raw ? raw.length : position.count;
  const keep: number[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const a = raw ? raw[i] ?? 0 : i;
    const b = raw ? raw[i + 1] ?? 0 : i + 1;
    const c = raw ? raw[i + 2] ?? 0 : i + 2;
    scratch.set((position.getX(a) + position.getX(b) + position.getX(c)) / 3, (position.getY(a) + position.getY(b) + position.getY(c)) / 3, (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3);
    scratch.applyMatrix4(toHolder);
    if (ringPiece(scratch.x, scratch.z, major, grown)) keep.push(a, b, c);
  }
  made.setIndex(keep);
  return made;
}

function majorOf(holder: Group): number {
  const known = holder.userData.arcMajor as number | undefined;
  if (known) return known;
  holder.updateWorldMatrix(true, true);
  intoHolder.copy(holder.matrixWorld).invert();
  let major = 1;
  holder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const position = (sourceOf.get(child) ?? child.geometry).getAttribute("position");
    if (!position) return;
    meshToHolder.copy(intoHolder).multiply(child.matrixWorld);
    const step = Math.max(1, Math.floor(position.count / 48));
    for (let i = 0; i < position.count; i += step) {
      scratch.fromBufferAttribute(position, i).applyMatrix4(meshToHolder);
      major = Math.max(major, Math.hypot(scratch.x, scratch.z));
    }
  });
  holder.userData.arcMajor = major;
  return major;
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
  delete holder.userData.arcMajor;
}

/**
 * Grows a section in place. A ring keeps its hub and its spokes, and its rim opens as an arc of `grown`. Anything else scales up from its own middle.
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
  const major = majorOf(holder);
  const bucket = Math.round(grown * 32);
  holder.updateWorldMatrix(true, true);
  intoHolder.copy(holder.matrixWorld).invert();
  let kept = 0;
  let full = 0;
  holder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = sourceOf.get(child) ?? child.geometry;
    full += source.getIndex()?.count ?? source.getAttribute("position")?.count ?? 0;
    if (child.userData.arcBucket !== bucket) {
      sourceOf.set(child, source);
      if (child.geometry !== source) child.geometry.dispose();
      meshToHolder.copy(intoHolder).multiply(child.matrixWorld);
      child.geometry = wedgeOf(source, meshToHolder, major, grown);
      child.userData.arcBucket = bucket;
    }
    kept += child.geometry.getIndex()?.count ?? 0;
  });
  holder.userData.arcStat = `${kept}/${full}`;
}
