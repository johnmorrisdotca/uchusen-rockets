// Round 2 of ISV Kyotori's silhouettes (Explorer A, about 440 m): three arrangements that no longer read as one ship. The four-arm cross (four thick habitable arms, four distinct pods, a slender rim) is the same in all three; where it stands, how it moves, and everything
// else differ: K1 puts the tanks in a phyllotaxis spiral up the stem like a raceme and the cross at the bow; K2 is a bundle of tanks with two counter-rotating crosses amidships; K3 hangs its tanks on two flat ladders, folds the cross along the stem for the voyage and opens it at the destination.
// Concepts only. Pure: no three.js and no DOM.
import { BUILDERS, ibeam, KIT, place, type Piece } from "./adapter.ts";
import { crewPort, elevator, inlineDrive, mod, payloadBay, telescope, truss } from "./parts.ts";
import { cross } from "./pods.ts";
import { rpmFor } from "../ship-01/spin.ts";

const deg = (a: number): number => (a * Math.PI) / 180;

export interface Concept2 {
  id: string;
  name: string;
  idea: string;
  ring: string;
  /** The states it has: one, or the cross open and folded. */
  states: { id: string; label: string; pieces: () => Piece[] }[];
}

const bow = (y: number, ids: string[]): { pieces: Piece[]; end: number } => {
  let at = y;
  const pieces: Piece[] = [];
  for (const id of ids) {
    pieces.push(...mod(id, at));
    at += KIT[id].length;
  }
  return { pieces, end: at };
};

const tankCache = new Map<string, Piece[]>();
const tankPieces = (r: number, len: number): Piece[] => {
  const key = `${r}x${len}`;
  if (!tankCache.has(key)) tankCache.set(key, BUILDERS.tank(`kt-${key}`, "Propellant tank", r, len, "M", "M", 90, 600, "").pieces({ detail: 0.22 }));
  return tankCache.get(key) as Piece[];
};

/** A raceme: tanks one every `step` metres in a spiral of the golden angle, smaller towards the bow like buds, each on a short spoke from the stem, none on the elevator's side. */
function spiral(y0: number, count: number, step: number): Piece[] {
  const out: Piece[] = [];
  let az = 10;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = 3.6 - 1.4 * t;
    const len = Math.round(30 - 12 * t);
    az += 137.5;
    let a = ((az % 360) + 360) % 360;
    if (Math.abs(a - 45) < 28) a += 56;
    const R = 17.5;
    const y = y0 + i * step;
    out.push(...place(tankPieces(r, len), { at: [R * Math.sin(deg(a)), y, R * Math.cos(deg(a))] }));
    for (const f of [0.2, 0.8]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(deg(a)), y + len * f, 6.6 * Math.cos(deg(a))], [(R - r) * Math.sin(deg(a)), y + len * f, (R - r) * Math.cos(deg(a))], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}

/** A bundle: `n` tanks of radius `r` and length `len` standing round the stem at radius `R`, with two hoops and spokes. */
function bundle(y0: number, n: number, R: number, r: number, len: number, start: number): Piece[] {
  const out: Piece[] = [];
  for (let k = 0; k < n; k++) {
    const a = deg(start + (360 * k) / n);
    out.push(...place(tankPieces(r, len), { at: [R * Math.sin(a), y0, R * Math.cos(a)] }));
    for (const f of [0.1, 0.5, 0.9]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(a), y0 + len * f, 6.6 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}

/** A ladder: a crossbeam of two I-beams along X carrying four tanks standing on it in one plane, at x = -30, -12, 12 and 30. */
function ladder(y0: number, len: number): Piece[] {
  const out: Piece[] = [];
  for (const x of [-30, -12, 12, 30]) out.push(...place(tankPieces(4, len), { at: [x, y0, 0] }));
  for (const f of [0.08, 0.92]) for (const dz of [-1.2, 1.2]) out.push(...ibeam("hull-grey", [-34, y0 + len * f, dz], [34, y0 + len * f, dz], 1.4, 0.8, [0, 1, 0]));
  return out;
}

function k1(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 230), ...truss(344, 60)];
  out.push(...spiral(96, 14, 15), ...payloadBay(304), ...crewPort(354), ...elevator(84, 396), ...cross({ y: 392, R: 54 }));
  out.push(...bow(404, ["adapter-l-m", "deck-nav-m", "dome-observation-m"]).pieces);
  return out;
}

function k2(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 188), ...truss(302, 80)];
  out.push(...bundle(90, 6, 14, 4.5, 60, 15), ...bundle(98, 6, 25, 3.6, 44, 45), ...payloadBay(262), ...crewPort(308), ...elevator(150, 380));
  out.push(...cross({ y: 325, R: 48, pods: [0, 1, 2, 3] }), ...cross({ y: 353, R: 48, turn: 45, pods: [2, 3, 0, 1] }));
  const b = bow(382, ["adapter-l-m", "deck-nav-m"]);
  const t = telescope(b.end, 24, 22, 22);
  return [...out, ...b.pieces, ...t.pieces];
}

function k3(fold: number): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 158), ...truss(272, 100)];
  out.push(...ladder(100, 40), ...ladder(150, 40), ...payloadBay(232), ...crewPort(280), ...elevator(90, 366), ...cross({ y: 305, R: 56, fold }));
  const b = bow(372, ["adapter-l-m", "deck-nav-m", "dome-observation-m"]);
  const t = telescope(b.end, 12, 36, 11);
  return [...out, ...b.pieces, ...t.pieces];
}

const rpm = (R: number): string => `${R} m rim, ${rpmFor(R).toFixed(2)} rpm = 1.00 g`;

export const CONCEPTS2 = (): Concept2[] => [
  { id: "k1", name: "K1. Raceme", idea: "The tanks climb the stem in a spiral of the golden angle, smaller towards the bow like buds on a raceme, with the Shuttle-style barrel and the glass elevator on the stalk and the four-arm cross at the bow, the observatory pod looking ahead.", ring: rpm(54), states: [{ id: "k1", label: "the cross turning", pieces: k1 }] },
  { id: "k2", name: "K2. Twin crosses", idea: "A thick bundle of twelve tanks at the stern, a long stem with the barrel and the glass elevator, then two four-arm crosses amidships turning against each other so their torques cancel, and a JWST-style mirror with its sunshield at the bow.", ring: `two crosses, each ${rpm(48)}, opposite ways`, states: [{ id: "k2", label: "two crosses, counter-rotating", pieces: k2 }] },
  { id: "k3", name: "K3. Folding cross", idea: "The tanks hang on two flat ladders (a wide, thin silhouette), and the four-arm cross folds forward along the stem for the long burn and opens across it at the destination: both states drawn. The mirror unfolds into two wings.", ring: `opened: ${rpm(56)}`, states: [{ id: "k3", label: "opened at the destination", pieces: () => k3(0) }, { id: "k3f", label: "folded for the voyage", pieces: () => k3(1) }] },
];
export { deg };
