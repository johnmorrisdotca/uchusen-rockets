// The construction swarm in the 3D view. Each drone is the SPX repair drone: the coarse model for every drone, the fine one for the few nearest the camera, both instanced. The tractor beam leaves the lens (DRONE.emitter) and runs to the part, the weld arc leaves the tool (DRONE.weldTip), a working drone faces its part, and a parked one faces away from the stack. One set of instanced meshes, disposed with the view.
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, LineBasicMaterial, LineSegments, type Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3, type Object3D, type Texture } from "three";
import { DRONE_FILES } from "../model/drone.ts";
import { DRONE } from "../model/fleet/drone/index.ts";
import { DRONE_SIZE } from "../model/fleet/drone/size.ts";

const CAP = 100;
const RINGS = 2;
const SPARKS = 5;
const SPRAY = 16;
const STREAKS = 10;
/** How many of the nearest drones are drawn with the fine model. Each is about 120,000 triangles. */
const NEAR_MAX = 6;
/** A drone is drawn fine when the camera is within this many saucer widths of it. The wide view stays outside that, so the lamp is what reads. */
const NEAR_WIDTHS = 32;
/** How brightly the drone's glow picture shines when the lights are on (the same as a painted ship's). */
const DRONE_GLOW = 1.5;
/** How far the weld arc reaches from the tool, in saucer widths. */
const ARC_WIDTHS = 3;
const PICTURES = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"] as const;
const UP = new Vector3(0, 1, 0);
const HOT = new Color("#fff6c0");
const EMBER = new Color("#ff8a32");

/** A soft round light: white at the middle, warm, and gone at the edge. A drone far off is this point and its halo. */
const lampDisc = (): CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const pen = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  if (!pen) return texture;
  const wash = pen.createRadialGradient(32, 32, 0, 32, 32, 32);
  wash.addColorStop(0, "rgba(255,255,255,1)");
  wash.addColorStop(0.16, "rgba(255,246,214,0.95)");
  wash.addColorStop(0.42, "rgba(255,196,110,0.28)");
  wash.addColorStop(1, "rgba(255,196,110,0)");
  pen.fillStyle = wash;
  pen.fillRect(0, 0, 64, 64);
  texture.needsUpdate = true;
  return texture;
};

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
  /** Boss, manager, builder or grunt. The drawn size and the lamp follow it. */
  rank?: "boss" | "manager" | "builder" | "grunt";
}

