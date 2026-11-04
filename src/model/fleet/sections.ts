// The named sections inside each module, bottom to top: every internal volume has a name and a job, so a ship's sheet and its 3D view can label them. A section's place is a share of the module's length. A section
// that is a deck has a number within its module; `deckSummary` numbers the decks of a whole ship from bow to stern. Pure: no three.js and no DOM.

/**
 * What a section is, so a sheet can group and colour its labels.
 *
 * @example
 * ```ts
 * import type { SectionRole } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const role: SectionRole = "tank";
 * console.log(role);
 * ```
 */
export type SectionRole = "engine" | "tank" | "line" | "power" | "crew" | "common" | "cargo" | "lab" | "nav" | "comms" | "medical" | "farm" | "hatch" | "structure" | "thermal" | "dock" | "shield";

/**
 * One named section of a module: its id, its name, what it does, its role, where it lies as shares of the module's length (from the bottom) and, for a deck, that it is one.
 *
 * @example
 * ```ts
 * import { SECTIONS, type Section } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const first: Section = SECTIONS["tank-cryo-12"][0];
 * console.log(first.name, first.from, first.to);
 * ```
 */
export interface Section {
  id: string;
  name: string;
  does: string;
  role: SectionRole;
  from: number;
  to: number;
  deck?: boolean;
  /** How far from the axis its label points, as a share of the module's half width (default 0.6). */
  reach?: number;
}

const s = (id: string, name: string, role: SectionRole, from: number, to: number, does: string, deck = false, reach?: number): Section => ({ id, name, does, role, from, to, ...(deck ? { deck } : {}), ...(reach === undefined ? {} : { reach }) });

const engine = (nozzles: string): Section[] => [
  s("nozzles", `${nozzles}, magnetic nozzles`, "engine", 0, 0.48, "Shape the fusion exhaust into a beam."),
  s("coils", "Field coils", "power", 0.12, 0.42, "Superconducting rings that hold the plasma off the walls."),
  s("injectors", "Injector heads and feed manifolds", "line", 0.46, 0.58, "Meter fuel and reaction mass into each chamber."),
  s("gimbals", "Gimbal actuators", "structure", 0.3, 0.52, "Tilt each nozzle a few degrees to steer."),
  s("plate", "Thrust plate", "structure", 0.58, 0.66, "Carries the engines' push into the frame."),
  s("gallery-a", "Engineering gallery, lower", "crew", 0.66, 0.78, "A walk-through deck for the engine crew, under the frame.", true),
  s("gallery-b", "Engineering gallery, upper", "crew", 0.78, 0.92, "Controls and spares for the drive.", true),
  s("radiators", "Engine radiator wings", "thermal", 0.7, 0.88, "Shed the engines' waste heat.", false, 1),
  s("collar", "Spine collar, L", "dock", 0.92, 1, "Mates to the module above."),
];

/**
 * The sections of each module, by module id, bottom to top.
 *
 * @example
 * ```ts
 * import { SECTIONS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(SECTIONS["reactor-fusion"].map((section) => section.name));
 * ```
 */
