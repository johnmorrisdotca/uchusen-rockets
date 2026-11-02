// What the part builder offers. A rocket from parts of every rocket, row by row from the bottom: each row offers only what fits on the row below, a row with one answer is answered for the reader, and a change lower down carries what still fits and makes a fresh choice for the rest. So the builder can never reach a rocket that does not go together, and `check` still has the last word. Everything comes from `ROCKETS` and `PART_ENTRIES`, so a new rocket is offered with no change here. Pure.
import { check, type Description, type FitReport, JOINT_TOLERANCE } from "./fit.ts";
import { partEntry, PART_ENTRIES } from "./model/registry.ts";
import type { PartRecord } from "./parts.ts";
import { partIdOf, ROCKETS, SLOT_NAMES } from "./rockets.ts";

/** A variant's slots, each with its own part: what a rocket from parts is built on. */
interface Frame {
  rocket: string;
  variant: string;
  slots: readonly string[];
  homes: readonly PartRecord[];
}

function framesOf(): Frame[] {
  const frames: Frame[] = [];
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const homes = variant.slots.map((slot) => partEntry(partIdOf(variant.rocket, variant.id, slot))?.record);
      if (homes.every(Boolean)) frames.push({ rocket: rocket.id, variant: variant.id, slots: variant.slots, homes: homes as PartRecord[] });
    }
  return frames;
}

/** A part can stand in a slot when it is the same kind of part and joins the same ways as the slot's own. */
const sameShape = (part: PartRecord, home: PartRecord): boolean =>
  part.kind === home.kind && Boolean(part.joints.top) === Boolean(home.joints.top) && Boolean(part.joints.bottom) === Boolean(home.joints.bottom) && part.strapOn?.x === home.strapOn?.x && part.strapOn?.z === home.strapOn?.z;

/** It sits on what is below it. */
const fitsOn = (part: PartRecord, below: PartRecord | undefined): boolean => {
  if (!below) return true;
  const { top } = below.joints;
  const { bottom } = part.joints;
  return Boolean(top && bottom && top.kind === bottom.kind && Math.abs(top.diameter - bottom.diameter) <= JOINT_TOLERANCE);
};

const REAL_PARTS = (): readonly PartRecord[] => PART_ENTRIES.map(({ record }) => record).filter((record) => record.trueTo.length > 0);

export interface BuilderOption {
  id: string;
  name: string;
  /** Which rocket it comes from, to group a long list. */
  rocket: string;
}

export interface BuilderRow {
  /** What this row chooses. */
  label: string;
  options: readonly BuilderOption[];
  chosen: string;
  /** One answer only: the builder made the choice. */
  auto: boolean;
}

export interface BuilderState {
  rows: readonly BuilderRow[];
  description: Description;
  report: FitReport;
}

const optionOf = (part: PartRecord): BuilderOption => ({ id: part.id, name: part.name, rocket: ROCKETS[part.rocket]?.name ?? part.rocket });

