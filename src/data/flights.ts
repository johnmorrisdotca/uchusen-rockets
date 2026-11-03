// Flights as their pages give them: when each thing happened and how many engines burned. A time or a count names its page, or is blank. How the picture moves between them (the separation, the flip, the ground falling away) is a picture, never a measurement, and the demo and the docs say so.
import { blank, type Figure } from "./types.ts";
import type { SourceId } from "./sources.ts";

/**
 * How a part stands in the picture at a phase. A picture, not a measurement: `dx` and `dy` are in heights of the whole vehicle.
 *
 * @example
 * ```ts
 * import type { PartPose } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pose: PartPose = { dx: 0.2, dy: -0.1, pitch: 12 };
 * console.log(pose);
 * ```
 */
export interface PartPose {
  dx?: number;
  dy?: number;
  /** Turned this many degrees from upright. */
  pitch?: number;
  /** Its base stands on the ground. */
  rest?: boolean;
  /** It has left the picture. */
  gone?: boolean;
  /** Degrees each moving group of the part (`grid-fins`, `legs`, `forward-flaps`, `aft-flaps`) is turned from where it is drawn at rest. A picture, not a measurement. */
  moves?: Readonly<Record<string, number>>;
}

/**
 * How many engines of a part burn. `drawn` says how many flames to draw where no page says how many burned.
 *
 * @example
 * ```ts
 * import type { FlightBurn } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const burn: FlightBurn = { engines: { value: null, source: null, brief: "not given" }, drawn: 9 };
 * console.log(burn);
 * ```
 */
export interface FlightBurn {
  engines: Figure;
  drawn?: number;
}

/**
 * One phase of a flight: its id and name, what happens, when (a figure with its source), how many engines burn, how each part stands, and how far the ground has fallen away. The poses and the smoke are a picture, not a measurement.
 *
 * @example
 * ```ts
 * import { FLIGHTS, type FlightPhase } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const phase: FlightPhase | undefined = FLIGHTS[0]?.phases[0];
 * console.log(phase?.name, phase?.what);
 * ```
 */
export interface FlightPhase {
  id: string;
  name: string;
  /** What happens, in a line. */
  what: string;
  /** Seconds from the flight's zero, on the page's own clock. */
  at: Figure;
  burns: Readonly<Record<string, FlightBurn>>;
  pose: Readonly<Record<string, PartPose>>;
  /** How far the ground has fallen from under the rocket, in heights of the whole vehicle. A picture. */
  ground: number;
  /** How much smoke and water stands on the pad, 0 to 1. A picture. */
  smoke?: number;
  /** 0 near the ground, 1 high up, where a flame fans out. A picture. */
  air?: number;
  altitude?: Figure<string>;
  speed?: Figure<string>;
}

/**
 * A flight, from a published timeline: its rocket and variant, whose timing it is, its source and its phases in order.
 *
 * @example
 * ```ts
 * import { FLIGHTS, type Flight } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight: Flight | undefined = FLIGHTS[0];
 * console.log(flight?.name, flight?.phases.length);
 * ```
 */
export interface Flight {
  id: string;
  rocket: string;
  variant: string;
  name: string;
  /** Whose timing it is, and whether it was what was planned or what happened. */
  basis: string;
  source: SourceId;
  /** What the picture leaves out. */
  note?: string;
  /** What turns in it (grid fins, legs, flaps), and the page that says so. How far each turns is a picture. */
  moves?: readonly { source: SourceId; says: string }[];
  phases: readonly FlightPhase[];
}

const seconds = (clock: string): number => {
  const sign = clock.startsWith("-") ? -1 : 1;
  const [h, m, s] = clock.replace(/^[-+]/, "").split(":").map(Number);
  return sign * (h * 3600 + m * 60 + s);
};
const time = (clock: string, source: SourceId, extra: Partial<Figure> = {}): Figure => ({ value: seconds(clock), source, ...extra });
const count = (value: number, source: SourceId, note?: string): FlightBurn => ({ engines: { value, source, ...(note ? { note } : {}) } });

const SH = "wikipedia-super-heavy" as const;
const SHIP = "wikipedia-ship" as const;

interface StarshipTiming {
  ignition: string;
  liftoff: string;
  maxq: string;
  meco: string;
  hot: string;
  boostback: string;
  boostbackEnd: string;
  landing: string;
  landingEnd: string;
  seco: string;
  entry: string;
  flip: string;
  shipBurn: string;
  splash: string;
}

