// Where the camera stands. One rule for the drawing and the 3D view, so the drawing turns into the 3D view without a jump. Pure, in metres.

export type Vec3 = [number, number, number];

/** The camera's field of view, in degrees, top to bottom. Narrow, because a rocket is long. */
export const FOV_DEG = 24;
/** The picture's shape. */
export const PICTURE_W = 480;
export const PICTURE_H = 640;

export const VIEW_NAMES = ["three-quarter", "front", "back", "side", "below"] as const;
export type ViewName = (typeof VIEW_NAMES)[number];
export const DEFAULT_VIEW: ViewName = "three-quarter";

/** An angle to look from: `az` degrees round from the windward side towards +X, `el` degrees above the horizon. Front is the windward, tiled side; back is the steel side. */
export interface Angle {
  az: number;
  el: number;
}

export const VIEWS: Readonly<Record<ViewName, Angle>> = {
  "three-quarter": { az: 32, el: 9 },
  front: { az: 0, el: 3 },
  back: { az: 180, el: 3 },
  side: { az: 90, el: 3 },
  below: { az: 24, el: -70 },
};

export const cleanView = (value: unknown): ViewName => ((VIEW_NAMES as readonly unknown[]).includes(value) ? (value as ViewName) : DEFAULT_VIEW);

export const deg = (d: number) => (d * Math.PI) / 180;

/** The unit vector from what is looked at towards the camera. */
export function directionOf({ az, el }: Angle): Vec3 {
  const c = Math.cos(deg(el));
  return [c * Math.sin(deg(az)), Math.sin(deg(el)), c * Math.cos(deg(az))];
}

export interface Framing {
  target: Vec3;
  position: Vec3;
  distance: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The camera's own axes for looking along `direction`, with up as near to +Y as it can be. */
export function axesOf(direction: Vec3): { right: Vec3; up: Vec3; forward: Vec3 } {
  const forward: Vec3 = [-direction[0], -direction[1], -direction[2]];
  const near = Math.abs(forward[1]) > 0.999;
  const right = unit(cross(forward, near ? [0, 0, -1] : [0, 1, 0]));
  return { right, up: cross(right, forward), forward };
}

/** The nearest camera that holds the whole of `min` to `max` in a picture `aspect` wide for 1 tall, from `angle`. */
export function frameFor(min: Vec3, max: Vec3, angle: Angle, aspect: number, margin = 1.08): Framing {
  const target: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const direction = directionOf(angle);
  const { right, up, forward } = axesOf(direction);
  const tanV = Math.tan(deg(FOV_DEG) / 2);
  const tanH = tanV * aspect;
  let distance = 0;
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        const q: Vec3 = [x - target[0], y - target[1], z - target[2]];
        const depth = dot(q, forward);
        distance = Math.max(distance, (Math.abs(dot(q, right)) * margin) / tanH - depth, (Math.abs(dot(q, up)) * margin) / tanV - depth);
      }
  return { target, distance, position: [target[0] + direction[0] * distance, target[1] + direction[1] * distance, target[2] + direction[2] * distance] };
}
