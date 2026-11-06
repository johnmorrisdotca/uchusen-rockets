// The page the fleet renders are taken in: the real model (the registry's parts, meshed by the package's own mesher) lit by a key light with shadows, with a procedural wear in the paint. Bundled and run by
// scripts/fleet-render.ts in one headless browser. Ship space: x to starboard, y to the bow, z up (dorsal).
import {
  ACESFilmicToneMapping,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  BoxGeometry,
  MeshBasicMaterial,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Plane,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MATERIALS, type MaterialName } from "../src/model/materials.ts";
import { meshOf } from "../src/model/pieces.ts";
import { partEntry } from "../src/model/registry.ts";
import { dockedNow } from "../src/model/fleet/dockedState.ts";
import { SHIP_02_SLOTS } from "../src/model/fleet/ship-02/index.ts";

export interface Spec {
  w: number;
  h: number;
  /** "ortho" with `half` the half height in metres, or "persp" with `fov` and `dist`. */
  camera: "ortho" | "persp";
  /** What the camera looks at, in ship space. */
  target: [number, number, number];
  /** Unit direction from the target to the camera, in ship space. */
  from: [number, number, number];
  up: [number, number, number];
  half?: number;
  fov?: number;
  dist?: number;
  /** Slots to draw; left out: every one but the inside ones. */
  slots?: string[];
  /** Cut the ship at x = cut (or at the module's own plane in `cuts`) and show the inside parts too. */
  cut?: number;
  cuts?: Record<string, number>;
  /** Pull the modules apart along y: extra metres between each module, in order. */
  explode?: number;
  /** Extra registry parts to stand in the scene: their id and where. */
  extra?: { id: string; at: [number, number, number] }[];
  /** Wire boxes standing for ships not modelled here (size and centre, ship space). */
  ghosts?: { size: [number, number, number]; at: [number, number, number]; color: string }[];
  /** Points to project to pixels, in ship space. */
  marks?: { id: string; at: [number, number, number]; slot?: string }[];
  /** Drawn beside it: Starship Block 3, standing, at this ship-space position. */
  starship?: [number, number, number];
  /** A `docked` choice, so the dock arms draw the craft named in it. */
  docked?: string;
  /** Shadow box half-size in metres. */
  shadow: number;
  /** The light's direction from the target. */
  light?: [number, number, number];
  background?: string;
  exposure?: number;
}

const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputColorSpace = SRGBColorSpace;
renderer.localClippingEnabled = true;
document.body.style.margin = "0";
document.body.append(renderer.domElement);

const pmrem = new PMREMGenerator(renderer);
const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const NOISE = /* glsl */ `
varying vec3 vWPos;
float h31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i=0;i<4;i++){ s += a*vn(p); p *= 2.07; a *= 0.5; } return s; }
`;

const planes = new Map<number, Plane>();
const planeAt = (x: number): Plane => {
  let p = planes.get(x);
  if (!p) {
    p = new Plane(new Vector3(-1, 0, 0), x);
    planes.set(x, p);
  }
  return p;
};
const materialCache = new Map<string, MeshStandardMaterial>();
function materialOf(name: MaterialName, clip: Plane[]): MeshStandardMaterial {
  const key = name + (clip.length ? `/cut${clip[0].constant}` : "");
  const known = materialCache.get(key);
  if (known) return known;
  const spec = MATERIALS[name];
  const m = new MeshStandardMaterial({ color: new Color(spec.color), metalness: spec.metal, roughness: spec.rough, side: DoubleSide, envMapIntensity: 0.7, clippingPlanes: clip });
  // wear: soot and grime streaks, lighter where the paint has been scuffed, and a rougher finish where it is dirty, from noise on the world position. Metal and paint get different amounts.
  const wear = name.startsWith("hull-") || name === "blanket" || name === "steel" || name === "dark" || name === "panel-dark" ? 1 : 0.35;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.wear = { value: wear };
    shader.vertexShader = "varying vec3 vWPos;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = NOISE + "uniform float wear;\n" + shader.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>
        float g1 = fbm3(vWPos * 0.03);
        float g2 = fbm3(vWPos * vec3(0.5, 0.04, 0.5) + 7.0);
        float dirt = smoothstep(0.35, 0.85, g1) * 0.45 + smoothstep(0.5, 0.95, g2) * 0.35;
        float scuff = 0.0;
        diffuseColor.rgb *= 1.0 - dirt * 0.38 * wear;
        `)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + dirt * 0.25 * wear, 0.05, 1.0);`);
  };
  materialCache.set(key, m);
  return m;
}

