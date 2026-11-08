// Builds the repair drone's painted models in models/: `UCHUSEN_MODEL_SOURCES=<folder> node scripts/make-drone.ts`. Run by hand, never by the build; the results are committed. It takes NASA's parts as `drone/recipe.ts` says,
// moves them onto the drone, adds this package's own fine detail (the pieces of `src/model/fleet/drone`, bolts and all), and makes every material one picture: a colour picture, a metal and roughness picture and a glow picture, so the
// drone is one draw. The near file keeps every triangle; the far file is the same drone cut to a few thousand triangles and a small picture, for a drone far away.
import { Buffer } from "node:buffer";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { Document, NodeIO } from "@gltf-transform/core";
import { dedup, prune, quantize } from "@gltf-transform/functions";
import { chromium } from "@playwright/test";
import { MeshoptSimplifier } from "meshoptimizer";
import { DRONE_FILES } from "../src/model/drone.ts";
import { farPieces } from "../src/model/fleet/drone/far.ts";
import { dronePieces } from "../src/model/fleet/drone/index.ts";
import { MATERIALS } from "../src/model/materials.ts";
import { meshOf } from "../src/model/pieces.ts";
import { apply, applyNormal, type V3 } from "./drone/math.ts";
import { IMPORTS, SOURCE_FILES } from "./drone/recipe.ts";
import { type Paint, readGlb, readStl, type Tri } from "./drone/sources.ts";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const sources = process.env.UCHUSEN_MODEL_SOURCES ?? "";
if (!sources) throw new Error("UCHUSEN_MODEL_SOURCES must name the folder that holds NASA's models. They are kept outside this repository.");
const outDir = join(process.cwd(), "models");
mkdirSync(outDir, { recursive: true });
await MeshoptSimplifier.ready;

const linearToByte = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 1e-6) ** (1 / 2.4) - 0.055));
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** How each NASA material looks under light, where the file gives nothing: metal and roughness by its name. */
const looks = (key: string): { metal: number; rough: number } => {
  if (/foil|gold|kapton|silver|chrome/i.test(key)) return { metal: 0.85, rough: 0.34 };
  if (/panel|solar/i.test(key)) return { metal: 0.45, rough: 0.3 };
  if (/black|dark/i.test(key)) return { metal: 0.5, rough: 0.5 };
  return { metal: 0.35, rough: 0.5 };
};

interface Cell {
  key: string;
  w: number;
  h: number;
  x: number;
  y: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  image: string | null;
  base: string;
  mr: string;
  glow: string;
}

function pack(cells: Cell[], side: number, gap: number): boolean {
  let x = gap;
  let y = gap;
  let shelf = 0;
  for (const cell of [...cells].sort((a, b) => b.h - a.h)) {
    if (x + cell.w + gap > side) {
      x = gap;
      y += shelf + gap * 2;
      shelf = 0;
    }
    if (y + cell.h + gap > side || cell.w + gap * 2 > side) return false;
    cell.x = x;
    cell.y = y;
    x += cell.w + gap * 2;
    shelf = Math.max(shelf, cell.h);
  }
  return true;
}

// the pieces' own materials, each one a plain square
const ours = (name: string) => MATERIALS[name.slice(5) as keyof typeof MATERIALS];

/** Every triangle of the drone: NASA's, moved, and this package's own. */
/** A cloud of triangles cut to about `target`, material by material, keeping each corner's picture place. */
function reduceTris(tris: Tri[], target: number): Tri[] {
  if (tris.length <= target) return tris;
  const byMat = new Map<string, Tri[]>();
  for (const t of tris) (byMat.get(t.mat) ?? byMat.set(t.mat, []).get(t.mat) ?? []).push(t);
  const out: Tri[] = [];
  for (const [mat, group] of byMat) {
    const goal = Math.max(8, Math.round((target * group.length) / tris.length));
    if (group.length <= goal) {
      out.push(...group);
      continue;
    }
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    for (const t of group)
      for (let k = 0; k < 3; k++) {
        positions.push(...t.p[k]);
        normals.push(...t.n[k]);
        uvs.push(...t.t[k]);
      }
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3)
      for (let c = 0; c < 3; c++) {
        lo[c] = Math.min(lo[c], positions[i + c]);
        hi[c] = Math.max(hi[c], positions[i + c]);
      }
    const w = weld(positions, normals, uvs, Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1);
    const attr = new Float32Array((w.normals.length / 3) * 5);
    for (let i = 0; i < w.normals.length / 3; i++) attr.set([w.normals[i * 3], w.normals[i * 3 + 1], w.normals[i * 3 + 2], w.uvs[i * 2], w.uvs[i * 2 + 1]], i * 5);
    const [idx] = MeshoptSimplifier.simplifyWithAttributes(w.indices, w.positions, 3, attr, 5, [0.3, 0.3, 0.3, 8, 8], null, goal * 3, 0.5, ["ErrorAbsolute", "Prune"]);
    for (let i = 0; i < idx.length; i += 3) {
      const at = [idx[i], idx[i + 1], idx[i + 2]];
      out.push({
        p: at.map((v) => [w.positions[v * 3], w.positions[v * 3 + 1], w.positions[v * 3 + 2]]) as Tri["p"],
        n: at.map((v) => [w.normals[v * 3], w.normals[v * 3 + 1], w.normals[v * 3 + 2]]) as Tri["n"],
        t: at.map((v) => [w.uvs[v * 2], w.uvs[v * 2 + 1]]) as Tri["t"],
        mat,
        node: group[0].node,
      });
    }
  }
  return out;
}