/** Super Heavy and the Ship, as Starship's pages give each flight. `stageEngines` and `backEngines` differ by block. */
function starshipFlight(options: {
  id: string;
  variant: string;
  name: string;
  basis: string;
  source: SourceId;
  times: StarshipTiming;
  stageEngines: FlightBurn;
  backEngines: FlightBurn;
  landingBurn: FlightBurn;
  stageAltitude?: Figure<string>;
  apogee?: Figure<string>;
  boosterSpeed?: Figure<string>;
  shipLanding: readonly { id: string; name: string; what: string; at: Figure; burn: FlightBurn }[];
}): Flight {
  const { source, times, stageEngines, backEngines, landingBurn } = options;
  const all = count(33, SH, "All thirty-three on ascent, as the Super Heavy article says.");
  const six: FlightBurn = { engines: { value: 6, source: SHIP, note: "Three sea-level engines and three RVacs." } };
  const seaLevel: FlightBurn = { engines: { value: 3, source: SHIP, note: "The sea-level engines reignite for the landing burns." } };
  const away = { dx: -0.23, dy: -0.12 };
  const ahead = { dx: 0.2, dy: 0.1 };
  const stacked = (): Record<string, PartPose> => ({ booster: {}, ship: {} });
  return {
    id: options.id,
    rocket: "starship",
    variant: options.variant,
    name: options.name,
    basis: options.basis,
    source,
    note: "No tower, catch arms or moving flaps and fins yet: the booster and the Ship stand on plain ground at the end.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The booster's engines start while it is held on the pad, with the flame deflector running.", at: time(times.ignition, source), burns: { booster: all }, pose: stacked(), ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "All the booster's engines at full thrust.", at: time(times.liftoff, source), burns: { booster: all }, pose: stacked(), ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max q", what: "The moment of peak stress on the rocket.", at: time(times.maxq, source), burns: { booster: all }, pose: stacked(), ground: 1.6, air: 0.25 },
      { id: "meco", name: "Most engines cut off", what: "The booster shuts down all but its inner engines.", at: time(times.meco, source), burns: { booster: stageEngines }, pose: stacked(), ground: 1.6, air: 0.7, ...(options.stageAltitude ? { altitude: options.stageAltitude } : {}) },
      { id: "hot-staging", name: "Hot staging", what: "The Ship lights its engines while still on the booster, and pulls away.", at: time(times.hot, source), burns: { booster: stageEngines, ship: six }, pose: { booster: {}, ship: { dy: 0.05 } }, ground: 1.6, air: 0.85, ...(options.stageAltitude ? { altitude: options.stageAltitude } : {}) },
      { id: "boostback", name: "Boostback burn", what: "The booster turns round and burns back towards the launch site.", at: time(times.boostback, source), burns: { booster: backEngines, ship: six }, pose: { booster: { ...away, pitch: 150 }, ship: ahead }, ground: 1.6, air: 1 },
      { id: "boostback-end", name: "Boostback ends", what: "The booster falls back, steering with its grid fins.", at: time(times.boostbackEnd, source), burns: { ship: six }, pose: { booster: { ...away, pitch: 180 }, ship: { dx: 0.2, dy: 0.08 } }, ground: 1.6, air: 1 },
      { id: "booster-landing", name: "Booster's landing burn", what: "The booster lights its inner thirteen, then keeps only the inner three.", at: time(times.landing, source), burns: { booster: landingBurn, ship: six }, pose: { booster: { dx: -0.23, dy: -0.1 }, ship: { dx: 0.2, dy: 0.09 } }, ground: 0.45, air: 0.1 },
      { id: "booster-three", name: "Inner three", what: "The last of the landing burn, on the three middle engines.", at: blank("The page gives no time for this step."), burns: { booster: count(3, SH), ship: six }, pose: { booster: { dx: -0.23, dy: -0.32 }, ship: { dx: 0.2, dy: 0.1 } }, ground: 0.3, air: 0 },
      { id: "booster-down", name: "Booster down", what: "The landing burn ends.", at: time(times.landingEnd, source), burns: { ship: six }, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: 0.11 } }, ground: 0, air: 0.8, ...(options.boosterSpeed ? { speed: options.boosterSpeed } : {}) },
      { id: "seco", name: "Ship's engines cut off", what: "The Ship coasts on, above the air.", at: time(times.seco, source), burns: {}, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: 0.12 } }, ground: 0, ...(options.apogee ? { altitude: options.apogee } : {}) },
      { id: "entry", name: "Entry", what: "The Ship comes back into the air, belly first on its tiles.", at: time(times.entry, source), burns: {}, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: 0.12, pitch: -80 } }, ground: 0 },
      ...(seconds(times.flip) <= seconds(times.shipBurn)
        ? [
            { id: "flip", name: "Landing flip", what: "The Ship swings from belly first to engines down.", at: time(times.flip, source), burns: {}, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: -0.36, pitch: -35 } }, ground: 0 },
            { id: "ship-burn", name: "Ship's landing burn", what: "The sea-level engines light again.", at: time(times.shipBurn, source), burns: { ship: seaLevel }, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: -0.44 } }, ground: 0 },
          ]
        : [
            { id: "ship-burn", name: "Ship's landing burn", what: "The sea-level engines light again, and the flip comes on the burn.", at: time(times.shipBurn, source), burns: { ship: seaLevel }, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: -0.34, pitch: -50 } }, ground: 0 },
            { id: "flip", name: "Landing flip", what: "The Ship swings from belly first to engines down.", at: time(times.flip, source), burns: { ship: seaLevel }, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: -0.42 } }, ground: 0 },
          ]),
      ...options.shipLanding.map((step, index) => ({ id: step.id, name: step.name, what: step.what, at: step.at, burns: { ship: step.burn }, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, dy: -0.48 - index * 0.02 } }, ground: 0 })),
      { id: "splashdown", name: "Splashdown", what: "The Ship settles on the water, drawn here on plain ground.", at: time(times.splash, source), burns: {}, pose: { booster: { dx: -0.23, rest: true }, ship: { dx: 0.2, rest: true } }, ground: 0 },
    ],
  };
}

/** Falcon 9's nine, three and one, from three of Spaceflight Now's timelines. */
const NINE = count(9, "sfn-crs-16", "The nine Merlin 1D engines, shut down at MECO.");
const THREE = count(3, "sfn-flight-23", "Three of the nine, for the boostback and again for the entry burn.");
const ONE = count(1, "sfn-flight-35", "Only the centre Merlin 1D for the landing burn.");
const UPPER = count(1, "sfn-crs-16", "The second stage's vacuum Merlin.");

const FLIGHT_5 = "wikipedia-flight-5" as const;
const FLIGHT_7 = "wikipedia-flight-7" as const;
const FLIGHT_12 = "wikipedia-flight-12" as const;
const FH = "wikipedia-fh-test-flight" as const;
const STARLINK = "sfn-starlink-2019" as const;
const CRS16 = "sfn-crs-16" as const;

const FLIGHT_1 = "wikipedia-flight-1" as const;
const CASSIOPE = "sfn-cassiope" as const;
const ABS = "sfn-abs-eutelsat" as const;
const F9 = "wikipedia-falcon-9" as const;
const GRASSHOPPER = "wikipedia-grasshopper" as const;
const nineMerlin = (note: string): FlightBurn => count(9, F9, note);
const oneMerlin = (note: string): FlightBurn => count(1, F9, note);

