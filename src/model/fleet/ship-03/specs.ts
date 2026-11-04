// Miyamoto's numbers and names: identity, the specification table, the journey arithmetic, the engine cards, the named sections and decks, and the history. Every number here is a fictional design target. The physics is
// one function (`journey`), the table and the cards are derived from it so they cannot disagree, and `test/ship-03.test.ts` pins each figure the bible prints. Pure: no three.js and no DOM.
import type { EngineCard, HullStack, Section, SectionRole, Vec3 } from "./adapter.ts";
import { designation, FLEET_MAKER, HULL_STACKS } from "./adapter.ts";
import { ENVELOPE, MASS, RADIATOR_AREA } from "./dims.ts";

/** Speed of light, standard gravity, a light year and a Julian year, in SI units. */
export const C = 299_792_458;
export const G0 = 9.80665;
export const LIGHT_YEAR = 9_460_730_472_580_800;
export const YEAR = 31_557_600;

/** Who operates the fleet: just SPX, never spelled out. One line, so it can change if John says so. */
export const OPERATOR = FLEET_MAKER;

/** Who and what the ship is. The name is checked by the Japanese reviewer. */
export const IDENTITY = {
  designation: designation("452"),
  type: "ICV",
  typeMeans: "Interstellar Command Vessel",
  class: "Romurusu",
  classKanji: "ロムルス級",
  classMeaning: "after Romulus",
  prefix: "ISV",
  prefixMeans: "Interstellar Service Vehicle",
  computer: "KAZE core v4",
  drive: "DCD",
  driveMeans: "Directed Conversion Drive",
  fleetNumber: 3,
  maker: OPERATOR,
  japanese: "宮本",
  romaji: "Miyamoto",
  english: "Miyamoto",
  meaning: "at the foot of the shrine",
  line: "Flagship. The stately ship that commands the whole fleet.",
  designed: 2448,
  keelLaid: 2452,
  firstFlight: 2456,
  inService: 2459,
  status: "PLANNED",
  role: "interstellar command vessel",
} as const;

/** The approved performance: 0.040 g sustained, 0.63 c effective exhaust, 0.400 c shield limit. */
export const DRIVE = { acceleration: 0.04, exhaustOfC: 0.63, shieldLimitOfC: 0.4, briefPeakG: 0.05, briefPeakSeconds: 120 } as const;

/** The trip between two places `distance` light years apart, accelerating at `g` and turning round at halfway: the numbers of the rocket and the clocks. */
export interface Journey {
  distanceLy: number;
  acceleration: number;
  /** Rapidity at the flip, and the peak speed as a fraction of c. */
  rapidity: number;
  peak: number;
  /** Years by the ship's clocks and by the clocks of the two ends. */
  onboardYears: number;
  endpointYears: number;
  /** Ideal mass ratio for a directed exhaust of speed `exhaustOfC`, and the mass at arrival for a given departure mass, tonnes. */
  massRatio: number;
  arrivalMass: number;
  /** Thrust at the departure mass, newtons; the exhaust's kinetic power at launch, watts; and the share of the expelled mass-energy that becomes directed kinetic energy. */
  thrust: number;
  jetPower: number;
  convertedShare: number;
}

/**
 * The idealised flip-and-burn journey at constant proper acceleration. For length D and acceleration a, the rapidity at the midpoint is acosh(1 + aD / 2c^2), the peak speed c tanh(rapidity), the time on board 2c rapidity / a and the time in the frame of the two ends 2c sinh(rapidity) / a.
 *
 * @param distanceLy Light years.
 * @param g Acceleration in g.
 * @param exhaustOfC Effective exhaust speed as a fraction of c.
 * @param fullMass Departure mass in tonnes.
 * @returns The journey's numbers.
 * @example
 * ```ts
 * import { journey } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const trip = journey(4.37, 0.04, 0.63, 105_000);
 * console.log(trip.onboardYears.toFixed(3), trip.endpointYears.toFixed(3));
 * ```
 */
