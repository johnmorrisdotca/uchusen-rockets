// The mission pod on the keyed dorsal collar, station 174 to 234 m: one mount, two payloads that swap. The relay pod is a communications bay under a tower of dishes and phased arrays; the relief pod is a rack of six
// relief and equipment containers under a gantry. Both stand on the collar's isolator, which has its own pressure and power locks, so a pod is exchanged at a dock. Pure: no three.js and no DOM.
import { antenna, cub, discZ, type Piece, rng, rod } from "./adapter.ts";
import { COLLAR, SPINE as S } from "./dims.ts";
import { dressedFace, pipe } from "./hulls.ts";
import { along, conduit, hatch, hazard, lamp, rail, stencil, WHITE } from "./faces.ts";

export type PodKind = "relay" | "relief";

const [Y0, Y1] = COLLAR.y;
const Z0 = S.hz + 2.3;
const CY = (Y0 + Y1) / 2;

/** The isolator: a short drum with two locks, the pod's adapter plate and its latches. */
function isolator(seed: string): Piece[] {
  const out: Piece[] = [];
  const z = Z0;
  out.push(discZ("hull-grey-dark", 0, CY, z, z + 2.4, 8.4, 24, { only: undefined }), discZ("hull-orange", 0, CY, z + 2.4, z + 2.8, 9.6, 24), discZ("black", 0, CY, z + 2.8, z + 3, 8, 24));
  for (let k = 0; k < 12; k++) {
    const a = (Math.PI * 2 * k) / 12;
    out.push(cub("hull-grey", [9.8 * Math.cos(a) - 0.6, 9.8 * Math.cos(a) + 0.6], [CY + 9.8 * Math.sin(a) - 0.6, CY + 9.8 * Math.sin(a) + 0.6], [z + 2.2, z + 3.4]), cub(k % 2 ? "hazard" : "black", [8.4 * Math.cos(a) - 0.3, 8.4 * Math.cos(a) + 0.3], [CY + 8.4 * Math.sin(a) - 0.3, CY + 8.4 * Math.sin(a) + 0.3], [z + 3, z + 3.15]));
  }
  out.push(...pipe([-5, CY - 3, z], [-5, CY - 3, z + 3], 0.3, "copper"), ...pipe([5, CY + 3, z], [5, CY + 3, z + 3], 0.3, "coolant"), cub("lamp-red", [-0.4, 0.4], [CY + 10.8, CY + 11.4], [z + 1.2, z + 1.6]));
  void seed;
  return out;
}

/** A container: 12 m along Y, 6 m across, 6 m high, with corner posts, a door with a latch bar and a hazard patch. */
function container(x: number, y: number, z: number, material: "hull-orange" | "hull-white" | "hull-yellow" | "hull-grey", seed: string): Piece[] {
  const random = rng(`${seed}/c/${x}/${y}`);
  const out: Piece[] = [cub(material, [x - 3, x + 3], [y, y + 12], [z, z + 6])];
  for (const [dx, dy] of [[-3, 0], [3, 0], [-3, 12], [3, 12]] as const) out.push(cub("hull-grey-dark", [x + dx - 0.25, x + dx + 0.25], [y + dy - 0.25, y + dy + 0.25], [z - 0.05, z + 6.05]));
  for (let k = 1; k < 8; k++) out.push(cub("hull-grey-dark", [x - 3.02, x + 3.02], [y + k * 1.5 - 0.06, y + k * 1.5 + 0.06], [z + 3, z + 3.1]));
  out.push(cub("hull-grey-dark", [x - 2.4, x + 2.4], [y + 12, y + 12.08], [z + 0.4, z + 5.6]), cub("hull-grey", [x - 0.1, x + 0.1], [y + 12.08, y + 12.18], [z + 0.4, z + 5.6]), cub("hazard", [x - 2, x + 2], [y + 12.08, y + 12.14], [z + 0.6, z + 0.9]));
  if (random() < 0.5) out.push(cub("lamp-amber", [x + 2.2, x + 2.5], [y + 12.08, y + 12.2], [z + 5, z + 5.3]));
  // roof ribs, a vent, an identification plate with a number, tie-down rings and corner lamps
  for (let k = 1; k < 6; k++) out.push(cub("hull-grey-dark", [x - 3, x + 3], [y + k * 2 - 0.1, y + k * 2 + 0.1], [z + 6, z + 6.12]));
  out.push(cub("panel-dark", [x - 1.2, x + 1.2], [y + 4.4, y + 6], [z + 6, z + 6.25]), ...[0, 1, 2, 3, 4].map((k) => cub("hull-grey", [x - 1, x + 1], [y + 4.5 + k * 0.3, y + 4.7 + k * 0.3], [z + 6.25, z + 6.32])));
  out.push(cub("hull-white-worn", [x - 3.1, x - 3], [y + 2, y + 5], [z + 3.4, z + 5.4]), ...stencil({ n: "x", sign: -1, at: x - 3.1, a: [y, y + 12], b: [z, z + 6] }, String(10 + Math.floor(random() * 89)), y + 3.5, z + 4.4, 1));
  for (const dy of [2, 6, 10]) for (const dx of [-2.6, 2.6]) out.push(cub("hull-grey", [x + dx - 0.25, x + dx + 0.25], [y + dy - 0.25, y + dy + 0.25], [z + 6, z + 6.35]), cub("hull-grey-dark", [x + dx - 0.12, x + dx + 0.12], [y + dy - 0.12, y + dy + 0.12], [z + 6.35, z + 6.5]));
  for (const [dx, dy] of [[-3, 0], [3, 0], [-3, 12], [3, 12]] as const) out.push(cub("lamp-blue", [x + dx - 0.12, x + dx + 0.12], [y + dy - 0.12, y + dy + 0.12], [z + 6.05, z + 6.3]));
  return out;
}

