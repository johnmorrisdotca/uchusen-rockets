// ISV Hanabusa's numbers and names: identity, the specification table, the journey arithmetic, the engine cards, the named sections and decks, the history and the life aboard. Every number is a fictional design target. The physics is one
// function (`journey`); the table and the cards are derived from it so they cannot disagree, and `test/ship-01.test.ts` pins each figure the bible prints. Pure: no three.js and no DOM.
import type { EngineCard, HullStack, Section, SectionRole, Vec3 } from "./adapter.ts";
import { designation, FLEET_MAKER, HULL_STACKS } from "./adapter.ts";
import { rings, RING_ORDER_DEFAULT } from "./rings.ts";
import { SPINE, SPINE_Y } from "./hull.ts";
import { gAt, rpmFor, SPIN, SPIN4 } from "./spin.ts";

/** Speed of light, standard gravity, a light year and a Julian year, in SI units. */
export const C = 299_792_458;
export const G0 = 9.80665;
export const LIGHT_YEAR = 9_460_730_472_580_800;
export const YEAR = 31_557_600;

/** Who operates the fleet: just SPX, never spelled out. */
export const OPERATOR = FLEET_MAKER;

/** The drive's code in the fleet's words: the glossary has FTD and DCD, and this ship's drive is the MND. */
export const MND = { code: "MND", means: "Magnetic Nozzle Drive" } as const;

/** Who and what the ship is. The name is for a native check. */
export const IDENTITY = {
  designation: designation("013"),
  type: "IXV",
  typeMeans: "Interstellar eXploration Vessel",
  class: "Hanabusa",
  prefix: "ISV",
  prefixMeans: "Interstellar Service Vehicle",
  computer: "KAZE core v4",
  drive: MND.code,
  driveMeans: MND.means,
  fleetNumber: 1,
  maker: OPERATOR,
  japanese: "花房",
  romaji: "Hanabusa",
  english: "Hanabusa",
  meaning: "flower cluster",
  line: "Explorer ship. It travels through distant regions of space and brings back the star fragments it finds.",
  designed: 2452,
  keelLaid: 2456,
  firstFlight: 2461,
  inService: 2464,
  status: "PLANNED",
  role: "interstellar exploration vessel",
} as const;

/** The approved performance: 0.060 g sustained, 0.70 c effective exhaust, 0.55 c shield limit. */
export const DRIVE = { acceleration: 0.06, exhaustOfC: 0.7, shieldLimitOfC: 0.55, thrusters: 19, trimPods: 6 } as const;

/** Departure mass in tonnes: the ship empty, its propellant and the protected reserve of it kept for the brake. */
export const MASS = { inert: 60_000, propellant: 265_000, reserve: 12_000, full: 325_000, crew: 1_200 } as const;

/** What the ship measures: its length from the thruster flares to the dome, and the beam and height of its largest wheel. */
export const ENVELOPE = { length: 595, beam: 225, height: 225 } as const;

/** The trip between two places `distance` light years apart, accelerating at `g` and turning round at halfway. */
export interface Journey {
  distanceLy: number;
  acceleration: number;
  rapidity: number;
  peak: number;
  onboardYears: number;
  endpointYears: number;
  massRatio: number;
  arrivalMass: number;
  thrust: number;
  jetPower: number;
  convertedShare: number;
}

/**
 * The idealised flip-and-burn journey at constant proper acceleration: the rapidity at the midpoint is acosh(1 + aD / 2c^2), the peak speed c tanh(rapidity), the time on board 2c rapidity / a and the time in the frame of the two
 * ends 2c sinh(rapidity) / a. The mass ratio is exp(2 rapidity / e) for an effective exhaust speed of e times c.
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
 * const trip = journey(4.37, 0.06, 0.7, 325_000);
 * console.log(trip.onboardYears.toFixed(2), trip.endpointYears.toFixed(2));
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
  return { distanceLy, acceleration: g, rapidity, peak: Math.tanh(rapidity), onboardYears: (2 * C * rapidity) / a / YEAR, endpointYears: (2 * C * Math.sinh(rapidity)) / a / YEAR, massRatio, arrivalMass: fullMass / massRatio, thrust, jetPower: flow * (gamma - 1) * C * C, convertedShare: 1 - 1 / gamma };
}

/** The distances of the two benchmark routes: the 4.37 light-year design benchmark and the 4.25 light-year Proxima example. */
export const ROUTES = { benchmark: 4.37, proxima: 4.25 } as const;