async function gather(level: "near" | "far"): Promise<{ tris: Tri[]; paints: Map<string, Paint>; used: Map<string, number> }> {
  const tris: Tri[] = [];
  const paints = new Map<string, Paint>();
  const used = new Map<string, number>();
  const loaded = new Map<string, { tris: Tri[]; paints: Map<string, Paint> }>();
  for (const imp of IMPORTS) {
    if (level === "far" && !imp.far) continue;
    const src = SOURCE_FILES[imp.file];
    if (!src) throw new Error(`no source file for ${imp.file}`);
    if (!loaded.has(imp.file)) {
      const path = join(sources, src.path);
      if (src.kind === "glb") loaded.set(imp.file, await readGlb(path, imp.file));
      else loaded.set(imp.file, { tris: readStl(path, `ours:${imp.paint ?? "hull-white"}`), paints: new Map() });
    }
    const source = loaded.get(imp.file) as { tris: Tri[]; paints: Map<string, Paint> };
    const picked = source.tris.filter((t) => imp.pick(t, [0, 1, 2].map((k) => (t.p[0][k] + t.p[1][k] + t.p[2][k]) / 3) as V3));
    if (!picked.length) throw new Error(`${imp.id}: nothing picked`);
    const xf = imp.place(picked.flatMap((t) => t.p), picked);
    for (const [k, v] of source.paints) paints.set(k, v);
    const sliver = (t: Tri) => {
      const e = [0, 1, 2].map((k) => Math.hypot(...[0, 1, 2].map((c) => t.p[k][c] - t.p[(k + 1) % 3][c])));
      const h = (e[0] + e[1] + e[2]) / 2;
      return Math.max(...e) > 0.07 && Math.sqrt(Math.max(0, h * (h - e[0]) * (h - e[1]) * (h - e[2]))) < 0.00003;
    };
    const moved: Tri[] = picked.map((t) => ({ ...t, p: t.p.map((p) => apply(xf, p)) as Tri["p"], n: t.n.map((n) => applyNormal(xf, n)) as Tri["n"], mat: imp.paint && src.kind === "stl" ? `ours:${imp.paint}` : t.mat })).filter((t) => !(imp.noSlivers && sliver(t)));
    tris.push(...(level === "far" ? reduceTris(moved, imp.far as number) : moved));
    used.set(imp.credit, (used.get(imp.credit) ?? 0) + picked.length);
    console.log(`  ${imp.id}: ${picked.length} triangles from ${src.path}`);
  }
  // this package's own pieces, with the fine detail
  const mesh = meshOf(level === "far" ? farPieces() : dronePieces(false, true));
  let own = 0;
  for (const [name, b] of mesh.faces) {
    for (let i = 0; i < b.indices.length; i += 3) {
      const at = [0, 1, 2].map((k) => b.indices[i + k]);
      tris.push({
        p: at.map((v) => [b.positions[v * 3], b.positions[v * 3 + 1], b.positions[v * 3 + 2]]) as Tri["p"],
        n: at.map((v) => [b.normals[v * 3], b.normals[v * 3 + 1], b.normals[v * 3 + 2]]) as Tri["n"],
        t: [[0, 0], [0, 0], [0, 0]],
        mat: `ours:${name}`,
        node: "code",
      });
      own++;
    }
  }
  console.log(`  this package's pieces: ${own} triangles`);
  return { tris, paints, used };
}

await acquireBrowserLock();
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], timeout: 60_000 });
const page = await browser.newPage();

