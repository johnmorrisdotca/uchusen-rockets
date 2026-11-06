// The yard on a page: one mesh for the bays and one for the spine that can leave. A still view draws once. While the build player plays, the frame loop stays running so the drones keep working.
import { ACESFilmicToneMapping, AmbientLight, BackSide, BufferGeometry, CanvasTexture, Color, DirectionalLight, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator, PerspectiveCamera, RepeatWrapping, Scene, SphereGeometry, Vector3, WebGLRenderer, SRGBColorSpace } from "three";
import "@johnmorrisdotca/kazoku-ui/speed-buttons/define";
import { bindStage } from "./viewBinder.ts";
import { defineUchusenBuild, type UchusenBuild } from "../src/buildbar.ts";
import { paintSky } from "../src/element/paint.ts";
import { setAssetBase } from "../src/element.ts";
import type { ViewChoice } from "../src/framing.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { place } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { docked } from "../src/model/fleet/kaminari-concepts/c.ts";
import { MATERIALS, type MaterialName, type MaterialSpec } from "../src/model/materials.ts";
import { meshOf, type PartMesh } from "../src/model/pieces.ts";
import { BAYS, yardFixed, yardLoose } from "../src/model/fleet/shipyard-concepts/multibay.ts";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";
import { mountStillEarth } from "./earth.ts";
import { mountBays, type BayId } from "./yardShips.ts";

setAssetBase(new URL("assets/", document.baseURI).href);
defineUchusenBuild();

type ShotId = "whole" | "hall" | "spine" | "dock" | "lounge" | "visitor" | "latch" | "loose";
type Eye = { at: [number, number, number]; eye: [number, number, number]; fov: number };

const SHIPS: Partial<Record<ShotId, { rocket: string; variant: string }>> = {
  hall: { rocket: "fleet-kaminari", variant: "fleet-kaminari" },
  spine: { rocket: "fleet-ship-03", variant: "miyamoto" },
  dock: { rocket: "fleet-ship-01", variant: "hanabusa" },
  loose: { rocket: "fleet-ship-03", variant: "miyamoto" },
};

const stage = document.querySelector<HTMLElement>("[data-testid=yard-stage]")!;
const canvas = document.querySelector<HTMLCanvasElement>("#yard-view")!;
const earthHolder = document.querySelector<HTMLElement>("#yard-earth")!;
const buildRow = document.querySelector<HTMLElement>("#yard-build")!;
const bar = document.querySelector<UchusenBuild>("#build-bar")!;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const dragon = DRAGON_DRAWS["dragon-2"];
const dragonNose = dragon.trunk + dragon.capsule - dragon.nest;
const visitor = place([...trunk(dragon), ...place(capsule(dragon), { at: [0, dragon.trunk - dragon.nest, 0] })], { at: [-980, 150 - dragonNose - 4, -22] });
const miyamoto = docked("miyamoto", 1, "coarse");
const fixedMesh = meshOf([...yardFixed(), ...visitor]);
const looseMesh = meshOf([...yardLoose(), ...place(miyamoto, { at: [...BAYS.loose.shipAt] })]);
const scene = new Scene();
const camera = new PerspectiveCamera(38, 1, 1, 16_000);
camera.up.set(0, 0, 1);
const sun = new DirectionalLight("#fff6e6", 1.45);
sun.position.set(400, -900, 700);
const rim = new DirectionalLight("#cfe2ff", 0.85);
rim.position.set(-700, 400, 500);
const ambient = new AmbientLight("#ffffff", 0.3);
scene.add(sun, rim, ambient);
const root = new Group();
const loose = new Group();
scene.add(root);

const glow: { material: MeshStandardMaterial; color: string; amount: number }[] = [];
const lit: MeshStandardMaterial[] = [];

/** Bare aluminium, anodised fittings and painted white, so a truss is not one flat grey. */
const SKIN: Record<string, { color: string; metal: number; rough: number }> = {
  "hull-grey": { color: "#d7dbe0", metal: 0.88, rough: 0.32 },
  "hull-grey-dark": { color: "#3a414c", metal: 0.74, rough: 0.46 },
  "hull-white": { color: "#f4f2eb", metal: 0.42, rough: 0.38 },
  blanket: { color: "#f7f4ee", metal: 0.05, rough: 0.84 },
  "blanket-worn": { color: "#e4e0d6", metal: 0.06, rough: 0.88 },
  deck: { color: "#c5c8cc", metal: 0.35, rough: 0.62 },
};

const panels = new CanvasTexture(yardPanels());
panels.colorSpace = SRGBColorSpace;
panels.wrapS = RepeatWrapping;
panels.wrapT = RepeatWrapping;

