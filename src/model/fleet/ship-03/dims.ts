// Miyamoto's numbers in metres: every station and every box of the hull, in one place, so the parts, the sheets and the tests read the same table. X is across the beam (starboard +), Y is up the spine from the
// tail to the bow, Z is dorsal (up from the keel). The stowed envelope is 380 x 118 x 74 m. Pure: no three.js and no DOM.

/** The stowed envelope: length (Y), beam (X, both hangar shoulders) and height (Z, keel to the dorsal collar's payload). */
export const ENVELOPE = { length: 380, beam: 118, height: 74, zLow: -40, zHigh: 34 } as const;

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
  starboard: { y: [104, 204], x: [23, 59], z: [0, 28], centre: 41 },
  port: { y: [222, 318], x: [-59, -23], z: [0, 28], centre: -41 },
} as const;

/** The four propellant barrels: 22 m across, 72 m long, below deck at X +-24, Z -12. */
export const BARREL = { r: 11, length: 72, x: 24, z: -12, aft: [92, 164], fore: [174, 246] } as const;

/** The keyed dorsal collar and its mission pod. */
export const COLLAR = { y: [174, 234], z0: SPINE.hz, zTop: 34, r: 14 } as const;

/** The drive: two throats at X +-22, four verniers at the aft corners. */
export const DRIVE = { nozzleX: 22, exitR: 16, throatR: 4.6, chamberR: 8.5, exitY: 2, throatY: 20, chamberY: 36, hx: 45, hz: 23, vernier: { x: 41, z: 17, r: 2.4, length: 8 } } as const;

/** The command citadel: half widths across X and Z, and the chamfer of its corners. */
export const CITADEL = { hx: 21, hz: 16, chamfer: 5 } as const;

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