const RANK_SCALE = { boss: 2.2, manager: 1.55, builder: 1, grunt: 0.75 } as const;
const RANK_LAMP: Record<keyof typeof RANK_SCALE, [number, number, number]> = {
  boss: [1, 0.72, 0.2],
  manager: [0.45, 0.75, 1],
  builder: [1, 0.96, 0.85],
  grunt: [0.55, 0.62, 0.55],
};

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
  private readonly cores: InstancedMesh;
  private readonly lamps: Points;
  private readonly lampPositions = new Float32Array(CAP * 3);
  private readonly turns = new Float32Array(CAP * 4);
  private readonly rings: InstancedMesh;
  private readonly sparks: InstancedMesh;
  private readonly tips: InstancedMesh;
  private readonly spray: InstancedMesh;
  private readonly lasers: LineSegments;
  private readonly laserPositions = new Float32Array(CAP * 6);
  private readonly seam: LineSegments;
  private readonly seamPositions = new Float32Array(CAP * 6);
  private readonly seamMaterial: LineBasicMaterial;
  private readonly streaks: LineSegments;
  private readonly streakPositions = new Float32Array(CAP * STREAKS * 6);
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
  private rankScale = new Float32Array(CAP).fill(1);
  private lampColours = new Float32Array(CAP * 3);
  private count = 0;
  private nearSig = "";

  private readonly load: DroneLoader | undefined;
  private readonly wake: () => void;

  constructor(parent: Object3D, load?: DroneLoader, wake: () => void = () => {}) {
    this.load = load;
    this.wake = wake;
    this.group.name = "swarm";
    this.shift.makeTranslation(-centre.x, -centre.y, -centre.z);
    const glow = new MeshBasicMaterial({ color: new Color("#6d8cff"), transparent: true, opacity: 0.07, blending: AdditiveBlending, depthWrite: false });
    const core = new MeshBasicMaterial({ color: new Color("#c5d6ff"), transparent: true, opacity: 0.05, blending: AdditiveBlending, depthWrite: false });
    const ring = new MeshBasicMaterial({ color: new Color("#b9ceff"), transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false });
    const spark = new MeshBasicMaterial({ color: new Color("#d7e6ff"), transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
    const flare = new MeshBasicMaterial({ color: new Color("#9eb6ff"), transparent: true, opacity: 0.28, blending: AdditiveBlending, depthWrite: false });
    this.flares = new InstancedMesh(new SphereGeometry(1, 12, 12), flare, CAP * 2);
    const lampGeo = new BufferGeometry();
    lampGeo.setAttribute("position", new BufferAttribute(this.lampPositions, 3));
    lampGeo.setAttribute("color", new BufferAttribute(this.lampColours, 3));
    this.lamps = new Points(lampGeo, new PointsMaterial({ vertexColors: true, size: 14, sizeAttenuation: false, map: lampDisc(), transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false }));
    this.lamps.frustumCulled = false;
    this.lamps.renderOrder = 6;
    // a cone: the narrow end (+y) is the lens, the wide end is the part
    this.beams = new InstancedMesh(new CylinderGeometry(0.08, 1, 1, 28, 1, true), glow, CAP);
    this.cores = new InstancedMesh(new CylinderGeometry(0.02, 0.12, 1, 12, 1, true), core, CAP);
    this.beams.renderOrder = 4;
    this.cores.renderOrder = 5;
    // two faint rings stand across the beam: their axis is y, the cone's
    this.rings = new InstancedMesh(new TorusGeometry(1, 0.035, 6, 24).rotateX(Math.PI / 2), ring.clone(), CAP * RINGS);
    this.sparks = new InstancedMesh(new SphereGeometry(0.08, 6, 6), spark, CAP * SPARKS);
    const tip = new MeshBasicMaterial({ color: new Color("#fff6c2"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    this.tips = new InstancedMesh(new SphereGeometry(1, 10, 10), tip, CAP);
    const fleck = new MeshBasicMaterial({ color: new Color("#fff3c4"), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false });
    this.spray = new InstancedMesh(new SphereGeometry(0.12, 6, 6), fleck, CAP * SPRAY);
    this.group.add(this.lamps);
    for (const mesh of [this.flares, this.beams, this.cores, this.rings, this.sparks, this.tips, this.spray]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    const pathGeo = new BufferGeometry();
    pathGeo.setAttribute("position", new BufferAttribute(this.pathPositions, 3));
    this.paths = new LineSegments(pathGeo, new LineBasicMaterial({ color: new Color("#b7c6ff"), transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false }));
    this.paths.frustumCulled = false;
    this.paths.visible = false;
    const laserGeo = new BufferGeometry();
    laserGeo.setAttribute("position", new BufferAttribute(this.laserPositions, 3));
    this.lasers = new LineSegments(laserGeo, new LineBasicMaterial({ color: new Color("#ffffff"), transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }));
    this.lasers.frustumCulled = false;
    this.group.add(this.lasers);
    const seamGeo = new BufferGeometry();
    seamGeo.setAttribute("position", new BufferAttribute(this.seamPositions, 3));
    this.seamMaterial = new LineBasicMaterial({ color: new Color("#ffe38a"), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false });
    this.seam = new LineSegments(seamGeo, this.seamMaterial);
    this.seam.frustumCulled = false;
    this.group.add(this.seam);
    const streakGeo = new BufferGeometry();
    streakGeo.setAttribute("position", new BufferAttribute(this.streakPositions, 3));
    this.streaks = new LineSegments(streakGeo, new LineBasicMaterial({ color: new Color("#ff9a3c"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    this.streaks.frustumCulled = false;
    this.streaks.renderOrder = 6;
    this.group.add(this.streaks);
    parent.add(this.group);
    void this.loadLevel("far");
  }

  /**
   * Puts the drones on `poses` with a beam to each part, or on `parked` with no beam, and the stack at `dock`. A weld shows its seam and its sparks in a still; unless `reduced` is set, the spray also moves.
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
    for (let i = 0; i < n; i += 1) {
      const pose = list[i];
      if (!pose) continue;
      const duty = pose.duty ?? "work";
      const rankScale = RANK_SCALE[pose.rank ?? "builder"];
      this.rankScale[i] = rankScale;
      this.lampColours.set(RANK_LAMP[pose.rank ?? "builder"], i * 3);
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
      this.scratch.compose(this.one.set(p.x, p.y, p.z), this.turn, this.side.set(s * rankScale, s * rankScale, s * rankScale));
      // the drone's own frame is about the middle of its box
      this.scratch.multiply(this.shift);
      this.scratch.toArray(this.bodies, i * 16);
      this.turn.toArray(this.turns, i * 4);
      this.centres[i * 3] = p.x;
      this.centres[i * 3 + 1] = p.y;
      this.centres[i * 3 + 2] = p.z;
      this.lampPositions[i * 3] = p.x;
      this.lampPositions[i * 3 + 1] = p.y;
      this.lampPositions[i * 3 + 2] = p.z;
      if (duty !== "work") continue;
      // the tractor beam: from the lens to the part's skin, only while this drone is fitting that part
      this.point(DRONE.emitter, p, s, this.mid);
      const eX = this.mid.x;
      const eY = this.mid.y;
      const eZ = this.mid.z;
      const landed = pose.skin ? onHull([eX, eY, eZ], [target.x, target.y, target.z], pose.skin) : ([target.x, target.y, target.z] as Vec);
      const endX = landed[0];
      const endY = landed[1];
      const endZ = landed[2];
      const span = Math.max(0.01, Math.hypot(endX - eX, endY - eY, endZ - eZ));
      const ux = (eX - endX) / span;
      const uy = (eY - endY) / span;
      const uz = (eZ - endZ) / span;
      this.spin.setFromUnitVectors(UP, this.side.set(ux, uy, uz));
      const wide = Math.min(1.4, Math.max(0.25, s * 0.35));
      const placeBeam = (mesh: InstancedMesh) => {
        this.scratch.compose(this.one.set((eX + endX) / 2, (eY + endY) / 2, (eZ + endZ) / 2), this.spin, this.mid.set(wide, span, wide));
        mesh.setMatrixAt(beamN, this.scratch);
      };
      placeBeam(this.beams);
      placeBeam(this.cores);
      let px = -uz;
      let pz = ux;
      if (px * px + pz * pz < 1e-8) {
        px = 1;
        pz = 0;
      }
      const plen = Math.hypot(px, pz) || 1;
      px /= plen;
      pz /= plen;
      const bx = uy * pz;
      const by = uz * px - ux * pz;
      const bz = -uy * px;
      for (let ring = 0; ring < RINGS; ring += 1) {
        const t = (ring + 1) / (RINGS + 1);
        const r = wide * (0.25 + 0.6 * t);
        this.scratch.compose(this.one.set(eX + (endX - eX) * t, eY + (endY - eY) * t, eZ + (endZ - eZ) * t), this.spin, this.mid.set(r, r, r));
        this.rings.setMatrixAt(beamN * RINGS + ring, this.scratch);
      }
      // a few motes drifting inside the cone, never wider than it
      for (let spark = 0; spark < SPARKS; spark += 1) {
        const t = (spark + 0.5) / SPARKS;
        const here = wide * (0.08 + 0.8 * t) * 0.4;
        const ang = spark * 2.4 + beamN;
        const ox = Math.cos(ang) * here;
        const oy = Math.sin(ang) * here;
        this.scratch.makeScale(1.4, 1.4, 1.4);
        this.scratch.setPosition(eX + (endX - eX) * t + px * ox + bx * oy, eY + (endY - eY) * t + by * oy, eZ + (endZ - eZ) * t + pz * ox + bz * oy);
        this.sparks.setMatrixAt(beamN * SPARKS + spark, this.scratch);
      }
      beamN += 1;
      // a small flare at the lens, and a faint pool where the cone meets the part
      this.scratch.makeScale(0.18, 0.18, 0.18);
      this.scratch.setPosition(eX, eY, eZ);
      this.flares.setMatrixAt(flareN, this.scratch);
      flareN += 1;
      this.scratch.compose(this.one.set(endX, endY, endZ), this.spin, this.mid.set(wide * 0.55, wide * 0.04, wide * 0.55));
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
    this.cores.count = beamN;
    this.rings.count = beamN * RINGS;
    this.sparks.count = beamN * SPARKS;
    this.flares.count = flareN;
    this.lamps.geometry.setDrawRange(0, n);
    const lampAttr = this.lamps.geometry.getAttribute("position");
    lampAttr.needsUpdate = true;
    const lampColour = this.lamps.geometry.getAttribute("color");
    lampColour.needsUpdate = true;
    for (const mesh of [this.beams, this.cores, this.rings, this.sparks, this.flares]) mesh.instanceMatrix.needsUpdate = true;
    this.paths.geometry.setDrawRange(0, 0);
    // weldAt holds the tool tip then the arc's end, for each welding drone
    this.weldCount = this.weldAt.length / 2;
    this.tips.count = this.weldCount;
    for (let i = 0; i < this.weldCount; i += 1) {
      const tipAt = this.weldAt[i * 2] ?? [0, 0, 0];
      this.scratch.makeScale(0.22, 0.22, 0.22);
      this.scratch.setPosition(tipAt[0], tipAt[1], tipAt[2]);
      this.tips.setMatrixAt(i, this.scratch);
    }
    this.tips.instanceMatrix.needsUpdate = true;
    const marked = this.weldCount > 0;
    this.spray.count = marked ? this.weldCount * SPRAY : 0;
    this.lasers.geometry.setDrawRange(0, marked ? this.weldCount * 2 : 0);
    this.seam.geometry.setDrawRange(0, marked ? this.weldCount * 2 : 0);
    if (marked) {
      for (let i = 0; i < this.weldCount; i += 1) {
        const a = this.weldAt[i * 2] ?? [0, 0, 0];
        const b = this.weldAt[i * 2 + 1] ?? a;
        this.laserPositions.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6);
        const dx = b[0] - a[0];
        const dz = b[2] - a[2];
        const flat = Math.hypot(dx, dz) || 1;
        const half = 0.7;
        this.seamPositions.set([b[0] - (dz / flat) * half, b[1], b[2] + (dx / flat) * half, b[0] + (dz / flat) * half, b[1], b[2] - (dx / flat) * half], i * 6);
      }
      let streakN = 0;
      for (let i = 0; i < this.weldCount; i += 1) {
        const at = this.weldAt[i * 2 + 1] ?? [0, 0, 0];
        for (let ray = 0; ray < STREAKS; ray += 1) {
          const dir = sparkAt(i * STREAKS + ray, 1);
          const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
          const ux = dir[0] / len;
          const uy = dir[1] / len;
          const uz = dir[2] / len;
          const near = 0.12;
          const far = 0.4 + (ray % 5) * 0.2;
          this.streakPositions.set([at[0] + ux * near, at[1] + uy * near, at[2] + uz * near, at[0] + ux * far, at[1] + uy * far, at[2] + uz * far], streakN * 6);
          streakN += 1;
        }
      }
      this.streaks.geometry.setDrawRange(0, streakN * 2);
      this.lasers.geometry.getAttribute("position").needsUpdate = true;
      this.seam.geometry.getAttribute("position").needsUpdate = true;
      this.streaks.geometry.getAttribute("position").needsUpdate = true;
      this.placeSpray(reduced ? 0.7 : 0);
    } else this.streaks.geometry.setDrawRange(0, 0);
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
      this.turn.fromArray(this.turns, i * 4);
      const drawn = this.scale * 0.22 * (this.rankScale[i] ?? 1);
      this.scratch.compose(this.one.set(this.centres[i * 3] ?? 0, this.centres[i * 3 + 1] ?? 0, this.centres[i * 3 + 2] ?? 0), this.turn, this.side.set(drawn, drawn, drawn));
      this.scratch.multiply(this.shift);
      this.far.mesh.setMatrixAt(coarse, this.scratch);
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
    for (let i = 0; i < this.weldCount; i += 1) {
      const at = this.weldAt[i * 2 + 1] ?? [0, 0, 0];
      for (let spark = 0; spark < SPRAY; spark += 1) {
        const off = sparkAt(i * SPRAY + spark, age);
        const warm = spark < SPRAY / 2;
        const reach = warm ? 0.45 : 1;
        const size = warm ? 3.4 : 2.2;
        this.scratch.makeScale(size, size, size);
        this.scratch.setPosition(at[0] + off[0] * reach, at[1] + off[1] * reach, at[2] + off[2] * reach);
        const slot = i * SPRAY + spark;
        this.spray.setMatrixAt(slot, this.scratch);
        this.spray.setColorAt(slot, warm ? HOT : EMBER);
      }
    }
    this.spray.instanceMatrix.needsUpdate = true;
    if (this.spray.instanceColor) this.spray.instanceColor.needsUpdate = true;
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
