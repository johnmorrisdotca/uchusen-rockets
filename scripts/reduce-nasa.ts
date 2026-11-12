// Turns NASA's 3D models, and the licensed models that are split into parts the same way (kept outside this repository), into the small parts in models/. Run by hand, never by the build:
// `UCHUSEN_MODEL_SOURCES=<folder> node scripts/reduce-nasa.ts [id,id…]`. The results are committed.
//
// A source's files are data from outside: they are only read. What it does to a model: every triangle is moved to this package's convention (metres, Y up, the part's base on the axis at y = 0, the windward side
// towards +Z) and scaled to a sourced size, sorted into parts (by where it is, what it is made of and which connected piece it belongs to), and simplified. Its many materials become one picture: each picture with
// its marks painted out first, each plain colour a small square, cropped to what the triangles use. So no picture and no name of the source's reaches a file unless a recipe let it, and a part is one draw.
import { Buffer } from "node:buffer";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { Document, type Material as GMaterial, type Node as GNode, NodeIO, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, quantize } from "@gltf-transform/functions";
import { chromium } from "@playwright/test";
// @ts-expect-error the decoder has no types of its own
import draco3d from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";
import { NASA_RECIPES, type NasaPart, type NasaRecipe, type PieceBox, type Rect } from "./nasa-recipes.ts";
import { PART_RECIPES } from "./part-recipes.ts";
import { piecesOf } from "./pieces.ts";
import { skipsEmptyPart } from "./recipe-parts.ts";
import { weld } from "./weld.ts";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const sources = process.env.UCHUSEN_MODEL_SOURCES ?? "";
if (!sources) throw new Error("UCHUSEN_MODEL_SOURCES must name the folder that holds the source models. They are kept outside this repository.");
const only = new Set((process.argv[2] ?? "").split(",").filter(Boolean));
const outDir = join(process.cwd(), "models");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "draco3d.decoder": await (draco3d as { createDecoderModule(): Promise<unknown> }).createDecoderModule() });
await MeshoptSimplifier.ready;

/** A triangle, as three corners: positions, normals and picture coordinates. */
interface Triangles {
  positions: number[];
  normals: number[];
  uvs: number[];
}
interface Paint {
  name: string;
  /** Linear colour. */
  colour: readonly [number, number, number];
  image: { bytes: Uint8Array; mime: string } | null;
}

const linearToByte = (v: number) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 1e-6) ** (1 / 2.4) - 0.055));

/** Calls back for each triangle of a primitive, in the file's own units and space. */
function eachTriangle(prim: Primitive, node: GNode, visit: (p: number[][], n: number[][], t: number[][]) => void): void {
  const pos = prim.getAttribute("POSITION");
  if (!pos) return;
  const nor = prim.getAttribute("NORMAL");
  const uv = prim.getAttribute("TEXCOORD_0");
  const idx = prim.getIndices();
  const m = node.getWorldMatrix();
  // a normal takes the inverse transpose; these files' nodes turn and scale evenly, so the matrix itself will do, normalised
  const at = (i: number) => {
    const a = pos.getElement(i, [0, 0, 0]);
    return [0, 1, 2].map((k) => m[k] * a[0] + m[4 + k] * a[1] + m[8 + k] * a[2] + m[12 + k]);
  };
  const normalAt = (i: number) => {
    const b = nor?.getElement(i, [0, 0, 0]) ?? [0, 0, 0];
    return [0, 1, 2].map((k) => m[k] * b[0] + m[4 + k] * b[1] + m[8 + k] * b[2]);
  };
  const count = Math.floor((idx ? idx.getCount() : pos.getCount()) / 3);
  for (let f = 0; f < count; f++) {
    const c = [0, 1, 2].map((k) => (idx ? idx.getScalar(f * 3 + k) : f * 3 + k));
    const p = c.map(at);
    let n = c.map(normalAt);
    if (!nor) {
      const u = [0, 1, 2].map((k) => p[1][k] - p[0][k]);
      const w = [0, 1, 2].map((k) => p[2][k] - p[0][k]);
      const flat = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      n = [flat, flat, flat];
    }
    visit(p, n, c.map((i) => (uv ? uv.getElement(i, [0, 0]) : [0, 0])));
  }
}