const lower = (dy: number, extra: PartPose = {}): PartPose => ({ dx: -0.26, dy, ...extra });

const BASE_FLIGHTS: readonly Flight[] = [
  starshipFlight({
    id: "starship-flight-5",
    variant: "v1",
    name: "Starship flight test 5",
    basis: "SpaceX's timeline as Wikipedia gives it, for the flight of 13 October 2024, the first time a booster was caught at the tower.",
    source: FLIGHT_5,
    times: { ignition: "-00:00:03", liftoff: "+00:00:02", maxq: "+00:01:02", meco: "+00:02:35", hot: "+00:02:40", boostback: "+00:02:45", boostbackEnd: "+00:03:41", landing: "+00:06:30", landingEnd: "+00:06:54", seco: "+00:08:27", entry: "+00:48:03", flip: "+01:05:15", shipBurn: "+01:05:20", splash: "+01:05:40" },
    stageEngines: count(3, SH, "The article's mission profile: all but three of its centre engines. Its interstage section says five, for the newer booster."),
    backEngines: count(13, SH, "The article's mission profile: ten more lit beside the three."),
    landingBurn: count(13, SH),
    stageAltitude: { value: "69 km", source: FLIGHT_5 },
    apogee: { value: "212 km, the Ship's highest", source: FLIGHT_5 },
    shipLanding: [],
  }),
  starshipFlight({
    id: "starship-flight-7",
    variant: "v2",
    name: "Starship flight test 7",
    basis: "SpaceX's timeline as Wikipedia gives it, for the flight of 16 January 2025. It is the plan: the booster was caught, but the Ship was lost during its ascent, at about the time the plan has it cutting off, so the Ship's later steps were never flown.",
    source: FLIGHT_7,
    times: { ignition: "-00:00:03", liftoff: "+00:00:02", maxq: "+00:01:02", meco: "+00:02:32", hot: "+00:02:40", boostback: "+00:02:44", boostbackEnd: "+00:03:38", landing: "+00:06:31", landingEnd: "+00:06:55", seco: "+00:08:53", entry: "+00:47:25", flip: "+01:06:12", shipBurn: "+01:06:18", splash: "+01:06:38" },
    stageEngines: count(3, SH, "The article's mission profile: all but three of its centre engines."),
    backEngines: count(13, SH, "The article's mission profile: ten more lit beside the three. On this flight nine of the ten lit."),
    landingBurn: count(13, FLIGHT_7, "All 13 engines ignited."),
    apogee: { value: "146 km: where the Ship was when it was lost, 27 seconds before the planned cutoff", source: FLIGHT_7 },
    shipLanding: [],
  }),
  starshipFlight({
    id: "starship-flight-12",
    variant: "v3",
    name: "Starship flight test 12",
    basis: "SpaceX's published timeline as Wikipedia gives it, for the flight of 22 May 2026, the first of Block 3. It is the plan, not what happened: the booster's engines failed after staging, and it fell into the Gulf.",
    source: FLIGHT_12,
    times: { ignition: "-00:00:03", liftoff: "+00:00:00", maxq: "+00:00:45", meco: "+00:02:22", hot: "+00:02:24", boostback: "+00:02:30", boostbackEnd: "+00:03:30", landing: "+00:06:34", landingEnd: "+00:06:59", seco: "+00:08:11", entry: "+00:47:47", flip: "+01:05:08", shipBurn: "+01:05:06", splash: "+01:05:26" },
    stageEngines: count(5, SH, "The article's interstage section, for this booster: all but five inner engines. Its older mission profile says three."),
    backEngines: count(33, SH, "The article's propulsion section: the ascent and boostback burns use all thirty-three. The flight's page counts 28 to relight, beside the five already burning."),
    landingBurn: count(13, SH, "The inner thirteen."),
    apogee: { value: "195 km, the highest of the Ship's orbit", source: FLIGHT_12 },
    boosterSpeed: { value: "1,450 km/h when the booster hit the water in the Gulf, which it did not land from", source: FLIGHT_12 },
    shipLanding: [
      { id: "ship-two", name: "Three to two engines", what: "The Ship's landing burn drops to two.", at: time("+01:05:17", FLIGHT_12), burn: count(2, FLIGHT_12) },
      { id: "ship-one", name: "Two to one engine", what: "And to one, for the last seconds.", at: time("+01:05:24", FLIGHT_12), burn: count(1, FLIGHT_12) },
    ],
  }),
  {
    id: "falcon-9-starlink-2019",
    rocket: "falcon-9",
    variant: "block-5",
    name: "Falcon 9, Starlink launch of November 2019",
    basis: "Spaceflight Now's timeline, published before the launch. The first stage lands on a drone ship, so there is no boostback.",
    source: STARLINK,
    note: "No drone ship or moving legs yet: the first stage stands on plain ground, with its legs drawn as they always are.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The nine engines start on the pad.", at: blank("This timeline starts at liftoff."), burns: { "first-stage": NINE }, pose: {}, ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "Nine Merlin engines at full thrust.", at: time("+00:00:00", STARLINK), burns: { "first-stage": NINE }, pose: {}, ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max Q", what: "The point of maximum aerodynamic pressure.", at: time("+00:01:14", STARLINK), burns: { "first-stage": NINE }, pose: {}, ground: 1.6, air: 0.25 },
      { id: "meco", name: "MECO", what: "The nine first stage engines shut down.", at: time("+00:02:33", STARLINK), burns: {}, pose: {}, ground: 1.6, air: 0.8 },
      { id: "separation", name: "Stage separation", what: "The first stage falls away moments after MECO.", at: time("+00:02:36", STARLINK), burns: {}, pose: { "first-stage": lower(-0.05), "second-stage": { dx: 0.14, dy: 0.04 }, fairing: { dx: 0.14, dy: 0.04 } }, ground: 1.6, air: 0.9 },
      { id: "second-stage", name: "Second stage ignition", what: "The vacuum Merlin lights for about six and a half minutes.", at: time("+00:02:44", STARLINK), burns: { "second-stage": UPPER }, pose: { "first-stage": lower(-0.1, { pitch: 30 }), "second-stage": { dx: 0.22, dy: 0.08 }, fairing: { dx: 0.22, dy: 0.08 } }, ground: 1.6, air: 1 },
      { id: "fairing", name: "Fairing jettison", what: "The fairing comes away.", at: time("+00:03:24", STARLINK), burns: { "second-stage": UPPER }, pose: { "first-stage": lower(-0.14, { pitch: 90 }), "second-stage": { dx: 0.22, dy: 0.1 }, fairing: { dx: 0.4, dy: 0.2, gone: true } }, ground: 1.6, air: 1 },
      { id: "entry-burn", name: "Entry burn ends", what: "A subset of the first stage's engines completes a burn to slow down for landing.", at: time("+00:06:41", STARLINK), burns: { "first-stage": THREE, "second-stage": UPPER }, pose: { "first-stage": lower(-0.16), "second-stage": { dx: 0.22, dy: 0.08 }, fairing: { gone: true } }, ground: 0.8, air: 0.5, altitude: { value: "from about 70 to 40 km", source: "wikipedia-landing-tests", note: "The landing tests article, for the burn in general." } },
      { id: "landing-burn", name: "Landing burn", what: "Only the centre engine, just before touchdown.", at: blank("This timeline gives no time for its start."), burns: { "first-stage": ONE, "second-stage": UPPER }, pose: { "first-stage": lower(-0.3), "second-stage": { dx: 0.22, dy: 0.17 }, fairing: { gone: true } }, ground: 0.22, air: 0 },
      { id: "landing", name: "Landing", what: "The first stage touches down on the drone ship, drawn here on plain ground.", at: time("+00:08:24", STARLINK), burns: { "second-stage": UPPER }, pose: { "first-stage": { dx: -0.26, rest: true }, "second-stage": { dx: 0.22, dy: 0.19 }, fairing: { gone: true } }, ground: 0, air: 1 },
      { id: "seco", name: "SECO", what: "The second stage shuts down and coasts.", at: time("+00:08:49", STARLINK), burns: {}, pose: { "first-stage": { dx: -0.26, rest: true }, "second-stage": { dx: 0.22, dy: 0.11 }, fairing: { gone: true } }, ground: 0 },
    ],
  },
  {
    id: "falcon-9-crs-16",
    rocket: "falcon-9",
    variant: "block-5-dragon-2",
    name: "Falcon 9 and Dragon, CRS-16",
    basis: "Spaceflight Now's timeline for CRS-16, published before the launch of December 2018: a Block 5, returning to land. That flight carried the first Dragon, not this one, so the times are that flight's and the picture is this version's.",
    source: CRS16,
    note: "No moving legs or fins yet: the first stage stands on plain ground, with its legs drawn as they always are.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The nine engines start on the pad.", at: blank("This timeline starts at liftoff."), burns: { "first-stage": NINE }, pose: {}, ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "Nine Merlin engines at full thrust.", at: time("+00:00:00", CRS16), burns: { "first-stage": NINE }, pose: {}, ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max Q", what: "The point of maximum aerodynamic pressure.", at: time("+00:00:58", CRS16), burns: { "first-stage": NINE }, pose: {}, ground: 1.6, air: 0.25 },
      { id: "meco", name: "MECO", what: "The nine first stage engines shut down.", at: time("+00:02:23", CRS16), burns: {}, pose: {}, ground: 1.6, air: 0.8 },
      { id: "separation", name: "Stage separation", what: "The first stage falls away moments after MECO.", at: time("+00:02:26", CRS16), burns: {}, pose: { "first-stage": lower(-0.04), "second-stage": { dx: 0.14, dy: 0.04 }, trunk: { dx: 0.14, dy: 0.04 }, capsule: { dx: 0.14, dy: 0.04 } }, ground: 1.6, air: 0.9 },
      { id: "second-stage", name: "Second stage ignition", what: "The vacuum Merlin lights for about five and a half minutes.", at: time("+00:02:33", CRS16), burns: { "second-stage": UPPER }, pose: { "first-stage": lower(-0.08, { pitch: 30 }), "second-stage": { dx: 0.22, dy: 0.08 }, trunk: { dx: 0.22, dy: 0.08 }, capsule: { dx: 0.22, dy: 0.08 } }, ground: 1.6, air: 1 },
      { id: "boostback", name: "Boostback burn", what: "Three engines push the first stage back towards the coast.", at: time("+00:02:39", CRS16), burns: { "first-stage": THREE, "second-stage": UPPER }, pose: { "first-stage": lower(-0.1, { pitch: 150 }), "second-stage": { dx: 0.22, dy: 0.1 }, trunk: { dx: 0.22, dy: 0.1 }, capsule: { dx: 0.22, dy: 0.1 } }, ground: 1.6, air: 1 },
      { id: "entry-burn", name: "Entry burn", what: "Three engines again, to slow the fall.", at: time("+00:06:35", CRS16), burns: { "first-stage": THREE, "second-stage": UPPER }, pose: { "first-stage": lower(-0.14), "second-stage": { dx: 0.22, dy: 0.08 }, trunk: { dx: 0.22, dy: 0.08 }, capsule: { dx: 0.22, dy: 0.08 } }, ground: 0.8, air: 0.5, altitude: { value: "from about 70 to 40 km", source: "wikipedia-landing-tests", note: "The landing tests article, for the burn in general." } },
      { id: "landing-burn", name: "Landing burn", what: "Only the centre engine, just before touchdown.", at: blank("This timeline gives no time for its start."), burns: { "first-stage": ONE, "second-stage": UPPER }, pose: { "first-stage": lower(-0.3), "second-stage": { dx: 0.22, dy: 0.17 }, trunk: { dx: 0.22, dy: 0.17 }, capsule: { dx: 0.22, dy: 0.17 } }, ground: 0.22, air: 0 },
      { id: "landing", name: "Landing", what: "The planned landing, on plain ground here.", at: time("+00:08:17", CRS16), burns: { "second-stage": UPPER }, pose: { "first-stage": { dx: -0.26, rest: true }, "second-stage": { dx: 0.22, dy: 0.19 }, trunk: { dx: 0.22, dy: 0.19 }, capsule: { dx: 0.22, dy: 0.19 } }, ground: 0, air: 1 },
      { id: "seco", name: "SECO", what: "The second stage shuts down.", at: time("+00:08:51", CRS16), burns: {}, pose: { "first-stage": { dx: -0.26, rest: true }, "second-stage": { dx: 0.22, dy: 0.11 }, trunk: { dx: 0.22, dy: 0.11 }, capsule: { dx: 0.22, dy: 0.11 } }, ground: 0, altitude: { value: "an orbit with a low point of about 124 miles (200 km) and a high point of about 223 miles (360 km), as planned", source: CRS16 } },
      { id: "dragon", name: "Dragon separates", what: "The spacecraft comes away from the second stage.", at: time("+00:09:51", CRS16), burns: {}, pose: { "first-stage": { dx: -0.26, rest: true }, "second-stage": { dx: 0.22, dy: 0.17 }, trunk: { dx: 0.22, dy: 0.25 }, capsule: { dx: 0.22, dy: 0.25 } }, ground: 0 },
    ],
  },
  {
    id: "falcon-heavy-test-flight",
    rocket: "falcon-heavy",
    variant: "falcon-heavy",
    name: "Falcon Heavy test flight",
    basis: "The timeline Wikipedia gives for the test flight of 6 February 2018. The side boosters landed; the centre core did not, so its return is left out.",
    source: FH,
    note: "The painted model's centre core, upper stage and fairing are one shell, so they stay one part here: nothing is cut to fake a separation. The side boosters stand on plain ground at the end.",
    phases: [
      { id: "side-start", name: "Side boosters start", what: "The two side cores light first.", at: time("-00:00:05", FH), burns: { "side-left": { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-right": { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: {}, ground: 0, smoke: 0.5 },
      { id: "centre-start", name: "Centre booster starts", what: "Then the centre core: twenty-seven engines.", at: time("-00:00:03", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-left": { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-right": { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: {}, ground: 0, smoke: 0.8 },
      { id: "liftoff", name: "Liftoff", what: "All twenty-seven at full thrust.", at: time("+00:00:00", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-left": { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-right": { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: {}, ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max-Q", what: "The moment of peak stress on the rocket.", at: time("+00:01:06", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-left": { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-right": { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: {}, ground: 1.6, air: 0.25 },
      { id: "beco", name: "Side boosters cut off", what: "The side cores shut down. The centre core burns on.", at: time("+00:02:29", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: {}, ground: 1.6, air: 0.7 },
      { id: "side-separation", name: "Side cores separate", what: "They come away from the centre core.", at: time("+00:02:33", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } } }, pose: { "side-left": { dx: -0.12, dy: -0.05 }, "side-right": { dx: 0.12, dy: -0.05 } }, ground: 1.6, air: 0.8 },
      { id: "side-boostback", name: "Side cores' boostback", what: "Each side core turns back to the coast.", at: time("+00:02:50", FH), burns: { centre: { engines: { value: 9, source: "wikipedia-falcon-heavy" } }, "side-left": { engines: { value: 3, source: "wikipedia-falcon-heavy", note: "The article's table: three engines restart for boostback, reentry and landing." } }, "side-right": { engines: { value: 3, source: "wikipedia-falcon-heavy", note: "The article's table: three engines restart for boostback, reentry and landing." } } }, pose: { "side-left": { dx: -0.3, dy: -0.1, pitch: 150 }, "side-right": { dx: 0.2, dy: -0.1, pitch: -150 } }, ground: 1.6, air: 1 },
      { id: "meco", name: "Centre core cuts off", what: "The centre core's engines shut down.", at: time("+00:03:04", FH), burns: {}, pose: { "side-left": { dx: -0.23, dy: -0.12, pitch: 180 }, "side-right": { dx: 0.34, dy: -0.12, pitch: -180 } }, ground: 1.6, air: 1 },
      { id: "side-entry", name: "Side cores' entry burn", what: "Three engines each, to slow the fall.", at: time("+00:06:41", FH), burns: { "side-left": { engines: { value: 3, source: "wikipedia-falcon-heavy" } }, "side-right": { engines: { value: 3, source: "wikipedia-falcon-heavy" } } }, pose: { "side-left": { dx: -0.23, dy: -0.12 }, "side-right": { dx: 0.34, dy: -0.12 } }, ground: 0.5, air: 0.5 },
      { id: "side-burn", name: "Side cores' landing burn", what: "The last seconds before they land together.", at: blank("The page gives no time for its start."), burns: { "side-left": { engines: blank("No page read here says how many burned; one is drawn."), drawn: 1 }, "side-right": { engines: blank("No page read here says how many burned; one is drawn."), drawn: 1 } }, pose: { "side-left": { dx: -0.23, dy: -0.28 }, "side-right": { dx: 0.34, dy: -0.28 } }, ground: 0.2, air: 0 },
      { id: "side-landing", name: "Side cores land", what: "Both side cores down, side by side.", at: time("+00:07:58", FH), burns: {}, pose: { "side-left": { dx: -0.23, rest: true }, "side-right": { dx: 0.34, rest: true } }, ground: 0 },
    ],
  },
  {
    id: "starship-flight-1",
    rocket: "starship",
    variant: "v1-flight1",
    name: "Starship flight test 1",
    basis: "SpaceX's timeline as Wikipedia gives it, for the flight of 20 April 2023, the first of Starship. It is what happened, not a plan: the stages never separated, and the flight termination system destroyed the stack. The planned steps after that (the boostback, the landing burn, the Ship's burn and its entry) were never reached, so they are not here.",
    source: FLIGHT_1,
    note: "No separation, tower or flaps and fins to move: the stack stays one piece to the end. Which of the booster's engines burned after the first minute, the page does not say, so the flames drawn there are a picture.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The booster's engines start while it is held on the pad. Three of them were stopped at ignition because the flight software did not find them healthy enough.", at: time("-00:00:06", FLIGHT_1), burns: { booster: count(30, FLIGHT_1, "Thirty-three engines, three of whose ignition was terminated: the page's words, and the sum is this package's.") }, pose: { booster: {}, ship: {} }, ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "A successful liftoff that significantly damaged the launch pad, the page says.", at: time("+00:00:05", FLIGHT_1), burns: { booster: count(30, FLIGHT_1, "The thirty that lit.") }, pose: { booster: {}, ship: {} }, ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max q", what: "The throttle goes down for max q, later and lower than planned.", at: time("+00:00:55", FLIGHT_1), burns: { booster: count(30, FLIGHT_1, "The thirty that lit; the page does not count the failures that came during the climb.") }, pose: { booster: {}, ship: {} }, ground: 1.6, air: 0.25 },
      { id: "meco", name: "Most engines cut off", what: "Fires in the booster's aft end led to a loss of communication with most of its engines.", at: time("+00:02:49", FLIGHT_1), burns: { booster: { engines: blank("The page gives no count of the engines that burned here."), drawn: 3 } }, pose: { booster: {}, ship: {} }, ground: 1.6, air: 0.7 },
      { id: "separation", name: "Separation fails", what: "The stages did not separate. The vehicle lost control and began spinning.", at: time("+00:02:52", FLIGHT_1), burns: { booster: { engines: blank("The page gives no count of the engines that burned here."), drawn: 3 } }, pose: { booster: {}, ship: {} }, ground: 1.6, air: 0.85, altitude: { value: "about 39 km, the highest it rose", source: FLIGHT_1 } },
      { id: "termination", name: "Flight termination", what: "The flight termination system was triggered.", at: time("+00:03:10", FLIGHT_1), burns: { booster: { engines: blank("The page gives no count of the engines that burned here."), drawn: 3 } }, pose: { booster: {}, ship: {} }, ground: 1.6, air: 1 },
      { id: "destroyed", name: "Destroyed", what: "The stack was destroyed. The booster's engines had kept firing until about four minutes in.", at: time("+00:04:01", FLIGHT_1), burns: {}, pose: { booster: {}, ship: {} }, ground: 1.6, air: 1, altitude: { value: "29 km: the height at which the page says the booster's engines were still firing, at about four minutes", source: FLIGHT_1 } },
    ],
  },
  {
    id: "falcon-9-cassiope",
    rocket: "falcon-9",
    variant: "v1.1",
    name: "Falcon 9 v1.1, CASSIOPE",
    basis: "Spaceflight Now's live coverage of 29 September 2013, the first launch of the Falcon 9 v1.1. The minutes are the live coverage's own, rounded as it said them, and they are what happened, not a plan.",
    source: CASSIOPE,
    note: "The page does not follow the first stage after it separates, so it leaves the picture. A fairing is drawn though the satellites went inside it: that is this version's drawing. Altitudes are the live coverage's words, in the units it used.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The nine engines start on the pad.", at: blank("The live coverage starts at liftoff."), burns: { "first-stage": nineMerlin("The nine Merlin 1D of this version, from its page.") }, pose: {}, ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "Liftoff of the next-generation Falcon 9, at 1600 GMT.", at: time("+00:00:00", CASSIOPE), burns: { "first-stage": nineMerlin("The nine Merlin 1D of this version, from its page.") }, pose: {}, ground: 0.02, smoke: 1 },
      { id: "max-q", name: "Max q", what: "The rocket nears the speed of sound, in the phase of maximum aerodynamic pressure.", at: time("+00:01:00", CASSIOPE), burns: { "first-stage": nineMerlin("The nine Merlin 1D of this version, from its page.") }, pose: {}, ground: 1.6, air: 0.25 },
      { id: "climb", name: "Two minutes", what: "Climbing, with the first stage still burning.", at: time("+00:02:00", CASSIOPE), burns: { "first-stage": nineMerlin("The nine Merlin 1D of this version, from its page.") }, pose: {}, ground: 1.6, air: 0.6, altitude: { value: "more than 20 miles", source: CASSIOPE } },
      { id: "separation", name: "Stage separation", what: "The first stage's engines cut off and the stages separate; the second stage's engine lights for about six minutes.", at: time("+00:03:20", CASSIOPE), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": lower(-0.05), "second-stage": { dx: 0.14, dy: 0.04 }, fairing: { dx: 0.14, dy: 0.04 } }, ground: 1.6, air: 0.9 },
      { id: "fairing", name: "Fairing separation", what: "The payload fairing has separated as planned.", at: time("+00:04:00", CASSIOPE), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": lower(-0.1, { gone: true }), "second-stage": { dx: 0.22, dy: 0.08 }, fairing: { dx: 0.4, dy: 0.2, gone: true } }, ground: 1.6, air: 1 },
      { id: "altitude", name: "Seven minutes twenty", what: "Still burning, high above the air.", at: time("+00:07:20", CASSIOPE), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.1 }, fairing: { gone: true } }, ground: 1.6, air: 1, altitude: { value: "310 kilometers", source: CASSIOPE } },
      { id: "seco", name: "Second stage cutoff", what: "The second stage's engine shuts down, confirmed at 1609 GMT.", at: time("+00:09:00", CASSIOPE, { note: "From the page's GMT clock: liftoff at 1600, cutoff confirmed at 1609." }), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.12 }, fairing: { gone: true } }, ground: 1.6 },
      { id: "deploy", name: "CASSIOPE deploys", what: "The satellite is released first, at T+14:15.", at: time("+00:14:15", CASSIOPE), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.16 }, fairing: { gone: true } }, ground: 1.6, altitude: { value: "a planned orbit between 155 miles and 900 miles high", source: CASSIOPE } },
    ],
  },
  {
    id: "falcon-9-abs-eutelsat",
    rocket: "falcon-9",
    variant: "ft",
    name: "Falcon 9 Full Thrust, ABS-2A and Eutelsat 117 West B",
    basis: "Spaceflight Now's timeline for the flight of 15 June 2016, the plan as it was published before the launch. Its page does not name the version; Wikipedia's article on ABS-2A says it was a Falcon 9 Full Thrust.",
    source: ABS,
    note: "The page says only that the first stage would try to land on a barge in the Atlantic and gives no time for it, so the stage is not followed after it separates. The second stage burns twice, and the page gives each time.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The nine engines start on the pad.", at: blank("The timeline starts at liftoff."), burns: { "first-stage": nineMerlin("The nine Merlin 1D+ of this version, from its page.") }, pose: {}, ground: 0, smoke: 0.7 },
      { id: "liftoff", name: "Liftoff", what: "Nine Merlin engines at full thrust.", at: time("+00:00:00", ABS), burns: { "first-stage": nineMerlin("The nine Merlin 1D+ of this version, from its page.") }, pose: {}, ground: 0.02, smoke: 1 },
      { id: "mach-1", name: "Mach 1", what: "The rocket reaches the speed of sound.", at: time("+00:01:13", ABS), burns: { "first-stage": nineMerlin("The nine Merlin 1D+ of this version, from its page.") }, pose: {}, ground: 1.2, air: 0.1, speed: { value: "Mach 1", source: ABS } },
      { id: "max-q", name: "Max Q", what: "The point of maximum aerodynamic pressure.", at: time("+00:01:17", ABS), burns: { "first-stage": nineMerlin("The nine Merlin 1D+ of this version, from its page.") }, pose: {}, ground: 1.6, air: 0.25 },
      { id: "meco", name: "MECO", what: "The nine first stage engines shut down.", at: time("+00:02:36", ABS), burns: {}, pose: {}, ground: 1.6, air: 0.8 },
      { id: "separation", name: "Stage separation", what: "The first stage falls away. It is not followed from here.", at: time("+00:02:39", ABS), burns: {}, pose: { "first-stage": lower(-0.05), "second-stage": { dx: 0.14, dy: 0.04 }, fairing: { dx: 0.14, dy: 0.04 } }, ground: 1.6, air: 0.9 },
      { id: "second-stage", name: "Second stage ignition", what: "The vacuum Merlin lights for about six and a half minutes, to a parking orbit.", at: time("+00:02:47", ABS), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": lower(-0.1, { gone: true }), "second-stage": { dx: 0.22, dy: 0.08 }, fairing: { dx: 0.22, dy: 0.08 } }, ground: 1.6, air: 1 },
      { id: "fairing", name: "Fairing jettison", what: "The payload fairing comes away.", at: time("+00:03:34", ABS), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.1 }, fairing: { dx: 0.4, dy: 0.2, gone: true } }, ground: 1.6, air: 1 },
      { id: "seco-1", name: "SECO 1", what: "The second stage shuts down in its parking orbit.", at: time("+00:09:22", ABS), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.12 }, fairing: { gone: true } }, ground: 1.6 },
      { id: "restart", name: "Second burn", what: "The second stage's engine restarts for the burn to the transfer orbit.", at: time("+00:25:54", ABS), burns: { "second-stage": oneMerlin("The one vacuum Merlin of this version, from its page.") }, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.14 }, fairing: { gone: true } }, ground: 1.6, air: 1 },
      { id: "seco-2", name: "SECO 2", what: "The second stage shuts down again.", at: time("+00:26:58", ABS), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.16 }, fairing: { gone: true } }, ground: 1.6 },
      { id: "eutelsat", name: "Eutelsat 117 West B separates", what: "The first of the two satellites is released.", at: time("+00:30:29", ABS), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.18 }, fairing: { gone: true } }, ground: 1.6 },
      { id: "abs", name: "ABS-2A separates", what: "The second satellite is released.", at: time("+00:35:29", ABS), burns: {}, pose: { "first-stage": { gone: true }, "second-stage": { dx: 0.22, dy: 0.2 }, fairing: { gone: true } }, ground: 1.6 },
    ],
  },
  {
    id: "grasshopper-hop-8",
    rocket: "grasshopper",
    variant: "grasshopper",
    name: "Grasshopper's highest hop",
    basis: "Wikipedia's table of Grasshopper's eight hops: the last, on 7 October 2013, rose 744 m in 79 seconds. The page gives the height and the length of each hop and nothing between, so the steps between are a picture.",
    source: GRASSHOPPER,
    note: "The page gives a hop's height and duration only, so the engine's start, its throttling and the descent have no times here. The seven earlier hops were lower (the first rose 1.8 m in 3 s) and are not played.",
    phases: [
      { id: "ignition", name: "Ignition", what: "The one Merlin 1D starts.", at: blank("The page gives each hop's height and length, not when its engine started."), burns: { vehicle: count(1, GRASSHOPPER, "A single Merlin-1D engine, the page says.") }, pose: {}, ground: 0, smoke: 0.5 },
      { id: "liftoff", name: "Liftoff", what: "The hop begins.", at: time("+00:00:00", GRASSHOPPER, { note: "The start of the hop's 79 seconds." }), burns: { vehicle: count(1, GRASSHOPPER, "A single Merlin-1D engine, the page says.") }, pose: {}, ground: 0.02, smoke: 0.8 },
      { id: "top", name: "The top of the hop", what: "The highest point.", at: blank("The page gives the height, not the moment."), burns: { vehicle: count(1, GRASSHOPPER, "A single Merlin-1D engine, the page says.") }, pose: {}, ground: 1.6, air: 0.2, altitude: { value: "744 m, the highest of its eight hops", source: GRASSHOPPER } },
      { id: "landing", name: "Landing", what: "It comes down on its fixed legs, 79 seconds after the start.", at: time("+00:01:19", GRASSHOPPER, { note: "The hop's duration, 79 s, from its start." }), burns: {}, pose: { vehicle: { rest: true } }, ground: 0 },
    ],
  },
];

