// One instanced draw for every nozzle, and one pool of plume cones. Idle jets add nothing per frame.
import { AddEquation, BufferGeometry, Color, ConeGeometry, CustomBlending, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshStandardMaterial, OneFactor, PointLight, Quaternion, ShaderMaterial, Vector3 } from "three";
import { KEEP_GAP, PUFF_LIFE, turnPair, type Jet, type ThrusterMode } from "../thrusters.ts";

const POOL = 64;
const DRIFT = 0.4;
/** How many nozzle lengths the cone reaches, and the soft edge of it. */
const NOZZLE_LENGTHS = 8;
const SPREAD = (20 * Math.PI) / 180;
const CORE = (7 * Math.PI) / 180;

interface Live {
  at: Vector3;
  dir: Vector3;
  fuel: Jet["fuel"];
  bell: number;
}

const PLUME_VERT = /* glsl */ `
varying vec3 vTint;
varying vec3 vLocal;
void main() {
  vTint = instanceColor;
  vLocal = position;
  vec3 origin = (instanceMatrix * vec4(0.0, position.y, 0.0, 1.0)).xyz;
  vec3 view = normalize(cameraPosition - origin);
  vec3 side = cross(view, vec3(0.0, 1.0, 0.0));
  if (length(side) < 0.001) side = cross(view, vec3(1.0, 0.0, 0.0));
  side = normalize(side);
  vec3 lift = normalize(cross(side, view));
  float scale = length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 placed = origin + (side * position.x + lift * position.z) * scale;
  gl_Position = projectionMatrix * viewMatrix * vec4(placed, 1.0);
}
`;

const PLUME_FRAG = /* glsl */ `
uniform float spread;
varying vec3 vTint;
varying vec3 vLocal;
void main() {
  float along = clamp(vLocal.y, 0.0, 1.0);
  float radius = max(spread * max(along, 0.08), 0.02);
  float radial = length(vLocal.xz) / radius;
  float body = exp(-radial * radial * 2.8) * exp(-along * 1.7);
  if (body < 0.012) discard;
  body *= 0.28;
  gl_FragColor = vec4(vTint * body, body);
}
`;

/** A stack of discs along the jet. Each one faces the camera, and the brightness dies inside the disc, so the mesh edge is never drawn. */
function plumeGeometry(radians: number): BufferGeometry {
  const slices = 48;
  const segments = 32;
  const width = Math.tan(radians) * 3.2;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let s = 0; s < slices; s++) {
    const y = (s + 1) / slices;
    const radius = Math.max(width * y, width * 0.14);
    const base = s * (segments + 1);
    positions.push(0, y, 0);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
    for (let i = 0; i < segments; i++) indices.push(base, base + 1 + i, base + 1 + ((i + 1) % segments));
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

function plumeMaterial(radians: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { spread: { value: Math.tan(radians) } },
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    side: DoubleSide,
    toneMapped: false,
  });
}

/** Nozzles and their plumes for one rocket. The nozzles are already in the rocket's space. */
export class ThrusterLayer {
  private readonly group = new Group();
  private readonly live: Live[] = [];
  private mesh: InstancedMesh | null = null;
  private outer: InstancedMesh | null = null;
  private core: InstancedMesh | null = null;
  private readonly ages = new Float32Array(POOL);
  private readonly which = new Int16Array(POOL);
  private mode: Exclude<ThrusterMode, "off"> = "show";
  private reduced = false;
  private clock = 0;
  private nextPulse = 0.4;
  private puffCountNow = 0;
  private readonly aim = new Quaternion();
  private readonly basis = new Matrix4();
  private readonly colour = new Color();
  private readonly up = new Vector3(0, 1, 0);
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private readonly lamps: PointLight[] = [];