export function journey(distanceLy: number, g: number = DRIVE.acceleration, exhaustOfC: number = DRIVE.exhaustOfC, fullMass: number = MASS.full): Journey {
  const a = g * G0;
  const d = distanceLy * LIGHT_YEAR;
  const rapidity = Math.acosh(1 + (a * d) / (2 * C * C));
  const massRatio = Math.exp((2 * rapidity) / exhaustOfC);
  const gamma = 1 / Math.sqrt(1 - exhaustOfC * exhaustOfC);
  const thrust = fullMass * 1000 * a;
  const flow = thrust / (gamma * exhaustOfC * C);
  return {
    distanceLy,
    acceleration: g,
    rapidity,
    peak: Math.tanh(rapidity),
    onboardYears: (2 * C * rapidity) / a / YEAR,
    endpointYears: (2 * C * Math.sinh(rapidity)) / a / YEAR,
    massRatio,
    arrivalMass: fullMass / massRatio,
    thrust,
    jetPower: flow * (gamma - 1) * C * C,
    convertedShare: 1 - 1 / gamma,
  };
}

/** The distances of the two benchmark routes: the 4.37 light-year design benchmark and the 4.25 light-year Proxima example. */
export const ROUTES = { benchmark: 4.37, proxima: 4.25 } as const;

/** What the ship's fuel and its shield allow: the ideal speed at the midpoint if it burned down to the protected reserve, as a fraction of c. */
export const idealMidpoint = (exhaustOfC: number = DRIVE.exhaustOfC): number => Math.tanh((exhaustOfC * Math.log(MASS.full / (MASS.full - (MASS.propellant - MASS.reserve)))) / 2);

/** The longest symmetric start-to-stop burn the shield limit allows at the listed acceleration, in light years. */
export function longestBurnLy(g: number = DRIVE.acceleration, limit: number = DRIVE.shieldLimitOfC): number {
  const a = g * G0;
  return (2 * C * C * (Math.cosh(Math.atanh(limit)) - 1)) / a / LIGHT_YEAR;
}

/** The specification table, as lines a sheet prints. */
export interface Line {
  name: string;
  value: string;
  note?: string;
}

const n = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits });

export function specification(): Line[] {
  const j = journey(ROUTES.benchmark);
  const p = journey(ROUTES.proxima);
  return [
    { name: "Designation", value: `${IDENTITY.prefix} ${IDENTITY.romaji}, ${IDENTITY.designation}`, note: `${IDENTITY.class} class (${IDENTITY.classKanji}, "${IDENTITY.classMeaning}"), ${IDENTITY.type} type (${IDENTITY.typeMeans}); flagship and command; sister of ISV Ariake, SPX-186` },
    { name: "Name", value: `${IDENTITY.japanese} ${IDENTITY.romaji}`, note: IDENTITY.meaning },
    { name: "Length", value: `${ENVELOPE.length} m` },
    { name: "Beam", value: `${ENVELOPE.beam} m`, note: "across both hangar shoulders" },
    { name: "Height", value: `${ENVELOPE.height} m`, note: "keel to the dorsal pod" },
    { name: "Dry mass", value: `${n(MASS.inert)} t`, note: `${n(MASS.cargo)} t of cargo inside it` },
    { name: "Full mass", value: `${n(MASS.full)} t`, note: `${n(MASS.propellant)} t of propellant, ${n(MASS.reserve)} t of it protected reserve` },
    { name: "Crew", value: "144 nominal, 216 with the extended-expedition berths", note: "180 evacuees for up to 30 days" },
    { name: "Main drive", value: "2 DCD, Directed Conversion Drives", note: `${n(j.thrust / 1e6, 1)} MN together at departure mass; effective exhaust ${DRIVE.exhaustOfC} c` },
    { name: "Manoeuvring", value: "4 plasma verniers, 24 attitude thrusters", note: "trim, docking and the flip; they cannot brake the ship" },
    { name: "Ship computer", value: IDENTITY.computer, note: "KAZE: Kinetic Autonomous Zonal Executive; its core sits in the communications core of the citadel" },
    { name: "Small craft", value: "ATC (Auxiliary Transfer Craft) berths in both bays", note: "the starboard bay is the rescue cradle, the port bay three survey cradles; the craft are designed separately" },
    { name: "Power", value: "2 auxiliary fusion plants of 120 MW(e), 1 fission emergency unit of 12 MW(e)" },
    { name: "Heat rejection", value: `${n(RADIATOR_AREA)} m2 of radiator in eight leaves`, note: "0.8 GW effective" },
    { name: "Acceleration", value: `${DRIVE.acceleration} g sustained`, note: `${DRIVE.briefPeakG} g for up to ${DRIVE.briefPeakSeconds} s with the thermal buffer charged; not used for journey planning` },
    { name: "Peak speed", value: `${(j.peak * 100).toFixed(2)}% of c on the ${ROUTES.benchmark} light-year route`, note: `shield limit ${DRIVE.shieldLimitOfC} c` },
    { name: "Theoretical speed", value: `${(idealMidpoint() * 100).toFixed(1)}% of c`, note: "the ideal midpoint with the protected reserve; not permitted by the shield limit" },
    { name: `${ROUTES.benchmark} light years`, value: `${j.onboardYears.toFixed(2)} years aboard, ${j.endpointYears.toFixed(2)} years at the ends` },
    { name: `Proxima Centauri, ${ROUTES.proxima} light years`, value: `${p.onboardYears.toFixed(2)} years aboard, ${p.endpointYears.toFixed(2)} years in Earth's frame` },
    { name: "Range", value: `${longestBurnLy().toFixed(2)} light years`, note: "the longest start-to-stop burn within the shield limit at 0.040 g" },
    { name: "Endurance", value: "32 years aboard at the normal complement" },
  ];
}

