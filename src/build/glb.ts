// The writer: a rocket's parts into one small .glb, in Node or a browser, with no dependency. One node per part, one primitive per material, plus the lines of the line looks as line primitives; positions
// and normals packed into 16 bits (KHR_mesh_quantization). The same parts always give the same bytes: no clock, no random, a fixed order.
import { MATERIALS, type MaterialName, type MaterialSpec } from "../model/materials.ts";
import type { Buffers, LineBuffers, PartMesh } from "../model/pieces.ts";

const SHORT = 5122;
const USHORT = 5123;
const UINT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_BUFFER = 34963;
const LINES = 1;

export interface GlbPart {
  /** The node's name: what the viewer moves. */
  name: string;
  mesh: PartMesh;
  at: readonly [number, number, number];
}

/**
 * A binary glTF file: its bytes and how many triangles it holds. Save the bytes as a `.glb` file or hand them to any glTF viewer.
 *
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const glb = build({ rocket: "starship", variant: "v3" }).glb();
 * console.log(glb.bytes.length > 1000, glb.triangles > 0);
 * ```
 */
export interface Glb {
  bytes: Uint8Array;
  triangles: number;
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearOf = (hex: string) => [1, 3, 5].map((i) => round6(toLinear(Number.parseInt(hex.slice(i, i + 2), 16) / 255)));

/**
 * Writes parts into one small binary glTF file, in Node or a browser, with no dependency: one node for each part and one primitive for each material. The same parts always give the same bytes.
 *
 * @param parts The parts to write: each has a node name, its mesh and where it stands in metres.
 * @returns The file's bytes and its triangle count.
 * @example
 * ```ts
 * import { build, toGlb } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const rocket = build({ rocket: "falcon-9", variant: "block-5" });
 * const glb = toGlb(rocket.parts.map((part) => ({ name: part.slot, mesh: part.mesh, at: [0, 0, 0] as const })));
 * console.log(glb.bytes.length > 1000, glb.triangles > 0);
 * ```
 */
export function toGlb(parts: readonly GlbPart[]): Glb {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const bufferViews: Record<string, number>[] = [];
  const accessors: Record<string, unknown>[] = [];
  const put = (data: Uint8Array, target: number, byteStride?: number): number => {
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      offset += pad;
    }
    chunks.push(data);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, target, ...(byteStride ? { byteStride } : {}) });
    offset += data.byteLength;
    return bufferViews.length - 1;
  };
  const accessor = (a: Record<string, unknown>): number => accessors.push(a) - 1;

  const materials: Record<string, unknown>[] = [];
  const materialIndex = new Map<string, number>();
  const useMaterial = (name: string): number => {
    const known = materialIndex.get(name);
    if (known !== undefined) return known;
    const spec: MaterialSpec | { color: string; metal: number; rough: number } = name.startsWith("line-") ? { color: "#8fa1b8", metal: 0, rough: 1 } : MATERIALS[name as MaterialName];
    materials.push({ name, pbrMetallicRoughness: { baseColorFactor: [...linearOf(spec.color), 1], metallicFactor: spec.metal, roughnessFactor: spec.rough } });
    materialIndex.set(name, materials.length - 1);
    return materials.length - 1;
  };

  const indexAccessor = (list: readonly number[], count: number): number => {
    const wide = count >= 65536;
    const data = wide ? Uint32Array.from(list) : Uint16Array.from(list);
    return accessor({ bufferView: put(new Uint8Array(data.buffer), ELEMENT_BUFFER), componentType: wide ? UINT : USHORT, count: list.length, type: "SCALAR" });
  };

  let triangles = 0;
  const meshes: Record<string, unknown>[] = [];
  const nodes: Record<string, unknown>[] = [];
  const roots: number[] = [];
  /** One mesh of a part or of one of its moving groups: its primitives and the packing's middle and half-size, returned as the nodes that hold it. */
  const packMesh = (mesh: PartMesh, name: string): number => {
    const faces = [...mesh.faces] as [MaterialName, Buffers][];
    // the packing's middle and half-size, over all of the part's points
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    const sweep = (positions: readonly number[]) => {
      for (let i = 0; i < positions.length; i += 3)
        for (let c = 0; c < 3; c++) {
          if (positions[i + c] < lo[c]) lo[c] = positions[i + c];
          if (positions[i + c] > hi[c]) hi[c] = positions[i + c];
        }
    };
    for (const [, b] of faces) sweep(b.positions);
    sweep(mesh.feature.positions);
    sweep(mesh.weld.positions);
    const q = [0, 1, 2].map((c) => (lo[c] + hi[c]) / 2);
    const half = Math.max(1e-3, ...[0, 1, 2].map((c) => (hi[c] - lo[c]) / 2));
    const packPositions = (positions: readonly number[]) => {
      const count = positions.length / 3;
      const out = new Int16Array(count * 4);
      const min = [32767, 32767, 32767];
      const max = [-32767, -32767, -32767];
      for (let i = 0; i < count; i++)
        for (let c = 0; c < 3; c++) {
          const v = Math.round(((positions[i * 3 + c] - q[c]) / half) * 32767);
          out[i * 4 + c] = v;
          if (v < min[c]) min[c] = v;
          if (v > max[c]) max[c] = v;
        }
      return accessor({ bufferView: put(new Uint8Array(out.buffer), ARRAY_BUFFER, 8), componentType: SHORT, count, type: "VEC3", normalized: true, min, max });
    };
    const primitives: Record<string, unknown>[] = [];
    for (const [name, b] of faces) {
      const count = b.positions.length / 3;
      const normal = new Int16Array(count * 4);
      for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) normal[i * 4 + c] = Math.round(b.normals[i * 3 + c] * 32767);
      const attributes: Record<string, number> = {
        POSITION: packPositions(b.positions),
        NORMAL: accessor({ bufferView: put(new Uint8Array(normal.buffer), ARRAY_BUFFER, 8), componentType: SHORT, count, type: "VEC3", normalized: true }),
      };
      if (b.hasUv) {
        const uv = new Uint16Array(count * 2);
        for (let i = 0; i < count * 2; i++) uv[i] = Math.round(Math.min(1, Math.max(0, b.uvs[i])) * 65535);
        attributes.TEXCOORD_0 = accessor({ bufferView: put(new Uint8Array(uv.buffer), ARRAY_BUFFER, 4), componentType: USHORT, count, type: "VEC2", normalized: true });
      }
      triangles += b.indices.length / 3;
      primitives.push({ attributes, indices: indexAccessor(b.indices, count), material: useMaterial(name) });
    }
    for (const [name, lines] of [
      ["line-feature", mesh.feature],
      ["line-weld", mesh.weld],
    ] as [string, LineBuffers][]) {
      if (lines.indices.length === 0) continue;
      primitives.push({ attributes: { POSITION: packPositions(lines.positions) }, indices: indexAccessor(lines.indices, lines.positions.length / 3), material: useMaterial(name), mode: LINES });
    }
    meshes.push({ name, primitives });
    nodes.push({ name: `${name}-mesh`, mesh: meshes.length - 1, translation: q.map(round6), scale: [round6(half), round6(half), round6(half)] });
    return nodes.length - 1;
  };

  for (const part of parts) {
    // a holder that the viewer moves, and the packed mesh under it; each moving group is a node of its own beside it, at its pivot, with the axis it turns about
    const mesh = part.mesh;
    const children = [packMesh(mesh, part.name)];
    for (const group of mesh.moves) {
      const inside = packMesh(group.mesh, `${part.name}~${group.id}`);
      nodes.push({ name: `${part.name}~${group.id}`, children: [inside], translation: group.pivot.map(round6), extras: { axis: group.axis.map(round6), group: group.name, ...(group.under ? { under: group.under } : {}) } });
      children.push(nodes.length - 1);
    }
    nodes.push({ name: part.name, children, translation: part.at.map(round6) });
    roots.push(nodes.length - 1);
  }

  const json = {
    asset: { version: "2.0", generator: "uchusen-rockets" },
    extensionsUsed: ["KHR_mesh_quantization"],
    extensionsRequired: ["KHR_mesh_quantization"],
    scene: 0,
    scenes: [{ name: "rocket", nodes: roots }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (text.byteLength % 4)) % 4;
  const binPad = (4 - (offset % 4)) % 4;
  const total = 12 + 8 + text.byteLength + jsonPad + 8 + offset + binPad;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, text.byteLength + jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(text, 20);
  bytes.fill(0x20, 20 + text.byteLength, 20 + text.byteLength + jsonPad);
  let at = 20 + text.byteLength + jsonPad;
  view.setUint32(at, offset + binPad, true);
  view.setUint32(at + 4, 0x004e4942, true);
  at += 8;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return { bytes, triangles };
}