  constructor(parent: Group, jets: readonly Jet[], mode: Exclude<ThrusterMode, "off">, reduced: boolean) {
    this.mode = mode;
    this.reduced = reduced;
    this.which.fill(-1);
    for (const one of jets) this.live.push({ at: new Vector3(...one.at), dir: new Vector3(...one.dir).normalize(), fuel: one.fuel, bell: one.bell });
    const cone = new ConeGeometry(0.45, 1, 32, 1, true);
    const metal = new MeshStandardMaterial({ color: "#9aa3ab", metalness: 0.65, roughness: 0.4 });
    this.mesh = new InstancedMesh(cone, metal, Math.max(1, this.live.length));
    this.mesh.count = this.live.length;
    this.mesh.frustumCulled = false;
    const place = new Vector3();
    for (let i = 0; i < this.live.length; i++) {
      const jet = this.live[i];
      if (!jet) continue;
      this.aim.setFromUnitVectors(this.up, jet.dir.clone().negate());
      place.copy(jet.at).addScaledVector(jet.dir, -jet.bell / 2);
      this.basis.compose(place, this.aim, new Vector3(jet.bell, jet.bell, jet.bell));
      this.mesh.setMatrixAt(i, this.basis);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.mesh);
    this.outer = this.pool(plumeGeometry(SPREAD), plumeMaterial(SPREAD));
    this.core = this.pool(plumeGeometry(CORE), plumeMaterial(CORE));
    for (let i = 0; i < 6; i++) {
      const lamp = new PointLight("#ffffff", 0, 8, 2);
      lamp.visible = false;
      this.lamps.push(lamp);
      this.group.add(lamp);
    }
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
    if (!this.outer || !this.core) return null;
    let alive = 0;
    let lit = 0;
    for (const lamp of this.lamps) lamp.visible = false;
    for (let i = 0; i < POOL; i++) {
      const index = this.which[i] ?? -1;
      const jet = index >= 0 ? this.live[index] : undefined;
      const age = (this.ages[i] ?? 0) + dt;
      this.ages[i] = age;
      if (!jet || age < 0 || age >= PUFF_LIFE) {
        this.which[i] = -1;
        this.outer.setMatrixAt(i, this.hidden);
        this.core.setMatrixAt(i, this.hidden);
        this.colour.setRGB(0, 0, 0);
        this.outer.setColorAt(i, this.colour);
        this.core.setColorAt(i, this.colour);
        continue;
      }
      alive += 1;
      const fade = 1 - age / PUFF_LIFE;
      const flicker = age < 0.16 ? 0.78 + 0.22 * Math.sin(age * 80 + i * 1.7) : 1;
      const alpha = fade * fade * flicker;
      const reach = Math.max(6, jet.bell * NOZZLE_LENGTHS);
      this.aim.setFromUnitVectors(this.up, jet.dir);
      this.basis.compose(jet.at, this.aim, new Vector3(reach, reach, reach));
      this.outer.setMatrixAt(i, this.basis);
      this.basis.compose(jet.at, this.aim, new Vector3(reach * 0.42, reach * 0.42, reach * 0.42));
      this.core.setMatrixAt(i, this.basis);
      const hot = jet.fuel === "hypergolic";
      this.colour.setRGB((hot ? 1 : 0.94) * alpha, (hot ? 0.72 : 0.97) * alpha, (hot ? 0.42 : 1) * alpha);
      this.outer.setColorAt(i, this.colour);
      this.colour.setRGB(alpha, (hot ? 0.94 : 1) * alpha, (hot ? 0.82 : 1) * alpha);
      this.core.setColorAt(i, this.colour);
      const lamp = this.lamps[lit];
      if (lamp && alpha > 0.2) {
        lit += 1;
        lamp.visible = true;
        lamp.position.copy(jet.at);
        lamp.color.set(hot ? "#ffb060" : "#f4f7ff");
        lamp.intensity = alpha * 14;
        lamp.distance = Math.max(8, reach);
      }
    }
    this.outer.instanceMatrix.needsUpdate = true;
    this.core.instanceMatrix.needsUpdate = true;
    if (this.outer.instanceColor) this.outer.instanceColor.needsUpdate = true;
    if (this.core.instanceColor) this.core.instanceColor.needsUpdate = true;
    this.puffCountNow = alive;
    this.outer.visible = alive > 0;
    this.core.visible = alive > 0;
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

  /** Four nozzles that share one block, so a close view can show the whole quad. */
  lightBlock(): void {
    if (this.reduced) return;
    const groups = new Map<string, number[]>();
    this.live.forEach((jet, index) => {
      const key = `${Math.round(jet.at.x)}:${Math.round(jet.at.y)}:${Math.round(jet.at.z)}`;
      const list = groups.get(key) ?? [];
      list.push(index);
      groups.set(key, list);
    });
    let chosen: number[] = [];
    for (const list of groups.values()) if (list.length > chosen.length) chosen = list;
    for (const index of chosen.slice(0, 4)) this.light(index);
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
    this.outer?.geometry.dispose();
    (this.outer?.material as ShaderMaterial | undefined)?.dispose();
    this.core?.geometry.dispose();
    (this.core?.material as ShaderMaterial | undefined)?.dispose();
    for (const lamp of this.lamps) lamp.dispose();
    this.mesh = null;
    this.outer = null;
    this.core = null;
  }

  private pool(geo: BufferGeometry, material: ShaderMaterial): InstancedMesh {
    const mesh = new InstancedMesh(geo, material, POOL);
    mesh.count = POOL;
    mesh.frustumCulled = false;
    mesh.visible = false;
    for (let i = 0; i < POOL; i++) {
      mesh.setMatrixAt(i, this.hidden);
      mesh.setColorAt(i, new Color(0, 0, 0));
    }
    this.group.add(mesh);
    return mesh;
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
    const slot = this.which.indexOf(-1);
    if (slot < 0) return;
    this.which[slot] = index;
    this.ages[slot] = 0;
  }
}
