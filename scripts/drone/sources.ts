// Reads NASA's models as triangles: a .glb (Draco and all) by node and material, with its pictures, and a binary .stl with smooth normals. Data from outside: only read, never run.
import { readFileSync } from "node:fs";
import { Document, type Material as GMaterial, NodeIO, type Node as GNode, type Primitive } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
// @ts-expect-error the decoder has no types of its own
import draco3d from "draco3dgltf";
import type { V3 } from "./math.ts";

/** One triangle: three corners' positions, normals and picture coordinates, and the material it is painted with. */
export interface Tri {
  p: [V3, V3, V3];
  n: [V3, V3, V3];
  t: [[number, number], [number, number], [number, number]];
  /** A key into the paints: `file/material`. */
  mat: string;
  node: string;
}
export interface Paint {
  /** Linear base colour. */
  colour: [number, number, number];
  metal: number;
  rough: number;
  image: { bytes: Uint8Array; mime: string } | null;
}

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({ "draco3d.decoder": await (draco3d as { createDecoderModule(): Promise<unknown> }).createDecoderModule() });

export interface Glb {
  doc: Document;
  tris: Tri[];
  paints: Map<string, Paint>;
}

/** Every triangle of a .glb in the file's own world space, with the node it belongs to. */
export async function readGlb(path: string, key: string): Promise<Glb> {
  const doc = await io.readBinary(new Uint8Array(readFileSync(path)));
  const tris: Tri[] = [];
  const paints = new Map<string, Paint>();
  const nodes: GNode[] = [];
  const walk = (node: GNode) => {
    nodes.push(node);
    node.listChildren().forEach(walk);
  };
  for (const scene of doc.getRoot().listScenes()) scene.listChildren().forEach(walk);
  for (const node of nodes)
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const material: GMaterial | null = prim.getMaterial();
      const mat = `${key}/${material?.getName() ?? "(none)"}`;
      if (!paints.has(mat)) {
        const texture = material?.getBaseColorTexture();
        const image = texture?.getImage();
        const f = material?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
        paints.set(mat, { colour: [f[0], f[1], f[2]], metal: material?.getMetallicFactor() ?? 0, rough: material?.getRoughnessFactor() ?? 0.8, image: image && texture ? { bytes: image, mime: texture.getMimeType() } : null });
      }
      eachTriangle(prim, node, (p, n, t) => tris.push({ p, n, t, mat, node: node.getName() }));
    }
  return { doc, tris, paints };
}

function eachTriangle(prim: Primitive, node: GNode, visit: (p: [V3, V3, V3], n: [V3, V3, V3], t: [[number, number], [number, number], [number, number]]) => void): void {
  const pos = prim.getAttribute("POSITION");
  if (!pos) return;
  const nor = prim.getAttribute("NORMAL");
  const uv = prim.getAttribute("TEXCOORD_0");
  const idx = prim.getIndices();
  const m = node.getWorldMatrix();
  const at = (i: number): V3 => {
    const a = pos.getElement(i, [0, 0, 0]);
    return [0, 1, 2].map((k) => m[k] * a[0] + m[4 + k] * a[1] + m[8 + k] * a[2] + m[12 + k]) as V3;
  };
  const normalAt = (i: number): V3 => {
    const b = nor?.getElement(i, [0, 0, 0]) ?? [0, 0, 0];
    return [0, 1, 2].map((k) => m[k] * b[0] + m[4 + k] * b[1] + m[8 + k] * b[2]) as V3;
  };
  const count = Math.floor((idx ? idx.getCount() : pos.getCount()) / 3);
  for (let f = 0; f < count; f++) {
    const c = [0, 1, 2].map((k) => (idx ? idx.getScalar(f * 3 + k) : f * 3 + k));
    const p = c.map(at) as [V3, V3, V3];
    let n = c.map(normalAt) as [V3, V3, V3];
    if (!nor) {
      const u = [0, 1, 2].map((k) => p[1][k] - p[0][k]);
      const w = [0, 1, 2].map((k) => p[2][k] - p[0][k]);
      const flat: V3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      n = [flat, flat, flat];
    }
    visit(p, n, c.map((i) => (uv ? uv.getElement(i, [0, 0]) : [0, 0])) as [[number, number], [number, number], [number, number]]);
  }
}

/** A binary .stl as triangles, its normals smoothed across edges gentler than `deg` degrees. The file's z is up: the result is Y up, in the file's units. */
export function readStl(path: string, mat: string, deg = 38): Tri[] {
  const b = readFileSync(path);
  const n = b.readUInt32LE(80);
  const pos = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) pos[i * 9 + k * 3 + c] = b.readFloatLE(84 + i * 50 + 12 + k * 12 + c * 4);
  // z up to y up, a proper turn: (x, y, z) to (x, z, -y)
  for (let i = 0; i < n * 3; i++) {
    const y = pos[i * 3 + 1];
    pos[i * 3 + 1] = pos[i * 3 + 2];
    pos[i * 3 + 2] = -y;
  }
  const face = new Float32Array(n * 3);
  const key = (x: number, y: number, z: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
  const groups = new Map<string, number[]>();
  for (let f = 0; f < n; f++) {
    const o = f * 9;
    const u = [pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]];
    const v = [pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]];
    face[f * 3] = u[1] * v[2] - u[2] * v[1];
    face[f * 3 + 1] = u[2] * v[0] - u[0] * v[2];
    face[f * 3 + 2] = u[0] * v[1] - u[1] * v[0];
    for (let k = 0; k < 3; k++) {
      const kk = key(pos[o + k * 3], pos[o + k * 3 + 1], pos[o + k * 3 + 2]);
      const g = groups.get(kk);
      if (g) g.push(f);
      else groups.set(kk, [f]);
    }
  }
  const cos = Math.cos((deg * Math.PI) / 180);
  const tris: Tri[] = [];
  for (let f = 0; f < n; f++) {
    const fl = Math.hypot(face[f * 3], face[f * 3 + 1], face[f * 3 + 2]) || 1;
    const p: V3[] = [];
    const nn: V3[] = [];
    for (let k = 0; k < 3; k++) {
      const o = f * 9 + k * 3;
      p.push([pos[o], pos[o + 1], pos[o + 2]]);
      let s: V3 = [0, 0, 0];
      for (const g of groups.get(key(pos[o], pos[o + 1], pos[o + 2])) as number[]) {
        const gl = Math.hypot(face[g * 3], face[g * 3 + 1], face[g * 3 + 2]) || 1;
        const d = (face[f * 3] * face[g * 3] + face[f * 3 + 1] * face[g * 3 + 1] + face[f * 3 + 2] * face[g * 3 + 2]) / (fl * gl);
        if (d >= cos) s = [s[0] + face[g * 3], s[1] + face[g * 3 + 1], s[2] + face[g * 3 + 2]];
      }
      const l = Math.hypot(...s) || 1;
      nn.push([s[0] / l, s[1] / l, s[2] / l]);
    }
    tris.push({ p: p as [V3, V3, V3], n: nn as [V3, V3, V3], t: [[0, 0], [0, 0], [0, 0]], mat, node: "stl" });
  }
  return tris;
}
