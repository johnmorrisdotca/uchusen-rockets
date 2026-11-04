// Planning a trip: which dates a ballistic craft can leave on, the transfer and its burns for a real rocket, the flip-and-burn for a ship that burns all the way, and what each craft can and cannot do.
// The result is plain data (no closures), so a page can keep it, a test can read it and `stateAt` can draw any moment of it without having played the ones before. Pure.
import type { BodySource, Stop } from "./bodies.ts";
import { AU_KM, C, DAY_S, G0, GM_KM3_S2, PARKING_ALTITUDE_KM, PERIOD_DAYS } from "./constants.ts";
import type { BallisticCraft, CapacityKind, ContinuousCraft, Craft, Quantity } from "./crafts.ts";
import { accelerating, circularSpeed, escapeBurn, flipAndBurn, hohmann, transferPoint, wrapPi } from "./physics.ts";

/** The kinds of phase a trip is made of: the countdown, the climb, the burns, the coast, the turn round, the braking and the arrival. */
export type PhaseId = "preheat" | "ignition" | "ascent" | "burn" | "coast" | "flip" | "brake" | "flyby" | "accelerate" | "decelerate" | "arrival";

/**
 * One stretch of a trip: its length in mission seconds (from lift-off, which is 0) and how long it takes on the screen at normal speed.
 *
 * @example
 * ```ts
 * import type { Phase } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const coast: Phase = { id: "coast", startS: 1_050, endS: 430_000, screenS: 22 };
 * console.log(coast.endS - coast.startS);
 * ```
 */
export interface Phase {
  id: PhaseId;
  startS: number;
  endS: number;
  screenS: number;
}

/** How a craft stands on a trip: rated, rated at least, fine, not rated, flyby only, or cannot. */
export type VerdictLevel = "rated" | "at-least" | "ok" | "not-rated" | "flyby" | "cannot";

/**
 * What a craft can do on a trip, in one plain line, with the lines behind it.
 *
 * @example
 * ```ts
 * import type { Verdict } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const verdict: Verdict = { level: "cannot", line: "Not enough fuel.", because: [], playable: false };
 * console.log(verdict.line, verdict.playable);
 * ```
 */
export interface Verdict {
  level: VerdictLevel;
  /** The one line shown beside the picker. */
  line: string;
  /** More lines, each a fact the verdict rests on. */
  because: string[];
  /** Whether Play is offered. */
  playable: boolean;
}

/** A place or a speed as x, y and z. */
export type Vec3 = readonly [number, number, number];

/**
 * A trip, planned: when it leaves, its phases, its verdict, its distances, its speed changes and what is true of the craft at the peak. Plain data, with no function in it.
 *
 * @example
 * ```ts
 * import type { Trip } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const describe = (trip: Trip) => `${trip.from} to ${trip.to}: ${trip.verdict.line}`;
 * console.log(typeof describe);
 * ```
 */
export interface Trip {
  from: string;
  to: string;
  craftId: string;
  drive: "ballistic" | "continuous";
  /** What the positions are measured from: the Sun, or the Earth for a trip to the Moon. */
  frame: "sun" | "earth";
  /** When the departure burn (or the first burn of a ship that burns all the way) begins, milliseconds since 1970. */
  departMs: number;
  /** When lift-off is, seconds before `departMs` (0 for a ship that starts in orbit). */
  liftoffBeforeS: number;
  phases: Phase[];
  totalS: number;
  verdict: Verdict;
  /** Names of the figures in this plan that are estimates, not sources. */
  estimated: string[];
  /** The straight line from the start to the end at departure, km. */
  straightKm: number;
  /** The length of the path flown, km. */
  pathKm: number;
  /** Speed changes, m/s. */
  dv: { departure: number; arrival: number; total: number };
  /** The greatest acceleration felt, g. */
  peakG: number;
  /** The greatest speed, m/s, and the Lorentz factor then. */
  peakSpeed: number;
  peakGamma: number;
  /** Time on board and in the frame of the two ends, seconds, from lift-off. */
  shipS: number;
  frameS: number;
  /** The propellant a ship that burns all the way uses, tonnes, and carries. */
  propellantUsedT?: number;
  propellantCarriedT?: number;
  ballistic?: {
    mu: number;
    r1: number;
    r2: number;
    theta0: number;
    transitS: number;
    parkKm: number;
    parkSpeed: number;
    burnEndSpeed: number;
    captureKm: number;
    captureSpeedIn: number;
    captureSpeedOut: number;
    burnS: number;
    brakeS: number;
    flipS: number;
    ascentS: number;
    vInfDeparture: number;
    vInfArrival: number;
    /** Cumulative path length at equal steps of the transit, km. */
    arc: number[];
    /** Where the departure and the destination body are in the frame, km, and the destination at arrival. */
    c3: number;
  };
  continuous?: {
    from: Vec3;
    to: Vec3;
    a: number;
    burnS: number;
    flipS: number;
    peakRapidity: number;
    blockedBySun: boolean;
  };
}