/** The three pictures from the cells, and the cells' places in them. */
async function pictures(tris: Tri[], paints: Map<string, Paint>, biggest: number, shrink: number): Promise<{ base: Uint8Array; mr: Uint8Array; glow: Uint8Array; side: number; cells: Cell[] }> {
  const bounds = new Map<string, [number, number, number, number]>();
  for (const t of tris)
    for (const [u, v] of t.t) {
      const b = bounds.get(t.mat) ?? [Infinity, Infinity, -Infinity, -Infinity];
      bounds.set(t.mat, [Math.min(b[0], u), Math.min(b[1], v), Math.max(b[2], u), Math.max(b[3], v)]);
    }
  const cells: Cell[] = [];
  for (const [key, [u0, v0, u1, v1]] of bounds) {
    if (key.startsWith("ours:")) {
      const spec = ours(key);
      const [r, g, b] = hex(spec.color);
      const glow = "glow" in spec ? hex((spec as { glowColor?: string }).glowColor ?? spec.color) : [0, 0, 0];
      cells.push({ key, w: 4, h: 4, x: 0, y: 0, u0, v0, u1, v1, image: null, base: `rgb(${r},${g},${b})`, mr: `rgb(0,${Math.round(spec.rough * 255)},${Math.round(spec.metal * 255)})`, glow: `rgb(${glow.join(",")})` });
      continue;
    }
    const paint = paints.get(key) as Paint;
    const look = looks(key);
    const mr = `rgb(0,${Math.round(look.rough * 255)},${Math.round(look.metal * 255)})`;
    if (paint.image) {
      const data = `data:${paint.image.mime};base64,${Buffer.from(paint.image.bytes).toString("base64")}`;
      const size = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return [img.naturalWidth, img.naturalHeight];
      }, data);
      const w = Math.max(4, Math.round(Math.max(u1 - u0, 1e-4) * size[0] * shrink));
      const h = Math.max(4, Math.round(Math.max(v1 - v0, 1e-4) * size[1] * shrink));
      cells.push({ key, w, h, x: 0, y: 0, u0, v0, u1, v1, image: data, base: "", mr, glow: "rgb(0,0,0)" });
    } else cells.push({ key, w: 4, h: 4, x: 0, y: 0, u0, v0, u1, v1, image: null, base: `rgb(${paint.colour.map(linearToByte).join(",")})`, mr, glow: "rgb(0,0,0)" });
  }
  const gap = 2;
  let side = 64;
  while (side < biggest && !pack(cells, side, gap)) side *= 2;
  while (!pack(cells, side, gap))
    for (const cell of cells)
      if (cell.image) {
        cell.w = Math.max(4, Math.floor(cell.w * 0.92));
        cell.h = Math.max(4, Math.floor(cell.h * 0.92));
      }
  const result = await page.evaluate(
    async ({ cells, side, gap }) => {
      const make = () => {
        const c = document.createElement("canvas");
        c.width = c.height = side;
        return c;
      };
      const [base, mr, glow] = [make(), make(), make()];
      const [b, m, g] = [base, mr, glow].map((c) => c.getContext("2d") as CanvasRenderingContext2D);
      b.fillStyle = "#808080";
      b.fillRect(0, 0, side, side);
      m.fillStyle = "rgb(0,128,100)";
      m.fillRect(0, 0, side, side);
      g.fillStyle = "#000";
      g.fillRect(0, 0, side, side);
      for (const cell of cells) {
        m.fillStyle = cell.mr;
        m.fillRect(cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
        g.fillStyle = cell.glow;
        g.fillRect(cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
        if (!cell.image) {
          b.fillStyle = cell.base;
          b.fillRect(cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
          continue;
        }
        const img = new Image();
        img.src = cell.image;
        await img.decode();
        const [W, H] = [img.naturalWidth, img.naturalHeight];
        const clean = document.createElement("canvas");
        clean.width = W;
        clean.height = H;
        const c = clean.getContext("2d") as CanvasRenderingContext2D;
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, W, H);
        c.drawImage(img, 0, 0);
        const cell2 = document.createElement("canvas");
        cell2.width = cell.w;
        cell2.height = cell.h;
        const d = cell2.getContext("2d") as CanvasRenderingContext2D;
        const [su, sv] = [cell.w / (cell.u1 - cell.u0), cell.h / (cell.v1 - cell.v0)];
        for (let i = Math.floor(cell.u0); i < Math.ceil(cell.u1); i++) for (let j = Math.floor(cell.v0); j < Math.ceil(cell.v1); j++) d.drawImage(clean, (i - cell.u0) * su, (j - cell.v0) * sv, su, sv);
        b.drawImage(cell2, cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
        b.drawImage(cell2, cell.x, cell.y);
      }
      return { base: base.toDataURL("image/jpeg", 0.86).split(",")[1], mr: mr.toDataURL("image/png").split(",")[1], glow: glow.toDataURL("image/png").split(",")[1] };
    },
    { cells, side, gap },
  );
  return { base: new Uint8Array(Buffer.from(result.base, "base64")), mr: new Uint8Array(Buffer.from(result.mr, "base64")), glow: new Uint8Array(Buffer.from(result.glow, "base64")), side, cells };
}

/** Joins vertices that are the same to within a tenth of a millimetre per metre, so a simplifier sees one surface. */
function weld(positions: number[], normals: number[], uvs: number[], size: number) {
  const seen = new Map<string, number>();
  const count = positions.length / 3;
  const indices = new Uint32Array(count);
  const P: number[] = [];
  const N: number[] = [];
  const T: number[] = [];
  const grid = 10000 / size;
  for (let i = 0; i < count; i++) {
    const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const [a, b, c] = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
    const [u, v] = [uvs[i * 2], uvs[i * 2 + 1]];
    const key = `${Math.round(x * grid)},${Math.round(y * grid)},${Math.round(z * grid)}|${Math.round(a * 50)},${Math.round(b * 50)},${Math.round(c * 50)}|${Math.round(u * 8192)},${Math.round(v * 8192)}`;
    let at = seen.get(key);
    if (at === undefined) {
      at = P.length / 3;
      seen.set(key, at);
      P.push(x, y, z);
      N.push(a, b, c);
      T.push(u, v);
    }
    indices[i] = at;
  }
  return { positions: new Float32Array(P), normals: new Float32Array(N), uvs: new Float32Array(T), indices };
}

const io = new NodeIO();

async function build(level: "near" | "far", whole: { tris: Tri[]; paints: Map<string, Paint>; used: Map<string, number> }): Promise<{ file: string; triangles: number; bytes: number; box: number[] }> {
  const { tris, paints } = whole;
  const pics = await pictures(tris, paints, level === "near" ? 2048 : 512, level === "near" ? 1 : 0.25);
  const cellOf = new Map(pics.cells.map((c) => [c.key, c]));
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const t of tris) {
    const cell = cellOf.get(t.mat) as Cell;
    const [du, dv] = [Math.max(cell.u1 - cell.u0, 1e-9), Math.max(cell.v1 - cell.v0, 1e-9)];
    for (let k = 0; k < 3; k++) {
      positions.push(...t.p[k]);
      normals.push(...t.n[k]);
      if (cell.image) uvs.push((cell.x + ((t.t[k][0] - cell.u0) / du) * cell.w) / pics.side, (cell.y + ((t.t[k][1] - cell.v0) / dv) * cell.h) / pics.side);
      else uvs.push((cell.x + cell.w / 2) / pics.side, (cell.y + cell.h / 2) / pics.side);
    }
  }
  // each triangle turned to agree with its normals: the files' windings are not to be trusted
  for (let f = 0; f < positions.length / 9; f++) {
    const [a, b, c] = [f * 3, f * 3 + 1, f * 3 + 2];
    const u = [0, 1, 2].map((k) => positions[b * 3 + k] - positions[a * 3 + k]);
    const v = [0, 1, 2].map((k) => positions[c * 3 + k] - positions[a * 3 + k]);
    const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const mean = [0, 1, 2].map((k) => normals[a * 3 + k] + normals[b * 3 + k] + normals[c * 3 + k]);
    if (g[0] * mean[0] + g[1] * mean[1] + g[2] * mean[2] >= 0) continue;
    for (let k = 0; k < 3; k++) [positions[b * 3 + k], positions[c * 3 + k]] = [positions[c * 3 + k], positions[b * 3 + k]];
    for (let k = 0; k < 3; k++) [normals[b * 3 + k], normals[c * 3 + k]] = [normals[c * 3 + k], normals[b * 3 + k]];
    for (let k = 0; k < 2; k++) [uvs[b * 2 + k], uvs[c * 2 + k]] = [uvs[c * 2 + k], uvs[b * 2 + k]];
  }
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
      for (let c = 0; c < 3; c++) {
        lo[c] = Math.min(lo[c], positions[i + c]);
        hi[c] = Math.max(hi[c], positions[i + c]);
      }
  // the lowest point stands on y = 0
  const drop = lo[1];
  for (let i = 1; i < positions.length; i += 3) positions[i] -= drop;
  hi[1] -= drop;
  lo[1] = 0;
  const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  const w = weld(positions, normals, uvs, size);
  const indices: Uint32Array = w.indices;
  // only the vertices still used
  const map = new Map<number, number>();
  const out = new Uint32Array(indices.length);
  const P: number[] = [];
  const N: number[] = [];
  const T: number[] = [];
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    let at = map.get(v);
    if (at === undefined) {
      at = P.length / 3;
      map.set(v, at);
      P.push(w.positions[v * 3], w.positions[v * 3 + 1], w.positions[v * 3 + 2]);
      N.push(w.normals[v * 3], w.normals[v * 3 + 1], w.normals[v * 3 + 2]);
      T.push(w.uvs[v * 2], w.uvs[v * 2 + 1]);
    }
    out[i] = at;
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("drone");
  const root = doc.createNode("drone");
  scene.addChild(root);
  const mesh = doc.createMesh("drone");
  root.setMesh(mesh);
  const tex = (name: string, bytes: Uint8Array, mime: string) => doc.createTexture(name).setImage(bytes).setMimeType(mime);
  const material = doc
    .createMaterial("atlas")
    .setBaseColorFactor([1, 1, 1, 1])
    .setMetallicFactor(1)
    .setRoughnessFactor(1)
    .setEmissiveFactor([1, 1, 1])
    .setDoubleSided(true)
    .setBaseColorTexture(tex("atlas", pics.base, "image/jpeg"))
    .setMetallicRoughnessTexture(tex("metal-rough", pics.mr, "image/png"))
    .setEmissiveTexture(tex("glow", pics.glow, "image/png"));
  mesh.addPrimitive(
    doc
      .createPrimitive()
      .setMaterial(material)
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(P)).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(N)).setBuffer(buffer))
      .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(T)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(out).setBuffer(buffer)),
  );
  doc.getRoot().getAsset().generator = "uchusen-rockets";
  doc.getRoot().getAsset().extras = {
    title: "SPX repair drone, built from NASA's Cluster II, High Energy Transient Explorer, Curiosity rover, InSight lander and Grease Gun models",
    author: "NASA",
    license: "Public domain, NASA (https://www.nasa.gov/nasa-brand-center/images-and-media/)",
    source: "https://science.nasa.gov/3d-resources/cluster-ii/ https://science.nasa.gov/3d-resources/high-energy-transient-explorer/ https://science.nasa.gov/3d-resources/curiosity-rover-detailed/ https://science.nasa.gov/3d-resources/insight-cruise-lander/ https://science.nasa.gov/3d-resources/grease-gun/",
    changes: `Each model cut down to the parts used and moved onto the drone, scaled to its size; no mark of NASA's was on any of them and none is in this file, with the lettering and flag plates left out; the Curiosity parts, which have no picture, painted by this package; every material made into one picture with this package's own detail, which is not NASA's. The ${level} level.`,
    part: "drone",
    level,
  };
  await doc.transform(dedup(), prune({ keepAttributes: true }), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12, pattern: /^(POSITION|NORMAL|TEXCOORD_0)$/ }));
  const file = join(outDir, DRONE_FILES[level]);
  writeFileSync(file, await io.writeBinary(doc));
  const box = hi.map((v, i) => Number((v - lo[i]).toFixed(3)));
  console.log(`${DRONE_FILES[level]}  ${(statSync(file).size / 1024).toFixed(0)} KB (picture ${pics.side} px)  ${out.length / 3} triangles  x y z ${box.join(" ")} m`);
  return { file, triangles: out.length / 3, bytes: statSync(file).size, box };
}

