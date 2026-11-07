// Named poses for the repair drone. A pose shifts each arm link's pitch, opens or shuts the gripper, tucks or plants the legs, and yaws the weld arm. Pure: no three.js and no DOM.

export const POSE_NAMES = ["fly", "approach", "grip", "carry", "place", "weld", "inspect", "park"] as const;
export type PoseName = (typeof POSE_NAMES)[number];

/** Pitch is degrees added to the four links, shoulder first. Grip is 0 shut and 1 open. Legs are 0 tucked and 1 planted. Point is extra yaw on the weld arm. */
export interface DronePose {
  pitch: readonly [number, number, number, number];
  grip: number;
  legs: number;
  point: number;
}

export const DRONE_POSE: Record<PoseName, DronePose> = {
  fly: { pitch: [18, 28, 24, 20], grip: 0.15, legs: 0, point: 0 },
  approach: { pitch: [-30, -24, -8, -20], grip: 1, legs: 0.2, point: 0 },
  grip: { pitch: [-20, -10, 0, -10], grip: 0, legs: 0.2, point: 0 },
  carry: { pitch: [8, 6, 10, 16], grip: 0, legs: 0, point: 0 },
  place: { pitch: [-36, -28, -12, -24], grip: 0.25, legs: 0.35, point: 0 },
  weld: { pitch: [-10, -6, 4, 8], grip: 0.4, legs: 0.5, point: 28 },
  inspect: { pitch: [-16, -20, -6, -8], grip: 0.5, legs: 0.3, point: 46 },
  park: { pitch: [22, 30, 26, 18], grip: 0.1, legs: 1, point: 0 },
};

const clamp = (t: number): number => Math.min(1, Math.max(0, t));

/** A blend from `a` toward `b`. `t` is 0 at `a` and 1 at `b`. */
export function blendPose(a: DronePose, b: DronePose, t: number): DronePose {
  const u = clamp(t);
  const pitch = a.pitch.map((p, i) => p + ((b.pitch[i] ?? p) - p) * u) as [number, number, number, number];
  return { pitch, grip: a.grip + (b.grip - a.grip) * u, legs: a.legs + (b.legs - a.legs) * u, point: a.point + (b.point - a.point) * u };
}

/** How far a finger tip sits from the palm centre, metres. */
export function fingerSpan(open: number): number {
  return 0.006 + 0.024 * clamp(open);
}

/** The few poses a distant drone may wear. Anything else snaps to the nearest of these. */
export const STORED_POSES = ["fly", "place", "park"] as const;
export type StoredPose = (typeof STORED_POSES)[number];

/**
 * The three shapes a distant drone is drawn as. They are pushed apart so each reads at a glance: the folded arms sit behind the saucer, the reaching arms come out in front, and the planted drone stands on its legs.
 */
export const STORED_SHAPE: Record<StoredPose, DronePose> = {
  fly: { pitch: [80, 60, 40, 20], grip: 0.1, legs: 0, point: 0 },
  place: { pitch: [-55, -50, -30, -20], grip: 0.4, legs: 0, point: 0 },
  park: { pitch: [80, 60, 40, 20], grip: 0.1, legs: 1, point: 0 },
};

/** A distant drone keeps one rigid pose: folded, reaching, or planted. */
export function storedPose(name: PoseName): StoredPose {
  if (name === "fly" || name === "carry") return "fly";
  if (name === "park") return "park";
  return "place";
}

/** Which named pose a drone holds for this rank, duty and task. */
export function poseFor(rank: "boss" | "manager" | "builder" | "grunt" | undefined, duty: "work" | "transit" | "berth", task?: string): PoseName {
  if (duty === "berth") return "park";
  if (duty === "transit") return "fly";
  if (rank === "grunt") return task === "carry" ? "carry" : "approach";
  if (rank === "boss" || rank === "manager" || task === "inspect" || task === "survey" || task === "direct") return "inspect";
  if (task === "weld" || task === "fasten") return "weld";
  if (task === "carry") return "carry";
  return "place";
}

/** The pose a drone holds. A boss points further out than a manager on the same inspect pose. */
export function poseOf(rank: "boss" | "manager" | "builder" | "grunt" | undefined, duty: "work" | "transit" | "berth", task?: string): DronePose {
  const pose = DRONE_POSE[poseFor(rank, duty, task)];
  if (rank === "boss" && duty === "work") return { ...pose, point: pose.point + 24 };
  return pose;
}
