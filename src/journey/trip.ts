// Planning a trip: which dates a ballistic craft can leave on, the transfer and its burns for a real rocket, the flip-and-burn for a ship that burns all the way, and what each craft can and cannot do.
// The result is plain data (no closures), so a page can keep it, a test can read it and `stateAt` can draw any moment of it without having played the ones before. Pure.
import type { BodySource, Stop } from "./bodies.ts";
import { AU_KM, C, DAY_S, G0, GM_KM3_S2, PARKING_ALTITUDE_KM, PERIOD_DAYS } from "./constants.ts";
import type { BallisticCraft, CapacityKind, ContinuousCraft, Craft, Quantity } from "./crafts.ts";
import { swingAt, swingPoint, type Swing } from "./assist.ts";
import { ENTRY_ALTITUDE_KM, atmosphereReturn, conicPoint, leaveForPlanet, type Conic } from "./lunar.ts";
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
  /** The propellant of the trip: tonnes used (and carried, where it is known), or null with the reason no figure can be given. */
  fuel: { usedT: number | null; carriedT: number | null; note: string };
  /** Initial mass over mass after the burns the rocket equation was applied to. Null when no exhaust speed is known, so no propellant figure is invented. */
  massRatio: number | null;
  /** Escape speed from the surface and from the parking orbit of the body the rocket leaves, kilometres a second. Absent for a ship that burns all the way. */
  escape?: { surfaceKmS: number; parkingKmS: number };
  /** A swing past Jupiter on the way out, and how much speed change it saves against the direct Hohmann between the same distances. */
  assist?: { by: "jupiter"; savedMs: number; radii: number };
  /** What the craft carries to the end of this trip: kilograms (at least, where only a harder trip is rated), or null with the reason. */
  payload: { kg: number | null; atLeast: boolean; note: string };
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
    /** Set when the coast is not a Hohmann half-ellipse: the three-day return from the Moon. */
    conic?: Conic;
    /** The craft was already in orbit. The burn's speeds are measured from the start, and there is no ascent. */
    fromOrbit?: boolean;
    /** The coast meets an atmosphere, so there is no braking burn. */
    entry?: boolean;
    /** Set when the coast swings past Jupiter instead of flying one Hohmann ellipse. */
    swing?: Swing;
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

