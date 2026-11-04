// SPX-207 加美鳴 (かみなり) Kaminari's numbers as one table, worked from the masses and the voyage arithmetic so that nothing is typed in twice: the spec block, the propulsion cards, the hull-layer stacks, the deck summary and the system
// insets. All fictional. The tests check every figure here against the physics.
import { DRIVE, DRY_T, LENGTH, MASS_T, STATION } from "./dims.ts";
import { C, G0, jetPowerW, ship02Budget, thrustN } from "./journey.ts";

export const DESIGN = {
  /** Rated proper acceleration, in g. */
  g: 0.015,
  /** Exhaust speed of the main drive, as a fraction of c. Fictional. */
  exhaust: DRIVE.exhaustSpeed,
  payloadT: 1_000_000,
  propellantT: 6_350_000,
  /** The forward shield's rated peak speed, as a fraction of c. */
  shieldCap: 0.3,
  proxima: 4.37,
} as const;

export const BUDGET = ship02Budget(DESIGN.g, DESIGN.exhaust, DESIGN.proxima, DRY_T, DESIGN.payloadT, DESIGN.propellantT);

const tank = { radius: 40, bodyLength: 400, domeHeight: 20 };
/** Volume of one tank: a cylinder with two flattened domes (each two thirds of a cylinder of the dome's height). */
const tankVolume = Math.PI * tank.radius ** 2 * (tank.bodyLength + (2 * 2 * tank.domeHeight) / 3);
export const PROPELLANT_DENSITY = 850;
export const TANK_CAPACITY_T = (4 * tankVolume * PROPELLANT_DENSITY) / 1000;

/** The block that goes on every sheet and in the inspector. */
export const SPEC = {
  length: LENGTH,
  beam: 410,
  beamRadiatorsOut: 910,
  height: 410,
  dryMassT: DRY_T,
  fullMassT: BUDGET.fullMassT,
  crewNominal: 640,
  crewMax: 900,
  passengers: 60_000,
  cargoT: DESIGN.payloadT,
  containers: 192,
  propellantT: DESIGN.propellantT,
  tankCapacityT: Math.round(TANK_CAPACITY_T),
  enduranceYears: 80,
  proxima: { shipYears: BUDGET.voyage.shipYears, earthYears: BUDGET.voyage.endpointYears, peak: BUDGET.voyage.peak },
  maxG: DESIGN.g,
  cruiseC: BUDGET.voyage.peak,
  topC: DESIGN.shieldCap,
  /** The farthest the fuel carries a full payload to rest, in light years. */
  rangeLy: 5.04,
  mainThrustN: BUDGET.startThrustN,
  maneuverThrustN: 24e6,
} as const;

export interface EngineCard {
  id: string;
  name: string;
  count: number;
  /** Maximum thrust of one, newtons. */
  thrustEachN: number;
  /** Specific impulse, seconds. */
  isp: number;
  /** Effective exhaust speed as a fraction of c. */
  exhaust: number;
  fuel: string;
  fuelCapacityT: number;
  operation: string;
  parts: string[];
  note: string;
}

