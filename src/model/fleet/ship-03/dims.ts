// Miyamoto's numbers in metres: every station and every box of the hull, in one place, so the parts, the sheets and the tests read the same table. X is across the beam (starboard +), Y is up the spine from the
// tail to the bow, Z is dorsal (up from the keel). The stowed envelope is 380 x 138 x 74 m. Pure: no three.js and no DOM.

/** The stowed envelope: length (Y), beam (X, both hangar shoulders) and height (Z, keel to the dorsal collar's payload). */
export const ENVELOPE = { length: 380, beam: 138, height: 74, zLow: -40, zHigh: 34 } as const;

/** The narrow load-bearing spine: half its width across X, half its height across Z. */
export const SPINE = { hx: 8, hz: 10 } as const;

/** A box in metres: its range along each axis. */
export interface Box {
  x: readonly [number, number];
  y: readonly [number, number];
  z: readonly [number, number];
}

/** The stations of the stacked modules, tail to bow. Each begins where the one before ends. */
export const STATION = {
  drive: [0, 58],
  engineering: [58, 90],
  fuelAft: [90, 170],
  fuelFore: [170, 250],
  habitat: [250, 302],
  command: [302, 350],
  bow: [350, 380],
} as const satisfies Record<string, readonly [number, number]>;

export type StackId = keyof typeof STATION;

/** The two rescue and survey shoulders: starboard aft, port forward. */
export const HANGAR = {
  starboard: { y: [104, 204], x: [23, 69], z: [0, 28], centre: 46 },
  port: { y: [222, 318], x: [-69, -23], z: [0, 28], centre: -46 },
} as const;

/** The four places a hangar box can stand: Miyamoto has the staggered pair (starboard aft, port fore); Ariake fills all four. A rescue bay has one large cradle, a survey bay three small ones. */
export const BAYS = {
  "starboard-aft": { side: "starboard", y: [104, 204], kind: "rescue" },
  "port-fore": { side: "port", y: [222, 318], kind: "survey" },
  "starboard-fore": { side: "starboard", y: [222, 318], kind: "survey" },
  "port-aft": { side: "port", y: [104, 204], kind: "rescue" },
} as const;
export type BayId = keyof typeof BAYS;

/** The box of a bay: its side's range across and up, at its own stations. */
export const bayBox = (id: BayId) => ({ ...HANGAR[BAYS[id].side], y: BAYS[id].y });

/** Miyamoto's solar array: ten bays along the starboard side (the corner Ariake fills with a hangar box), a root beam at x = 26, z = 14 on stand-offs to the spine, a mast and two gold blankets to each bay. Stowed, each bay folds into a canister; deployed, a mast 56 m long carries a blanket 5.4 m wide and 54 m long to each side of it, the wing turned 35 degrees about the root to face the star. */
export const ARRAY = { y: [216, 336], bays: 10, pitch: 12, root: { x: 26, z: 14 }, mast: 56, blanket: { wide: 5.4, long: 54 }, tilt: 35 } as const;
/** The cell area of the array in square metres: ten bays, two blankets each. */
export const ARRAY_AREA = ARRAY.bays * 2 * ARRAY.blanket.wide * ARRAY.blanket.long;

/** The four propellant barrels: 22 m across, 72 m long, below deck at X +-24, Z -12. */
export const BARREL = { r: 11, length: 72, x: 24, z: -12, aft: [92, 164], fore: [174, 246] } as const;

/** The keyed dorsal collar and its mission pod. */
export const COLLAR = { y: [174, 234], z0: SPINE.hz, zTop: 34, r: 14 } as const;

/** The drive: two throats at X +-22, four verniers at the aft corners. */
export const DRIVE = { nozzleX: 22, exitR: 16, throatR: 4.6, chamberR: 8.5, exitY: 1, throatY: 18, chamberY: 30, hx: 45, hz: 23, vernier: { x: 41, z: 17, r: 2.4, length: 8 } } as const;

/** The command citadel: half widths across X and Z, and the chamfer of its corners. */
export const CITADEL = { hx: 21, hz: 16, chamfer: 7 } as const;

/** The bow stack: three staggered shield layers, each narrower than the one behind. */
export const BOW_LAYERS = [
  { y: [350, 362], hx: 18, hz: 20 },
  { y: [362, 371], hx: 15, hz: 16 },
  { y: [371, 378], hx: 12, hz: 11 },
] as const;

/** Radiator banks: one dorsal and one ventral, four leaves each, 25 x 60 m, two faces. */
export const RADIATOR = { y: [242, 302], leaf: { wide: 25, long: 60 }, leaves: 4, banks: 2, areaEach: 25 * 60 * 2 } as const;

/** Total two-sided emitting area of every leaf, square metres. */
export const RADIATOR_AREA = RADIATOR.areaEach * RADIATOR.leaves * RADIATOR.banks;

/** How many tonnes of propellant, of inert mass and of the protected reserve, and the full mass. */
export const MASS = { inert: 21_000, propellant: 84_000, full: 105_000, cargo: 2_800, reserve: 4_200 } as const;

/** Ariake's four hangar boxes: each added box is 600 t of framework, shutters, racks and cradles, and the two added boxes carry the same cargo as the two Miyamoto has, so the cargo doubles. The drive is the same, so her acceleration is lower. */
export const HANGAR_BOX = { structure: 600, count: { miyamoto: 2, ariake: 4 } } as const;
export const MASS_ARIAKE = {
  inert: MASS.inert + 2 * HANGAR_BOX.structure + MASS.cargo,
  propellant: MASS.propellant,
  cargo: 2 * MASS.cargo,
  reserve: MASS.reserve,
  full: MASS.inert + 2 * HANGAR_BOX.structure + MASS.cargo + MASS.propellant,
} as const;

/** The aft enclosure: a round shroud over each nozzle, narrowing aft so the lips stand clear of it, and the shadow-shield collar that steps from the engine to the hull. The collar is its own part, swappable with none. */
export const SHROUD = { start: 7, end: 36, rAft: 18.8, rFore: 22.4 } as const;
export const SHADOW_COLLAR = { y: 36, length: 22, r: 30 } as const;
