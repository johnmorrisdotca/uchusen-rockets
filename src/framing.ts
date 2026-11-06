// Where the camera stands. One rule for the drawing and the 3D view, so the drawing turns into the 3D view without a jump. Pure, in metres.

/**
 * Three numbers: x, y and z. Y is up and the windward side faces +Z, in metres.
 *
 * @example
 * ```ts
 * import type { Vec3 } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const origin: Vec3 = [0, 0, 0];
 * console.log(origin);
 * ```
 */
export type Vec3 = [number, number, number];

/**
 * The camera's field of view, in degrees, top to bottom. Narrow, because a rocket is long.
 *
 * @example
 * ```ts
 * import { FOV_DEG } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FOV_DEG);
 * ```
 */
export const FOV_DEG = 24;
/**
 * The width of the picture a drawing is made in, in drawing units.
 *
 * @example
 * ```ts
 * import { PICTURE_W, PICTURE_H } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PICTURE_W, PICTURE_H);
 * ```
 */
export const PICTURE_W = 480;
/**
 * The height of the picture a drawing is made in, in drawing units.
 *
 * @example
 * ```ts
 * import { PICTURE_H } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PICTURE_H);
 * ```
 */
export const PICTURE_H = 640;

/**
 * The names of the views, in the order the demo lists them: `three-quarter`, `front`, `back`, `side` and `below`.
 *
 * @example
 * ```ts
 * import { VIEW_NAMES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(VIEW_NAMES.join(", "));
 * ```
 */
export const VIEW_NAMES = ["three-quarter", "front", "back", "side", "below"] as const;
/**
 * The name of one view in `VIEW_NAMES`.
 *
 * @example
 * ```ts
 * import type { ViewName } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const view: ViewName = "below";
 * console.log(view);
 * ```
 */
export type ViewName = (typeof VIEW_NAMES)[number];
/**
 * The view used when none is named or the name is not a view: `three-quarter`.
 *
 * @example
 * ```ts
 * import { DEFAULT_VIEW } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DEFAULT_VIEW);
 * ```
 */
export const DEFAULT_VIEW: ViewName = "three-quarter";

/**
 * An angle to look from: `az` degrees round from the windward side towards +X, `el` degrees above the horizon. Front is the windward, tiled side; back is the steel side.
 *
 * @example
 * ```ts
 * import { VIEWS, type Angle } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const angle: Angle = VIEWS.back;
 * console.log(angle);
 * ```
 */
export interface Angle {
  az: number;
  el: number;
}

/**
 * The angle of each named view.
 *
 * @example
 * ```ts
 * import { VIEWS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(VIEWS.front, VIEWS.below);
 * ```
 */
export const VIEWS: Readonly<Record<ViewName, Angle>> = {
  "three-quarter": { az: 32, el: 9 },
  front: { az: 0, el: 3 },
  back: { az: 180, el: 3 },
  side: { az: 90, el: 3 },
  below: { az: 24, el: -70 },
};

/**
 * A value from outside as a view's name.
 *
 * @param value Anything.
 * @returns The name if it is one of the views, and `three-quarter` for anything else.
 * @example
 * ```ts
 * import { cleanView } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(cleanView("side"), cleanView("sideways"), cleanView(42));
 * ```
 */
export const cleanView = (value: unknown): ViewName => ((VIEW_NAMES as readonly unknown[]).includes(value) ? (value as ViewName) : DEFAULT_VIEW);

export const deg = (d: number) => (d * Math.PI) / 180;

/**
 * What the family's view controls report: the turn and tip in degrees, the zoom (1 is the whole rocket in the picture) and the pan in pixels.
 *
 * @example
 * ```ts
 * import type { ViewChoice } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const choice: ViewChoice = { yaw: 20, tilt: -5, zoom: 1, panX: 0, panY: 0 };
 * console.log(choice);
 * ```
 */