export const SECTIONS: Readonly<Record<string, readonly Section[]>> = {
  "engine-fusion-1": engine("Braking nozzle"),
  "engine-fusion-3": engine("Three nozzles"),
  "engine-fusion-4": engine("Four nozzles"),
  "engine-fusion-7": engine("Seven nozzles"),
  "thruster-pod-s": [
    s("nozzle", "Plasma nozzle", "engine", 0, 0.4, "The fine push for docking and trim."),
    s("bottle", "Reactor bottle", "power", 0.4, 0.8, "A small fusion cell with its own shield."),
    s("fins", "Radiator fins", "thermal", 0.6, 0.9, "Shed the pod's heat.", false, 1),
    s("collar", "Port collar, S", "dock", 0.9, 1, "Stands on a port."),
  ],
  "rcs-ring-m": [
    s("blocks", "Vernier blocks (8)", "engine", 0, 1, "Short pulses that turn and trim the ship."),
    s("bottles", "Gas bottles", "tank", 0.2, 0.8, "Hydrogen for the verniers."),
    s("ring", "Ring frame and collars, M", "structure", 0, 1, "Holds the blocks and joins the spine."),
  ],
  "tank-cryo-12": tankSections("Main propellant tank, 12 m"),
  "tank-cryo-24": tankSections("Main propellant tank, 24 m"),
  "tank-slim-18": tankSections("Slim propellant tank, 18 m"),
  "tank-header-9": tankSections("Header tank, 9 m"),
  "deck-nav-m": [
    s("lock", "Bridge lock", "hatch", 0, 0.1, "Pressure door onto the bridge."),
    s("chart", "Chart and sensor deck", "nav", 0.1, 0.38, "Star charts, long-range sensor consoles.", true),
    s("helm", "Helm and navigation deck", "nav", 0.38, 0.66, "Pilots' stations in tiers, facing the windows.", true),
    s("command", "Command gallery", "crew", 0.66, 0.9, "The captain's station and the duty officers.", true),
    s("windows", "Bridge windows", "nav", 0.35, 0.65, "A ring of armoured glass."),
    s("collars", "Spine collars, M", "dock", 0.9, 1, "Mate to the modules above."),
  ],
  "common-area-m": [
    s("lock", "Hall lock", "hatch", 0, 0.08, "Doors from the spine."),
    s("galley", "Galley and mess", "common", 0.08, 0.34, "Kitchens and long tables.", true),
    s("lounge", "Lounge and library", "common", 0.34, 0.6, "Chairs, books and a view.", true),
    s("gym", "Gym and track", "common", 0.6, 0.86, "Machines and a running track.", true),
    s("windows", "Window band", "nav", 0.3, 0.7, "Sees out while people eat.", false, 1),
    s("collars", "Spine collars, M", "dock", 0.9, 1, "Mate to the modules above."),
  ],
  "store-drum-m": [
    s("lock", "Loading lock", "hatch", 0, 0.08, "A wide door for pallets."),
    s("cold", "Cold store", "cargo", 0.08, 0.34, "Frozen and chilled food.", true),
    s("dry", "Dry stores", "cargo", 0.34, 0.62, "Grain, clothes and spares.", true),
    s("water", "Water store", "line", 0.62, 0.84, "Clean water in cells.", true),
    s("racks", "Pallet racks", "cargo", 0.1, 0.84, "Crates held by cargo nets."),
    s("collars", "Spine collars, M", "dock", 0.9, 1, "Mate to the modules above."),
  ],
  "comms-array-m": [
    s("lock", "Array lock", "hatch", 0, 0.08, "Door to the transmitter deck."),
    s("tx", "Transmitter deck", "comms", 0.08, 0.4, "Amplifiers and the signal processors.", true),
    s("rx", "Receiver deck", "comms", 0.4, 0.7, "Quiet amplifiers and clocks.", true),
    s("dishes", "Deep-space dishes (4)", "comms", 0.5, 0.75, "Talk to Earth and to other ships.", false, 1),
    s("panels", "Phased panels (4)", "comms", 0.8, 0.9, "Talk to nearby craft without moving.", false, 0.8),
    s("whips", "Whips and horn", "comms", 0.95, 1, "Short-range radio.", false, 0.4),
  ],
  "dome-observation-m": [
    s("collar", "Spine collar, M", "dock", 0, 0.06, "Mates to the module below."),
    s("lounge", "Observation lounge", "crew", 0.06, 0.7, "Low seats and a quiet place to look out.", true),
    s("ports", "Armoured portholes (20)", "crew", 0.2, 0.7, "Small windows with burn shutters.", false, 1),
    s("dome", "Armoured dome", "crew", 0.7, 1, "A glass dome with six shutter petals, a descendant of the ISS Cupola.", false, 1),
  ],
  "solarium-m": [
    s("lower", "Lower plated end", "structure", 0, 0.12, "A drum end with the lower collar."),
    s("garden", "Garden hall", "farm", 0.12, 0.88, "Trees, planters and a pool under glass.", true),
    s("glass", "Mullioned glazing", "structure", 0.12, 0.88, "Clear panes held by mullions and hoops.", false, 1),
    s("shutters", "Armoured shutters", "shield", 0.12, 0.88, "Fold across the glass against a burn or a storm.", false, 1),
    s("lamps", "Grow-lamp rings", "farm", 0.82, 0.9, "Light the garden between stars.", false, 1),
    s("upper", "Upper plated end", "structure", 0.88, 1, "A drum end with the upper collar."),
  ],
  "eva-lock-m": [
    s("outer", "Outer hatches (2)", "hatch", 0.35, 0.65, "Big round doors to the outside.", false, 1),
    s("suits", "Suit room", "hatch", 0.1, 0.5, "Racks of suits and their air.", true),
    s("rails", "Handrails and tether rings", "structure", 0.1, 0.9, "Hold on to the hull.", false, 1),
    s("lamps", "Floodlights", "structure", 0.8, 0.9, "Light the work outside.", false, 1),
    s("collars", "Spine collars, M", "dock", 0.9, 1, "Mate to the modules above."),
  ],
  "pod-survey-m": [
    s("drones", "Survey drone cradles (6)", "lab", 0.2, 0.7, "Each holds a probe ready to launch.", false, 1),
    s("hopper", "Sample hopper", "cargo", 0.05, 0.3, "Takes in samples from the drones.", true),
    s("spectro", "Spectrometer deck", "lab", 0.3, 0.6, "Analyses samples at once.", true),
    s("boom", "Sensor boom", "nav", 0.45, 0.6, "Reaches out with a long-range sensor.", false, 1),
    s("collars", "Pod collars, M", "dock", 0, 1, "The pod swaps with any pod of its slot."),
  ],
  "pod-medical-m": [
    s("decon", "Decontamination lock", "hatch", 0, 0.12, "Cleans people and stretchers."),
    s("stretchers", "Stretcher bay", "medical", 0.12, 0.42, "Beds for the rescued.", true),
    s("surgery", "Surgery", "medical", 0.42, 0.72, "An operating room.", true),
    s("winch", "Rescue winch and crane", "structure", 0.65, 0.95, "Lifts people from damaged craft.", false, 1),
    s("collars", "Pod collars, M", "dock", 0, 1, "The pod swaps with any pod of its slot."),
  ],
  "tank-spheres-4": [
    s("frame", "Girder frame", "structure", 0, 1, "Holds four spheres round the core."),
    s("spheres", "Four sphere tanks", "tank", 0.2, 0.8, "High-pressure helium, coolant and reaction mass."),
    s("core", "Service core and manifold", "line", 0, 1, "Feed and transfer lines between the spheres and the spine."),
    s("collars", "Spine collars, L", "dock", 0, 1, "Mate to the modules above and below."),
  ],
  "container-12": [s("box", "Cargo container", "cargo", 0.04, 0.96, "A standard heavy box for freight."), s("doors", "Door locks and hinges", "hatch", 0.05, 0.95, "Four lock rods hold the doors shut."), s("collars", "Collars, M", "dock", 0, 1, "Stand it on a port or a spine.")],
  "container-12-cold": [s("box", "Refrigerated container", "cargo", 0.04, 0.96, "Freight that must stay cold."), s("unit", "Cooling unit", "thermal", 0.35, 0.65, "Keeps the box at its set temperature."), s("collars", "Collars, M", "dock", 0, 1, "Stand it on a port or a spine.")],
  "cargo-bay-4": [
    s("frame", "Cargo cradle frame", "structure", 0, 1, "A girder frame that holds four containers."),
    s("ports", "Four container ports, M", "dock", 0, 0.12, "Each holds one container with clamps."),
    s("rail", "Gantry rail", "structure", 0.9, 1, "A loading crane runs along it."),
    s("core", "Service core", "crew", 0.05, 0.95, "A walk-through core with cable and pipe runs.", true),
  ],
  "habitat-ring-16": ringSections(16),
  "habitat-ring-30": ringSections(30),
  "habitat-drum-crew": [
    s("lock", "Airlock", "hatch", 0, 0.08, "Pressure doors on the hull."),
    s("cabins-a", "Crew cabins A", "crew", 0.08, 0.3, "Bunks and lockers, two to a cabin.", true),
    s("common", "Common area and galley", "common", 0.3, 0.52, "Where the crew eats and meets.", true),
    s("medical", "Medical bay", "medical", 0.52, 0.7, "Beds, a surgery and a pharmacy.", true),
    s("cabins-b", "Crew cabins B", "crew", 0.7, 0.92, "More bunks, and the quiet deck.", true),
    s("collars", "Spine collars, M", "dock", 0.92, 1, "Mate to the modules above."),
  ],
  "habitat-drum-large": [
    s("lock", "Airlock", "hatch", 0, 0.05, "Pressure doors on the hull."),
    s("cabins-a", "Passenger cabins A", "crew", 0.05, 0.16, "Family cabins.", true),
    s("cabins-b", "Passenger cabins B", "crew", 0.16, 0.27, "Single cabins.", true),
    s("cabins-c", "Passenger cabins C", "crew", 0.27, 0.38, "Shared berths.", true),
    s("common", "Common area", "common", 0.38, 0.5, "A hall, a market and a school.", true),
    s("galley", "Galley and stores", "cargo", 0.5, 0.61, "Kitchens and cold stores.", true),
    s("medical", "Medical bay", "medical", 0.61, 0.72, "Wards and a surgery.", true),
    s("rec", "Recreation deck", "common", 0.72, 0.83, "A gym, a library and a small theatre.", true),
    s("cabins-d", "Crew-family cabins", "crew", 0.83, 0.95, "Cabins for the ship's own families.", true),
    s("collars", "Spine collars, L", "dock", 0.95, 1, "Mate to the modules above."),
  ],
  "farm-drum": [
    s("lock", "Airlock and wash room", "hatch", 0, 0.06, "Clean entry to the farm."),
    s("racks-a", "Grow racks A: grain", "farm", 0.06, 0.28, "Wheat and rice under blue lamps.", true),
    s("racks-b", "Grow racks B: vegetables", "farm", 0.28, 0.5, "Salad and root crops.", true),
    s("racks-c", "Grow racks C: fruit", "farm", 0.5, 0.72, "Trellises for fruit and beans.", true),
    s("water", "Water loop and nutrient tanks", "line", 0.72, 0.86, "Recycles water and feeds the roots.", true),
    s("store", "Seed bank and cold store", "cargo", 0.86, 0.95, "Seeds and harvest.", true),
    s("collars", "Spine collars, L", "dock", 0.95, 1, "Mate to the modules above."),
  ],
  "lab-m": [
    s("lock", "Sample airlock", "hatch", 0, 0.1, "Passes samples and probes through the hull."),
    s("bench-a", "Wet lab", "lab", 0.1, 0.4, "Benches, hoods and a freezer.", true),
    s("bench-b", "Instrument lab", "lab", 0.4, 0.7, "Spectrometers and microscopes.", true),
    s("arm", "Robot arm and rail", "structure", 0.15, 0.85, "Reaches instruments and probes outside."),
    s("pods", "Instrument pods (3)", "nav", 0.28, 0.75, "Cameras and sensors on short arms."),
    s("collars", "Spine collars, M", "dock", 0.9, 1, "Mate to the modules above."),
  ],
  "mast-sensor-40": [
    s("base", "Mast base and collar, M", "dock", 0, 0.1, "Stands on the spine."),
    s("lattice", "Lattice mast", "structure", 0.1, 0.85, "Four longerons with braces."),
    s("platform-1", "Lower platform", "nav", 0.35, 0.4, "Dish and instruments.", true),
    s("platform-2", "Middle platform", "nav", 0.6, 0.65, "Dish and phased arrays.", true),
    s("arrays", "Phased arrays (4)", "comms", 0.45, 0.55, "Fix the ship's place against the stars."),
    s("platform-3", "Upper platform", "comms", 0.85, 0.9, "Whips and horns.", true),
    s("optics", "Long-baseline optics head", "nav", 0.9, 1, "A telescope on a gimbal fork."),
  ],
  "reactor-fusion": [
    s("lock", "Isolation collar, L", "dock", 0, 0.08, "Can be cut free of the spine in an emergency."),
    s("pumps", "Coolant pumps and valves", "line", 0.08, 0.22, "Move heat from the core to the exchangers.", true),
    s("coil", "Toroidal field coil", "power", 0.36, 0.64, "Holds the plasma."),
    s("core", "Plasma core", "power", 0.42, 0.58, "Where the fuel burns."),
    s("exchangers", "Heat exchangers (4)", "thermal", 0.14, 0.86, "Carry the heat out to the radiators."),
    s("control", "Reactor control room", "crew", 0.64, 0.76, "Watches the core.", true),
    s("gallery", "Shield gallery", "crew", 0.76, 0.88, "Checks the shield and the coil from inside.", true),
    s("collar", "Spine collar, L", "dock", 0.92, 1, "Mates to the module above."),
  ],
  "radiator-stowed": radiatorSections(false),
  "radiator-deployed": radiatorSections(true),
  "node-two": nodeSections(2),
  "node-four": nodeSections(4),
  "truss-m-12": [s("truss", "Truss bays", "structure", 0, 1, "An open skeleton between modules."), s("core", "Cable core", "line", 0.05, 0.95, "Power, data and coolant runs."), s("collars", "Collars, M", "dock", 0, 1, "Mate to the modules above and below.")],
  "truss-l-24": [s("truss", "Truss bays", "structure", 0, 1, "An open skeleton between modules."), s("core", "Cable core", "line", 0.05, 0.95, "Power, data and coolant runs."), s("collars", "Collars, L", "dock", 0, 1, "Mate to the modules above and below.")],
  "adapter-m-l": [s("cone", "Adapter cone", "structure", 0.05, 0.95, "Steps the spine from one collar class to the next."), s("collars", "Collars, M below and L above", "dock", 0, 1, "Mate to the modules either side.")],
  "adapter-l-m": [s("cone", "Adapter cone", "structure", 0.05, 0.95, "Steps the spine from one collar class to the next."), s("collars", "Collars, L below and M above", "dock", 0, 1, "Mate to the modules either side.")],
  "shield-forward": [
    s("collar", "Spine collar, L", "dock", 0, 0.1, "Stands on the spine."),
    s("skirt", "Shield skirt and sensors", "structure", 0.1, 0.36, "A stiff ring with dust sensors and lamps."),
    s("tiles", "Ceramic tile dome", "shield", 0.36, 1, "Three layers of tile take dust at speed."),
    s("bumper", "Bumper lattice", "shield", 0.4, 0.8, "Standoff rods that break a grain before the tile."),
  ],
};