/** The ideal speed at the midpoint if the ship burned down to its protected reserve, as a fraction of c. */
export const idealMidpoint = (exhaustOfC: number = DRIVE.exhaustOfC): number => Math.tanh((exhaustOfC * Math.log(MASS.full / (MASS.full - (MASS.propellant - MASS.reserve)))) / 2);

/** The longest symmetric start-to-stop burn the shield limit allows at the listed acceleration, in light years. */
export function longestBurnLy(g: number = DRIVE.acceleration, limit: number = DRIVE.shieldLimitOfC): number {
  const a = g * G0;
  return (2 * C * C * (Math.cosh(Math.atanh(limit)) - 1)) / a / LIGHT_YEAR;
}

/** One line of a table a sheet prints. */
export interface Line {
  name: string;
  value: string;
  note?: string;
}

const n = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits });

/** The wheels' numbers as the sheets print them: radius, rpm and g, from the one place that computes them. */
export function wheelLines(): Line[] {
  return [
    { name: "Garden, research and living rings", value: `${SPIN4.rings.map((r) => `${r.rOut} m`).join(", ")} radius, ${SPIN4.sharedRpm.toFixed(2)} rpm on one bearing`, note: `graded gravity: garden ${gAt(48, SPIN4.sharedRpm).toFixed(2)} g, research ${gAt(62, SPIN4.sharedRpm).toFixed(2)} g, living ${gAt(76, SPIN4.sharedRpm).toFixed(2)} g at the rim; the alternative, one bearing and rpm for each ring, would be ${SPIN4.ownRpm.map((r) => r.toFixed(2)).join(", ")} rpm for 1.00 g` },
    { name: "Industrial wheel", value: `${SPIN.industrial.rOut} m radius, ${SPIN.industrial.rpm1g.toFixed(2)} rpm = 1.00 g`, note: `${rpmFor(SPIN.industrial.rOut, 0.5).toFixed(2)} rpm = 0.50 g; closed, apart, behind the rings; yard, quarantine and stores` },
  ];
}