export interface ViewChoice {
  yaw: number;
  tilt: number;
  /** Degrees about the view's forward axis. Left out, the camera stays upright. */
  roll?: number;
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * What the family's view controls choose: the turn and tip, in degrees, from a base angle. Dragging right makes `yaw` larger, which carries the camera the other way round; `tilt` larger tips the top away, which lowers the camera.
 *
 * @param base The angle to turn from.
 * @param yaw Degrees turned round.
 * @param tilt Degrees tipped up or down.
 * @returns The new angle.
 * @example
 * ```ts
 * import { turnedBy, VIEWS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(turnedBy(VIEWS.front, 30, 10));
 * ```
 */
export function turnedBy(base: Angle, yaw: number, tilt: number): Angle {
  return { az: base.az - yaw, el: Math.min(87, Math.max(-87, base.el - tilt)) };
}

/**
 * The camera's up axis after a roll about the direction it looks along. Zero roll is straight up. The direction is a unit vector from the subject towards the camera.
 *
 * @param direction Where the camera stands, as a unit vector.
 * @param roll Degrees about that direction. Positive rolls the camera's right side down.
 * @returns The up axis.
 * @example
 * ```ts
 * import { rolledUp } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(rolledUp([0, 0, 1], 0));
 * ```
 */
export function rolledUp(direction: Vec3, roll: number): Vec3 {
  if (roll === 0) return [0, 1, 0];
  const rad = (roll * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const [x, y, z] = direction;
  const dot = y;
  return [(-z) * s + x * dot * (1 - c), c + y * dot * (1 - c), x * s + z * dot * (1 - c)];
}

/**
 * The unit vector from what is looked at towards the camera.
 *
 * @param angle The angle to look from.
 * @returns A unit vector.
 * @example
 * ```ts
 * import { directionOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(directionOf({ az: 0, el: 0 }));
 * ```
 */
export function directionOf({ az, el }: Angle): Vec3 {
  const c = Math.cos(deg(el));
  return [c * Math.sin(deg(az)), Math.sin(deg(el)), c * Math.cos(deg(az))];
}

/**
 * Where the camera stands: the point it looks at, its position and its distance from that point, in metres.
 *
 * @example
 * ```ts
 * import { frameFor, type Framing } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const framing: Framing = frameFor([-5, 0, -5], [5, 100, 5], { az: 30, el: 15 }, 480 / 640);
 * console.log(framing.distance > 0);
 * ```
 */
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

/**
 * The camera's own axes for looking along `direction`, with up as near to +Y as it can be.
 *
 * @param direction The direction from the target to the camera.
 * @returns The camera's right, up and forward axes.
 * @example
 * ```ts
 * import { axesOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(axesOf([0, 0, 1]));
 * ```
 */
export function axesOf(direction: Vec3): { right: Vec3; up: Vec3; forward: Vec3 } {
  const forward: Vec3 = [-direction[0], -direction[1], -direction[2]];
  const near = Math.abs(forward[1]) > 0.999;
  const right = unit(cross(forward, near ? [0, 0, -1] : [0, 1, 0]));
  return { right, up: cross(right, forward), forward };
}

/**
 * The nearest camera that holds the whole of `min` to `max` in a picture `aspect` wide for 1 tall, from `angle`.
 *
 * @param min The lowest corner of the box to hold.
 * @param max The highest corner.
 * @param angle The angle to look from.
 * @param aspect The picture's width over its height.
 * @param margin Room left round the box, as a multiple. Defaults to 1.08.
 * @returns The camera that holds the whole box.
 * @example
 * ```ts
 * import { frameFor, VIEWS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const framing = frameFor([-4.5, 0, -4.5], [4.5, 124, 4.5], VIEWS.front, 480 / 640);
 * console.log(framing.target, framing.distance.toFixed(0));
 * ```
 */
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

/** A distant transition camera keeps very large craft in front of its near plane. */
export function transitionReferenceDistance(oldDistance: number, newDistance: number): number {
  return Math.max(oldDistance, newDistance) * 20;
}

/**
 * Ease-in-out: slow at both ends, so a camera move does not start or stop with a jerk.
 * @param t How far through the move, from 0 to 1 (values outside are held at the ends).
 * @returns The eased progress, from 0 to 1.
 * @example
 * ```ts
 * import { easeInOut } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(easeInOut(0.5)); // 0.5
 * ```
 */
export function easeInOut(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

/**
 * A distance between two camera distances, even in scale. The halfway point is the geometric mean, so 60 m to 1 800 m does not rush the far end.
 *
 * @param from The distance at the start, in metres.
 * @param to The distance at the end, in metres.
 * @param t How far along the move is, from 0 to 1.
 * @returns The distance at `t`, in metres.
 * @example
 * ```ts
 * import { easedDistance } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(easedDistance(60, 1800, 0.5).toFixed(0));
 * ```
 */
export function easedDistance(from: number, to: number, t: number): number {
  const e = easeInOut(t);
  const lo = Math.log(Math.max(1e-4, from));
  const hi = Math.log(Math.max(1e-4, to));
  return Math.exp(lo + (hi - lo) * e);
}

/** The scale bar's length in metres: the shortest mark that is at least 50 pixels, or the longest that fits when the picture is too narrow for that. */
export function scaleBarMetres(metresPerPixel: number, width: number): number {
  const candidates = [0.1, 1, 10, 100, 1000];
  if (!(metresPerPixel > 0) || !(width > 0)) return 0.1;
  const room = width * 0.7;
  const fit = candidates.filter((value) => value / metresPerPixel <= room);
  const readable = fit.filter((value) => value / metresPerPixel >= 50);
  return readable[0] ?? fit[fit.length - 1] ?? 0.1;
}