/** The engine cards of the ship: the main drive, the verniers and the attitude thrusters. The main drive's thrust is the ship's mass times its acceleration, and the numbers on each card agree with the journey. */
export const ENGINES: Readonly<Record<string, EngineCard>> = (() => {
  const j = journey(ROUTES.benchmark);
  const exhaust = DRIVE.exhaustOfC * C;
  const gamma = 1 / Math.sqrt(1 - DRIVE.exhaustOfC ** 2);
  const mainThrust = j.thrust / 2;
  const card = (c: Omit<EngineCard, "massFlow" | "exhaust" | "exhaustOfC" | "jetPower">, relativistic = false): EngineCard => {
    const v = relativistic ? exhaust : c.isp * G0;
    const flow = relativistic ? c.thrust / (gamma * v) : c.thrust / v;
    return { ...c, massFlow: flow, exhaust: v, exhaustOfC: v / C, jetPower: relativistic ? flow * (gamma - 1) * C * C : 0.5 * c.thrust * v };
  };
  return {
    "miyamoto-main": card(
      { id: "miyamoto-main", name: "Directed Conversion Drive (DCD), main", role: "main", module: "drive", count: 2, thrust: mainThrust, isp: exhaust / G0, fuel: "deuterium-helium-3 slurry, converted to a directed beam", fuelCapacity: MASS.propellant, operation: "continuous", note: "Proposed. A fusion-triggered conversion process that turns about 22% of the expelled mass-energy into a directed beam at 0.63 c. Two nozzles, recessed in the tail, with coil-lined throats. It also does the braking burn, after the ship turns end for end." },
      true,
    ),
    "miyamoto-vernier": card({ id: "miyamoto-vernier", name: "Plasma vernier, manoeuvring", role: "manoeuvring", module: "drive", count: 4, thrust: 0.9e6, isp: 60_000, fuel: "hydrogen plasma", fuelCapacity: 600, operation: "continuous", note: "Proposed. Four low-power plasma thrusters at the aft corners that trim, dock and turn the ship. Too weak to brake it." }),
    "miyamoto-attitude": card({ id: "miyamoto-attitude", name: "Attitude thruster block", role: "vernier", module: "command", count: 24, thrust: 40_000, isp: 3000, fuel: "nitrogen gas", fuelCapacity: 90, operation: "pulsed", pulseHz: 20, note: "Proposed. Cold-gas blocks at the corners of the citadel and the drive frame for fine pointing and the flip." }),
  };
})();

/** The hull stack of the armoured ship, outside in. */
export const HULL: HullStack = HULL_STACKS.command;

/** One named section, between two stations on the spine. A deck is a flat floor across the beam, stacked up the spine; the label points at (x, z). */
export interface MiyamotoSection extends Omit<Section, "from" | "to" | "reach"> {
  module: string;
  y0: number;
  y1: number;
  at: readonly [number, number];
}

const s = (module: string, id: string, name: string, role: SectionRole, y0: number, y1: number, x: number, z: number, does: string, deck = false): MiyamotoSection => ({ module, id, name, role, y0, y1, at: [x, z], does, ...(deck ? { deck } : {}) });

