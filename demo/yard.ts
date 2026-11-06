// The yard on a page: one mesh for the bays and one for the spine that can leave, drawn only when the view changes.
import { AmbientLight, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer, SRGBColorSpace } from "three";
import "@johnmorrisdotca/kazoku-ui/speed-buttons/define";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { buildOf } from "../src/buildPlay.ts";
import { defineUchusenBuild, type UchusenBuild } from "../src/buildbar.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import type { ViewChoice } from "../src/framing.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../src/model/falcon.ts";
import { cub, place } from "../src/model/fleet/kaminari-concepts/adapter.ts";
import { docked } from "../src/model/fleet/kaminari-concepts/c.ts";
import { MATERIALS, type MaterialName, type MaterialSpec } from "../src/model/materials.ts";
import { meshOf, type PartMesh, type Piece } from "../src/model/pieces.ts";
import { BAYS, yardFixed, yardLoose } from "../src/model/fleet/shipyard-concepts/multibay.ts";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";

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
const host = document.querySelector<HTMLElement>("#bay-ship")!;
const buildRow = document.querySelector<HTMLElement>("#yard-build")!;
const bar = document.querySelector<UchusenBuild>("#build-bar")!;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A hull block the wide shot can read. The build player draws the real ship. */
function hull(at: readonly [number, number, number], length: number, beam: number, height: number): Piece[] {
  const [x, y, z] = at;
  const b = beam / 2;
  const h = height / 2;
  return [cub("hull-white", [x - b, x + b], [y, y + length * 0.86], [z - h * 0.3, z + h]), cub("hull-grey", [x - b * 0.72, x + b * 0.72], [y + length * 0.8, y + length], [z, z + h * 1.15])];
}

const dragon = DRAGON_DRAWS["dragon-2"];
const dragonNose = dragon.trunk + dragon.capsule - dragon.nest;
const visitor = place([...trunk(dragon), ...place(capsule(dragon), { at: [0, dragon.trunk - dragon.nest, 0] })], { at: [-980, 150 - dragonNose - 4, -22] });
const miyamoto = docked("miyamoto", 1, "coarse");
const fixedMesh = meshOf([...yardFixed(), ...place(miyamoto, { at: [...BAYS.spine.shipAt] }), ...hull(BAYS.hall.shipAt, 1100, 140, 80), ...hull(BAYS.dock.shipAt, 611, 110, 70), ...visitor]);
const looseMesh = meshOf([...yardLoose(), ...place(miyamoto, { at: [...BAYS.loose.shipAt] })]);
const scene = new Scene();
const camera = new PerspectiveCamera(38, 1, 1, 16_000);
camera.up.set(0, 0, 1);
const sun = new DirectionalLight(0xffffff, 1.15);
sun.position.set(400, -900, 700);
scene.add(sun, new AmbientLight(0xffffff, 0.55));
const root = new Group();
const loose = new Group();
scene.add(root);

const glow: { material: MeshStandardMaterial; color: string; amount: number }[] = [];

function addMesh(mesh: PartMesh, parent: Group): void {
  for (const [name, buffers] of mesh.faces) {
    if (buffers.indices.length === 0) continue;
    const spec: MaterialSpec = MATERIALS[name as MaterialName];
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(buffers.positions, 3));
    if (buffers.normals.length === buffers.positions.length) geometry.setAttribute("normal", new Float32BufferAttribute(buffers.normals, 3));
    geometry.setIndex(buffers.indices);
    const material = new MeshStandardMaterial({
      color: spec.color,
      metalness: spec.metal,
      roughness: spec.rough,
      transparent: (spec.opacity ?? 1) < 1,
      opacity: spec.opacity ?? 1,
      depthWrite: (spec.opacity ?? 1) > 0.5,
    });
    if (spec.glow) glow.push({ material, color: spec.glowColor ?? spec.color, amount: spec.glow });
    parent.add(new Mesh(geometry, material));
  }
}

addMesh(fixedMesh, root);
addMesh(looseMesh, loose);
root.add(loose);

const shots: Record<ShotId, Eye> = {
  whole: { at: [400, 700, 40], eye: [480, -2500, 1200], fov: 48 },
  hall: { at: [0, 700, 20], eye: [160, -40, 320], fov: 34 },
  spine: { at: [760, 500, 0], eye: [980, 20, 300], fov: 34 },
  dock: { at: [1520, 600, 20], eye: [1760, 40, 320], fov: 34 },
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

function applySky(): void {
  const night = sky === "night";
  sun.intensity = night ? 0.08 : 1.15;
  scene.background = new Color(night ? "#05070d" : "#9eb0c4");
  for (const lamp of glow) {
    lamp.material.emissive = new Color(night ? lamp.color : "#000000");
    lamp.material.emissiveIntensity = night ? lamp.amount * 0.35 : 0;
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

const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setClearColor("#9eb0c4");

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
}

function draw(): void {
  loose.position.x = looseNow;
  aim();
  renderer.render(scene, camera);
}

function poke(): void {
  if (queued || document.hidden) return;
  queued = requestAnimationFrame(() => {
    queued = 0;
    draw();
  });
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

function showShip(): void {
  host.replaceChildren();
  if (!building) {
    host.hidden = true;
    buildRow.hidden = true;
    stage.dataset.build = "off";
    return;
  }
  const chosen = SHIPS[ship] ?? SHIPS.hall!;
  const rocket = document.createElement("uchusen-rocket") as UchusenRocket;
  rocket.setAttribute("rocket", chosen.rocket);
  rocket.setAttribute("variant", chosen.variant);
  rocket.setAttribute("look", "line");
  rocket.setAttribute("build", "on");
  rocket.setAttribute("lights", "off");
  rocket.setAttribute("spin", "off");
  host.append(rocket);
  host.hidden = false;
  buildRow.hidden = false;
  stage.dataset.build = "on";
  const steps = buildOf(chosen.variant) ?? [];
  bar.steps = steps;
  bar.onMove = (at) => rocket.setAttribute("progress", at.toFixed(4));
  bar.onRepeat = () => undefined;
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

document.querySelector("#view-bar")!.addEventListener("kazoku-viewchange", (event) => {
  choice = (event as CustomEvent<ViewChoice>).detail;
  poke();
});

canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  if (queued) cancelAnimationFrame(queued);
  queued = 0;
});

new ResizeObserver(() => {
  size();
  poke();
}).observe(stage);

applySky();
size();
draw();
stage.dataset.ready = "yes";
