// The construction swarm in the 3D view. Each drone is the SPX repair drone: the coarse model for every drone, the fine one for the few nearest the camera, both instanced. The tractor beam leaves the lens (DRONE.emitter) and runs to the part, the weld arc leaves the tool (DRONE.weldTip), a working drone faces its part, and a parked one faces away from the stack. One set of instanced meshes, disposed with the view.
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, LineBasicMaterial, LineSegments, type Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3, type Object3D, type Texture } from "three";
import { DRONE_FILES } from "../model/drone.ts";
import { DRONE } from "../model/fleet/drone/index.ts";
import { DRONE_SIZE } from "../model/fleet/drone/size.ts";

const CAP = 100;
const RINGS = 3;
const SPARKS = 4;
const SPRAY = 6;
/** How many of the nearest drones are drawn with the fine model. Each is about 120,000 triangles. */
const NEAR_MAX = 6;
/** A drone is drawn fine when the camera is within this many saucer widths of it. */
const NEAR_WIDTHS = 14;
/** How brightly the drone's glow picture shines when the lights are on (the same as a painted ship's). */
const DRONE_GLOW = 1.5;
/** How far the weld arc reaches from the tool, in saucer widths. */
const ARC_WIDTHS = 3;
const PICTURES = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"] as const;
const UP = new Vector3(0, 1, 0);

/**
 * Where one spark sits relative to a weld, in metres. It flies straight out and starts again. Nothing pulls it downward.
 * @param index Which spark.
 * @param age Seconds since the weld was shown.
 * @returns The offset, metres.
 */
export function sparkAt(index: number, age: number): readonly [number, number, number] {
  const angle = (index % 8) * 0.78 + (index % 3) * 0.2;
  const rise = ((index % 5) - 2) * 0.4;
  const x = Math.cos(angle);
  const y = rise;
  const z = Math.sin(angle);
  const len = Math.hypot(x, y, z) || 1;
  const speed = 0.7 + (index % 4) * 0.3;
  const dist = (Math.max(0, age) * speed) % 2.2;
  if (dist === 0) return [0, 0, 0];
  return [(x / len) * dist, (y / len) * dist, (z / len) * dist];
}

export interface SwarmPose {
  where: Vec;
  part: Vec;
  /** This drone is fitting a part, so the join shows a weld. */
  weld?: boolean;
  /** Working a part (faces it, beam on it), flying the path (faces where it is going), or parked (faces away from the stack, no beam). Omitted, it is working. */
  duty?: "work" | "transit" | "berth";
  /** The part's box in the scene. The weld ends on this skin; the part point itself is the middle. */
  skin?: { min: Vec; max: Vec };
}

/** Where a weld from the tool toward the part's middle meets the part's box. Inside the box, the nearest face. */
function onHull(tip: Vec, toward: Vec, box: { min: Vec; max: Vec }): Vec {
  let enter = 0;
  let exit = 1;
  let missed = false;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = toward[axis] - tip[axis];
    const low = box.min[axis];
    const high = box.max[axis];
    if (Math.abs(delta) < 1e-8) {
      if (tip[axis] < low || tip[axis] > high) missed = true;
      continue;
    }
    let near = (low - tip[axis]) / delta;
    let far = (high - tip[axis]) / delta;
    if (near > far) {
      const swap = near;
      near = far;
      far = swap;
    }
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) missed = true;
  }
  if (!missed && enter > 1e-3 && enter <= 1) return [tip[0] + (toward[0] - tip[0]) * enter, tip[1] + (toward[1] - tip[1]) * enter, tip[2] + (toward[2] - tip[2]) * enter];
  const clamped: Vec = [Math.min(box.max[0], Math.max(box.min[0], tip[0])), Math.min(box.max[1], Math.max(box.min[1], tip[1])), Math.min(box.max[2], Math.max(box.min[2], tip[2]))];
  const inside = clamped[0] === tip[0] && clamped[1] === tip[1] && clamped[2] === tip[2];
  if (!inside) return clamped;
  let best = Number.POSITIVE_INFINITY;
  const face: [number, number, number] = [tip[0], tip[1], tip[2]];
  for (let axis = 0; axis < 3; axis += 1) {
    for (const plane of [box.min[axis], box.max[axis]]) {
      const gap = Math.abs(tip[axis] - plane);
      if (gap < best) {
        best = gap;
        face[0] = tip[0];
        face[1] = tip[1];
        face[2] = tip[2];
        face[axis] = plane;
      }
    }
  }
  return face;
}

