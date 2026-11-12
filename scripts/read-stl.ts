// A binary STL, read as triangles in the file's own axes. Data from outside: only read, never run.
// These print files are already Y up. A file whose length is not the binary triangle count is refused, so an ASCII STL cannot be read as numbers by mistake.

/** Turns a corner and its normal about X, then Y, then Z, in degrees, and then adds `at`. */
export function applyMove(p: number[], n: number[], spin: readonly [number, number, number], at: readonly [number, number, number]): void {
  for (const axis of [0, 1, 2] as const) {
    turn(p, axis, spin[axis]);
    turn(n, axis, spin[axis]);
  }
  p[0] += at[0];
  p[1] += at[1];
  p[2] += at[2];
}

function turn(p: number[], axis: 0 | 1 | 2, deg: number): void {
  if (!deg) return;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const i = (axis + 1) % 3;
  const j = (axis + 2) % 3;
  const pi = p[i];
  const pj = p[j];
  p[i] = pi * c - pj * s;
  p[j] = pi * s + pj * c;
}

/** Every triangle of a binary STL: positions and the file's face normal, copied onto each corner. */
export function readBinaryStl(bytes: Uint8Array): { positions: Float32Array; normals: Float32Array } {
  if (bytes.length < 84) throw new Error("not a binary STL");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (bytes.length !== 84 + count * 50) throw new Error(`not a binary STL: ${bytes.length} bytes for ${count} triangles`);
  const positions = new Float32Array(count * 9);
  const normals = new Float32Array(count * 9);
  for (let i = 0; i < count; i++) {
    const o = 84 + i * 50;
    const nx = view.getFloat32(o, true);
    const ny = view.getFloat32(o + 4, true);
    const nz = view.getFloat32(o + 8, true);
    for (let k = 0; k < 3; k++) {
      positions[i * 9 + k * 3] = view.getFloat32(o + 12 + k * 12, true);
      positions[i * 9 + k * 3 + 1] = view.getFloat32(o + 16 + k * 12, true);
      positions[i * 9 + k * 3 + 2] = view.getFloat32(o + 20 + k * 12, true);
      normals[i * 9 + k * 3] = nx;
      normals[i * 9 + k * 3 + 1] = ny;
      normals[i * 9 + k * 3 + 2] = nz;
    }
  }
  return { positions, normals };
}