/** The specification table, as lines a sheet prints. */
export function specification(): Line[] {
  const j = journey(ROUTES.benchmark);
  const p = journey(ROUTES.proxima);
  return [
    { name: "Designation", value: `${IDENTITY.prefix} ${IDENTITY.romaji}, ${IDENTITY.designation}`, note: `${IDENTITY.class} class, ${IDENTITY.type} type (${IDENTITY.typeMeans}); interstellar explorer, the fleet's wheel ship` },
    { name: "Name", value: `${IDENTITY.japanese} ${IDENTITY.romaji}`, note: IDENTITY.meaning },
    { name: "Length", value: `${ENVELOPE.length} m` },
    { name: "Beam", value: `${ENVELOPE.beam} m`, note: "across the industrial wheel" },
    { name: "Height", value: `${ENVELOPE.height} m`, note: "the wheel's diameter, seen from the side" },
    { name: "Dry mass", value: `${n(MASS.inert)} t` },
    { name: "Full mass", value: `${n(MASS.full)} t`, note: `${n(MASS.propellant)} t of propellant, ${n(MASS.reserve)} t of it protected reserve` },
    { name: "Crew", value: `${n(MASS.crew)} nominal, 2,400 at most`, note: "in three glazed rings, one town to a ring" },
    { name: "Main drive", value: `${DRIVE.thrusters} MND (${MND.means}) thrusters in a ring of twelve, a ring of six and one on the axis`, note: `${n(j.thrust / 1e6, 0)} MN together at departure mass; effective exhaust ${DRIVE.exhaustOfC} c` },
    { name: "Trim and spin-up", value: `${DRIVE.trimPods} plasma trim pods, three at the tail of each boom`, note: "trim, docking, and spinning the rings up and down" },
    ...wheelLines(),
    { name: "Ship computer", value: IDENTITY.computer, note: "KAZE: Kinetic Autonomous Zonal Executive; its core sits in the navigation deck" },
    { name: "Small craft", value: "ATC (Auxiliary Transfer Craft) and survey probes in the survey pod's bay", note: "the bay is shown empty, with its cradle and rails" },
    { name: "Power", value: "1 fusion reactor, 3 solar skirts as the rings' own supply", note: "the skirts carry the wheels' light and the greenhouse; the reactor carries the drive" },
    { name: "Acceleration", value: `${DRIVE.acceleration} g sustained`, note: "the fleet's fastest ship" },
    { name: "Peak speed", value: `${(j.peak * 100).toFixed(2)}% of c on the ${ROUTES.benchmark} light-year route`, note: `shield limit ${DRIVE.shieldLimitOfC} c` },
    { name: "Theoretical speed", value: `${(idealMidpoint() * 100).toFixed(1)}% of c`, note: "the ideal midpoint with the protected reserve; not permitted by the shield limit" },
    { name: `${ROUTES.benchmark} light years`, value: `${j.onboardYears.toFixed(2)} years aboard, ${j.endpointYears.toFixed(2)} years at the ends` },
    { name: `Proxima Centauri, ${ROUTES.proxima} light years`, value: `${p.onboardYears.toFixed(2)} years aboard, ${p.endpointYears.toFixed(2)} years in Earth's frame` },
    { name: "Range", value: `${longestBurnLy().toFixed(2)} light years`, note: `the longest start-to-stop burn within the shield limit at ${DRIVE.acceleration.toFixed(3)} g` },
    { name: "Endurance", value: "40 years aboard at the normal complement" },
  ];
}

/** The engine cards of the ship: the main thrusters, the trim pods. The main thrust is the ship's mass times its acceleration, shared by the thrusters, and the numbers on each card agree with the journey. */
export const ENGINES: Readonly<Record<string, EngineCard>> = (() => {
  const j = journey(ROUTES.benchmark);
  const exhaust = DRIVE.exhaustOfC * C;
  const gamma = 1 / Math.sqrt(1 - DRIVE.exhaustOfC ** 2);
  const mainThrust = j.thrust / DRIVE.thrusters;
  return {
    "hanabusa-main": { id: "hanabusa-main", name: "Magnetic-nozzle thruster (MND), main", role: "main", module: "drive", count: DRIVE.thrusters, thrust: mainThrust, isp: exhaust / G0, massFlow: mainThrust / (gamma * exhaust), exhaust, exhaustOfC: DRIVE.exhaustOfC, jetPower: (mainThrust / (gamma * exhaust)) * (gamma - 1) * C * C, fuel: "deuterium-helium-3 plasma, held and shaped by its field coils", fuelCapacity: MASS.propellant, operation: "continuous", note: "Proposed. A plasma chamber ringed with field coils and a flare of five coil rings on struts: no solid bell, the field is the nozzle. Its effective exhaust is a fraction of the speed of light and is the figure the journey uses." },
    "hanabusa-trim": { id: "hanabusa-trim", name: "Plasma trim pod", role: "manoeuvring", module: "boom-port", count: DRIVE.trimPods, thrust: 1.2e6, isp: 50_000, massFlow: 1.2e6 / (50_000 * G0), exhaust: 50_000 * G0, exhaustOfC: (50_000 * G0) / C, jetPower: 0.5 * 1.2e6 * 50_000 * G0, fuel: "hydrogen plasma", fuelCapacity: 4_000, operation: "continuous", note: "Proposed. A small magnetic-nozzle thruster at the tail of each boom: the slow, fine push for trim, docking and the spin-up of the rings." },
  };
})();

