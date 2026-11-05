// The five construction machines. Shapes come from the reference notes; no mark or text is copied.
import type { MaterialName } from "../../materials.ts";
import { disc, discZ, hoop, post, rod } from "../detail.ts";
import { bar, BLUE, bolts, DARK, deck, emitter, GLASS, GLOW, limb, METAL, ORANGE, panel, vents, whip, WHITE, YELLOW } from "./dress.ts";
import type { Piece, Vec3 } from "../../pieces.ts";

/**
 * One construction machine: one mesh, a role, a lens and a tool.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const carrier = droneConcept("drone-carrier");
 * console.log(carrier.role);
 * ```
 */
export interface Machine {
  id: "drone-weld" | "drone-repair" | "drone-carrier" | "drone-tug" | "drone-fitter";
  /** What builder mode sends this machine to do. */
  role: "weld" | "repair" | "carry" | "tug" | "fit";
  pieces: Piece[];
  /** The lens, where the tractor beam leaves. */
  mouth: Vec3;
  /** Where the working tool meets the work. */
  tool: Vec3;
  toolKind: "laser" | "weld";
}

function weldDrone(): Machine {
  const grip: Vec3 = [-0.2, 0.5, -0.02];
  const nozzle: Vec3 = [0.18, 0.52, 0];
  const pieces: Piece[] = [
    ...panel(YELLOW, 0, 0, 0, 0.28, 0.2),
    ...panel(DARK, 0, -0.02, -0.03, 0.3, 0.22),
    ...bolts(0, 0, 0.02, 0.22, 0.14),
    ...panel(ORANGE, 0.22, 0, 0.02, 0.02, 0.12),
    ...panel(DARK, 0.22, 0.08, 0.03, 0.016, 0.04),
    ...vents(-0.16, -0.04, 0.03),
    discZ(BLUE, 0, -0.04, -0.05, -0.03, 0.08, 8),
    rod(METAL, [-0.14, 0.12, 0.02], [-0.14, 0.36, 0.04], 0.02, 6),
    rod(ORANGE, [-0.14, 0.36, 0.04], [-0.14, 0.44, 0.04], 0.016, 5),
    ...limb([-0.1, 0.08, -0.02], [[-0.2, 0.24, -0.08], [-0.22, 0.4, -0.04]], grip),
    ...limb([0.08, 0.08, -0.02], [[0.16, 0.26, -0.06], [0.18, 0.42, -0.02]], nozzle),
    post(ORANGE, [0.18, 0], 0.02, 0.42, 0.008, 0.52, 6),
    post(METAL, [0, 0.02], 0.04, 0.16, 0.03, 0.26, 8),
    ...emitter([0, 0.02], 0.28, 0.07),
  ];
  return { id: "drone-weld", role: "weld", pieces, mouth: [0, 0.28, 0.02], tool: nozzle, toolKind: "weld" };
}

/** A disc lying on the deck, outline in [forward, side]. */
function saucer(material: MaterialName, radius: number, z: number, thick: number): Piece {
  const n = 24;
  const outline: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    outline.push([radius * Math.sin(a), -radius * Math.cos(a)]);
  }
  return deck(material, [0, 0, z], outline, thick);
}

function knuckle(at: Vec3): Piece[] {
  return [bar(METAL, [at[0] - 0.028, at[1], at[2]], [at[0] + 0.028, at[1], at[2]], 0.018, 0.02), discZ(ORANGE, at[0], at[1], at[2], at[2] + 0.028, 0.014, 6)];
}

