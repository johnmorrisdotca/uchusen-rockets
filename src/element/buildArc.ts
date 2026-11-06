// A ring under construction is an open arc, not a smaller copy of the finished ring. The hub and the six spokes stay whole. The tube, its glass and its frames are the rim: nothing of them is drawn past the last built segment, and the rim grows both ways until the last of it closes the circle.
import { BufferGeometry, Group, Matrix4, Mesh, Vector3 } from "three";

/** A piece this close to the axis is the collar and is not cut. Hanabusa's hub is 15.5 m. */
const HUB_M = 22;
/** Six spokes, the first toward +Z. A glazed lift is 3.6 m across, so a point within this of a spoke's centre line is the spoke. The spoke ends before the tube: the innermost ring (the garden) starts at 0.58 of its radius. */
const SPOKE_EVERY = Math.PI / 3;
const SPOKE_HALF_M = 2.4;
const SPOKE_END = 0.56;
/** The rim starts after the spokes, and it has closed by this fraction of the step. Fit-out (air, decks, furnishings, plants) comes after the shell has closed. */
const RIM_FROM = 0.2;
const RIM_DONE = 0.8;
const PLANTS = new Set(["plant", "leaf", "soil", "flower", "shrub", "lawn", "lawn-dark", "crop-green", "crop-gold", "water"]);
const FURNISH = new Set(["wood", "fabric"]);
const DECK = new Set(["concrete"]);

/** Plants and soil are last, furnishings before them, decks after the ring is pressurised. Everything else is structure and rises with the shell. */
function due(name: string, grown: number): boolean {
  if (PLANTS.has(name)) return grown >= 0.98;
  if (FURNISH.has(name)) return grown >= 0.96;
  if (DECK.has(name)) return grown >= 0.93;
  return true;
}

/** The build bar's state while a ring is past its shell and not yet furnished. */
export function fitoutOf(grown: number): "" | "sealed" | "air" | "pressure" {
  if (grown >= 0.9 && grown < 0.93) return "pressure";
  if (grown >= 0.84 && grown < 0.9) return "air";
  if (grown >= 0.8 && grown < 0.84) return "sealed";
  return "";
}

/** The spoke a point stands on, or null when it is out in the tube. The angle is the spoke's, so two ends of one lift match. */
function spokeOf(x: number, z: number): number | null {
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(x, z);
  const half = Math.atan2(SPOKE_HALF_M, Math.max(radius, 1));
  const nearest = Math.round(angle / SPOKE_EVERY) * SPOKE_EVERY;
  const delta = Math.abs(angle - nearest);
  return Math.min(delta, 2 * Math.PI - delta) <= half ? nearest : null;
}

/** A lift runs from the hub out to the tube, so its triangles reach inward. A slice of the hall on the same line does not, and is left for the arc. */
function spokeTriangle(corners: readonly [number, number][], major: number): boolean {
  const spoke = spokeOf(corners[0][0], corners[0][1]);
  if (spoke === null) return false;
  let reaches = false;
  for (const [x, z] of corners) {
    const one = spokeOf(x, z);
    if (one === null) return false;
    const delta = Math.abs(one - spoke);
    if (Math.min(delta, 2 * Math.PI - delta) > 1e-4) return false;
    if (Math.hypot(x, z) < major * SPOKE_END) reaches = true;
  }
  return reaches;
}

const sourceOf = new WeakMap<Mesh, BufferGeometry>();
const scratch = new Vector3();
const intoHolder = new Matrix4();
const meshToHolder = new Matrix4();

/** The two inward normals of a wedge of half-angle `half` radians about the forward axis. */
export function sectorNormals(half: number): [Vector3, Vector3] {
  return [new Vector3(Math.cos(half), 0, Math.sin(half)), new Vector3(-Math.cos(half), 0, Math.sin(half))];
}

/**
 * Whether a point in the ring's own space is drawn at `grown`. The hub is drawn from the start. The tube, its glass and its frames are an arc that opens both ways about the forward axis, so the unbuilt half is empty. A spoke is kept by the triangle cut, because one triangle of a lift runs from the hub to the tube.
 * @param x Metres to the side of the keel.
 * @param z Metres forward of the keel.
 * @param major The ring's outer radius, in metres.
 * @param grown How much of the ring stands, from 0 to 1.
 */
export function ringPiece(x: number, z: number, major: number, grown: number): boolean {
  if (grown <= 0.02) return false;
  const radius = Math.hypot(x, z);
  if (radius < HUB_M) return true;
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
  const at = (index: number): [number, number] => {
    scratch.fromBufferAttribute(position, index).applyMatrix4(toHolder);
    return [scratch.x, scratch.z];
  };
  for (let i = 0; i + 2 < count; i += 3) {
    const a = raw ? raw[i] ?? 0 : i;
    const b = raw ? raw[i + 1] ?? 0 : i + 1;
    const c = raw ? raw[i + 2] ?? 0 : i + 2;
    const corners: [number, number][] = [at(a), at(b), at(c)];
    const drawn = corners.every(([x, z]) => ringPiece(x, z, major, grown));
    // a triangle that reaches the unbuilt arc is left out; a lift that reaches the hub stays, and a hall slice on that line does not
    if (drawn || spokeTriangle(corners, major)) keep.push(a, b, c);
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
    if (!(child instanceof Mesh) || child.name === "fit-tank") return;
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
    if (ring) holder.traverse((child) => { if (child instanceof Mesh && child.name !== "outline") child.visible = true; });
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
    if (!(child instanceof Mesh) || child.name === "fit-tank") return;
    if (child.name !== "outline" && !due(child.name, grown)) {
      child.visible = false;
      return;
    }
    if (child.name !== "outline") child.visible = true;
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
