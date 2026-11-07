// The repair drone's two arms: for each of the four segments a housing with a motor cap and a ring of blue light, cables with clips, an actuator and bolted seams; the joints come from `layout.ts`. The grip arm ends in
// a gripper and the weld arm in a welding tool; the plain stand-ins for the links, the gripper and the tool are in `standIn`, so the painted look can swap in NASA's own and the line looks keep a whole arm.
import type { Piece, Vec3 } from "../../pieces.ts";
import { ARMS, joints, wristOf, type ArmSpec, type Joint } from "./layout.ts";
import { fingerSpan, type DronePose } from "./poses.ts";
import { add, block, bolt, boltRing, cross, cyl, len, mix, mul, pipe, rng, stack, sub, unit } from "./shapes.ts";

/** How long the welding tool and the gripper are beyond the wrist, metres. */
export const TOOL_LENGTH = 0.2;
export const GRIP_LENGTH = 0.2;

/** The weld's tip, in the natural frame: beyond the weld arm's wrist, along its direction. */
export function weldTip(): Vec3 {
  const arm = ARMS.find((a) => a.id === "weld") as ArmSpec;
  const w = wristOf(arm);
  return add(w.to, mul(w.d, TOOL_LENGTH + 0.02));
}

function motor(j: Joint, side: 1 | -1, at: Vec3): Piece[] {
  const out: Piece[] = [];
  const r = j.link.r;
  const ax = j.axis;
  for (const s of [-1, 1]) {
    const a = add(at, mul(ax, s * r * 0.8));
    const b = add(at, mul(ax, s * r * 1.6));
    out.push(cyl("hull-white", a, b, r * 1.18, 28));
    out.push(cyl("hull-grey", b, add(b, mul(ax, s * 0.008)), r * 1.02, 28));
    out.push(cyl("lamp-blue", add(b, mul(ax, s * 0.0076)), add(b, mul(ax, s * 0.0102)), r * 0.9, 28));
    out.push(cyl("engine-metal", add(b, mul(ax, s * 0.0098)), add(b, mul(ax, s * 0.015)), r * 0.58, 20));
    out.push(...boltRing(add(b, mul(ax, s * 0.0072)), mul(ax, s), r * 1.05, 8, 0.0034, 0.0034));
    out.push(cyl("black", add(at, mul(ax, s * r * 0.8)), add(at, mul(ax, s * r * 0.86)), r * 1.2, 28));
  }
  out.push(cyl("hull-grey-dark", add(at, mul(ax, -r * 0.82)), add(at, mul(ax, r * 0.82)), r * 0.82, 24));
  return out;
}

function housing(j: Joint, arm: ArmSpec): Piece[] {
  const out: Piece[] = [];
  const r = j.link.r;
  const f = { u: j.d, v: j.up };
  const L = len(sub(j.to, j.from));
  const motorLen = j.link.name === "shoulder" ? L : L * 0.42;
  // the housing: a bevelled box on the proximal part, a cover over it, and a seam
  const c = add(j.from, mul(j.d, motorLen / 2));
  out.push(block("hull-white", c, f, [motorLen, r * 2.3, r * 2.0], 0.011));
  out.push(block("hull-white-worn", add(c, mul(j.up, r * 1.12)), f, [motorLen * 0.76, r * 0.34, r * 1.5], 0.006));
  out.push(block("panel-dark", add(c, mul(j.d, motorLen * 0.3)), { u: j.d, v: j.up }, [0.0035, r * 2.34, r * 2.04], 0.001));
  out.push(block("hazard", add(add(c, mul(j.d, motorLen * 0.18)), mul(j.up, r * 1.2)), { u: j.d, v: j.axis }, [0.02, r * 0.5, 0.0024], 0.0006));
  // bolts down both edges of the housing's cover
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) out.push(bolt(add(add(j.from, mul(j.d, motorLen * (0.14 + i * 0.22))), add(mul(j.up, r * 1.3), mul(j.axis, side * r * 0.7))), j.up, 0.0032, 0.003, "engine-metal", 6));
  // vents on the side of the housing
  for (let i = 0; i < 4; i++) out.push(block("soot", add(add(c, mul(j.d, (i - 1.5) * 0.014)), mul(j.axis, r * 1.012)), { u: j.up, v: j.d }, [r * 0.9, 0.0055, 0.0022], 0.0006));
  void arm;
  return out;
}