/** Where a part's moving groups stand from a phase on, as degrees from where they are drawn at rest: the groups hold their angles until a later step changes them. A picture; the steps are what the pages say happens. */
type Steps = readonly (readonly [phase: string, angles: Readonly<Record<string, number>>])[];

const MOVE_SOURCES = {
  falcon: { source: "wikipedia-landing-tests", says: "The grid fins are \"stowed on ascent and deployed on reentry\"; the landing burn comes, then the legs open, then the touchdown." },
  superHeavy: { source: "wikipedia-super-heavy", says: "After the boostback the booster descends \"using its grid fins for minor course corrections\"." },
  ship: { source: "wikipedia-ship", says: "The Ship \"controls its reentry with four flaps\", two aft and two forward." },
} as const satisfies Record<string, { source: SourceId; says: string }>;
const MOVES_OF: Readonly<Record<string, readonly (keyof typeof MOVE_SOURCES)[]>> = {
  "falcon-9-starlink-2019": ["falcon"],
  "falcon-9-crs-16": ["falcon"],
  "falcon-heavy-test-flight": ["falcon"],
  "starship-flight-5": ["superHeavy", "ship"],
  "starship-flight-7": ["superHeavy", "ship"],
  "starship-flight-12": ["superHeavy", "ship"],
};