function tankSections(main: string): Section[] {
  return [
    s("aft", "Aft feed ring", "line", 0, 0.08, "Where the tank feeds the line to the engines."),
    s("main", main, "tank", 0.08, 0.86, "Cryogenic propellant, with baffles against slosh."),
    s("column", "Feed column and baffles", "line", 0.1, 0.84, "A pipe down the middle and rings that still the liquid."),
    s("manifold", "Transfer line manifold", "line", 0.3, 0.8, "Valves to move propellant to or from the next tank."),
    s("fore", "Forward dome and collar, L", "dock", 0.9, 1, "Mates to the module above."),
  ];
}

function ringSections(m: number): Section[] {
  return [
    s("hub", "Hub and spine segment, M", "structure", 0, 1, "The part of the ship that does not turn."),
    s("bearing", "Bearing ring", "power", 0.42, 0.58, "Lets the ring turn on the hub.", false, 0.5),
    s("spokes", "Spokes (6) with lift cars", "structure", 0.42, 0.58, "Carry people and supplies out to the ring.", false, 0.8),
    s("ring-a", `Ring habitat, deck A (${m} m radius)`, "crew", 0.3, 0.7, "Cabins on the ring's floor.", true, 1),
    s("ring-b", "Ring commons", "common", 0.3, 0.7, "Gardens, a school and a hall along the ring.", true, 1),
    s("ring-c", "Ring services deck", "line", 0.3, 0.7, "Pipes, cables and stores under the floor.", true, 1),
    s("windows", "Window band", "nav", 0.4, 0.6, "Sees out while the ring turns.", false, 1),
    s("locks", "Ring airlocks (6)", "hatch", 0.3, 0.45, "Doors to the outside of the ring.", false, 1),
  ];
}

function radiatorSections(deployed: boolean): Section[] {
  return [
    s("hub", "Hub drum", "structure", 0, 1, "Carries the wings and the coolant manifold."),
    s("wings", deployed ? "Radiator wings (6), spread" : "Radiator wings (6), stowed", "thermal", 0.1, 0.9, deployed ? "Hinged panels with copper pipes shed heat to space." : "Folded in latched boxes for a hard burn.", false, 1),
    s("manifold", "Coolant manifold", "line", 0.4, 0.6, "Feeds the wings."),
  ];
}

function nodeSections(n: number): Section[] {
  return [
    s("hub", "Hub drum and service lift", "structure", 0, 1, "Carries the arms and ports."),
    s("arms", `Port arms (${n})`, "structure", 0.7, 0.95, "Hold the ports out from the hub.", false, 1),
    s("ports", `Docking ports (${n}), M`, "dock", 0.9, 1, "Each stands one module parallel to the spine.", false, 1),
    s("gantry", "Gantry and handrails", "hatch", 0.6, 0.9, "A walkway round the hub."),
  ];
}
