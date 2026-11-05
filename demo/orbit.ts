// How far above a body the camera sits. Low orbit is the default picture. Further steps open that picture out to the whole disc. Pure: no DOM.

export type OrbitName = "low" | "near" | "high" | "geo" | "far" | "moon";

export interface OrbitStep {
  km: number;
  name: OrbitName;
}

/** The Earth's steps, in kilometres. Low orbit is the ISS height. The last is the Moon's distance from the Earth's centre. */
export const EARTH_ORBIT: readonly OrbitStep[] = [
  { km: 400, name: "low" },
  { km: 1000, name: "near" },
  { km: 10000, name: "high" },
  { km: 36000, name: "geo" },
  { km: 100000, name: "far" },
  { km: 384400, name: "moon" },
];

const EARTH_RADIUS_KM = 6371;

export const roundKm = (n: number): number => {
  const step = n >= 100_000 ? 10_000 : n >= 10_000 ? 1_000 : n >= 1_000 ? 100 : 10;
  return Math.max(step, Math.round(n / step) * step);
};

/**
 * Steps for a body. Earth uses the named distances. Any other body scales those distances by its radius, and adds its farthest moon when it has one.
 * @param radiusKm The body's radius.
 * @param moonKm The farthest moon's distance from the centre, or null.
 * @param earth True for the Earth, which keeps the named steps.
 */
export const orbitStepsFor = (radiusKm: number, moonKm: number | null, earth = false): OrbitStep[] => {
  if (earth) return EARTH_ORBIT.map((step) => ({ ...step }));
  const scale = radiusKm > 0 ? radiusKm / EARTH_RADIUS_KM : 1;
  const named = EARTH_ORBIT.filter((step) => step.name !== "moon").map((step) => ({ km: roundKm(step.km * scale), name: step.name }));
  if (moonKm && moonKm > named[0].km * 1.5) {
    const km = roundKm(moonKm);
    const clash = named.findIndex((step) => step.km === km);
    if (clash >= 0) named.splice(clash, 1);
    named.push({ km, name: "moon" });
  }
  const seen = new Set<number>();
  return named.filter((step) => (seen.has(step.km) ? false : (seen.add(step.km), true))).sort((a, b) => a.km - b.km);
};

/** The step nearest `km`. */
export const nearestOrbit = (km: number, steps: readonly OrbitStep[]): number => {
  if (steps.length === 0) return km;
  return steps.reduce((best, step) => (Math.abs(step.km - km) < Math.abs(best - km) ? step.km : best), steps[0].km);
};

/** `10000km` from the address, or null when the address does not say. */
export const parseOrbitKm = (raw: string | null): number | null => {
  if (!raw) return null;
  const match = /^(\d+)km$/.exec(raw.trim());
  return match ? Number(match[1]) : null;
};

/** The address value. Low orbit, the first step, is left off the address. */
export const orbitQuery = (km: number, steps: readonly OrbitStep[]): string | null => (steps.length === 0 || km === steps[0]?.km ? null : `${km}km`);

/**
 * 0 is low orbit, the horizon picture. 1 is the farthest step, the whole disc. The steps between are spaced by their distance, so a small climb reads.
 */
export const orbitOpen = (km: number, steps: readonly OrbitStep[]): number => {
  const low = steps[0]?.km ?? km;
  const far = steps[steps.length - 1]?.km ?? km;
  if (!(km > 0) || !(far > low)) return 0;
  return Math.min(1, Math.max(0, (Math.log(km) - Math.log(low)) / (Math.log(far) - Math.log(low))));
};

/** Thousands grouped, so 10000 reads 10,000. */
export const groupKm = (km: number): string => String(km).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
