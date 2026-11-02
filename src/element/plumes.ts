// Flames for the 3D view, made here and loaded only with it. One shape, one material and one instanced draw for every engine of a part, however many burn, so lighting and dousing engines changes numbers, never what the graphics card holds. The look of a flame (its shock diamonds, its length, its glow) is a picture, not a measurement.
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Matrix4, PointLight, Quaternion, ShaderMaterial, Vector3 } from "three";
import { type Bell, PLUME_DIAMONDS, plumeLength } from "../engines.ts";

const STEPS = 28;
const AROUND = 12;
const DIAMONDS = PLUME_DIAMONDS.toFixed(1);

const FLAME_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uMoving;
uniform float uAir;
varying float vT;
varying float vFace;
void main() {
  float t = -position.y;
  float seed = float(gl_InstanceID) * 1.7;
  float jitter = uMoving * 0.035 * sin(uTime * 31.0 + seed) + uMoving * 0.02 * sin(uTime * 53.0 + seed * 2.3);
  vec3 p = position;
  // near the ground the flame is held in and pinched at its diamonds; high up it fans out and the diamonds go
  float pinch = 1.0 - 0.16 * pow(0.5 + 0.5 * cos(t * 6.2832 * ${DIAMONDS}), 2.0);
  p.xz *= mix(pinch, 1.0 + 2.6 * t, uAir);
  p.y *= 1.0 + jitter;
  vec4 view = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vFace = abs(dot(n, normalize(-view.xyz)));
  vT = t;
  gl_Position = projectionMatrix * view;
}`;

const FLAME_FRAGMENT = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
uniform float uAir;
uniform float uLine;
varying float vT;
varying float vFace;
void main() {
  float fade = 1.0 - smoothstep(0.5, 1.0, vT);
  float bands = pow(0.5 + 0.5 * cos(vT * 6.2832 * ${DIAMONDS}), 6.0) * (1.0 - vT) * (1.0 - uAir);
  float core = pow(vFace, 1.6);
  vec3 filled = mix(uCool, uHot, core * (1.0 - vT * 0.7)) + vec3(1.0, 0.95, 0.85) * bands * 1.1;
  float full = (0.22 + 0.78 * core) * fade * (0.9 + bands * 0.6) * mix(1.0, 0.45, uAir);
  // the line looks: an outline and the diamonds, nothing filled
  float rim = 1.0 - smoothstep(0.06, 0.3, vFace);
  float drawn = max(rim, bands * 1.4) * fade;
  gl_FragColor = vec4(mix(filled, vec3(0.91, 0.62, 0.26), uLine), mix(full, drawn, uLine));
}`;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vCorner;
void main() {
  vCorner = position.xy;
  vec4 middle = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
  middle.xy += position.xy * instanceMatrix[0][0];
  gl_Position = projectionMatrix * middle;
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform float uLine;
uniform vec3 uHot;
varying vec2 vCorner;
void main() {
  float d = length(vCorner);
  float soft = smoothstep(1.0, 0.1, d) * 0.75;
  float ring = smoothstep(0.62, 0.7, d) * (1.0 - smoothstep(0.7, 0.78, d)) * 0.9;
  gl_FragColor = vec4(mix(uHot, vec3(0.91, 0.62, 0.26), uLine), mix(soft, ring, uLine));
}`;

/** A flame of one exit radius and one length, tip down from its mouth, with its radius drawing in as it goes. */
function flameShape(): BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  for (let step = 0; step <= STEPS; step++) {
    const t = step / STEPS;
    const radius = Math.pow(1 - t, 0.72);
    for (let i = 0; i < AROUND; i++) {
      const a = (i / AROUND) * Math.PI * 2;
      position.push(Math.sin(a) * radius, -t, Math.cos(a) * radius);
      normal.push(Math.sin(a), 0.2, Math.cos(a));
    }
  }
  for (let step = 0; step < STEPS; step++)
    for (let i = 0; i < AROUND; i++) {
      const a = step * AROUND + i;
      const b = step * AROUND + ((i + 1) % AROUND);
      index.push(a, a + AROUND, b, b, a + AROUND, b + AROUND);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normal, 3));
  geometry.setIndex(index);
  return geometry;
}

function glowShape(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

/** What burns in each engine's flame, as a picture: a fuel's flame is drawn in its own colours. */
export type Fuel = "methane" | "kerosene";
const FUEL_COLOURS: Readonly<Record<Fuel, { hot: string; cool: string }>> = {
  methane: { hot: "#fff1e6", cool: "#6f7dff" },
  kerosene: { hot: "#fff4d2", cool: "#ff7a1a" },
};

const place = new Matrix4();
const still = new Quaternion();
const at = new Vector3();
const size = new Vector3();

/** One part's flames: at most as many as it has bells. Its buffers are made once and written when the engines that burn change. */
export class PartPlumes {
  readonly group = new Group();
  readonly bells: readonly Bell[];
  private flames: InstancedMesh;
  private glows: InstancedMesh;
  private key = "";

  constructor(kit: PlumeKit, bells: readonly Bell[]) {
    this.bells = bells;
    this.group.name = "plumes";
    this.flames = new InstancedMesh(kit.shape, kit.flame, bells.length);
    this.glows = new InstancedMesh(kit.quad, kit.glow, bells.length);
    for (const mesh of [this.flames, this.glows]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      mesh.count = 0;
    }
    this.group.add(this.flames, this.glows);
  }

  /** The bells that burn now. Nothing is written when they are the ones that burned last. */
  light(burning: readonly Bell[]): void {
    const key = burning.map((bell) => `${bell.x},${bell.z}`).join("|");
    if (key === this.key) return;
    this.key = key;
    burning.forEach((bell, i) => {
      this.flames.setMatrixAt(i, place.compose(at.set(bell.x, bell.y, bell.z), still, size.set(bell.exit, plumeLength(bell.exit), bell.exit)));
      this.glows.setMatrixAt(i, place.compose(at.set(bell.x, bell.y, bell.z), still, size.setScalar(bell.exit * 2.6)));
    });
    this.flames.count = burning.length;
    this.glows.count = burning.length;
    this.flames.instanceMatrix.needsUpdate = true;
    this.glows.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.flames.dispose();
    this.glows.dispose();
  }
}

/** One set of everything a flame needs, for one viewer. */
export class PlumeKit {
  readonly shape = flameShape();
  readonly quad = glowShape();
  readonly flame: ShaderMaterial;
  readonly glow: ShaderMaterial;
  /** The hull's own glow in the painted look. Always in the scene, at no strength when no engine burns, so lighting engines never makes the materials build again. */
  readonly light = new PointLight("#ffb56b", 0, 0, 1.6);
  private uniforms = {
    uTime: { value: 0 },
    uMoving: { value: 0 },
    uAir: { value: 0 },
    uLine: { value: 1 },
    uHot: { value: new Color(FUEL_COLOURS.kerosene.hot) },
    uCool: { value: new Color(FUEL_COLOURS.kerosene.cool) },
  };

  constructor() {
    const common = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    this.flame = new ShaderMaterial({ ...common, vertexShader: FLAME_VERTEX, fragmentShader: FLAME_FRAGMENT, uniforms: this.uniforms, side: DoubleSide });
    this.glow = new ShaderMaterial({ ...common, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: this.uniforms });
  }

  setLook(painted: boolean): void {
    this.uniforms.uLine.value = painted ? 0 : 1;
  }

  setFuel(fuel: Fuel): void {
    this.uniforms.uHot.value.set(FUEL_COLOURS[fuel].hot);
    this.uniforms.uCool.value.set(FUEL_COLOURS[fuel].cool);
  }

  /** 0 near the ground, 1 high up where a flame fans out. */
  setAir(air: number): void {
    this.uniforms.uAir.value = air;
  }

  /** The flame's clock, in seconds, or `null` to hold it still. */
  setTime(seconds: number | null): void {
    this.uniforms.uMoving.value = seconds === null ? 0 : 1;
    if (seconds !== null) this.uniforms.uTime.value = seconds;
  }

  dispose(): void {
    this.shape.dispose();
    this.quad.dispose();
    this.flame.dispose();
    this.glow.dispose();
    this.light.dispose();
    this.light.removeFromParent();
  }
}
