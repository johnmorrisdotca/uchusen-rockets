// Takes the loose specks out of a painted model: every connected piece of its mesh whose longest side, in metres, is under a floor. A reduced model keeps the small bolts and fittings of the original as bits that touch nothing,
// and drawn from afar they float round the craft as dots. Run by hand on one file (`node scripts/trim-specks.ts models/<file>.glb [metres]`), or by `reduce-nasa.ts` for a recipe that names a `trimBelow`.
// The pieces are found by position, so a piece the simplifier split from the rest goes with the specks only when it is small too. The picture and the other pieces are not touched.
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { type Accessor, Document, NodeIO, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";

/** The floor `trimBelow` is usually given: seven centimetres, under 3% of Parker's 2.4 m heat shield. */
export const SPECK_FLOOR = 0.07;

/** One connected piece of a primitive: its triangles and the longest side of its box, in metres. */
export interface Piece {
  triangles: number[];
  size: number;
}

/** The scale from a mesh's own numbers to metres: its node's, with the node's parents'. */
function metresPerUnit(matrix: readonly number[]): number {
  return Math.hypot(matrix[0], matrix[1], matrix[2]);
}

/**
 * The connected pieces of a triangle mesh, found by position: two triangles that share a corner are one piece.
 * @param primitive A triangle primitive with an index.
 * @param metres How many metres a unit of its positions is.
 * @returns Each piece with its triangle numbers and the longest side of its box in metres.
 */
export function loosePiecesOf(primitive: Primitive, metres: number): Piece[] {
  const position = primitive.getAttribute("POSITION") as Accessor;
  const index = primitive.getIndices() as Accessor;
  const count = position.getCount();
  const raw = position.getArray() as ArrayLike<number>;
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  // a corner stored twice at one place is one corner
  const seen = new Map<string, number>();
  const canon = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const key = `${raw[i * 3]},${raw[i * 3 + 1]},${raw[i * 3 + 2]}`;
    if (!seen.has(key)) seen.set(key, i);
    canon[i] = seen.get(key) as number;
  }
  const triangles = index.getCount() / 3;
  for (let t = 0; t < triangles; t++) {
    const a = canon[index.getScalar(t * 3)];
    parent[find(canon[index.getScalar(t * 3 + 1)])] = find(a);
    parent[find(canon[index.getScalar(t * 3 + 2)])] = find(a);
  }
  const found = new Map<number, { triangles: number[]; min: number[]; max: number[] }>();
  const at = [0, 0, 0];
  for (let t = 0; t < triangles; t++) {
    const root = find(canon[index.getScalar(t * 3)]);
    const piece = found.get(root) ?? { triangles: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    piece.triangles.push(t);
    for (let k = 0; k < 3; k++) {
      position.getElement(index.getScalar(t * 3 + k), at);
      for (let d = 0; d < 3; d++) {
        piece.min[d] = Math.min(piece.min[d], at[d]);
        piece.max[d] = Math.max(piece.max[d], at[d]);
      }
    }
    found.set(root, piece);
  }
  return [...found.values()].map((piece) => ({ triangles: piece.triangles, size: Math.max(piece.max[0] - piece.min[0], piece.max[1] - piece.min[1], piece.max[2] - piece.min[2]) * metres }));
}

/**
 * Takes out every piece whose longest side is under `floor` metres, and the corners that only they used.
 * @param doc A glTF document with one mesh per node.
 * @param floor The smallest piece to keep, in metres.
 * @returns How many pieces and triangles went.
 */
export async function trimSpecks(doc: Document, floor: number = SPECK_FLOOR): Promise<{ pieces: number; triangles: number }> {
  let pieces = 0;
  let removed = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const metres = metresPerUnit(node.getWorldMatrix());
    for (const primitive of mesh.listPrimitives()) {
      const all = loosePiecesOf(primitive, metres);
      const kept = all.filter((piece) => piece.size >= floor);
      pieces += all.length - kept.length;
      if (kept.length === all.length) continue;
      const index = primitive.getIndices() as Accessor;
      const wanted = kept.flatMap((piece) => piece.triangles).sort((a, b) => a - b);
      removed += index.getCount() / 3 - wanted.length;
      // a corner is renumbered only when a kept triangle uses it, so the file loses what the specks used
      const renumber = new Map<number, number>();
      const order: number[] = [];
      const indices: number[] = [];
      for (const t of wanted)
        for (let k = 0; k < 3; k++) {
          const old = index.getScalar(t * 3 + k);
          if (!renumber.has(old)) {
            renumber.set(old, order.length);
            order.push(old);
          }
          indices.push(renumber.get(old) as number);
        }
      for (const semantic of primitive.listSemantics()) {
        const attribute = primitive.getAttribute(semantic) as Accessor;
        const size = attribute.getElementSize();
        const from = attribute.getArray() as NonNullable<ReturnType<Accessor["getArray"]>>;
        // the same kind of array it was, so a quantized file stays quantized
        const to = new (from.constructor as new (length: number) => typeof from)(order.length * size);
        order.forEach((old, i) => {
          for (let c = 0; c < size; c++) to[i * size + c] = from[old * size + c];
        });
        attribute.setArray(to);
      }
      index.setArray(order.length < 65536 ? new Uint16Array(indices) : new Uint32Array(indices));
    }
  }
  await doc.transform(prune({ keepAttributes: true }));
  return { pieces, triangles: removed };
}

/** Trims one file in place. */
export async function trimFile(file: string, floor: number = SPECK_FLOOR): Promise<{ pieces: number; triangles: number }> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(new Uint8Array(readFileSync(file)));
  const result = await trimSpecks(doc, floor);
  if (result.pieces > 0) writeFileSync(file, await io.writeBinary(doc));
  return result;
}

if (process.argv[1]?.endsWith("trim-specks.ts")) {
  const [file, floor] = process.argv.slice(2);
  if (!file) throw new Error("usage: node scripts/trim-specks.ts models/<file>.glb [metres]");
  const result = await trimFile(file, floor ? Number(floor) : SPECK_FLOOR);
  console.log(`${file}: ${result.pieces} pieces under the floor left out, ${result.triangles} triangles`);
}