/** The rows for these picks, from the bottom. A pick that is not offered, for a change lower down or a hostile value, gives way to the part that belongs with what is below, or else the first that fits. */
export function builderState(picks: readonly string[] = []): BuilderState {
  const every = framesOf();
  const parts = REAL_PARTS();
  const rows: BuilderRow[] = [];
  const chosen: PartRecord[] = [];
  // Only what can still be finished is offered: nothing on any row leads to a rocket with a part missing.
  const known = new Map<string, boolean>();
  const finishes = (frame: Frame, row: number, below: PartRecord | undefined, foot: PartRecord): boolean => {
    if (row >= frame.slots.length) return true;
    const key = `${frame.rocket}/${frame.variant}/${row}/${below?.id}/${foot.id}`;
    let answer = known.get(key);
    if (answer === undefined) {
      answer = fitting(frame, row, below, foot).length > 0;
      known.set(key, answer);
    }
    return answer;
  };
  const fitting = (frame: Frame, row: number, below: PartRecord | undefined, foot: PartRecord): readonly PartRecord[] => {
    const home = frame.homes[row];
    // a part placed rather than stacked has no joint to mix at: it stands where its own variant puts it, by its own foot
    if (home.strapOn) return frame.homes[0].id === foot.id && finishes(frame, row + 1, below, foot) ? [home] : [];
    return parts.filter((part) => sameShape(part, home) && fitsOn(part, below) && finishes(frame, row + 1, part, foot));
  };
  let alive = every;
  for (let row = 0; alive.some((frame) => frame.slots.length > row); row++) {
    // what a part sits on is the last one stacked: one placed beside the stack, a side booster or an orbiter, holds nothing up
    const below = chosen.findLast((part) => !part.strapOn);
    const candidates = (frame: Frame): readonly PartRecord[] => {
      if (row >= frame.slots.length) return [];
      // the bottom row offers each rocket's own foot: what stands on it is what mixes
      if (row === 0) return [frame.homes[0]];
      return fitting(frame, row, below, chosen[0]);
    };
    const offered = new Map<string, PartRecord>();
    for (const frame of alive) for (const part of candidates(frame)) offered.set(part.id, part);
    if (offered.size === 0) break;
    const options = [...offered.values()];
    const asked = picks[row];
    const pick =
      (asked !== undefined && offered.get(asked)) ||
      // the next part of the real vehicle that everything so far belongs to, when there is one
      alive.flatMap((frame) => (frame.slots.length > row && chosen.every((part, i) => frame.homes[i].id === part.id) ? [frame.homes[row]] : [])).find((part) => offered.has(part.id)) ||
      // the part that flew with what is below it, when there is one
      (below && options.find((part) => part.rocket === below.rocket && part.trueTo.some((id) => below.trueTo.includes(id)))) ||
      options[0];
    chosen.push(pick);
    // the bottom row's own frames share one foot by shape; above it a frame stays while it can take the pick
    alive = row === 0 ? every.filter((frame) => sameShape(pick, frame.homes[0])) : alive.filter((frame) => candidates(frame).some((part) => part.id === pick.id));
    const slots = [...new Set(alive.filter((frame) => row < frame.slots.length).map((frame) => frame.slots[row]))];
    rows.push({ label: slots.map((slot) => SLOT_NAMES[slot] ?? slot).join(" or "), options: options.map(optionOf), chosen: pick.id, auto: options.length === 1 });
    // a real vehicle whole: nothing goes on top of it, even where a longer one shares its shape so far
    if (alive.some((frame) => frame.slots.length === chosen.length && frame.homes.every((home, i) => home.id === chosen[i].id))) break;
  }
  const whole = alive.filter((frame) => frame.slots.length === chosen.length);
  const chosenSlot = (description: Description) => whole.find((frame) => frame.rocket === description.rocket && frame.variant === description.variant)?.slots[0] ?? "";
  const described = whole.map((frame): Description => {
    const named = Object.fromEntries(frame.slots.flatMap((slot, i) => (frame.homes[i].id === chosen[i].id ? [] : [[slot, chosen[i].id]])));
    return { rocket: frame.rocket, variant: frame.variant, ...(Object.keys(named).length > 0 ? { parts: named } : {}) };
  });
  // the name of a real vehicle where these parts are one; a custom build otherwise, and it says so
  // and, of those, the version it has most parts of, so a custom build is said the plainest way
  const swapped = (description: Description) => Object.keys(description.parts ?? {});
  const reports = described
    // a tie goes to the version of the bottom part: it is the one the reader chose first
    .sort((a, b) => swapped(a).length - swapped(b).length || Number(swapped(a).includes(chosenSlot(a))) - Number(swapped(b).includes(chosenSlot(b))))
    .map((description) => ({ description, report: check(description) }));
  const best = reports.find(({ report }) => report.ok && !report.custom) ?? reports.find(({ report }) => report.ok) ?? reports[0];
  return { rows, description: best.description, report: best.report };
}
