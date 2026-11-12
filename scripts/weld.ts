// Joins vertices that stand in the same place, so a simplifier can collapse the edge between them. A faceted model stores a different normal on each face, and those vertices would otherwise stay split.
import { PointIndex } from "./point-index.ts";

export interface Welded {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/**
 * Welds a triangle list. With `loose`, vertices at one place become one even when their normals differ, which is what lets a faceted model lose triangles. The picture coordinate still has to agree, so two materials that meet stay two vertices.
 * @param positions A flat list of triangle corners, nine numbers a triangle.
 * @param normals A normal for each corner.
 * @param uvs A picture coordinate for each corner.
 * @param size The longest side of the part, in the same units as the positions. The weld tolerance is a ten-thousandth of it.
 * @param low A corner no position is below.
 * @param loose Join a place's vertices however their normals differ.
 */
export function weld(positions: number[], normals: number[], uvs: number[], size: number, low: readonly number[], loose = false): Welded {
  const count = positions.length / 3;
  const indices = new Uint32Array(count);
  const outP: number[] = [];
  const outN: number[] = [];
  const outT: number[] = [];
  const seen = new PointIndex(size / 10000, [low[0] as number, low[1] as number, low[2] as number]);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = [positions[i * 3] as number, positions[i * 3 + 1] as number, positions[i * 3 + 2] as number];
    const [a, b, c] = [normals[i * 3] as number, normals[i * 3 + 1] as number, normals[i * 3 + 2] as number];
    const [u, v] = [uvs[i * 2] as number, uvs[i * 2 + 1] as number];
    const same = (id: number) => {
      const picture = Math.abs((outT[id * 2] as number) - u) <= 1 / 8192 && Math.abs((outT[id * 2 + 1] as number) - v) <= 1 / 8192;
      const normalsAgree = Math.abs((outN[id * 3] as number) - a) <= 0.02 && Math.abs((outN[id * 3 + 1] as number) - b) <= 0.02 && Math.abs((outN[id * 3 + 2] as number) - c) <= 0.02;
      return picture && (loose || normalsAgree);
    };
    let at = seen.find(x, y, z, same);
    if (at === undefined) {
      at = seen.add(x, y, z);
      outP.push(x, y, z);
      outN.push(a, b, c);
      outT.push(u, v);
    }
    indices[i] = at;
  }
  return { positions: new Float32Array(outP), normals: new Float32Array(outN), uvs: new Float32Array(outT), indices };
}
