// Ship 02's numbers, in metres, tonnes and seconds, in one table: where each module stands on the long axis (y, from the tail), how big it is and what it weighs. Everything else is made from these.
// All fictional: a design target of this package, written up in docs/fleet/ship-02.md.

/** The whole ship's length, tail to the tip of its forward mast. */
export const LENGTH = 1820;

/** The truss spine: 36 m square, in 24 m bays. */
export const SPINE = { half: 18, bay: 24, length: 1760 } as const;

/** Where each module starts on the axis, and how long it is. */
export const STATION = {
  drive: { y: 0, length: 172 },
  reactor: { y: 172, length: 158 },
  tank: { y: 340, length: 440 },
  cargo: { y: 800, length: 136, count: 4 },
  dock: { y: 1352, length: 140 },
  farm: { y: 1500, length: 80 },
  habitatA: { y: 1590, length: 40 },
  habitatB: { y: 1640, length: 40 },
  command: { y: 1690, length: 50 },
  shield: { y: 1760, length: 60 },
} as const;

/** The four tanks stand in the corners of the cross: this far from the axis in x and z. */
export const TANK = { offset: 80, radius: 40, bodyFrom: 20, bodyTo: 420 } as const;

/** Containers: 22 m by 22 m by 40 m, two by two by three in a cell, four cells to a station. */
export const CONTAINER = { across: 22, long: 40 } as const;

export const HABITAT = { radius: 165, tube: 36, spinRpm: 1.65 } as const;

export const DRIVE = { nozzles: 8, exit: 25, throat: 5.5, length: 96, columns: [-105, -35, 35, 105], rows: [-32, 32], exhaustSpeed: 0.4 } as const;

/** Wet and dry masses in tonnes, by module. The ship's dry mass is the sum. */
export const MASS_T = {
  spine: 62_000,
  drive: 118_000,
  reactor: 310_000,
  tanks: 100_000,
  cargoFrames: 56_000,
  dock: 42_000,
  farm: 46_000,
  habitats: 170_000,
  command: 18_000,
  shield: 148_000,
  radiators: 30_000,
} as const;

export const DRY_T = Object.values(MASS_T).reduce((sum, t) => sum + t, 0) + 0;
