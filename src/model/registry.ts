// Every part there is, with its record and how to make its pieces. A new rocket adds its rows here and nothing else changes.
import { STARSHIP_VARIANTS } from "../data/starship.ts";
import type { Figure, Variant } from "../data/types.ts";
import type { CreditId } from "../data/credits.ts";
import type { PartKind, PartRecord } from "../parts.ts";
import type { Piece } from "./pieces.ts";
import { boosterPieces, flap, gridFin, raptor, shipPieces, STARSHIP_DRAWS } from "./starship.ts";

export interface PartEntry {
  record: PartRecord;
  pieces: () => Piece[];
}

const blankFigure: Figure = { value: null, source: null, note: "No source gives this part's size: it is drawn from photographs." };
const STAGE = "stage" as const;

/** Which licensed model paints which part. */
const PAINTED: Readonly<Record<string, { file: string; credit: CreditId }>> = {
  "starship-v3-booster": { file: "starship-v3-booster.glb", credit: "clarence365-block3" },
  "starship-v3-ship": { file: "starship-v3-ship.glb", credit: "clarence365-block3" },
  "starship-v1-flight1-booster": { file: "starship-v1-flight1-booster.glb", credit: "clarence365-s24b7" },
  "starship-v1-flight1-ship": { file: "starship-v1-flight1-ship.glb", credit: "clarence365-s24b7" },
  "starship-2019-ship": { file: "starship-2019-ship.glb", credit: "martiandays-2019" },
};

const DRAWN_FROM: Readonly<Record<string, string>> = {
  v1: "This package's code, sized from the block table; parts' proportions judged from photographs of Block 1 and from Clarence365's Ship 24 and Booster 7.",
  "v1-flight1": "This package's code for the two line looks, Clarence365's Ship 24 and Booster 7 for the painted look, both at the sourced sizes.",
  v2: "This package's code, sized from the block table; parts' proportions judged from photographs and the documented flap changes. No licensed model shows Block 2.",
  v3: "This package's code for the two line looks, proportions measured from Clarence365's Block 3 at the sourced sizes; Clarence365's model for the painted look.",
  v4: "This package's code: Block 3's details on Block 4's sourced sizes. Thin evidence: no source shows its parts.",
  "2019": "This package's code for the two line looks, proportions measured from MartianDays' model; MartianDays' model for the painted look. An artist's model of a design.",
};

const entries: PartEntry[] = [];

const KIND_OF_SLOT: Readonly<Record<string, PartKind>> = { booster: "booster", ship: "ship" };

function starshipPart(variant: Variant, slot: "booster" | "ship"): PartEntry {
  const draw = STARSHIP_DRAWS[variant.id];
  const id = `starship-${variant.id}-${slot}`;
  const height = slot === "booster" ? draw.boosterHeight : draw.shipHeight;
  const diameter = draw.radius * 2;
  return {
    record: {
      id,
      kind: KIND_OF_SLOT[slot],
      name: `${slot === "booster" ? "Super Heavy" : "Ship"}, ${variant.name}`,
      rocket: "starship",
      trueTo: [variant.id],
      height,
      diameter,
      sourced: { height: variant.facts.parts[slot] ?? blankFigure, diameter: variant.facts.diameter },
      joints: slot === "booster" ? { top: { kind: STAGE, y: height, diameter } } : { bottom: { kind: STAGE, y: 0, diameter } },
      painted: PAINTED[id] ?? null,
      drawnFrom: DRAWN_FROM[variant.id],
    },
    pieces: () => (slot === "booster" ? boosterPieces(draw) : shipPieces(draw)),
  };
}

for (const variant of STARSHIP_VARIANTS) for (const slot of variant.slots) entries.push(starshipPart(variant, slot as "booster" | "ship"));

/** A small part on its own: nothing to mate with, sizes as drawn. */
function detail(id: string, kind: PartKind, name: string, height: number, diameter: number, sourced: { height: Figure; diameter: Figure }, pieces: () => Piece[]): PartEntry {
  return { record: { id, kind, name, rocket: "starship", trueTo: [], height, diameter, sourced, joints: {}, painted: null, drawnFrom: "This package's code." }, pieces };
}

const RAPTOR_DIAMETER: Figure = { value: 1.3, source: "wikipedia-raptor", note: "The family's engine diameter." };
const RAPTOR_LENGTH: Figure = { value: 3.1, source: "wikipedia-raptor", note: "The family's length." };
const b3 = STARSHIP_DRAWS.v3;
const b2 = STARSHIP_DRAWS.v2;
entries.push(
  detail("raptor-sea-level", "engine", "Raptor, sea-level", 3.1, 1.24, { height: RAPTOR_LENGTH, diameter: RAPTOR_DIAMETER }, () => raptor([0, 0], 0, "sea")),
  detail("raptor-vacuum", "engine", "Raptor, vacuum", 4.4, 2.3, { height: blankFigure, diameter: blankFigure }, () => raptor([0, 0], 0, "vacuum")),
  detail("grid-fin-four", "fin", "Grid fin, Blocks 1 and 2", 0.9, 2.9, { height: blankFigure, diameter: blankFigure }, () => gridFin(90, 0, b2.radius, b2.fins.reach, b2.fins.width, b2.fins.thick, false)),
  detail("grid-fin-three", "fin", "Grid fin, Block 3", 0.9, 3.4, { height: blankFigure, diameter: blankFigure }, () => gridFin(90, 0, b3.radius, b3.fins.reach, b3.fins.width, b3.fins.thick, true)),
  detail("flap-aft", "flap", "Aft flap", 11.6, 3.8, { height: blankFigure, diameter: blankFigure }, () => [flap(b3.aft, 1)]),
  detail("flap-forward", "flap", "Forward flap, Blocks 2 and 3", 8.1, 4.7, { height: blankFigure, diameter: blankFigure }, () => [flap(b3.forward, 1)]),
);

export const PART_ENTRIES: readonly PartEntry[] = entries;
const byId = new Map(entries.map((entry) => [entry.record.id, entry]));
export const partEntry = (id: string): PartEntry | undefined => byId.get(id);
