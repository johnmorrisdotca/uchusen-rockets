// Pictures of the fleet's ships from the real model, in a real headless browser drawing in software: `node scripts/ship-03-render.ts <jobs.json> <folder>`. A job names a .glb the package made and a list of shots; each shot
// is a camera (eye, target, field of view, size) and a look, painted (physically based materials, a key light with a shadow, an environment for the metal) or line (edges over a dark fill). One browser, one WebGL context,
// the canvas kept to 4096 pixels a side and 6 megapixels, every geometry, material and texture disposed after each job. It starts a small server on port 7903 (or SHOTS_PORT) and stops it by the process it started.
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

interface Shot {
  name: string;
  eye: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** The way up on the screen; the ship lies along Y, so the default lays it flat with the dorsal side up. */
  up?: [number, number, number];
  size?: [number, number];
  look?: "painted" | "line";
  /** Radius round the target the key light's shadow covers, metres. */
  shadow?: number;
  /** Parts of the glb to hide, by node name. */
  hide?: string[];
  /** Clip everything on one side of a plane: [nx, ny, nz, d] keeps points with n.p + d >= 0. */
  clip?: [number, number, number, number];
  background?: string;
}
interface Job {
  glb: string;
  shots: Shot[];
  /** Further models drawn in the same frame, each moved by `at` (metres). */
  more?: { glb: string; at: [number, number, number]; turn?: number }[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [jobsFile, outDir] = process.argv.slice(2);
if (!jobsFile || !outDir) throw new Error("usage: node scripts/ship-03-render.ts <jobs.json> <folder>");
const jobs: Job[] = JSON.parse(readFileSync(jobsFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const MAX_SIDE = 4096;
const MAX_PIXELS = 6_000_000;

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#070c17">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
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
  scene.environmentIntensity = shot.look === "line" ? 0 : 0.8;
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
      for (const m of mats) { m.side = THREE.DoubleSide; m.clippingPlanes = planes; if (shot.look === "line") { m.color.multiplyScalar(0.18); m.metalness = 0; m.roughness = 1; m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; } }
      if (shot.look === "line") { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), new THREE.LineBasicMaterial({ color: "#8fd3ff", clippingPlanes: planes })); o.add(e); }
    } else if (o.material) { o.material.clippingPlanes = planes; }
  });
  renderer.localClippingEnabled = planes.length > 0;
  const [w, h] = shot.size ?? [1600, 900];
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  const camera = new THREE.PerspectiveCamera(shot.fov ?? 35, w / h, 0.05, 3000);
  camera.up.set(...(shot.up ?? [0, 0, 1]));
  camera.position.set(...shot.eye);
  camera.lookAt(...shot.target);
  const target = new THREE.Vector3(...shot.target);
  const dir = new THREE.Vector3(0.5, 0.7, 0.6).normalize();
  const sun = new THREE.DirectionalLight("#fff3e0", shot.look === "line" ? 0 : 2.6);
  const r = shot.shadow ?? 200;
  sun.position.copy(target).addScaledVector(dir, r * 3);
  sun.target.position.copy(target);
  sun.castShadow = shot.look !== "line";
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: r * 0.5, far: r * 7 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = r * 0.0004;
  sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight("#9fc4ff", shot.look === "line" ? 0 : 0.8); rim.position.set(-0.6, -0.2, -0.8);
  scene.add(sun, sun.target, rim, new THREE.HemisphereLight("#cfe0ff", "#1a1d24", shot.look === "line" ? 0.8 : 0.5));
  renderer.render(scene, camera);
  const info = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries };
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
const port = Number(process.env.SHOTS_PORT ?? 7903);
await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
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
      await page.locator("canvas").screenshot({ path: join(outDir, `${shot.name}.png`) });
      console.log(shot.name, JSON.stringify(info));
    }
} finally {
  await browser.close();
  server.close();
}
if (problems.length) console.error([...new Set(problems)].join("\n"));