function cables(j: Joint, arm: ArmSpec, seed: number): Piece[] {
  const out: Piece[] = [];
  const r = j.link.r;
  const L = len(sub(j.to, j.from));
  if (j.link.name === "shoulder") return out;
  const random = rng(seed);
  for (const k of [0, 1, 2]) {
    const off = add(mul(j.up, r * (1.28 + k * 0.0)), mul(j.axis, (k - 1) * r * 0.62));
    const pts: Vec3[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const sag = Math.sin(t * Math.PI) * 0.008 * (k + 1) * (random() > 0.5 ? 1 : 1);
      pts.push(add(add(add(j.from, mul(j.d, L * (0.05 + t * 0.92))), off), mul(j.up, sag)));
    }
    out.push(...pipe(k === 1 ? "pipe-steel" : "black", pts, k === 1 ? 0.0052 : 0.0046, 10));
    for (const t of [0.3, 0.6, 0.9]) out.push(block("hull-grey", add(add(j.from, mul(j.d, L * t)), mul(off, 1.0)), { u: j.axis, v: j.d }, [0.014, 0.008, 0.012], 0.002));
  }
  // an actuator: a sleeve and a rod from the housing to the middle of the link
  const a = add(add(j.from, mul(j.d, L * 0.1)), mul(j.up, -r * 1.25));
  const b = add(add(j.from, mul(j.d, L * 0.66)), mul(j.up, -r * 0.7));
  out.push(cyl("engine-pale", a, mix(a, b, 0.55), r * 0.38, 14));
  out.push(cyl("pipe-steel", mix(a, b, 0.55), b, r * 0.19, 12));
  out.push(cyl("engine-metal", add(a, mul(j.axis, 0)), add(a, mul(j.axis, 0.0)), r * 0.2, 8));
  void arm;
  return out;
}

/** Everything code-made on an arm that stays in the painted look. */
export function armPieces(arm: ArmSpec, pose?: DronePose): Piece[] {
  const out: Piece[] = [];
  const js = joints(arm, pose);
  const mount = js[0].from;
  // the shoulder mount on the belly: a bracket block and a plate
  out.push(block("hull-grey-dark", add(mount, [-arm.side * 0.02, 0.05, 0]), { u: [1, 0, 0], v: [0, 1, 0] }, [0.1, 0.1, 0.1], 0.016));
  out.push(...boltRing(add(mount, [0, 0.1, 0]), [0, 1, 0], 0.036, 8, 0.0045, 0.004));
  js.forEach((j, i) => {
    out.push(...motor(j, arm.side, j.from), ...housing(j, arm), ...cables(j, arm, 100 + i + (arm.side > 0 ? 0 : 50)));
  });
  // the wrist's last motor
  const w = js[js.length - 1];
  out.push(...motor(w, arm.side, w.to));
  return out;
}

/** The plain stand-ins: a tube for each long link, the gripper, the welding tool. The painted look replaces these with NASA's. */
export function standInPieces(arm: ArmSpec, pose?: DronePose): Piece[] {
  const out: Piece[] = [];
  const js = joints(arm, pose);
  js.forEach((j) => {
    if (j.link.name === "upper arm" || j.link.name === "forearm") out.push(cyl("hull-white", mix(j.from, j.to, 0.38), j.to, j.link.r * 0.75, 20));
  });
  out.push(...standInTool(arm, wristOf(arm, pose), pose?.grip));
  return out;
}

/** The plain gripper (a palm and three fingers) or tool (a stepped tube) at a wrist. */
export function standInTool(arm: ArmSpec, w: Joint, open?: number): Piece[] {
  const out: Piece[] = [];
  const spread = open === undefined ? 0.014 : fingerSpan(open);
  if (arm.id === "grip") {
    const palm = add(w.to, mul(w.d, 0.035));
    out.push(block("hull-grey-dark", palm, { u: w.axis, v: w.up }, [0.07, 0.06, 0.07], 0.01));
    for (const k of [-1, 0, 1]) {
      const root = add(palm, add(mul(w.d, 0.035), mul(w.axis, k * 0.024)));
      const tip = add(add(w.to, mul(w.d, GRIP_LENGTH)), mul(w.axis, k * spread));
      out.push(...pipe("engine-pale", [root, mix(root, tip, 0.55), tip], 0.007, 8));
    }
  } else {
    out.push(...stack("hull-grey", w.to, w.d, [[0.026, 0.06], [0.02, 0.07], [0.014, TOOL_LENGTH - 0.13]], 16));
  }
  return out;
}

/** The welding tip: a nozzle at the end of the weld arm's tool, with a glowing point, and the shield round it. */
export function weldNozzle(arm: ArmSpec, pose?: DronePose): Piece[] {
  const w = wristOf(arm, pose);
  const at = add(w.to, mul(w.d, TOOL_LENGTH - 0.03));
  const out: Piece[] = [];
  out.push(...stack("copper", at, w.d, [[0.015, 0.012], [0.0105, 0.016, "engine-pale"], [0.0075, 0.014, "copper"]], 16));
  out.push(cyl("lamp-amber", add(at, mul(w.d, 0.04)), add(at, mul(w.d, 0.05)), 0.0042, 10));
  return out;
}
void cross;
void unit;
