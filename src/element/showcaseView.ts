import { directionOf, type Angle, type Framing, type Vec3 } from "../framing.ts";

export function supportsShowcase(rocket: string | undefined, variant: string | undefined): boolean {
  return rocket === "fleet-ship-01" && (variant === undefined || variant === "hanabusa");
}

export const SHOWCASE_ANGLE: Angle = { az: 34, el: -44 };
export const SHOWCASE_ROLL = 14;
export const SHOWCASE_FOV = 47;
export const SHOWCASE_SUN: Vec3 = [-5, 2, 2];

export function showcaseFrame(angle: Angle, aspect: number): Framing {
  const portrait = Math.min(1, Math.max(0, (1.4 - aspect) / 0.9));
  const direction = directionOf(angle);
  const distance = Math.max(550 + 20 * portrait, 220 / aspect);
  const target: Vec3 = [-118 + 108 * portrait, 116 + 76 * portrait, 68 - 62 * portrait];
  return { target, position: [target[0] + direction[0] * distance, target[1] + direction[1] * distance, target[2] + direction[2] * distance], distance };
}
