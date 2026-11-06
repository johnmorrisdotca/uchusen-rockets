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

/** A kind a fleet ship can switch on its own. */
export const LIGHT_KINDS = ["running", "flash", "beacon", "dock", "flood", "window", "work"] as const;
export type LightKind = (typeof LIGHT_KINDS)[number];
/** How a kind changes. Reduced motion keeps every one of these steady. */
export const LIGHT_PATTERNS = ["steady", "flash", "double", "pulse"] as const;
export type LightPattern = (typeof LIGHT_PATTERNS)[number];

/** Which kinds are on, and the pattern each one uses. `preset` is `custom` when the rows do not match Off, Running only or All. */
export type LightChoice = {
  preset: "off" | "running" | "all" | "custom";
  on: Record<LightKind, boolean>;
  pattern: Record<LightKind, LightPattern>;
};

const DEFAULT_PATTERN: Readonly<Record<LightKind, LightPattern>> = {
  running: "steady",
  flash: "flash",
  beacon: "flash",
  dock: "steady",
  flood: "steady",
  window: "steady",
  work: "steady",
};

const KIND: Readonly<Record<string, LightKind>> = {
  "nav-red": "running",
  "nav-green": "running",
  "nav-white": "running",
  "halo-port": "running",
  "halo-port-soft": "running",
  "halo-starboard": "running",
  "halo-starboard-soft": "running",
  "halo-stern": "running",
  "halo-stern-soft": "running",
  strobe: "flash",
  "halo-strobe": "flash",
  "halo-strobe-soft": "flash",
  beacon: "beacon",
  "halo-beacon": "beacon",
  "halo-beacon-soft": "beacon",
  "lamp-blue": "dock",
  flood: "flood",
  "light-pool": "flood",
  "light-pool-mid": "flood",
  "light-pool-edge": "flood",
  "halo-window": "window",
  "lamp-amber": "work",
  "lamp-red": "work",
};

const kindName = (value: string): LightKind | null => (LIGHT_KINDS as readonly string[]).includes(value) ? value as LightKind : null;
const patternName = (value: string | undefined): LightPattern | null => value !== undefined && (LIGHT_PATTERNS as readonly string[]).includes(value) ? value as LightPattern : null;

function choiceOf(preset: "off" | "running" | "all"): LightChoice {
  const on = preset !== "off";
  const choice: LightChoice = { preset, on: {} as Record<LightKind, boolean>, pattern: { ...DEFAULT_PATTERN } };
  for (const kind of LIGHT_KINDS) choice.on[kind] = on && (preset === "all" || kind === "running" || kind === "flash" || kind === "beacon");
  return choice;
}

function sameChoice(a: LightChoice, b: LightChoice): boolean {
  return LIGHT_KINDS.every((kind) => a.on[kind] === b.on[kind] && a.pattern[kind] === b.pattern[kind]);
}

/**
 * Which kind a material belongs to. A name that is not a lamp is engine glow.
 *
 * @param material A material name.
 * @returns A light kind, or `engine`.
 * @example
 * ```ts
 * import { kindOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(kindOf("lamp-blue"), kindOf("flood"), kindOf("steel"));
 * ```
 */
export function kindOf(material: string): LightKind | "engine" {
  return KIND[material] ?? "engine";
}

/**
 * The Lights choice, including one row per kind. `off`, `running` and `all` are the three presets. A list such as `dock.pulse,flood.steady` turns on only the kinds it names. Anything else is `all`.
 *
 * @param value The attribute or the address, or nothing when it was left out.
 * @returns The choice. Each call returns a new one.
 * @example
 * ```ts
 * import { lightChoice } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(lightChoice("running").on.dock, lightChoice("dock.pulse").pattern.dock);
 * ```
 */
export function lightChoice(value: string | null | undefined): LightChoice {
  if (value == null || value === "" || value === "all") return choiceOf("all");
  if (value === "off" || value === "running") return choiceOf(value);
  const choice = choiceOf("off");
  choice.preset = "custom";
  let any = false;
  for (const token of value.split(",")) {
    if (token === "") continue;
    const [name, pattern] = token.split(".");
    const kind = name ? kindName(name) : null;
    if (!kind) continue;
    any = true;
    choice.on[kind] = true;
    const named = patternName(pattern);
    if (named) choice.pattern[kind] = named;
  }
  if (!any) return choiceOf("all");
  if (sameChoice(choice, choiceOf("off"))) choice.preset = "off";
  else if (sameChoice(choice, choiceOf("running"))) choice.preset = "running";
  else if (sameChoice(choice, choiceOf("all"))) choice.preset = "all";
  return choice;
}

/**
 * The address word for a choice. A preset stays one word. Anything else names each lit kind and its pattern, so a single kind cannot be read as Running only.
 *
 * @param choice The choice.
 * @returns `off`, `running`, `all`, or a comma list such as `running.steady`.
 * @example
 * ```ts
 * import { lightChoice, lightWord } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(lightWord(lightChoice(null)));
 * ```
 */
export function lightWord(choice: LightChoice): string {
  if (sameChoice(choice, choiceOf("off"))) return "off";
  if (sameChoice(choice, choiceOf("running"))) return "running";
  if (sameChoice(choice, choiceOf("all"))) return "all";
  const parts = LIGHT_KINDS.filter((kind) => choice.on[kind]).map((kind) => `${kind}.${choice.pattern[kind]}`);
  return parts.join(",") || "off";
}

/** True when any kind is on. The night side follows this. */
export function lightAnyOn(choice: LightChoice): boolean {
  return LIGHT_KINDS.some((kind) => choice.on[kind]);
}

/** True when a lit kind uses a pattern that changes. Reduced motion does not. */
export function lightPulses(choice: LightChoice): boolean {
  return LIGHT_KINDS.some((kind) => choice.on[kind] && choice.pattern[kind] !== "steady");
}

function flashLevel(kind: LightKind, seconds: number): number {
  const slow = kind === "beacon";
  const period = 60 / (slow ? BEACON_PER_MIN : STROBE_PER_MIN);
  const on = slow ? BEACON_ON_S : STROBE_ON_S;
  return ((seconds % period) + period) % period < on ? 1 : 0.35;
}

function doubleFlash(seconds: number): number {
  const t = ((seconds % 1) + 1) % 1;
  return t < 0.08 || (t >= 0.16 && t < 0.24) ? 1 : 0.35;
}

function slowPulse(seconds: number): number {
  const t = ((seconds % 2.5) + 2.5) % 2.5;
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 2.5));
}

/**
 * How bright one kind is now, from 0 to 1. A kind that is off stays off. Flash, double flash and pulse hold steady when motion is reduced. The beacon's flash is the slow one.
 *
 * @param kind Which kind.
 * @param choice The Lights choice.
 * @param reduced Whether the reader asked for reduced motion.
 * @param seconds Seconds since the view started.
 * @returns The brightness, 0 to 1.
 * @example
 * ```ts
 * import { kindFactor, lightChoice } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(kindFactor("dock", lightChoice("running"), false, 0), kindFactor("flash", lightChoice("all"), true, 0));
 * ```
 */
export function kindFactor(kind: LightKind, choice: LightChoice, reduced: boolean, seconds: number): number {
  if (!choice.on[kind]) return 0;
  if (reduced) return kind === "flash" || kind === "beacon" ? 0.45 : 1;
  const pattern = choice.pattern[kind];
  if (pattern === "flash") return flashLevel(kind, seconds);
  if (pattern === "double") return doubleFlash(seconds);
  if (pattern === "pulse") return slowPulse(seconds);
  return 1;
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