export function pod(kind: PodKind, detail = 1, seed = `pod-${kind}`): Piece[] {
  const out: Piece[] = [...isolator(seed)];
  const base = Z0 + 3.1;
  if (kind === "relay") {
    // a communications bay on the isolator, plated, with a mast tower and a ring of dishes
    const bay = { x: [-10, 10], y: [Y0 + 5, Y1 - 5], z: [base, base + 8] } as const;
    out.push(cub("hull-grey-dark", bay.x, bay.y, bay.z, { only: undefined }));
    out.push(...dressedFace({ n: "z", sign: 1, at: bay.z[1], a: bay.x, b: bay.y }, { seed, scheme: WHITE, detail, density: 0.3, kinds: ["hatch", "vent", "sensor", "lamps", "number"] }));
    for (const s of [-1, 1] as const) out.push(...dressedFace({ n: "x", sign: s, at: s * 10, a: bay.y, b: bay.z }, { seed, scheme: WHITE, detail, density: 0.4 }));
    for (const s of [-1, 1] as const) out.push(...dressedFace({ n: "y", sign: s, at: s === 1 ? bay.y[1] : bay.y[0], a: bay.z, b: bay.x }, { seed, scheme: WHITE, detail, density: 0.3 }));
    out.push(cub("hull-grey", [-2.4, 2.4], [CY - 2.4, CY + 2.4], [bay.z[1], bay.z[1] + 18]), ...[0, 4, 8, 12, 16].flatMap((h) => [cub("hull-grey-dark", [-3, 3], [CY - 3, CY + 3], [bay.z[1] + h, bay.z[1] + h + 0.4]), cub("lamp-red", [-0.2, 0.2], [CY + 3, CY + 3.2], [bay.z[1] + h, bay.z[1] + h + 0.3])]));
    for (const [x, y, d] of [[-6, -14, -1], [6, -14, -1], [-6, 14, 1], [6, 14, 1]] as const) out.push(...antenna("dish", [x, CY + y, bay.z[1]], [0, 0, 1], 9, `${seed}${x}${y}`), rod("hull-grey-dark", [x, CY + y, bay.z[1]], [x, CY + y, bay.z[1] + 5], 0.5, 8), rod("hull-yellow", [x, CY + y, bay.z[1] + 5], [x, CY + y + d * 2.4, bay.z[1] + 5], 0.12, 5));
    for (const y of [-6, 0, 6]) out.push(...antenna("phased", [0, CY + y, bay.z[1] + 18], [0, 0, 1], 5, `${seed}p${y}`));
    out.push(...antenna("whip", [0, CY, bay.z[1] + 18], [0, 0, 1], 14, `${seed}w`), ...antenna("omni", [-2.4, CY, bay.z[1] + 10], [-1, 0, 0], 4, `${seed}o`), ...antenna("horn", [2.4, CY, bay.z[1] + 12], [1, 0, 0], 3.4, `${seed}h`));
    out.push(...rail(along({ n: "z", sign: 1, at: bay.z[1], a: bay.x, b: bay.y }), 8.4, bay.y[0] + 1, bay.y[1] - 1), ...rail(along({ n: "z", sign: 1, at: bay.z[1], a: bay.x, b: bay.y }), -8.4, bay.y[0] + 1, bay.y[1] - 1), ...stencil({ n: "x", sign: 1, at: 10, a: bay.y, b: bay.z }, "03", CY, base + 4, 2.4));
    out.push(...conduit({ n: "x", sign: 1, at: 10, a: bay.y, b: bay.z }, base + 6.4, Y0 + 7, Y1 - 7, { count: 3, seed }), ...hatch({ n: "x", sign: 1, at: 10, a: bay.y, b: bay.z }, CY + 10, base + 3, 2));
  } else {
    // six containers in two rows of three on a flat cradle, strapped, with a gantry rail and a hoist above
    const rack = { x: [-10, 10], y: [Y0 + 4, Y1 - 4], z: [base, base + 1.6] } as const;
    out.push(cub("hull-grey-dark", rack.x, rack.y, rack.z, { only: undefined }), ...hazard(along({ n: "z", sign: 1, at: rack.z[1], a: rack.x, b: rack.y }), 0, rack.y[0], rack.y[1], 0.5, 1.2));
    const mats = ["hull-orange", "hull-white", "hull-yellow", "hull-white", "hull-orange", "hull-grey"] as const;
    let k = 0;
    for (const x of [-4, 4]) for (let r = 0; r < 3; r++) out.push(...container(x, rack.y[0] + 0.5 + r * 12.4, rack.z[1], mats[k++ % mats.length], seed));
    for (const x of [-7.4, 7.4]) for (let r = 0; r < 4; r++) out.push(cub("hull-grey-dark", [x - 0.4, x + 0.4], [rack.y[0] + r * 12.2 - 0.2, rack.y[0] + r * 12.2 + 0.2], [rack.z[1], rack.z[1] + 6.4]));
    for (const y of [rack.y[0] + 6, rack.y[1] - 6]) out.push(cub("hull-orange", [-8, 8], [y - 0.4, y + 0.4], [rack.z[1] + 6.4, rack.z[1] + 6.9]), rod("hull-grey-dark", [0, y, rack.z[1] + 6.9], [0, y, rack.z[1] + 9.4], 0.25, 6), cub("hull-yellow", [-1.2, 1.2], [y - 0.6, y + 0.6], [rack.z[1] + 9.4, rack.z[1] + 10.2]));
    for (const s of [-1, 1] as const) out.push(cub("hull-grey-dark", [s * 9.4 - 0.5, s * 9.4 + 0.5], [rack.y[0], rack.y[1]], [rack.z[0], rack.z[1] + 0.3]), ...rail(along({ n: "z", sign: 1, at: rack.z[1], a: rack.x, b: rack.y }), s * 9.6, rack.y[0] + 1, rack.y[1] - 1));
    for (let y = rack.y[0] + 2; y < rack.y[1]; y += 3) for (const x of [-9, -4, 0, 4, 9]) out.push(cub("hull-grey-dark", [x - 0.3, x + 0.3], [y - 0.3, y + 0.3], [rack.z[1], rack.z[1] + 0.3]), cub("lamp-amber", [x - 0.08, x + 0.08], [y - 0.08, y + 0.08], [rack.z[1] + 0.3, rack.z[1] + 0.36]));
    out.push(cub("hull-yellow", [-0.5, 0.5], [rack.y[0] + 3, rack.y[1] - 3], [rack.z[1] + 10.2, rack.z[1] + 10.8]), ...lamp({ n: "z", sign: 1, at: rack.z[1] + 10.8, a: rack.x, b: rack.y }, 0, rack.y[0] + 3, "amber", 0.3));
  }
  return out;
}