/** Every named section of the ship, tail to bow. More than one for every 3 to 5% of its 380 m, with the sub-parts inside each module. */
export const SECTIONS: readonly MiyamotoSection[] = [
  s("drive", "vernier-pods", "Vernier pods", "engine", 0, 9, 41, 17, "Four plasma verniers at the aft corners that steer and dock.", true),
  s("drive", "nozzles", "Main nozzles, port and starboard", "engine", 2, 31, 22, 0, "Shape the DCD exhaust into a beam."),
  s("drive", "field-coils", "Field coils", "power", 4, 34, -22, 8, "Copper rings, one every 1.8 m, that hold the plasma off the throat."),
  s("drive", "throat-rings", "Throat rings", "structure", 28, 34, -22, 0, "Steel collars at the narrowest part."),
  s("drive", "exit-shutters", "Exit lips and shutter leaves", "hatch", 0, 3, 0, 20, "Orange shutters that close over each bore at rest."),
  s("drive", "feed", "Feed manifolds and chamber heads", "line", 46, 56, 22, 8, "Meter fuel and reaction mass into each chamber."),
  s("drive", "gimbals", "Gimbal actuators", "structure", 44, 54, -22, -14, "Tilt each nozzle a few degrees."),
  s("drive", "thrust-bulkhead", "Blast bulkhead", "structure", 56, 58.4, 0, 12, "A heavy slab behind the bores that stops a coupling fault reaching the ship.", true),
  s("drive", "shadow-collar", "Shadow-shield collar (removable)", "shield", 36, 58, 0, 0, "A round ceramic-tile cone that steps from the engines to the hull; its own part, swappable with none.", true),
  s("drive", "heat-sinks", "Heat-sink louvres", "thermal", 6, 12, -30, 23, "Vents that dump waste heat from the frame."),
  s("drive", "drive-bay", "Drive bay: nozzle crews' deck", "crew", 12, 22, 8, 0, "A walk-through deck for the engine crew behind the bores.", true),
  s("engineering", "isolation-locks", "Isolation locks", "hatch", 75, 77, 0, 3, "Two doors and an airlock between the propulsion and hotel loops."),
  s("engineering", "reactor", "Reactor chamber", "power", 60, 74, -6.5, 1.5, "The vessel and field rings of the starboard-side drive reactor.", true),
  s("engineering", "aux-power", "Auxiliary power units", "power", 61, 70, 7, -5, "Two isolated 120 MW(e) fusion plants, each in its own cage.", true),
  s("engineering", "battery", "Emergency fission battery room", "power", 77, 86, 7, 2, "Twelve sealed cells for the 12 MW(e) emergency unit.", true),
  s("engineering", "breakers", "Distribution breakers", "power", 78, 89, -11, -1, "Cabinets that keep the propulsion and hotel buses apart."),
  s("engineering", "service-corridor", "Locked-out service corridor", "structure", 59, 89, 0, -6, "A catwalk along the hull that crews use when the drive is off.", true),
  s("fuel-aft", "barrel-aft-s", "Aft starboard barrel", "tank", 92, 164, 24, -12, "22 m by 72 m propellant barrel with water jacket and cassettes.", true),
  s("fuel-aft", "barrel-aft-p", "Aft port barrel", "tank", 92, 164, -24, -12, "The port twin: the pair draws down symmetrically."),
  s("fuel-aft", "feed-lines-aft", "Feed lines and crossfeed", "line", 93, 163, 8, -10, "Tank to spine, with a crossfeed between port and starboard."),
  s("fuel-aft", "header-tank", "Header tank", "tank", 146, 166, 0, -14, "Holds a few minutes of fuel so the drive never starves while a barrel is isolated.", true),
  s("fuel-aft", "spine-aft", "Spine, aft section", "structure", 90, 170, 0, 10, "The load-bearing box with conduit bundles and ring frames."),
  s("fuel-aft", "cassettes-aft", "Vented fuel cassettes", "hatch", 100, 156, 35, -12, "Removable orange cassettes that vent boil-off."),
  s("hangar-starboard", "rescue-bay", "Rescue bay and gantry", "cargo", 116, 192, 41, 12, "The aft shoulder's bay: gantry crane, racks, and the cradle with clamp arms for an ATC rescue cutter.", true),
  s("hangar-starboard", "rescue-door", "Rescue bay door and shutters", "hatch", 116, 192, 59, 12, "Three of five orange shutter leaves open."),
  s("hangar-starboard", "vestibule", "Pressure vestibule", "hatch", 105, 111, 41, 5, "Where crews pass from the bay to the spine.", true),
  s("hangar-starboard", "racks-s", "Maintenance racks", "cargo", 108, 200, 24, 12, "Shelving with spares along the inner wall.", true),
  s("fuel-fore", "barrel-fore-s", "Fore starboard barrel", "tank", 174, 246, 24, -12, "Fore twin of the aft pair.", true),
  s("fuel-fore", "barrel-fore-p", "Fore port barrel", "tank", 174, 246, -24, -12, "Port twin of the fore pair."),
  s("fuel-fore", "collar-base", "Keyed dorsal collar", "dock", 174, 234, 0, 14, "The mount that takes a command, relay, relief or survey pod, with capped utility sockets."),
  s("fuel-fore", "keel-dock", "Ventral keel and dock", "dock", 188, 212, 0, -38, "A pylon below the spine with a docking collar on its foot.", true),
  s("fuel-fore", "feed-lines-fore", "Feed lines and valves, fore", "line", 175, 245, -8, -10, "The fore pair's lines and isolation valves."),
  s("pod", "isolator", "Collar isolator", "structure", 174, 234, 0, 13, "A drum with pressure and power locks, so a pod swaps at a dock.", true),
  s("pod", "payload", "Mission pod payload", "cargo", 178, 230, 0, 26, "The relay pod's bay and dishes, the relief pod's six containers, or the survey pod's telescope and probes.", true),
  s("pod", "dishes", "Dishes and arrays", "comms", 180, 228, 6, 32, "Four dishes and three phased arrays on the relay pod."),
  s("hangar-port", "survey-bay", "Survey bay", "lab", 234, 306, -41, 12, "Drones on racks and an access bridge, opening to port.", true),
  s("hangar-port", "survey-door", "Survey bay shutters", "hatch", 234, 306, -59, 12, "Five orange emergency shutter leaves."),
  s("hangar-port", "drone-racks", "Survey cradles", "cargo", 230, 310, -41, 4, "Three cradles with clamp arms and guide rails to the door.", true),
  s("habitat", "recycling", "Water and air recycling", "farm", 285, 300, 0, 0, "Water and air tanks, scrubbers and a heat exchanger.", true),
  s("habitat", "mess-farm", "Mess and hydroponics", "farm", 272, 285, 6, -4, "Four tables and a rack of green trays under strip lights.", true),
  s("habitat", "crew-quarters", "Crew quarters", "crew", 259, 272, 0, 8, "Two tiers of bunks in two rows.", true),
  s("habitat", "triage", "Triage bay, six berths", "medical", 251, 259, -4, -4, "Six berths and a quarantine room.", true),
  s("habitat", "transfer-lock", "Medical transfer lock", "hatch", 251, 258, -11, 8, "Where casualties come in from the bays."),
  s("habitat", "portholes", "Portholes with burn shutters", "hatch", 258, 290, 13, 0, "Three rings of twelve round windows, each with a shutter that closes for a burn."),
  s("habitat", "radiator-seat", "Radiator seats", "thermal", 252, 300, 0, 14, "Rails for the dorsal and ventral banks."),
  s("command", "ops-ring", "Operations ring", "nav", 316, 332, 0, 0, "Fourteen consoles round the communications core.", true),
  s("command", "comms-core", "Communications core and KAZE core v4", "comms", 304, 348, 0, 0, "The tall tube through every deck, with the ship computer KAZE in it.", true),
  s("command", "nav-desk", "Navigation desk", "nav", 330, 340, 0, 4, "A star-map table and three seats.", true),
  s("command", "medical-link", "Medical link and escape passages", "medical", 304, 330, 0, -12, "A transfer tube to the habitat and two passages to the dorsal and ventral hatches.", true),
  s("command", "armour", "Armour laminate", "shield", 302, 350, 21, 0, "Eight layers, 1.1 m in all.", true),
  s("command", "obs-dome", "Armoured observation dome", "nav", 316, 326, 0, 16, "A faceted glass dome in an armoured ring above the operations ring, with eight ribs and a burn shutter.", true),
  s("command", "solarium", "Solarium", "farm", 316, 326, 13, 16, "A glazed garden hall beside the dome, with beds, grow-lamps and shutters, lit at night.", true),
  s("command", "cameras", "Remote cameras", "nav", 306, 346, 14, 16, "Domed heads on posts replace a bridge window.", true),
  s("command", "booms", "Aerial booms and beacons", "comms", 308, 316, 36, 0, "Two trusses with ring beacons."),
  s("command", "attitude", "Attitude thruster blocks", "engine", 302, 350, 22, 12, "Four nozzles in each corner block."),
  s("bow", "shield-1", "Shield layer 1", "shield", 350, 361, 0, 18, "The widest, rearmost layer of the spaced stack."),
  s("bow", "shield-2", "Shield layer 2", "shield", 362, 370, 0, 14, "The middle layer, with the intercept mounts."),
  s("bow", "shield-3", "Shield layer 3", "shield", 371, 377, 0, 10, "The front layer, carrying the apertures."),
  s("bow", "ranging", "Ranging apertures", "nav", 376, 379, 5, 4, "Four steerable lenses in gimbal rings.", true),
  s("bow", "optics", "Retracted optical heads", "nav", 376, 379, -12, 0, "Six heads in recesses; shut through the burn.", true),
  s("bow", "intercept", "Debris-intercept mounts", "shield", 362, 372, 0, 14, "Two turrets with a pair of barrels each.", true),
  s("bow", "side-apertures", "Side apertures", "nav", 353, 361, 18, 0, "Redundant eyes if the front is damaged."),
  s("bow", "crush-cells", "Crush cells", "structure", 350, 378, 0, 0, "Honeycomb inside each layer.", true),
];