/** A place's position in a frame, km. A moon is its offset from its planet; in the Sun's frame that planet's place is added. The Earth's own place is the origin of the Earth's frame. Past the solar system is a fixed point 120 AU from the Sun, about the heliopause. */
export function positionKm(source: BodySource, id: string, ms: number, frame: "sun" | "earth"): Vec3 {
  if (id === "beyond") {
    const far: Vec3 = [120 * AU_KM, 0, 0];
    if (frame === "sun") return far;
    const earth = source.positionAu("earth", ms);
    return [far[0] - earth[0] * AU_KM, far[1] - earth[1] * AU_KM, far[2] - earth[2] * AU_KM];
  }
  const stop = source.stops.find((one) => one.id === id);
  if (stop?.kind === "moon" && stop.parent) {
    if (frame === "earth" && stop.parent === "earth") return source.offsetKm(id, ms);
    const parent = source.positionAu(stop.parent, ms);
    const off = source.offsetKm(id, ms);
    return [parent[0] * AU_KM + off[0], parent[1] * AU_KM + off[1], parent[2] * AU_KM + off[2]];
  }
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
const escapeSpeed = (mu: number, rKm: number): number => circularSpeed(mu, rKm) * Math.SQRT2;

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
  fuel: { usedT: null, carriedT: null, note: "No trip." },
  massRatio: null,
  payload: { kg: null, atLeast: false, note: "No trip." },
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
 * @param g Proper acceleration in g for a ship that burns all the way. Omitted, the ship flies at its rated acceleration. A ballistic craft ignores it.
 * @param via `"jupiter"` asks a rocket leaving the Earth for a swing past Jupiter on the way to a planet beyond it. Anything else, and any other craft, flies the direct trip.
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
export function planTrip(source: BodySource, craft: Craft, from: string, to: string, departMs: number, g?: number, via?: "jupiter"): Trip {
  if (from === to) return unavailable(craft, from, to, departMs, "Pick two different places.", []);
  if (to === "beyond" && craft.drive === "ballistic") return pastTheSolarSystem(source, craft, from, departMs);
  return craft.drive === "ballistic" ? planBallistic(source, craft, from, to, departMs, via) : planContinuous(source, craft, from, to, departMs, g);
}

/** The burn from an Earth parking orbit onto a path that escapes the Sun, metres a second. The excess speed is the Sun's escape speed at the Earth, minus the Earth's own orbital speed. */
function solarEscapeMs(source: BodySource): number {
  const vCirc = circularSpeed(GM_KM3_S2.sun!, AU_KM);
  const vInf = vCirc * (Math.SQRT2 - 1);
  return escapeBurn(muOf(source, "earth"), parkRadius(source, "earth"), vInf) * 1000;
}

function pastTheSolarSystem(source: BodySource, craft: BallisticCraft, from: string, departMs: number): Trip {
  if (from !== "earth") {
    return unavailable(craft, from, "beyond", departMs, "A chemical rocket aimed past the solar system leaves from the Earth.", [
      "The figure is the burn from an Earth parking orbit onto a path that escapes the Sun.",
    ]);
  }
  const dvMs = solarEscapeMs(source);
  const rounded = Math.round(dvMs).toLocaleString("en-US");
  const trip = unavailable(
    craft,
    from,
    "beyond",
    departMs,
    `Cannot leave the solar system: the departure from a parking orbit needs ${rounded} m/s, and this rocket has no published burn that large.`,
    ["A fuel load is not invented for a burn this rocket is not rated to fly."],
  );
  trip.dv = { departure: dvMs, arrival: 0, total: dvMs };
  trip.fuel = { usedT: null, carriedT: null, note: "A fuel load is not invented for a burn this rocket is not rated to fly." };
  return trip;
}

/** Apollo 11's trans-Earth injection, from the mission report's Table 7-II: 3,279 ft/s in 151.4 seconds. */
const APOLLO_11_TEI = { feetPerSecond: 3279, burnS: 151.4 } as const;

/**
 * A ballistic trip that leaves the Moon: home to the Earth's atmosphere in three days, or on to another planet with the Moon's orbital speed taken as helping. The craft is already in low lunar orbit, so there is no ascent and the drawing is the payload.
 */
function planMoon(source: BodySource, craft: BallisticCraft, to: string, departMs: number): Trip {
  if (to === "sun") return unavailable(craft, "moon", to, departMs, "No transfer is planned to the Sun.", []);
  const estimated: string[] = [];
  const home = to === "earth";
  const muEarth = muOf(source, "earth");
  const muMoon = muOf(source, "moon");
  const rLlo = parkRadius(source, "moon");
  const moonNow = positionKm(source, "moon", departMs, "earth");
  const rMoon = flat(moonNow);
  const payload = craft.payload;
  const thrust = payload.thrustN?.value ?? null;
  const mass = payload.massKg?.value ?? null;
  const noEngine = thrust === null || thrust <= 0;
  const dvAvailable = payload.dvMs?.value ?? null;
  const toName = stopName(source, to);

  let mu: number;
  let r1: number;
  let r2: number;
  let transitS: number;
  let theta0: number;
  let parkSpeed: number;
  let burnEndSpeed: number;
  let dvDep: number;
  let dvArr: number;
  let captureKm: number;
  let captureSpeedIn: number;
  let captureSpeedOut: number;
  let vInf1: number;
  let vInf2: number;
  let straightKm: number;
  let conic: Conic | undefined;
  let entry = false;
  if (home) {
    const back = atmosphereReturn(muEarth, muMoon, rMoon, rLlo, stopOf(source, "earth").radiusKm + ENTRY_ALTITUDE_KM, lon(moonNow));
    mu = muEarth;
    r1 = rMoon;
    r2 = stopOf(source, "earth").radiusKm + ENTRY_ALTITUDE_KM;
    transitS = back.transitS;
    theta0 = lon(moonNow);
    parkSpeed = back.parkSpeed;
    burnEndSpeed = back.burnEndSpeed;
    dvDep = back.dvKmS;
    dvArr = 0;
    captureKm = r2;
    captureSpeedIn = back.entrySpeed;
    captureSpeedOut = back.entrySpeed;
    vInf1 = back.vInfKmS;
    vInf2 = 0;
    conic = back.conic;
    entry = true;
    const start = conicPoint(mu, conic, 0);
    const end = conicPoint(mu, conic, transitS);
    straightKm = Math.hypot(end.x - start.x, end.y - start.y);
  } else {
    estimated.push("the Moon's orbital speed helping the departure");
    mu = GM_KM3_S2.sun!;
    const t = transferAt(source, "moon", to, departMs);
    const leave = leaveForPlanet(muEarth, muMoon, rMoon, rLlo, t.dv1);
    r1 = t.r1;
    r2 = t.r2;
    transitS = t.seconds;
    theta0 = t.theta0;
    parkSpeed = leave.parkSpeed;
    burnEndSpeed = leave.burnEndSpeed;
    dvDep = leave.dvKmS;
    captureKm = parkRadius(source, to);
    const muTo = muOf(source, to);
    vInf1 = leave.vInfMoon;
    vInf2 = t.dv2;
    dvArr = escapeBurn(muTo, captureKm, vInf2);
    captureSpeedIn = Math.sqrt(vInf2 ** 2 + (2 * muTo) / captureKm);
    captureSpeedOut = circularSpeed(muTo, captureKm);
    straightKm = len(sub(positionKm(source, to, departMs, "sun"), positionKm(source, "moon", departMs, "sun")));
  }
  const depMs = dvDep * 1000;
  const arrMs = dvArr * 1000;
  if (noEngine) return unavailable(craft, "moon", to, departMs, "Cannot leave the Moon: no engine is specified for the payload.", ["The published payload figures are for a launch from the Earth."]);
  if (dvAvailable !== null && dvAvailable < depMs) {
    return unavailable(craft, "moon", to, departMs, `Cannot leave the Moon: the departure needs ${Math.round(depMs).toLocaleString("en-US")} m/s and ${payload.name} can change its speed by ${Math.round(dvAvailable).toLocaleString("en-US")} m/s.`, []);
  }
  const flyby = !home && dvAvailable !== null && dvAvailable < depMs + arrMs;
  const apollo = home && craft.id === "saturn-v";
  let burnS: number;
  if (apollo) burnS = APOLLO_11_TEI.burnS;
  else if (thrust !== null && mass !== null) {
    burnS = depMs / (thrust / mass);
    estimated.push("departure burn length");
  } else {
    burnS = depMs / (0.6 * G0);
    estimated.push("departure burn length");
  }
  const brakeG = thrust !== null && mass !== null ? thrust / mass / G0 : null;
  const brakeS = flyby || home || brakeG === null ? 0 : arrMs / (brakeG * G0);

  const arcSteps = 360;
  const pointAt = (t: number): { r: number; theta: number } => (conic ? conicPoint(mu, conic, t) : transferPoint(mu, r1, r2, theta0, t));
  const arc = [0];
  let last = pointAt(0);
  for (let i = 1; i <= arcSteps; i += 1) {
    const p = pointAt((transitS * i) / arcSteps);
    arc.push(arc[i - 1]! + Math.hypot(p.r * Math.cos(p.theta) - last.r * Math.cos(last.theta), p.r * Math.sin(p.theta) - last.r * Math.sin(last.theta)));
    last = p;
  }

  let end = burnS + transitS;
  const phases: Phase[] = [
    phase("preheat", -13, -3, SCREEN.preheat),
    phase("ignition", -3, 0, SCREEN.ignition),
    phase("burn", 0, burnS, SCREEN.burn),
    phase("coast", burnS, end, SCREEN.coast),
  ];
  if (!home && !flyby && brakeS > 0) {
    phases.push(phase("brake", end, end + brakeS, SCREEN.brake));
    end += brakeS;
  } else if (flyby) {
    phases.push(phase("flyby", end, end + 60, SCREEN.brake));
    end += 60;
  }
  phases.push(phase("arrival", end, end + ARRIVAL_S, SCREEN.arrival));
  end += ARRIVAL_S;

  const because: string[] = [];
  let verdict: Verdict;
  if (apollo) {
    const line = "Rated: the Apollo command and service module flew home from lunar orbit. Apollo 11's trans-Earth injection was 3,279 ft/s (Apollo 11 Mission Report).";
    because.push("The craft at the Moon is the command and service module, not the whole Saturn V.");
    because.push(`This plan's burn is ${Math.round(depMs).toLocaleString("en-US")} m/s and meets the atmosphere about three days later. The mission report's Table 7-II gives Apollo 11's burn as 3,279 ft/s in 151.4 seconds.`);
    verdict = { level: "rated", line, because, playable: true };
  } else if (home && craft.id === "sls") {
    const line = "Rated: Orion flew home on Artemis I, from a distant retrograde orbit, not this three-day return.";
    because.push(`This plan is a three-day return from low lunar orbit, a ${Math.round(depMs).toLocaleString("en-US")} m/s burn. Artemis I came home from a distant retrograde orbit, which is a different path.`);
    because.push(`Orion can change its speed by ${Math.round(dvAvailable ?? 0).toLocaleString("en-US")} m/s, which covers this burn.`);
    verdict = { level: "rated", line, because, playable: true };
  } else if (flyby) {
    const line = `Flyby only: not enough fuel on board to stop at ${toName} after leaving the Moon.`;
    because.push(`${payload.name} can change its speed by ${Math.round(dvAvailable!).toLocaleString("en-US")} m/s; leaving and then stopping needs ${Math.round(depMs + arrMs).toLocaleString("en-US")} m/s.`);
    verdict = { level: "flyby", line, because, playable: true };
  } else {
    const line = `Not rated: no published figure covers leaving the Moon for ${toName}.`;
    because.push("The burns below are worked from the physics; nothing says this craft can make them from the Moon.");
    verdict = { level: "not-rated", line, because, playable: true };
  }
  if (estimated.length > 0) because.push(`Estimated, not from a source: ${[...new Set(estimated)].join(", ")}.`);
  const carries = { kg: null, atLeast: false, note: home ? "The spacecraft is already in lunar orbit. The published tonnes are for a launch from the Earth." : `No published payload figure covers leaving the Moon for ${toName}.` };
  const fuel = { usedT: null, carriedT: null, note: apollo ? "Apollo 11's mission report gives the speed change and the burn length, not the propellant." : "No published propellant figure covers leaving the Moon." };
  return {
    from: "moon",
    to,
    craftId: craft.id,
    drive: "ballistic",
    frame: home ? "earth" : "sun",
    departMs,
    liftoffBeforeS: 0,
    phases,
    totalS: end,
    verdict,
    estimated: [...new Set(estimated)],
    straightKm,
    pathKm: arc[arcSteps]!,
    fuel,
    massRatio: null,
    escape: { surfaceKmS: escapeSpeed(muMoon, stopOf(source, "moon").radiusKm), parkingKmS: escapeSpeed(muMoon, rLlo) },
    payload: carries,
    dv: { departure: depMs, arrival: flyby || home ? 0 : arrMs, total: depMs + (flyby || home ? 0 : arrMs) },
    peakG: Math.max(depMs / burnS / G0, flyby || home || brakeG === null ? 0 : brakeG),
    peakSpeed: Math.max(burnEndSpeed, captureSpeedIn) * 1000,
    peakGamma: 1,
    shipS: end,
    frameS: end,
    ballistic: { mu, r1, r2, theta0, transitS, parkKm: rLlo, parkSpeed, burnEndSpeed, captureKm, captureSpeedIn, captureSpeedOut, burnS, brakeS, flipS: 0, ascentS: 0, vInfDeparture: vInf1, vInfArrival: vInf2, arc, c3: vInf1 ** 2, ...(conic ? { conic } : {}), fromOrbit: true, entry },
  };
}

function planBallistic(source: BodySource, craft: BallisticCraft, from: string, to: string, departMs: number, via?: "jupiter"): Trip {
  if (from === "moon") return planMoon(source, craft, to, departMs);
  if (from !== "earth") return unavailable(craft, from, to, departMs, "Rockets in this version leave from the Earth or the Moon.", ["A rocket's payload figures are for launches from the Earth."]);
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
  let swing: Swing | undefined;
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
  } else if (via === "jupiter" && from === "earth" && (to === "saturn" || to === "uranus" || to === "neptune")) {
    const swung = swingAt(source, to, departMs);
    if (!swung) {
      return unavailable(craft, from, to, departMs, `No swing past Jupiter lines up on the way to ${stopName(source, to)}.`, [
        "The search looks at Earth-Jupiter windows over the next twenty years. None of them can be turned, at five Jupiter radii, onto the destination.",
      ]);
    }
    mu = GM_KM3_S2.sun!;
    swing = swung.swing;
    r1 = swung.r1;
    r2 = swung.r2;
    transitS = swing.leg1S + swing.leg2S;
    theta0 = swung.theta0;
    vInf1 = swing.vInfDepart;
    vInf2 = swing.vInfArrive;
    burnEndSpeed = Math.sqrt(vInf1 ** 2 + (2 * muEarth) / rPark);
    c3 = vInf1 ** 2;
    straightKm = len(sub(positionKm(source, to, departMs, "sun"), positionKm(source, "earth", departMs, "sun")));
    estimated.push("a flyby five Jupiter radii out");
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
  const brakeG = thrust !== null && mass !== null ? thrust / mass / G0 : quantity(payload.brakeG, "braking acceleration", estimated);
  const noEngine = brakeG === null || brakeG <= 0;
  const dvAvailable = payload.dvMs?.value ?? null;
  const flyby = noEngine || (dvAvailable !== null && dvAvailable < dv2 * 1000);
  const ascentS = quantity(craft.ascentS, "time to orbit", estimated) ?? 540;
  let burnS = quantity(craft.departureBurnS, "departure burn length", estimated);
  if (burnS === null) {
    burnS = (dv1 * 1000) / (0.6 * G0);
    estimated.push("departure burn length");
  }
  const flipS = quantity(craft.flipS, "turn-round time", estimated) ?? 120;
  const brakeS = flyby ? 0 : (dv2 * 1000) / (brakeG! * G0);

  const arcSteps = 360;
  const arc = [0];
  const along = (tau: number): { r: number; theta: number } => (swing ? swingPoint(mu, swing, tau) : transferPoint(mu, r1, r2, theta0, tau));
  let last = along(0);
  for (let i = 1; i <= arcSteps; i += 1) {
    const p = along((transitS * i) / arcSteps);
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
  const peakG = Math.max((dv1 * 1000) / burnS / G0, flyby ? 0 : brakeG!);
  let verdict: Verdict;
  const because: string[] = [verdictCap.line];
  if (noEngine) {
    const line = "Flyby only: no braking engine is specified for the payload.";
    verdict = { level: "flyby", line, because, playable: true };
  } else if (flyby) {
    because.push(`${payload.name} can change its speed by ${Math.round(dvAvailable!).toLocaleString("en-US")} m/s; stopping at ${stopName(source, to)} needs ${Math.round(dv2 * 1000).toLocaleString("en-US")} m/s.`);
    verdict = { level: "flyby", line: `Flyby only: not enough fuel on board to stop at ${stopName(source, to)} (${Math.round(dv2 * 1000).toLocaleString("en-US")} m/s needed, ${Math.round(dvAvailable!).toLocaleString("en-US")} m/s on board).`, because, playable: true };
  } else {
    verdict = { level: verdictCap.level, line: verdictCap.line, because, playable: true };
    if (verdictCap.level === "not-rated") because.push("The burns below are worked from the physics; nothing says this craft can lift them.");
  }
  let assist: Trip["assist"] = undefined;
  if (swing) {
    const direct = hohmann(mu, r1, r2);
    const directOut = Math.sqrt(direct.dv1 ** 2 + (2 * muEarth) / rPark) - parkSpeed;
    const directIn = flyby ? 0 : escapeBurn(muTo, captureKm, direct.dv2);
    const savedMs = (directOut + directIn - dv1 - (flyby ? 0 : dv2)) * 1000;
    assist = { by: "jupiter", savedMs, radii: swing.radii };
    const amount = Math.abs(Math.round(savedMs)).toLocaleString("en-US");
    because.push(
      savedMs >= 0
        ? `The path swings past Jupiter and saves ${amount} m/s against the direct trip between the same distances.`
        : `The path swings past Jupiter. Against the direct trip between the same distances it costs ${amount} m/s more, because the arrival is faster.`,
    );
    const degrees = Math.abs(swing.miss) * (180 / Math.PI);
    if (degrees >= 1) because.push(`The destination is ${degrees.toFixed(1)} degrees from the end of that swing.`);
  }
  if (estimated.length > 0) because.push(`Estimated, not from a source: ${[...new Set(estimated)].join(", ")}.`);

  const isp = payload.ispS?.value ?? null;
  const braking = flyby ? 0 : dv2 * 1000;
  const fuel =
    isp !== null && mass !== null && !flyby
      ? { usedT: (mass * (1 - Math.exp(-braking / (isp * G0)))) / 1000, carriedT: null, note: "the braking burn only, from the engine's specific impulse and the payload's mass" }
      : { usedT: null, carriedT: null, note: flyby ? "it does not brake, so it burns no propellant at the far end" : "no source gives the specific impulse of this payload's engine" };
  const massRatio = isp !== null && !flyby && braking > 0 ? Math.exp(braking / (isp * G0)) : null;
  const toName = stopName(source, to);
  const carries =
    verdictCap.kg !== undefined
      ? { kg: verdictCap.kg, atLeast: verdictCap.level === "at-least", note: `Payload to ${toName}` }
      : { kg: null, atLeast: false, note: `no published payload figure covers a trip to ${toName}` };
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
    fuel,
    massRatio,
    escape: { surfaceKmS: escapeSpeed(muEarth, stopOf(source, "earth").radiusKm), parkingKmS: escapeSpeed(muEarth, rPark) },
    ...(assist ? { assist } : {}),
    payload: carries,
    dv: { departure: dv1 * 1000, arrival: flyby ? 0 : dv2 * 1000, total: (dv1 + (flyby ? 0 : dv2)) * 1000 },
    peakG,
    peakSpeed,
    peakGamma: 1,
    shipS: end,
    frameS: end,
    ballistic: { mu, r1, r2, theta0, transitS, parkKm: rPark, parkSpeed, burnEndSpeed, captureKm, captureSpeedIn, captureSpeedOut, burnS, brakeS, flipS, ascentS, vInfDeparture: vInf1, vInfArrival: vInf2, arc, c3, ...(swing ? { swing } : {}) },
  };
}

function planContinuous(source: BodySource, craft: ContinuousCraft, from: string, to: string, departMs: number, asked?: number): Trip {
  const estimated: string[] = [];
  const nearEarth = (id: string): boolean => id === "earth" || id === "moon";
  const frame = nearEarth(from) && nearEarth(to) ? "earth" : "sun";
  const rated = craft.g.value;
  const g = asked !== undefined && Number.isFinite(asked) && asked > 0 ? asked : rated;
  const a = g * G0;
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
  else verdict = { level: "ok", line: `Can do it: ${(usedT / carried * 100) >= 1 ? (usedT / carried * 100).toFixed(0) : (usedT / carried * 100).toPrecision(2)} per cent of the propellant, at ${g} g.`, because, playable: true };
  if (g > rated) because.push(`The ship is rated at ${rated} g. ${g} g is more than it is built to pull.`);
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
    peakG: g,
    peakSpeed: peak.v,
    peakGamma: peak.gamma,
    shipS: plan.properSeconds,
    frameS: plan.frameSeconds,
    propellantUsedT: usedT,
    propellantCarriedT: carried,
    fuel: { usedT, carriedT: carried, note: "the whole trip, from the exhaust speed" },
    massRatio: ratio,
    payload: { kg: craft.payloadT.value * 1000, atLeast: false, note: `Payload to ${stopName(source, to)}` },
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
 * @param g Proper acceleration in g. Omitted, the ship flies at its rated acceleration. Passed on to `planTrip`.
 * @returns The date, milliseconds since 1970.
 * @example
 * ```ts no-run
 * import { bestDate, craftOf, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const source: BodySource;
 * console.log(new Date(bestDate(source, craftOf("kaminari")!, "earth", "mars", Date.UTC(2026, 10, 4))).toISOString());
 * ```
 */
export function bestDate(source: BodySource, craft: Craft, from: string, to: string, afterMs: number, g?: number): number {
  let best = afterMs;
  let bestS = Infinity;
  for (let day = 0; day <= 800; day += 4) {
    const at = afterMs + day * DAY_S * 1000;
    const trip = planTrip(source, craft, from, to, at, g);
    if (trip.verdict.playable && trip.frameS < bestS) {
      bestS = trip.frameS;
      best = at;
    }
  }
  return best;
}
