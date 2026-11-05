// The construction swarm in the 3D view. Each drone is a box about a metre across, with a ringed emitter, two lamps and a small glow, a stand-in until the drone exists. The beam is a short translucent cone. One set of instanced meshes, disposed with the view.
import { AdditiveBlending, BoxGeometry, Color, ConeGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3, type Object3D } from "three";

const CAP = 100;
const RINGS = 3;
const SPARKS = 4;

export interface SwarmPose {
  where: [number, number, number];
  part: [number, number, number];
}

/** The drones, their beams and the placeholder parts stack. */
export class SwarmRig {
  private readonly group = new Group();
  private readonly drones: InstancedMesh;
  private readonly emitters: InstancedMesh;
  private readonly lamps: InstancedMesh;
  private readonly glows: InstancedMesh;
  private readonly beams: InstancedMesh;
  private readonly rings: InstancedMesh;
  private readonly sparks: InstancedMesh;
  private readonly scratch = new Matrix4();
  private readonly aim = new Quaternion();
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly mid = new Vector3();

  constructor(parent: Object3D) {
    this.group.name = "swarm";
    const white = new MeshStandardMaterial({ color: new Color("#f4f7fb"), roughness: 0.45, metalness: 0.05 });
    const lamp = new MeshBasicMaterial({ color: new Color("#ffe7a3") });
    const halo = new MeshBasicMaterial({ color: new Color("#ffe1a0"), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false });
    const glow = new MeshBasicMaterial({ color: new Color("#d9e6ff"), transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const ring = new MeshBasicMaterial({ color: new Color("#efeaff"), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    const spark = new MeshBasicMaterial({ color: new Color("#ffffff"), transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
    this.drones = new InstancedMesh(new BoxGeometry(1.4, 0.55, 1.1), white, CAP);
    this.emitters = new InstancedMesh(new TorusGeometry(0.7, 0.08, 6, 12), ring, CAP);
    this.lamps = new InstancedMesh(new SphereGeometry(0.16, 8, 8), lamp, CAP * 2);
    this.glows = new InstancedMesh(new SphereGeometry(3.2, 10, 10), halo, CAP);
    this.beams = new InstancedMesh(new ConeGeometry(1, 1, 12), glow, CAP);
    this.rings = new InstancedMesh(new TorusGeometry(0.8, 0.06, 6, 12), ring.clone(), CAP * RINGS);
    this.sparks = new InstancedMesh(new SphereGeometry(0.28, 6, 6), spark, CAP * SPARKS);
    for (const mesh of [this.drones, this.emitters, this.lamps, this.glows, this.beams, this.rings, this.sparks]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
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
  }

  /** Puts the drones on `poses` with a beam to each part, or on `parked` with no beam, and the stack at `dock`. */
  show(poses: readonly SwarmPose[], parked: readonly [number, number, number][], dock: readonly [number, number, number]): void {
    const points = poses.length ? poses.map((pose) => pose.where) : parked;
    this.place(this.drones, points, (at, i) => {
      this.scratch.makeTranslation(at[0], at[1], at[2]);
      this.drones.setMatrixAt(i, this.scratch);
    });
    this.place(this.emitters, points, (at, i) => {
      this.scratch.makeTranslation(at[0], at[1], at[2] + 0.4);
      this.emitters.setMatrixAt(i, this.scratch);
    });
    this.place(this.glows, points, (at, i) => {
      this.scratch.makeTranslation(at[0], at[1], at[2]);
      this.glows.setMatrixAt(i, this.scratch);
    });
    this.lamps.count = points.length * 2;
    for (let i = 0; i < points.length; i += 1) {
      const at = points[i] ?? [0, 0, 0];
      this.scratch.makeTranslation(at[0] - 0.4, at[1], at[2] + 0.25);
      this.lamps.setMatrixAt(i * 2, this.scratch);
      this.scratch.makeTranslation(at[0] + 0.4, at[1], at[2] + 0.25);
      this.lamps.setMatrixAt(i * 2 + 1, this.scratch);
    }
    this.lamps.instanceMatrix.needsUpdate = true;
    this.beams.count = poses.length;
    this.rings.count = poses.length * RINGS;
    this.sparks.count = poses.length * SPARKS;
    for (let i = 0; i < poses.length; i += 1) {
      const pose = poses[i];
      if (!pose) continue;
      this.from.set(pose.where[0], pose.where[1], pose.where[2]);
      this.to.set(pose.part[0], pose.part[1], pose.part[2]);
      this.mid.addVectors(this.from, this.to).multiplyScalar(0.5);
      const span = Math.max(0.01, this.to.distanceTo(this.from));
      this.aim.setFromUnitVectors(new Vector3(0, 1, 0), this.from.clone().sub(this.to).normalize());
      this.scratch.compose(this.mid, this.aim, new Vector3(1.1, span, 1.1));
      this.beams.setMatrixAt(i, this.scratch);
      for (let ring = 0; ring < RINGS; ring += 1) {
        const t = (ring + 1) / (RINGS + 1);
        this.mid.copy(this.from).lerp(this.to, t);
        this.scratch.compose(this.mid, this.aim, new Vector3(1, 1, 1));
        this.rings.setMatrixAt(i * RINGS + ring, this.scratch);
      }
      for (let spark = 0; spark < SPARKS; spark += 1) {
        const t = (spark + 0.5) / SPARKS;
        const side = spark % 2 === 0 ? 0.7 : -0.7;
        this.mid.copy(this.from).lerp(this.to, t);
        this.mid.z += side;
        this.scratch.makeTranslation(this.mid.x, this.mid.y, this.mid.z);
        this.sparks.setMatrixAt(i * SPARKS + spark, this.scratch);
      }
    }
    this.beams.instanceMatrix.needsUpdate = true;
    this.rings.instanceMatrix.needsUpdate = true;
    this.sparks.instanceMatrix.needsUpdate = true;
    const frame = this.group.getObjectByName("dock");
    if (frame) frame.position.set(dock[0], dock[1], dock[2]);
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((node) => {
      const mesh = node as Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) for (const one of material) one.dispose();
      else material?.dispose();
    });
  }

  private place(mesh: InstancedMesh, points: readonly (readonly [number, number, number])[], put: (at: readonly [number, number, number], index: number) => void): void {
    mesh.count = points.length;
    for (let i = 0; i < points.length; i += 1) put(points[i] ?? [0, 0, 0], i);
    mesh.instanceMatrix.needsUpdate = true;
  }
}
