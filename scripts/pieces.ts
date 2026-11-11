// The connected pieces of a glTF file: which piece every triangle belongs to. Pure apart from reading the document it is given.
import type { Node as GNode, Primitive } from "@gltf-transform/core";
import type { PieceBox } from "./nasa-recipes.ts";
import { PointIndex } from "./point-index.ts";

/** A piece's number for each triangle of one mesh instance: a primitive drawn by several nodes has a list for each of them. */
export interface Pieces {
  /** The piece of every triangle of this node's copy of this primitive, in the order its triangles are read; undefined for a pair the file does not hold. */
  pieceOf(node: GNode, prim: Primitive): Int32Array | undefined;
  boxes: PieceBox[];
}

/** The connected pieces of a file: every triangle's piece, by node and primitive, from vertices that sit within a ten-thousandth of the file's size of each other on every axis welded. */
export function piecesOf(nodes: readonly GNode[]): Pieces {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const el = [0, 0, 0];
  const pointsOf = (node: GNode, prim: Primitive): Float64Array => {
    const pos = prim.getAttribute("POSITION");
    const m = node.getWorldMatrix();
    const out = new Float64Array((pos?.getCount() ?? 0) * 3);
    for (let i = 0; pos && i < pos.getCount(); i++) {
      pos.getElement(i, el);
      for (let k = 0; k < 3; k++) out[i * 3 + k] = m[k] * el[0] + m[4 + k] * el[1] + m[8 + k] * el[2] + m[12 + k];
    }
    return out;
  };
  // one entry for every node that draws a primitive: two nodes drawing the same mesh stand in two places
  const instances: { node: GNode; prim: Primitive; points: Float64Array }[] = [];
  for (const node of nodes)
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const p = pointsOf(node, prim);
      instances.push({ node, prim, points: p });
      for (let i = 0; i < p.length; i += 3)
        for (let c = 0; c < 3; c++) {
          lo[c] = Math.min(lo[c], p[i + c]);
          hi[c] = Math.max(hi[c], p[i + c]);
        }
    }
  const tolerance = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-9) / 10000;
  const index = new PointIndex(tolerance, [lo[0], lo[1], lo[2]]);
  const vertexIds: Int32Array[] = [];
  for (const { points: p } of instances) {
    const mine = new Int32Array(p.length / 3);
    for (let i = 0; i < mine.length; i++) mine[i] = index.find(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) ?? index.add(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    vertexIds.push(mine);
  }
  const parent = Int32Array.from({ length: index.size }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const cornerOf = (prim: Primitive, i: number): number => {
    const idx = prim.getIndices();
    return idx ? idx.getScalar(i) : i;
  };
  const cornerCount = (prim: Primitive): number => prim.getIndices()?.getCount() ?? prim.getAttribute("POSITION")?.getCount() ?? 0;
  instances.forEach(({ prim }, at) => {
    const mine = vertexIds[at] as Int32Array;
    const count = cornerCount(prim);
    for (let f = 0; f + 2 < count; f += 3) {
      const a = mine[cornerOf(prim, f)];
      parent[find(a)] = find(mine[cornerOf(prim, f + 1)]);
      parent[find(a)] = find(mine[cornerOf(prim, f + 2)]);
    }
  });
  const boxes: { min: number[]; max: number[]; triangles: number }[] = [];
  const boxOf = new Map<number, number>();
  const byNode = new Map<GNode, Map<Primitive, Int32Array>>();
  instances.forEach(({ node, prim, points: p }, n) => {
    const mine = vertexIds[n] as Int32Array;
    const count = cornerCount(prim);
    const out = new Int32Array(Math.floor(count / 3));
    for (let f = 0; f + 2 < count; f += 3) {
      const root = find(mine[cornerOf(prim, f)]);
      let at = boxOf.get(root);
      if (at === undefined) {
        at = boxes.length;
        boxOf.set(root, at);
        boxes.push({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], triangles: 0 });
      }
      const box = boxes[at] as (typeof boxes)[number];
      box.triangles++;
      for (const k of [f, f + 1, f + 2]) {
        const v = cornerOf(prim, k);
        for (let c = 0; c < 3; c++) {
          box.min[c] = Math.min(box.min[c], p[v * 3 + c]);
          box.max[c] = Math.max(box.max[c], p[v * 3 + c]);
        }
      }
      out[f / 3] = at;
    }
    const mineByPrim = byNode.get(node) ?? new Map<Primitive, Int32Array>();
    mineByPrim.set(prim, out);
    byNode.set(node, mineByPrim);
  });
  return { pieceOf: (node, prim) => byNode.get(node)?.get(prim), boxes };
}
