// Fuel and water shielding, station 90 to 250 m: the narrow spine with four propellant barrels under it, two to a side, each 22 m across and 72 m long, in a water jacket, on cradles, with its own isolation valves and a
// feed line to the spine so the four draw down symmetrically. The aft pair stands in the aft module, the fore pair in the fore module with the keyed dorsal collar's base and the ventral keel. A cutaway opens the
// starboard barrel to show its baffles, its pumps and the propellant. Pure: no three.js and no DOM.
import { collar, cub, discZ, HULL_STACKS, ibeam, layerShells, type Piece, pipeRun, place, rod, roundStrut } from "./adapter.ts";
import { BARREL, COLLAR, SPINE as S, STATION } from "./dims.ts";
import { catwalk, pipe } from "./hulls.ts";
import { faceOf, rail } from "./faces.ts";
import { capsule, collarAt, OPEN_STARBOARD, ringAt, tubeAt } from "./shapes.ts";
import { miyamotoPorts } from "./service.ts";

/** The spine from y0 to y1: an open truss, as the integrated truss of the ISS and the long spines of the Mars transfer vehicle studies are. Four round chords with ball joints at the nodes, a box frame of I-beams at every bay, round diagonals, and the services (conduit bundles, a valve skid, a ladder) strung inside it. */
export function spine(y0: number, y1: number, detail = 1): Piece[] {
  const out: Piece[] = [];
  const X = S.hx;
  const Z = S.hz;
  const bay = 8;
  const n = Math.round((y1 - y0) / bay);
  const step = (y1 - y0) / n;
  const corners: readonly (readonly [number, number])[] = [[-X, -Z], [X, -Z], [X, Z], [-X, Z]];
  // the four chords, each a tube with a collar at every node
  for (const [x, z] of corners) out.push(rod("hull-grey", [x, y0, z], [x, y1, z], 0.7, 12, { only: "mesh" }), rod("hull-grey-dark", [x, y0, z], [x, y1, z], 0.45, 12));
  for (let k = 0; k <= n; k++) {
    const y = y0 + k * step;
    for (const [x, z] of corners) out.push({ kind: "lathe", material: "hull-white", at: [x, z], segs: 12, profile: [[0.001, y - 1.05], [0.9, y - 0.7], [1.15, y], [0.9, y + 0.7], [0.001, y + 1.05]], only: "mesh" });
    // the frame at the node: four I-beams round the square, and a gusset at each corner
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i];
      const [x1, z1] = corners[(i + 1) % 4];
      out.push(...ibeam("hull-grey", [x0, y, z0], [x1, y, z1], 0.9, 0.5, i % 2 ? [1, 0, 0] : [0, 0, 1]));
    }
    out.push(...ibeam("hull-grey-dark", [-X, y, 0], [X, y, 0], 0.6, 0.35, [0, 0, 1]));
  }
  // the diagonals of each bay: a round strut across each of the four faces, alternating the way they lean
  for (let k = 0; k < n; k++) {
    const ya = y0 + k * step;
    const yb = ya + step;
    const lean = k % 2 === 0;
    out.push(...roundStrut("hull-grey-dark", [-X, lean ? ya : yb, -Z], [-X, lean ? yb : ya, Z], 0.22), ...roundStrut("hull-grey-dark", [X, lean ? yb : ya, -Z], [X, lean ? ya : yb, Z], 0.22), ...roundStrut("hull-grey-dark", [-X, lean ? ya : yb, Z], [X, lean ? yb : ya, Z], 0.22), ...roundStrut("hull-grey-dark", [-X, lean ? yb : ya, -Z], [X, lean ? ya : yb, -Z], 0.22));
  }
  // the services inside: two bundles of round pipes with flanges and clamps, a valve skid every other bay, a cable tray, a ladder
  for (const [x, z, mats] of [[-3.5, -6, ["coolant", "copper"]], [3.5, -6, ["copper", "lamp-red"]], [-3.5, 6, ["coolant", "hull-white-worn"]], [3.5, 6, ["copper", "coolant"]]] as const) {
    for (let i = 0; i < 2; i++) out.push(...pipeRun(mats[i], [[x + (i - 0.5) * 1.1, y0 + 0.5, z], [x + (i - 0.5) * 1.1, y1 - 0.5, z]], 0.34, { clampEvery: 4 / detail, bracket: [0, 0, z > 0 ? 1 : -1] }));
  }
  for (let k = 1; k < n; k += 2) {
    const y = y0 + k * step;
    out.push(cub("hull-grey-dark", [-2.2, 2.2], [y - 1.2, y + 1.2], [-1.2, 1.2]), cub("hull-orange", [-2.2, 2.2], [y - 1.2, y + 1.2], [1.2, 1.5]), rod("hull-yellow", [-1.4, y, 1.5], [1.4, y, 1.5], 0.18, 12), rod("lamp-amber", [1.6, y - 0.4, 1.5], [1.6, y - 0.4, 1.9], 0.14, 8));
    for (const x of [-1.6, 0, 1.6]) out.push(rod("hull-grey", [x, y - 1.2, -1.2], [x, y - 1.2, -2.2], 0.12, 8), rod("hull-grey", [x, y + 1.2, -1.2], [x, y + 1.2, -2.2], 0.12, 8));
  }
  out.push(cub("hull-grey-dark", [-1, 1], [y0 + 1, y1 - 1], [-Z + 0.5, -Z + 0.7]), ...[...Array(Math.floor((y1 - y0 - 2) / (0.4 / detail))).keys()].map((k) => rod("hull-yellow", [-0.7, y0 + 1 + k * (0.4 / detail), -Z + 0.9], [0.7, y0 + 1 + k * (0.4 / detail), -Z + 0.9], 0.03, 6)));
  out.push(...rail({ n: "z", sign: 1, at: Z + 0.6, a: [-X, X], b: [y0, y1], swap: true }, -6, y0 + 2, y1 - 2));
  return out;
}

