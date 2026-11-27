import type { Bell } from "../engines.ts";
import { directionOf, type Angle, type Framing, type Vec3 } from "../framing.ts";
import { ariake } from "./showcase/ariake.ts";
import { drone } from "./showcase/drone.ts";
import { emiake } from "./showcase/emiake.ts";
import { hanabusa } from "./showcase/hanabusa.ts";
import { kaminari } from "./showcase/kaminari.ts";
import { kyotori } from "./showcase/kyotori.ts";
import { miyamoto } from "./showcase/miyamoto.ts";
import { romaryu } from "./showcase/romaryu.ts";

export interface ShowcaseShot {
  angle: Angle;
  target: Vec3;
  distance: number;
  roll: number;
}

export interface ShowcaseWake {
  /** Wake origin and scale in the drive part's model coordinates. */
  at: Vec3;
  scale: Vec3;
  intensity?: number;
}

export interface ShowcaseDrive {
  slot: string;
  /** Use the part's modelled bells when no nozzle list is supplied. */
  bells?: readonly Bell[];
  /** The local frame for a jet whose direction differs from the part's -Y. Rotation is in radians. */
  frame?: { at: Vec3; rotation: Vec3 };
  coreLength?: number;
  wakes: readonly ShowcaseWake[];
}

export interface ShowcaseRings {
  map: string;
  /** Ring radii in units of the globe's radius. */
  inner: number;
  outer: number;
  /** Ring axis in ship coordinates. */
  axis: Vec3;
}

export interface ShowcaseBody {
  map: string;
  /** Metres from the home camera along right, up, and forward. */
  place(aspect: number): { center: Vec3; radius: number };
  /** Globe rotation around its pole, in degrees. */
  longitude?: number;
  /** Colour a greyscale relief map from its darker terrain to its bright surface. */
  surfaceTones?: readonly [dark: string, light: string];
  atmosphere?: string;
  rings?: ShowcaseRings;
}

export interface ShowcasePreset {
  rocket: string;
  variant?: string;
  fov: number;
  shot(aspect: number): ShowcaseShot;
  sun: Vec3;
  drives: readonly ShowcaseDrive[];
  exhaustLight: { at: Vec3; intensity: number };
  body?: ShowcaseBody;
}

const PRESETS: readonly ShowcasePreset[] = [
  ariake,
  drone,
  emiake,
  hanabusa,
  kaminari,
  kyotori,
  miyamoto,
  romaryu,
];

export function showcasePreset(rocket: string | undefined, variant: string | undefined): ShowcasePreset | undefined {
  return PRESETS.find((preset) => preset.rocket === rocket && (variant === undefined || preset.variant === undefined || preset.variant === variant));
}

/** The viewer names the single slot when a whole craft has only one part. */
export function wholeShowcase(show: string, parts: readonly { slot: string }[]): boolean {
  return show === "together" || (parts.length === 1 && parts[0]?.slot === show);
}

export function showcaseFrame(preset: ShowcasePreset, angle: Angle | null, aspect: number): Framing {
  const shot = preset.shot(aspect);
  const { target, distance } = shot;
  const direction = directionOf(angle ?? shot.angle);
  const position: Vec3 = [target[0] + direction[0] * distance, target[1] + direction[1] * distance, target[2] + direction[2] * distance];
  return { target, position, distance };
}
