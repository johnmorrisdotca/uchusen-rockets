// The five construction machines. Shapes come from the reference notes; no mark or text is copied.
import type { MaterialName } from "../../materials.ts";
import { disc, discZ, hoop, post, rod } from "../detail.ts";
import { bar, BLUE, bolts, DARK, deck, emitter, GLASS, GLOW, GOLD, METAL, ORANGE, panel, vents, whip, WHITE, YELLOW } from "./dress.ts";
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
  const grip: Vec3 = [-0.16, 0.44, -0.16];
  const nozzle: Vec3 = [0.16, 0.5, -0.14];
  const pieces: Piece[] = [
    saucer(DARK, 0.28, -0.04, 0.04),
    saucer(ORANGE, 0.27, -0.012, 0.01),
    saucer(YELLOW, 0.26, 0.012, 0.05),
    saucer(YELLOW, 0.15, 0.052, 0.026),
    ...panel(DARK, 0, 0.08, 0.07, 0.055, 0.04),
    discZ(DARK, 0, 0.1, 0.062, 0.078, 0.032, 10),
    ...panel(ORANGE, 0.16, 0, 0.04, 0.018, 0.09),
    ...panel(DARK, 0.185, 0, 0.05, 0.01, 0.07),
    ...panel(ORANGE, -0.16, 0, 0.04, 0.018, 0.09),
    ...panel(DARK, -0.185, 0, 0.05, 0.01, 0.07),
    ...bolts(0, -0.02, 0.06, 0.12, 0.08),
    ...vents(0, -0.1, 0.05),
    disc(ORANGE, [0.22, 0.02], 0.045, -0.02, 0.08, 10),
    disc(DARK, [0.22, 0.02], 0.028, 0.05, 0.016, 8),
    disc(ORANGE, [-0.22, 0.02], 0.045, -0.02, 0.08, 10),
    disc(DARK, [-0.22, 0.02], 0.028, 0.05, 0.016, 8),
    ...emitter([0, 0.02], 0.24, 0.055),
    ...repairArm([-0.06, 0.02, -0.04], [-0.14, 0.16, -0.16], [-0.16, 0.32, -0.14], grip),
    ...repairArm([0.06, 0.02, -0.04], [0.14, 0.18, -0.14], [0.16, 0.36, -0.12], nozzle),
    post(GLOW, [0.16, -0.14], 0.01, 0.36, 0.004, 0.5, 6),
  ];
  return { id: "drone-weld", role: "weld", pieces, mouth: [0, 0.24, 0.02], tool: nozzle, toolKind: "weld" };
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

/** A boxed link with a cable along it, thick enough to read as a housing. */
function housing(a: Vec3, b: Vec3, width: number): Piece[] {
  return [bar(WHITE, a, b, width, width * 0.72), bar(DARK, a, b, width * 0.4, width * 0.95), bar(METAL, a, b, width * 0.14, width * 0.14)];
}

/** A motor cap where two housings meet. */
function joint(at: Vec3, radius: number): Piece[] {
  return [discZ(ORANGE, at[0], at[1], at[2] - radius, at[2] + radius, radius, 8), disc(METAL, [at[0], at[2]], radius * 0.75, at[1] - radius, radius * 2, 8)];
}

/** Four housings, a motor at each joint, and a two-finger gripper. Sized for the 2.9 m drum. */
function fittedArm(sign: number): Piece[] {
  const root: Vec3 = [sign * 0.55, 1.2, 0.15];
  const shoulder: Vec3 = [sign * 0.9, 1.65, -0.2];
  const elbow: Vec3 = [sign * 0.6, 2.05, -0.6];
  const wrist: Vec3 = [sign * 0.3, 2.35, -0.85];
  const grasp: Vec3 = [sign * 0.12, 2.55, -0.95];
  return [
    ...housing(root, shoulder, 0.12),
    ...joint(shoulder, 0.08),
    ...housing(shoulder, elbow, 0.1),
    ...joint(elbow, 0.07),
    ...housing(elbow, wrist, 0.08),
    ...joint(wrist, 0.06),
    ...housing(wrist, grasp, 0.06),
    bar(METAL, wrist, [grasp[0] + sign * 0.07, grasp[1] + 0.1, grasp[2] + 0.02], 0.016, 0.014),
    bar(METAL, wrist, [grasp[0] - sign * 0.05, grasp[1] + 0.08, grasp[2] - 0.05], 0.016, 0.014),
  ];
}

function repairDrone(): Machine {
  const grip: Vec3 = [-0.12, 2.55, -0.95];
  const pieces: Piece[] = [
    disc(DARK, [0, 0.55], 0.38, 1.4, 0.22, 18),
    disc(METAL, [0, 0.55], 0.28, 1.58, 0.08, 14),
    disc(GOLD, [0, 0.55], 0.44, 1.32, 0.04, 18),
    disc(ORANGE, [0, 0.55], 0.42, 1.36, 0.05, 18),
    disc(GLASS, [0, 0.55], 0.16, 1.64, 0.04, 12),
    disc(ORANGE, [0.48, 0.55], 0.14, 1.32, 0.16, 12),
    disc(DARK, [0.48, 0.55], 0.08, 1.44, 0.04, 8),
    disc(ORANGE, [-0.48, 0.55], 0.14, 1.32, 0.16, 12),
    disc(DARK, [-0.48, 0.55], 0.08, 1.44, 0.04, 8),
    disc(BLUE, [0, 0.08], 0.42, -0.15, 0.04, 16),
    rod(METAL, [-0.5, 0.25, 1.22], [-0.7, 0.55, 1.95], 0.014, 6),
    rod(GLOW, [-0.7, 0.55, 1.95], [-0.74, 0.62, 2.08], 0.02, 6),
    rod(METAL, [0.45, 0.3, 1.22], [0.62, 0.7, 1.9], 0.014, 6),
    rod(GLOW, [0.62, 0.7, 1.9], [0.66, 0.78, 2.04], 0.02, 6),
    ...fittedArm(-1),
    ...fittedArm(1),
  ];
  return { id: "drone-repair", role: "repair", pieces, mouth: [0, 1.66, 0.55], tool: grip, toolKind: "laser" };
}