try {
  const whole = await gather("near");
  if (process.env.DEBUG_THIN) {
    const seen = new Map<string, number>();
    for (const t of whole.tris) {
      const e = [0, 1, 2].map((k) => Math.hypot(...[0, 1, 2].map((c) => t.p[k][c] - t.p[(k + 1) % 3][c])));
      const long = Math.max(...e);
      const s2 = (e[0] + e[1] + e[2]) / 2;
      const area = Math.sqrt(Math.max(0, s2 * (s2 - e[0]) * (s2 - e[1]) * (s2 - e[2])));
      if (long > 0.07 && area < 0.00003) seen.set(`${t.node} ${t.mat} ${t.p[0].map((v) => v.toFixed(2)).join(",")}`, (seen.get(`${t.node} ${t.mat}`) ?? 0) + 1);
    }
    console.log([...seen.keys()].slice(0, 20).join("\n"));
  }
  const near = await build("near", whole);
  const far = await build("far", await gather("far"));
  writeFileSync(join(outDir, "..", "docs", "fleet", "drone-numbers.json"), `${JSON.stringify({ near: { triangles: near.triangles, bytes: near.bytes, box: near.box }, far: { triangles: far.triangles, bytes: far.bytes, box: far.box }, credits: Object.fromEntries(whole.used) }, null, 2)}\n`);
} finally {
  await browser.close();
}
void readFileSync;
