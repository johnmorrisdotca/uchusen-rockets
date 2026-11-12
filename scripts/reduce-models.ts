// Turns the licensed models (kept outside this repository) into the small parts in models/. Run by hand, never by the build: `pnpm models`. The results are committed; CI never sees the sources.
//
// What it does to a model: every triangle is moved to the one convention of this package (metres, Y up, the part's base on the axis at y = 0, the windward side towards +Z), scaled to the sourced
// sizes, sorted into parts and into the shared material names, simplified, and written with packed positions (KHR_mesh_quantization, which needs no decoder). Logos never get through: a primitive whose
// material or texture carries one is dropped, and only the images named here are carried over.
//
//   UCHUSEN_MODEL_SOURCES=<folder> node scripts/reduce-models.ts [only]
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { Document, type Material as GMaterial, type Node as GNode, NodeIO, type Primitive, type Texture } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { chromium } from "@playwright/test";
import { MODEL_RECIPES, ROADSTER_RECIPES, type ModelRecipe, type Patch, type Piece, type RecipePart } from "./model-recipes.ts";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const sources: string = process.env.UCHUSEN_MODEL_SOURCES ?? "";
if (!sources) throw new Error("UCHUSEN_MODEL_SOURCES must name the folder that holds the source models. They are kept outside this repository.");
const outDir = join(process.cwd(), "models");
mkdirSync(outDir, { recursive: true });
const only = process.argv[2];
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
await MeshoptSimplifier.ready;

interface Bucket {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  hasUv: boolean;
}

const newBucket = (): Bucket => ({ positions: [], normals: [], uvs: [], indices: [], hasUv: false });

/** Reads one primitive's triangles into a bucket, moved by the node's matrix then by `place`. */
function take(bucket: Bucket, prim: Primitive, node: GNode, place: (p: number[], n: number[]) => void, keepUv: boolean, only?: readonly number[]): void {
  const pos = prim.getAttribute("POSITION");
  const nor = prim.getAttribute("NORMAL");
  const uv = prim.getAttribute("TEXCOORD_0");
  if (!pos || !nor) return;
  const m = node.getWorldMatrix();
  const base = bucket.positions.length / 3;
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, a);
    nor.getElement(i, b);
    const p = [0, 1, 2].map((k) => m[k] * a[0] + m[4 + k] * a[1] + m[8 + k] * a[2] + m[12 + k]);
    const n = [0, 1, 2].map((k) => m[k] * b[0] + m[4 + k] * b[1] + m[8 + k] * b[2]);
    place(p, n);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    bucket.positions.push(p[0], p[1], p[2]);
    bucket.normals.push(n[0] / len, n[1] / len, n[2] / len);
    if (keepUv && uv) {
      uv.getElement(i, c);
      bucket.uvs.push(c[0], c[1]);
    } else bucket.uvs.push(0, 0);
  }
  if (keepUv && uv) bucket.hasUv = true;
  // the source's materials are double-sided and its windings are not to be trusted: each triangle is turned to agree with its own normals
  const idx = prim.getIndices();
  const count = idx ? idx.getCount() : pos.getCount();
  const at = (i: number) => base + (idx ? idx.getScalar(i) : i);
  const P = bucket.positions;
  const N = bucket.normals;
  const triangles = only ?? Array.from({ length: Math.floor(count / 3) }, (_, k) => k);
  for (const k of triangles) {
    const i = k * 3;
    const [a0, b0, c0] = [at(i), at(i + 1), at(i + 2)];
    const u = [P[b0 * 3] - P[a0 * 3], P[b0 * 3 + 1] - P[a0 * 3 + 1], P[b0 * 3 + 2] - P[a0 * 3 + 2]];
    const v = [P[c0 * 3] - P[a0 * 3], P[c0 * 3 + 1] - P[a0 * 3 + 1], P[c0 * 3 + 2] - P[a0 * 3 + 2]];
    const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const mean = [0, 1, 2].map((k) => N[a0 * 3 + k] + N[b0 * 3 + k] + N[c0 * 3 + k]);
    if (g[0] * mean[0] + g[1] * mean[1] + g[2] * mean[2] < 0) bucket.indices.push(a0, c0, b0);
    else bucket.indices.push(a0, b0, c0);
  }
}