/** The hull stack of the explorer, outside in: a light whipple shield. */
export const HULL: HullStack = HULL_STACKS.explorer;

/** One named section, between two stations on the spine. A deck is a flat floor, a terrace or a ring; the label points at (x, z). */
export interface HanabusaSection extends Omit<Section, "from" | "to" | "reach"> {
  module: string;
  y0: number;
  y1: number;
  at: readonly [number, number];
}

const sp = (id: string): [number, number] => [SPINE_Y[id], SPINE_Y[id] + (SPINE.find((one) => one.id === id)?.module.length ?? 0)];
const s = (module: string, id: string, name: string, role: SectionRole, y0: number, y1: number, x: number, z: number, does: string, deck = false): HanabusaSection => ({ module, id, name, role, y0, y1, at: [x, z], does, ...(deck ? { deck } : {}) });
const inSpine = (module: string, id: string, name: string, role: SectionRole, a: number, b: number, x: number, z: number, does: string, deck = false): HanabusaSection => {
  const [y0, y1] = sp(module);
  return s(module, id, name, role, y0 + (y1 - y0) * a, y0 + (y1 - y0) * b, x, z, does, deck);
};
const RINGS = rings(RING_ORDER_DEFAULT);
const ringAt = (use: string): { y: number; rOut: number } => {
  const r = RINGS.find((one) => one.use === use);
  return { y: r?.y ?? 0, rOut: r?.rOut ?? 76 };
};

