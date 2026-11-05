// Does this rocket go together? One description, checked against the parts' records: only the joints and sizes matter, wherever a part came from. Pure, so a form can ask it on every change; the builder
// asks it first and refuses what does not fit. A rocket labelled as a real version uses only parts true for it; anything else is a custom build and says so.
import { MODEL_CREDITS, type CreditId, type ModelCredit } from "./data/credits.ts";
import type { Variant } from "./data/types.ts";
import { partEntry } from "./model/registry.ts";
import type { PartRecord } from "./parts.ts";
import { partIdOf, ROCKETS, variantOf } from "./rockets.ts";

/**
 * A rocket to check or build: its id, its variant (left out: the rocket's default) and any other part in a slot, by part id.
 *
 * @example
 * ```ts
 * import { check, type Description } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const description: Description = { rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } };
 * console.log(check(description).label);
 * ```
 */
export interface Description {
  rocket: string;
  /** Left out: the rocket's default variant. */
  variant?: string;
  /** Another part in a slot, by its id. */
  parts?: Readonly<Record<string, string>>;
}

/**
 * Why a check said what it said: an unknown rocket, variant, slot or part, a part of the wrong kind, a joint that is missing, of another kind or of another width, or a custom build.
 *
 * @example
 * ```ts
 * import { check, type FitCode } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const codes: FitCode[] = check({ rocket: "nowhere" }).issues.map((issue) => issue.code);
 * console.log(codes);
 * ```
 */
export type FitCode = "unknown-rocket" | "unknown-variant" | "unknown-slot" | "unknown-part" | "wrong-kind" | "no-joint" | "joint-kind" | "joint-diameter" | "custom";

/**
 * One thing a check found: its code, its level (`error` stops a build, `note` says what was decided) and a sentence saying it.
 *
 * @example
 * ```ts
 * import { check, type FitIssue } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const issue: FitIssue | undefined = check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } }).issues[0];
 * console.log(issue?.level, issue?.message);
 * ```
 */
export interface FitIssue {
  code: FitCode;
  /** "error" stops the build. "note" says what the check decided. */
  level: "error" | "note";
  message: string;
}

/**
 * A part standing in a slot of a checked rocket.
 *
 * @example
 * ```ts
 * import { check, type SlotPart } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const bottom: SlotPart | undefined = check({ rocket: "starship", variant: "v3" }).parts[0];
 * console.log(bottom?.slot, bottom?.part.name);
 * ```
 */
export interface SlotPart {
  slot: string;
  part: PartRecord;
}

/**
 * The answer of `check`: whether the parts go together, the issues, the label to call the rocket, whether it is a custom build, the variant, the parts, the size and the credits of every licensed model.
 *
 * @example
 * ```ts
 * import { check, type FitReport } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const report: FitReport = check({ rocket: "falcon-9", variant: "block-5" });
 * console.log(report.ok, report.size);
 * ```
 */
export interface FitReport {
  ok: boolean;
  issues: readonly FitIssue[];
  /** What to call it: a real variant's name, or a plain words label for a mix. */
  label: string;
  /** True when any part is not true for the named variant: never presented as a vehicle that flew. */
  custom: boolean;
  variant: Variant | null;
  /** The parts, bottom up. */
  parts: readonly SlotPart[];
  /** Metres, as drawn: the parts' heights added, the widest diameter. Null when it does not fit. */
  size: { height: number; diameter: number } | null;
  /** Whose work each licensed part is. Empty when only this package's code is used. */
  credits: readonly (ModelCredit & { id: CreditId; usedFor: readonly string[] })[];
}

/** How far apart two joints may be in metres and still meet. */
export const JOINT_TOLERANCE = 0.1;

/** The whole height, joint to joint up the stack, and the widest part. */
function sizeOf(parts: readonly SlotPart[]): { height: number; diameter: number } {
  let y = 0;
  let top = 0;
  for (const { part } of parts) {
    if (part.strapOn) {
      top = Math.max(top, (part.strapOn.y ?? 0) + part.height);
      continue;
    }
    const base = y - (part.joints.bottom?.y ?? 0);
    top = Math.max(top, base + part.height);
    y = base + (part.joints.top ? part.joints.top.y : part.height);
  }
  return { height: Math.round(top * 1000) / 1000, diameter: Math.max(...parts.map(({ part }) => part.diameter)) };
}

