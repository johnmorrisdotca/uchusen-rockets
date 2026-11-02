// Every part there is, with its record and how to make its pieces. A new rocket adds its rows here and nothing else changes.
import { DRAGON_VARIANTS } from "../data/dragon.ts";
import { FALCON_9_VARIANTS } from "../data/falcon.ts";
import { STARSHIP_VARIANTS } from "../data/starship.ts";
import type { Figure, Variant } from "../data/types.ts";
import type { CreditId } from "../data/credits.ts";
import type { PartKind, PartRecord } from "../parts.ts";
import type { Piece } from "./pieces.ts";
import { capsule, centreCore, DRAGON_DRAWS, falconFairing, falconFirstStage, FALCON_DRAWS, falconSecondStage, grasshopper, merlin, sideBooster, trunk } from "./falcon.ts";
import { FALCON_1_VARIANTS } from "../data/falcon1.ts";
import { SATURN_V_VARIANTS } from "../data/saturn.ts";
import { FALCON_1_BUILDS } from "./falcon1.ts";
import { SATURN_V_BUILDS } from "./saturn.ts";
import { SHUTTLE_VARIANTS } from "../data/shuttle.ts";
import { SHUTTLE_BUILDS } from "./shuttle.ts";
import { SLS_VARIANTS } from "../data/sls.ts";
import { SLS_BUILDS } from "./sls.ts";
import { NEW_GLENN_VARIANTS } from "../data/newglenn.ts";
import { NEW_GLENN_BUILDS } from "./newglenn.ts";
import { ELECTRON_VARIANTS } from "../data/electron.ts";
import { ELECTRON_BUILDS } from "./electron.ts";
import type { StackBuild } from "./stacks.ts";
import { boosterPieces, flap, gridFin, raptor, shipPieces, STARSHIP_DRAWS } from "./starship.ts";

export interface PartEntry {
  record: PartRecord;
  pieces: () => Piece[];
}

const blankFigure: Figure = { value: null, source: null, note: "No source gives this part's size: it is drawn from photographs." };
const STAGE = "stage" as const;

