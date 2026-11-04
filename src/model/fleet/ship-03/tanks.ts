// Fuel and water shielding, station 90 to 250 m: the narrow spine with four propellant barrels under it, two to a side, each 22 m across and 72 m long, in a water jacket, on cradles, with its own isolation valves and a
// feed line to the spine so the four draw down symmetrically. The aft pair stands in the aft module, the fore pair in the fore module with the keyed dorsal collar's base and the ventral keel. A cutaway opens the
// starboard barrel to show its baffles, its pumps and the propellant. Pure: no three.js and no DOM.
import { beam, collar, cub, discZ, HULL_STACKS, layerShells, type Piece, place, rng, rod } from "./adapter.ts";
import { BARREL, COLLAR, SPINE as S, STATION } from "./dims.ts";
import { catwalk, pipe } from "./hulls.ts";
import { along, conduit, faceOf, hatch, rail, skin, SPINE } from "./faces.ts";
import { capsule, collarAt, OPEN_STARBOARD, ringAt, tubeAt } from "./shapes.ts";

/** The spine from y0 to y1: a box in dark metal with plating, ring frames every 8 m, conduit bundles along the dorsal and ventral faces, hatches, a handrail, and bolted flanges where it meets the next module. */
export function spine(y0: number, y1: number, seed: string, detail = 1): Piece[] {
  const box = { x: [-S.hx, S.hx], y: [y0, y1], z: [-S.hz, S.hz] } as const;
  const out: Piece[] = [cub("hull-grey-dark", box.x, box.y, box.z, { only: undefined })];
  const random = rng(`${seed}/spine`);
  for (const [n, sign] of [["z", 1], ["z", -1], ["x", 1], ["x", -1]] as const) {
    const own = faceOf(box, n, sign);
    out.push(...skin(own, SPINE, seed, { detail, cell: [4, 3.5], raise: 0.2, blocks: 0.18 }));
    const f = n === "z" ? along(own) : own;
    const b = 0;
    out.push(...conduit(f, b - 3, y0 + 1.5, y1 - 1.5, { count: 3, seed, stand: 0.42 }), ...conduit(f, b + 3, y0 + 1.5, y1 - 1.5, { count: 4, seed, stand: 0.42, materials: ["copper", "coolant", "lamp-red"] }));
    for (let y = y0 + 6; y < y1 - 4; y += 12 + random() * 6) out.push(...hatch(f, y, b + (random() < 0.5 ? -6 : 6) * (n === "z" ? 0.45 : 0.3), 1.6));
    if (sign === 1 && n === "z") out.push(...rail(f, -6.6, y0 + 2, y1 - 2), ...rail(f, 6.6, y0 + 2, y1 - 2));
  }
  // ring frames: a box ring round the spine every 8 m, with bolts and a lamp
  for (let y = y0 + 4; y < y1 - 2; y += 8) {
    const t = 0.5;
    out.push(cub("hull-grey", [-S.hx - t, S.hx + t], [y - 0.5, y + 0.5], [-S.hz - t, S.hz + t]), cub("hull-grey-dark", [-S.hx - t * 1.5, S.hx + t * 1.5], [y - 0.14, y + 0.14], [-S.hz - t * 1.5, S.hz + t * 1.5]));
    for (const x of [-5, 0, 5]) out.push(cub("hull-grey-dark", [x - 0.18, x + 0.18], [y - 0.18, y + 0.18], [S.hz + t, S.hz + t + 0.22]), cub("lamp-amber", [x - 0.1, x + 0.1], [y - 0.1, y + 0.1], [-S.hz - t - 0.2, -S.hz - t]));
  }
  return out;
}