/** One label of a sheet: the same shape as the kit's, in ship metres. */
export interface MiyamotoLabel {
  id: string;
  module: string;
  text: string;
  does: string;
  role: SectionRole;
  at: Vec3;
  side: "left" | "right";
  deck?: number;
}

/** The labels of the whole ship, alternating sides by their side of the spine. */
export function labels(): MiyamotoLabel[] {
  const decks = deckSummary();
  return SECTIONS.map((section, i) => ({
    id: `${section.module}/${section.id}`,
    module: section.module,
    text: section.name,
    does: section.does,
    role: section.role,
    at: [section.at[0], (section.y0 + section.y1) / 2, section.at[1]] as Vec3,
    side: section.at[0] === 0 ? (i % 2 === 0 ? "left" : "right") : section.at[0] < 0 ? "left" : "right",
    ...(section.deck ? { deck: decks.find((d) => d.id === section.id)?.number } : {}),
  }));
}

/** The numbered deck summary, bow to stern: deck 1 is the front layer of the shield stack. */
export function deckSummary(): { number: number; id: string; name: string; does: string; role: SectionRole; module: string; from: number; to: number }[] {
  const all = SECTIONS.filter((section) => section.deck).sort((a, b) => b.y1 - a.y1 || b.y0 - a.y0);
  return all.map((section, i) => ({ number: i + 1, id: section.id, name: section.name, does: section.does, role: section.role, module: section.module, from: section.y0, to: section.y1 }));
}

