// The 3D view (three.js, MIT), loaded only when the element comes on screen. One canvas with one rocket, drawn three ways: the line drawing, the thick lines, and painted with true materials. Switching look
// changes materials and never the camera, so the angle stays. Moving between together, apart and one part alone is an animated move of each part, and under reduced motion it is a cut. It draws only while
// something moves, never while out of view or the tab is hidden, and settles after a while with no one touching it.
import {
  ACESFilmicToneMapping,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  LineSegments,
  LinearMipmapLinearFilter,
  MathUtils,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PCFSoftShadowMap,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Spherical,
  SRGBColorSpace,
  type Texture,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Built } from "../build/index.ts";
import { bellsOf, FLAME_GAP_MS, FLAME_SETTLE_MS, pickBells } from "../engines.ts";
import { type Angle, directionOf, FOV_DEG, frameFor, PICTURE_H, turnedBy, type Vec3, type ViewChoice } from "../framing.ts";
import { LOOKS, type LookName } from "../looks.ts";
import { pixelRatioFor } from "../pixels.ts";
import { MATERIALS, type MaterialName, type MaterialSpec } from "../model/materials.ts";
import { paintGlow, paintSky, paintSteel, paintTiles } from "./paint.ts";
import { type FlightClock, type FlightFrame, flightBounds, frameAt } from "../flight.ts";
import type { Spin } from "../spin.ts";
import { besideLabel } from "../beside.ts";
import { fliesInSpace } from "../rockets.ts";
import { GroundKit } from "./ground.ts";
import { placeNameLabels } from "./namePlace.ts";
import { plinthGroup, type Footprint } from "./plinth.ts";
import { PartPlumes, PlumeKit } from "./plumes.ts";

/** A label on a part: its text, where it points in the ship's own metres, the part it follows and where that part stands at rest (so the label moves with it). `number` draws a numbered disc. */
export interface ViewerMark {
  id: string;
  text: string;
  at: Vec3;
  slot: string;
  rest?: Vec3;
  numbered?: boolean;
}

export interface ViewerFocus {
  slots: readonly string[];
  target: Vec3;
  direction: Vec3;
  distance: number;
}

export interface ViewerOptions {
  label: string;
  reducedMotion: boolean;
  onLost: () => void;
  /** Said once, when the camera first comes near what is on screen: the page may then build the fine detail. */
  onNear?: () => void;
  /** Where the licensed models are. */
  assets: string;
  /** Tells the page which painted parts have come in, or "" when the look is not painted. */
  onPainted: (state: string) => void;
  /** Tells the page a timeline moved. */
  onFlight?: () => void;
  /** Tells the page the view was drawn, so labels that follow a part can move with it. */
  onDraw?: () => void;
}

const IDLE_STOP_MS = 90_000;
const MOVE_MS = 1400;
/** Wheel steps closer together than this belong to one turn of the wheel, so a zoom that reaches its end part-way through does not hand the rest to the page. */
const WHEEL_GESTURE_MS = 300;
/** Longest a draw waits for shaders to build: a browser that never says they are ready still draws. */
const COMPILE_MS = 4000;
const VIEW_MS = 700;

const autoRotateOf = (spin: Spin): number => (spin.seconds <= 0 ? 0 : (60 / spin.seconds) * (spin.way === "cw" ? -1 : 1));

const LINE_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const LINE_FRAGMENT = /* glsl */ `
uniform vec3 edge;
uniform vec3 middle;
uniform vec3 hexColor;
uniform float hexMetres;
uniform float hexOn;
varying vec3 vNormal;
varying vec2 vUv;
float hexLine(vec2 p) {
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - s * 0.5;
  vec2 b = mod(p + s * 0.5, s) - s * 0.5;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 q = abs(g);
  return max(dot(q, s * 0.5), q.x);
}
void main() {
  vec3 n = normalize(vNormal);
  float facing = pow(abs(n.z), 1.4);
  vec3 c = mix(edge, middle, facing);
  if (hexOn > 0.5) {
    vec2 metres = vec2(vUv.x * 28.27, vUv.y * 100.0) / hexMetres;
    float d = hexLine(metres);
    float w = fwidth(d) * 1.1;
    float line = 1.0 - smoothstep(0.5 - w, 0.5, d);
    c = mix(c, hexColor, (1.0 - line) * 0.34);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const OUTLINE_VERTEX = /* glsl */ `
