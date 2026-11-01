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
import { type Angle, FOV_DEG, frameFor, PICTURE_H, type Vec3 } from "../framing.ts";
import { LOOKS, type LookName } from "../looks.ts";
import { MATERIALS, type MaterialName } from "../model/materials.ts";
import { paintGlow, paintSky, paintSteel, paintTiles } from "./paint.ts";

export interface ViewerOptions {
  label: string;
  reducedMotion: boolean;
  onLost: () => void;
  /** Where the licensed models are. */
  assets: string;
  /** Tells the page which painted parts have come in. */
  onPainted: (state: string) => void;
}

export interface Spin {
  /** Seconds a turn, 0 for not at all. */
  seconds: number;
  way: "cw" | "ccw";
}

const IDLE_STOP_MS = 90_000;
const MOVE_MS = 1400;
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
}

/** The materials of an engine's bell, in this package's own meshes. */
const NOZZLE_MATERIALS: ReadonlySet<string> = new Set(["bell", "bell-inside", "engine-metal"]);
const asVec = (v: Vector3): Vec3 => [v.x, v.y, v.z];

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
  private generation = 0;
  private materialCache = new Map<string, Material>();
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
  private resize: ResizeObserver;
  private disposed = false;

  constructor(holder: HTMLElement, options: ViewerOptions) {
    this.holder = holder;
    this.options = options;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
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
    const rim = new DirectionalLight("#cfe2ff", 1.1);
    rim.position.set(-4, 1, -5);
    const low = new DirectionalLight("#ffffff", 0.35);
    low.position.set(1, -4, 2);
    this.scene.add(key, rim, low, new HemisphereLight("#d7e6ff", "#22252b", 0.35), this.root);

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
    this.canvas.addEventListener("focus", () => (this.controls.enableZoom = true));
    this.canvas.addEventListener("blur", () => (this.controls.enableZoom = false));
    this.canvas.addEventListener("pointerdown", () => this.canvas.focus({ preventScroll: true }));
    this.canvas.addEventListener("dblclick", () => this.setAngle(this.homeAngle, true));
    this.canvas.addEventListener("keydown", (event) => this.key(event));
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(holder);
    this.fit();
  }

  private homeAngle: Angle = { az: 32, el: 9 };

  setLabel(label: string): void {
    this.canvas.setAttribute("aria-label", `3D view of ${label}. Drag or use the arrow keys to turn it; double-click or Home puts it back.`);
  }

  /** Loads a rocket and shows it. The camera's angle stays when a rocket is already showing. */
  async load(built: Built, show: string, look: LookName, angle: Angle | null): Promise<void> {
    const generation = ++this.generation;
    const bytes = built.glb().bytes;
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, "");
    if (this.disposed || generation !== this.generation) return;
    for (const part of this.parts) part.holder.removeFromParent();
    this.disposeTree(this.root);
    this.root.clear();
    this.parts = [];
    this.built = built;
    this.show = show;
    const places = built.placesOf(show);
    for (const part of built.parts) {
      const source = gltf.scene.getObjectByName(part.slot);
      if (!source) continue;
      const holder = new Group();
      holder.name = part.slot;
      const code = new Group();
      holder.add(code);
      const view: PartView = {
        slot: part.slot,
        holder,
        code,
        model: null,
        modelFile: part.record.painted?.file ?? null,
        ownNozzle: Boolean(part.record.painted?.ownNozzle),
        modelState: "none",
        nozzleShown: false,
        faces: [],
        outlines: [],
        feature: [],
        weld: [],
        from: [0, 0, 0],
        to: [0, 0, 0],
        hideAtEnd: false,
      };
      this.takeMeshes(source, code, view);
      const place = places.find((p) => p.slot === part.slot);
      holder.position.set(...(place?.at ?? [0, 0, 0]));
      holder.visible = place?.shown ?? false;
      this.root.add(holder);
      this.parts.push(view);
    }
    this.addGlow();
    this.setLook(look);
    this.frameTo(angle ?? this.currentAngle(), false);
    this.canvas.dataset.ready = "true";
    this.canvas.dataset.parts = this.parts.map((part) => part.slot).join(" ");
    this.wake();
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
    const spec = name in MATERIALS ? MATERIALS[name as MaterialName] : MATERIALS.steel;
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
    this.reportPainted();
    this.wake();
  }

  /** Which painted parts are in: "model" when all come from a licensed model, "code" when this package's own paint, "loading" while one is on its way. */
  private reportPainted(): void {
    if (this.look !== "painted") {
      this.canvas.dataset.painted = "";
      return;
    }
    const states = this.parts.map((part) => (part.modelFile ? part.modelState : "code"));
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
        this.reportPainted();
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
    const nozzle = nozzleOnly && this.show !== "together";
    for (const { mesh, name } of part.faces) mesh.visible = !nozzleOnly || (nozzle && NOZZLE_MATERIALS.has(name));
    for (const lines of [...part.feature, ...part.weld]) lines.visible = !nozzleOnly;
    part.nozzleShown = nozzle;
    this.canvas.dataset.nozzle = this.parts.some((one) => one.nozzleShown) ? "own" : "";
  }

  /** Together, apart, or one part alone: an animated move, or a cut under reduced motion. */
  setShow(show: string): void {
    if (!this.built || show === this.show) return;
    this.show = show;
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
  }

  private framingFor(angle: Angle) {
    if (!this.built) throw new Error("nothing is loaded");
    const { min, max } = this.built.boundsOf(this.show);
    return frameFor(min, max, angle, this.camera.aspect);
  }

  private applyFraming(framing: ReturnType<RocketViewer["framingFor"]>): void {
    this.camera.position.set(...framing.position);
    this.controls.target.set(...framing.target);
    this.limits(framing.distance);
    this.controls.update();
  }

  private limits(distance: number): void {
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
  currentAngle(): Angle {
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() === 0) return this.homeAngle;
    const s = new Spherical().setFromVector3(offset);
    return { az: MathUtils.radToDeg(s.theta), el: 90 - MathUtils.radToDeg(s.phi) };
  }

  /** Turns to look from an angle. */
  setAngle(angle: Angle, animate: boolean): void {
    if (!this.built) return;
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
    this.controls.autoRotate = !this.options.reducedMotion && spin.seconds > 0;
    this.canvas.dataset.spin = `${spin.seconds}${spin.way}`;
    this.wake();
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
    this.resize.disconnect();
    this.controls.dispose();
    this.disposeTree(this.root);
    for (const material of this.materialCache.values()) material.dispose();
    this.outlineMaterial.dispose();
    for (const texture of this.textures) texture.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private disposeTree(tree: Object3D): void {
    tree.traverse((node) => {
      const geometry = (node as Mesh).geometry;
      geometry?.dispose();
      if (node instanceof LineSegments2) (node.material as Material).dispose();
    });
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
    this.lastActive = performance.now();
    this.needsDraw = true;
    if (!this.frame && this.visible && !document.hidden && !this.disposed) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (!this.visible || document.hidden || this.disposed) return;
    this.clock.update(now);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const ambient = !this.options.reducedMotion && now - this.lastActive < IDLE_STOP_MS;
    const t = this.tilt;
    const dA = (t.azimuth - t.applied.azimuth) * 0.12;
    const dP = (t.polar - t.applied.polar) * 0.12;
    if (Math.abs(dA) > 1e-5 || Math.abs(dP) > 1e-5) {
      this.orbit(dA, dP);
      t.applied.azimuth += dA;
      t.applied.polar += dP;
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
      }
    }
    if (!ambient) this.controls.autoRotate = false;
    const changed = this.controls.update(dt);
    if (this.needsDraw || changed || this.pose) {
      this.syncSizes();
      this.renderer.render(this.scene, this.camera);
      this.needsDraw = false;
      this.frames++;
      this.canvas.dataset.frames = String(this.frames);
      const angle = this.currentAngle();
      this.canvas.dataset.azimuth = angle.az.toFixed(2);
      this.canvas.dataset.elevation = angle.el.toFixed(2);
      this.canvas.dataset.moving = this.pose ? "true" : "false";
      if (this.glow) this.glow.visible = this.look !== "painted" && this.camera.position.y > 0;
    }
    if ((ambient && this.controls.autoRotate) || changed || this.pose || this.needsDraw || Math.abs(dA) > 1e-5) this.frame = requestAnimationFrame(this.tick);
  };

  private syncSizes(): void {
    const size = this.renderer.getDrawingBufferSize(new Vector2());
    (this.outlineMaterial.uniforms.size.value as Vector2).copy(size);
  }

  private fit(): void {
    const w = Math.max(1, this.holder.clientWidth);
    const h = Math.max(1, this.holder.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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

  private zoom(factor: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(length));
  }
}
