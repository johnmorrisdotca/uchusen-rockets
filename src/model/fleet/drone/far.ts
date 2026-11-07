// The repair drone seen from far away: the same shapes with few sides and no fine detail, a few hundred triangles of this package's own. The far painted model is these plus a coarse cut of the NASA parts the near one has
// (`scripts/make-drone.ts`), about three thousand triangles in all. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { standInTool } from "./arms.ts";
import { legPieces } from "./legs.ts";
import { ARMS, joints, wristOf } from "./layout.ts";
import type { DronePose } from "./poses.ts";
import { add, block, cyl, lifted, mul, unit } from "./shapes.ts";
import { DRONE_LIFT } from "./index.ts";

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];

/** The coarse drone. With a pose, the arms, the gripper and the legs take that pose and stay there. */
export function farPieces(pose?: DronePose): Piece[] {
  const out: Piece[] = [];
  out.push({ kind: "lathe", material: "hull-white", segs: 28, profile: [[0.34, -0.04], [0.512, -0.034], [0.512, 0.024], [0.48, 0.046], [0.44, 0.094], [0.4, 0.106], [0.3, 0.152], [0.12, 0.172], [0, 0.175]] });
  out.push({ kind: "lathe", material: "red", segs: 28, profile: [[0.5145, -0.014], [0.5145, 0.014]] });
  out.push({ kind: "lathe", material: "lamp-blue", segs: 28, profile: [[0.452, -0.062], [0.452, -0.042]] });
  // lens, pods
  const c: Vec3 = [0, 0.03, 0];
  out.push(cyl("hull-white", [c[0], c[1], 0.3], [c[0], c[1], 0.55], 0.14, 14));
  out.push(cyl("black", [c[0], c[1], 0.43], [c[0], c[1], 0.5], 0.13, 14));
  out.push(cyl("glass", [c[0], c[1], 0.55], [c[0], c[1], 0.575], 0.11, 14));
  out.push(cyl("lamp-blue", [c[0], c[1], 0.575], [c[0], c[1], 0.58], 0.03, 8));
  for (const s of [-1, 1]) {
    out.push(block("hull-white", [s * 0.262, 0.005, 0.4], { u: X, v: Y }, [0.1, 0.15, 0.2], 0.022));
    out.push(block("red", [s * 0.262, 0.005, 0.545], { u: X, v: Y }, [0.108, 0.158, 0.06], 0.026));
    const base: Vec3 = [s * 0.13, 0.172, 0.03];
    const tip: Vec3 = [s * 0.2, 0.62, -0.08];
    out.push(cyl("black", base, tip, 0.006, 4));
    out.push(cyl("lamp-blue", tip, add(tip, mul(unit([tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]]), 0.03)), 0.011, 5));
  }
  for (const arm of ARMS) {
    for (const j of joints(arm, pose)) {
      out.push(cyl("hull-white", j.from, j.to, j.link.r * 1.1, 7));
      out.push(cyl("hull-white", add(j.from, mul(j.axis, -j.link.r * 1.3)), add(j.from, mul(j.axis, j.link.r * 1.3)), j.link.r * 1.1, 8));
    }
    const w = wristOf(arm, pose);
    out.push(...standInTool(arm, w, pose?.grip));
  }
  if (pose) out.push(...legPieces(pose.legs));
  return lifted(out, DRONE_LIFT);
}