/** One barrel: a capsule in a water jacket, with ring frames, orange cassette bands, vented fuel cassettes on the outer face, level gauges, valve blocks at each dome and the cradles that hold it to the spine. */
function barrel(side: 1 | -1, y0: number, y1: number, cut: boolean): Piece[] {
  const x = side * BARREL.x;
  const z = BARREL.z;
  const r = BARREL.r;
  const straight: [number, number] = [y0 + r, y1 - r];
  const open = cut && side === 1;
  const out: Piece[] = [];
  out.push(capsule("hull-white", x, z, r, y0, y1, { only: undefined, body: true, outline: true, ...(open ? { arc: OPEN_STARBOARD } : {}) }));
  // ring frames and water-jacket sleeves, every 6 m along the barrel
  for (let y = straight[0] + 1; y < straight[1]; y += 6) {
    out.push(ringAt("hull-grey-dark", x, z, r + 0.15, y, 0.42, open ? { arc: OPEN_STARBOARD } : {}));
    out.push(collarAt("fuel", x, z, r + 0.02, r + 0.3, y + 0.8, y + 2.4, open ? { arc: OPEN_STARBOARD } : {}));
  }
  // orange cassette bands: four bands, each a collar of removable panels
  for (const y of [straight[0] + 6, straight[0] + 20, straight[1] - 20, straight[1] - 6]) out.push(collarAt("hull-orange", x, z, r + 0.02, r + 0.22, y - 2.2, y + 2.2, open ? { arc: OPEN_STARBOARD } : {}), ringAt("hazard", x, z, r + 0.24, y - 2.2, 0.08, open ? { arc: OPEN_STARBOARD } : {}), ringAt("hazard", x, z, r + 0.24, y + 2.2, 0.08, open ? { arc: OPEN_STARBOARD } : {}));
  // vented fuel cassettes on the outer face (facing away from the spine): two columns of six boxes with vent slots
  const outward: 1 | -1 = side;
  for (const dz of [-3, 3]) {
    for (let k = 0; k < 6; k++) {
      const y = straight[0] + 4 + k * ((straight[1] - straight[0] - 8) / 5);
      const cx = x + outward * Math.sqrt(Math.max(0, r * r - dz * dz)) * (open ? 0 : 1);
      if (open) continue;
      out.push(cub("hull-orange-worn", outward === 1 ? [cx, cx + 0.8] : [cx - 0.8, cx], [y - 1.6, y + 1.6], [z + dz - 1.2, z + dz + 1.2]));
      for (let s = 0; s < 4; s++) out.push(cub("panel-dark", outward === 1 ? [cx + 0.8, cx + 0.88] : [cx - 0.88, cx - 0.8], [y - 1.3 + s * 0.7, y - 0.9 + s * 0.7], [z + dz - 0.9, z + dz + 0.9]));
      out.push(cub("lamp-amber", outward === 1 ? [cx + 0.8, cx + 0.92] : [cx - 0.92, cx - 0.8], [y + 1.2, y + 1.4], [z + dz + 0.9, z + dz + 1.1]));
    }
  }
  // level gauges: a vertical glass with a float marker and two lamps, up the dorsal side of the barrel
  for (const y of [straight[0] + 12, straight[1] - 12]) out.push(rod("glass", [x, y, z + r + 0.4], [x, y, z + r + 3.4], 0.2, 8), rod("fuel", [x, y, z + r + 0.4], [x, y, z + r + 2.6], 0.12, 6), rod("lamp-blue", [x, y, z + r + 3.4], [x, y, z + r + 3.8], 0.18, 6));
  // valve blocks and isolation valves at each dome, with a manhole
  for (const [y, face] of [[y0 + 1.6, -1], [y1 - 1.6, 1]] as const) {
    out.push(cub("hull-grey-dark", [x - 2.4, x + 2.4], [y - 1.1, y + 1.1], [z - 2.4, z + 2.4]), cub("hull-orange", [x - 2, x + 2], [y - 1.1 + face * 0.1, y + 1.1], [z + 2.4, z + 3]), ringAt("coolant", x, z, 3.2, y, 0.3));
    out.push(rod("lamp-red", [x + 1, y, z + 3], [x + 1, y, z + 3.5], 0.3, 8));
  }
  // cradles: three ring beams from the spine to the barrel, with a clevis at each end
  for (const y of [straight[0] + 2, (straight[0] + straight[1]) / 2, straight[1] - 2]) {
    const sx = side * (S.hx + 0.6);
    out.push(beam("hull-grey", [sx, y, 0], [x - side * (r - 1), y, z + 3], 1.4, 1.1), beam("hull-grey", [sx, y, -S.hz + 1], [x - side * (r - 1), y, z - 3], 1.4, 1.1), cub("hull-yellow", side === 1 ? [x - r - 0.5, x - r + 0.8] : [x + r - 0.8, x + r + 0.5], [y - 0.9, y + 0.9], [z - 1.2, z + 1.2]));
  }
  // the feed line: from the dome's valve block along the spine's flank to a manifold on the spine, with a crossfeed to the opposite barrel
  out.push(...pipe([x - side * 3, y0 + 1.6, z + 2.8], [side * S.hx, y0 + 1.6, -S.hz + 1], 0.42), ...pipe([x - side * 3, y1 - 1.6, z + 2.8], [side * S.hx, y1 - 1.6, -S.hz + 1], 0.42));
  out.push(rod("fuel", [side * (S.hx + 0.6), y0 + 1.6, -S.hz + 1], [side * (S.hx + 0.6), y1 - 1.6, -S.hz + 1], 0.55, 8));
  // the cutaway: the layers of the tank wall as shells, the propellant, baffles and pumps
  if (open) {
    out.push(...place(layerShells(r, straight[0], straight[1], HULL_STACKS.tanker, [Math.PI, 2 * Math.PI], 28), { at: [x, 0, z] }));
    out.push(tubeAt("fuel", x, z, r - 0.8, straight[0], straight[1], { segs: 24, arc: OPEN_STARBOARD }));
    for (let y = straight[0] + 3; y < straight[1]; y += 6) out.push(collarAt("hull-grey", x, z, r * 0.3, r - 1.4, y, y + 0.25, { arc: OPEN_STARBOARD }), ringAt("hull-grey-dark", x, z, r - 1.5, y + 0.1, 0.3, { arc: OPEN_STARBOARD }));
    for (const y of [y0 + 3, y1 - 3]) out.push(tubeAt("engine-metal", x, z + 2, 1.2, y - 1.5, y + 1.5, { segs: 14 }), cub("hull-grey-dark", [x - 1.8, x + 1.8], [y - 0.5, y + 0.5], [z - 3.4, z + 0.8]), ringAt("copper", x, z + 2, 1.6, y, 0.2));
    out.push(...catwalk(straight[0] + 1, straight[1] - 1, x, z - r + 3, 1.6));
  }
  return out;
}

