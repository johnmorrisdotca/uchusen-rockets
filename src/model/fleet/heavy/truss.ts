// The heavy truss spine: a square truss the whole length of a ship that every module hangs from. Four chords, a frame at each bay, diagonals that turn bay by bay, joint nodes, and on each face a cable tray, a pipe pair with clamps and a service rail. It is the spine
// ISV Kaminari (SPX-207) has, 36 m square in 24 m bays and 1,760 m long, drawn from its width, bay and length in metres: every fitting is the reference one (the 36 m spine's) times `square / 36`, so a bigger spine has bigger chords, nodes and rails.
// At the reference size every number is Kaminari's. Pure: no three.js and no DOM.
import { beam, box, forDrawing, facesOf, hatch, pipe, plating, rng, span, stencil, type Piece, type Rng } from "../solids.ts";

/** The spine the numbers below were drawn for, in metres. */
export const TRUSS_REF = { square: 36, bay: 24, length: 1760 } as const;

/** What a heavy truss spine may be, in metres: 3 to 60 square, bays of 2 to 48 m and a quarter to twice the width, and up to 3,000 m long. */
export const TRUSS_LIMITS = { square: [3, 60], bay: [2, 48], length: [2, 3000] } as const;

/** Throws a RangeError naming the limit when a spine is outside what the part can be. */
export function checkTruss(square: number, bay: number, length: number): void {
  if (!(square >= TRUSS_LIMITS.square[0] && square <= TRUSS_LIMITS.square[1])) throw new RangeError(`A heavy truss is ${TRUSS_LIMITS.square[0]} to ${TRUSS_LIMITS.square[1]} m square, not ${square}.`);
  if (!(bay >= TRUSS_LIMITS.bay[0] && bay <= TRUSS_LIMITS.bay[1] && bay >= square / 4 && bay <= 2 * square)) throw new RangeError(`A heavy truss's bay is ${TRUSS_LIMITS.bay[0]} to ${TRUSS_LIMITS.bay[1]} m and a quarter to twice its width (${square / 4} to ${2 * square} m here), not ${bay}.`);
  if (!(length >= bay && length <= TRUSS_LIMITS.length[1])) throw new RangeError(`A heavy truss is one bay (${bay} m here) to ${TRUSS_LIMITS.length[1]} m long, not ${length}.`);
}