function carrierDrone(): Machine {
  const pieces: Piece[] = [
    saucer(DARK, 0.18, -0.02, 0.02),
    saucer(WHITE, 0.16, 0.004, 0.028),
    saucer(METAL, 0.08, 0.03, 0.012),
    ...bolts(0, 0, 0.028, 0.1, 0.07),
    discZ(BLUE, 0, 0, -0.04, -0.026, 0.06, 8),
    disc(DARK, [0, 0.02], 0.04, 0.1, 0.05, 10),
    hoop(GOLD, 0.05, 0.16, 0.007, 16, 4, { at: [0, 0.02] }),
    disc(GLASS, [0, 0.02], 0.032, 0.15, 0.008, 12),
    disc(GLOW, [0, 0.02], 0.016, 0.145, 0.006, 8),
    ...whip([-0.06, -0.02, 0.03], [-0.08, -0.04, 0.16]),
  ];
  return { id: "drone-carrier", role: "carry", pieces, mouth: [0, 0.16, 0.02], tool: [0, 0.16, 0.02], toolKind: "laser" };
}

function tugDrone(): Machine {
  const grasp: Vec3 = [0, 0.7, 0.02];
  const pieces: Piece[] = [
    ...panel(DARK, 0, 0, -0.05, 0.26, 0.2),
    ...panel(METAL, 0, 0.02, 0.01, 0.24, 0.18),
    ...panel(WHITE, 0, 0.02, 0.055, 0.2, 0.14),
    ...panel(DARK, 0, 0, 0.09, 0.14, 0.09),
    ...bolts(0, 0, 0.07, 0.16, 0.1),
    ...vents(0.14, -0.08, 0.06),
    disc(ORANGE, [0.26, 0], 0.05, -0.02, 0.1, 8),
    disc(DARK, [0.26, 0], 0.03, 0.06, 0.016, 6),
    disc(ORANGE, [-0.26, 0], 0.05, -0.02, 0.1, 8),
    disc(DARK, [-0.26, 0], 0.03, 0.06, 0.016, 6),
    ...emitter([0, 0.05], 0.26, 0.05),
    ...repairArm([-0.1, 0.06, -0.02], [-0.14, 0.28, -0.1], [-0.06, 0.48, -0.02], [-0.04, 0.64, 0.02]),
    ...repairArm([0.1, 0.06, -0.02], [0.14, 0.28, -0.1], [0.06, 0.48, -0.02], grasp),
  ];
  for (let i = 0; i < 8; i++) {
    const x = -0.15 + i * 0.043;
    pieces.push(bar(METAL, [x, 0.2, 0.03], [x, 0.52, 0], 0.007, 0.012), bar(WHITE, [x, 0.48, 0], [x, 0.6, 0.03], 0.009, 0.008));
  }
  return { id: "drone-tug", role: "tug", pieces, mouth: [0, 0.26, 0.05], tool: grasp, toolKind: "weld" };
}

function fitterDrone(): Machine {
  const pieces: Piece[] = [saucer(DARK, 0.12, -0.02, 0.02), ...panel(WHITE, 0, 0, 0.04, 0.06, 0.04), ...emitter([0, 0], 0.14, 0.045)];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    pieces.push(bar(WHITE, [0.26 * Math.cos(a0), 0.26 * Math.sin(a0), 0], [0.26 * Math.cos(a1), 0.26 * Math.sin(a1), 0], 0.014, 0.02));
    pieces.push(bar(ORANGE, [0.3 * Math.cos(a0), 0.3 * Math.sin(a0), 0], [0.3 * Math.cos(a1), 0.3 * Math.sin(a1), 0], 0.006, 0.01));
  }
  const tools: Vec3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const root: Vec3 = [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0];
    const elbow: Vec3 = [Math.cos(a) * 0.42, Math.sin(a) * 0.42, -0.08];
    const tip: Vec3 = [Math.cos(a) * 0.52, Math.sin(a) * 0.52 + 0.08, -0.04];
    pieces.push(...repairArm(root, elbow, [tip[0], tip[1] - 0.06, tip[2]], tip));
    tools.push(tip);
    if (i === 2) pieces.push(discZ(BLUE, tip[0], tip[1], tip[2], tip[2] + 0.02, 0.016, 6));
    if (i === 3) pieces.push(discZ(GLASS, tip[0], tip[1], tip[2], tip[2] + 0.015, 0.016, 6));
    if (i === 4) pieces.push(rod(GLOW, tip, [tip[0], tip[1] + 0.06, tip[2]], 0.008, 3));
  }
  return { id: "drone-fitter", role: "fit", pieces, mouth: [0, 0.14, 0], tool: tools[0] ?? [0.52, 0.08, -0.04], toolKind: "laser" };
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