/** A merged mesh's connected pieces: which triangles touch, at the same point in space, and the box each fills in the file's own units. */
function connectedPieces(prim: Primitive, node: GNode): Piece[] {
  const pos = prim.getAttribute("POSITION");
  const idx = prim.getIndices();
  if (!pos || !idx) return [];
  const m = node.getWorldMatrix();
  const points: number[][] = [];
  const el = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, el);
    points.push([0, 1, 2].map((k) => m[k] * el[0] + m[4 + k] * el[1] + m[8 + k] * el[2] + m[12 + k]));
  }
  const same = new Map<string, number>();
  const ids = points.map((p) => {
    const key = p.map((v) => Math.round(v * 1000)).join();
    if (!same.has(key)) same.set(key, same.size);
    return same.get(key) as number;
  });
  const parent = Array.from({ length: same.size }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const triangleCount = idx.getCount() / 3;
  for (let t = 0; t < triangleCount; t++) {
    const a = ids[idx.getScalar(t * 3)];
    parent[find(a)] = find(ids[idx.getScalar(t * 3 + 1)]);
    parent[find(a)] = find(ids[idx.getScalar(t * 3 + 2)]);
  }
  const pieces = new Map<number, Piece>();
  for (let t = 0; t < triangleCount; t++) {
    const first = idx.getScalar(t * 3);
    const root = find(ids[first]);
    let piece = pieces.get(root);
    if (!piece) {
      piece = { triangles: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      pieces.set(root, piece);
    }
    piece.triangles.push(t);
    for (const v of [first, idx.getScalar(t * 3 + 1), idx.getScalar(t * 3 + 2)])
      for (let c = 0; c < 3; c++) {
        piece.min[c] = Math.min(piece.min[c], points[v][c]);
        piece.max[c] = Math.max(piece.max[c], points[v][c]);
      }
  }
  return [...pieces.values()];
}

/** Each triangle's material from `split`, given its middle and its facing in the file's own units. */
function splitTriangles(prim: Primitive, node: GNode, material: string, split: NonNullable<ModelRecipe["split"]>): Map<string, number[]> {
  const pos = prim.getAttribute("POSITION");
  const idx = prim.getIndices();
  const out = new Map<string, number[]>();
  if (!pos) return out;
  const m = node.getWorldMatrix();
  const el = [0, 0, 0];
  const world = (i: number) => {
    pos.getElement(i, el);
    return [0, 1, 2].map((k) => m[k] * el[0] + m[4 + k] * el[1] + m[8 + k] * el[2] + m[12 + k]);
  };
  const count = Math.floor((idx ? idx.getCount() : pos.getCount()) / 3);
  for (let t = 0; t < count; t++) {
    const [a, b, c] = [0, 1, 2].map((k) => world(idx ? idx.getScalar(t * 3 + k) : t * 3 + k));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(g[0], g[1], g[2]) || 1;
    const name = split(material, [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3), [g[0] / len, g[1] / len, g[2] / len]);
    if (!out.has(name)) out.set(name, []);
    (out.get(name) as number[]).push(t);
  }
  return out;
}

/** Joins vertices that are the same to within a millimetre, so a simplifier sees one surface. */
function weld(bucket: Bucket): { positions: Float32Array<ArrayBuffer>; normals: Float32Array<ArrayBuffer>; uvs: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer> } {
  const seen = new Map<string, number>();
  const remap = new Uint32Array(bucket.positions.length / 3);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < remap.length; i++) {
    const p = bucket.positions.slice(i * 3, i * 3 + 3);
    const n = bucket.normals.slice(i * 3, i * 3 + 3);
    const t = bucket.uvs.slice(i * 2, i * 2 + 2);
    const key = `${p.map((v) => Math.round(v * 1000)).join()}|${n.map((v) => Math.round(v * 50)).join()}|${bucket.hasUv ? t.map((v) => Math.round(v * 2048)).join() : ""}`;
    let at = seen.get(key);
    if (at === undefined) {
      at = positions.length / 3;
      seen.set(key, at);
      positions.push(...p);
      normals.push(...n);
      uvs.push(...t);
    }
    remap[i] = at;
  }
  const indices = new Uint32Array(bucket.indices.length);
  for (let i = 0; i < indices.length; i++) indices[i] = remap[bucket.indices[i]];
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices };
}

