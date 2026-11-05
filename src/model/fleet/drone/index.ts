// The SPX repair drone: a small work drone about a metre across that flies round ships under construction and mends them. A layered white saucer with a red rim stripe, a big round camera lens in front that is the
// tractor-beam emitter, a thruster pod each side, two tall antennas, a cyan light under the rim and two jointed arms, a gripper on one and a welding tool on the other. Every shape here is this package's own code;
// the painted look swaps in NASA's models for the core, the equipment block, the arms' links, the gripper, the tool and the legs (`scripts/make-drone.ts`). Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { armPieces, standInPieces, weldNozzle, weldTip } from "./arms.ts";
import { antennaPieces, lensPieces, podPieces, rearBlockPieces, underglowPieces } from "./front.ts";
import { ARMS, joints, wristOf } from "./layout.ts";
import { FINE, lifted } from "./shapes.ts";
import { shellPieces } from "./shell.ts";

/** The lowest point of the drone in its natural frame (the saucer's rim at y = 0): the tips of the grippers. */
export function lowestPoint(): number {
  let low = -0.06;
  for (const arm of ARMS) for (const j of joints(arm)) low = Math.min(low, j.to.at(1) as number - 0.03);
  for (const arm of ARMS) {
    const w = wristOf(arm);
    low = Math.min(low, (w.to[1] + w.d[1] * (arm.id === "grip" ? 0.2 : 0.25)) - 0.02);
  }
  return low;
}

/** Metres the natural frame is lifted so the lowest point stands at y = 0. */
export const DRONE_LIFT = -lowestPoint();

/**
 * Where things are on the SPX repair drone, in its own frame: metres, its lowest point at y = 0, its front towards +Z. A build uses two of them: `emitter`, the tractor beam's origin at the middle of the lens
 * glass (the beam leaves along `emitterDirection`), and `weldTip`, the point of the welding tool on the left arm.
 *
 * @example
 * ```ts
 * import { DRONE } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE.emitter, DRONE.weldTip);
 * ```
 */
export const DRONE = {
  /** The tractor beam's emitter: the middle of the lens glass. The beam leaves along +Z. */
  emitter: [0, 0.03 + DRONE_LIFT, 0.576] as Vec3,
  /** The direction the beam leaves along. */
  emitterDirection: [0, 0, 1] as Vec3,
  /** The weld's tip: the end of the welding tool on the left arm. */
  weldTip: (() => {
    const t = weldTip();
    return [t[0], t[1] + DRONE_LIFT, t[2]] as Vec3;
  })(),
  /** The gripper's centre between its fingers, on the right arm. */
  gripper: (() => {
    const w = wristOf(ARMS[0]);
    return [w.to[0] + w.d[0] * 0.17, w.to[1] + w.d[1] * 0.17 + DRONE_LIFT, w.to[2] + w.d[2] * 0.17] as Vec3;
  })(),
  /** The saucer's diameter, metres. */
  diameter: 1.03,
} as const;

/**
 * The drone's pieces. `standIn` adds the plain stand-ins for what NASA's models give in the painted look (the long links, the gripper, the tool, the equipment block): the line looks need them, the painted
 * model does not. `finest` keeps the fine detail (bolts, slots) too: the painted model has it; the line looks and the code-made mesh stay inside the mesh limit without it.
 */
export function dronePieces(standIn = true, finest = false): Piece[] {
  const natural: Piece[] = [...shellPieces(), ...lensPieces(), ...podPieces(), ...antennaPieces(), ...underglowPieces()];
  for (const arm of ARMS) natural.push(...armPieces(arm));
  natural.push(...weldNozzle(ARMS[1]));
  if (standIn) {
    natural.push(...rearBlockPieces());
    for (const arm of ARMS) natural.push(...standInPieces(arm));
    natural.push(...coreStandIn());
  }
  return lifted(finest ? natural : natural.filter((piece) => !FINE.has(piece)), DRONE_LIFT);
}

/** The core drum under the rim, as a plain tube: the painted look has NASA's Cluster II drum there. */
function coreStandIn(): Piece[] {
  return [
    { kind: "lathe", material: "solar", segs: 48, profile: [[0.435, -0.18], [0.435, -0.04]] },
    { kind: "lathe", material: "kapton", segs: 48, under: true, profile: [[0, -0.18], [0.435, -0.18]] },
  ];
}
