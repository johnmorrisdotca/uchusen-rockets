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
/** The shell: frames, skin, glass and the solar skirt. Everything else waits. */
const SHELL = new Set(["hull-white", "hull-grey", "hull-grey-dark", "glass-clear", "glass", "solar", "steel", "window"]);
const DECK = new Set(["concrete", "deck"]);
const PLANTS = new Set(["plant", "leaf", "soil", "flower", "shrub", "lawn", "lawn-dark", "meadow", "bark", "ground", "crop-green", "crop-gold", "water", "water-clear"]);
const FURNISH = 0.928;

/** How far a late layer has opened, as the same 0.2-to-0.8 arc the shell uses, or null while it is still waiting. Each layer opens around the ring instead of appearing everywhere at once. */
function sweep(grown: number, from: number, to: number): number | null {
  if (grown < from) return null;
  const t = Math.min(1, (grown - from) / (to - from));
  return RIM_FROM + t * (RIM_DONE - RIM_FROM);
}

/** The shell follows `grown`. Decks, furnishings and plants each open as their own arc once the shell has closed. */
function layerGrown(name: string, grown: number, room: boolean): number | null {
  if (room) return sweep(grown, FURNISH, 0.955);
  if (SHELL.has(name)) return grown;
  if (PLANTS.has(name)) return sweep(grown, 0.942, 0.985);
  if (DECK.has(name)) return sweep(grown, 0.915, 0.94);
  return sweep(grown, FURNISH, 0.955);
}

/** The build bar's state while a ring is past its shell and the plants are not yet in. */
export function fitoutOf(grown: number): "" | "sealed" | "air" | "pressure" {
  if (grown >= 0.9 && grown < 0.915) return "pressure";
  if (grown >= 0.84 && grown < 0.9) return "air";
  if (grown >= 0.8 && grown < 0.84) return "sealed";
  return "";
}

/**
 * The angle one ring is held at while a build is on. Null when this ring is not being held, and the ship's own spin may take over. 0 while its arc is still being built. The number after that is its own spin-up, once the plants are in, and a sibling still at 0 does not pull it back.
 * @param held This ring's angle, or null when the build is not holding it.
 */
export function spinUp(held: number | null): number | null {
  return held;
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

/** A compact white mesh in the tube is a room. The hub, a lift and the outer skin are the shell, and they rise with the arc. */
function roomOf(mesh: Mesh, toHolder: Matrix4, major: number): boolean {
  if (mesh.name !== "hull-white" && mesh.name !== "window") return false;
  const position = mesh.geometry.getAttribute("position");
  if (!position) return false;
  const step = Math.max(1, Math.floor(position.count / 24));
  let minR = Infinity;
  let maxR = 0;
  let near = 0;
  let n = 0;
  let minA = Infinity;
  let maxA = -Infinity;
  for (let i = 0; i < position.count; i += step) {
    scratch.fromBufferAttribute(position, i).applyMatrix4(toHolder);
    const radius = Math.hypot(scratch.x, scratch.z);
    minR = Math.min(minR, radius);
    maxR = Math.max(maxR, radius);
    if (radius > major * 0.9) near += 1;
    const angle = Math.atan2(scratch.x, scratch.z);
    minA = Math.min(minA, angle);
    maxA = Math.max(maxA, angle);
    n += 1;
  }
  if (n === 0 || maxR < HUB_M) return false;
  if (minR < major * 0.5 && maxR > major * 0.58 && maxA - minA < 0.8) return false;
  if (maxA - minA > 1.2) return false;
  if (near / n > 0.45) return false;
  return true;
}

function wedgeOf(source: BufferGeometry, toHolder: Matrix4, major: number, grown: number, spoke: boolean): BufferGeometry {
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
    if (drawn || (spoke && spokeTriangle(corners, major))) keep.push(a, b, c);
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
  holder.updateWorldMatrix(true, true);
  intoHolder.copy(holder.matrixWorld).invert();
  let kept = 0;
  let full = 0;
  holder.traverse((child) => {
    if (!(child instanceof Mesh) || child.name === "fit-tank") return;
    meshToHolder.copy(intoHolder).multiply(child.matrixWorld);
    const room = child.name !== "outline" && roomOf(child, meshToHolder, major);
    const layer = child.name === "outline" ? grown : layerGrown(child.name, grown, room);
    if (layer === null) {
      child.visible = false;
      return;
    }
    if (child.name !== "outline") child.visible = true;
    const source = sourceOf.get(child) ?? child.geometry;
    full += source.getIndex()?.count ?? source.getAttribute("position")?.count ?? 0;
    const mark = Math.round(layer * 64);
    if (child.userData.arcBucket !== mark) {
      sourceOf.set(child, source);
      if (child.geometry !== source) child.geometry.dispose();
      child.geometry = wedgeOf(source, meshToHolder, major, layer, !room && (child.name === "outline" || SHELL.has(child.name)));
      child.userData.arcBucket = mark;
    }
    kept += child.geometry.getIndex()?.count ?? 0;
  });
  holder.userData.arcStat = `${kept}/${full}`;
}