const mainIsp = (DESIGN.exhaust * C) / G0;
export const ENGINE_CARDS: readonly EngineCard[] = [
  {
    id: "fleet-02-nozzle-main",
    name: "Fusion torch nozzle (main drive)",
    count: DRIVE.nozzles,
    thrustEachN: BUDGET.startThrustN / DRIVE.nozzles,
    isp: mainIsp,
    exhaust: DESIGN.exhaust,
    fuel: "Fusion torch propellant: a lithium-boron slurry. Ordinary fusion exhausts at a few per cent of c; the torch's directed converter, which gets it to 0.4 c, is the programme's main development risk.",
    fuelCapacityT: Math.round(TANK_CAPACITY_T),
    operation: "Continuous for the whole voyage (33.5 years on board), turned end for end at the halfway point, thrust falling with mass to hold 0.015 g",
    parts: ["Bell, 50 m across the lip", "Throat collar, 11 m", "Chamber and magnet drums", "Four feed manifolds", "Seven copper field coils", "Gimbal actuators and shutter leaves"],
    note: "Eight nozzles in two rows of four. Thrust at full mass is the whole ship's mass times 0.015 g.",
  },
  {
    id: "fleet-02-vernier-cluster",
    name: "Vernier cluster (manoeuvring)",
    count: 4,
    thrustEachN: 6e6,
    isp: 40_000,
    exhaust: (40_000 * G0) / C,
    fuel: "Bleed propellant from a 30,000 t header tank, heated in a resistive plasma torch.",
    fuelCapacityT: 30_000,
    operation: "Pulsed, for steering, docking and the flip; 3 nozzles of 2 MN each in every cluster",
    parts: ["Three bells, 11 m across the lip", "Plasma torch heads", "Bleed line from the header tank", "Gimbal ring", "Mounting plate", "Blast shield"],
    note: "Four clusters at the raft's corners give 24 MN together: about 2 per cent of the main drive's thrust, enough to turn the ship in an hour.",
  },
  {
    id: "fleet-02-attitude",
    name: "Attitude thrusters (command citadel)",
    count: 32,
    thrustEachN: 40e3,
    isp: 3000,
    exhaust: (3000 * G0) / C,
    fuel: "Cold gas from the life-support nitrogen reserve",
    fuelCapacityT: 400,
    operation: "Pulsed; thirty-two thrusters in four blocks of eight",
    parts: ["Eight bells to a block", "Valve manifold", "Nitrogen line", "Block housing"],
    note: "Fine pointing for the dishes and the sensor mast.",
  },
];

export interface HullLayer {
  n: number;
  name: string;
  thicknessM: number;
  material: string;
  job: string;
}

/** Heavy radiation shielding for the transport: outside to inside, as in the crew rings' outer wall. */
export const HULL_STACK_RING: readonly HullLayer[] = [
  { n: 1, name: "Ablative paint and thermal skin", thicknessM: 0.02, material: "hull-white", job: "Sheds heat and marks the hull" },
  { n: 2, name: "Micrometeoroid bumper", thicknessM: 0.15, material: "hull-grey", job: "Breaks up grains of dust" },
  { n: 3, name: "Standoff gap", thicknessM: 1.0, material: "none", job: "Lets the debris cloud spread" },
  { n: 4, name: "Armour plate", thicknessM: 0.35, material: "hull-grey", job: "Stops what the bumper let through" },
  { n: 5, name: "Water jacket (borated)", thicknessM: 3.0, material: "fuel", job: "Slows neutrons; doubles as a reserve of drinking water" },
  { n: 6, name: "Tungsten-lead gamma layer", thicknessM: 0.6, material: "dark", job: "Stops gamma rays" },
  { n: 7, name: "Impact absorber foam", thicknessM: 0.4, material: "blanket", job: "Cushions a hit" },
  { n: 8, name: "Pressure hull", thicknessM: 0.08, material: "engine-pale", job: "Holds the air" },
  { n: 9, name: "Structural frame", thicknessM: 1.2, material: "coolant", job: "Carries the spin loads" },
  { n: 10, name: "Interior lining", thicknessM: 0.05, material: "blanket", job: "What people see" },
];

export const HULL_STACK_TANK: readonly HullLayer[] = [
  { n: 1, name: "Reflective skin", thicknessM: 0.02, material: "hull-white", job: "Reflects sunlight and starlight" },
  { n: 2, name: "Multi-layer insulation", thicknessM: 0.3, material: "blanket", job: "Keeps the propellant cold" },
  { n: 3, name: "Micrometeoroid shell", thicknessM: 0.5, material: "hull-grey", job: "Stops grains" },
  { n: 4, name: "Structural shell", thicknessM: 1.4, material: "hull-grey", job: "Holds the tank's pressure" },
  { n: 5, name: "Liner", thicknessM: 0.1, material: "engine-pale", job: "Keeps the propellant from the metal" },
];