/** How many sections for each hundred metres, and the share of the length each stands for. */
export const labelDensity = (): { labels: number; perHundredMetres: number; shareEach: number } => ({ labels: SECTIONS.length, perHundredMetres: (SECTIONS.length / ENVELOPE.length) * 100, shareEach: 1 / SECTIONS.length });

/** The programme, strengths and weaknesses, and the operating limits, as short paragraphs. Every date is a plan: the ship is in development. */
export const HISTORY = {
  development: "The programme was approved in 2448 after a relay failure in the outer system showed that an expedition's command ship must keep working when it is damaged: its command, navigation and medical systems on buses of their own, and two bays that can be used one at a time.",
  commissioning: "The keel is planned for 2452 at the orbital yard, the first flight for 2456 and entry into service for 2459, as the first command ship built to keep an expedition running after a casualty.",
  service: "The planned trials include a relay-failure exercise in 2459: the main drive switched off, navigation and medical power kept on the independent buses, crews recovered through the forward bay while the aft bay handles repairs. The exercise is why the two bays have separate airlocks and shutters and why the medical air and power are isolated from both.",
  strengths: "Independent command and medical systems, protected navigation, two separately usable bays, armour.",
  weaknesses: "Moderate acceleration, limited payload for the volume, a high sensitivity to heat, and a long exposure to the hazards of the route.",
  limits: "0.040 g sustained, 0.400 c, a heat budget of 0.8 GW, and no manoeuvres or thrust on loss of attitude, shield, feed or radiator margin.",
} as const;