uniform float width;
uniform vec2 size;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec2 away = normalize(n.xy + vec2(1e-5));
  clip.xy += away * width * 2.0 / size * clip.w;
  gl_Position = clip;
}`;

const OUTLINE_FRAGMENT = /* glsl */ `
uniform vec3 color;
void main() {
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

interface PartView {
  slot: string;
  /** It belongs to a craft standing beside the one on screen. */
  beside: boolean;
  /** Which craft: -1 for the rocket itself, then 0, 1 for the ones beside it. */
  craft: number;
  holder: Group;
  code: Group;
  model: Group | null;
  modelFile: string | null;
  /** The licensed model has no nozzle: this package's own is drawn with it. */
  ownNozzle: boolean;
  modelState: "none" | "loading" | "ready" | "failed";
  nozzleShown: boolean;
  faces: { mesh: Mesh; name: string; hasUv: boolean }[];
  outlines: Mesh[];
  feature: LineSegments2[];
  weld: LineSegments2[];
  from: Vec3;
  to: Vec3;
  hideAtEnd: boolean;
  /** Its flames, made the first time an engine of it is lit. */
  plumes: PartPlumes | null;
  /** What a flight turns: each moving group is a node of its own, at its pivot, with the axis it turns about (they come from the file, so the viewer holds no table of them). */
  moves: { name: string; group: Group; axis: Vector3; angle: number }[];
}

/** The materials of an engine's bell, in this package's own meshes. */
const NOZZLE_MATERIALS: ReadonlySet<string> = new Set(["bell", "bell-inside", "engine-metal"]);
const asVec = (v: Vector3): Vec3 => [v.x, v.y, v.z];
/** The pictures a licensed model's material may hold (the shared sky it reflects is not one of them). */
const MODEL_PICTURES = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"] as const;

export class RocketViewer {
  readonly canvas: HTMLCanvasElement;
  frames = 0;
  private holder: HTMLElement;
  private options: ViewerOptions;
  private renderer: WebGLRenderer;
  private environment: Texture;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV_DEG, 3 / 4, 1, 4000);
  private root = new Group();
  private parts: PartView[] = [];
  private built: Built | null = null;
  private look: LookName = "line";
  private show = "together";
  private sun: DirectionalLight;
  /** The fleet is lit with a shadow: its ships are big enough for one part to fall on another. A rocket is not, so it keeps the one light it has. */
  private shadows = false;
  private plumes: PlumeKit;
  private lit: { readonly [slot: string]: number } | "full" | null = null;
  /** What was lit before a flight took over the engines. */
  private litOutside: { readonly [slot: string]: number } | "full" | null = null;
  private burningNow = 0;
  /** A flame moves until then. */
  private flameUntil = 0;
  private flameDrawn = 0;
  private inTick = false;
  private clockNow: FlightClock | null = null;
  private flightOn = false;
  private ground: GroundKit | null = null;
  private flightKey = "";
  private burnSlots: { view: PartView; y: number } | null = null;
  private generation = 0;
  private materialCache = new Map<string, Material>();
  /** The materials that glow when the engines are lit, and whether they do now. */
  private glowing = new Map<MeshStandardMaterial, number>();
  private glowOn = false;
  private outlineMaterial: ShaderMaterial;
  private textures: Texture[] = [];
  private steelMap: CanvasTexture | null = null;
  private tileMap: CanvasTexture | null = null;
  private glow: Mesh | null = null;
  private controls: OrbitControls;
  private clock = new Timer();
  private frame = 0;
  private visible = false;
  private lastActive = performance.now();
  private needsDraw = true;
  private pose: { from: { target: Vector3; offset: Vector3 }; to: { target: Vector3; offset: Vector3 }; start: number; ms: number; moveParts: boolean } | null = null;
  private tilt = { azimuth: 0, polar: 0, applied: { azimuth: 0, polar: 0 } };
  private driven: ViewChoice | null = null;
  private drivenDirty = false;
  private lastDistance = 0;
  private resize: ResizeObserver;
  private disposed = false;
  private compiling = 0;
  private compiled = new Set<string>();
  private settled: Promise<void> = Promise.resolve();
  private marks: { mark: ViewerMark; el: HTMLElement }[] = [];
  private markHost: HTMLElement | null = null;
  /** The words that say what stands beside the craft: its name and length, under its foot. One for each craft named, by craft (-1 is the rocket itself). */
  private besideEls = new Map<number, HTMLElement>();
  /** Platforms under craft that fly in space, so they are not read as rockets on a pad. Not part of the camera's box. */
  private plinths: Group | null = null;
  /** The words on a plinth. The compare page sets them in the reader's language. */
  private scaleNote = "shown on the ground for scale";
  private focusing = false;
  private nearSaid = false;
  private nearAt = 0;

  constructor(holder: HTMLElement, options: ViewerOptions) {
    this.holder = holder;
    this.options = options;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = "canvas";
    this.canvas.setAttribute("part", "canvas");
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-roledescription", "3D view");
    this.setLabel(options.label);
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      if (!this.disposed) this.options.onLost();
    });
    holder.appendChild(this.canvas);

    const pmrem = new PMREMGenerator(this.renderer);
    const skyTexture = new CanvasTexture(paintSky());
    skyTexture.colorSpace = SRGBColorSpace;
    const skyScene = new Scene();
    const sky = new Mesh(new SphereGeometry(50, 48, 24), new MeshBasicMaterial({ map: skyTexture, side: BackSide }));
    skyScene.add(sky);
    this.environment = pmrem.fromScene(skyScene, 0.012).texture;
    pmrem.dispose();
    sky.geometry.dispose();
    (sky.material as MeshBasicMaterial).dispose();
    skyTexture.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.95;
    const key = new DirectionalLight("#fff6e6", 1.6);
    key.position.set(3, 5, 4);
    this.sun = key;
    const rim = new DirectionalLight("#cfe2ff", 1.1);
    rim.position.set(-4, 1, -5);
    const low = new DirectionalLight("#ffffff", 0.35);
    low.position.set(1, -4, 2);
    this.plumes = new PlumeKit();
    this.scene.add(key, key.target, rim, low, new HemisphereLight("#d7e6ff", "#22252b", 0.35), this.plumes.light, this.root);

    this.outlineMaterial = new ShaderMaterial({
      vertexShader: OUTLINE_VERTEX,
      fragmentShader: OUTLINE_FRAGMENT,
      side: BackSide,
      uniforms: { width: { value: 1 }, size: { value: new Vector2(1, 1) }, color: { value: new Color("#8fa1b8") } },
    });

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.rotateSpeed = 0.7;
    this.controls.minPolarAngle = 0.04;
    this.controls.maxPolarAngle = Math.PI - 0.04;
    this.canvas.style.touchAction = "pan-y";
    this.controls.addEventListener("start", () => this.touched());
    this.controls.addEventListener("change", () => this.wake());
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerdown", () => this.canvas.focus({ preventScroll: true }));
    this.canvas.addEventListener("dblclick", () => {
      if (!this.driven) this.setAngle(this.homeAngle, true);
    });
    this.canvas.addEventListener("keydown", (event) => this.key(event));
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(holder);
    this.fit();
  }

  private homeAngle: Angle = { az: 32, el: 9 };

  setLabel(label: string): void {
    this.canvas.setAttribute("aria-label", `3D view of ${label}. Drag or use the arrow keys to turn it and the wheel to zoom; double-click or Home puts it back.`);
  }

  /** The words on the plinth under a craft that flies in space. Empty falls back to the English. */
  setScaleNote(text: string | null): void {
    const next = text?.trim() ? text : "shown on the ground for scale";
    if (next === this.scaleNote) return;
    this.scaleNote = next;
    this.wake();
  }

  /** Loads a rocket and shows it. The camera's angle stays when a rocket is already showing. */
  async load(built: Built, show: string, look: LookName, angle: Angle | null): Promise<void> {
    const generation = ++this.generation;
    const bytes = built.glb().bytes;
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
    if (this.disposed || generation !== this.generation) return;
    this.disposeParts();
    this.root.clear();
    this.parts = [];
    this.built = built;
    this.show = show;
    this.shadows = built.parts.some((part) => part.record.rocket.startsWith("fleet-"));
    this.renderer.shadowMap.enabled = this.shadows;
    this.sun.castShadow = this.shadows;
    const places = built.placesOf(show);
    for (const part of [...built.parts, ...built.beside]) {
      const source = gltf.scene.getObjectByName(part.slot);
      if (!source) continue;
      const holder = new Group();
      holder.name = part.slot;
      const code = new Group();
      holder.add(code);
      const view: PartView = {
        slot: part.slot,
        beside: built.beside.includes(part),
        craft: part.craft ?? -1,
        holder,
        code,
        model: null,
        // the stack beside it is this package's own paint in every look: a licensed model shows only with its credit, which is the craft's
        modelFile: built.beside.includes(part) ? null : (part.record.painted?.file ?? null),
        ownNozzle: !built.beside.includes(part) && Boolean(part.record.painted?.ownNozzle),
        modelState: "none",
        nozzleShown: false,
        faces: [],
        outlines: [],
        feature: [],
        weld: [],
        from: [0, 0, 0],
        to: [0, 0, 0],
        hideAtEnd: false,
        plumes: null,
        moves: [],
      };
      this.takeMeshes(source, code, view);
      for (const node of source.children.slice(1)) {
        const axis = node.userData.axis as number[] | undefined;
        if (!axis) continue;
        const group = new Group();
        group.name = node.name;
        group.position.copy(node.position);
        code.add(group);
        this.takeMeshes(node, group, view);
        view.moves.push({ name: String(node.userData.group), group, axis: new Vector3(axis[0], axis[1], axis[2]).normalize(), angle: 0 });
      }
      const place = places.find((p) => p.slot === part.slot);
      holder.position.set(...(place?.at ?? [0, 0, 0]));
      holder.visible = place?.shown ?? false;
      this.root.add(holder);
      this.parts.push(view);
    }
    this.addGlow();
    this.fitShadow();
    this.setLook(look);
    this.frameTo(angle ?? this.currentAngle(), false);
    if (this.clockNow) {
      this.flightKey = "";
      this.flightOn = false;
      this.setFlight(this.clockNow);
    }
    this.canvas.dataset.ready = "true";
    this.canvas.dataset.parts = this.parts.filter((part) => !part.beside).map((part) => part.slot).join(" ");
    this.canvas.dataset.beside = built.beside.length ? "on" : "off";
    this.fitPlinths();
    this.drivenDirty = this.driven !== null;
    this.wake();
    await this.settled;
  }

  /** Moves the parts from the packed nodes into `into`, keeping each mesh's own placement. */
  private takeMeshes(source: Object3D, into: Group, view: PartView): void {
    const box = source.children[0];
    if (!box) return;
    const carrier = new Group();
    carrier.position.copy(box.position);
    carrier.scale.copy(box.scale);
    into.add(carrier);
    const meshes: Object3D[] = [];
    box.traverse((node) => {
      if (node instanceof Mesh || node instanceof LineSegments) meshes.push(node);
    });
    for (const node of meshes) {
      if (node instanceof LineSegments) {
        const named = (node.material as Material).name;
        const fat = this.fatLines(node);
        carrier.add(fat);
        (named === "line-feature" ? view.feature : view.weld).push(fat);
      } else if (node instanceof Mesh) {
        const mesh = new Mesh(node.geometry);
        const name = (node.material as Material).name;
        mesh.name = name;
        mesh.castShadow = this.shadows && !(name in MATERIALS && "opacity" in MATERIALS[name as MaterialName]);
        mesh.receiveShadow = this.shadows;
        carrier.add(mesh);
        view.faces.push({ mesh, name, hasUv: Boolean(node.geometry.getAttribute("uv")) });
        const outline = new Mesh(node.geometry, this.outlineMaterial);
        outline.name = "outline";
        carrier.add(outline);
        view.outlines.push(outline);
      }
    }
  }

  /** Lines of a set width in pixels, whatever the distance. */
  private fatLines(node: LineSegments): LineSegments2 {
    const position = node.geometry.getAttribute("position");
    const index = node.geometry.getIndex();
    const pairs = new Float32Array((index ? index.count : position.count) * 3);
    for (let i = 0; i < (index ? index.count : position.count); i++) {
      const v = index ? index.getX(i) : i;
      pairs[i * 3] = position.getX(v);
      pairs[i * 3 + 1] = position.getY(v);
      pairs[i * 3 + 2] = position.getZ(v);
    }
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(pairs);
    const fat = new LineSegments2(geometry, new LineMaterial({ color: 0x8fa1b8, linewidth: 1, transparent: true }));
    fat.computeLineDistances();
    return fat;
  }

  /** The drawing's own colours for a material in a line look: a body that darkens to its edges, as the drawing's gradient does. */
  private lineMaterial(name: string, look: LookName, hasUv: boolean): Material {
    const key = `${look}/${name}/${hasUv}`;
    const known = this.materialCache.get(key);
    if (known) return known;
    const fill = (name in MATERIALS ? MATERIALS[name as MaterialName].fill : "metal") as keyof (typeof LOOKS)[LookName]["fills"];
    const [edge, middle] = LOOKS[look].fills[fill];
    const made = new ShaderMaterial({
      vertexShader: LINE_VERTEX,
      fragmentShader: LINE_FRAGMENT,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.5,
      polygonOffsetUnits: 2,
      uniforms: {
        edge: { value: new Color(edge) },
        middle: { value: new Color(middle) },
        hexColor: { value: new Color(LOOKS[look].line) },
        hexOn: { value: name === "tile" && hasUv ? 1 : 0 },
        hexMetres: { value: 1 },
      },
    });
    this.materialCache.set(key, made);
    return made;
  }

  /** True materials: a stainless hull with its panels, black tiles, dark bells. */
  private paintedMaterial(name: string, hasUv: boolean): Material {
    const key = `painted/${name}/${hasUv}`;
    const known = this.materialCache.get(key);
    if (known) return known;
    const spec: MaterialSpec = name in MATERIALS ? MATERIALS[name as MaterialName] : MATERIALS.steel;
    const made = new MeshStandardMaterial({ color: spec.color, metalness: spec.metal, roughness: spec.rough, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    if (name === "steel" && hasUv) {
      this.steelMap ??= this.repeating(paintSteel(8, 8), 2, 100 / (8 * 1.83));
      made.map = this.steelMap;
      made.color.set("#dfe2e6");
      made.roughness = 0.33;
    }
    if (name === "tile" && hasUv) {
      // the mosaic repeats every 28 flats, round the hull and up it
      this.tileMap ??= this.repeating(paintTiles(28), 2, 100 / 14.14);
      made.map = this.tileMap;
      made.color.set("#ffffff");
    }
    this.dullTile(made, name);
    if (spec.opacity !== undefined) {
      made.transparent = true;
      made.opacity = spec.opacity;
      made.depthWrite = false;
    }
    if (spec.glow) {
      made.emissive.set(spec.glowColor ?? spec.color);
      made.emissiveIntensity = this.glowOn ? spec.glow : 0;
      this.glowing.set(made, spec.glow);
    }
    this.materialCache.set(key, made);
    return made;
  }

  /** Black tiles are matt: without this a bright sky washes them grey. */
  private dullTile(material: MeshStandardMaterial, name: string): void {
    if (name !== "tile" && name !== "tile-plain") return;
    material.envMap = this.environment;
    material.envMapIntensity = 0.28;
    material.roughness = Math.max(material.roughness, 0.72);
  }

  private repeating(picture: HTMLCanvasElement, u: number, v: number): CanvasTexture {
    const texture = new CanvasTexture(picture);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(u, v);
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(texture);
    return texture;
  }

  /** One of the three looks. The camera does not move. */
  setLook(look: LookName): void {
    this.look = look;
    const spec = LOOKS[look];
    const painted = look === "painted";
    (this.outlineMaterial.uniforms.color.value as Color).set(spec.line);
    this.outlineMaterial.uniforms.width.value = spec.outlinePx * this.renderer.getPixelRatio();
    for (const part of this.parts) {
      for (const { mesh, name, hasUv } of part.faces) mesh.material = painted ? this.paintedMaterial(name, hasUv) : this.lineMaterial(name, look, hasUv);
      for (const outline of part.outlines) outline.visible = !painted;
      for (const lines of part.feature) {
        const material = lines.material as LineMaterial;
        material.color.set(painted ? "#2b2e33" : spec.line);
        material.linewidth = spec.featurePx;
        material.opacity = painted ? 0.5 : 1;
        material.alphaToCoverage = false;
      }
      for (const lines of part.weld) {
        const material = lines.material as LineMaterial;
        material.color.set(painted ? "#2b2e33" : spec.line);
        material.linewidth = spec.weldPx;
        material.opacity = spec.weldOpacity;
      }
      this.useModel(part, painted);
    }
    if (this.glow) this.glow.visible = !painted;
    this.canvas.dataset.look = look;
    this.plumes.setLook(painted);
    this.relight();
    // "painted" is said when its shaders are built, so a reader who waits for it finds the next frame ready to draw
    if (look === "painted") void this.prepare(false).then(() => this.reportPainted());
    else {
      this.reportPainted();
      void this.prepare(false);
    }
    this.wake();
  }

  /** Builds the shaders a look needs beside the page's own work, where the browser can build them in parallel (KHR_parallel_shader_compile), and holds the next draw until they are in, so the page keeps answering while a look is first built. The last picture stays up meanwhile. A model that comes in later builds its own. */
  private prepare(force: boolean): Promise<void> {
    // without the browser's parallel compile (software drawing has none) compileAsync is no different from the first draw's own build, so nothing waits
    if (this.disposed || !this.renderer.extensions.has("KHR_parallel_shader_compile") || (!force && this.compiled.has(this.look))) return Promise.resolve();
    this.compiled.add(this.look);
    this.compiling++;
    let timer = 0;
    const late = new Promise<void>((resolve) => {
      timer = window.setTimeout(resolve, COMPILE_MS);
    });
    const built = this.renderer.compileAsync(this.scene, this.camera).then(() => undefined);
    const wait = Promise.race([built, late])
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        this.compiling--;
        if (!this.disposed) this.wake();
      });
    this.settled = Promise.all([this.settled, wait]).then(() => undefined);
    return wait;
  }

  /** Which engines burn: at full thrust every one that shows, a count for each part, or none. Nothing is made or freed by this after a part's first flame: only which of its flames are drawn changes. */
  setEngines(lit: { readonly [slot: string]: number } | "full" | null): void {
    // a flight keeps its own, and what was asked for comes back after it
    if (this.clockNow) {
      this.litOutside = lit;
      this.flightKey = "";
      this.applyFlight();
      this.wake();
      return;
    }
    const framed = this.lit === "full";
    this.lit = lit;
    this.relight();
    if (framed !== (lit === "full") && this.built && !this.pose) this.reframe();
    this.wake();
  }

  /** The page reads reduced motion again at each change, so a view opened earlier follows the reader now. */
  setReduced(reduced: boolean): void {
    this.options.reducedMotion = reduced;
  }

  private relight(): void {
    if (!this.built) return;
    const counts = new Map<string, number>();
    if (this.lit === "full") {
      for (const bell of this.built.flamesOf(this.show)) counts.set(bell.slot, (counts.get(bell.slot) ?? 0) + 1);
    } else if (this.lit) for (const [slot, count] of Object.entries(this.lit)) counts.set(slot, count);
    let burning = 0;
    let lowest: { view: PartView; y: number } | null = null;
    for (const view of this.parts) {
      // a craft standing beside the one on screen lights with it: the bells of its lowest part, as at lift-off
      const besidePart = view.beside ? this.built.beside.find((part) => part.slot === view.slot) : undefined;
      const lowestBeside = besidePart && this.built.beside.filter((part) => part.craft === besidePart.craft).every((part) => part.bounds.min[1] >= besidePart.bounds.min[1]);
      const count = besidePart ? (this.lit === "full" && lowestBeside ? bellsOf(besidePart.pieces).length : 0) : (counts.get(view.slot) ?? 0);
      if (count > 0 && !view.plumes) {
        const built = besidePart ?? this.built.parts.find((part) => part.slot === view.slot);
        const bells = bellsOf(built?.pieces ?? []);
        if (bells.length === 0) continue;
        view.plumes = new PartPlumes(this.plumes, bells, built?.flame ?? "neutral");
        view.holder.add(view.plumes.group);
      }
      if (!view.plumes) continue;
      const fired = pickBells(view.plumes.bells, count);
      view.plumes.light(fired);
      burning += fired.length;
      if (fired.length > 0 && !lowest) lowest = { view, y: fired[0].y - 1 };
    }
    this.burningNow = burning;
    this.glowOn = this.lit === "full" || burning > 0;
    for (const [material, strength] of this.glowing) material.emissiveIntensity = this.glowOn ? strength : 0;
    this.burnSlots = lowest;
    this.plumes.setBurning(burning);
    this.plumes.light.intensity = burning === 0 || this.look !== "painted" ? 0 : Math.min(900, 120 + burning * 40);
    this.placeGlow();
    this.canvas.dataset.engines = burning > 0 ? "on" : "off";
    this.canvas.dataset.plumes = String(burning);
  }

  /** The hull's glow stands under the lowest part that burns, wherever that part has got to. */
  private placeGlow(): void {
    const lowest = this.burnSlots;
    if (!lowest) return;
    lowest.view.holder.updateMatrix();
    this.plumes.light.position.set(0, lowest.y, 0).applyMatrix4(lowest.view.holder.matrix);
  }

  /** Starts, moves or ends a flight. While one is on, the parts stand where its timeline says, the engines are its own and the camera holds all of it. Under reduced motion it is the same, with no flames. */
  setFlight(clock: FlightClock | null): void {
    this.clockNow = clock;
    if (!this.built) return;
    const before = this.flightOn;
    this.flightOn = clock !== null;
    if (!clock) {
      if (!before) return;
      this.flightKey = "";
      if (this.ground) this.ground.group.visible = false;
      for (const part of this.parts) if (part.model) this.showCode(part, this.look === "painted");
      const places = this.built.placesOf(this.show);
      for (const part of this.parts) {
        const place = places.find((one) => one.slot === part.slot);
        part.holder.position.set(...(place?.at ?? [0, 0, 0]));
        part.holder.rotation.set(0, 0, 0);
        part.holder.visible = place?.shown ?? false;
        for (const move of part.moves) {
          move.angle = 0;
          move.group.quaternion.identity();
        }
      }
      this.canvas.dataset.turned = "";
      this.plumes.setAir(0);
      this.plumes.setFloor(-1e6);
      this.reframe();
      this.lit = this.litOutside;
      this.relight();
      this.wake();
      return;
    }
    if (!before) {
      this.litOutside = this.lit;
      this.pose = null;
      if (!this.ground) {
        this.ground = new GroundKit();
        this.scene.add(this.ground.group);
      }
      for (const part of this.parts) if (part.beside) part.holder.visible = false;
      const { min, max } = this.boundsNow();
      this.ground.fit(this.built.boundsOf("together").max[0] * 2.4 + 4, Math.max(Math.abs(min[0]), Math.abs(max[0])));
      this.ground.group.visible = true;
      for (const part of this.parts) if (part.model) this.showCode(part, this.look === "painted");
      this.reframe();
    }
    this.applyFlight();
    this.wake();
  }

  /** After a flight starts or ends the camera holds the new bounds, keeping its angle. */
  private reframe(): void {
    if (this.driven) this.applyDriven();
    else this.applyFraming(this.framingFor(this.currentAngle()));
  }

  /** What is showing, with the flames when they are lit, so a flame is never cut off at the foot of the picture. */
  private litBounds() {
    const built = this.built as Built;
    return this.lit === "full" ? built.boundsOf(this.show, true) : built.boundsOf(this.show);
  }

  /** What the picture must hold: all of a flight while one is on. */
  private boundsNow() {
    if (!this.built) throw new Error("nothing is loaded");
    if (!this.clockNow) return this.litBounds();
    const { height, parts } = this.flightParts();
    const { min, max } = flightBounds(this.clockNow.flight, parts, height);
    return { min, max };
  }

  private flightParts() {
    const built = this.built as Built;
    const places = built.placesOf("together");
    const height = built.boundsOf("together").max[1];
    return {
      height,
      parts: built.parts.map((part) => {
        const at = places.find((place) => place.slot === part.slot)?.at ?? [0, 0, 0];
        return { slot: part.slot, baseY: at[1], height: part.record.height, radius: Math.max(part.record.diameter / 2, Math.abs(at[0]) + part.record.diameter / 2) };
      }),
    };
  }

  /** Puts everything where the timeline says now. */
  private applyFlight(): void {
    const clock = this.clockNow;
    if (!clock || !this.built) return;
    const { height, parts } = this.flightParts();
    const frame: FlightFrame = frameAt(clock.flight, clock.position, parts, height);
    const places = this.built.placesOf("together");
    for (const part of this.parts) {
      const pose = frame.poses[part.slot];
      const place = places.find((one) => one.slot === part.slot);
      if (!pose || !place) continue;
      const turn = MathUtils.degToRad(pose.pitch);
      const middle = (parts.find((one) => one.slot === part.slot)?.height ?? 0) / 2;
      for (const move of part.moves) {
        const angle = pose.moves[move.name] ?? 0;
        if (angle === move.angle) continue;
        move.angle = angle;
        move.group.quaternion.setFromAxisAngle(move.axis, MathUtils.degToRad(angle));
      }
      part.holder.visible = !pose.gone;
      part.holder.rotation.set(0, 0, turn);
      part.holder.position.set(place.at[0] + pose.dx + Math.sin(turn) * middle, place.at[1] + pose.dy + middle - Math.cos(turn) * middle, place.at[2]);
    }
    const turned = this.parts.flatMap((part) => part.moves.filter((move) => move.angle !== 0).map((move) => `${part.slot}:${move.group.name.split("~").slice(1).join("~")}=${Math.round(move.angle)}`)).join(" ");
    if (turned !== this.canvas.dataset.turned) this.canvas.dataset.turned = turned;
    this.plumes.setAir(frame.air);
    this.plumes.setFloor(frame.groundY);
    this.ground?.set(frame.groundY, this.options.reducedMotion ? 0 : frame.smoke, performance.now() / 1000);
    const key = `${clock.flight.id}/${frame.index}/${this.options.reducedMotion}`;
    if (key !== this.flightKey) {
      this.flightKey = key;
      this.lit = this.options.reducedMotion ? null : frame.burns;
      this.relight();
      this.canvas.dataset.phase = frame.phase.id;
    } else this.placeGlow();
    this.needsDraw = true;
  }

  private freePlumes(): void {
    for (const view of this.parts) {
      view.plumes?.dispose();
      view.plumes = null;
    }
  }

  /** Which painted parts are in: "model" when all come from a licensed model, "code" when this package's own paint, "loading" while one is on its way. */
  private reportPainted(): void {
    if (this.look !== "painted") {
      this.canvas.dataset.painted = "";
      this.options.onPainted("");
      return;
    }
    const states = this.parts.filter((part) => !part.beside).map((part) => (part.modelFile ? part.modelState : "code"));
    const state = states.some((s) => s === "loading" || s === "none") ? "loading" : states.every((s) => s === "ready") ? "model" : states.includes("ready") ? "mixed" : "code";
    this.canvas.dataset.painted = state;
    this.options.onPainted(state);
  }

  /** The licensed model of a part, fetched the first time the painted look asks for it. Until it is in, and if it fails, this package's own paint shows. */
  private useModel(part: PartView, painted: boolean): void {
    if (!part.modelFile) return;
    if (part.model) {
      part.model.visible = painted;
      this.showCode(part, painted);
      return;
    }
    part.code.visible = true;
    if (!painted || part.modelState !== "none") return;
    part.modelState = "loading";
    const generation = this.generation;
    new GLTFLoader()
      .loadAsync(`${this.options.assets}models/${part.modelFile}`)
      .then((gltf) => {
        if (this.disposed || generation !== this.generation) return;
        part.model = gltf.scene;
        // the same sheen as this package's own steel, whichever author's hull it is
        gltf.scene.traverse((node) => {
          if (!(node instanceof Mesh)) return;
          const material = node.material as MeshStandardMaterial;
          if (material.name === "steel") material.roughness = 0.46;
          this.dullTile(material, material.name);
          if (material.name === "tile") material.color.setScalar(0.42);
        });
        part.holder.add(gltf.scene);
        part.modelState = "ready";
        this.useModel(part, this.look === "painted");
        void this.prepare(true).then(() => this.reportPainted());
        this.wake();
      })
      .catch(() => {
        part.modelState = "failed";
        this.reportPainted();
      });
  }

  /** Behind a licensed model this package's code shows nothing, except the nozzle the model lacks, and not while the stage is nested in the one below. */
  private showCode(part: PartView, painted: boolean): void {
    const nozzleOnly = painted && part.ownNozzle;
    part.code.visible = !painted || nozzleOnly;
    // in a flight a stage leaves the one below, so its nozzle shows then too
    const nozzle = nozzleOnly && (this.show !== "together" || this.flightOn);
    for (const { mesh, name } of part.faces) mesh.visible = !nozzleOnly || (nozzle && NOZZLE_MATERIALS.has(name));
    for (const lines of [...part.feature, ...part.weld]) lines.visible = !nozzleOnly;
    part.nozzleShown = nozzle;
    this.canvas.dataset.nozzle = this.parts.some((one) => one.nozzleShown) ? "own" : "";
  }

  /** The key light looks at the middle of what shows, from far enough to take in all of it, and its shadow map covers just that. */
  private fitShadow(): void {
    if (!this.shadows || !this.built) return;
    const { min, max } = this.built.boundsOf(this.show);
    const centre = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const radius = Math.max(1, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2);
    const direction = new Vector3(3, 5, 4).normalize();
    this.sun.position.copy(centre).addScaledVector(direction, radius * 2);
    this.sun.target.position.copy(centre);
    const shadow = this.sun.shadow;
    shadow.mapSize.set(2048, 2048);
    shadow.camera.left = -radius;
    shadow.camera.right = radius;
    shadow.camera.top = radius;
    shadow.camera.bottom = -radius;
    shadow.camera.near = radius * 0.5;
    shadow.camera.far = radius * 4;
    shadow.bias = -0.0004;
    shadow.normalBias = radius * 0.0006;
    shadow.camera.updateProjectionMatrix();
    this.sun.target.updateMatrixWorld();
  }

  /** Together, apart, or one part alone: an animated move, or a cut under reduced motion. */
  setShow(show: string): void {
    if (!this.built || show === this.show || this.clockNow) return;
    this.show = show;
    this.fitShadow();
    for (const part of this.parts) if (part.model) this.showCode(part, this.look === "painted");
    const places = this.built.placesOf(show);
    const fromAngle = this.currentAngle();
    const framing = this.framingFor(fromAngle);
    if (this.options.reducedMotion) {
      for (const part of this.parts) {
        const place = places.find((p) => p.slot === part.slot);
        if (!place) continue;
        part.holder.position.set(...place.at);
        part.holder.visible = place.shown;
      }
      this.pose = null;
      this.applyFraming(framing);
      this.relight();
      this.wake();
      return;
    }
    for (const part of this.parts) {
      const place = places.find((p) => p.slot === part.slot);
      if (!place) continue;
      part.from = asVec(part.holder.position);
      const height = this.built.parts.find((p) => p.slot === part.slot)?.record.height ?? 50;
      // a part leaving goes off upwards, or downwards if it is the lower one; a part arriving comes from where it left
      if (!place.shown) {
        part.to = part.holder.visible ? [part.from[0], part.from[1] + (part.slot === this.parts[0].slot ? -height * 1.6 : height * 1.6), part.from[2]] : part.from;
        part.hideAtEnd = true;
      } else {
        if (!part.holder.visible) {
          const away = part.slot === this.parts[0].slot ? -height * 1.6 : height * 1.6;
          part.from = [place.at[0], place.at[1] + away, place.at[2]];
          part.holder.position.set(...part.from);
          part.holder.visible = true;
        }
        part.to = place.at;
        part.hideAtEnd = false;
      }
    }
    this.startPose(framing, MOVE_MS, true);
    this.relight();
  }

  private framingFor(angle: Angle) {
    if (!this.built) throw new Error("nothing is loaded");
    const { min, max } = this.boundsNow();
    return frameFor(min, max, angle, this.camera.aspect);
  }

  private applyFraming(framing: ReturnType<RocketViewer["framingFor"]>): void {
    this.camera.position.set(...framing.position);
    this.controls.target.set(...framing.target);
    this.limits(framing.distance);
    this.controls.update();
  }

  private limits(distance: number): void {
    if (!this.focusing) this.nearAt = Math.max(this.nearAt, distance * 0.3);
    this.fitGlow();
    this.camera.near = Math.max(0.2, distance / 40);
    this.camera.far = distance * 8;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = distance * 0.12;
    this.controls.maxDistance = distance * 1.8;
    this.updateHexSize(distance);
    this.syncSizes();
  }

  /** The tile mosaic is drawn at a constant size on screen, as the drawing's is. */
  private updateHexSize(distance: number): void {
    const metresPerPicturePx = (2 * distance * Math.tan(MathUtils.degToRad(FOV_DEG / 2))) / PICTURE_H;
    const value = Math.max(0.3, metresPerPicturePx * 9);
    for (const material of this.materialCache.values()) if (material instanceof ShaderMaterial && "hexMetres" in material.uniforms) material.uniforms.hexMetres.value = value;
  }

  private startPose(framing: ReturnType<RocketViewer["framingFor"]>, ms: number, moveParts: boolean): void {
    // said when it starts, not when a frame happens to be drawn: a slow machine may draw none in the middle of a move
    this.canvas.dataset.moving = "true";
    if (moveParts) this.canvas.dataset.moves = String(Number(this.canvas.dataset.moves ?? 0) + 1);
    this.pose = {
      from: { target: this.controls.target.clone(), offset: this.camera.position.clone().sub(this.controls.target) },
      to: { target: new Vector3(...framing.target), offset: new Vector3(...framing.position).sub(new Vector3(...framing.target)) },
      start: performance.now(),
      ms,
      moveParts,
    };
    this.limits(Math.max(framing.distance, this.camera.position.distanceTo(this.controls.target)));
    this.wake();
  }

  private finishParts(): void {
    for (const part of this.parts) {
      if (part.hideAtEnd) part.holder.visible = false;
      part.hideAtEnd = false;
    }
    if (this.built) this.limits(this.framingFor(this.currentAngle()).distance);
  }

  /** Where the camera is looking from. */
  /** Where a point of what shows, in metres, falls on the canvas in CSS pixels, and whether it is in front of the camera and inside the picture. A label that follows a part asks for it each time the view is drawn. */
  screenPoint(point: Vec3): { x: number; y: number; visible: boolean } {
    this.camera.updateMatrixWorld();
    const p = new Vector3(point[0], point[1], point[2]).project(this.camera);
    const box = this.canvas.getBoundingClientRect();
    return { x: (p.x * 0.5 + 0.5) * box.width, y: (-p.y * 0.5 + 0.5) * box.height, visible: p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 };
  }

  currentAngle(): Angle {
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() === 0) return this.homeAngle;
    const s = new Spherical().setFromVector3(offset);
    return { az: MathUtils.radToDeg(s.theta), el: 90 - MathUtils.radToDeg(s.phi) };
  }

  /** Turns to look from an angle. */
  setAngle(angle: Angle, animate: boolean): void {
    if (!this.built) return;
    if (this.driven) {
      this.homeAngle = angle;
      this.syncDriven();
      return;
    }
    this.controls.autoRotate = false;
    const framing = this.framingFor(angle);
    if (animate && !this.options.reducedMotion) this.startPose(framing, VIEW_MS, false);
    else this.applyFraming(framing);
    this.wake();
  }

  private frameTo(angle: Angle, animate: boolean): void {
    this.homeAngle = angle;
    this.setAngleKeepingSpin(angle, animate);
  }

  private setAngleKeepingSpin(angle: Angle, animate: boolean): void {
    if (!this.built) return;
    const framing = this.framingFor(angle);
    if (animate && !this.options.reducedMotion) this.startPose(framing, VIEW_MS, false);
    else this.applyFraming(framing);
  }

  setHome(angle: Angle): void {
    this.homeAngle = angle;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.wake();
  }

  setSpin(spin: Spin): void {
    this.controls.autoRotateSpeed = autoRotateOf(spin);
    this.controls.autoRotate = !this.driven && !this.options.reducedMotion && spin.seconds > 0;
    this.canvas.dataset.spin = `${spin.seconds}${spin.way}`;
    this.wake();
  }

  /** Hands the turn, tip, zoom and pan to the page, as the family's view controls report them: this view's own hands (drag, wheel, keys, spin) stand down, and the camera is the chosen view's angle turned and tipped by them. `null` takes them back. */
  drive(choice: ViewChoice | null): void {
    const same = choice !== null && this.driven !== null && (Object.keys(choice) as (keyof ViewChoice)[]).every((key) => choice[key] === this.driven?.[key]);
    if (same) return;
    this.driven = choice;
    this.controls.enabled = choice === null;
    if (choice) this.controls.autoRotate = false;
    this.canvas.style.touchAction = choice ? "auto" : "pan-y";
    this.syncDriven();
  }

  /** The camera is put where the choice says at once, seen or not, so a page that asks where it looks from is told the truth; a move between parts moves it by itself. */
  private syncDriven(): void {
    this.drivenDirty = false;
    this.lens();
    if (!this.pose) this.applyDriven();
    this.needsDraw = true;
    this.wake();
  }

  private drivenAngle(): Angle | null {
    if (!this.driven) return null;
    const turned = turnedBy(this.homeAngle, this.driven.yaw, this.driven.tilt);
    const lean = this.tilt.applied;
    return { az: turned.az + MathUtils.radToDeg(lean.azimuth), el: MathUtils.clamp(turned.el - MathUtils.radToDeg(lean.polar), -87, 87) };
  }

  /** The camera stands where the view's angle, turned and tipped, puts it, as far off as the whole rocket needs from the view's own angle, so turning never makes it breathe. */
  private applyDriven(): void {
    const angle = this.drivenAngle();
    if (!angle || !this.built) return;
    const framing = this.framingFor(this.homeAngle);
    const direction = directionOf(angle);
    this.camera.position.set(framing.target[0] + direction[0] * framing.distance, framing.target[1] + direction[1] * framing.distance, framing.target[2] + direction[2] * framing.distance);
    this.controls.target.set(...framing.target);
    if (Math.abs(framing.distance - this.lastDistance) > 1e-6) {
      this.lastDistance = framing.distance;
      this.limits(framing.distance);
    }
    this.controls.update();
  }

  /** Zoom is the camera's, and the pan moves the picture by pixels, so the view stays sharp at any zoom. */
  private lens(): void {
    const { zoom = 1, panX = 0, panY = 0 } = this.driven ?? {};
    const w = Math.max(1, this.holder.clientWidth);
    const h = Math.max(1, this.holder.clientHeight);
    this.camera.zoom = zoom;
    if (panX !== 0 || panY !== 0) this.camera.setViewOffset(w, h, -panX, -panY, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setTilt(azimuthDeg: number, polarDeg: number): void {
    this.tilt.azimuth = MathUtils.degToRad(MathUtils.clamp(azimuthDeg, -25, 25));
    this.tilt.polar = MathUtils.degToRad(MathUtils.clamp(polarDeg, -12, 12));
    this.wake();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.resize.disconnect();
    this.controls.dispose();
    this.disposeParts();
    this.plumes.dispose();
    this.ground?.dispose();
    this.glow?.geometry.dispose();
    (this.glow?.material as Material | undefined)?.dispose();
    for (const material of this.materialCache.values()) material.dispose();
    this.outlineMaterial.dispose();
    for (const texture of this.textures) texture.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  /** Lets the graphics card have back what the parts took: geometries, the thick lines' materials and a licensed model's own materials and pictures. */
  private disposeParts(): void {
    this.clearPlinths();
    this.freePlumes();
    for (const part of this.parts) {
      part.holder.traverse((node) => {
        (node as Mesh).geometry?.dispose();
        if (node instanceof LineSegments2) (node.material as Material).dispose();
      });
      part.model?.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          for (const slot of MODEL_PICTURES) (material[slot] as Texture | null | undefined)?.dispose();
          material.dispose();
        }
      });
      part.holder.removeFromParent();
    }
  }

  private addGlow(): void {
    if (!this.built || this.glow) return;
    const texture = new CanvasTexture(paintGlow("rgba(108,208,255,0.16)", "rgba(108,208,255,0)"));
    this.textures.push(texture);
    const plane = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.02;
    this.glow = plane;
    this.scene.add(plane);
    this.fitGlow();
  }

  /** The pool of light is as wide as what stands in it. */
  private fitGlow(): void {
    if (!this.built || !this.glow) return;
    const { min, max } = this.built.boundsOf(this.show);
    const span = Math.max(max[0] - min[0], max[2] - min[2]);
    this.glow.scale.setScalar(span * 3);
    this.glow.position.x = (min[0] + max[0]) / 2;
    this.glow.position.z = (min[2] + max[2]) / 2;
  }

  private onVisibility = () => {
    if (!document.hidden) this.wake();
  };

  private touched(): void {
    this.controls.autoRotate = false;
    this.pose = null;
    this.wake();
  }

  private wake(): void {
    // the view's own spin is not someone touching it: without this a spin would never settle
    if (!this.inTick) {
      this.lastActive = performance.now();
      this.flameUntil = this.lastActive + FLAME_SETTLE_MS;
    }
    this.needsDraw = true;
    if (!this.frame && this.visible && !document.hidden && !this.disposed) this.frame = requestAnimationFrame(this.tick);
  }

  /** Labels on the parts: each follows its part as the model turns, hides with its part, and gives way to a label drawn before it that it would cover. Null takes them away. */
  setMarks(marks: readonly ViewerMark[] | null): void {
    for (const { el } of this.marks) el.remove();
    this.marks = [];
    if (!marks || marks.length === 0) {
      if (this.besideEls.size === 0) {
        this.markHost?.remove();
        this.markHost = null;
      }
      return;
    }
    this.hostOfMarks();
    for (const mark of marks) {
      const el = document.createElement("span");
      el.dataset.mark = mark.id;
      el.textContent = mark.text;
      el.style.cssText = mark.numbered
        ? "position:absolute;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#f2c14e;color:#0b111b;font-weight:700;text-align:center;line-height:22px;will-change:transform;display:none"
        : "position:absolute;left:0;top:0;padding:1px 5px;border-left:2px solid #f2c14e;color:#e6edf6;background:rgba(11,17,27,0.72);white-space:nowrap;will-change:transform;display:none";
      this.hostOfMarks().appendChild(el);
      this.marks.push({ mark, el });
    }
    this.wake();
  }

  private hostOfMarks(): HTMLElement {
    if (!this.markHost) {
      const host = document.createElement("div");
      host.className = "marks";
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;font:11px/1.2 system-ui,sans-serif";
      this.holder.appendChild(host);
      this.markHost = host;
    }
    return this.markHost;
  }

  /** What stands beside the craft is named: a caption under its own foot, kept inside the picture. A picture built with names names every craft, the rocket too; otherwise only the one beside it is. A craft that flies in space adds the plinth's words on a second line. */
  private placeBeside(): void {
    const names = this.built?.names ?? [];
    const labels = names.length ? names.map((text, index) => ({ craft: index - 1, text })) : this.parts.some((part) => part.beside) ? [{ craft: 0, text: besideLabel() }] : [];
    for (const [craft, el] of this.besideEls) {
      if (labels.some((label) => label.craft === craft)) continue;
      el.remove();
      this.besideEls.delete(craft);
    }
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width < 1 || height < 1) return;
    const spots: { el: HTMLElement; footX: number; footY: number }[] = [];
    for (const { craft, text } of labels) {
      const foot = this.footScreen(craft);
      let el = this.besideEls.get(craft);
      if (!el) {
        el = document.createElement("span");
        el.dataset.besideLabel = "";
        el.style.cssText = "position:absolute;left:0;top:0;padding:1px 5px;color:#e6edf6;background:rgba(11,17,27,0.72);text-align:center;will-change:transform;display:none";
        this.hostOfMarks().appendChild(el);
        this.besideEls.set(craft, el);
      }
      const note = foot?.flies && names.length ? this.scaleNote : "";
      const caption = note ? `${text}\n${note}` : text;
      if (el.dataset.caption !== caption) {
        el.dataset.caption = caption;
        el.replaceChildren(document.createTextNode(text));
        if (note) {
          el.append(document.createElement("br"));
          const mark = document.createElement("span");
          mark.dataset.scaleNote = "";
          mark.textContent = note;
          mark.style.color = "#f2c14e";
          el.append(mark);
        }
      }
      el.style.maxWidth = `${Math.max(40, width - 8)}px`;
      if (!foot || !foot.visible || this.clockNow) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "block";
      el.style.transform = "translate(0px,0px)";
      spots.push({ el, footX: foot.x, footY: foot.y });
    }
    const placed = placeNameLabels(
      spots.map((spot) => ({ footX: spot.footX, footY: spot.footY, w: spot.el.offsetWidth, h: spot.el.offsetHeight || 16 })),
      width,
      height,
    );
    spots.forEach((spot, index) => {
      const at = placed[index];
      if (!at) return;
      spot.el.style.transform = `translate(${Math.round(at.x)}px,${Math.round(at.y)}px)`;
    });
  }

  /** The middle of a craft's foot, in CSS pixels, and whether that craft flies in space. */
  private footScreen(craft: number): { x: number; y: number; flies: boolean; visible: boolean } | null {
    const box = this.craftBoxes().find((one) => one.craft === craft);
    if (!box) return null;
    this.camera.updateMatrixWorld();
    const point = new Vector3((box.min[0] + box.max[0]) / 2, box.min[1], (box.min[2] + box.max[2]) / 2).project(this.camera);
    return {
      x: ((point.x + 1) / 2) * this.canvas.clientWidth,
      y: ((1 - point.y) / 2) * this.canvas.clientHeight,
      flies: fliesInSpace(box.rocket),
      visible: point.z < 1,
    };
  }

  /** The box each visible craft fills, in metres. */
  private craftBoxes(): { craft: number; rocket: string; min: Vec3; max: Vec3 }[] {
    if (!this.built) return [];
    const parts = [...this.built.parts, ...this.built.beside];
    const boxes = new Map<number, { craft: number; rocket: string; min: Vec3; max: Vec3 }>();
    for (const view of this.parts) {
      if (!view.holder.visible) continue;
      const built = parts.find((part) => part.slot === view.slot);
      if (!built) continue;
      const at = view.holder.position;
      const have = boxes.get(view.craft);
      boxes.set(view.craft, {
        craft: view.craft,
        rocket: built.record.rocket,
        min: [Math.min(have?.min[0] ?? Infinity, at.x + built.bounds.min[0]), Math.min(have?.min[1] ?? Infinity, at.y + built.bounds.min[1]), Math.min(have?.min[2] ?? Infinity, at.z + built.bounds.min[2])],
        max: [Math.max(have?.max[0] ?? -Infinity, at.x + built.bounds.max[0]), Math.max(have?.max[1] ?? -Infinity, at.y + built.bounds.max[1]), Math.max(have?.max[2] ?? -Infinity, at.z + built.bounds.max[2])],
      });
    }
    return [...boxes.values()];
  }

  /** Stands a marked plinth under each craft that flies in space, when the picture names the craft. The plinth is not in the camera's box. */
  private fitPlinths(): void {
    this.clearPlinths();
    const feet: Footprint[] = this.built?.names.length ? this.craftBoxes().filter((box) => fliesInSpace(box.rocket)).map((box) => ({ min: box.min, max: box.max })) : [];
    this.plinths = plinthGroup(feet);
    if (feet.length) this.root.add(this.plinths);
    this.canvas.dataset.plinth = feet.length ? "on" : "off";
  }

  private clearPlinths(): void {
    const group = this.plinths;
    this.plinths = null;
    if (!group) return;
    const materials = new Set<Material>();
    group.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.geometry.dispose();
      if (!Array.isArray(node.material)) materials.add(node.material);
    });
    for (const material of materials) material.dispose();
    group.removeFromParent();
  }

  /** Put the labels where their parts are now. */
  private placeMarks(): void {
    if (this.marks.length === 0) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const taken: { x: number; y: number; w: number; h: number }[] = [];
    const world = new Vector3();
    for (const { mark, el } of this.marks) {
      const part = this.parts.find((p) => p.slot === mark.slot);
      if (part && !part.holder.visible) {
        el.style.display = "none";
        continue;
      }
      world.set(...mark.at);
      if (part && mark.rest) world.add(new Vector3(part.holder.position.x - mark.rest[0], part.holder.position.y - mark.rest[1], part.holder.position.z - mark.rest[2]));
      world.project(this.camera);
      const x = ((world.x + 1) / 2) * width;
      const y = ((1 - world.y) / 2) * height;
      const w = mark.numbered ? 22 : mark.text.length * 6.2 + 12;
      const h = mark.numbered ? 22 : 16;
      const ok = world.z < 1 && x > -w && x < width + w && y > -h && y < height + h && !taken.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < (r.h + h) / 2);
      if (!ok) {
        el.style.display = "none";
        continue;
      }
      taken.push({ x, y, w, h });
      el.style.display = "block";
      el.style.transform = `translate(${Math.round(x + (mark.numbered ? 0 : 6))}px,${Math.round(y - (mark.numbered ? 0 : 8))}px)`;
    }
  }

  /** Show only some slots and fly to look at them: an inset. Null puts the ship back as it was. */
  focusOn(focus: ViewerFocus | null): void {
    if (!this.built || this.clockNow) return;
    if (!focus) {
      if (!this.focusing) return;
      this.focusing = false;
      const places = this.built.placesOf(this.show);
      for (const part of this.parts) {
        const place = places.find((p) => p.slot === part.slot);
        if (place) {
          part.holder.position.set(...place.at);
          part.holder.visible = place.shown;
        }
      }
      this.startPose(this.framingFor(this.currentAngle()), MOVE_MS, false);
      this.relight();
      return;
    }
    this.focusing = true;
    const places = this.built.placesOf("together");
    for (const part of this.parts) {
      const place = places.find((p) => p.slot === part.slot);
      if (place) part.holder.position.set(...place.at);
      part.holder.visible = focus.slots.includes(part.slot);
    }
    const dir = new Vector3(...focus.direction).normalize().multiplyScalar(focus.distance);
    this.startPose({ target: focus.target, position: [focus.target[0] + dir.x, focus.target[1] + dir.y, focus.target[2] + dir.z], distance: focus.distance } as ReturnType<RocketViewer["framingFor"]>, MOVE_MS, false);
    this.controls.minDistance = focus.distance * 0.04;
    this.controls.maxDistance = Math.max(focus.distance * 3, this.camera.position.distanceTo(this.controls.target));
    this.camera.near = Math.max(0.2, focus.distance / 80);
    this.camera.far = Math.max(focus.distance * 10, this.camera.position.distanceTo(this.controls.target) * 4);
    this.camera.updateProjectionMatrix();
    this.relight();
    this.wake();
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.visible || document.hidden || this.disposed) return;
    // shaders are being built: the next draw waits for them (prepare asks for a frame when they are in)
    if (this.compiling > 0) return;
    this.inTick = true;
    this.clock.update(now);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const ambient = !this.options.reducedMotion && now - this.lastActive < IDLE_STOP_MS;
    const t = this.tilt;
    const dA = (t.azimuth - t.applied.azimuth) * 0.12;
    const dP = (t.polar - t.applied.polar) * 0.12;
    if (Math.abs(dA) > 1e-5 || Math.abs(dP) > 1e-5) {
      if (this.driven) this.drivenDirty = true;
      else this.orbit(dA, dP);
      t.applied.azimuth += dA;
      t.applied.polar += dP;
      this.needsDraw = true;
    }
    if (this.drivenDirty) {
      this.drivenDirty = false;
      this.lens();
      if (!this.pose) this.applyDriven();
      this.needsDraw = true;
    }
    if (this.pose) {
      const { from, to, start, ms, moveParts } = this.pose;
      const k = Math.min(1, (performance.now() - start) / ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      this.controls.target.lerpVectors(from.target, to.target, e);
      // round the circle, not through the rocket
      const a = new Spherical().setFromVector3(from.offset);
      const b = new Spherical().setFromVector3(to.offset);
      let dTheta = b.theta - a.theta;
      while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
      const s = new Spherical(MathUtils.lerp(a.radius, b.radius, e), MathUtils.lerp(a.phi, b.phi, e), a.theta + dTheta * e);
      const aim = this.drivenAngle();
      if (aim) s.setFromVector3(new Vector3(...directionOf(aim)).setLength(s.radius));
      this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(s));
      if (moveParts)
        for (const part of this.parts) {
          // lifts clear first, then across, then down: a stage does not slide through another
          const across = Math.min(1, Math.max(0, (e - 0.15) / 0.7));
          part.holder.position.set(MathUtils.lerp(part.from[0], part.to[0], across), MathUtils.lerp(part.from[1], part.to[1], e), MathUtils.lerp(part.from[2], part.to[2], across));
        }
      this.needsDraw = true;
      if (k >= 1) {
        const done = this.pose.moveParts;
        this.pose = null;
        if (done) this.finishParts();
        this.drivenDirty = this.driven !== null;
      }
    }
    if (!ambient) this.controls.autoRotate = false;
    const flying = this.clockNow?.playing ?? false;
    if (flying && this.clockNow) {
      this.clockNow.advance(dt);
      this.applyFlight();
      this.options.onFlight?.();
    }
    const flaming = this.burningNow > 0 && !this.options.reducedMotion && (flying || performance.now() < this.flameUntil);
    if (flaming && now - this.flameDrawn >= FLAME_GAP_MS) {
      this.flameDrawn = now;
      this.plumes.setTime(now / 1000);
      this.needsDraw = true;
    }
    const changed = this.controls.update(dt);
    if (this.needsDraw || changed || this.pose) {
      this.syncSizes();
      this.renderer.render(this.scene, this.camera);
      this.placeMarks();
      this.placeBeside();
      if (this.options.onNear && !this.nearSaid && this.nearAt > 0 && this.camera.position.distanceTo(this.controls.target) < this.nearAt) {
        this.nearSaid = true;
        this.options.onNear();
      }
      this.needsDraw = false;
      this.frames++;
      this.canvas.dataset.frames = String(this.frames);
      this.options.onDraw?.();
      const angle = this.currentAngle();
      this.canvas.dataset.azimuth = angle.az.toFixed(2);
      this.canvas.dataset.elevation = angle.el.toFixed(2);
      this.canvas.dataset.moving = this.pose ? "true" : "false";
      this.canvas.dataset.distance = this.camera.position.distanceTo(this.controls.target).toFixed(2);
      if (this.driven) {
        this.canvas.dataset.zoom = this.driven.zoom.toFixed(2);
        this.canvas.dataset.pan = `${Math.round(this.driven.panX)},${Math.round(this.driven.panY)}`;
      }
      if (this.glow) this.glow.visible = this.look !== "painted" && this.camera.position.y > 0 && !this.clockNow;
    }
    // the controls' own change event may already have asked for the next frame (wake): one frame is asked for, never two, or each frame would double the next
    if (!this.frame && ((ambient && this.controls.autoRotate) || changed || this.pose || this.needsDraw || Math.abs(dA) > 1e-5 || flaming || flying)) this.frame = requestAnimationFrame(this.tick);
    this.inTick = false;
  };

  private syncSizes(): void {
    const size = this.renderer.getDrawingBufferSize(new Vector2());
    (this.outlineMaterial.uniforms.size.value as Vector2).copy(size);
  }

  private fit(): void {
    const w = Math.max(1, this.holder.clientWidth);
    const h = Math.max(1, this.holder.clientHeight);
    this.renderer.setPixelRatio(pixelRatioFor(w, h, window.devicePixelRatio));
    this.renderer.setSize(w, h, false);
    this.outlineMaterial.uniforms.width.value = LOOKS[this.look].outlinePx * this.renderer.getPixelRatio();
    this.camera.aspect = w / h;
    this.lens();
    this.syncSizes();
    if (this.built && !this.pose) this.applyFraming(this.framingFor(this.currentAngle()));
    this.wake();
  }

  private orbit(dAzimuth: number, dPolar: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const s = new Spherical().setFromVector3(offset);
    s.theta += dAzimuth;
    s.phi = MathUtils.clamp(s.phi + dPolar, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(s));
  }

  private key(event: KeyboardEvent): void {
    if (this.driven) return;
    const step = MathUtils.degToRad(15);
    const moves: Record<string, () => void> = {
      ArrowLeft: () => this.orbit(-step, 0),
      ArrowRight: () => this.orbit(step, 0),
      ArrowUp: () => this.orbit(0, -step * 0.66),
      ArrowDown: () => this.orbit(0, step * 0.66),
      "+": () => this.zoom(0.85),
      "=": () => this.zoom(0.85),
      "-": () => this.zoom(1 / 0.85),
      Home: () => this.setAngle(this.homeAngle, true),
      "0": () => this.setAngle(this.homeAngle, true),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    this.touched();
    move();
    this.wake();
  }

  /** The wheel over the view zooms it, as does a pinch (Ctrl or Command and the wheel). A wheel that starts with the zoom already at its end, or a sideways swipe, leaves the page to scroll. */
  private onWheel = (event: WheelEvent): void => {
    if (this.driven) return;
    const pinch = event.ctrlKey || event.metaKey;
    if (!pinch && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) return;
    const pixels = event.deltaMode === 1 ? event.deltaY * (pinch ? 5 : 33) : event.deltaMode === 2 ? event.deltaY * 800 : event.deltaY;
    const factor = pinch ? Math.exp(-pixels * 0.01) : MathUtils.clamp(Math.exp(-pixels * 0.002), 0.5, 2);
    const length = this.camera.position.distanceTo(this.controls.target);
    const atEnd = factor >= 1 ? length <= this.controls.minDistance * 1.0001 : length >= this.controls.maxDistance * 0.9999;
    const now = Number.isFinite(event.timeStamp) ? event.timeStamp : 0;
    if (!pinch && atEnd && !(now >= this.wheelTaken && now - this.wheelTaken < WHEEL_GESTURE_MS)) return;
    event.preventDefault();
    this.wheelTaken = now;
    if (atEnd) return;
    this.touched();
    this.zoom(1 / factor);
    this.wake();
  };

  private wheelTaken = Number.NEGATIVE_INFINITY;

  private zoom(factor: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(length));
  }
}
