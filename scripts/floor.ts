// A painted craft is one mesh. A part is the triangles that touch, welded to half a millimetre. The floor is 2 cm: a detached piece smaller than that is a speck, not a part of the craft.

/** Metres. A detached piece whose longest side is under this is below the floor. */
export const PART_FLOOR = 0.02;

/** World-space triangles of a painted file, the node's scale and shift applied, its stride kept. */
export function paintedMesh(bytes: Uint8Array): MeshTriangles {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as {
    nodes: { mesh?: number; scale?: number[]; translation?: number[] }[];
    meshes: { primitives: { attributes: { POSITION: number }; indices: number }[] }[];
    accessors: { bufferView: number; componentType: number; count: number; type: string; normalized?: boolean; byteOffset?: number }[];
    bufferViews: { byteOffset?: number; byteStride?: number }[];
  };
  const bin = 20 + jsonLength + 8;
  const node = json.nodes.find((one) => one.mesh !== undefined);
  const scale = node?.scale ?? [1, 1, 1];
  const shift = node?.translation ?? [0, 0, 0];
  const sizeOf: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const maxOf: Record<number, number> = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535, 5125: 4294967295, 5126: 1 };
  const read = (accessor: (typeof json.accessors)[number], index: number, component: number) => {
    const bufferView = json.bufferViews[accessor.bufferView];
    const components = accessor.type === "SCALAR" ? 1 : accessor.type === "VEC2" ? 2 : 3;
    const stride = bufferView.byteStride ?? sizeOf[accessor.componentType] * components;
    const offset = bin + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * stride + component * sizeOf[accessor.componentType];
    const raw = accessor.componentType === 5126 ? view.getFloat32(offset, true) : accessor.componentType === 5125 ? view.getUint32(offset, true) : accessor.componentType === 5123 ? view.getUint16(offset, true) : accessor.componentType === 5122 ? view.getInt16(offset, true) : accessor.componentType === 5121 ? view.getUint8(offset) : view.getInt8(offset);
    return accessor.normalized ? raw / maxOf[accessor.componentType] : raw;
  };
  const positions: number[][] = [];
  const triangles: number[][] = [];
  const primitive = json.meshes[node?.mesh ?? 0].primitives[0];
  const position = json.accessors[primitive.attributes.POSITION];
  for (let i = 0; i < position.count; i++) positions.push([0, 1, 2].map((c) => read(position, i, c) * scale[c] + shift[c]));
  const index = json.accessors[primitive.indices];
  for (let i = 0; i < index.count; i += 3) triangles.push([0, 1, 2].map((k) => read(index, i + k, 0)));
  return { positions, triangles };
}

export interface MeshTriangles {
  positions: readonly (readonly number[])[];
  triangles: readonly (readonly number[])[];
}

function groupsOf(mesh: MeshTriangles): Map<number, number[]> {
  const { positions, triangles } = mesh;
  const weld = new Map<string, number>();
  const idOf = positions.map((p) => {
    const key = `${Math.round(p[0] * 2000)},${Math.round(p[1] * 2000)},${Math.round(p[2] * 2000)}`;
    let id = weld.get(key);
    if (id === undefined) {
      id = weld.size;
      weld.set(key, id);
    }
    return id;
  });
  const parent = [...weld.keys()].map((_, i) => i);
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const join = (a: number, b: number) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };
  for (const tri of triangles) {
    join(idOf[tri[0]], idOf[tri[1]]);
    join(idOf[tri[0]], idOf[tri[2]]);
  }
  const groups = new Map<number, number[]>();
  triangles.forEach((tri, i) => {
    const group = find(idOf[tri[0]]);
    const list = groups.get(group);
    if (list) list.push(i);
    else groups.set(group, [i]);
  });
  return groups;
}

function longestOf(mesh: MeshTriangles, indexes: readonly number[]): number {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const index of indexes)
    for (const vertex of mesh.triangles[index]) {
      const p = mesh.positions[vertex];
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c], p[c]);
        max[c] = Math.max(max[c], p[c]);
      }
    }
  return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

/** Triangle indexes whose piece has a longest side under `floor` metres. */
export function trianglesBelowFloor(mesh: MeshTriangles, floor = PART_FLOOR): number[] {
  const drop: number[] = [];
  for (const indexes of groupsOf(mesh).values()) if (longestOf(mesh, indexes) < floor) drop.push(...indexes);
  return drop;
}

/** How many detached pieces have a longest side under `floor` metres, and how many triangles they hold. */
export function specksBelowFloor(mesh: MeshTriangles, floor = PART_FLOOR): { pieces: number; triangles: number } {
  let pieces = 0;
  let triangles = 0;
  for (const indexes of groupsOf(mesh).values())
    if (longestOf(mesh, indexes) < floor) {
      pieces++;
      triangles += indexes.length;
    }
  return { pieces, triangles };
}