/** Every named section of the ship, tail to bow. More than one for every 3 to 5% of its length, with the sub-parts inside each module. */
export const SECTIONS: readonly HanabusaSection[] = [
  s("drive", "thrust-ring", "Thrust ring", "structure", -1, 2, 0, 12, "The disc that takes the push of every thruster into the hull, with twelve radial beams.", true),
  s("drive", "thruster-ring", "Outer ring of 12 thrusters", "engine", -6, 6, 17, 0, "Twelve magnetic-nozzle thrusters in a ring round the tail."),
  s("drive", "thruster-inner", "Inner ring of 6 thrusters", "engine", -6, 6, 8, 5, "Six thrusters inside the first ring, staggered between them."),
  s("drive", "thruster-axis", "Axial thruster", "engine", -6, 6, 0, -2, "The one thruster on the keel's axis."),
  s("drive", "coil-stack", "Fusion field-coil stack", "power", 2.4, 11.6, 11, 0, "Seven coil rings round the reactor feed that hold the plasma.", true),
  inSpine("reactor", "reactor-core", "Reactor chamber", "power", 0.1, 0.7, 0, 3, "The fusion vessel and its shield.", true),
  inSpine("reactor", "feed-isolators", "Feed isolators", "hatch", 0.7, 0.95, 4, -3, "Valves that cut the drive's feed from the ship's."),
  inSpine("tank-1", "tank-1", "Propellant tank 1", "tank", 0.05, 0.95, 8, -6, "Deuterium-helium-3 propellant, drawn first.", true),
  inSpine("tank-2", "tank-2", "Propellant tank 2", "tank", 0.05, 0.95, -8, -6, "The second tank of the main store.", true),
  inSpine("tank-3", "tank-3", "Propellant tank 3", "tank", 0.05, 0.95, 8, 6, "The third tank of the main store.", true),
  inSpine("tank-4", "tank-4", "Propellant tank 4", "tank", 0.05, 0.95, -8, 6, "The fourth tank; the industrial wheel turns round it.", true),
  s("wheel-industrial", "industrial-yard", "Industrial wheel: yard and stores", "cargo", 140, 160, 112, 0, "Workshops, spares, quarantine rooms and the yard, in a closed wheel set apart.", true),
  s("wheel-industrial", "industrial-spokes", "Industrial wheel's spokes", "structure", 140, 160, 60, 0, "Six round spokes with lit elevator cars."),
  inSpine("drum-habitat-1", "habitat-aft", "Habitat drum, aft", "crew", 0.05, 0.95, 0, 8, "Crew quarters for the engineering watch, and a storm shelter against radiation.", true),
  inSpine("drum-farm-1", "farm-aft", "Farm drum, aft", "farm", 0.05, 0.95, 0, -8, "Hydroponic racks under blue lamps and a water loop.", true),
  inSpine("tank-5", "tank-5", "Propellant tank 5", "tank", 0.05, 0.95, 8, -6, "A tank of the main store.", true),
  inSpine("tank-6", "tank-6", "Propellant tank 6", "tank", 0.05, 0.95, -8, -6, "A tank of the main store; the garden ring's hub stands at its fore end.", true),
  inSpine("drum-farm-2", "farm-mid", "Farm drum, mid", "farm", 0.05, 0.95, 0, -8, "The second greenhouse, for grain and fruit.", true),
  inSpine("tank-7", "tank-7", "Propellant tank 7", "tank", 0.05, 0.95, 8, 6, "A tank of the main store; the research ring turns round its fore end.", true),
  inSpine("drum-habitat-2", "habitat-fore", "Habitat drum, fore", "crew", 0.05, 0.95, 0, 8, "Quarters and clinic beside the hubs.", true),
  inSpine("tank-8", "tank-8", "Propellant tank 8", "tank", 0.05, 0.95, -8, 6, "The last tank of the main store; the living ring turns round its fore end.", true),
  s("boom-port", "boom-port", "Port propellant boom", "tank", 100, 508, -21.5, 0, "Seventeen tanks in a column that turns with the rings, the trim thrusters at its tail.", true),
  s("boom-starboard", "boom-starboard", "Starboard propellant boom", "tank", 100, 508, 21.5, 0, "The twin of the port boom.", true),
  s("boom-starboard", "boom-thrusters", "Boom trim thrusters", "engine", 94, 108, 21.5, 7, "Three small magnetic-nozzle thrusters at the tail of each boom."),
  s("hubs", "hub-bearings", "Hub bearings", "structure", 150, 150, 15.5, 0, "A drum on a bearing round the keel at each wheel, with cross-beams to the booms."),
  s("hubs", "axial-lift", "Axial lift", "hatch", 130, SPINE_Y.node + 4, 0, 13.5, "A glazed tube along the keel with a lit car at each wheel and at the docking node."),
  s("ring-living", "living-nave", "Living ring: the nave", "common", ringAt("living").y - 2, ringAt("living").y + 2, ringAt("living").rOut - 1.5, 0, "A street with a canal down the middle and tree rows each side, under the glass roof.", true),
  s("ring-living", "living-terraces", "Living ring: terraces of homes", "crew", ringAt("living").y - 12, ringAt("living").y + 12, ringAt("living").rOut - 5, 8, "Three steps up each side wall of houses with balconies and green roofs.", true),
  s("ring-living", "living-town", "Living ring: theatre, market, school, sports hall, clinic", "common", ringAt("living").y - 12, ringAt("living").y + 12, ringAt("living").rOut - 7, -8, "The town's public rooms among the terraces."),
  s("ring-living", "living-spokes", "Living ring: glazed spoke lifts", "hatch", ringAt("living").y - 2, ringAt("living").y + 2, 40, 0, "Six glazed tubes with lit cars from the hub to the ring."),
  s("ring-living", "living-skirt", "Living ring: solar skirt", "power", ringAt("living").y - 9, ringAt("living").y + 9, ringAt("living").rOut + 1.4, 0, "A band of cells round the outer edge, with ribs."),
  s("ring-research", "research-hall", "Research ring: laboratories and ateliers", "lab", ringAt("research").y - 10, ringAt("research").y + 10, 55, 0, "Terraces of laboratories under a glass roof, with a central atrium.", true),
  s("ring-research", "research-skirt", "Research ring: solar skirt", "power", ringAt("research").y - 8, ringAt("research").y + 8, 63, 0, "The ring's band of cells."),
  s("ring-garden", "garden-terraces", "Garden ring: hydroponic terraces", "farm", ringAt("garden").y - 8, ringAt("garden").y + 8, 40, 0, "Three tiers of crop beds each side under LED grow-lamps, a service aisle with a gantry.", true),
  s("ring-garden", "garden-skirt", "Garden ring: solar skirt", "power", ringAt("garden").y - 7, ringAt("garden").y + 7, 49, 0, "The ring's band of cells."),
  inSpine("node", "hub-node", "Docking hub node: 4 ports", "dock", 0.05, 0.95, 7, 0, "Four docking ports on arms round a hub, for visiting craft and the inflatable modules.", true),
  inSpine("adapter", "adapter", "Adapter", "structure", 0, 1, 6, 0, "The cone from the heavy spine to the bow sections."),
  inSpine("crew-drum", "crew-drum", "Crew drum", "crew", 0.05, 0.95, 0, 5, "Cabins of the bow watch.", true),
  inSpine("common-area", "common-area", "Common area", "common", 0.05, 0.95, 0, -5, "Mess, library and exercise room of the bow watch.", true),
  inSpine("lab", "lab", "Laboratory module", "lab", 0.05, 0.95, 0, 4, "Benches and instruments for what the survey brings back.", true),
  inSpine("survey-pod", "survey-pod", "Survey pod", "lab", 0.05, 0.95, 5, 0, "Survey drones and probes on racks, with the empty cradle and rails of the lander bay.", true),
  inSpine("solarium", "solarium", "Solarium", "farm", 0.05, 0.95, 0, 6, "A glazed garden hall with grow-lamps, opened to starlight and shuttered for burns.", true),
  inSpine("nav-deck", "nav-deck", "Navigation deck", "nav", 0.05, 0.95, 0, 4, "Star-map table, three seats and the KAZE core.", true),
  inSpine("dome", "dome", "Observation dome", "nav", 0.05, 0.95, 0, 4, "An armoured dome of glass with eight ribs and a burn shutter.", true),
];

