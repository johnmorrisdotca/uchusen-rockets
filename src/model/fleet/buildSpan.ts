// One way to turn a keel order and a fit-out list into days. The keel steps meet. A fit-out step starts when the part it stands on is finished, and it ends when the ship flies.
export interface BuildStep {
  /** The slot on the ship. */
  slot: string;
  /** The part that fills it. */
  part: string;
  /** Days after the keel is laid. */
  start: number;
  /** How many days the step takes. */
  days: number;
  /** Steps that share a group may run at the same time. The keel does not. */
  group: "keel" | "fit-out";
}

/** The days of one ship. `partOf` names the part in each slot. */
export function buildSpan(total: number, keel: readonly string[], fit: readonly { slot: string; after: string }[], partOf: (slot: string) => string): BuildStep[] {
  if (keel.length === 0) throw new Error("a build needs a keel");
  const base = Math.floor(total / keel.length);
  if (base < 1) throw new Error("the span is shorter than the keel");
  const steps: BuildStep[] = [];
  let start = 0;
  for (const [i, slot] of keel.entries()) {
    const days = i === keel.length - 1 ? total - start : base;
    steps.push({ slot, part: partOf(slot), start, days, group: "keel" });
    start += days;
  }
  const endOf = (slot: string): number => {
    const step = steps.find((one) => one.slot === slot);
    if (!step) throw new Error(`nothing to mount on: ${slot}`);
    return step.start + step.days;
  };
  for (const one of fit) {
    const at = endOf(one.after);
    if (at >= total) throw new Error(`${one.slot} starts after the ship flies`);
    steps.push({ slot: one.slot, part: partOf(one.slot), start: at, days: total - at, group: "fit-out" });
  }
  return steps;
}
