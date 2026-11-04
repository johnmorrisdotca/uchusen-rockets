// The header tanks: small reserve tanks that feed the engines while the main tanks' pumps start and during a flip. Four spherical vernier headers (7,500 t each, 12.8 m radius) stand at the raft's corners, each with
// a bleed line down to its vernier cluster; two cylindrical main-drive headers (an 800 t start charge each) lie along the raft's top and bottom faces on brackets.
import { beam, box, cyl, drum, pipe, revolve, ring, rng, stencil, facesOf, type Piece } from "./adapter.ts";

export const HEADER = { vernierRadius: 12.8, mainRadius: 14, mainLength: 60 } as const;

export function headerPieces(): Piece[] {
  const r = rng(2120);
  const out: Piece[] = [];
  const R = HEADER.vernierRadius;
  let n = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c: [number, number, number] = [sx * 150, 112, sz * 82];
    out.push(revolve("hull-grey", [c[0], c[2]], Array.from({ length: 13 }, (_, i) => [R * Math.sin((i / 12) * Math.PI), c[1] - R * Math.cos((i / 12) * Math.PI)] as const), 24, { outline: true, only: undefined }));
    for (const dy of [-6, 0, 6]) out.push(ring("engine-pale", [c[0], c[2]], R * Math.sqrt(1 - (dy / R) ** 2), R * Math.sqrt(1 - (dy / R) ** 2) + 0.7, c[1] + dy - 0.5, c[1] + dy + 0.5, 24));
    // four legs to the raft face, a bleed line down to the vernier cluster, a vent stack and a gauge
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push(beam("hull-grey", [c[0] + dx * 8, c[1] - 8, c[2] + dz * 8], [c[0] + dx * 8 - sx * 3, c[1] - 22, sz * 60], 1.6, 1.6));
    out.push(pipe("coolant", [c[0], c[1] - R, c[2]], [sx * 160, 70, sz * 52], 1.6, 8), pipe("hull-orange", [c[0] + 3, c[1] - R, c[2]], [sx * 160 + 3, 70, sz * 52], 1.1, 8));
    out.push(pipe("engine-pale", [c[0], c[1] + R, c[2]], [c[0], c[1] + R + 7, c[2]], 1, 8), box("hull-yellow", [c[0], c[1] + R + 8, c[2]], [3, 2, 3]), box("dark", [c[0] + sx * 3, c[1], c[2] + sz * (R + 0.6)], [4, 8, 1.2]));
    n++;
    out.push(...stencil(facesOf([c[0], c[1], c[2] + sz * R], [1, 1, 0.1], [sz > 0 ? "z+" : "z-"])[0], `H${n}`, 0, 0, 3.6, "hull-white", 0.4));
  }
  for (const sz of [-1, 1]) {
    const z = sz * 86;
    out.push(drum("hull-orange", [0, z], HEADER.mainRadius, 100, 100 + HEADER.mainLength, 24), revolve("hull-orange", [0, z], [[HEADER.mainRadius, 100 + HEADER.mainLength], [9, 100 + HEADER.mainLength + 6], [0.001, 100 + HEADER.mainLength + 8]], 24), revolve("hull-orange", [0, z], [[HEADER.mainRadius, 100], [9, 94], [0.001, 92]], 24));
    for (const y of [112, 130, 148]) out.push(ring("engine-metal", [0, z], HEADER.mainRadius, HEADER.mainRadius + 0.8, y, y + 1.4, 24), ...[-1, 1].map((sx) => beam("hull-grey", [sx * 16, y, z], [sx * 16, y, sz * 62], 2, 2)));
    out.push(pipe("coolant", [0, z, 0].length ? [0, 96, z] : [0, 0, 0], [0, 80, sz * 62], 1.8, 8), cyl("dark", [0, z], 2.4, 160, 168, 10));
    out.push(...stencil(facesOf([0, 130, z + sz * HEADER.mainRadius], [1, 1, 0.1], [sz > 0 ? "z+" : "z-"])[0], sz > 0 ? "MAIN H1" : "MAIN H2", 0, 0, 4, "hull-white", 0.4));
  }
  void r;
  return out;
}
