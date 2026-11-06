// One instanced draw for every nozzle, and one pool of puffs. Idle jets add nothing per frame.
import { AdditiveBlending, BufferGeometry, CanvasTexture, ConeGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Points, PointsMaterial, Quaternion, Vector3 } from "three";
import { KEEP_GAP, PUFF_LIFE, puffStep, turnPair, type Jet, type ThrusterMode } from "../thrusters.ts";

const POOL = 64;
const DRIFT = 0.4;

interface Live {
  at: Vector3;
  dir: Vector3;
  fuel: Jet["fuel"];
  bell: number;
}

/** Nozzles and their puffs for one rocket. The nozzles are already in the rocket's space. */
export class ThrusterLayer {
  private readonly group = new Group();
  private readonly live: Live[] = [];
  private mesh: InstancedMesh | null = null;
  private points: Points | null = null;
  private readonly ages = new Float32Array(POOL);
  private readonly which = new Int16Array(POOL);
  private mode: Exclude<ThrusterMode, "off"> = "show";
  private reduced = false;
  private clock = 0;
  private nextPulse = 0.4;
  private readonly disc: CanvasTexture;
  private puffCountNow = 0;

  constructor(parent: Group, jets: readonly Jet[], mode: Exclude<ThrusterMode, "off">, reduced: boolean) {
    this.mode = mode;
    this.reduced = reduced;
    this.which.fill(-1);
    for (const one of jets) this.live.push({ at: new Vector3(...one.at), dir: new Vector3(...one.dir).normalize(), fuel: one.fuel, bell: one.bell });
    const cone = new ConeGeometry(0.45, 1, 8, 1, true);
    const metal = new MeshStandardMaterial({ color: "#9aa3ab", metalness: 0.65, roughness: 0.4 });
    this.mesh = new InstancedMesh(cone, metal, Math.max(1, this.live.length));
    this.mesh.count = this.live.length;
    this.mesh.frustumCulled = false;
    const basis = new Matrix4();
    const aim = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const place = new Vector3();
    for (let i = 0; i < this.live.length; i++) {
      const jet = this.live[i];
      if (!jet) continue;
      aim.setFromUnitVectors(up, jet.dir.clone().negate());
      place.copy(jet.at).addScaledVector(jet.dir, -jet.bell / 2);
      basis.compose(place, aim, new Vector3(jet.bell, jet.bell, jet.bell));
      this.mesh.setMatrixAt(i, basis);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.mesh);
    const geo = new BufferGeometry();
    const positions = new Float32Array(POOL * 3);
    const colours = new Float32Array(POOL * 3);
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colours, 3));
    this.disc = this.softDisc();
    const material = new PointsMaterial({
      size: 14,
      sizeAttenuation: false,
      map: this.disc,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.points = new Points(geo, material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.group.add(this.points);
    parent.add(this.group);
  }

  nozzleCount(): number {
    return this.live.length;
  }

  puffCount(): number {
    return this.puffCountNow;
  }

  /** A slow drift while someone is watching, or a still hold. Null when the ship should sit where it was built. */
  step(dt: number, awake: boolean): { x: number; y: number; z: number } | null {
    this.clock += dt;
    if (!this.reduced && this.mode === "station-keeping" && awake && this.clock >= this.nextPulse) {
      this.nextPulse = this.clock + KEEP_GAP;
      this.turn();
    }
    const positions = this.points?.geometry.getAttribute("position");
    const colours = this.points?.geometry.getAttribute("color");
    if (!positions || !colours) return null;
    let alive = 0;
    for (let i = 0; i < POOL; i++) {
      const index = this.which[i] ?? -1;
      const jet = index >= 0 ? this.live[index] : undefined;
      const age = (this.ages[i] ?? 0) + dt;
      this.ages[i] = age;
      const puff = jet ? puffStep(age, [jet.at.x, jet.at.y, jet.at.z], [jet.dir.x, jet.dir.y, jet.dir.z]) : null;
      if (!puff || !jet) {
        this.which[i] = -1;
        positions.setXYZ(i, 0, 0, 0);
        colours.setXYZ(i, 0, 0, 0);
        continue;
      }
      alive += 1;
      const spread = (age / PUFF_LIFE) * 0.5;
      positions.setXYZ(i, puff.at[0] + (i % 3 - 1) * spread, puff.at[1], puff.at[2] + ((i % 5) - 2) * spread * 0.4);
      const orange = jet.fuel === "hypergolic";
      colours.setXYZ(i, (orange ? 1 : 0.92) * puff.alpha, (orange ? 0.62 : 0.95) * puff.alpha, (orange ? 0.28 : 1) * puff.alpha);
    }
    positions.needsUpdate = true;
    colours.needsUpdate = true;
    this.puffCountNow = alive;
    if (this.points) this.points.visible = alive > 0;
    if (this.reduced || this.mode !== "station-keeping" || !awake) return alive > 0 ? { x: 0, y: 0, z: 0 } : null;
    const t = this.clock;
    return { x: Math.sin(t * 0.2) * DRIFT, y: 0, z: Math.sin(t * 0.13) * DRIFT * 0.6 };
  }

  /** A turn: the two jets at opposite corners. */
  turn(): void {
    if (this.reduced) return;
    const pair = turnPair(this.live.map((one) => ({ slot: "", at: [one.at.x, one.at.y, one.at.z] as const, dir: [one.dir.x, one.dir.y, one.dir.z] as const, fuel: one.fuel, bell: one.bell })));
    if (!pair) return;
    for (const one of pair) {
      const index = this.live.findIndex((jet) => jet.at.x === one.at[0] && jet.at.y === one.at[1] && jet.dir.x === one.dir[0]);
      if (index >= 0) this.light(index);
    }
  }

  /** The craft starts moving along `move`: the jets that push that way. */
  burst(move: Vector3): void {
    this.along(move, 1);
  }

  /** The craft stops: the jets that push back against `move`. */
  brake(move: Vector3): void {
    this.along(move, -1);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mesh?.geometry.dispose();
    (this.mesh?.material as MeshStandardMaterial | undefined)?.dispose();
    this.points?.geometry.dispose();
    (this.points?.material as PointsMaterial | undefined)?.dispose();
    this.disc.dispose();
    this.mesh = null;
    this.points = null;
  }

  private along(move: Vector3, sign: 1 | -1): void {
    if (this.reduced || move.lengthSq() < 1e-8) return;
    const want = move.clone().normalize().multiplyScalar(sign);
    let best = -1;
    let score = 0.2;
    this.live.forEach((jet, index) => {
      const push = jet.dir.clone().negate().dot(want);
      if (push > score) {
        score = push;
        best = index;
      }
    });
    if (best >= 0) this.light(best);
    // a pair on that side, when a second jet agrees
    let second = -1;
    score = 0.2;
    this.live.forEach((jet, index) => {
      if (index === best) return;
      const push = jet.dir.clone().negate().dot(want);
      if (push > score) {
        score = push;
        second = index;
      }
    });
    if (second >= 0) this.light(second);
  }

  private light(index: number): void {
    this.emit(index);
  }

  private emit(index: number): void {
    for (let n = 0; n < 2; n++) {
      const slot = this.which.indexOf(-1);
      if (slot < 0) return;
      this.which[slot] = index;
      this.ages[slot] = n * 0.05;
    }
  }

  private softDisc(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const pen = canvas.getContext("2d");
    if (pen) {
      const glow = pen.createRadialGradient(16, 16, 1, 16, 16, 16);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.4, "rgba(255,255,255,0.45)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      pen.fillStyle = glow;
      pen.fillRect(0, 0, 32, 32);
    }
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