/** Fetches one of the drone's model files and gives its scene. */
export type DroneLoader = (file: string) => Promise<Object3D>;

type Vec = readonly [number, number, number];

/** Where a point of the drone's own frame (metres, lowest point at 0, front +Z) lands on a drone at `at`, turned by `turn` and drawn `scale` times life size. The drone turns about the middle of its box. */
const centre = new Vector3(0, (DRONE_SIZE.min[1] + DRONE_SIZE.max[1]) / 2, (DRONE_SIZE.min[2] + DRONE_SIZE.max[2]) / 2);

/** The first mesh under `root`, with its position picture turned into plain floats and its own placement baked in, so one geometry serves every instance. */
function bake(root: Object3D): { geometry: BufferGeometry; material: MeshStandardMaterial } | null {
  let found: Mesh | null = null;
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!found && node instanceof Mesh) found = node;
  });
  const mesh = found as Mesh | null;
  if (!mesh) return null;
  const source = mesh.geometry;
  const position = source.getAttribute("position");
  const floats = new Float32Array(position.count * 3);
  const point = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    floats[i * 3] = point.x;
    floats[i * 3 + 1] = point.y;
    floats[i * 3 + 2] = point.z;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(floats, 3));
  const normal = source.getAttribute("normal");
  if (normal) {
    const nf = new Float32Array(normal.count * 3);
    for (let i = 0; i < normal.count; i += 1) {
      nf[i * 3] = normal.getX(i);
      nf[i * 3 + 1] = normal.getY(i);
      nf[i * 3 + 2] = normal.getZ(i);
    }
    geometry.setAttribute("normal", new BufferAttribute(nf, 3));
  }
  const uv = source.getAttribute("uv");
  if (uv) geometry.setAttribute("uv", uv);
  if (source.index) geometry.setIndex(source.index);
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
  // the pictures stay on the material; the geometry's own quantised buffers are let go by the caller through `source`
  source.dispose();
  return { geometry, material };
}

/** One level of the drone: an instanced mesh over one geometry and one material. */
interface Level {
  mesh: InstancedMesh;
  material: MeshStandardMaterial;
}

/** The drones, their beams and the placeholder parts stack. */
export class SwarmRig {
  private readonly group = new Group();
  private far: Level | null = null;
  private near: Level | null = null;
  private nearState: "none" | "loading" | "ready" = "none";
  private generation = 0;
  private disposed = false;
  private glowOn = false;
  private readonly flares: InstancedMesh;
  private readonly beams: InstancedMesh;
  private readonly rings: InstancedMesh;
  private readonly sparks: InstancedMesh;
  private readonly tips: InstancedMesh;
  private readonly spray: InstancedMesh;
  private readonly lasers: LineSegments;
  private readonly laserPositions = new Float32Array(CAP * 6);
  private readonly seam: LineSegments;
  private readonly seamPositions = new Float32Array(CAP * 6);
  private readonly seamMaterial: LineBasicMaterial;
  private readonly paths: LineSegments;
  private readonly weldAt: [number, number, number][] = [];
  private weldCount = 0;
  private reduced = true;
  private scale = 1;
  private readonly pathPositions = new Float32Array(CAP * 6);
  private readonly scratch = new Matrix4();
  /** The turn of the drone being placed, and the aim of its beam. */
  private readonly turn = new Quaternion();
  private readonly spin = new Quaternion();
  private readonly shift = new Matrix4();
  private readonly one = new Vector3();
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly mid = new Vector3();
  private readonly side = new Vector3();
  /** Each drone's matrix, 16 floats apiece, and where its middle is. */
  private bodies = new Float32Array(CAP * 16);
  private centres = new Float32Array(CAP * 3);
  private count = 0;
  private nearSig = "";

  private readonly load: DroneLoader | undefined;
  private readonly wake: () => void;