function groupOf(pieces: ReturnType<typeof meshOf>, clip: Plane[]): Group {
  const g = new Group();
  for (const [name, b] of pieces.faces) {
    if (b.positions.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(b.positions), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(b.normals), 3));
    geometry.setIndex(new BufferAttribute(b.positions.length / 3 > 65535 ? new Uint32Array(b.indices) : new Uint16Array(b.indices), 1));
    const mesh = new Mesh(geometry, materialOf(name, clip));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

const cache = new Map<string, Group>();
let starshipStack: Group | null = null;
const shipCounts = { pieces: 0, triangles: 0 };

export function shoot(spec: Spec): { dataUrl: string; pxPerMetre: number; triangles: number; marks: { id: string; x: number; y: number }[] } {
  renderer.setPixelRatio(1);
  renderer.setSize(spec.w, spec.h, false);
  renderer.toneMappingExposure = spec.exposure ?? 1.05;
  const scene = new Scene();
  scene.background = new Color(spec.background ?? "#0b111b");
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  const cutOf = (slot: string): Plane[] => {
    if (spec.cut === undefined) return [];
    const own = Object.entries(spec.cuts ?? {}).find(([prefix]) => slot.startsWith(prefix));
    return [planeAt(own ? own[1] : spec.cut)];
  };
  let triangles = 0;
  const root = new Group();
  // exploded: modules ordered by their base along y, each pushed on by the gap times its rank; the spine stays and the wings and the pod slide sideways or up
  const order = [...SHIP_02_SLOTS].filter((o) => !o.inside || spec.cut !== undefined).sort((a, b) => a.at[1] - b.at[1]);
  const ys = [...new Set(order.map((o) => o.at[1]))];
  const shift = (slot: string, y: number): number => {
    if (!spec.explode || slot === "spine") return 0;
    void slot;
    return ys.indexOf(y) * spec.explode;
  };
  const wanted = new Set(spec.slots ?? SHIP_02_SLOTS.filter((s) => (spec.cut === undefined ? !s.inside : true)).map((s) => s.slot));
  for (const s of SHIP_02_SLOTS) {
    if (!wanted.has(s.slot)) continue;
    const clip = cutOf(s.slot);
    const dockedKey = s.slot === "dock" && spec.docked ? spec.docked : "";
    const key = s.slot + (clip.length ? `/cut${clip[0].constant}` : "") + (dockedKey ? `/${dockedKey}` : "");
    let g = cache.get(key);
    if (!g) {
      const held = dockedNow.spec;
      if (dockedKey) dockedNow.spec = dockedKey;
      const pieces = s.pieces();
      dockedNow.spec = held;
      const mesh = meshOf(pieces);
      g = groupOf(mesh, clip);
      cache.set(key, g);
      for (const b of mesh.faces.values()) shipCounts.triangles += b.indices.length / 3;
    }
    // the cached groups hold materials of an earlier call: the cut is the same for every call that shares a key, so they are reusable
    const placed = g.clone();
    placed.position.set(s.at[0], s.at[1] + shift(s.slot, s.at[1]), s.at[2]);
    root.add(placed);
  }
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) triangles += (m.geometry.index?.count ?? 0) / 3;
  });
  for (const e of spec.extra ?? []) {
    const entry = partEntry(e.id);
    if (!entry) continue;
    const key = `extra/${e.id}`;
    let g = cache.get(key);
    if (!g) {
      g = groupOf(meshOf(entry.pieces()), []);
      cache.set(key, g);
    }
    const placed = g.clone();
    placed.position.set(...e.at);
    root.add(placed);
  }
  scene.add(root);
  if (spec.explode) {
    // the mounting axis and a marker at the start of every module
    const axis = new Mesh(new BoxGeometry(1.6, 3000 + order.length * spec.explode, 1.6), new MeshBasicMaterial({ color: "#f2c14e" }));
    axis.position.set(0, (3000 + order.length * spec.explode) / 2 - 100, 0);
    scene.add(axis);
    for (const o of order) {
      const m = new Mesh(new BoxGeometry(14, 3, 14), new MeshBasicMaterial({ color: "#f2c14e" }));
      m.position.set(o.at[0], o.at[1] + shift(o.slot, o.at[1]), o.at[2]);
      scene.add(m);
    }
  }
  for (const g of spec.ghosts ?? []) {
    const lines = new LineSegments(new EdgesGeometry(new BoxGeometry(...g.size)), new LineBasicMaterial({ color: g.color }));
    lines.position.set(...g.at);
    scene.add(lines);
  }
  if (spec.starship) {
    const stack = starshipStack ?? new Group();
    let y = 0;
    if (!starshipStack) for (const id of ["starship-v3-booster", "starship-v3-ship"]) {
      const entry = partEntry(id);
      if (!entry) continue;
      const mesh = meshOf(entry.pieces());
      const g = groupOf(mesh, []);
      g.position.y = y;
      stack.add(g);
      y += entry.record.height;
    }
    // Starship stands along its own y; the ship's dorsal direction is z, so it is turned a quarter turn about x
    if (!starshipStack) stack.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
    starshipStack = stack;
    stack.position.set(...spec.starship);
    scene.add(stack);
  }
  // light: a key with shadows, a cool rim and a low sky
  const t = new Vector3(...spec.target);
  const dir = new Vector3(...(spec.light ?? [0.55, 0.3, 0.85])).normalize();
  const key = new DirectionalLight("#fff3e0", 3.2);
  key.position.copy(t).addScaledVector(dir, spec.shadow * 3);
  key.target.position.copy(t);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const c = key.shadow.camera;
  c.left = -spec.shadow;
  c.right = spec.shadow;
  c.top = spec.shadow;
  c.bottom = -spec.shadow;
  c.near = spec.shadow * 0.2;
  c.far = spec.shadow * 7;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = (spec.shadow * 2) / 4096;
  const rim = new DirectionalLight("#9ec2ff", 0.9);
  rim.position.copy(t).addScaledVector(new Vector3(-0.6, -0.4, 0.5), spec.shadow * 3);
  scene.add(key, key.target, rim, new HemisphereLight("#bcd4ff", "#2a2420", 0.35), new AmbientLight("#ffffff", 0.08));
  const up = new Vector3(...spec.up);
  const from = new Vector3(...spec.from).normalize();
  let pxPerMetre = 0;
  let camera: OrthographicCamera | PerspectiveCamera;
  if (spec.camera === "ortho") {
    const half = spec.half ?? 100;
    const aspect = spec.w / spec.h;
    camera = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 1, 20000);
    camera.position.copy(t).addScaledVector(from, 6000);
    pxPerMetre = spec.h / (2 * half);
  } else {
    camera = new PerspectiveCamera(spec.fov ?? 30, spec.w / spec.h, Math.max(0.05, (spec.dist ?? 500) / 600), (spec.dist ?? 500) * 20);
    camera.position.copy(t).addScaledVector(from, spec.dist ?? 500);
  }
  camera.up.copy(up);
  camera.lookAt(t);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const marks = (spec.marks ?? []).map((m) => {
    const v = new Vector3(...m.at);
    if (spec.explode) {
      const slot = SHIP_02_SLOTS.find((o) => o.slot === (m as { slot?: string }).slot);
      if (slot) v.y += shift(slot.slot, slot.at[1]);
    }
    v.project(camera);
    return { id: m.id, x: ((v.x + 1) / 2) * spec.w, y: ((1 - v.y) / 2) * spec.h };
  });
  return { dataUrl: renderer.domElement.toDataURL("image/png"), pxPerMetre, triangles, marks };
}

export const counts = () => ({ ...shipCounts, slots: SHIP_02_SLOTS.length });
(window as unknown as { shoot: typeof shoot; counts: typeof counts }).shoot = shoot;
(window as unknown as { shoot: typeof shoot; counts: typeof counts }).counts = counts;
(window as unknown as { ready: boolean }).ready = true;