/** Simplifies to `ratio` of the triangles, with `error` in metres as the most it may move the surface. Normals count, so hard edges stay. */
function reduce(bucket: Bucket, ratio: number, error: number, lockBorder = false, holdPicture = false): { positions: Float32Array<ArrayBuffer>; normals: Float32Array<ArrayBuffer>; uvs: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer> } {
  const w = weld(bucket);
  let indices: Uint32Array = w.indices;
  if (ratio < 1 && w.indices.length > 3) {
    const target = Math.max(3, Math.floor((w.indices.length * ratio) / 3) * 3);
    if (holdPicture) {
      // a picture cut into thousands of islands: its coordinates weigh so much that an edge moves only along what it shows, which frees far more triangles than locking every edge of every island
      const n = w.positions.length / 3;
      const attributes = new Float32Array(n * 5);
      for (let i = 0; i < n; i++) attributes.set([w.normals[i * 3], w.normals[i * 3 + 1], w.normals[i * 3 + 2], w.uvs[i * 2], w.uvs[i * 2 + 1]], i * 5);
      [indices] = MeshoptSimplifier.simplifyWithAttributes(w.indices, w.positions, 3, attributes, 5, [0.2, 0.2, 0.2, 30, 30], null, target, error, ["ErrorAbsolute"]);
    } else [indices] = MeshoptSimplifier.simplifyWithAttributes(w.indices, w.positions, 3, w.normals, 3, [0.4, 0.4, 0.4], null, target, error, lockBorder ? ["ErrorAbsolute", "LockBorder"] : ["ErrorAbsolute"]);
  }
  // only the vertices still used
  const map = new Map<number, number>();
  const out = new Uint32Array(indices.length);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    let at = map.get(v);
    if (at === undefined) {
      at = positions.length / 3;
      map.set(v, at);
      positions.push(w.positions[v * 3], w.positions[v * 3 + 1], w.positions[v * 3 + 2]);
      normals.push(w.normals[v * 3], w.normals[v * 3 + 1], w.normals[v * 3 + 2]);
      uvs.push(w.uvs[v * 2], w.uvs[v * 2 + 1]);
    }
    out[i] = at;
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), uvs: new Float32Array(uvs), indices: out };
}

/** An image's bytes at `size` pixels in its longest side as a JPEG, through the Mac's own sips: this script runs by hand on a Mac. */
function jpegOf(bytes: Uint8Array, size: number): Uint8Array {
  const scratch = mkdtempSync(join(tmpdir(), "uchusen-tex-"));
  const from = join(scratch, "from");
  writeFileSync(from, bytes);
  const out = join(scratch, "t.jpg");
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", String(size), from, "--out", out], { stdio: "ignore" });
  return new Uint8Array(readFileSync(out));
}