/** Three rectangular links and a gripper, hung under the saucer and reaching forward. */
function repairArm(root: Vec3, elbow: Vec3, wrist: Vec3, grasp: Vec3): Piece[] {
  const finger = (tip: Vec3): Piece => bar(METAL, wrist, tip, 0.008, 0.008);
  return [
    bar(WHITE, root, elbow, 0.026, 0.02),
    bar(DARK, root, elbow, 0.012, 0.024),
    ...knuckle(elbow),
    bar(WHITE, elbow, wrist, 0.022, 0.016),
    ...knuckle(wrist),
    finger(grasp),
    finger([grasp[0], grasp[1] - 0.02, grasp[2] + 0.03]),
    finger([grasp[0], grasp[1] - 0.02, grasp[2] - 0.03]),
    discZ(BLUE, grasp[0], grasp[1], grasp[2], grasp[2] + 0.012, 0.008, 5),
  ];
}

function repairDrone(): Machine {
  const grip: Vec3 = [-0.2, 0.48, -0.18];
  const pieces: Piece[] = [
    saucer(DARK, 0.34, -0.05, 0.045),
    saucer(ORANGE, 0.325, -0.018, 0.012),
    saucer(WHITE, 0.3, 0.018, 0.05),
    saucer(WHITE, 0.16, 0.062, 0.024),
    saucer(METAL, 0.09, 0.086, 0.016),
    ...panel(WHITE, 0, 0.02, 0.078, 0.09, 0.06),
    ...panel(DARK, 0, -0.12, 0.09, 0.07, 0.045),
    ...panel(METAL, 0.1, -0.02, 0.075, 0.035, 0.04),
    ...panel(METAL, -0.1, -0.02, 0.075, 0.035, 0.04),
    ...bolts(0, 0, 0.07, 0.16, 0.12),
    ...vents(0.18, 0.04, 0.05),
    ...vents(-0.18, 0.04, 0.05),
    discZ(BLUE, 0, 0.02, -0.16, -0.13, 0.12, 16),
    discZ(BLUE, 0.1, 0.04, -0.14, -0.125, 0.03, 8),
    discZ(BLUE, -0.1, 0.04, -0.14, -0.125, 0.03, 8),
    disc(DARK, [0, 0.015], 0.07, 0.18, 0.1, 16),
    disc(ORANGE, [0, 0.015], 0.074, 0.26, 0.02, 16),
    disc(ORANGE, [0.13, 0.02], 0.04, 0.16, 0.07, 10),
    disc(DARK, [0.13, 0.02], 0.028, 0.22, 0.02, 8),
    disc(ORANGE, [-0.13, 0.02], 0.04, 0.16, 0.07, 10),
    disc(DARK, [-0.13, 0.02], 0.028, 0.22, 0.02, 8),
    ...emitter([0, 0.015], 0.29, 0.072),
    ...whip([-0.03, -0.04, 0.11], [-0.05, -0.08, 0.48]),
    ...whip([0.05, 0, 0.11], [0.08, 0.04, 0.46]),
    ...repairArm([-0.08, 0, -0.08], [-0.16, 0.12, -0.28], [-0.18, 0.32, -0.22], grip),
    ...repairArm([0.08, 0, -0.08], [0.14, 0.1, -0.28], [0.12, 0.3, -0.2], [0.1, 0.46, -0.18]),
  ];
  return { id: "drone-repair", role: "repair", pieces, mouth: [0, 0.29, 0.015], tool: grip, toolKind: "laser" };
}

function carrierDrone(): Machine {
  const pieces: Piece[] = [
    discZ(WHITE, 0, 0, 0, 0.03, 0.16, 12),
    discZ(DARK, 0, 0, -0.012, 0, 0.18, 12),
    ...bolts(0, 0, 0.03, 0.1, 0.08),
    discZ(BLUE, 0, 0, -0.03, -0.014, 0.06, 8),
    post(METAL, [0, 0], 0.03, 0.1, 0.02, 0.16, 8),
    ...emitter([0, 0], 0.18, 0.06),
    rod(METAL, [-0.08, -0.02, 0.03], [-0.1, -0.04, 0.16], 0.004, 3),
    discZ(BLUE, -0.1, -0.04, 0.16, 0.175, 0.008, 5),
  ];
  return { id: "drone-carrier", role: "carry", pieces, mouth: [0, 0.18, 0], tool: [0, 0.18, 0], toolKind: "laser" };
}

