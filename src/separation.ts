// A planned separation: one module leaves, and the page says why. The viewer slides that module clear and looks at it. Pure: no three.js and no DOM.

/** Which module leaves this rocket, and the word key for the reason. */
export interface Separation {
  slot: string;
  reason: string;
}

/** The separation this rocket shows, or null when it has none. */
export function separationOf(rocket: string): Separation | null {
  if (rocket === "fleet-ship-03" || rocket === "fleet-ship-ariake") return { slot: "command", reason: "leaveReason_command" };
  return null;
}
