// Where everything of the repair drone is, in metres: the saucer, the front lens, the two arms with their joints, and the two working points a build uses, the tractor beam's emitter and the weld's tip. Y is up and +Z
// is the front, the way every part here is drawn; the origin is the middle of the drone's base (its lowest point, the grippers' tips at rest). Pure: no three.js and no DOM.
import { add, cross, mul, unit } from "./shapes.ts";
import type { DronePose } from "./poses.ts";
import type { Vec3 } from "../../pieces.ts";

/** The saucer's radius: the drone is about a metre across. */
export const RADIUS = 0.5;

/** One segment of an arm, as it is at rest: how long, how far it is pitched down from straight ahead, and how far it is turned outward. */
export interface Link {
  name: string;
  length: number;
  /** Degrees below the horizontal, forward. */
  pitch: number;
  /** Degrees outward from straight ahead. */
  yaw: number;
  /** Radius of the housing, metres. */
  r: number;
}

export interface ArmSpec {
  id: "grip" | "weld";
  side: 1 | -1;
  /** The shoulder, in the natural frame. */
  base: Vec3;
  links: readonly Link[];
}

export const ARMS: readonly ArmSpec[] = [
  {
    id: "grip",
    side: 1,
    base: [0.2, -0.1, 0.02],
    links: [
      { name: "shoulder", length: 0.07, pitch: 76, yaw: 6, r: 0.044 },
      { name: "upper arm", length: 0.23, pitch: 54, yaw: 8, r: 0.036 },
      { name: "forearm", length: 0.23, pitch: 16, yaw: 4, r: 0.031 },
      { name: "wrist", length: 0.075, pitch: 64, yaw: 0, r: 0.027 },
    ],
  },
  {
    id: "weld",
    side: -1,
    base: [-0.2, -0.1, 0.02],
    links: [
      { name: "shoulder", length: 0.07, pitch: 76, yaw: 6, r: 0.044 },
      { name: "upper arm", length: 0.22, pitch: 50, yaw: 8, r: 0.036 },
      { name: "forearm", length: 0.24, pitch: 12, yaw: 3, r: 0.031 },
      { name: "wrist", length: 0.07, pitch: 48, yaw: 0, r: 0.027 },
    ],
  },
];

/** A segment's direction: forward, tipped down by pitch, turned outward by yaw on the arm's side. */
export function direction(link: Link, side: 1 | -1): Vec3 {
  const p = (link.pitch * Math.PI) / 180;
  const y = (link.yaw * Math.PI) / 180;
  return unit([side * Math.sin(y) * Math.cos(p), -Math.sin(p), Math.cos(y) * Math.cos(p)]);
}

export interface Joint {
  /** Where the segment starts. */
  from: Vec3;
  /** Where it ends: the next segment's start. */
  to: Vec3;
  /** Along the segment. */
  d: Vec3;
  /** Across it, up and a little forward. */
  up: Vec3;
  /** The axis its motor turns about: across the arm. */
  axis: Vec3;
  link: Link;
}

/** The joints of an arm, in the natural frame. With a pose, each link's pitch shifts and the weld arm yaws by `point`. */
export function joints(arm: ArmSpec, pose?: DronePose): Joint[] {
  const out: Joint[] = [];
  let at = arm.base;
  for (let i = 0; i < arm.links.length; i += 1) {
    const link = arm.links[i];
    const posed = pose
      ? { ...link, pitch: link.pitch + pose.pitch[i], yaw: link.yaw + (arm.id === "weld" ? pose.point : 0) }
      : link;
    const d = direction(posed, arm.side);
    const axis = unit(cross([0, 1, 0], d));
    const up = unit(cross(d, axis));
    const to = add(at, mul(d, link.length));
    out.push({ from: at, to, d, up, axis, link: posed });
    at = to;
  }
  return out;
}

/** The end of an arm's last segment: where its gripper or tool is carried. */
export const wristOf = (arm: ArmSpec, pose?: DronePose): Joint => joints(arm, pose)[arm.links.length - 1];

/**
 * The lens' radius, metres. The two working points of a build are in `index.ts`: the tractor beam leaves the middle of the lens glass along +Z, and the weld's tip is the end of the welding tool on the left arm.
 */
export const LENS_RADIUS = 0.15;