async function runRecipe(recipe: ModelRecipe): Promise<void> {
  const doc = await io.read(join(sources, recipe.file));
  const extras = doc.getRoot().getAsset().extras as Record<string, string>;
  const nodes: GNode[] = [];
  const walk = (node: GNode) => {
    nodes.push(node);
    node.listChildren().forEach(walk);
  };
  for (const scene of doc.getRoot().listScenes()) scene.listChildren().forEach(walk);

  const parts = new Map<string, Map<string, Bucket>>();
  const putInto = (part: RecipePart, material: string): Bucket => {
    if (!parts.has(part.id)) parts.set(part.id, new Map());
    const buckets = parts.get(part.id) as Map<string, Bucket>;
    if (!buckets.has(material)) buckets.set(material, newBucket());
    return buckets.get(material) as Bucket;
  };
  let inTris = 0;
  const dropped = new Map<string, number>();
  for (const node of nodes) {
    const m = node.getWorldMatrix();
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const from = prim.getMaterial()?.getName() ?? "";
      const tris = (prim.getIndices()?.getCount() ?? 0) / 3;
      inTris += tris;
      const material = typeof recipe.materials === "function" ? recipe.materials(from, prim.getMaterial() as GMaterial, node.getName()) : recipe.materials[from];
      if (material === null || material === undefined) {
        if (material === undefined) throw new Error(`${recipe.id}: nobody decided about the material "${from}"`);
        dropped.set(from, (dropped.get(from) ?? 0) + tris);
        continue;
      }
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const el = [0, 0, 0];
      let sum = 0;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, el);
        sum += m[1] * el[0] + m[5] * el[1] + m[9] * el[2] + m[13];
      }
      if (recipe.pieces) {
        // one merged mesh: its connected pieces, each to the part its place says
        for (const piece of connectedPieces(prim, node)) {
          const part = recipe.pieces(piece);
          take(putInto(part, material), prim, node, part.place, Boolean(recipe.textures?.[material]), piece.triangles);
        }
        continue;
      }
      let part: RecipePart = recipe.partAt(sum / pos.getCount(), node.getName());
      if (recipe.split) {
        // one source material shared by two of ours: each triangle goes where its place and its facing say
        const groups = new Map<string, number[]>();
        for (const [name, triangles] of splitTriangles(prim, node, material, recipe.split)) groups.set(name, triangles);
        for (const [name, triangles] of groups) take(putInto(part, name), prim, node, part.place, Boolean(recipe.textures?.[name]), triangles);
        continue;
      }
      if (recipe.wholeNodes || recipe.hidden) {
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, el);
          for (let c = 0; c < 3; c++) {
            const v = m[c] * el[0] + m[4 + c] * el[1] + m[8 + c] * el[2] + m[12 + c];
            lo[c] = Math.min(lo[c], v);
            hi[c] = Math.max(hi[c], v);
          }
        }
        if (recipe.hidden?.(from, lo, hi)) {
          dropped.set(`${from} (hidden)`, (dropped.get(`${from} (hidden)`) ?? 0) + tris);
          continue;
        }
        if (recipe.wholeNodes) part = recipe.wholeNodes(lo, hi);
      }
      take(putInto(part, material), prim, node, part.place, Boolean(recipe.textures?.[material]));
    }
  }

  for (const [partId, buckets] of parts) {
    const out = new Document();
    const buffer = out.createBuffer();
    const scene = out.createScene(partId);
    const root = out.createNode(partId);
    scene.addChild(root);
    const mesh = out.createMesh(partId);
    root.setMesh(mesh);
    let outTris = 0;
    const budget = recipe.budgets[partId] ?? {};
    const lo = [1e9, 1e9, 1e9];
    const hi = [-1e9, -1e9, -1e9];
    for (const [name, bucket] of buckets) {
      const { ratio, error } = budget[name] ?? budget["*"] ?? { ratio: 0.2, error: 0.02 };
      const r = reduce(bucket, ratio, error, recipe.lockBorder, recipe.holdPicture);
      if (r.indices.length === 0) continue;
      outTris += r.indices.length / 3;
      for (let i = 0; i < r.positions.length; i += 3)
        for (let c = 0; c < 3; c++) {
          lo[c] = Math.min(lo[c], r.positions[i + c]);
          hi[c] = Math.max(hi[c], r.positions[i + c]);
        }
      const spec = recipe.materialSpec[name];
      const material: GMaterial = out.createMaterial(name).setBaseColorFactor([...spec.base, 1]).setMetallicFactor(spec.metal).setRoughnessFactor(spec.rough);
      material.setDoubleSided(true);
      const tex = recipe.textures?.[name];
      if (tex) {
        patchesReady = tex.patches ? await prepare(doc, tex.from, tex.size, tex.patches) : patchesReady;
        const source = doc.getRoot().listMaterials().find((m) => m.getName() === tex.from);
        if (!source) throw new Error(`${recipe.id}: no material ${tex.from}`);
        const copy = (texture: Texture | null) => (texture ? textureOf(out, texture, tex.size, tex.patches) : null);
        if (tex.maps.includes("base")) material.setBaseColorTexture(copy(source.getBaseColorTexture()));
        if (tex.maps.includes("metalRough")) material.setMetallicRoughnessTexture(copy(source.getMetallicRoughnessTexture()));
        if (tex.maps.includes("normal")) material.setNormalTexture(copy(source.getNormalTexture()));
        if (tex.maps.includes("emissive")) material.setEmissiveTexture(copy(source.getEmissiveTexture())).setEmissiveFactor(source.getEmissiveFactor());
      }
      const prim = out
        .createPrimitive()
        .setMaterial(material)
        .setAttribute("POSITION", out.createAccessor().setType("VEC3").setArray(r.positions).setBuffer(buffer))
        .setAttribute("NORMAL", out.createAccessor().setType("VEC3").setArray(r.normals).setBuffer(buffer))
        .setIndices(out.createAccessor().setType("SCALAR").setArray(r.indices).setBuffer(buffer));
      if (tex) prim.setAttribute("TEXCOORD_0", out.createAccessor().setType("VEC2").setArray(r.uvs).setBuffer(buffer));
      mesh.addPrimitive(prim);
    }
    // the licence's own record stays in the file
    out.getRoot().getAsset().extras = { ...extras, ...recipe.extras, changes: recipe.changes, part: partId };
    out.getRoot().getAsset().generator = "uchusen-rockets";
    await out.transform(dedup(), prune({ keepAttributes: true }), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12, pattern: /^(POSITION|NORMAL|TEXCOORD_0)$/ }));
    const file = join(outDir, `${recipe.id}-${partId}.glb`);
    writeFileSync(file, await io.writeBinary(out));
    const size = hi.map((v, i) => (v - lo[i]).toFixed(2));
    console.log(`${recipe.id}-${partId}.glb  ${(statSync(file).size / 1024).toFixed(0)} KB  ${outTris} triangles  size x y z ${size.join(" ")} m  y ${lo[1].toFixed(2)} to ${hi[1].toFixed(2)}`);
  }
  console.log(`${recipe.id}: ${inTris} triangles in; dropped ${[...dropped].map(([k, v]) => `${k} (${v})`).join(", ") || "nothing"}`);
}