/** Which licensed model paints which part. */
const PAINTED: Readonly<Record<string, { file: string; credit: CreditId; ownNozzle?: true }>> = {
  "starship-v3-booster": { file: "starship-v3-booster.glb", credit: "clarence365-block3" },
  "starship-v3-ship": { file: "starship-v3-ship.glb", credit: "clarence365-block3" },
  "starship-v1-flight1-booster": { file: "starship-v1-flight1-booster.glb", credit: "clarence365-s24b7" },
  "starship-v1-flight1-ship": { file: "starship-v1-flight1-ship.glb", credit: "clarence365-s24b7" },
  "starship-2019-ship": { file: "starship-2019-ship.glb", credit: "martiandays-2019" },
  "falcon-9-block-5-first-stage": { file: "falcon-9-block-5-first-stage.glb", credit: "stanley-falcon-9" },
  "falcon-9-block-5-second-stage": { file: "falcon-9-block-5-second-stage.glb", credit: "stanley-falcon-9", ownNozzle: true },
  "falcon-9-block-5-fairing": { file: "falcon-9-block-5-fairing.glb", credit: "stanley-falcon-9" },
  "dragon-dragon-2-capsule": { file: "dragon-dragon-2-capsule.glb", credit: "kubaha-dragon-2" },
  "dragon-dragon-2-trunk": { file: "dragon-dragon-2-trunk.glb", credit: "kubaha-dragon-2" },
  "dragon-dragon-1-capsule": { file: "dragon-dragon-1-capsule.glb", credit: "progressth-dragon-1" },
  "dragon-dragon-1-trunk": { file: "dragon-dragon-1-trunk.glb", credit: "progressth-dragon-1" },
  "falcon-heavy-falcon-heavy-centre": { file: "falcon-heavy-falcon-heavy-centre.glb", credit: "antonio-falcon-heavy" },
  "falcon-heavy-falcon-heavy-side-left": { file: "falcon-heavy-falcon-heavy-side-left.glb", credit: "antonio-falcon-heavy" },
  "falcon-heavy-falcon-heavy-side-right": { file: "falcon-heavy-falcon-heavy-side-right.glb", credit: "antonio-falcon-heavy" },
  "grasshopper-grasshopper-vehicle": { file: "grasshopper-grasshopper-vehicle.glb", credit: "echo3-grasshopper" },
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

// ---------------------------------------------------------------------------------------------------------------------------------
// Falcon 9, Dragon, Falcon Heavy and Grasshopper

const facts = (variants: readonly Variant[], id: string, slot: string): { height: Figure; diameter: Figure } => {
  const variant = variants.find((one) => one.id === id);
  const height = variant?.facts.parts[slot];
  return { height: height?.brief ? { ...blankFigure, note: `${height.value} m, ${height.brief}.` } : (height ?? blankFigure), diameter: variant?.facts.diameter ?? blankFigure };
};

const FROM_CODE = "This package's code, sized from sourced totals; parts' proportions judged from photographs. No licensed model shows this version.";
const FROM_F9 = "This package's code for the two line looks, proportions taken from Stanley Creative's Falcon 9 at the sourced sizes; Stanley Creative's model for the painted look. It shows Block 5: black interstage and legs, grid fins.";

for (const id of Object.keys(FALCON_DRAWS)) {
  const d = FALCON_DRAWS[id];
  const painted = (slot: string) => PAINTED[`falcon-9-${id}-${slot}`] ?? null;
  const drawnFrom = id === "block-5" ? FROM_F9 : FROM_CODE;
  entries.push(
    { record: { id: `falcon-9-${id}-first-stage`, kind: "first-stage", name: `First stage, Falcon 9 ${id}`, rocket: "falcon-9", trueTo: id === "block-5" ? [id, "block-5-dragon-2"] : [id], height: d.first.height, diameter: 3.7, sourced: facts(FALCON_9_VARIANTS, id, "first-stage"), joints: { top: { kind: "stage", y: d.first.height, diameter: 3.7 } }, painted: painted("first-stage"), drawnFrom }, pieces: () => falconFirstStage(id) },
    { record: { id: `falcon-9-${id}-second-stage`, kind: "second-stage", name: `Second stage, Falcon 9 ${id}`, rocket: "falcon-9", trueTo: id === "block-5" ? [id, "block-5-dragon-2"] : [id], height: d.second.height, diameter: 3.7, sourced: facts(FALCON_9_VARIANTS, id, "second-stage"), joints: { bottom: { kind: "stage", y: d.second.joint, diameter: 3.7 }, top: { kind: "stage", y: d.second.height, diameter: 3.7 } }, painted: painted("second-stage"), drawnFrom }, pieces: () => falconSecondStage(id) },
    { record: { id: `falcon-9-${id}-fairing`, kind: "fairing", name: `Fairing, Falcon 9 ${id}`, rocket: "falcon-9", trueTo: [id], height: d.fairing.height, diameter: d.fairing.radius * 2, sourced: { height: facts(FALCON_9_VARIANTS, id, "fairing").height, diameter: blankFigure }, joints: { bottom: { kind: "stage", y: 0, diameter: 3.7 } }, painted: painted("fairing"), drawnFrom }, pieces: () => falconFairing(id) },
  );
}

const DRAGON_FROM: Readonly<Record<string, string>> = {
  "dragon-1": "This package's code for the two line looks, proportions taken from ProgressTH's model; ProgressTH's model for the painted look. It shows the original Dragon 1, with solar wings, not Cargo Dragon 2.",
  "dragon-2": "This package's code for the two line looks, proportions taken from KUBAHA's model; KUBAHA's model for the painted look. It shows Crew Dragon, with windows.",
  "cargo-dragon-2": "This package's code in every look, on Dragon 2's sourced sizes, with no windows as its article says. No licensed model shows it.",
};
for (const variant of DRAGON_VARIANTS) {
  const d = DRAGON_DRAWS[variant.id];
  const trueTo = variant.id === "dragon-2" ? [variant.id, "block-5-dragon-2"] : [variant.id];
  const joint = 3.7;
  entries.push(
    { record: { id: `dragon-${variant.id}-trunk`, kind: "trunk", name: `Trunk, ${variant.name}`, rocket: "dragon", trueTo, height: d.trunk, diameter: d.trunkRadius * 2, sourced: { height: variant.facts.parts.trunk, diameter: blankFigure }, joints: { bottom: { kind: "stage", y: 0, diameter: joint }, top: { kind: "stage", y: d.trunk, diameter: joint } }, painted: PAINTED[`dragon-${variant.id}-trunk`] ?? null, drawnFrom: DRAGON_FROM[variant.id] }, pieces: () => trunk(d) },
    { record: { id: `dragon-${variant.id}-capsule`, kind: "capsule", name: `Capsule, ${variant.name}`, rocket: "dragon", trueTo, height: d.capsule, diameter: d.baseRadius * 2, sourced: { height: variant.facts.parts.capsule, diameter: variant.facts.diameter }, joints: { bottom: { kind: "stage", y: d.nest, diameter: joint } }, painted: PAINTED[`dragon-${variant.id}-capsule`] ?? null, drawnFrom: DRAGON_FROM[variant.id] }, pieces: () => capsule(d) },
  );
}

const FH_FROM = "This package's code for the two line looks, proportions taken from Antonio_Adams's low-poly model at the sourced sizes; that model for the painted look. It shows the whole vehicle in one shell, so its centre core, upper stage and fairing stay one part.";
const FH_SIDE_HEIGHT = 45.6;
const FH_OFFSET = 4.25;
const figure = (value: number, source: Figure["source"]): Figure => ({ value, source });
entries.push(
  { record: { id: "falcon-heavy-falcon-heavy-centre", kind: "first-stage", name: "Falcon Heavy centre core, with its upper stage and fairing", rocket: "falcon-heavy", trueTo: ["falcon-heavy"], height: 70, diameter: 5.2, sourced: { height: figure(70, "wikipedia-falcon-heavy"), diameter: { ...blankFigure, note: "3.7 m the core; 5.2 m the fairing." } }, joints: {}, painted: PAINTED["falcon-heavy-falcon-heavy-centre"], drawnFrom: FH_FROM }, pieces: () => centreCore(70, 1.85) },
  { record: { id: "falcon-heavy-falcon-heavy-side-left", kind: "first-stage", name: "Falcon Heavy side booster, left", rocket: "falcon-heavy", trueTo: ["falcon-heavy"], height: FH_SIDE_HEIGHT, diameter: 3.7, strapOn: { x: -FH_OFFSET, z: 0 }, sourced: { height: blankFigure, diameter: figure(3.7, "wikipedia-falcon-heavy") }, joints: {}, painted: PAINTED["falcon-heavy-falcon-heavy-side-left"], drawnFrom: FH_FROM }, pieces: () => sideBooster(FH_SIDE_HEIGHT, 1.85, -1) },
  { record: { id: "falcon-heavy-falcon-heavy-side-right", kind: "first-stage", name: "Falcon Heavy side booster, right", rocket: "falcon-heavy", trueTo: ["falcon-heavy"], height: FH_SIDE_HEIGHT, diameter: 3.7, strapOn: { x: FH_OFFSET, z: 0 }, sourced: { height: blankFigure, diameter: figure(3.7, "wikipedia-falcon-heavy") }, joints: {}, painted: PAINTED["falcon-heavy-falcon-heavy-side-right"], drawnFrom: FH_FROM }, pieces: () => sideBooster(FH_SIDE_HEIGHT, 1.85, 1) },
  { record: { id: "grasshopper-grasshopper-vehicle", kind: "test-vehicle", name: "Grasshopper, test vehicle", rocket: "grasshopper", trueTo: ["grasshopper"], height: 32, diameter: 3.2, sourced: { height: figure(32, "wikipedia-grasshopper"), diameter: blankFigure }, joints: {}, painted: PAINTED["grasshopper-grasshopper-vehicle"], drawnFrom: "This package's code for the two line looks, proportions taken from Echo_3's low-poly model at the sourced height; that model for the painted look." }, pieces: () => grasshopper(32) },
);

// ---------------------------------------------------------------------------------------------------------------------------------
// Rockets drawn wholly by this package's code, from their tables

const stackFacts = [...NEW_GLENN_VARIANTS, ...ELECTRON_VARIANTS, ...SLS_VARIANTS, ...FALCON_1_VARIANTS, ...SATURN_V_VARIANTS, ...SHUTTLE_VARIANTS];
const stacks: readonly StackBuild[] = [...NEW_GLENN_BUILDS, ...ELECTRON_BUILDS, ...SLS_BUILDS, ...FALCON_1_BUILDS, ...SATURN_V_BUILDS, ...SHUTTLE_BUILDS];
for (const build of stacks)
  for (const part of build.parts) {
    const { height, diameter } = facts(stackFacts, build.variant, part.slot);
    entries.push({
      record: {
        id: `${build.rocket}-${build.variant}-${part.slot}`,
        kind: part.kind,
        name: part.name,
        rocket: build.rocket,
        trueTo: [build.variant, ...(part.alsoTrueTo ?? [])],
        height: part.height,
        diameter: part.diameter,
        sourced: { height, diameter: part.sourcedDiameter ?? diameter },
        joints: { ...(part.top ? { top: { kind: STAGE, y: part.top[0], diameter: part.top[1] } } : {}), ...(part.bottom ? { bottom: { kind: STAGE, y: part.bottom[0], diameter: part.bottom[1] } } : {}) },
        ...(part.place ? { strapOn: part.place } : {}),
        painted: null,
        drawnFrom: build.drawnFrom,
      },
      pieces: part.pieces,
    });
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
  detail("merlin-sea-level", "engine", "Merlin, sea-level", 2, 0.92, { height: blankFigure, diameter: blankFigure }, () => merlin([0, 0], 0, 0.46, 2)),
);

export const PART_ENTRIES: readonly PartEntry[] = entries;
const byId = new Map(entries.map((entry) => [entry.record.id, entry]));
export const partEntry = (id: string): PartEntry | undefined => byId.get(id);