export interface Deck {
  n: number;
  name: string;
  slot: string;
  from: number;
  to: number;
}

const D = (n: number, name: string, slot: string, from: number, to: number): Deck => ({ n, name, slot, from, to });
/** Numbered deck summary, bow to stern. */
export const DECKS: readonly Deck[] = [
  D(1, "Forward shield and dust mast", "shield", 1760, 1820),
  D(2, "Comms and sensor deck", "command", 1740, 1760),
  D(3, "Bridge deck", "command-bridge", 1716, 1722),
  D(4, "Command crew deck", "command-crew", 1702, 1708),
  D(5, "Sick bay and escape pods", "command-medbay", 1696, 1702),
  D(6, "Habitat ring B, deck 3 (parks)", "habitat-b-deck-3", 1672, 1682),
  D(7, "Habitat ring B, deck 2 (streets)", "habitat-b-deck-2", 1661, 1672),
  D(8, "Habitat ring B, deck 1 (homes)", "habitat-b-deck-1", 1650, 1661),
  D(9, "Habitat ring A, deck 3", "habitat-a-deck-3", 1622, 1632),
  D(10, "Habitat ring A, deck 2", "habitat-a-deck-2", 1611, 1622),
  D(11, "Habitat ring A, deck 1", "habitat-a-deck-1", 1600, 1611),
  D(12, "Hub, bearings and lift heads", "habitat-a", 1590, 1630),
  D(13, "Farm terrace 3", "farm-terrace-3", 1540, 1580),
  D(14, "Farm terrace 2", "farm-terrace-2", 1520, 1540),
  D(15, "Farm terrace 1 and mirrors", "farm-terrace-1", 1500, 1520),
  D(16, "Drydock and dorsal hangar", "dock-hangar", 1352, 1492),
  D(17, "Manufacturing hall and stores", "dock-works", 1352, 1492),
  D(18, "Cargo station 4", "cargo-4", 1208, 1344),
  D(19, "Cargo station 3", "cargo-3", 1072, 1208),
  D(20, "Cargo station 2", "cargo-2", 936, 1072),
  D(21, "Cargo station 1", "cargo-1", 800, 936),
  D(22, "Mission pod and radiator packs", "pod", 480, 600),
  D(23, "Tank farm: four propellant tanks", "tank-1", 340, 780),
  D(24, "Propellant lines and collector ring", "propellant-lines", 172, 340),
  D(25, "Shadow shield", "shadow-shield", 318, 336),
  D(26, "Reactor hall: six reactors", "reactor-inside", 180, 312),
  D(27, "Thrust bulkhead and heat sinks", "drive", 150, 172),
  D(28, "Engine bay: eight torch nozzles", "drive-engines", 0, 150),
  D(29, "Manoeuvring engines: four clusters", "verniers", 0, 80),
];

export interface Inset {
  id: string;
  name: string;
  slots: readonly string[];
  /** Numbered sub-parts, each at a point in ship space. */
  parts: readonly { n: number; name: string; at: readonly [number, number, number] }[];
  /** The camera: target, direction from the target, distance. */
  view: { target: readonly [number, number, number]; from: readonly [number, number, number]; dist: number };
  cut?: number;
}