/** A pair of barrels and the spine between them: `aft` or `fore`. */
export function fuelSection(which: "aft" | "fore", cut: boolean, detail = 1, seed = which === "aft" ? "fuel-aft" : "fuel-fore"): Piece[] {
  const [Y0, Y1] = which === "aft" ? STATION.fuelAft : STATION.fuelFore;
  const span = which === "aft" ? BARREL.aft : BARREL.fore;
  const out: Piece[] = [...spine(Y0, Y1, seed, detail)];
  for (const side of [-1, 1] as const) out.push(...barrel(side, span[0], span[1], cut));
  out.push(...collar("L", Y0, -1), ...collar("L", Y1, 1));
  if (which === "aft") {
    // a header tank slung under the spine's end, with its own feed
    out.push(capsule("hull-white", 0, -S.hz - 3.9, 3.8, Y1 - 24, Y1 - 4, { only: undefined }), ringAt("hull-orange", 0, -S.hz - 3.9, 3.85, Y1 - 14, 0.3), ringAt("hull-grey-dark", 0, -S.hz - 3.9, 3.9, Y1 - 8, 0.2), ringAt("hull-grey-dark", 0, -S.hz - 3.9, 3.9, Y1 - 20, 0.2));
    for (const y of [Y1 - 22, Y1 - 12, Y1 - 6]) out.push(cub("hull-grey", [-1.2, 1.2], [y - 0.4, y + 0.4], [-S.hz - 0.2, -S.hz - 2.6]));
  } else {
    // the keyed collar's base on the spine's back, and the keel and its ventral dock
    const [c0, c1] = COLLAR.y;
    out.push(cub("hull-grey", [-12, 12], [c0, c1], [S.hz, S.hz + 1.4], { only: undefined }), discZ("hull-orange", 0, (c0 + c1) / 2, S.hz + 1.4, S.hz + 1.9, 10.5, 24), discZ("hull-grey-dark", 0, (c0 + c1) / 2, S.hz + 1.9, S.hz + 2.3, 7.5, 24));
    for (let k = 0; k < 16; k++) {
      const a = (Math.PI * 2 * k) / 16;
      out.push(cub(k % 2 ? "hazard" : "black", [-0.6 + 8.9 * Math.cos(a), 0.6 + 8.9 * Math.cos(a)], [(c0 + c1) / 2 - 0.6 + 8.9 * Math.sin(a), (c0 + c1) / 2 + 0.6 + 8.9 * Math.sin(a)], [S.hz + 2.3, S.hz + 2.55]));
    }
    // four keying lugs at the corners and four capped utility sockets
    for (const [x, dy] of [[-9, -12], [9, -12], [-9, 12], [9, 12]] as const) out.push(cub("hull-grey-dark", [x - 1, x + 1], [(c0 + c1) / 2 + dy - 1.3, (c0 + c1) / 2 + dy + 1.3], [S.hz + 1.4, S.hz + 3]), cub("hull-yellow", [x - 0.6, x + 0.6], [(c0 + c1) / 2 + dy - 0.6, (c0 + c1) / 2 + dy + 0.6], [S.hz + 3, S.hz + 3.4]));
    // the keel: a trapezoid pylon down from the spine with a ventral docking collar
    const k0 = 188;
    const k1 = 212;
    out.push(beam("hull-grey-dark", [0, k0, -S.hz], [0, k0 + 4, -S.hz - 24], 14, 1.4), beam("hull-grey-dark", [0, k1, -S.hz], [0, k1 - 4, -S.hz - 24], 14, 1.4), cub("hull-grey-dark", [-7, 7], [k0 + 4, k1 - 4], [-S.hz - 30, -S.hz - 24], { only: undefined }));
    out.push(discZ("hull-grey", 0, (k0 + k1) / 2, -S.hz - 31, -S.hz - 30, 8, 24), discZ("hull-orange", 0, (k0 + k1) / 2, -S.hz - 31.4, -S.hz - 31, 6.6, 24), discZ("black", 0, (k0 + k1) / 2, -S.hz - 31.6, -S.hz - 31.4, 4.2, 24));
    for (let k = 0; k < 12; k++) {
      const a = (Math.PI * 2 * k) / 12;
      out.push(cub("hull-grey-dark", [5.6 * Math.cos(a) - 0.4, 5.6 * Math.cos(a) + 0.4], [(k0 + k1) / 2 + 5.6 * Math.sin(a) - 0.4, (k0 + k1) / 2 + 5.6 * Math.sin(a) + 0.4], [-S.hz - 31.8, -S.hz - 31.4]), cub("lamp-blue", [5.6 * Math.cos(a) - 0.12, 5.6 * Math.cos(a) + 0.12], [(k0 + k1) / 2 + 5.6 * Math.sin(a) - 0.12, (k0 + k1) / 2 + 5.6 * Math.sin(a) + 0.12], [-S.hz - 32, -S.hz - 31.8]));
    }
    for (const s of [-1, 1]) out.push(...rail(faceOf({ x: [-7, 7], y: [k0, k1], z: [-S.hz - 30, -S.hz - 24] }, "x", s as 1 | -1), -S.hz - 27, k0 + 4, k1 - 4));
  }
  return out;
}