/**
 * What turns in each flight. The pages say the Falcon 9's grid fins are "stowed on ascent and deployed on reentry" and that its legs open in the landing burn, before the touch down (Falcon 9 first-stage landing tests);
 * that Super Heavy steers with its grid fins for minor course corrections after the boostback (Super Heavy); and that the Ship controls its reentry with four flaps, two aft and two forward (Starship). How far a group turns,
 * and the moment inside a phase, are a picture. A painted model that is one shell has nothing here to turn: nothing is cut to fake a move.
 */
const ARTICULATIONS: Readonly<Record<string, Readonly<Record<string, Steps>>>> = {
  "falcon-9-starlink-2019": { "first-stage": [["ignition", { "grid-fins": 85, legs: 0 }], ["entry-burn", { "grid-fins": 0, legs: 0 }], ["landing-burn", { "grid-fins": 0, legs: 60 }]] },
  "falcon-9-crs-16": { "first-stage": [["ignition", { "grid-fins": 85, legs: 0 }], ["entry-burn", { "grid-fins": 0, legs: 0 }], ["landing-burn", { "grid-fins": 0, legs: 60 }]] },
  "falcon-heavy-test-flight": { "side-left": [["side-start", { legs: 0 }], ["side-burn", { legs: 60 }]], "side-right": [["side-start", { legs: 0 }], ["side-burn", { legs: 60 }]] },
  "starship-flight-5": {
    booster: [["boostback-end", { "grid-fins": 10 }], ["booster-landing", { "grid-fins": -10 }], ["booster-three", { "grid-fins": 6 }], ["booster-down", { "grid-fins": 0 }]],
    ship: [["entry", { "forward-flaps": 8, "aft-flaps": 8 }], ["flip", { "forward-flaps": 60, "aft-flaps": 20 }]],
  },
  "starship-flight-7": {
    booster: [["boostback-end", { "grid-fins": 10 }], ["booster-landing", { "grid-fins": -10 }], ["booster-three", { "grid-fins": 6 }], ["booster-down", { "grid-fins": 0 }]],
    ship: [["entry", { "forward-flaps": 8, "aft-flaps": 8 }], ["flip", { "forward-flaps": 60, "aft-flaps": 20 }]],
  },
  "starship-flight-12": {
    booster: [["boostback-end", { "grid-fins": 10 }], ["booster-landing", { "grid-fins": -10 }], ["booster-three", { "grid-fins": 6 }], ["booster-down", { "grid-fins": 0 }]],
    ship: [["entry", { "forward-flaps": 8, "aft-flaps": 8 }], ["ship-burn", { "forward-flaps": 60, "aft-flaps": 20 }]],
  },
};