type Corners = [number[][], number[][], number[][]];
/** A triangle cut along its longest edge, again and again, until no side of its box is over `most` units: its corners' normals and picture coordinates are shared out along the cut. */
function cut(p: number[][], n: number[][], t: number[][], most: number): Corners[] {
  const size = Math.max(...[0, 1, 2].map((k) => Math.max(p[0][k], p[1][k], p[2][k]) - Math.min(p[0][k], p[1][k], p[2][k])));
  if (!(size > most)) return [[p, n, t]];
  const edge = (i: number, j: number) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]);
  const longest = [edge(0, 1), edge(1, 2), edge(2, 0)];
  const a = longest.indexOf(Math.max(...longest));
  const b = (a + 1) % 3;
  const c = (a + 2) % 3;
  const mid = (u: number[], v: number[]) => u.map((value, k) => (value + v[k]) / 2);
  const mp = mid(p[a], p[b]);
  const mn = mid(n[a], n[b]);
  const mt = mid(t[a], t[b]);
  return [...cut([p[a], mp, p[c]], [n[a], mn, n[c]], [t[a], mt, t[c]], most), ...cut([mp, p[b], p[c]], [mn, n[b], n[c]], [mt, t[b], t[c]], most)];
}

/** Each triangle turned to agree with its normals, since these files' materials are drawn from both sides and their windings are not to be trusted. */
function agree(t: Triangles): void {
  const { positions: P, normals: N, uvs: T } = t;
  for (let f = 0; f < P.length / 9; f++) {
    const [a, b, c] = [f * 3, f * 3 + 1, f * 3 + 2];
    const u = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]);
    const v = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
    const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const mean = [0, 1, 2].map((k) => N[a * 3 + k] + N[b * 3 + k] + N[c * 3 + k]);
    if (g[0] * mean[0] + g[1] * mean[1] + g[2] * mean[2] >= 0) continue;
    for (let k = 0; k < 3; k++) [P[b * 3 + k], P[c * 3 + k]] = [P[c * 3 + k], P[b * 3 + k]];
    for (let k = 0; k < 3; k++) [N[b * 3 + k], N[c * 3 + k]] = [N[c * 3 + k], N[b * 3 + k]];
    for (let k = 0; k < 2; k++) [T[b * 2 + k], T[c * 2 + k]] = [T[c * 2 + k], T[b * 2 + k]];
  }
}

interface Cell {
  name: string;
  w: number;
  h: number;
  x: number;
  y: number;
  /** The part of the picture's coordinates this cell shows. */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  image: { data: string; patches: readonly { to: Rect; from?: Rect; fill?: string }[] } | null;
  colour: string;
}

/** Lays cells in shelves, tallest first, in a square of `side` pixels, and says whether they fit. */
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

await acquireBrowserLock();
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], timeout: 60_000 });
const page = await browser.newPage();