export const INSETS: readonly Inset[] = [
  {
    id: "reactor-core",
    name: "Reactor core",
    slots: ["spine", "reactor", "reactor-inside", "shadow-shield"],
    cut: 0,
    view: { target: [0, 250, 0], from: [1, -0.25, 0.25], dist: 520 },
    parts: [
      { n: 1, name: "Reactor vessel and coil stack", at: [0, 250, 62] },
      { n: 2, name: "Turbine drum", at: [0, 240, 78] },
      { n: 3, name: "Heat exchanger pipes", at: [0, 270, 70] },
      { n: 4, name: "Service gantry", at: [0, 250, 91] },
      { n: 5, name: "Central service core", at: [0, 225, 26] },
      { n: 6, name: "Blast door", at: [0, 212, -100] },
    ],
  },
  {
    id: "nav-sensors",
    name: "Navigation and sensor suite",
    slots: ["spine", "command", "command-bridge", "command-crew", "attitude-thrusters", "shield"],
    cut: 0,
    view: { target: [0, 1735, 10], from: [1, -0.3, 0.3], dist: 330 },
    parts: [
      { n: 1, name: "Dust-clearing mast", at: [0, 1812, 0] },
      { n: 2, name: "Debris sensor ring", at: [-90, 1789, 0] },
      { n: 3, name: "Comms dish", at: [28, 1754, 0] },
      { n: 4, name: "Bridge consoles", at: [0, 1717, 30] },
      { n: 5, name: "Holo navigation table", at: [0, 1718, 0] },
      { n: 6, name: "Attitude thruster block", at: [52, 1736, 0] },
    ],
  },
  {
    id: "life-support",
    name: "Life support",
    slots: ["spine", "farm", "farm-terrace-1", "farm-terrace-2", "farm-terrace-3", "habitat-a", "habitat-b", "habitat-a-deck-1", "habitat-a-deck-2", "habitat-a-deck-3", "habitat-b-deck-1", "habitat-b-deck-2", "habitat-b-deck-3"],
    cut: 0,
    view: { target: [0, 1600, 0], from: [1, -0.35, 0.3], dist: 780 },
    parts: [
      { n: 1, name: "Farm terraces", at: [0, 1540, -45] },
      { n: 2, name: "Light mirrors", at: [96, 1540, 0] },
      { n: 3, name: "Water jacket (the ring's wall)", at: [180, 1608, 0] },
      { n: 4, name: "Streets and parks", at: [-165, 1668, 0] },
      { n: 5, name: "Lift spoke with service pipe", at: [100, 1608, 18] },
      { n: 6, name: "Hub bearings", at: [25, 1630, 28] },
    ],
  },
  {
    id: "docking",
    name: "Docking ports",
    slots: ["spine", "dock", "dock-hangar", "dock-works"],
    view: { target: [100, 1420, 20], from: [0.8, -0.8, 0.5], dist: 420 },
    parts: [
      { n: 1, name: "Standard 12 m collar", at: [150, 1378, 3] },
      { n: 2, name: "Dock arm girder", at: [90, 1378, 3] },
      { n: 3, name: "Fuel and power boom", at: [110, 1384, 3] },
      { n: 4, name: "Latch ring (eight)", at: [152, 1382, 6] },
      { n: 5, name: "Drydock tower", at: [68, 1495, 110] },
      { n: 6, name: "Gantry crane", at: [8, 1425, 70] },
    ],
  },
  {
    id: "cargo-handling",
    name: "Cargo handling",
    slots: ["spine", "cargo-1", "cargo-2"],
    view: { target: [40, 900, 40], from: [0.9, -0.5, 0.6], dist: 300 },
    parts: [
      { n: 1, name: "Container, 22 x 22 x 40 m", at: [37, 860, 37] },
      { n: 2, name: "Cell frame post", at: [24, 900, 24] },
      { n: 3, name: "Twist-lock plates", at: [61, 806, 61] },
      { n: 4, name: "Clamp girder to the spine", at: [21, 866, 26] },
      { n: 5, name: "Cargo number stencil", at: [74, 868, 74] },
      { n: 6, name: "Service rail", at: [19, 880, 0] },
    ],
  },
  {
    id: "farms",
    name: "Farms",
    slots: ["spine", "farm", "farm-terrace-1", "farm-terrace-2", "farm-terrace-3"],
    cut: 0,
    view: { target: [0, 1540, 0], from: [1, -0.4, 0.3], dist: 330 },
    parts: [
      { n: 1, name: "Glazed pane", at: [66, 1540, 0] },
      { n: 2, name: "Terrace tray", at: [-45, 1540, 0] },
      { n: 3, name: "Lamp rail", at: [-52, 1548, 0] },
      { n: 4, name: "Drive motor and bearing", at: [66, 1504, 0] },
      { n: 5, name: "Light mirror", at: [96, 1540, 0] },
      { n: 6, name: "Hub spoke", at: [34, 1501, 0] },
    ],
  },
  {
    id: "habitat-ring",
    name: "Habitat ring",
    slots: ["spine", "habitat-a", "habitat-b", "habitat-a-deck-1", "habitat-a-deck-2", "habitat-a-deck-3", "habitat-b-deck-1", "habitat-b-deck-2", "habitat-b-deck-3"],
    cut: 0,
    view: { target: [0, 1640, 0], from: [1, -0.1, 0.1], dist: 640 },
    parts: [
      { n: 1, name: "Outer wall (layered)", at: [-190, 1640, 0] },
      { n: 2, name: "Window cells", at: [190, 1658, 0] },
      { n: 3, name: "Decks and parks", at: [-165, 1612, 0] },
      { n: 4, name: "Spoke and lift tube", at: [100, 1608, 18] },
      { n: 5, name: "Hub and bearings", at: [25, 1630, 28] },
      { n: 6, name: "Tram rail", at: [-150, 1604, 0] },
    ],
  },
];