const SCREEN = { preheat: 6, ignition: 3, ascent: 7, burn: 6, coast: 22, flip: 4, brake: 7, accelerate: 22, decelerate: 22, arrival: 3 } as const;
const ARRIVAL_S = 5;

const stopOf = (source: BodySource, id: string): Stop => {
  const stop = source.stops.find((one) => one.id === id);
  if (!stop) throw new Error(`No such place: ${id}`);
  return stop;
};
const muOf = (source: BodySource, id: string): number => stopOf(source, id).muKm3s2 ?? GM_KM3_S2[id] ?? NaN;
const periodOf = (source: BodySource, id: string): number => stopOf(source, id).periodDays ?? PERIOD_DAYS[id] ?? NaN;

/** A place's position in a frame, km: round the Sun for a planet, round the Earth for the Moon (and the Earth's own is the origin of the Earth's frame). */
export function positionKm(source: BodySource, id: string, ms: number, frame: "sun" | "earth"): Vec3 {
  if (frame === "earth") {
    if (id === "earth") return [0, 0, 0];
    return source.offsetKm(id, ms);
  }
  const au = source.positionAu(id, ms);
  return [au[0] * AU_KM, au[1] * AU_KM, au[2] * AU_KM];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const flat = (a: Vec3): number => Math.hypot(a[0], a[1]);
const lon = (a: Vec3): number => Math.atan2(a[1], a[0]);

const quantity = (q: Quantity | undefined, name: string, estimated: string[]): number | null => {
  if (!q) return null;
  if (q.estimate !== undefined) estimated.push(name);
  return q.value;
};

/** Parking orbit radius round a body, km. */
const parkRadius = (source: BodySource, id: string): number => stopOf(source, id).radiusKm + (id === "earth" ? PARKING_ALTITUDE_KM.earth : id === "moon" ? PARKING_ALTITUDE_KM.moon : PARKING_ALTITUDE_KM.other);

interface Transfer {
  r1: number;
  r2: number;
  seconds: number;
  theta0: number;
  f: number;
  dv1: number;
  dv2: number;
}

/** The transfer from a planet to another that leaves at a time: the radii at the two ends, the flight time (two passes, since the end moves), and how far short of 180 degrees the arrival is. */
function transferAt(source: BodySource, from: string, to: string, t0: number): Transfer {
  const p1 = positionKm(source, from, t0, "sun");
  const r1 = flat(p1);
  const mu = GM_KM3_S2.sun!;
  let p2 = positionKm(source, to, t0, "sun");
  let seconds = hohmann(mu, r1, flat(p2)).seconds;
  for (let i = 0; i < 4; i += 1) {
    p2 = positionKm(source, to, t0 + seconds * 1000, "sun");
    seconds = hohmann(mu, r1, flat(p2)).seconds;
  }
  const r2 = flat(p2);
  const h = hohmann(mu, r1, r2);
  return { r1, r2, seconds, theta0: lon(p1), f: wrapPi(lon(p2) - lon(p1) - Math.PI), dv1: h.dv1, dv2: h.dv2 };
}

/**
 * A day a ballistic craft can leave on, with the flight time and the two speed changes of the Sun's frame.
 *
 * @example
 * ```ts
 * import type { Window } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const next: Window = { dateMs: Date.UTC(2026, 10, 4), days: 265, dv1: 3.2, dv2: 2.9 };
 * console.log(new Date(next.dateMs).toISOString());
 * ```
 */
export interface Window {
  dateMs: number;
  /** The flight time, days. */
  days: number;
  /** The heliocentric speed changes, km/s. */
  dv1: number;
  dv2: number;
}

/**
 * The next dates a craft can leave one planet for another on a Hohmann transfer: the days on which the destination will be where the craft arrives. Found by scanning day by day and bisecting each crossing, from the planets' real positions.
 * @param source Where the planets are.
 * @param from The starting planet's id.
 * @param to The destination planet's id.
 * @param afterMs The earliest date, milliseconds since 1970.
 * @param count How many windows.
 * @returns The windows, soonest first.
 * @example
 * ```ts no-run
 * import { windows, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const source: BodySource;
 * console.log(windows(source, "earth", "mars", Date.UTC(2026, 10, 4), 2).map((one) => new Date(one.dateMs).toISOString().slice(0, 10)));
 * ```
 */
export function windows(source: BodySource, from: string, to: string, afterMs: number, count: number): Window[] {
  const synodic = 1 / Math.abs(1 / periodOf(source, from) - 1 / periodOf(source, to));
  const end = afterMs + (count + 1) * synodic * DAY_S * 1000;
  const found: Window[] = [];
  let t = afterMs;
  let previous = transferAt(source, from, to, t);
  while (t < end && found.length < count) {
    const next = t + DAY_S * 1000;
    const current = transferAt(source, from, to, next);
    if (previous.f * current.f < 0 && Math.abs(previous.f) < 1.5 && Math.abs(current.f) < 1.5) {
      let lo = t;
      let hi = next;
      let flo = previous.f;
      for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        const fm = transferAt(source, from, to, mid).f;
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      const at = transferAt(source, from, to, hi);
      if (hi >= afterMs) found.push({ dateMs: Math.round(hi / 60_000) * 60_000, days: at.seconds / DAY_S, dv1: at.dv1, dv2: at.dv2 });
    }
    previous = current;
    t = next;
  }
  return found;
}

/** The energy (km^2/s^2, the speed squared at infinity) each kind of payload figure is for. Lower is easier. */
export function c3Of(source: BodySource, kind: CapacityKind): number {
  const mu = muOf(source, "earth");
  const r = parkRadius(source, "earth");
  if (kind === "leo") return -mu / r;
  if (kind === "gto") return -mu / ((r + 42_164) / 2);
  const moon = 384_400;
  const h = hohmann(mu, r, moon);
  if (kind === "tli") return (circularSpeed(mu, r) + h.dv1) ** 2 - (2 * mu) / r;
  const sun = hohmann(GM_KM3_S2.sun!, AU_KM, 1.52371034 * AU_KM);
  return sun.dv1 ** 2;
}

const KIND_OF: Readonly<Record<string, CapacityKind>> = { moon: "tli", mars: "mars" };
const WORDS: Readonly<Record<CapacityKind, string>> = { leo: "low Earth orbit", gto: "geostationary transfer orbit", tli: "the Moon", mars: "Mars" };
const tonnes = (kg: number): string => `${(kg / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} t`;

/** What a ballistic craft can carry on a path of this energy: a published figure for it, or for a harder one (at least), or none. */
function capacityVerdict(source: BodySource, craft: BallisticCraft, to: string, c3: number): { level: "rated" | "at-least" | "not-rated"; kg?: number; line: string } {
  const kind = KIND_OF[to];
  const direct = kind ? craft.capacityKg[kind] : undefined;
  if (kind && direct) return { level: "rated", kg: direct.value, line: `Rated: ${tonnes(direct.value)} to ${WORDS[kind]}.` };
  let best: { kind: CapacityKind; kg: number; c3: number } | null = null;
  for (const [name, figure] of Object.entries(craft.capacityKg) as [CapacityKind, Quantity][]) {
    const energy = c3Of(source, name);
    if (energy >= c3 - 0.01 && (best === null || energy < best.c3)) best = { kind: name, kg: figure.value, c3: energy };
  }
  if (best && best.kind !== "leo" && best.kind !== "gto") return { level: "at-least", kg: best.kg, line: `Can do it: at least ${tonnes(best.kg)}, because it can send that much to ${WORDS[best.kind]}, which takes more energy.` };
  return { level: "not-rated", line: `Not rated: no published payload figure covers a trip to ${stopName(source, to)}.` };
}

const stopName = (source: BodySource, id: string): string => stopOf(source, id).name.en;

const phase = (id: PhaseId, startS: number, endS: number, screenS: number): Phase => ({ id, startS, endS, screenS });

const unavailable = (craft: Craft, from: string, to: string, departMs: number, line: string, because: string[]): Trip => ({
  from,
  to,
  craftId: craft.id,
  drive: craft.drive,
  frame: to === "moon" ? "earth" : "sun",
  departMs,
  liftoffBeforeS: 0,
  phases: [],
  totalS: 0,
  verdict: { level: "cannot", line, because, playable: false },
  estimated: [],
  straightKm: 0,
  pathKm: 0,
  dv: { departure: 0, arrival: 0, total: 0 },
  peakG: 0,
  peakSpeed: 0,
  peakGamma: 1,
  shipS: 0,
  frameS: 0,
});

/**
 * Plans a trip: the transfer or the flip and burn, the burns, the times, and what the craft can and cannot do. A craft that cannot make the trip comes back with a verdict that says why in one line and no phases.
 * @param source Where the places are.
 * @param craft The craft.
 * @param from The starting place's id.
 * @param to The destination's id.
 * @param departMs When the departure burn begins, milliseconds since 1970 (for a ballistic trip to a planet, one of `windows`).
 * @returns The planned trip.
 * @example
 * ```ts no-run
 * import { craftOf, planTrip, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const source: BodySource;
 * const trip = planTrip(source, craftOf("saturn-v")!, "earth", "moon", Date.UTC(2026, 10, 5));
 * console.log(trip.verdict.line, Math.round(trip.dv.departure));
 * ```
 */
export function planTrip(source: BodySource, craft: Craft, from: string, to: string, departMs: number): Trip {
  if (from === to) return unavailable(craft, from, to, departMs, "Pick two different places.", []);
  return craft.drive === "ballistic" ? planBallistic(source, craft, from, to, departMs) : planContinuous(source, craft, from, to, departMs);
}

function planBallistic(source: BodySource, craft: BallisticCraft, from: string, to: string, departMs: number): Trip {
  if (from !== "earth") return unavailable(craft, from, to, departMs, "Rockets in this version lift off from the Earth only.", ["A rocket's payload figures are for launches from the Earth."]);
  if (to === "sun") return unavailable(craft, from, to, departMs, "No transfer is planned to the Sun.", []);
  const estimated: string[] = [];
  const toMoon = to === "moon";
  const frame = toMoon ? "earth" : "sun";
  const muEarth = muOf(source, "earth");
  const rPark = parkRadius(source, "earth");
  const parkSpeed = circularSpeed(muEarth, rPark);
  let mu: number;
  let r1: number;
  let r2: number;
  let transitS: number;
  let theta0: number;
  let vInf1: number;
  let vInf2: number;
  let burnEndSpeed: number;
  let c3: number;
  let straightKm: number;
  if (toMoon) {
    mu = muEarth;
    r1 = rPark;
    transitS = 0;
    let moon = positionKm(source, "moon", departMs, "earth");
    r2 = flat(moon);
    for (let i = 0; i < 4; i += 1) {
      transitS = hohmann(mu, r1, r2).seconds;
      moon = positionKm(source, "moon", departMs + transitS * 1000, "earth");
      r2 = flat(moon);
    }
    transitS = hohmann(mu, r1, r2).seconds;
    theta0 = lon(moon) - Math.PI;
    const h = hohmann(mu, r1, r2);
    burnEndSpeed = parkSpeed + h.dv1;
    c3 = burnEndSpeed ** 2 - (2 * mu) / r1;
    vInf1 = Math.sqrt(Math.max(0, c3));
    vInf2 = Math.abs(circularSpeed(mu, r2) - Math.sqrt(mu * (2 / r2 - 2 / (r1 + r2))));
    straightKm = len(positionKm(source, "moon", departMs, "earth"));
  } else {
    mu = GM_KM3_S2.sun!;
    const t = transferAt(source, from, to, departMs);
    r1 = t.r1;
    r2 = t.r2;
    transitS = t.seconds;
    theta0 = t.theta0;
    vInf1 = t.dv1;
    vInf2 = t.dv2;
    burnEndSpeed = Math.sqrt(vInf1 ** 2 + (2 * muEarth) / rPark);
    c3 = vInf1 ** 2;
    straightKm = len(sub(positionKm(source, to, departMs, "sun"), positionKm(source, "earth", departMs, "sun")));
  }
  const dv1 = burnEndSpeed - parkSpeed;
  const captureKm = parkRadius(source, to);
  const muTo = muOf(source, to);
  const captureSpeedIn = Math.sqrt(vInf2 ** 2 + (2 * muTo) / captureKm);
  const captureSpeedOut = circularSpeed(muTo, captureKm);
  const dv2 = escapeBurn(muTo, captureKm, vInf2);

  const verdictCap = capacityVerdict(source, craft, to, c3);
  const payload = craft.payload;
  const thrust = quantity(payload.thrustN, "braking engine thrust", estimated);
  const mass = quantity(payload.massKg, "payload mass", estimated);
  const brakeG = thrust !== null && mass !== null ? thrust / mass / G0 : quantity(payload.brakeG, "braking acceleration", estimated) ?? 0.2;
  const dvAvailable = payload.dvMs?.value ?? null;
  const flyby = dvAvailable !== null && dvAvailable < dv2 * 1000;
  const ascentS = quantity(craft.ascentS, "time to orbit", estimated) ?? 540;
  let burnS = quantity(craft.departureBurnS, "departure burn length", estimated);
  if (burnS === null) {
    burnS = (dv1 * 1000) / (0.6 * G0);
    estimated.push("departure burn length");
  }
  const flipS = quantity(craft.flipS, "turn-round time", estimated) ?? 120;
  const brakeS = flyby ? 0 : (dv2 * 1000) / (brakeG * G0);

  const arcSteps = 360;
  const arc = [0];
  let last = transferPoint(mu, r1, r2, theta0, 0);
  for (let i = 1; i <= arcSteps; i += 1) {
    const p = transferPoint(mu, r1, r2, theta0, (transitS * i) / arcSteps);
    arc.push(arc[i - 1]! + Math.hypot(p.r * Math.cos(p.theta) - last.r * Math.cos(last.theta), p.r * Math.sin(p.theta) - last.r * Math.sin(last.theta)));
    last = p;
  }
  const pathKm = arc[arcSteps]!;

  const t = { ascent: 0, burn: ascentS, coast: ascentS + burnS, flip: ascentS + burnS + transitS - flipS, brake: ascentS + burnS + transitS };
  const phases: Phase[] = [
    phase("preheat", -13, -3, SCREEN.preheat),
    phase("ignition", -3, 0, SCREEN.ignition),
    phase("ascent", t.ascent, t.burn, SCREEN.ascent),
    phase("burn", t.burn, t.coast, SCREEN.burn),
    phase("coast", t.coast, t.flip, SCREEN.coast),
    phase("flip", t.flip, t.brake, SCREEN.flip),
  ];
  let end = t.brake;
  if (!flyby) {
    phases.push(phase("brake", end, end + brakeS, SCREEN.brake));
    end += brakeS;
  } else phases.push(phase("flyby", end, end + 60, SCREEN.brake));
  if (flyby) end += 60;
  phases.push(phase("arrival", end, end + ARRIVAL_S, SCREEN.arrival));
  end += ARRIVAL_S;

  const peakSpeed = Math.max(burnEndSpeed, captureSpeedIn) * 1000;
  const peakG = Math.max((dv1 * 1000) / burnS / G0, flyby ? 0 : brakeG);
  let verdict: Verdict;
  const because: string[] = [verdictCap.line];
  if (flyby) {
    because.push(`${payload.name} can change its speed by ${Math.round(dvAvailable!).toLocaleString("en-US")} m/s; stopping at ${stopName(source, to)} needs ${Math.round(dv2 * 1000).toLocaleString("en-US")} m/s.`);
    verdict = { level: "flyby", line: `Flyby only: not enough fuel on board to stop at ${stopName(source, to)} (${Math.round(dv2 * 1000).toLocaleString("en-US")} m/s needed, ${Math.round(dvAvailable!).toLocaleString("en-US")} m/s on board).`, because, playable: true };
  } else {
    verdict = { level: verdictCap.level, line: verdictCap.line, because, playable: true };
    if (verdictCap.level === "not-rated") because.push("The burns below are worked from the physics; nothing says this craft can lift them.");
  }
  if (estimated.length > 0) because.push(`Estimated, not from a source: ${[...new Set(estimated)].join(", ")}.`);

  return {
    from,
    to,
    craftId: craft.id,
    drive: "ballistic",
    frame,
    departMs,
    liftoffBeforeS: ascentS,
    phases,
    totalS: end,
    verdict,
    estimated: [...new Set(estimated)],
    straightKm,
    pathKm,
    dv: { departure: dv1 * 1000, arrival: flyby ? 0 : dv2 * 1000, total: (dv1 + (flyby ? 0 : dv2)) * 1000 },
    peakG,
    peakSpeed,
    peakGamma: 1,
    shipS: end,
    frameS: end,
    ballistic: { mu, r1, r2, theta0, transitS, parkKm: rPark, parkSpeed, burnEndSpeed, captureKm, captureSpeedIn, captureSpeedOut, burnS, brakeS, flipS, ascentS, vInfDeparture: vInf1, vInfArrival: vInf2, arc, c3 },
  };
}

function planContinuous(source: BodySource, craft: ContinuousCraft, from: string, to: string, departMs: number): Trip {
  const estimated: string[] = [];
  const frame = from === "moon" || to === "moon" ? "earth" : "sun";
  if ((from === "moon" || to === "moon") && from !== "earth" && to !== "earth") return unavailable(craft, from, to, departMs, "The Moon can be reached from the Earth only, for now.", []);
  const a = craft.g.value * G0;
  const flipS = quantity(craft.flipS, "turn-round time", estimated) ?? 600;
  const startAt = positionKm(source, from, departMs, frame);
  let seconds = 2 * Math.sqrt((len(sub(positionKm(source, to, departMs, frame), startAt)) * 1000) / a);
  let from3 = startAt;
  let to3 = positionKm(source, to, departMs, frame);
  let distanceM = 0;
  let plan = flipAndBurn(1, a, 0);
  for (let i = 0; i < 6; i += 1) {
    to3 = positionKm(source, to, departMs + seconds * 1000, frame);
    const line = sub(to3, startAt);
    const d = len(line);
    const unit: Vec3 = [line[0] / d, line[1] / d, line[2] / d];
    const startRadius = parkRadius(source, from);
    const endRadius = parkRadius(source, to);
    from3 = [startAt[0] + unit[0] * startRadius, startAt[1] + unit[1] * startRadius, startAt[2] + unit[2] * startRadius];
    const arrive: Vec3 = [to3[0] - unit[0] * endRadius, to3[1] - unit[1] * endRadius, to3[2] - unit[2] * endRadius];
    to3 = arrive;
    distanceM = len(sub(arrive, from3)) * 1000;
    plan = flipAndBurn(distanceM, a, flipS);
    seconds = plan.frameSeconds;
  }
  // The straight path must stay clear of the Sun.
  let blockedBySun = false;
  if (frame === "sun") {
    const ab = sub(to3, from3);
    const t = Math.max(0, Math.min(1, -(from3[0] * ab[0] + from3[1] * ab[1] + from3[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
    const closest = len([from3[0] + ab[0] * t, from3[1] + ab[1] * t, from3[2] + ab[2] * t]);
    blockedBySun = closest < 0.1 * AU_KM;
  }
  const fullT = craft.dryT.value + craft.payloadT.value + craft.propellantT.value;
  const ratio = Math.exp((2 * plan.rapidity) / craft.exhaustOfC.value);
  const usedT = fullT - fullT / ratio;
  const carried = craft.propellantT.value;
  const tb = plan.burnSeconds;
  const phases: Phase[] = [
    phase("preheat", -13, -3, SCREEN.preheat),
    phase("ignition", -3, 0, SCREEN.ignition),
    phase("accelerate", 0, tb, SCREEN.accelerate),
    phase("flip", tb, tb + flipS, SCREEN.flip),
    phase("decelerate", tb + flipS, plan.frameSeconds, SCREEN.decelerate),
    phase("arrival", plan.frameSeconds, plan.frameSeconds + ARRIVAL_S, SCREEN.arrival),
  ];
  const because: string[] = [`Needs ${Math.round(usedT).toLocaleString("en-US")} t of propellant; the ship carries ${Math.round(carried).toLocaleString("en-US")} t.`];
  let verdict: Verdict;
  if (blockedBySun) verdict = { level: "cannot", line: `The straight path passes too close to the Sun: pick another date.`, because, playable: false };
  else if (usedT > carried) verdict = { level: "cannot", line: `Not enough fuel: this trip needs ${Math.round(usedT).toLocaleString("en-US")} t of propellant and the ship carries ${Math.round(carried).toLocaleString("en-US")} t.`, because, playable: false };
  else verdict = { level: "ok", line: `Can do it: ${(usedT / carried * 100) >= 1 ? (usedT / carried * 100).toFixed(0) : (usedT / carried * 100).toPrecision(2)} per cent of the propellant, at ${craft.g.value} g.`, because, playable: true };
  if (estimated.length > 0) because.push(`Estimated, not from a source: ${[...new Set(estimated)].join(", ")}.`);
  const peak = accelerating(a, tb);
  return {
    from,
    to,
    craftId: craft.id,
    drive: "continuous",
    frame,
    departMs,
    liftoffBeforeS: 0,
    phases,
    totalS: plan.frameSeconds + ARRIVAL_S,
    verdict,
    estimated: [...new Set(estimated)],
    straightKm: len(sub(positionKm(source, to, departMs, frame), startAt)),
    pathKm: distanceM / 1000,
    dv: { departure: C * plan.rapidity, arrival: C * plan.rapidity, total: 2 * C * plan.rapidity },
    peakG: craft.g.value,
    peakSpeed: peak.v,
    peakGamma: peak.gamma,
    shipS: plan.properSeconds,
    frameS: plan.frameSeconds,
    propellantUsedT: usedT,
    propellantCarriedT: carried,
    continuous: { from: from3, to: to3, a, burnS: tb, flipS, peakRapidity: plan.rapidity, blockedBySun },
  };
}

/**
 * The departure date, for a craft that burns all the way, with the shortest trip in the next two years.
 * @param source Where the places are.
 * @param craft The craft.
 * @param from The starting place's id.
 * @param to The destination's id.
 * @param afterMs The earliest date.
 * @returns The date, milliseconds since 1970.
 * @example
 * ```ts no-run
 * import { bestDate, craftOf, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const source: BodySource;
 * console.log(new Date(bestDate(source, craftOf("kaminari")!, "earth", "mars", Date.UTC(2026, 10, 4))).toISOString());
 * ```
 */
export function bestDate(source: BodySource, craft: Craft, from: string, to: string, afterMs: number): number {
  let best = afterMs;
  let bestS = Infinity;
  for (let day = 0; day <= 800; day += 4) {
    const at = afterMs + day * DAY_S * 1000;
    const trip = planTrip(source, craft, from, to, at);
    if (trip.verdict.playable && trip.frameS < bestS) {
      bestS = trip.frameS;
      best = at;
    }
  }
  return best;
}