/** One picture from a part's materials, its marks painted out, in a real browser's canvas. Moves the triangles' coordinates into it. */
async function atlas(buckets: Map<string, Triangles>, paints: Map<string, Paint>, recipe: NasaRecipe, part: NasaPart): Promise<Uint8Array> {
  const cells: Cell[] = [];
  for (const [name, t] of buckets) {
    const paint = paints.get(name) as Paint;
    const swap = recipe.colours?.[name];
    const useImage = paint.image && !swap;
    let [u0, v0, u1, v1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < t.uvs.length; i += 2) {
      u0 = Math.min(u0, t.uvs[i]);
      u1 = Math.max(u1, t.uvs[i]);
      v0 = Math.min(v0, t.uvs[i + 1]);
      v1 = Math.max(v1, t.uvs[i + 1]);
    }
    if (useImage && paint.image) {
      const data = `data:${paint.image.mime};base64,${Buffer.from(paint.image.bytes).toString("base64")}`;
      const size = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return [img.naturalWidth, img.naturalHeight];
      }, data);
      const wide = Math.max(u1 - u0, 1e-4);
      const tall = Math.max(v1 - v0, 1e-4);
      const scale = recipe.pictureScale?.[name] ?? 1;
      cells.push({ name, w: Math.max(4, Math.round(wide * size[0] * scale)), h: Math.max(4, Math.round(tall * size[1] * scale)), x: 0, y: 0, u0, v0, u1, v1, image: { data, patches: recipe.patches?.[name] ?? [] }, colour: "" });
    } else {
      const c = swap ?? paint.colour;
      cells.push({ name, w: 4, h: 4, x: 0, y: 0, u0, v0, u1, v1, image: null, colour: `rgb(${c.map(linearToByte).join(",")})` });
    }
  }
  const gap = 2;
  const biggest = recipe.atlas ?? 2048;
  // the smallest square of a power of two that holds them at full size, else every picture is shrunk to fit the largest allowed
  let side = 64;
  while (side < biggest && !pack(cells, side, gap)) side *= 2;
  let shrink = 1;
  while (!pack(cells, side, gap)) {
    shrink *= 0.92;
    for (const cell of cells)
      if (cell.image) {
        cell.w = Math.max(4, Math.floor(cell.w * 0.92));
        cell.h = Math.max(4, Math.floor(cell.h * 0.92));
      }
  }
  const base64 = await page.evaluate(
    async ({ cells, side, gap, quality }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, side, side);
      for (const cell of cells) {
        if (!cell.image) {
          ctx.fillStyle = cell.colour;
          ctx.fillRect(cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
          continue;
        }
        const img = new Image();
        img.src = cell.image.data;
        await img.decode();
        const [W, H] = [img.naturalWidth, img.naturalHeight];
        // the marks go first, on a whole copy of the picture
        const clean = document.createElement("canvas");
        clean.width = W;
        clean.height = H;
        const c = clean.getContext("2d") as CanvasRenderingContext2D;
        // a picture's alpha means nothing on these opaque materials: it stands on white, not on the sheet's grey
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, W, H);
        c.drawImage(img, 0, 0);
        const source = document.createElement("canvas");
        source.width = W;
        source.height = H;
        (source.getContext("2d") as CanvasRenderingContext2D).drawImage(img, 0, 0);
        for (const patch of cell.image.patches) {
          const [x, y, w, h] = [patch.to[0] * W, patch.to[1] * H, patch.to[2] * W, patch.to[3] * H];
          if (patch.fill) {
            c.fillStyle = patch.fill;
            c.fillRect(x, y, w, h);
          } else if (patch.from) c.drawImage(source, patch.from[0] * W, patch.from[1] * H, patch.from[2] * W, patch.from[3] * H, x, y, w, h);
        }
        // the cell: what the triangles use, repeated where they run past the picture's edge, with its edge run out into the gap so a tile's filtering takes nothing from its neighbour
        const cell2 = document.createElement("canvas");
        cell2.width = cell.w;
        cell2.height = cell.h;
        const d = cell2.getContext("2d") as CanvasRenderingContext2D;
        const [su, sv] = [cell.w / (cell.u1 - cell.u0), cell.h / (cell.v1 - cell.v0)];
        for (let i = Math.floor(cell.u0); i < Math.ceil(cell.u1); i++) for (let j = Math.floor(cell.v0); j < Math.ceil(cell.v1); j++) d.drawImage(clean, (i - cell.u0) * su, (j - cell.v0) * sv, su, sv);
        ctx.drawImage(cell2, cell.x - gap, cell.y - gap, cell.w + gap * 2, cell.h + gap * 2);
        ctx.drawImage(cell2, cell.x, cell.y);
      }
      return canvas.toDataURL("image/jpeg", quality).split(",")[1];
    },
    { cells, side, gap, quality: recipe.quality ?? 0.8 },
  );
  for (const cell of cells) {
    const t = buckets.get(cell.name) as Triangles;
    const [du, dv] = [Math.max(cell.u1 - cell.u0, 1e-9), Math.max(cell.v1 - cell.v0, 1e-9)];
    for (let i = 0; i < t.uvs.length; i += 2) {
      // a plain colour's every corner is the middle of its square, so a seam between materials is the only seam it has
      t.uvs[i] = cell.image ? (cell.x + ((t.uvs[i] - cell.u0) / du) * cell.w) / side : (cell.x + cell.w / 2) / side;
      t.uvs[i + 1] = cell.image ? (cell.y + ((t.uvs[i + 1] - cell.v0) / dv) * cell.h) / side : (cell.y + cell.h / 2) / side;
    }
  }
  console.log(`  ${part.id}: picture ${side} px, ${cells.filter((cell) => cell.image).length} pictures and ${cells.filter((cell) => !cell.image).length} colours${shrink < 1 ? `, shrunk to ${shrink.toFixed(2)}` : ""}`);
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/** A GLB with the pictures it names outside itself taken out, since NASA's copies do not hold them. */
function withoutOutsidePictures(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + size))) as { images?: { uri?: string }[]; textures?: unknown; materials?: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }[] };
  if (!json.images?.some((image) => image.uri)) return bytes;
  delete json.images;
  delete json.textures;
  for (const material of json.materials ?? []) if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  const text = new TextEncoder().encode(JSON.stringify(json));
  const pad = (4 - (text.length % 4)) % 4;
  const rest = bytes.subarray(20 + size);
  const out = new Uint8Array(20 + text.length + pad + rest.length);
  const head = new DataView(out.buffer);
  out.set(bytes.subarray(0, 12));
  head.setUint32(8, out.length, true);
  head.setUint32(12, text.length + pad, true);
  head.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + text.length + pad);
  out.set(rest, 20 + text.length + pad);
  return out;
}