function tugDrone(): Machine {
  const grasp: Vec3 = [0, 0.86, 0.04];
  const pieces: Piece[] = [
    ...panel(DARK, 0, 0, -0.02, 0.32, 0.24),
    ...panel(YELLOW, 0, 0.02, 0.03, 0.24, 0.18),
    ...panel(WHITE, 0, 0.06, 0.08, 0.1, 0.08),
    ...bolts(0, 0.02, 0.06, 0.18, 0.12),
    ...vents(0.16, -0.06, 0.05),
    hoop(METAL, 0.07, -0.06, 0.016, 12, 4, { at: [-0.28, 0.02] }),
    hoop(METAL, 0.07, -0.06, 0.016, 12, 4, { at: [0.28, 0.02] }),
    rod(ORANGE, [-0.28, -0.06, 0.02], [-0.4, -0.06, 0.02], 0.03, 6),
    rod(ORANGE, [0.28, -0.06, 0.02], [0.4, -0.06, 0.02], 0.03, 6),
    rod(METAL, [-0.12, 0.16, 0.05], [-0.12, 0.5, 0.05], 0.03, 6),
    rod(METAL, [0.12, 0.16, 0.05], [0.12, 0.5, 0.05], 0.03, 6),
    ...limb([-0.18, 0.1, 0.02], [[-0.26, 0.32, 0.04], [-0.12, 0.55, 0.05]], grasp),
    ...limb([0.18, 0.1, 0.02], [[0.26, 0.32, 0.04], [0.12, 0.55, 0.05]], grasp),
    post(METAL, [0, 0.04], 0.03, 0.18, 0.022, 0.34, 8),
    ...emitter([0, 0.04], 0.38, 0.06),
  ];
  for (let i = 0; i < 7; i++) pieces.push(rod(METAL, [-0.12 + i * 0.04, 0.2, 0.02], [-0.12 + i * 0.04, 0.2, -0.1], 0.008, 3));
  return { id: "drone-tug", role: "tug", pieces, mouth: [0, 0.38, 0.04], tool: grasp, toolKind: "weld" };
}

function fitterDrone(): Machine {
  const pieces: Piece[] = [
    hoop(WHITE, 0.28, 0, 0.04, 16, 5),
    hoop(ORANGE, 0.28, 0, 0.012, 16, 4),
    discZ(DARK, 0, 0, -0.02, 0.02, 0.1, 10),
    ...panel(WHITE, 0, 0, 0.06, 0.07, 0.05),
    ...emitter([0, 0], 0.16, 0.05),
  ];
  const tools: Vec3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.28;
    const z = Math.sin(a) * 0.08;
    const y = Math.sin(a) * 0.1;
    const elbow: Vec3 = [Math.cos(a) * 0.46, y + 0.16, z];
    const tip: Vec3 = [Math.cos(a) * 0.58, y + 0.32, z];
    pieces.push(...limb([x, 0.04, 0], [elbow], tip));
    tools.push(tip);
    if (i === 2) pieces.push(discZ(BLUE, tip[0], tip[1], tip[2], tip[2] + 0.02, 0.02, 6));
    if (i === 3) pieces.push(discZ(GLASS, tip[0], tip[1], tip[2], tip[2] + 0.015, 0.018, 6));
    if (i === 4) pieces.push(rod(GLOW, tip, [tip[0], tip[1] + 0.06, tip[2]], 0.008, 3));
  }
  return { id: "drone-fitter", role: "fit", pieces, mouth: [0, 0.16, 0], tool: tools[0] ?? [0.5, 0.3, 0], toolKind: "laser" };
}

/**
 * The five machines, in yard order: welder, repair saucer, carrier, tug, fitter.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.map((make) => make().role).join(","));
 * ```
 */
export const MACHINES: readonly (() => Machine)[] = [weldDrone, repairDrone, carrierDrone, tugDrone, fitterDrone];