/** The title-block line of every sheet: the prefix and name, the registry number, the class, the operator, the drive and the ship computer. */
export const TITLE_BLOCK = `${IDENTITY.prefix} ${IDENTITY.romaji}, ${IDENTITY.designation} · ${IDENTITY.class} class · ${IDENTITY.type} · ${OPERATOR} · ${IDENTITY.drive} ×2 · ${IDENTITY.computer}`;

/** The ships of the class: one model, each with its own name, ruby, registry, hull marks and mission pod. */
export const SHIPS = {
  miyamoto: { variant: "miyamoto", romaji: "Miyamoto", kanji: "宮本", ruby: "みやもと", registry: designation("452"), meaning: "at the foot of the shrine", marks: "452", pod: "relay" },
  ariake: { variant: "ariake", romaji: "Ariake", kanji: "有明", ruby: "ありあけ", registry: designation("186"), meaning: "daybreak", marks: "186", pod: "survey" },
} as const;

/** The title-block line of a ship of the class. */
export const titleBlockOf = (ship: keyof typeof SHIPS): string => `${IDENTITY.prefix} ${SHIPS[ship].romaji}, ${SHIPS[ship].registry} · ${IDENTITY.class} class · ${IDENTITY.type} · ${OPERATOR} · ${IDENTITY.drive} ×2 · ${IDENTITY.computer}`;

/** The status line of a sheet's title block, in the story: a planned ship with a first flight, never one in service. */
export const STATUS = `STATUS: ${IDENTITY.status} · FIRST FLIGHT ${IDENTITY.firstFlight}`;

/** The real hardware each module descends from, so the ship reads as engineering a few centuries on and not as blocks. NASA's pictures and studies are public; nothing here is copied, only the pattern. */
export const ANCESTORS: Readonly<Record<string, string>> = {
  drive: "the reaction chamber and magnetic nozzle of the Daedalus fusion study, the plumbing of Starship's Raptors, and the thrust structure of Saturn V's F-1 cluster",
  engineering: "the ISS's Zvezda service module, a round pressure drum with berthing rings, and the reactor and shadow-shield section of NASA's crewed Mars transfer vehicle studies",
  "fuel-aft": "Saturn V's and Starship's tank barrels with their domes and ring frames, strung on the open truss of the ISS and of the Mars transfer vehicle studies",
  "fuel-fore": "Saturn V's and Starship's tank barrels with their domes and ring frames, strung on the open truss of the ISS and of the Mars transfer vehicle studies, with the ISS's berthing ring for the dorsal collar",
  habitat: "the ISS's Destiny and Node modules and Skylab's workshop: a round pressure volume with berthing rings and portholes, wrapped in white blanket",
  command: "Orion's crew module under its micrometeoroid shield and heat shield, enlarged and armoured, with Hubble-style equipment bays",
  bow: "the ISS's Whipple shields and Orion's heat shield: spaced layers held off the hull on struts",
  "hangar-starboard": "the Shuttle's payload bay and its robot arm's rails, with the crane rails, cell guides and lashing points of a container port",
  "hangar-port": "the Shuttle's payload bay and its robot arm's rails, with the crane rails, cell guides and lashing points of a container port",
  pod: "the ISS's docking ring and the Shuttle's payload pallets; the relay pod carries Hubble-like high-gain dishes and a deep-space network array, the relief pod stacked container racks, the survey pod a Hubble-like telescope in a yoke and a rack of probes",
  collar: "the shadow shields of NASA's nuclear thermal rocket and Mars transfer vehicle studies, a round cone between the reactor and the crew",
  radiators: "the ISS's radiator panels on booms, large thin plates set away from the hull, and the folding radiators of the Mars transfer vehicle studies",
};
