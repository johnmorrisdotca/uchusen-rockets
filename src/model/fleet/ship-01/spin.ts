// The spin-gravity numbers of ISV Hanabusa, computed in one place: the radius, the rpm for 1 g and the g a ring gives at a rotation. Pure: no three.js and no DOM.
const TAU = 2 * Math.PI;

/** The rpm that gives `g` at `radius` metres, and the g that `rpm` gives there. */
export const rpmFor = (radius: number, g = 1): number => (Math.sqrt((g * 9.80665) / radius) * 60) / TAU;
export const gAt = (radius: number, rpm: number): number => (((rpm * TAU) / 60) ** 2 * radius) / 9.80665;

/** The wheels' numbers, computed here and nowhere else. */
export const SPIN = {
  close: { count: 3, rOut: 56, depth: 26, wide: 26, ys: [330, 405, 480] as const, spacing: 75, rpm1g: rpmFor(56, 1), rpmHalf: rpmFor(56, 0.5), gAt4: gAt(56, 4) },
  industrial: { rOut: 112, depth: 22, wide: 22, y: 150, rpm1g: rpmFor(112, 1), rpmHalf: rpmFor(112, 0.5) },
  hubR: 15.5,
  boomX: 21.5,
};
/** W4, stepped rings: three rings of rising radius on one shared bearing (graded gravity), with the alternative of one bearing and rpm each. */
export const SPIN4 = {
  rings: [
    { use: "hydro" as const, name: "garden and hydroponics", rOut: 48, depth: 20, y: 330 },
    { use: "research" as const, name: "research", rOut: 62, depth: 24, y: 405 },
    { use: "living" as const, name: "living", rOut: 76, depth: 26, y: 480 },
  ],
  /** The shared rotation: the living ring, the biggest, at 1 g. */
  sharedRpm: rpmFor(76, 1),
  /** The alternative: each ring on its own bearing at the rpm that gives it 1 g. */
  ownRpm: [48, 62, 76].map((r) => rpmFor(r, 1)),
};
export const specLines4 = (): string[] => [
  `Chosen (a), graded gravity on one shared bearing at ${SPIN4.sharedRpm.toFixed(2)} rpm: ${SPIN4.rings.map((r) => `${r.name} ring, radius ${r.rOut} m, ${gAt(r.rOut, SPIN4.sharedRpm).toFixed(2)} g`).join("; ")}.`,
  `Alternative (b), each ring on its own bearing so all three reach 1.00 g: ${SPIN4.rings.map((r, i) => `${r.name} ${SPIN4.ownRpm[i].toFixed(2)} rpm`).join("; ")} (the smallest is over the 4 rpm comfort limit, which is why (a) was chosen).`,
];
export const specLines = (): string[] => [
  `Close wheels (garden, living, research): radius ${SPIN.close.rOut} m (${SPIN.close.rOut * 2} m across), ${SPIN.close.depth} m deep, six floors; ${SPIN.close.rpm1g.toFixed(2)} rpm = 1.00 g at the rim (the upper comfort limit), or ${SPIN.close.rpmHalf.toFixed(2)} rpm = 0.50 g; ${SPIN.close.spacing} m apart.`,
  `Industrial wheel: radius ${SPIN.industrial.rOut} m (${SPIN.industrial.rOut * 2} m across), ${SPIN.industrial.rpm1g.toFixed(2)} rpm = 1.00 g at the rim, ${SPIN.industrial.rpmHalf.toFixed(2)} rpm = 0.50 g.`,
];