/** Panel breaks and bolt rows, drawn heavy enough to read on a truss seen from across the yard. */
function yardPanels(): HTMLCanvasElement {
  const size = 512;
  const picture = document.createElement("canvas");
  picture.width = size;
  picture.height = size;
  const ctx = picture.getContext("2d");
  if (!ctx) return picture;
  ctx.fillStyle = "#f2f3f4";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#e4e7ea";
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  ctx.fillStyle = "#2c3138";
  ctx.fillRect(0, size / 2 - 10, size, 20);
  ctx.fillRect(size / 2 - 10, 0, 20, size);
  ctx.fillStyle = "#5c656e";
  for (const [x, y] of [[70, 70], [190, 70], [330, 70], [440, 70], [70, 190], [190, 190], [70, 330], [190, 330], [330, 330], [440, 440]]) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return picture;
}

function faceUv(positions: ArrayLike<number>, normals: ArrayLike<number>): Float32Array {
  const count = positions.length / 3;
  const uv = new Float32Array(count * 2);
  const scale = 1 / 36;
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3] ?? 0;
    const y = positions[i * 3 + 1] ?? 0;
    const z = positions[i * 3 + 2] ?? 0;
    const nx = Math.abs(normals[i * 3] ?? 0);
    const ny = Math.abs(normals[i * 3 + 1] ?? 0);
    const nz = Math.abs(normals[i * 3 + 2] ?? 0);
    const u = nx >= ny && nx >= nz ? y : x;
    const v = nz >= nx && nz >= ny ? y : z;
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  return uv;
}

function addMesh(mesh: PartMesh, parent: Group, station = false): void {
  for (const [name, buffers] of mesh.faces) {
    if (buffers.indices.length === 0) continue;
    const spec: MaterialSpec = MATERIALS[name as MaterialName];
    const skin = station ? SKIN[name] : undefined;
    const mapped = Boolean(skin) && buffers.normals.length === buffers.positions.length;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(buffers.positions, 3));
    if (buffers.normals.length === buffers.positions.length) geometry.setAttribute("normal", new Float32BufferAttribute(buffers.normals, 3));
    if (mapped) geometry.setAttribute("uv", new Float32BufferAttribute(faceUv(buffers.positions, buffers.normals), 2));
    geometry.setIndex(buffers.indices);
    const material = new MeshStandardMaterial({
      color: skin?.color ?? spec.color,
      metalness: skin?.metal ?? spec.metal,
      roughness: skin?.rough ?? spec.rough,
      map: mapped ? panels : null,
      transparent: (spec.opacity ?? 1) < 1,
      opacity: spec.opacity ?? 1,
      depthWrite: (spec.opacity ?? 1) > 0.5,
    });
    lit.push(material);
    if (spec.glow) glow.push({ material, color: spec.glowColor ?? spec.color, amount: spec.glow });
    parent.add(new Mesh(geometry, material));
  }
}

addMesh(fixedMesh, root, true);
addMesh(looseMesh, loose, true);
root.add(loose);

const shots: Record<ShotId, Eye> = {
  whole: { at: [760, 1000, 40], eye: [900, -1800, 1100], fov: 46 },
  hall: { at: [0, 1070, 20], eye: [2600, 1070, 520], fov: 32 },
  spine: { at: [760, 370, 20], eye: [1700, 370, 280], fov: 32 },
  dock: { at: [1520, 490, 30], eye: [2500, 490, 340], fov: 32 },
  lounge: { at: [...BAYS.lounge.at], eye: [...BAYS.lounge.eye], fov: 64 },
  visitor: { at: [-980, 140, -22], eye: [-1016, 108, 12], fov: 28 },
  latch: { at: [...BAYS.latch.at], eye: [...BAYS.latch.eye], fov: 42 },
  loose: { at: [-720, 400, 10], eye: [-980, -40, 120], fov: 42 },
};

let shot: ShotId = "whole";
let choice: ViewChoice = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };
let looseGoal = 0;
let looseNow = 0;
let sky: "day" | "night" = "day";
let building = false;
let ship: ShotId = "hall";
let queued = 0;
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();

const painted = mountStillEarth(earthHolder, "placed");

function frameEarth(): void {
  painted.setNight(sky === "night");
}

function applySky(): void {
  const night = sky === "night";
  sun.intensity = night ? 0.08 : 1.45;
  rim.intensity = night ? 0.12 : 0.85;
  ambient.intensity = night ? 0.14 : 0.3;
  scene.environmentIntensity = night ? 0.35 : 1;
  sun.position.set(night ? -40 : 400, night ? -30 : -900, night ? 8 : 700);
  scene.background = null;
  frameEarth();
  for (const lamp of glow) {
    lamp.material.emissive = new Color(night ? lamp.color : "#000000");
    lamp.material.emissiveIntensity = night ? lamp.amount * 0.55 : 0;
  }
  stage.dataset.sky = sky;
}

