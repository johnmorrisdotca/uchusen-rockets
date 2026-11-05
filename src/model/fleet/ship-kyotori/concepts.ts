// Three silhouette concepts for ISV Kyotori (Explorer A, the Raceme), about 450 m: the same parts, three arrangements. Each has the in-line coil-ring drive, whorls of tanks round an open stem, a glass elevator, a payload barrel with clamshell doors, the four-arm
// spinning ring with a pod at each arm's end, a crew port, and a JWST-style segmented mirror with a sunshield. Concepts only. Pure: no three.js and no DOM.
import { KIT, type Piece } from "./adapter.ts";
import { crewPort, elevator, inlineDrive, mod, payloadBay, ring, ringNumbers, telescope, truss, whorl } from "./parts.ts";

export interface Concept {
  id: string;
  name: string;
  idea: string;
  ancestors: string;
  pieces: () => Piece[];
  /** The ring's radius and where it stands, for the numbers on the board. */
  ringR: number;
  ringY: number;
}

const bowModules = (y: number, ids: string[]): { pieces: Piece[]; end: number } => {
  let at = y;
  const pieces: Piece[] = [];
  for (const id of ids) {
    pieces.push(...mod(id, at));
    at += KIT[id].length;
  }
  return { pieces, end: at };
};

/** K1, the Umbel: a long stem with two whorls of tanks aft like florets, the payload barrel in the middle, the ring two thirds up and a telescope boom ahead of the bow. */
function umbel(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 140), ...truss(254, 66)];
  out.push(...whorl(110, 6, 15, 4.5, 40, 15), ...whorl(176, 6, 14, 3.6, 30, 15), ...payloadBay(214), ...crewPort(264), ...ring(300, 58), ...elevator(84, 340));
  const bow = bowModules(320, ["adapter-l-m", "lab-m", "deck-nav-m", "dome-observation-m"]);
  const t = telescope(bow.end, 48, 21, 21);
  return [...out, ...bow.pieces, ...t.pieces];
}

/** K2, the Crown: a bouquet of twelve tanks at the stern, a long bare stem with the glass elevator along it, the ring at the front like a crown and the mirror reaching out through it. */
function crown(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 216), ...truss(330, 42)];
  out.push(...whorl(96, 6, 15, 4.5, 44, 15), ...whorl(108, 6, 28, 3.8, 34, 45), ...payloadBay(290), ...crewPort(342), ...ring(362, 64), ...elevator(150, 330));
  const bow = bowModules(372, ["adapter-l-m", "deck-nav-m"]);
  const t = telescope(bow.end, 24, 22, 22);
  return [...out, ...bow.pieces, ...t.pieces];
}

/** K3, the Wings: the ring amidships, whorls aft and fore of it, the payload barrel behind a short bow, and the mirror unfolded sideways into two wings, a bird with its wings spread. */
function wings(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 218), ...truss(332, 28)];
  out.push(...whorl(90, 6, 15, 4, 36, 15), ...ring(200, 56), ...whorl(250, 5, 14, 3.4, 30, 15), ...payloadBay(292), ...crewPort(344), ...elevator(104, 330));
  const bow = bowModules(360, ["adapter-l-m", "deck-nav-m", "dome-observation-m"]);
  const t = telescope(bow.end, 12, 36, 11);
  return [...out, ...bow.pieces, ...t.pieces];
}

export const CONCEPTS = (): Concept[] => [
  {
    id: "k1",
    name: "K1. Umbel",
    idea: "A long open-truss stem with two whorls of tanks aft like the florets of a flower head, the Shuttle-style payload barrel in the middle, the spinning four-arm ring two thirds up, and the telescope boom reaching ahead of the bow: a flower on a stalk with its mirror as the face.",
    ancestors: "NASA Mars transfer vehicle studies' truss, tanks and reactor; the ISS truss with its glass-walled Cupola; the Space Shuttle's payload bay and Canadarm; Stanford torus and von Braun's wheel; JWST's segmented mirror and sunshield.",
    pieces: umbel,
    ringR: 58,
    ringY: 300,
  },
  {
    id: "k2",
    name: "K2. Crown",
    idea: "A bouquet of twelve tanks at the stern, a long bare stem with the glass elevator running its length like a lift in a lighthouse, the ring at the front like a crown, and the mirror reaching out through the crown's centre: the stem is the stalk, the ring the corolla.",
    ancestors: "Skylab-era wheel stations on a boom; NASA's Nautilus-X and Mars transfer studies; the Shuttle's payload bay; JWST.",
    pieces: crown,
    ringR: 64,
    ringY: 362,
  },
  {
    id: "k3",
    name: "K3. Wings",
    idea: "The ring amidships between two whorls of tanks, the payload barrel behind a short bow, and the telescope unfolded sideways into two mirror wings like a bird spreading its wings: the name, the mirror bird, drawn literally.",
    ancestors: "JWST's folding wing segments; the ISS's solar-array wings on a truss; the Shuttle's payload bay; the Stanford torus.",
    pieces: wings,
    ringR: 56,
    ringY: 200,
  },
];
export { ringNumbers };