/** One barrel: a capsule in a water jacket, with ring frames, orange cassette bands, vented fuel cassettes on the outer face, level gauges, valve blocks at each dome and the cradles that hold it to the spine. */
function barrel(side: 1 | -1, y0: number, y1: number, cut: boolean, detail: number, xAbs: number = BARREL.x): Piece[] {
  const x = side * xAbs;
  const z = BARREL.z;
  const r = BARREL.r;
  const straight: [number, number] = [y0 + r, y1 - r];
  const open = cut && side === 1;
  const out: Piece[] = [];
  out.push(capsule("hull-white", x, z, r, y0, y1, { only: undefined, body: true, outline: true, ...(open ? { arc: OPEN_STARBOARD } : {}) }));
  // ring frames and water-jacket sleeves, every 6 m along the barrel
  for (let y = straight[0] + 1; y < straight[1]; y += 6 / detail) {
    out.push(ringAt("hull-grey-dark", x, z, r + 0.15, y, 0.42, open ? { arc: OPEN_STARBOARD } : {}));
    out.push(collarAt("fuel", x, z, r + 0.02, r + 0.3, y + 0.8, y + 2.4, open ? { arc: OPEN_STARBOARD } : {}));
  }
  // orange cassette bands: four bands, each a collar of removable panels
  for (const y of [straight[0] + 6, straight[0] + 20, straight[1] - 20, straight[1] - 6]) out.push(collarAt("hull-orange", x, z, r + 0.02, r + 0.22, y - 2.2, y + 2.2, open ? { arc: OPEN_STARBOARD } : {}), ringAt("hazard", x, z, r + 0.24, y - 2.2, 0.08, open ? { arc: OPEN_STARBOARD } : {}), ringAt("hazard", x, z, r + 0.24, y + 2.2, 0.08, open ? { arc: OPEN_STARBOARD } : {}));
  // stringers up the barrel as round rods, manhole covers, an instrument line with its clamps, and a gold foil collar at each dome
  for (let k = 0; k < 24; k++) {
    const a = (Math.PI * 2 * k) / 24;
    if (open && Math.sin(a) > 0.05) continue;
    const px = x + (r + 0.18) * Math.sin(a);
    const pz = z + (r + 0.18) * Math.cos(a);
    out.push(rod(k % 3 === 0 ? "hull-grey" : "hull-grey-dark", [px, straight[0] + 0.5, pz], [px, straight[1] - 0.5, pz], 0.14, 8));
  }
  for (const y of [straight[0] + 12, straight[1] - 12]) for (const a of [Math.PI * 0.75, Math.PI * 1.25]) {
    const px = x + (r + 0.1) * Math.sin(a);
    const pz = z + (r + 0.1) * Math.cos(a);
    out.push(rod("hull-grey-dark", [px, y - 0.1, pz], [px + 0.5 * Math.sin(a), y - 0.1, pz + 0.5 * Math.cos(a)], 1.1, 14), rod("hull-grey", [px + 0.5 * Math.sin(a), y - 0.1, pz + 0.5 * Math.cos(a)], [px + 0.7 * Math.sin(a), y - 0.1, pz + 0.7 * Math.cos(a)], 0.8, 14));
  }
  out.push(...pipeRun("coolant", [[x, straight[0] + 2, z + r + 0.7], [x, straight[1] - 2, z + r + 0.7]], 0.22, { clampEvery: 3, bracket: [0, 0, -0.6] }));
  // gold foil on each dome: a faceted cap that hugs the rounded end, as the blanket does on a real tank
  for (const end of ["bottom", "top"] as const) {
    const cap: [number, number][] = [];
    for (let i = 0; i <= 5; i++) {
      const t = (i / 5) * 1.1;
      cap.push(end === "bottom" ? [r * 1.025 * Math.sin(t) + 0.001, y0 + r * (1 - Math.cos(t)) - 0.02] : [r * 1.025 * Math.sin(t) + 0.001, y1 - r * (1 - Math.cos(t)) + 0.02]);
    }
    out.push({ kind: "lathe", material: "gold", at: [x, z], segs: 12, profile: end === "bottom" ? cap : cap.reverse(), only: "mesh", ...(open ? { arc: OPEN_STARBOARD } : {}) });
  }
  // vented fuel cassettes on the outer face (facing away from the spine): two columns of six boxes with vent slots
  const outward: 1 | -1 = side;
  for (const dz of [-3, 3]) {
    const cassettes = Math.max(2, Math.round(6 * detail));
    for (let k = 0; k < cassettes; k++) {
      const y = straight[0] + 4 + k * ((straight[1] - straight[0] - 8) / (cassettes - 1));
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
    out.push(...roundStrut("hull-grey-dark", [sx, y, 0], [x - side * (r - 1), y, z + 3], 0.5), ...roundStrut("hull-grey-dark", [sx, y, -S.hz + 1], [x - side * (r - 1), y, z - 3], 0.5), cub("hull-yellow", side === 1 ? [x - r - 0.5, x - r + 0.8] : [x + r - 0.8, x + r + 0.5], [y - 0.9, y + 0.9], [z - 1.2, z + 1.2]));
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
export function fuelSection(which: "aft" | "fore", cut: boolean, detail = 1, xAbs: number = BARREL.x): Piece[] {
  const [Y0, Y1] = which === "aft" ? STATION.fuelAft : STATION.fuelFore;
  const span = which === "aft" ? BARREL.aft : BARREL.fore;
  const out: Piece[] = [...spine(Y0, Y1, detail)];
  for (const side of [-1, 1] as const) out.push(...barrel(side, span[0], span[1], cut, detail, xAbs));
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
    for (const x of [-6.5, 6.5]) out.push(...roundStrut("hull-grey-dark", [x, k0, -S.hz], [x, k0 + 4, -S.hz - 24], 0.7), ...roundStrut("hull-grey-dark", [x, k1, -S.hz], [x, k1 - 4, -S.hz - 24], 0.7));
    out.push( cub("hull-grey-dark", [-7, 7], [k0 + 4, k1 - 4], [-S.hz - 30, -S.hz - 24], { only: undefined }));
    out.push(discZ("hull-grey", 0, (k0 + k1) / 2, -S.hz - 31, -S.hz - 30, 8, 24), discZ("hull-orange", 0, (k0 + k1) / 2, -S.hz - 31.4, -S.hz - 31, 6.6, 24), discZ("black", 0, (k0 + k1) / 2, -S.hz - 31.6, -S.hz - 31.4, 4.2, 24));
    for (let k = 0; k < 12; k++) {
      const a = (Math.PI * 2 * k) / 12;
      out.push(cub("hull-grey-dark", [5.6 * Math.cos(a) - 0.4, 5.6 * Math.cos(a) + 0.4], [(k0 + k1) / 2 + 5.6 * Math.sin(a) - 0.4, (k0 + k1) / 2 + 5.6 * Math.sin(a) + 0.4], [-S.hz - 31.8, -S.hz - 31.4]), cub("lamp-blue", [5.6 * Math.cos(a) - 0.12, 5.6 * Math.cos(a) + 0.12], [(k0 + k1) / 2 + 5.6 * Math.sin(a) - 0.12, (k0 + k1) / 2 + 5.6 * Math.sin(a) + 0.12], [-S.hz - 32, -S.hz - 31.8]));
    }
    for (const s of [-1, 1]) out.push(...rail(faceOf({ x: [-7, 7], y: [k0, k1], z: [-S.hz - 30, -S.hz - 24] }, "x", s as 1 | -1), -S.hz - 27, k0 + 4, k1 - 4));
    if (xAbs === BARREL.x) out.push(...miyamotoPorts());
  }
  return out;
}
