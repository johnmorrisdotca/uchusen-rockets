// The fleet's lights, in one place: running lights, a white anti-collision flash, a slow red beacon, floods and the pools they throw. Every ship asks here. The flash timings are the aircraft rule (40 to 100 a
// minute): the white flash at 60, the red beacon at 40. Position lights stay steady. A reader who asked for reduced motion gets them steady, not off. Pure: no three.js and no DOM.
import type { MaterialName } from "../materials.ts";
import type { Frame, Piece, Vec3 } from "../pieces.ts";

/** How many white anti-collision flashes a minute. Inside 40 to 100. */
const STROBE_PER_MIN = 60;
/** How long one white flash stays on, in seconds. */
const STROBE_ON_S = 0.08;
/** How many slow red beacons a minute. The slow end of the same rule. */
const BEACON_PER_MIN = 40;
/** How long one red beacon stays on, in seconds. */
const BEACON_ON_S = 0.4;

/** What a glowing material does. Engine glow follows the Engines switch, not this. */
type LampDuty = "running" | "flash" | "beacon" | "work" | "engine";

const DUTY: Readonly<Record<string, LampDuty>> = {
  "nav-red": "running",
  "nav-green": "running",
  "nav-white": "running",
  strobe: "flash",
  beacon: "beacon",
  flood: "work",
  "light-pool": "work",
  "light-pool-mid": "work",
  "light-pool-edge": "work",
  "halo-port": "running",
  "halo-port-soft": "running",
  "halo-starboard": "running",
  "halo-starboard-soft": "running",
  "halo-stern": "running",
  "halo-stern-soft": "running",
  "halo-strobe": "flash",
  "halo-strobe-soft": "flash",
  "halo-beacon": "beacon",
  "halo-beacon-soft": "beacon",
  "lamp-blue": "work",
  "lamp-amber": "work",
  "lamp-red": "work",
};

/**
 * Which job a material's glow has. A name that is not a lamp is engine glow, and follows the Engines switch.
 *
 * @param material A material name.
 * @returns `running` (steady), `flash` (the white anti-collision), `beacon` (the slow red), `work` (floods, pools, docking and work lamps) or `engine`.
 * @example
 * ```ts
 * import { dutyOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(dutyOf("nav-red"), dutyOf("strobe"), dutyOf("steel"));
 * ```
 */
export function dutyOf(material: string): LampDuty {
  return DUTY[material] ?? "engine";
}

/**
 * The Lights choice, from the attribute or the address. Anything else is `all`.
 *
 * @param value The text, or nothing when the attribute was left out.
 * @returns `off`, `running` or `all`.
 * @example
 * ```ts
 * import { lightMode } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(lightMode("running"), lightMode(null));
 * ```
 */
export function lightMode(value: string | null | undefined): "off" | "running" | "all" {
  return value === "off" || value === "running" || value === "all" ? value : "all";
}

/**
 * How bright a lamp is now, from 0 to 1. Position lights stay on. The white flash and the red beacon pulse, and both hold steady when motion is reduced. Work lights (floods, pools, docking and work lamps)
 * are on only for `all`.
 *
 * @param duty What the lamp is.
 * @param mode The Lights choice.
 * @param reduced Whether the reader asked for reduced motion.
 * @param seconds Seconds since the view started.
 * @returns The brightness, 0 to 1. Engine glow is always 1 here: the Engines switch applies that itself.
 * @example
 * ```ts
 * import { lampFactor } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(lampFactor("flash", "all", false, 0), lampFactor("flash", "all", true, 0));
 * ```
 */
export function lampFactor(duty: LampDuty, mode: "off" | "running" | "all", reduced: boolean, seconds: number): number {
  if (duty === "engine") return 1;
  if (mode === "off") return 0;
  if (duty === "work" && mode !== "all") return 0;
  if (duty === "flash" || duty === "beacon") {
    if (reduced) return 0.45;
    const period = 60 / (duty === "flash" ? STROBE_PER_MIN : BEACON_PER_MIN);
    const on = duty === "flash" ? STROBE_ON_S : BEACON_ON_S;
    return ((seconds % period) + period) % period < on ? 1 : 0.35;
  }
  return 1;
}

