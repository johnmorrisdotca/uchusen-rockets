// Pictures of the fleet's ships from the real model, in a real headless browser drawing in software: `node scripts/concept-render.ts <jobs.json> <folder>`. A job names a .glb the package made and a list of shots; each shot
// is a camera (eye, target, field of view, size) and a look, painted (physically based materials, a key light with a shadow, an environment for the metal) or line (edges over a dark fill). One browser, one WebGL context,
// the canvas kept to 4096 pixels a side and 6 megapixels, every geometry, material and texture disposed after each job. It starts a small server on port 8283 (or SHOTS_PORT) and stops it by the process it started.
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { MATERIALS as KNOWN, type MaterialSpec } from "../src/model/materials.ts";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const MATERIALS: Readonly<Record<string, MaterialSpec>> = KNOWN;

interface Shot {
  name: string;
  eye: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** The way up on the screen; the ship lies along Y, so the default lays it flat with the dorsal side up. */
  up?: [number, number, number];
  size?: [number, number];
  look?: "painted" | "line" | "lit";
  /** A larger shadow normal bias (a share of the shadow radius) for a ship so big that the shadow map shows acne on its curved hulls. */
  shadowBias?: number;
  /** How strongly lit materials glow in the lit look (default 1.6). */
  glow?: number;
  /** Where the key light comes from, as a direction towards the light (default 0.5, 0.7, 0.6): the hero frames light the ship from ahead, along +Y. */
  sunDir?: [number, number, number];
  /** The key light in the lit look (default 0.3). */
  sun?: number;
  /** Radius round the target the key light's shadow covers, metres. */
  shadow?: number;
  /** Parts of the glb to hide, by node name. */
  hide?: string[];
  /** Clip everything on one side of a plane: [nx, ny, nz, d] keeps points with n.p + d >= 0. */
  clip?: [number, number, number, number];
  background?: string;
  /** A view this many metres high instead of a perspective one: front, side and top at one scale for a drawing sheet. */
  ortho?: number;
  /** Fit the camera's distance so the models fill this share of the picture's width or height (0.8 is the review's rule). */
  fill?: number;
  /** Points of the model whose place in the picture is written beside it, in pixels, for callouts. */
  points?: { id: string; at: [number, number, number] }[];
  /** The lit look: drive flames (a cone from `at` along `dir`), lights that glow (nav lights, strobes) and floodlights. */
  plumes?: { at: [number, number, number]; dir: [number, number, number]; r: number; len: number }[];
  glows?: { at: [number, number, number]; color: string; size: number }[];
  spots?: { at: [number, number, number]; target: [number, number, number]; color: string; angle: number; intensity: number }[];
}
interface Job {
  glb: string;
  shots: Shot[];
  /** Further models drawn in the same frame, each moved by `at` (metres). */
  more?: { glb: string; at: [number, number, number]; turn?: number }[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [jobsFile, outDir] = process.argv.slice(2);
if (!jobsFile || !outDir) throw new Error("usage: node scripts/concept-render.ts <jobs.json> <folder>");
const jobs: Job[] = JSON.parse(readFileSync(jobsFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const MAX_SIDE = 4096;
const MAX_PIXELS = 6_000_000;

const GLOW = JSON.stringify(Object.fromEntries(Object.entries(MATERIALS).filter(([, m]) => m.glow).map(([name, m]) => [name, { color: m.glowColor ?? m.color, strength: m.glow }])));
const OPACITY = JSON.stringify(Object.fromEntries(Object.entries(MATERIALS).filter(([, m]) => m.opacity).map(([name, m]) => [name, m.opacity])));
const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#070c17">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
const GLOW = ${GLOW};
const OPACITY = ${OPACITY};
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.append(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const loader = new GLTFLoader();
const load = (url) => new Promise((ok, no) => loader.load(url, ok, undefined, no));
const dispose = (root) => root.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) for (const one of Array.isArray(m) ? m : [m]) { for (const k of Object.keys(one)) one[k]?.isTexture && one[k].dispose(); one.dispose(); } });
window.draw = async (job, shot) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(shot.background ?? "#070c17");
  scene.environment = env;
  scene.environmentIntensity = shot.look === "line" ? 0 : shot.look === "lit" ? 0.08 : 0.8;
  const models = [];
  for (const piece of [{ glb: job.glb, at: [0, 0, 0] }, ...(job.more ?? [])]) {
    const gltf = await load(piece.glb);
    gltf.scene.position.set(...piece.at);
    if (piece.turn) gltf.scene.rotation.y = piece.turn;
    scene.add(gltf.scene);
    models.push(gltf.scene);
  }
  const hide = new Set(shot.hide ?? []);
  const planes = shot.clip ? [new THREE.Plane(new THREE.Vector3(shot.clip[0], shot.clip[1], shot.clip[2]), shot.clip[3])] : [];
  for (const model of models) model.traverse((o) => {
    if (hide.has(o.name)) o.visible = false;
    if (!o.isMesh && !o.isLine && !o.isLineSegments) return;
    if (o.isMesh) {
      o.castShadow = shot.look !== "line"; o.receiveShadow = shot.look !== "line";
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { m.side = THREE.DoubleSide; m.clippingPlanes = planes; if (OPACITY[m.name] && shot.look !== 'line') { m.transparent = true; m.opacity = shot.look === 'lit' ? OPACITY[m.name] : OPACITY[m.name] * 0.8; m.depthWrite = false; if (m.name === 'glass-clear') { m.color.set('#a9cdee'); m.metalness = 0.35; m.roughness = 0.05; m.envMapIntensity = 2.4; } } if (shot.look === 'lit') { const n = m.name || ''; const g = GLOW[n]; const glow = g ? [new THREE.Color(g.color), g.strength * (shot.glow ?? 1.6)] : null; if (glow) { m.emissive = glow[0]; m.emissiveIntensity = glow[1]; } } if (shot.look === "line") { m.color.multiplyScalar(0.18); m.metalness = 0; m.roughness = 1; m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; } }
      if (shot.look === "line") { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), new THREE.LineBasicMaterial({ color: "#8fd3ff", clippingPlanes: planes })); o.add(e); }
    } else if (o.material) { o.material.clippingPlanes = planes; }
  });
  renderer.localClippingEnabled = planes.length > 0;
  const [w, h] = shot.size ?? [1600, 900];
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  const camera = shot.ortho ? new THREE.OrthographicCamera((-shot.ortho * w) / h / 2, (shot.ortho * w) / h / 2, shot.ortho / 2, -shot.ortho / 2, 0.1, 30000) : new THREE.PerspectiveCamera(shot.fov ?? 35, w / h, 0.5, 30000);
  camera.up.set(...(shot.up ?? [0, 0, 1]));
  camera.position.set(...shot.eye);
  camera.lookAt(...shot.target);
  const target = new THREE.Vector3(...shot.target);
  const dir = new THREE.Vector3(...(shot.sunDir ?? [0.5, 0.7, 0.6])).normalize();
  const sun = new THREE.DirectionalLight("#fff3e0", shot.look === "line" ? 0 : shot.look === "lit" ? (shot.sun ?? 0.3) : 2.6);
  const r = shot.shadow ?? 200;
  sun.position.copy(target).addScaledVector(dir, r * 3);
  sun.target.position.copy(target);
  sun.castShadow = shot.look !== "line";
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: r * 0.5, far: r * 7 });
  sun.shadow.bias = shot.shadowBias ? -0.0015 : -0.0004; sun.shadow.normalBias = r * (shot.shadowBias ?? 0.0004);
  sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight("#9fc4ff", shot.look === "line" ? 0 : 0.8); rim.position.set(-0.6, -0.2, -0.8);
  scene.add(sun, sun.target, rim, new THREE.HemisphereLight("#cfe0ff", "#1a1d24", shot.look === "line" ? 0.8 : 0.5));
  if (shot.fill && !shot.ortho) {
    // the silhouette comes from the vertices themselves (a thousand or so from each mesh), not from the box round them
    const corners = [];
    for (const m of models) { m.updateMatrixWorld(true); m.traverse((o) => { if (!o.isMesh || !o.visible) return; const pos = o.geometry.attributes.position; const step = Math.max(1, Math.floor(pos.count / 400)); for (let i = 0; i < pos.count; i += step) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); corners.push(v); } }); }
    const q = new THREE.Vector3();
    for (let n = 0; n < 16; n++) {
      camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      const inv = camera.matrixWorldInverse;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, behind = false;
      for (const c of corners) {
        q.copy(c).applyMatrix4(inv);
        if (q.z > -0.5) { behind = true; break; }
        const nx = q.x / -q.z / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
        const ny = q.y / -q.z / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        if (nx < x0) x0 = nx; if (nx > x1) x1 = nx; if (ny < y0) y0 = ny; if (ny > y1) y1 = ny;
      }
      const away = camera.position.clone().sub(target);
      if (behind) { camera.position.copy(target).add(away.multiplyScalar(1.4)); continue; }
      const f = Math.max((x1 - x0) / 2, (y1 - y0) / 2) / shot.fill;
      camera.position.copy(target).add(away.multiplyScalar(f));
      // slide the picture so the silhouette sits in the middle
      const dist = camera.position.distanceTo(target);
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const upv = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const shift = right.multiplyScalar(((x0 + x1) / 2) * half * camera.aspect).add(upv.multiplyScalar(((y0 + y1) / 2) * half));
      camera.position.add(shift); target.add(shift);
    }
    camera.lookAt(target);
  }
  for (const g of shot.glows ?? []) { const m = new THREE.Mesh(new THREE.SphereGeometry(g.size, 12, 8), new THREE.MeshBasicMaterial({ color: g.color })); m.position.set(...g.at); scene.add(m); const halo = new THREE.Mesh(new THREE.SphereGeometry(g.size * 3, 12, 8), new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(...g.at); scene.add(halo); }
  for (const p of shot.plumes ?? []) {
    const dir = new THREE.Vector3(...p.dir).normalize();
    for (const [k, c, o] of [[1, '#4aa8ff', 0.16], [0.62, '#b8e4ff', 0.26], [0.3, '#ffffff', 0.5]]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(p.r * k, p.len * (0.55 + 0.45 * k), 28, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      cone.position.set(...p.at).addScaledVector(dir, (p.len * (0.55 + 0.45 * k)) / 2);
      scene.add(cone);
    }
    const light = new THREE.PointLight('#7fc4ff', 1800, p.len * 3, 1.6); light.position.set(...p.at).addScaledVector(dir, p.r * 0.6); scene.add(light);
  }
  for (const sp of shot.spots ?? []) { const l = new THREE.SpotLight(sp.color, sp.intensity, 0, sp.angle, 0.4, 1); l.position.set(...sp.at); l.target.position.set(...sp.target); scene.add(l, l.target); }
  renderer.render(scene, camera);
  camera.updateMatrixWorld();
  const points = (shot.points ?? []).map((p) => { const v = new THREE.Vector3(...p.at).project(camera); return { id: p.id, x: Math.round(((v.x + 1) / 2) * w), y: Math.round(((1 - v.y) / 2) * h), behind: v.z > 1 }; });
  const info = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, points };
  for (const model of models) dispose(model);
  scene.clear();
  return info;
};
window.ready = true;
</script>`;

const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (path === "/") return void response.writeHead(200, { "content-type": "text/html" }).end(PAGE);
  try {
    if (path.startsWith("/three/")) {
      const file = join(root, "node_modules", path);
      return void response.writeHead(200, { "content-type": "text/javascript" }).end(readFileSync(file));
    }
    if (path.startsWith("/glb/")) return void response.writeHead(200, { "content-type": "model/gltf-binary" }).end(readFileSync(resolve(path.slice(5))));
  } catch {
    // fall through to the 404
  }
  response.writeHead(404).end("no");
});
const port = Number(process.env.SHOTS_PORT ?? 8283);
await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
await acquireBrowserLock();
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const problems: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true, undefined, { timeout: 60_000 });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  });
  if (!/swiftshader/i.test(renderer)) throw new Error(`not drawing in software: ${renderer}`);
  for (const job of jobs)
    for (const shot of job.shots) {
      const [w, h] = shot.size ?? [1600, 900];
      if (Math.max(w, h) > MAX_SIDE || w * h > MAX_PIXELS) throw new Error(`${shot.name}: ${w} x ${h} is over the canvas budget`);
      await page.setViewportSize({ width: w, height: h });
      const wire = { glb: `/glb/${resolve(job.glb)}`, more: (job.more ?? []).map((m) => ({ ...m, glb: `/glb/${resolve(m.glb)}` })) };
      const info = await page.evaluate(([j, s]) => (window as unknown as { draw: (a: unknown, b: unknown) => Promise<unknown> }).draw(j, s), [wire, shot] as const);
      await page.locator("canvas").screenshot({ path: join(outDir, `${shot.name}.png`), timeout: 120_000 });
      const { points, ...rest } = info as { points: unknown[] } & Record<string, unknown>;
      if (points.length) writeFileSync(join(outDir, `${shot.name}.points.json`), JSON.stringify(points));
      console.log(shot.name, JSON.stringify(rest));
    }
} finally {
  await browser.close();
  server.close();
}
if (problems.length) console.error([...new Set(problems)].join("\n"));
