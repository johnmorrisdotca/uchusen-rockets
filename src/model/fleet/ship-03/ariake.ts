// What makes ISV Ariake (SPX-186) a sister and not a copy: the same model with a dawn-gold livery (a broad accent band and a pair of pinstripes in place of the plain hull), a survey pod by default, a refit (a sensor
// mast, a solarium on each side of the dome) and a warm interior. Every function here only adds pieces to a part the sister shares with Miyamoto. Pure: no three.js and no DOM.
import { annulus, cub, hoop, type Piece } from "./adapter.ts";
import { BOW_LAYERS, CITADEL, HANGAR, STATION } from "./dims.ts";

const R_HAB = 13;
const sorted = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);

/** A band and its two pinstripes round a drum, at height y. */
const ringBand = (r: number, y: number, wide: number, cut: boolean): Piece[] => {
  // the drum is cut over the same half as the kit's drum (58 to 302 degrees kept), turned a quarter with it
  const arc = cut ? { arc: () => [(148 * Math.PI) / 180, (392 * Math.PI) / 180] as const } : {};
  return [annulus("hull-dawn", r, r + 0.28, y, y + wide, 48, { only: "mesh", ...arc }), hoop("hull-dawn", r + 0.2, y - 0.7, 0.1, 48, 6, arc), hoop("hull-dawn", r + 0.2, y + wide + 0.7, 0.1, 48, 6, arc)];
};

/** The habitation drum: two bands with their pinstripes, between the rings of portholes. */
export function habitatLivery(cut = false): Piece[] {
  const [y0] = STATION.habitat;
  return [...ringBand(R_HAB + 0.4, y0 + 17, 1.4, cut), ...ringBand(R_HAB + 0.4, y0 + 31, 1.4, cut)];
}

/** A hangar shoulder: a pair of pinstripes along the roof and the outer wall, above and below the bay door, and across both ends. The leaves of the door stay orange. */
export function hangarLivery(side: "starboard" | "port"): Piece[] {
  const h = HANGAR[side];
  const [y0, y1] = h.y;
  const [x0, x1] = h.x;
  const [z0, z1] = h.z;
  const sgn = side === "starboard" ? 1 : -1;
  const outer = side === "starboard" ? x1 : x0;
  const out: Piece[] = [];
  for (const dx of [-12, -11.4, 11.4, 12]) out.push(cub("hull-dawn", sorted(h.centre + dx - 0.1, h.centre + dx + 0.1), [y0 + 1, y1 - 1], [z1 + 0.35, z1 + 0.6]));
  for (const z of [z0 + 2.3, z0 + 2.9, z1 - 3, z1 - 3.6]) out.push(cub("hull-dawn", sorted(outer, outer + sgn * 0.6), [y0 + 0.5, y1 - 0.5], [z - 0.1, z + 0.1]));
  for (const y of [y0, y1]) for (const z of [z1 - 3, z1 - 3.6]) out.push(cub("hull-dawn", [x0 + 0.5, x1 - 0.5], sorted(y, y + (y === y0 ? -0.6 : 0.6)), [z - 0.1, z + 0.1]));
  return out;
}

/** The citadel: a pair of pinstripes along each flank and the dorsal side, and a broad accent band round the middle. */
export function citadelLivery(): Piece[] {
  const [y0, y1] = STATION.command;
  const hx = CITADEL.hx;
  const hz = CITADEL.hz;
  const out: Piece[] = [];
  for (const sx of [-1, 1]) for (const z of [-4.6, -4, 4, 4.6]) out.push(cub("hull-dawn", sorted(sx * hx, sx * (hx + 0.7)), [y0 + 1, y1 - 1], [z - 0.1, z + 0.1]));
  for (const x of [-12, -11.4, 11.4, 12]) out.push(cub("hull-dawn", [x - 0.1, x + 0.1], [y0 + 1, y1 - 1], [hz + 0.4, hz + 0.7]));
  out.push(cub("hull-dawn", [-hx - 0.7, -hx], [y0 + 3, y0 + 4.6], [-hz + 8, hz - 8]), cub("hull-dawn", [hx, hx + 0.7], [y0 + 3, y0 + 4.6], [-hz + 8, hz - 8]));
  return out;
}

/** The bow: the pinstripe round each of the three shield layers, and the accent on the foremost. */
export function bowLivery(): Piece[] {
  const out: Piece[] = [];
  for (const layer of BOW_LAYERS) for (const sx of [-1, 1]) out.push(cub("hull-dawn", sorted(sx * layer.hx, sx * (layer.hx + 0.7)), [layer.y[0] + 0.6, layer.y[1] - 0.6], [-0.35, 0.35]));
  return out;
}

/** The drive's neck: two pinstripes under the shroud. */
export function driveLivery(): Piece[] {
  return [hoop("hull-dawn", 9.9, 44, 0.12, 40, 6), hoop("hull-dawn", 9.9, 44.8, 0.12, 40, 6), hoop("hull-dawn", 9.9, 52, 0.12, 40, 6)];
}