/** A soft coloured bead around a lamp, big enough to read when the whole ship is in frame, and faint so a close look still shows the lamp. Two of them, a bright core and a wider falloff. The wide view is the coarse model, so the bead is marked as a body. */
const HALO: Readonly<Record<string, { core: MaterialName; soft: MaterialName; radius: number }>> = {
  port: { core: "halo-port", soft: "halo-port-soft", radius: 12 },
  starboard: { core: "halo-starboard", soft: "halo-starboard-soft", radius: 12 },
  strobe: { core: "halo-strobe", soft: "halo-strobe-soft", radius: 12 },
  beacon: { core: "halo-beacon", soft: "halo-beacon-soft", radius: 12 },
  "nav-white": { core: "halo-stern", soft: "halo-stern-soft", radius: 12 },
  work: { core: "halo-stern", soft: "halo-stern-soft", radius: 0.45 },
};

function bead(material: MaterialName, at: Vec3, radius: number): Piece {
  const profile: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = (Math.PI * i) / 10;
    profile.push([Math.max(0.001, Math.sin(t) * radius), at[1] - Math.cos(t) * radius]);
  }
  return { kind: "lathe", material, at: [at[0], at[2]], segs: 18, only: "mesh", body: true, profile };
}

/** The glow around a running light, a strobe or a beacon. Empty for a colour that has no halo. */
export function lampHalo(colour: string, at: Vec3): Piece[] {
  const halo = HALO[colour];
  if (!halo) return [];
  return [bead(halo.soft, at, halo.radius), bead(halo.core, at, halo.radius * 0.22)];
}

/** A small dome. `at` is metres; the dome stands up from that point. */
function dome(material: "beacon" | "nav-white" | "lamp-amber", at: Vec3, size: number): Piece {
  return { kind: "lathe", material, at: [at[0], at[2]], segs: 8, only: "mesh", body: true, profile: [[size, at[1]], [size * 0.85, at[1] + size * 0.5], [0.001, at[1] + size * 0.8]] };
}

/**
 * The slow red beacon: a dome in the `beacon` material.
 *
 * @param at Where it stands, in metres.
 * @param size Its radius in metres. Left out: 0.14.
 * @returns The one piece.
 * @example
 * ```ts
 * import { beaconLamp } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(beaconLamp([0, 2, 4])[0].kind);
 * ```
 */
export function beaconLamp(at: Vec3, size = 0.14): Piece[] {
  return [dome("beacon", at, size), ...lampHalo("beacon", at)];
}

/**
 * The steady white stern light: a dome in the `nav-white` material.
 *
 * @param at Where it stands, in metres.
 * @param size Its radius in metres. Left out: 0.14.
 * @returns The one piece.
 * @example
 * ```ts
 * import { sternLamp } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(sternLamp([0, 1, -4])[0].kind);
 * ```
 */
export function sternLamp(at: Vec3, size = 0.14): Piece[] {
  return [dome("nav-white", at, size), ...lampHalo("nav-white", at)];
}

/**
 * An amber work lamp, for a construction drone and a berth.
 *
 * @param at Where it stands, in metres.
 * @param size Its radius in metres. Left out: 0.08.
 * @returns The one piece.
 * @example
 * ```ts
 * import { workLamp } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(workLamp([0.4, 0.2, 0.5])[0].kind);
 * ```
 */
export function workLamp(at: Vec3, size = 0.08): Piece[] {
  return [dome("lamp-amber", at, size), ...lampHalo("work", at)];
}

/**
 * A baked pool of warm light on a surface: a thin sheet in the `light-pool` material, lying in the frame. It is not a real light source.
 *
 * @param frame The surface it lies on. `w` points out of the surface.
 * @param radius How far the pool reaches, in metres.
 * @returns The one sheet.
 * @example
 * ```ts
 * import { lightPool } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pool = lightPool({ o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, 1);
 * console.log(pool[0].kind);
 * ```
 */
export function lightPool(frame: Frame, radius: number): Piece[] {
  const ring = (material: MaterialName, scale: number, lift: number): Piece => {
    const outline: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      outline.push([Math.cos(a) * radius * scale, Math.sin(a) * radius * scale]);
    }
    const o: Vec3 = [frame.o[0] + frame.w[0] * lift, frame.o[1] + frame.w[1] * lift, frame.o[2] + frame.w[2] * lift];
    return { kind: "plate", material, frame: { ...frame, o }, outline, thickness: 0.02, plain: true, sheet: true, only: "mesh" };
  };
  return [ring("light-pool-edge", 1, 0), ring("light-pool-mid", 0.62, 0.015), ring("light-pool", 0.32, 0.03)];
}
