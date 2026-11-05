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
  "halo-window": "running",
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

/** A bead that only marks where a lamp stands. The wide view keeps it (it is a body). The picture draws the glow as a small soft point, so the bead stays under a metre and never becomes a disc. */
const HALO: Readonly<Record<string, MaterialName>> = {
  port: "halo-port",
  starboard: "halo-starboard",
  strobe: "halo-strobe",
  beacon: "halo-beacon",
  "nav-white": "halo-stern",
  window: "halo-window",
  work: "halo-stern",
};

function bead(material: MaterialName, at: Vec3, radius: number): Piece {
  const profile: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (Math.PI * i) / 8;
    profile.push([Math.max(0.001, Math.sin(t) * radius), at[1] - Math.cos(t) * radius]);
  }
  return { kind: "lathe", material, at: [at[0], at[2]], segs: 10, only: "mesh", body: true, profile };
}

/**
 * Where a running light, a strobe, a beacon or a window glow stands. Empty for a colour that has no halo.
 * `scale` is accepted so older calls still compile; the bead stays small either way.
 */
export function lampHalo(colour: string, at: Vec3, scale = 1): Piece[] {
  const halo = HALO[colour];
  if (!halo || !(scale > 0)) return [];
  return [bead(halo, at, 0.55)];
}

/** A small dome. `at` is metres; the dome stands up from that point. */
function dome(material: "beacon" | "nav-white" | "lamp-amber", at: Vec3, size: number): Piece {
  return { kind: "lathe", material, at: [at[0], at[2]], segs: 8, only: "mesh", profile: [[size, at[1]], [size * 0.85, at[1] + size * 0.5], [0.001, at[1] + size * 0.8]] };
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
  return [dome("beacon", at, size)];
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
  return [dome("nav-white", at, size)];
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
  return [dome("lamp-amber", at, size)];
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
  const o: Vec3 = [frame.o[0] + frame.w[0] * 0.04, frame.o[1] + frame.w[1] * 0.04, frame.o[2] + frame.w[2] * 0.04];
  return [{ kind: "plate", material: "light-pool", frame: { ...frame, o }, outline: [[-radius, -radius], [radius, -radius], [radius, radius], [-radius, radius]], thickness: 0.02, plain: true, sheet: true, only: "mesh" }];
}
