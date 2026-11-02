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

/** It sits on what is below it, or beside it, for a side booster. */
const fitsOn = (part: PartRecord, below: PartRecord | undefined): boolean => {
  if (part.strapOn || !below) return true;
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
  let alive = every;
  for (let row = 0; alive.some((frame) => frame.slots.length > row); row++) {
    const below = chosen[row - 1];
    const candidates = (frame: Frame): readonly PartRecord[] => {
      if (row >= frame.slots.length) return [];
      const home = frame.homes[row];
      // the bottom row offers each rocket's own foot: what stands on it is what mixes
      if (row === 0) return [home];
      return parts.filter((part) => sameShape(part, home) && fitsOn(part, below));
    };
    const offered = new Map<string, PartRecord>();
    for (const frame of alive) for (const part of candidates(frame)) offered.set(part.id, part);
    if (offered.size === 0) break;
    const options = [...offered.values()];
    const asked = picks[row];
    const pick =
      (asked !== undefined && offered.get(asked)) ||
      // the part that flew with what is below it, when there is one
      (below && options.find((part) => part.rocket === below.rocket && part.trueTo.some((id) => below.trueTo.includes(id)))) ||
      options[0];
    chosen.push(pick);
    // the bottom row's own frames share one foot by shape; above it a frame stays while it can take the pick
    alive = row === 0 ? every.filter((frame) => sameShape(pick, frame.homes[0])) : alive.filter((frame) => candidates(frame).some((part) => part.id === pick.id));
    const slots = [...new Set(alive.filter((frame) => row < frame.slots.length).map((frame) => frame.slots[row]))];
    rows.push({ label: slots.map((slot) => SLOT_NAMES[slot] ?? slot).join(" or "), options: options.map(optionOf), chosen: pick.id, auto: options.length === 1 });
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