let patchesReady = new Map<Texture, Uint8Array>();

/** Paints logos out of a material's images, in a real browser's canvas: each patch is drawn over from clean pixels of the same picture, the same in every map, since they share their coordinates. */
async function prepare(doc: Document, from: string, size: number | undefined, patches: readonly Patch[]): Promise<Map<Texture, Uint8Array>> {
  const material = doc.getRoot().listMaterials().find((m) => m.getName() === from);
  if (!material) throw new Error(`no material ${from}`);
  await acquireBrowserLock();
  const browser = await chromium.launch();
  const done = new Map<Texture, Uint8Array>();
  try {
    const page = await browser.newPage();
    for (const texture of [material.getBaseColorTexture(), material.getMetallicRoughnessTexture(), material.getNormalTexture()]) {
      const image = texture?.getImage();
      if (!texture || !image) continue;
      const data = `data:${texture.getMimeType()};base64,${Buffer.from(image).toString("base64")}`;
      const out = await page.evaluate(
        async ({ data, patches, size }) => {
          const img = new Image();
          img.src = data;
          await img.decode();
          const n = img.naturalWidth;
          const k = n / 1024;
          const whole = document.createElement("canvas");
          whole.width = whole.height = n;
          const w = whole.getContext("2d") as CanvasRenderingContext2D;
          w.drawImage(img, 0, 0);
          for (const { to, from: source } of patches) w.drawImage(whole, source[0] * k, source[1] * k, source[2] * k, source[3] * k, to[0] * k, to[1] * k, to[2] * k, to[3] * k);
          const small = document.createElement("canvas");
          small.width = small.height = size ?? n;
          (small.getContext("2d") as CanvasRenderingContext2D).drawImage(whole, 0, 0, small.width, small.height);
          return small.toDataURL("image/jpeg", 0.82).split(",")[1];
        },
        { data, patches, size },
      );
      done.set(texture, new Uint8Array(Buffer.from(out, "base64")));
    }
  } finally {
    await browser.close();
  }
  return done;
}

/** Copies one of a model's own images into a part's file; `size` shrinks it to a JPEG, none keeps its bytes; patches have been painted out first. */
function textureOf(doc: Document, texture: Texture, size?: number, patches?: readonly Patch[]): Texture {
  const image = texture.getImage();
  if (!image) throw new Error("a texture with no image");
  const made = doc.createTexture(texture.getName());
  if (patches) {
    const patched = patchesReady.get(texture);
    if (!patched) throw new Error("a patched image was not prepared");
    return made.setImage(patched).setMimeType("image/jpeg");
  }
  return size ? made.setImage(jpegOf(image, size)).setMimeType("image/jpeg") : made.setImage(image).setMimeType(texture.getMimeType());
}

for (const recipe of [...MODEL_RECIPES, ...ROADSTER_RECIPES]) if (!only || recipe.id === only) await runRecipe(recipe);
