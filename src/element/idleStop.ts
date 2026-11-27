// A still 3D view stops drawing after the last touch. The wait is 90 seconds unless the page names another.

/** The wait when a page does not set `idle-stop`. */
export const IDLE_STOP_MS = 90_000;

/** Seconds from the `idle-stop` attribute. A blank or a value that is not a positive number means the page did not choose. */
export function idleStopSeconds(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

/** Milliseconds the view keeps drawing after the last touch. */
export function idleStopMs(seconds: number | undefined): number {
  return seconds === undefined ? IDLE_STOP_MS : seconds * 1000;
}