async function runRecipe(recipe: NasaRecipe): Promise<void> {
  const parts = new Map<string, Map<string, Triangles>>();
  const paints = new Map<string, Paint>();
  let inTris = 0;
  const dropped = new Map<string, number>();
  for (const file of [...recipe.files, ...(recipe.copies ?? []).map((copy) => copy.file)].filter((one, i, all) => all.indexOf(one) === i)) {
    // a binary read: a picture a file names outside itself, which NASA's copies do not hold, is left out
    const doc = await io.readBinary(withoutOutsidePictures(new Uint8Array(readFileSync(join(sources, file)))));
    const nodes: GNode[] = [];
    const walk = (node: GNode) => {
      nodes.push(node);
      node.listChildren().forEach(walk);
    };
    for (const scene of doc.getRoot().listScenes()) scene.listChildren().forEach(walk);
    const pieces = piecesOf(nodes);
    console.log(`  ${file}: ${pieces.boxes.length} connected pieces`);
    for (const node of nodes)
      for (const prim of node.getMesh()?.listPrimitives() ?? []) {
        const material: GMaterial | null = prim.getMaterial();
        const name = `${file === recipe.files[0] ? "" : `${file}/`}${material?.getName() ?? "(none)"}`;
        if (!paints.has(name)) {
          const texture = material?.getBaseColorTexture();
          const image = texture?.getImage();
          const factor = material?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
          paints.set(name, { name, colour: [factor[0], factor[1], factor[2]], image: image && texture ? { bytes: image, mime: texture.getMimeType() } : null });
        }
        const pieceIds = pieces.pieceOf(node, prim);
        let f = 0;
        eachTriangle(prim, node, (p0, n0, t0) => {
          inTris++;
          const piece: PieceBox = pieces.boxes[pieceIds?.[f++] ?? -1] ?? { min: [0, 1, 2].map((k) => (p0[0][k] + p0[1][k] + p0[2][k]) / 3), max: [0, 1, 2].map((k) => (p0[0][k] + p0[1][k] + p0[2][k]) / 3), triangles: 1 };
          // a triangle longer than a part is cut, so a facet that runs the length of a hull falls where each piece of it stands
          for (const [p, n, t] of cut(p0, n0, t0, recipe.maxTriangle ?? Infinity)) {
          const centre = [0, 1, 2].map((k) => (p[0][k] + p[1][k] + p[2][k]) / 3);
          const part = recipe.partOf(centre, name, node.getName(), file, piece);
          if (!part) {
            dropped.set(name, (dropped.get(name) ?? 0) + 1);
            continue;
          }
          const moved = recipe.copies?.filter((copy) => copy.file === file).map((copy) => copy.at) ?? [];
          for (const at of moved.length ? moved : [[0, 0, 0]]) {
          if (!parts.has(part.id)) parts.set(part.id, new Map());
          const buckets = parts.get(part.id) as Map<string, Triangles>;
          if (!buckets.has(name)) buckets.set(name, { positions: [], normals: [], uvs: [] });
          const bucket = buckets.get(name) as Triangles;
          for (let k = 0; k < 3; k++) {
            const a = [p[k][0] + at[0], p[k][1] + at[1], p[k][2] + at[2]];
            const b = [...n[k]];
            part.place(a, b);
            const l = Math.hypot(b[0], b[1], b[2]) || 1;
            bucket.positions.push(a[0], a[1], a[2]);
            bucket.normals.push(b[0] / l, b[1] / l, b[2] / l);
            bucket.uvs.push(t[k][0], t[k][1]);
          }
          }
          }
        });
      }
  }
  for (const part of recipe.parts) {
    const buckets = parts.get(part.id);
    if (!buckets) {
      // a part nothing fell in is a mistake in the recipe unless it is marked optional; an optional one is a part the model does not draw: no file, and this package's own paint shows for it
      skipsEmptyPart(recipe.id, part, false);
      console.log(`${recipe.id}-${part.id}.glb  nothing fell in it: no file`);
      continue;
    }
    for (const t of buckets.values()) agree(t);
    const picture = await atlas(buckets, paints, recipe, part);
    // all its triangles as one
    const whole: Triangles = { positions: [], normals: [], uvs: [] };
    for (const t of buckets.values()) {
      for (const v of t.positions) whole.positions.push(v);
      for (const v of t.normals) whole.normals.push(v);
      for (const v of t.uvs) whole.uvs.push(v);
    }
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < whole.positions.length; i += 3)
      for (let c = 0; c < 3; c++) {
        lo[c] = Math.min(lo[c], whole.positions[i + c]);
        hi[c] = Math.max(hi[c], whole.positions[i + c]);
      }
    const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    const w = weld(whole.positions, whole.normals, whole.uvs, size, lo, recipe.looseWeld === true);
    const startTris = w.indices.length / 3;
    const target = Math.min(part.triangles, startTris) * 3;
    const ATTR = new Float32Array(w.normals.length + w.uvs.length);
    const vertexCount = w.positions.length / 3;
    for (let i = 0; i < vertexCount; i++) ATTR.set([w.normals[i * 3], w.normals[i * 3 + 1], w.normals[i * 3 + 2], w.uvs[i * 2], w.uvs[i * 2 + 1]], i * 5);
    let indices: Uint32Array = w.indices;
    if (target < w.indices.length) [indices] = MeshoptSimplifier.simplifyWithAttributes(w.indices, w.positions, 3, ATTR, 5, [0.3, 0.3, 0.3, 8, 8], null, target, part.error ?? 0.02, recipe.freeBorders ? ["ErrorAbsolute"] : ["ErrorAbsolute", "LockBorder"]);
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
    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene(part.id);
    const root = doc.createNode(part.id);
    scene.addChild(root);
    const mesh = doc.createMesh(part.id);
    root.setMesh(mesh);
    const texture = doc.createTexture("atlas").setImage(picture).setMimeType("image/jpeg");
    const material = doc.createMaterial("atlas").setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(recipe.metal ?? 0.1).setRoughnessFactor(recipe.rough ?? 0.62).setDoubleSided(true).setBaseColorTexture(texture);
    mesh.addPrimitive(
      doc
        .createPrimitive()
        .setMaterial(material)
        .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer))
        .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer))
        .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(uvs)).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType("SCALAR").setArray(out).setBuffer(buffer)),
    );
    doc.getRoot().getAsset().generator = "uchusen-rockets";
    const credit = recipe.credit ?? { author: "NASA", license: "Public domain, NASA (https://www.nasa.gov/nasa-brand-center/images-and-media/)" };
    doc.getRoot().getAsset().extras = { title: recipe.title, author: credit.author, license: credit.license, source: recipe.source, changes: recipe.changes, part: part.id };
    await doc.transform(dedup(), prune({ keepAttributes: true }), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12, pattern: /^(POSITION|NORMAL|TEXCOORD_0)$/ }));
    const file = join(outDir, `${recipe.id}-${part.id}.glb`);
    writeFileSync(file, await io.writeBinary(doc));
    const sizes = hi.map((v, i) => (v - lo[i]).toFixed(2));
    console.log(`${recipe.id}-${part.id}.glb  ${(statSync(file).size / 1024).toFixed(0)} KB (picture ${(picture.length / 1024).toFixed(0)} KB)  ${startTris} to ${out.length / 3} triangles  x y z ${sizes.join(" ")} m  y ${lo[1].toFixed(2)} to ${hi[1].toFixed(2)}, x ${lo[0].toFixed(2)} to ${hi[0].toFixed(2)}, z ${lo[2].toFixed(2)} to ${hi[2].toFixed(2)}`);
  }
  console.log(`${recipe.id}: ${inTris} triangles in; dropped ${[...dropped].map(([k, v]) => `${k} (${v})`).join(", ") || "nothing"}`);
}

try {
  for (const recipe of [...NASA_RECIPES, ...PART_RECIPES]) if (only.size === 0 || only.has(recipe.id)) await runRecipe(recipe);
} finally {
  await browser.close();
}