/** A sanity pass: the cards' thrusts and the voyage agree. */
export const CHECK = {
  mainFromCards: ENGINE_CARDS[0].thrustEachN * ENGINE_CARDS[0].count,
  mainFromMass: thrustN(BUDGET.fullMassT, DESIGN.g),
  jetPowerW: jetPowerW(BUDGET.startThrustN, DESIGN.exhaust),
  stationEnd: STATION.shield.y + STATION.shield.length,
  mass: Object.values(MASS_T).reduce((a, b) => a + b, 0),
};

/** The notes panels, a few lines each: the same text the bible gives, one per tab. */
export const NOTES = {
  propulsion: [
    "Eight fusion torch nozzles push with 1.24 GN at full mass: 0.015 g, held for the whole voyage by letting the thrust fall as the propellant goes.",
    "The exhaust leaves at 0.4 c. Ordinary fusion cannot do this; the torch depends on a directed converter that is still in development. Its limits: the radiators must reject 220 GW of waste heat, the nozzle liners last 40 years of burn, and the ship cannot stop except by turning round and burning the other way.",
    "No coasting: the ship accelerates to the halfway point, flips, and brakes. At Proxima, 4.37 light years, it peaks at 0.254 c and arrives after 33.5 years on board (33.9 in the Earth's frame).",
  ],
  construction: [
    "A 36 m square truss spine, 1,760 m long, carries every module on clamps and flange plates. Modules are standard: 22 by 22 by 40 m containers, 12 m docking collars, 24 m truss bays.",
    "The crew rings have a ten-layer wall: bumper, armour, a 3 m borated water jacket, a tungsten-lead layer, foam, pressure hull and frame. The tanks wear five shells.",
    "Steel, aluminium-lithium and ceramic tile; orange marks the removable shields and shutters, white the protected volumes.",
  ],
  history: [
    "Programme: design started 2507; keel to be laid in 2511 at the orbital yard; first flight planned for 2520.",
    "Planned service: a first voyage from 2521 to 2556 with settlers and equipment for the outer-system stations, and a refit in 2557: second habitat ring and the mission pod mount.",
  ],
  equipment: [
    "Eight main nozzles; four vernier clusters; thirty-two attitude thrusters.",
    "Four propellant tanks, three crossover lines, collector ring; six reactors; two radiator wings and two stowed packs.",
    "Four cargo stations, 192 containers; a dorsal hangar, a works hall, four docking collars and a drydock; a farm drum; two habitat rings; one mission pod (two variants); eight escape pods.",
  ],
} as const;