function aim(): void {
  const here = shots[shot];
  const dx = here.eye[0] - here.at[0];
  const dy = here.eye[1] - here.at[1];
  const dz = here.eye[2] - here.at[2];
  const dist = Math.hypot(dx, dy, dz) || 1;
  const baseTilt = Math.asin(Math.min(1, Math.max(-1, dz / dist)));
  const baseYaw = Math.atan2(dx, -dy);
  const yaw = baseYaw + (choice.yaw * Math.PI) / 180;
  const tilt = baseTilt + (choice.tilt * Math.PI) / 180;
  const away = dist / Math.max(0.25, choice.zoom);
  const ct = Math.cos(tilt);
  camera.position.set(here.at[0] + away * ct * Math.sin(yaw), here.at[1] - away * ct * Math.cos(yaw), here.at[2] + away * Math.sin(tilt));
  camera.up.set(0, 0, 1);
  if (choice.roll) {
    forward.set(here.at[0] - camera.position.x, here.at[1] - camera.position.y, here.at[2] - camera.position.z).normalize();
    right.crossVectors(forward, new Vector3(0, 0, 1));
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();
    up.crossVectors(right, forward).normalize().applyAxisAngle(forward, (choice.roll * Math.PI) / 180);
    camera.up.copy(up);
  }
  camera.lookAt(here.at[0], here.at[1], here.at[2]);
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  if (choice.panX || choice.panY) camera.setViewOffset(w, h, -choice.panX, -choice.panY, w, h);
  else camera.clearViewOffset();
  camera.fov = here.fov;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);
const pmrem = new PMREMGenerator(renderer);
const skyPicture = new CanvasTexture(paintSky());
skyPicture.colorSpace = SRGBColorSpace;
const skyScene = new Scene();
const skyDome = new Mesh(new SphereGeometry(50, 48, 24), new MeshBasicMaterial({ map: skyPicture, side: BackSide }));
skyScene.add(skyDome);
const environment = pmrem.fromScene(skyScene, 0.012).texture;
pmrem.dispose();
skyDome.geometry.dispose();
(skyDome.material as MeshBasicMaterial).dispose();
skyPicture.dispose();
scene.environment = environment;
scene.environmentIntensity = 1;
for (const material of lit) material.envMap = environment;

function size(): void {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  let ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  let rw = Math.floor(w * ratio);
  let rh = Math.floor(h * ratio);
  while (rw * rh > MAX_PIXELS || rw > MAX_SIDE || rh > MAX_SIDE) {
    ratio *= 0.9;
    rw = Math.floor(w * ratio);
    rh = Math.floor(h * ratio);
  }
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(1, rw), Math.max(1, rh), false);
  frameEarth();
}

function draw(): void {
  loose.position.x = looseNow;
  aim();
  renderer.render(scene, camera);
}

function poke(): void {
  if (queued || playing || document.hidden) return;
  queued = requestAnimationFrame(() => {
    queued = 0;
    draw();
  });
}

let playing = false;
let playQueued = 0;
let playFrames = 0;

function playLoop(now: number): void {
  playQueued = 0;
  if (!playing || document.hidden) return;
  const bay = bayNow();
  if (bay) {
    const where = bays.paint(bay, along[bay] ?? 0, reduce, now / 1000);
    bays.step(bay, now / 1000);
    if (where) stage.dataset.drone = where.map((n) => n.toFixed(2)).join(",");
  }
  playFrames += 1;
  stage.dataset.frames = String(playFrames);
  draw();
  playQueued = requestAnimationFrame(playLoop);
}

function setPlaying(on: boolean): void {
  playing = on;
  stage.dataset.playing = on ? "yes" : "no";
  if (on) {
    if (!playQueued) playQueued = requestAnimationFrame(playLoop);
    return;
  }
  if (playQueued) cancelAnimationFrame(playQueued);
  playQueued = 0;
}

function slide(): void {
  if (reduce || Math.abs(looseNow - looseGoal) < 0.5) {
    looseNow = looseGoal;
    stage.dataset.loose = looseGoal === 0 ? "home" : "out";
    poke();
    return;
  }
  looseNow += (looseGoal - looseNow) * 0.18;
  poke();
  requestAnimationFrame(slide);
}

const bays = mountBays(root, addMesh, poke);
const along: Partial<Record<ShotId, number>> = { hall: bays.rest("hall"), spine: bays.rest("spine"), dock: bays.rest("dock") };