/** One label of a sheet: the same shape as the kit's, in ship metres. */
export interface HanabusaLabel {
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
export function labels(): HanabusaLabel[] {
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

/** The numbered deck summary, bow to stern: deck 1 is the observation dome. */
export function deckSummary(): { number: number; id: string; name: string; does: string; role: SectionRole; module: string; from: number; to: number }[] {
  const all = SECTIONS.filter((section) => section.deck).sort((a, b) => b.y1 - a.y1 || b.y0 - a.y0);
  return all.map((section, i) => ({ number: i + 1, id: section.id, name: section.name, does: section.does, role: section.role, module: section.module, from: section.y0, to: section.y1 }));
}

/** How many sections for each hundred metres, and the share of the length each stands for. */
export const labelDensity = (): { labels: number; perHundredMetres: number; shareEach: number } => ({ labels: SECTIONS.length, perHundredMetres: (SECTIONS.length / ENVELOPE.length) * 100, shareEach: 1 / SECTIONS.length });

/** The programme, strengths and weaknesses, and the operating limits, as short paragraphs. Every date is a plan: the ship is in development. */
export const HISTORY = {
  development: "The programme was approved in 2452 after the first survey fleet came home with its crews half a generation older than they left: an explorer's people must live a life, not endure a journey, so the ship is built round three glazed rings with a street, a canal and a school in each.",
  commissioning: "The keel is planned for 2456 at the orbital yard, the first flight for 2461 and entry into service for 2464, as the first ship of the fleet built to keep a town alive between stars.",
  service: "The planned trials include a spin-up test in 2461: the booms and rings brought to rate in nine days with the trim thrusters, then the main drive lit for the first full burn. The survey pod's lander bay is empty on the slip and takes its craft from the yard.",
  strengths: "The fleet's highest acceleration, three glazed rings that give a town its daylight, a hydroponic ring that feeds it, a laboratory and survey pod for what the voyage finds.",
  weaknesses: "A great deal of rotating mass to balance, a long exposure to dust at the end of a burn, and rings whose floors depend on the spin: a failed bearing means weightlessness.",
  limits: "0.060 g sustained, 0.550 c, 4.0 rpm at the rings' rim, and no main burn with a ring unlatched.",
} as const;

/** What life is like aboard, in the story: who lives there, a day, the favourite places, two small stories, the separations and the docking life. */
export const LIFE = {
  who: "About 1,200 people live aboard in three rings: researchers, farmers, teachers, engineers and their families. The living ring is the town, the research ring its laboratories and workshops, the garden ring its farm and its orchard.",
  day: "A day follows the lamps: the glass roof is dim blue at night and bright from the solar skirt at noon. Children go to school in the living ring, farmers walk the garden ring's terraces, and the whole ship dines on the canal's two banks on feast days.",
  places: "The favourite places are the canal bridge in the living ring, the research ring's atrium and the solarium beside the dome, where people watch the stars come back after a burn.",
  stories: "Every voyage the ring that turns slowest is given a name by the children; the garden ring's first harvest in 2462 was pressed into a single cup of juice that was shared by everyone aboard.",
  separations: "Two planned separations: the survey pod's lander bay, which drops away at its collar to descend with its craft; and the industrial wheel, which can stay behind as a station at a destination.",
  docking: "Visitors dock at the hub node's four ports on the still keel; the inflatable habitat modules there are stowed small and inflated at a destination to add living space.",
} as const;

/** The title-block line of every sheet. */
export const TITLE_BLOCK = `${IDENTITY.prefix} ${IDENTITY.romaji}, ${IDENTITY.designation} · ${IDENTITY.class} class · ${IDENTITY.type} · ${OPERATOR} · ${IDENTITY.drive} ×${DRIVE.thrusters} · ${IDENTITY.computer}`;

/** The status line of a sheet's title block, in the story: a planned ship with a first flight, never one in service. */
export const STATUS = `STATUS: ${IDENTITY.status} · FIRST FLIGHT ${IDENTITY.firstFlight}`;

/** The real hardware each module descends from. NASA's pictures and studies are public; nothing here is copied, only the pattern. */
export const ANCESTORS: Readonly<Record<string, string>> = {
  drive: "the plasma chambers and magnetic nozzles of the VASIMR and Project Daedalus studies, ringed with the field coils of fusion experiments, and the thrust structure of Saturn V's F-1 cluster",
  reactor: "NASA's Kilopower and NERVA reactors with their shadow shields and the Mars transfer vehicle studies' reactor and radiator layout",
  tanks: "Saturn V's and Starship's tank barrels with their domes and ring frames, and the Space Shuttle's external tank",
  drums: "the ISS's Destiny and Node modules and Skylab's workshop: round pressure volumes with berthing rings, wrapped in white blanket; the farm drum from the ISS's Veggie and Advanced Plant Habitat",
  booms: "the Mars transfer vehicle studies' twin propellant columns and the ISS truss",
  rings: "von Braun's wheel station (1952), the Stanford torus (NASA Ames, 1975), NASA's Nautilus-X centrifuge study and the ISS's cable-stayed truss and Node hubs",
  halls: "the NASA Ames summer-study paintings of the Stanford torus and Bernal sphere: a street with a canal, terraced buildings, a glass roof of mullions",
  node: "the ISS's Node 1 Unity and Node 3 Tranquility with their berthing ports",
  dome: "the ISS Cupola, and Orion's crew module under its micrometeoroid shield",
  lift: "the ISS's Canadarm2 rails and the glazed lifts of ocean liners",
};

/** The ring order's name for the sheets. */
export const RING_ORDER = RING_ORDER_DEFAULT;