function articulated(flight: Flight): Flight {
  const rules = ARTICULATIONS[flight.id];
  if (!rules) return flight;
  let note = flight.note ?? "";
  note = note.replace(/No tower, catch arms or moving flaps and fins yet: /, "No tower or catch arms yet: ").replace(/No drone ship or moving legs yet: /, "No drone ship yet: ").replace(/No moving legs or fins yet: /, "").replace(/No tower, catch arms or moving flaps and fins yet\b/, "No tower or catch arms yet");
  return {
    ...flight,
    note: `${note}${note ? " " : ""}Its moving parts turn where the pages say they do: how far, and the moment inside a phase, are a picture.`.trim(),
    moves: (MOVES_OF[flight.id] ?? []).map((key) => MOVE_SOURCES[key]),
    phases: flight.phases.map((phase) => {
      const pose: Record<string, PartPose> = { ...phase.pose };
      for (const [slot, steps] of Object.entries(rules)) {
        let angles: Readonly<Record<string, number>> = {};
        for (const [id, at] of steps) {
          if (flight.phases.findIndex((one) => one.id === id) <= flight.phases.indexOf(phase)) angles = at;
        }
        pose[slot] = { ...(pose[slot] ?? {}), moves: angles };
      }
      return { ...phase, pose };
    }),
  };
}

/**
 * Every flight the package can play, one for each variant that has a timeline. Use `flightOf` to find one.
 *
 * @example
 * ```ts
 * import { FLIGHTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLIGHTS.map((flight) => `${flight.rocket}:${flight.variant}`));
 * ```
 */
export const FLIGHTS: readonly Flight[] = BASE_FLIGHTS.map(articulated);