function bayNow(): BayId | null {
  return ship === "hall" || ship === "spine" || ship === "dock" ? ship : null;
}

function showShip(): void {
  const bay = bayNow();
  buildRow.hidden = !building;
  stage.dataset.build = building ? "on" : "off";
  stage.dataset.ship = bay ? bays.variant(bay) : "";
  if (building && bay) {
    bar.steps = bays.steps(bay);
    bar.at = along[bay] ?? bays.rest(bay);
    bar.onMove = (at) => {
      if (bayNow() === bay) along[bay] = at;
      if (playing) return;
      bays.paint(bayNow(), along[bayNow() ?? "hall"] ?? 0, reduce);
      poke();
    };
    bar.onPlay = setPlaying;
    bar.onRepeat = () => undefined;
  }
  bays.paint(building ? bay : null, bay ? (along[bay] ?? 0) : 0, reduce);
}

function pressShot(id: ShotId): void {
  shot = id;
  stage.dataset.shot = id;
  if (id === "loose") {
    looseGoal = looseGoal === 0 ? -160 : 0;
    slide();
  }
  if (SHIPS[id]) ship = id;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-shot]")) button.setAttribute("aria-pressed", String(button.dataset.shot === id && id !== "loose"));
  const looseButton = document.querySelector<HTMLButtonElement>("[data-testid=yard-loose]");
  if (looseButton) looseButton.setAttribute("aria-pressed", String(looseGoal !== 0));
  if (building) showShip();
  poke();
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-shot]")) {
  button.addEventListener("click", () => pressShot(button.dataset.shot as ShotId));
}

document.querySelector<HTMLButtonElement>("[data-testid=yard-day]")!.addEventListener("click", () => {
  sky = "day";
  applySky();
  document.querySelector("[data-testid=yard-day]")!.setAttribute("aria-pressed", "true");
  document.querySelector("[data-testid=yard-night]")!.setAttribute("aria-pressed", "false");
  poke();
});
document.querySelector<HTMLButtonElement>("[data-testid=yard-night]")!.addEventListener("click", () => {
  sky = "night";
  applySky();
  document.querySelector("[data-testid=yard-night]")!.setAttribute("aria-pressed", "true");
  document.querySelector("[data-testid=yard-day]")!.setAttribute("aria-pressed", "false");
  poke();
});
document.querySelector<HTMLButtonElement>("[data-testid=yard-build]")!.addEventListener("click", () => {
  building = !building;
  document.querySelector("[data-testid=yard-build]")!.setAttribute("aria-pressed", String(building));
  showShip();
  poke();
});

bindStage(canvas, (detail) => {
  choice = {
    yaw: detail.yaw ?? choice.yaw,
    tilt: detail.tilt ?? choice.tilt,
    zoom: detail.zoom ?? choice.zoom,
    panX: detail.panX ?? choice.panX,
    panY: detail.panY ?? choice.panY,
    ...(detail.roll === undefined ? {} : { roll: detail.roll }),
  };
  poke();
});

canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  if (queued) cancelAnimationFrame(queued);
  queued = 0;
  if (playQueued) cancelAnimationFrame(playQueued);
  playQueued = 0;
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && playing && !playQueued) playQueued = requestAnimationFrame(playLoop);
});

const watch = document.querySelector<HTMLButtonElement>("[data-testid=yard-watch]");
watch?.addEventListener("click", () => {
  bar.watch = !bar.watch;
  watch.setAttribute("aria-pressed", String(bar.watch));
  if (bar.watch && bar.dataset.playing !== "true") bar.shadowRoot?.querySelector<HTMLButtonElement>("[data-testid=build-play]")?.click();
});
document.querySelector("kazoku-speed-buttons")?.addEventListener("kazoku-speedchange", (event) => {
  if ((event as CustomEvent<{ reason?: string }>).detail?.reason !== "user") return;
  bar.watch = false;
  watch?.setAttribute("aria-pressed", "false");
});

new ResizeObserver(() => {
  size();
  poke();
}).observe(stage);

applySky();
showShip();
size();
draw();
stage.dataset.ready = "yes";

type Chooser = { word(key: string): string | undefined };
const say = (key: string): string => (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage?.word(key) ?? key;
function buildWords(): void {
  bar.words = {
    play: say("buildPlay"),
    pause: say("buildPause"),
    start: say("buildStart"),
    repeat: say("buildRepeat"),
    range: say("buildRange"),
    day: say("buildDay"),
    done: say("buildDone"),
    rate: say("buildRate"),
    flight: say("buildFlight"),
  };
}
document.addEventListener("kazoku-languagechange", () => queueMicrotask(buildWords));
buildWords();