  constructor(parent: Object3D, load?: DroneLoader, wake: () => void = () => {}) {
    this.load = load;
    this.wake = wake;
    this.group.name = "swarm";
    this.shift.makeTranslation(-centre.x, -centre.y, -centre.z);
    const glow = new MeshBasicMaterial({ color: new Color("#d9e6ff"), transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const ring = new MeshBasicMaterial({ color: new Color("#efeaff"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    const spark = new MeshBasicMaterial({ color: new Color("#ffffff"), transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
    const flare = new MeshBasicMaterial({ color: new Color("#bcd8ff"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    this.flares = new InstancedMesh(new SphereGeometry(1, 10, 10), flare, CAP);
    // the cone's point is at +y, at the drone; its base is at the part
    this.beams = new InstancedMesh(new ConeGeometry(1, 1, 16, 1, true), glow, CAP);
    // rings stand across the beam: their axis is y, the cone's
    this.rings = new InstancedMesh(new TorusGeometry(1, 0.05, 6, 20).rotateX(Math.PI / 2), ring.clone(), CAP * RINGS);
    this.sparks = new InstancedMesh(new SphereGeometry(0.1, 6, 6), spark, CAP * SPARKS);
    const tip = new MeshBasicMaterial({ color: new Color("#e7f6ff"), transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
    this.tips = new InstancedMesh(new SphereGeometry(1, 10, 10), tip, CAP);
    const fleck = new MeshBasicMaterial({ color: new Color("#fff4d2"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    this.spray = new InstancedMesh(new SphereGeometry(0.05, 6, 6), fleck, CAP * SPRAY);
    for (const mesh of [this.flares, this.beams, this.rings, this.sparks, this.tips, this.spray]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    const pathGeo = new BufferGeometry();
    pathGeo.setAttribute("position", new BufferAttribute(this.pathPositions, 3));
    this.paths = new LineSegments(pathGeo, new LineBasicMaterial({ color: new Color("#b7c6ff"), transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false }));
    this.paths.frustumCulled = false;
    this.group.add(this.paths);
    const laserGeo = new BufferGeometry();
    laserGeo.setAttribute("position", new BufferAttribute(this.laserPositions, 3));
    this.lasers = new LineSegments(laserGeo, new LineBasicMaterial({ color: new Color("#d7ecff"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    this.lasers.frustumCulled = false;
    this.group.add(this.lasers);
    const seamGeo = new BufferGeometry();
    seamGeo.setAttribute("position", new BufferAttribute(this.seamPositions, 3));
    this.seamMaterial = new LineBasicMaterial({ color: new Color("#f3fbff"), transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
    this.seam = new LineSegments(seamGeo, this.seamMaterial);
    this.seam.frustumCulled = false;
    this.group.add(this.seam);
    const steel = new MeshStandardMaterial({ color: new Color("#8b93a1"), roughness: 0.6, metalness: 0.2 });
    const post = new BoxGeometry(2, 36, 2);
    const bar = new BoxGeometry(28, 2, 2);
    const left = new Mesh(post, steel);
    left.position.set(-12, 0, 0);
    const right = new Mesh(post, steel);
    right.position.set(12, 0, 0);
    const top = new Mesh(bar, steel);
    top.position.set(0, 16, 0);
    const rail = new Mesh(new BoxGeometry(1.2, 70, 1.2), steel);
    rail.position.set(8, 0, -6);
    const frame = new Group();
    frame.name = "dock";
    frame.add(left, right, top, rail);
    this.group.add(frame);
    parent.add(this.group);
    void this.loadLevel("far");
  }

  /**
   * Puts the drones on `poses` with a beam to each part, or on `parked` with no beam, and the stack at `dock`. A weld is a steady dot, and, unless `reduced` is set, a laser, a seam and a spray.
   * `scale` is how many times life size a drone is drawn: at 1 it is the metre-wide drone itself, and a long ship draws it larger so it reads.
   */
  show(poses: readonly SwarmPose[], parked: readonly [number, number, number][], dock: readonly [number, number, number], reduced = false, scale = 1): void {
    this.reduced = reduced;
    this.scale = Math.max(0.5, scale);
    const s = this.scale;
    const list: SwarmPose[] = poses.length ? [...poses] : parked.map((where) => ({ where, part: where, duty: "berth" as const }));
    const n = Math.min(CAP, list.length);
    this.count = n;
    this.weldAt.length = 0;
    this.beams.count = 0;
    let beamN = 0;
    let flareN = 0;
    const places: Vec[] = [];
    for (let i = 0; i < n; i += 1) {
      const pose = list[i];
      if (!pose) continue;
      const duty = pose.duty ?? "work";
      const p = this.from.set(pose.where[0], pose.where[1], pose.where[2]);
      const target = this.to.set(pose.part[0], pose.part[1], pose.part[2]);
      const beaming = duty !== "berth";
      // the drone turns until the lens points at the part (working or flying), or away from the stack (parked)
      let aimX: number;
      let aimY: number;
      let aimZ: number;
      if (!beaming) {
        aimX = pose.where[0] - dock[0];
        aimY = 0;
        aimZ = pose.where[2] - dock[2];
        if (Math.hypot(aimX, aimZ) < 1e-6) aimX = 1;
      } else {
        aimX = target.x - p.x;
        aimY = target.y - p.y;
        aimZ = target.z - p.z;
      }
      this.turnTo(aimX, aimY, aimZ);
      if (beaming) {
        for (let pass = 0; pass < 3; pass += 1) {
          this.point(DRONE.emitter, p, s, this.mid);
          this.turnTo(target.x - this.mid.x, target.y - this.mid.y, target.z - this.mid.z);
        }
      }
      this.scratch.compose(this.one.set(p.x, p.y, p.z), this.turn, this.side.set(s, s, s));
      // the drone's own frame is about the middle of its box
      this.scratch.multiply(this.shift);
      this.scratch.toArray(this.bodies, i * 16);
      this.centres[i * 3] = p.x;
      this.centres[i * 3 + 1] = p.y;
      this.centres[i * 3 + 2] = p.z;
      places.push(pose.where);
      if (!beaming) continue;
      // the tractor beam: from the lens to the part
      this.point(DRONE.emitter, p, s, this.mid);
      const eX = this.mid.x;
      const eY = this.mid.y;
      const eZ = this.mid.z;
      const span = Math.max(0.01, Math.hypot(target.x - eX, target.y - eY, target.z - eZ));
      const along = this.side.set(eX - target.x, eY - target.y, eZ - target.z).divideScalar(span);
      this.spin.setFromUnitVectors(UP, along);
      const base = 0.5 * s * DRONE.diameter;
      this.scratch.compose(this.one.set((eX + target.x) / 2, (eY + target.y) / 2, (eZ + target.z) / 2), this.spin, this.mid.set(base, span, base));
      this.beams.setMatrixAt(beamN, this.scratch);
      for (let ring = 0; ring < RINGS; ring += 1) {
        const t = (ring + 1) / (RINGS + 1);
        const r = Math.max(0.05 * s, base * t);
        this.scratch.compose(this.one.set(eX + (target.x - eX) * t, eY + (target.y - eY) * t, eZ + (target.z - eZ) * t), this.spin, this.mid.set(r, r, r));
        this.rings.setMatrixAt(beamN * RINGS + ring, this.scratch);
      }
      // sparks of light drifting beside the beam, on either side
      this.side.crossVectors(along, UP);
      if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0);
      this.side.normalize();
      for (let spark = 0; spark < SPARKS; spark += 1) {
        const t = (spark + 0.5) / SPARKS;
        const off = (spark % 2 === 0 ? 0.7 : -0.7) * base * t;
        this.scratch.makeScale(s, s, s);
        this.scratch.setPosition(eX + (target.x - eX) * t + this.side.x * off, eY + (target.y - eY) * t + this.side.y * off, eZ + (target.z - eZ) * t + this.side.z * off);
        this.sparks.setMatrixAt(beamN * SPARKS + spark, this.scratch);
      }
      beamN += 1;
      // a flare at the lens
      this.scratch.makeScale(0.14 * s, 0.14 * s, 0.14 * s);
      this.scratch.setPosition(eX, eY, eZ);
      this.flares.setMatrixAt(flareN, this.scratch);
      flareN += 1;
      if (pose.weld) {
        // the arc leaves the tool and ends on the part's skin; with no box it stops short of the middle
        this.point(DRONE.weldTip, p, s, this.mid);
        const wx = this.mid.x;
        const wy = this.mid.y;
        const wz = this.mid.z;
        const reach = Math.hypot(target.x - wx, target.y - wy, target.z - wz) || 1;
        const arc = Math.min(reach, ARC_WIDTHS * s * DRONE.diameter);
        const end = pose.skin
          ? onHull([wx, wy, wz], [target.x, target.y, target.z], pose.skin)
          : ([wx + ((target.x - wx) / reach) * arc, wy + ((target.y - wy) / reach) * arc, wz + ((target.z - wz) / reach) * arc] as [number, number, number]);
        this.weldAt.push([wx, wy, wz]);
        this.weldAt.push([end[0], end[1], end[2]]);
      }
    }
    this.beams.count = beamN;
    this.rings.count = beamN * RINGS;
    this.sparks.count = beamN * SPARKS;
    this.flares.count = flareN;
    for (const mesh of [this.beams, this.rings, this.sparks, this.flares]) mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < n; i += 1) {
      const at = places[i] ?? [0, 0, 0];
      this.pathPositions[i * 6] = dock[0];
      this.pathPositions[i * 6 + 1] = dock[1];
      this.pathPositions[i * 6 + 2] = dock[2];
      this.pathPositions[i * 6 + 3] = at[0];
      this.pathPositions[i * 6 + 4] = at[1];
      this.pathPositions[i * 6 + 5] = at[2];
    }
    this.paths.geometry.setDrawRange(0, n * 2);
    this.paths.geometry.getAttribute("position").needsUpdate = true;
    // weldAt holds the tool tip then the arc's end, for each welding drone
    this.weldCount = this.weldAt.length / 2;
    this.tips.count = this.weldCount;
    for (let i = 0; i < this.weldCount; i += 1) {
      const tipAt = this.weldAt[i * 2] ?? [0, 0, 0];
      this.scratch.makeScale(0.07 * s, 0.07 * s, 0.07 * s);
      this.scratch.setPosition(tipAt[0], tipAt[1], tipAt[2]);
      this.tips.setMatrixAt(i, this.scratch);
    }
    this.tips.instanceMatrix.needsUpdate = true;
    const live = !reduced && this.weldCount > 0;
    this.spray.count = live ? this.weldCount * SPRAY : 0;
    if (live) this.placeSpray(0);
    this.lasers.geometry.setDrawRange(0, live ? this.weldCount * 2 : 0);
    this.seam.geometry.setDrawRange(0, live ? this.weldCount * 2 : 0);
    if (live) {
      for (let i = 0; i < this.weldCount; i += 1) {
        const a = this.weldAt[i * 2] ?? [0, 0, 0];
        const b = this.weldAt[i * 2 + 1] ?? a;
        this.laserPositions.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6);
        const dx = b[0] - a[0];
        const dz = b[2] - a[2];
        const flat = Math.hypot(dx, dz) || 1;
        const half = 0.12 * s;
        this.seamPositions.set([b[0] - (dz / flat) * half, b[1], b[2] + (dx / flat) * half, b[0] + (dz / flat) * half, b[1], b[2] - (dx / flat) * half], i * 6);
      }
      this.lasers.geometry.getAttribute("position").needsUpdate = true;
      this.seam.geometry.getAttribute("position").needsUpdate = true;
    }
    const frame = this.group.getObjectByName("dock");
    if (frame) frame.position.set(dock[0], dock[1], dock[2]);
    this.nearSig = "?";
    this.group.visible = true;
  }

  /**
   * Chooses which drones are drawn fine and which coarse, for a camera at `eye`: the nearest few within a short reach get the fine model, every other one the coarse model. Does nothing when no drone has moved into or out of the near set.
   * @returns How many are drawn fine.
   */
  lod(eye: Vec): number {
    if (!this.group.visible || !this.far) return 0;
    const reach = NEAR_WIDTHS * DRONE.diameter * this.scale;
    const near: number[] = [];
    const ranked: { i: number; d: number }[] = [];
    for (let i = 0; i < this.count; i += 1) {
      const d = Math.hypot((this.centres[i * 3] ?? 0) - eye[0], (this.centres[i * 3 + 1] ?? 0) - eye[1], (this.centres[i * 3 + 2] ?? 0) - eye[2]);
      if (d < reach) ranked.push({ i, d });
    }
    ranked.sort((a, b) => a.d - b.d);
    for (const { i } of ranked.slice(0, NEAR_MAX)) near.push(i);
    if (near.length > 0 && this.nearState === "none") void this.loadLevel("near");
    // until the fine model is in, the coarse one stands for it
    const fine = this.near && this.nearState === "ready" ? near : [];
    const sig = fine.join(",");
    if (sig === this.nearSig) return fine.length;
    this.nearSig = sig;
    const isFine = new Set(fine);
    let coarse = 0;
    for (let i = 0; i < this.count; i += 1) {
      if (isFine.has(i)) continue;
      this.far.mesh.setMatrixAt(coarse, this.scratch.fromArray(this.bodies, i * 16));
      coarse += 1;
    }
    this.far.mesh.count = coarse;
    this.far.mesh.instanceMatrix.needsUpdate = true;
    if (this.near) {
      fine.forEach((i, slot) => this.near?.mesh.setMatrixAt(slot, this.scratch.fromArray(this.bodies, i * 16)));
      this.near.mesh.count = fine.length;
      this.near.mesh.instanceMatrix.needsUpdate = true;
    }
    return fine.length;
  }

  /** The lights of the drones glow when the ship's lights are on, as a painted ship's do. */
  setGlow(on: boolean): void {
    this.glowOn = on;
    for (const level of [this.far, this.near]) if (level) level.material.emissiveIntensity = on ? DRONE_GLOW : 0;
  }

  /** Whether the spray and the laser are moving. A reduced-motion view keeps only the dot, so this is false. */
  live(): boolean {
    return this.weldCount > 0 && !this.reduced;
  }

  /** Whether the view needs another draw soon: the fine model is on its way. */
  loading(): boolean {
    return this.nearState === "loading";
  }

  /** Moves the spray out along its rays and lets the seam fade and return. */
  step(age: number): void {
    if (!this.live()) return;
    this.placeSpray(age);
    this.seamMaterial.opacity = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(age * 3));
  }

  /** Hides the swarm and gives back the fine model, the heavy one; the coarse one stays for the next time. */
  hide(): void {
    this.group.visible = false;
    this.weldCount = 0;
    this.count = 0;
    this.nearSig = "?";
    this.generation += 1;
    if (this.near) this.freeLevel(this.near);
    this.near = null;
    this.nearState = "none";
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
    this.group.removeFromParent();
    if (this.far) this.freeLevel(this.far);
    if (this.near) this.freeLevel(this.near);
    this.far = null;
    this.near = null;
    this.group.traverse((node) => {
      const mesh = node as Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) for (const one of material) one.dispose();
      else material?.dispose();
      if (node instanceof InstancedMesh) node.dispose();
    });
  }

  /** Where a point of the drone's own frame lands for the drone at `at`, in the turn last set, drawn `scale` times life size. */
  private point(local: Vec, at: Vector3, scale: number, out: Vector3): Vector3 {
    out.set(local[0] - centre.x, local[1] - centre.y, local[2] - centre.z).multiplyScalar(scale).applyQuaternion(this.turn).add(at);
    return out;
  }

  /** Sets the turn so the drone's front (+Z) points along (x, y, z), upright. */
  private turnTo(x: number, y: number, z: number): void {
    const m = this.scratch;
    // an object's +Z toward the target: the look-at is taken from the target back to the drone
    m.lookAt(this.side.set(x, y, z), this.one.set(0, 0, 0), UP);
    this.turn.setFromRotationMatrix(m);
  }

  private placeSpray(age: number): void {
    const s = this.scale;
    for (let i = 0; i < this.weldCount; i += 1) {
      const at = this.weldAt[i * 2 + 1] ?? [0, 0, 0];
      for (let spark = 0; spark < SPRAY; spark += 1) {
        const off = sparkAt(i * SPRAY + spark, age);
        this.scratch.makeScale(s, s, s);
        this.scratch.setPosition(at[0] + off[0] * s * 0.5, at[1] + off[1] * s * 0.5, at[2] + off[2] * s * 0.5);
        this.spray.setMatrixAt(i * SPRAY + spark, this.scratch);
      }
    }
    this.spray.instanceMatrix.needsUpdate = true;
  }

  /** Brings in one level of the drone. Until it is in, nothing of that level draws. */
  private async loadLevel(which: "far" | "near"): Promise<void> {
    if (!this.load) return;
    if (which === "near") this.nearState = "loading";
    const generation = this.generation;
    try {
      const scene = await this.load(DRONE_FILES[which]);
      const baked = bake(scene);
      if (!baked || this.disposed || (which === "near" && generation !== this.generation)) {
        this.discard(baked, scene);
        if (which === "near") this.nearState = "none";
        return;
      }
      const mesh = new InstancedMesh(baked.geometry, baked.material, CAP);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.name = `drone-${which}`;
      baked.material.emissiveIntensity = this.glowOn ? DRONE_GLOW : 0;
      this.group.add(mesh);
      const level = { mesh, material: baked.material };
      if (which === "far") this.far = level;
      else {
        this.near = level;
        this.nearState = "ready";
      }
      this.nearSig = "?";
      this.wake();
    } catch {
      if (which === "near") this.nearState = "none";
    }
  }

  private discard(baked: { geometry: BufferGeometry; material: MeshStandardMaterial } | null, scene: Object3D): void {
    baked?.geometry.dispose();
    const material = baked?.material;
    if (material) {
      for (const slot of PICTURES) (material[slot] as Texture | null | undefined)?.dispose();
      material.dispose();
    }
    scene.clear();
  }

  private freeLevel(level: Level): void {
    level.mesh.removeFromParent();
    level.mesh.geometry.dispose();
    for (const slot of PICTURES) (level.material[slot] as Texture | null | undefined)?.dispose();
    (level.material as Material).dispose();
    level.mesh.dispose();
  }
}