/**
 * Asks whether a rocket goes together, from the parts' records alone, with no three.js and no DOM. A rocket labelled as a real version uses only parts true for it; any mix is a custom build and says so.
 *
 * @param description The rocket, its variant and any other part in a slot.
 * @returns A report that says whether it fits and why, with the size and the credits.
 * @example
 * ```ts
 * import { check } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const report = check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } });
 * console.log(report.ok, report.issues[0]?.message);
 * ```
 */
export function check(description: Description): FitReport {
  const issues: FitIssue[] = [];
  const fail = (code: FitCode, message: string) => issues.push({ code, level: "error", message });
  const done = (variant: Variant | null, parts: SlotPart[], custom: boolean): FitReport => {
    const ok = !issues.some((issue) => issue.level === "error");
    const used = new Map<CreditId, string[]>();
    for (const { part } of parts)
      if (part.painted) {
        if (!used.has(part.painted.credit)) used.set(part.painted.credit, []);
        (used.get(part.painted.credit) as string[]).push(part.name);
        for (const other of part.painted.also ?? []) {
          if (!used.has(other)) used.set(other, []);
          (used.get(other) as string[]).push(part.name);
        }
      }
    return {
      ok,
      issues,
      variant,
      parts,
      custom,
      label: custom ? `Custom build, not a vehicle that flew: ${parts.map(({ part }) => part.name).join(" with ")}` : (variant?.name ?? ""),
      size: ok ? sizeOf(parts) : null,
      credits: [...used].map(([id, usedFor]) => ({ ...MODEL_CREDITS[id], id, usedFor })),
    };
  };
  if (!Object.hasOwn(ROCKETS, description.rocket)) {
    fail("unknown-rocket", `There is no rocket "${description.rocket}" to build.`);
    return done(null, [], false);
  }
  const variant = variantOf(description.rocket, description.variant);
  if (!variant) {
    fail("unknown-variant", `${ROCKETS[description.rocket].name} has no variant "${description.variant}".`);
    return done(null, [], false);
  }
  const named = description.parts ?? {};
  for (const slot of Object.keys(named)) if (!variant.slots.includes(slot)) fail("unknown-slot", `${variant.name} has no slot "${slot}"; it has ${variant.slots.join(" and ")}.`);
  let custom = false;
  const parts: SlotPart[] = [];
  for (const slot of variant.slots) {
    const id = Object.hasOwn(named, slot) ? named[slot] : partIdOf(variant.rocket, variant.id, slot);
    const entry = partEntry(id);
    if (!entry) {
      fail("unknown-part", `There is no part "${id}".`);
      continue;
    }
    const home = partEntry(partIdOf(variant.rocket, variant.id, slot));
    if (home && entry.record.kind !== home.record.kind) fail("wrong-kind", `${entry.record.name} is a ${entry.record.kind}; this slot takes a ${home.record.kind}.`);
    if (!entry.record.trueTo.includes(variant.id)) custom = true;
    parts.push({ slot, part: entry.record });
  }
  // a side booster stands beside the stack, so the joints that must meet are those of the rest
  const stacked = parts.filter(({ part }) => !part.strapOn);
  for (let i = 0; i + 1 < stacked.length; i++) {
    const below = stacked[i].part;
    const above = stacked[i + 1].part;
    const top = below.joints.top;
    const bottom = above.joints.bottom;
    if (!top || !bottom) {
      fail("no-joint", `${below.name} and ${above.name} have no joint to meet at.`);
      continue;
    }
    if (top.kind !== bottom.kind) fail("joint-kind", `${below.name} ends in a ${top.kind} joint and ${above.name} starts with a ${bottom.kind} joint.`);
    if (Math.abs(top.diameter - bottom.diameter) > JOINT_TOLERANCE) fail("joint-diameter", `${below.name} is ${top.diameter} m across at the joint and ${above.name} is ${bottom.diameter} m.`);
  }
  if (custom) issues.push({ code: "custom", level: "note", message: "A part here is not true for this variant, so this is a custom build, not a vehicle that flew." });
  return done(variant, parts, custom);
}