/** A spine standing on the origin, its axis up Y from 0 to `length`, `square` metres across in x and z. `r` is the seeded generator. */
export function trussPieces(size: { square: number; bay: number; length: number }, r: Rng = rng(2002)): Piece[] {
  checkTruss(size.square, size.bay, size.length);
  const s = size.square / TRUSS_REF.square;
  const k = (v: number): number => v * s;
  const h = size.square / 2;
  const c = h - k(1.5);
  const L = size.length;
  const bay = size.bay;
  const out: Piece[] = [];
  // four chords the whole length
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(forDrawing(pipe("hull-grey", [sx * c, 0, sz * c], [sx * c, L, sz * c], k(1.9), 8, true)), pipe("hull-grey", [sx * c, 0, sz * c], [sx * c, L, sz * c], k(1.9), 16, false));
  const bays = Math.floor(L / bay);
  for (let i = 0; i <= bays; i++) {
    const y = i * bay;
    // the frame at each bay: four cross members
    const d = i % 6 === 0;
    out.push(span("dark", -c, c, y - k(0.9), y + k(0.9), c - k(0.9), c + k(0.9), d), span("dark", -c, c, y - k(0.9), y + k(0.9), -c - k(0.9), -c + k(0.9), d));
    out.push(span("dark", c - k(0.9), c + k(0.9), y - k(0.9), y + k(0.9), -c, c, false), span("dark", -c - k(0.9), -c + k(0.9), y - k(0.9), y + k(0.9), -c, c, false));
    // joint nodes at the four corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box("engine-metal", [sx * c, y, sz * c], [k(5.2), k(4.2), k(5.2)]));
    if (i === bays) break;
    // diagonals on the four faces, turning each bay
    const y1 = y + bay;
    const flip = i % 2 === 0;
    out.push(beam("hull-grey", [-c, flip ? y : y1, c], [c, flip ? y1 : y, c], k(1.5), k(1.5), false), beam("hull-grey", [-c, flip ? y1 : y, -c], [c, flip ? y : y1, -c], k(1.5), k(1.5), false));
    for (const [px, py, pz] of [[-c, flip ? y : y1, c], [c, flip ? y1 : y, c], [-c, flip ? y1 : y, -c], [c, flip ? y : y1, -c]] as const) out.push(box("dark", [px, py, pz], [k(2.6), k(0.5), k(2.6)]));
    out.push(beam("hull-grey", [c, flip ? y : y1, -c], [c, flip ? y1 : y, c], k(1.5), k(1.5), false), beam("hull-grey", [-c, flip ? y1 : y, -c], [-c, flip ? y : y1, c], k(1.5), k(1.5), false));
    // a pipe clamp on each face every other bay, a bracket and a hatch sometimes
    if (i % 2 === 0) {
      const ym = y + bay / 2;
      for (const sz of [-1, 1]) out.push(box("black", [-k(5), ym, sz * (h + k(1.6))], [k(3), k(1.4), k(2.4)]), box("black", [k(5), ym, sz * (h + k(1.6))], [k(3), k(1.4), k(2.4)]));
      for (const sx of [-1, 1]) out.push(box("black", [sx * (h + k(1.6)), ym, -k(5)], [k(2.4), k(1.4), k(3)]), box("black", [sx * (h + k(1.6)), ym, k(5)], [k(2.4), k(1.4), k(3)]));
    }
    if (r.chance(0.35)) {
      const face = facesOf([0, y + bay / 2, 0], [2 * h, bay, 2 * h], [r.pick(["x+", "x-", "z+", "z-"])])[0];
      out.push(...hatch(face, r.range(-k(8), k(8)), 0, k(3.2), k(4.6), "dark", r.pick(["hull-yellow", "hull-orange"]), k(0.6)));
    }
  }
  // two pipes and a cable tray along each face, one long piece each, over the diagonals
  for (const sz of [-1, 1]) {
    out.push(pipe("coolant", [-k(5), 0, sz * (h + k(1.6))], [-k(5), L, sz * (h + k(1.6))], k(1.1), 8), pipe("hull-white", [k(5), 0, sz * (h + k(1.6))], [k(5), L, sz * (h + k(1.6))], k(1.1), 8));
    out.push(span("dark", -k(10.5), -k(7), 0, L, sz * (h + k(0.2)) - k(0.1), sz * (h + k(0.2)) + k(0.1)), span("dark", k(7), k(10.5), 0, L, sz * (h + k(0.2)) - k(0.1), sz * (h + k(0.2)) + k(0.1)));
  }
  for (const sx of [-1, 1]) {
    out.push(pipe("hull-orange", [sx * (h + k(1.6)), 0, -k(5)], [sx * (h + k(1.6)), L, -k(5)], k(1.1), 8), pipe("hull-grey", [sx * (h + k(1.6)), 0, k(5)], [sx * (h + k(1.6)), L, k(5)], k(1.1), 8));
    // a service rail the maintenance crawlers run on
    out.push(pipe("hull-yellow", [sx * (h + k(1)), 0, 0], [sx * (h + k(1)), L, 0], k(0.45), 12));
  }
  // frame numbers in service stencil on the dorsal face every eighth bay
  for (let i = 4; i < bays; i += 8) {
    const f = facesOf([0, i * bay, 0], [2 * h, k(6), 2 * h], ["z+"])[0];
    out.push(...stencil(f, `F-${String(i).padStart(2, "0")}`, 0, 0, k(3.2), "hull-white"));
    out.push(...plating(facesOf([0, i * bay, 0], [2 * h, k(3), 2 * h], ["z+"])[0], r, ["blanket", "hull-white"], k(6), k(1.4), { thick: k(0.2), skip: 0 }));
  }
  return out;
}
