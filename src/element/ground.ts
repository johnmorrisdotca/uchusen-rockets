// The ground under a flight, for the 3D view: a plain pad, and smoke and water standing on it, all a picture. One instanced draw of soft puffs, moved by numbers on the graphics card, so a flight makes it once and it costs nothing when it is out of the picture. No pad, tower or drone ship of any real place: those are to come.
import { BufferGeometry, CircleGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector3 } from "three";

const PUFFS = 44;
const WATER = 14;

const PUFF_VERTEX = /* glsl */ `
uniform float uSmoke;
uniform float uTime;
varying vec2 vCorner;
varying float vWater;
void main() {
  vCorner = position.xy;
  float id = float(gl_InstanceID);
  vWater = step(${(PUFFS - WATER).toFixed(1)}, id);
  float roll = fract(sin(id * 12.9898) * 43758.5453);
  // each puff rolls outwards from the pad as the smoke grows; water stays low and close
  float grow = mix(0.45 + 0.75 * uSmoke, 0.35 + 0.25 * uSmoke, vWater);
  vec3 base = instanceMatrix[3].xyz;
  vec3 where = vec3(base.x * grow, base.y * uSmoke + sin(uTime * 0.7 + roll * 6.28) * 0.04, base.z * grow);
  vec4 middle = modelViewMatrix * vec4(where, 1.0);
  middle.xy += position.xy * instanceMatrix[0][0] * (0.5 + uSmoke);
  gl_Position = projectionMatrix * middle;
}`;

const PUFF_FRAGMENT = /* glsl */ `
uniform float uSmoke;
varying vec2 vCorner;
varying float vWater;
void main() {
  float d = length(vCorner);
  float alpha = smoothstep(1.0, 0.25, d) * mix(0.2, 0.3, vWater) * smoothstep(0.0, 0.25, uSmoke);
  gl_FragColor = vec4(mix(vec3(0.78, 0.8, 0.83), vec3(0.82, 0.92, 1.0), vWater), alpha);
}`;

const scaleOf = new Vector3();
const atOf = new Vector3();
const none = new Quaternion();
const matrix = new Matrix4();

export class GroundKit {
  readonly group = new Group();
  private pad: Mesh;
  private puffs: InstancedMesh;
  private puffShape: BufferGeometry;
  private puffMaterial: ShaderMaterial;
  private padMaterial = new MeshBasicMaterial({ color: "#39424f", transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false });

  constructor() {
    this.group.name = "ground";
    this.pad = new Mesh(new CircleGeometry(1, 48), this.padMaterial);
    this.pad.rotation.x = -Math.PI / 2;
    this.puffShape = new BufferGeometry();
    this.puffShape.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    this.puffShape.setIndex([0, 1, 2, 0, 2, 3]);
    this.puffMaterial = new ShaderMaterial({ vertexShader: PUFF_VERTEX, fragmentShader: PUFF_FRAGMENT, uniforms: { uSmoke: { value: 0 }, uTime: { value: 0 } }, transparent: true, depthWrite: false });
    this.puffs = new InstancedMesh(this.puffShape, this.puffMaterial, PUFFS);
    this.puffs.frustumCulled = false;
    this.puffs.renderOrder = 2;
    this.puffs.instanceMatrix.setUsage(DynamicDrawUsage);
    // the same puffs every time: a fixed scatter, no clock and no random number
    for (let i = 0; i < PUFFS; i++) {
      const water = i >= PUFFS - WATER;
      const a = i * 2.399963;
      const r = water ? 0.55 + 0.1 * (i % 3) : 0.35 + ((i * 37) % 11) * 0.11;
      const y = water ? 0.06 : 0.05 + ((i * 17) % 7) * 0.05;
      const size = water ? 0.16 : 0.3 + ((i * 13) % 5) * 0.06;
      this.puffs.setMatrixAt(i, matrix.compose(atOf.set(Math.cos(a) * r, y, Math.sin(a) * r), none, scaleOf.setScalar(size)));
    }
    this.group.add(this.pad, this.puffs);
    this.group.visible = false;
  }

  /** How wide the smoke stands, and how far the plain ground reaches to hold everything that lands on it, in metres. */
  fit(radius: number, reach: number): void {
    this.group.scale.setScalar(radius);
    this.pad.scale.setScalar(Math.max(1, reach / radius));
    // a puff stays round to the camera, so its size is not in the group's scale
    for (let i = 0; i < PUFFS; i++) {
      this.puffs.getMatrixAt(i, matrix);
      const size = i >= PUFFS - WATER ? 0.16 : 0.3 + ((i * 13) % 5) * 0.06;
      matrix.elements[0] = size * radius;
      this.puffs.setMatrixAt(i, matrix);
    }
    this.puffs.instanceMatrix.needsUpdate = true;
  }

  /** Where the ground stands, and how much smoke is on it. `seconds` is the smoke's own clock, when it may move. */
  set(y: number, smoke: number, seconds: number): void {
    this.group.position.y = y;
    this.puffMaterial.uniforms.uSmoke.value = smoke;
    this.puffMaterial.uniforms.uTime.value = seconds;
    this.puffs.visible = smoke > 0.001;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.pad.geometry.dispose();
    this.padMaterial.dispose();
    this.puffs.dispose();
    this.puffShape.dispose();
    this.puffMaterial.dispose();
  }
}
