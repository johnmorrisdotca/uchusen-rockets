// Every named section of SPX-207 加美鳴 (かみなり) Kaminari, from the nose to the tail: what it is called, what it does, which part holds it and where its label's leader ends (metres, ship space: x starboard, y from the tail, z up).
// The renders label from this table, and the 3D view's labels follow the same anchors as the parts move. Sections for a 1,820 m ship: one for every 29 m on average.
import { LENGTH } from "./dims.ts";

export interface Section {
  id: string;
  name: string;
  job: string;
  /** The part (slot) the section belongs to. */
  slot: string;
  /** Where the leader ends. */
  at: readonly [number, number, number];
  /** True for something seen only in the cutaway. */
  inside?: boolean;
}

const s = (id: string, name: string, job: string, slot: string, x: number, y: number, z: number, inside = false): Section => ({ id, name, job, slot, at: [x, y, z], ...(inside ? { inside } : {}) });

/** Nose to tail. */
const LIST: readonly Section[] = [
  s("bow-mast", "Dust-clearing mast", "Magnetic coil that sweeps dust and gas from the path", "shield", 0, 1812, 0),
  s("shield-face", "Forward shield face", "Removable orange tiles over the first plate", "shield", 90, 1787, 4),
  s("shield-stack", "Whipple stack", "Three spaced plates break up dust and grit before the hull", "shield", 150, 1772, 0),
  s("debris-sensors", "Debris sensor ring", "Sixteen domes watch the path for grains", "shield", -90, 1789, 0),
  s("comms", "Comms dishes and masts", "Four dishes: one to Earth, one to the destination, two spare", "command", 28, 1754, 0),
  s("bridge", "Bridge deck", "Ring of consoles round the navigation table", "command-bridge", 0, 1717, 0, true),
  s("crew-deck", "Crew decks and sick bay", "Bunks and mess tables", "command-crew", -10, 1702, 0, true),
  s("attitude", "Attitude thruster blocks", "Thirty-two small thrusters in four blocks point the dishes and turn the ship", "attitude-thrusters", 52, 1736, 0),
  s("pods", "Escape pods", "Eight pods in hazard-framed bays", "command", 0, 1700, 46),
  s("ring-b", "Habitat ring B", "Spun at 1.65 rpm for half a gravity; 12,000 people", "habitat-b", 190, 1658, 0),
  s("ring-b-decks", "Streets and parks, ring B", "Three decks of blocks, trams and park", "habitat-b-deck-2", -165, 1668, 0, true),
  s("hub", "Hub and bearings", "Ring bearings, drive motors, lift tubes", "habitat-a", 25, 1630, 28),
  s("ring-a", "Habitat ring A", "Turns the other way, so the two cancel each other's spin", "habitat-a", -190, 1606, 0),
  s("spokes", "Lift spokes", "Six spokes, each a lift tube and a service pipe", "habitat-a", 100, 1608, 18),
  s("farm", "Farm drum", "Twelve glazed panes; planted terraces inside", "farm", 66, 1540, 0),
  s("farm-in", "Farm terraces", "Three terraces of planted trays under lamp rails", "farm-terrace-2", -45, 1540, 0, true),
  s("mirrors", "Light mirrors", "Four tilted panels feed daylight-spectrum light in", "farm", 96, 1540, 0),
  s("drydock", "Drydock towers", "Cradle arms hold a craft up to 90 m", "dock", 68, 1495, 110),
  s("hangar", "Dorsal hangar", "Open cage with a gantry crane and two doors", "dock", 0, 1425, 92),
  s("parked", "Craft in its cradle", "A 70 m spacecraft under repair", "dock-hangar", 0, 1400, 55, true),
  s("hub-4", "Last cargo frame", "Spine clamps and end plates of the forward station", "cargo-4", 21, 1340, 26),
  s("dock-arms", "Dock arms", "Girders to standard 12 m collars, two a side", "dock", 150, 1378, 3),
  s("works", "Manufacturing hall", "Machine tools, robot arms, stores racks", "dock", 0, 1425, -80),
  s("cargo-4", "Cargo station 4", "48 containers in four cells", "cargo-4", 76, 1268, 76),
  s("cargo-4-in", "Pallets and drums", "What the containers hold", "cargo-inside", -37, 1268, 37, true),
  s("cell-clamps", "Cell clamps", "Girders tie each cell frame to the spine", "cargo-3", 21, 1200, 26),
  s("hub-1", "Station hub frame", "Cross frame and clamps at each station end", "cargo-1", 20, 936, 20),
  s("hub-2", "Twist-lock plates", "Yellow plates lock each container to its cell", "cargo-2", 61, 1072, 61),
  s("cargo-3", "Cargo station 3", "48 containers in four cells", "cargo-3", -76, 1132, 76),
  s("cargo-2", "Cargo station 2", "48 containers in four cells", "cargo-2", 76, 996, 76),
  s("cargo-1", "Cargo station 1", "48 containers in four cells", "cargo-1", -76, 860, 76),
  s("spine-bays", "Truss spine", "36 m square, 24 m bays, 1,760 m long", "spine", 18, 790, 18),
  s("tank-fwd", "Forward domes", "Vent stacks and relief valves", "tank-1", 80, 770, 80),
  s("tank-body", "Propellant tank", "80 m by 440 m; four hold 6.35 million t", "tank-1", 80, 640, 120),
  s("tank-bands", "Insulation tiers", "Cream and orange blanket bands in three tiers", "tank-2", -80, 580, 120),
  s("tank-gauge", "Level gauge and hatches", "Service hatches and a level scale on the outboard flat", "tank-3", 80, 700, -120),
  s("tank-in", "Propellant", "Filled to 90 per cent; anti-slosh rings, standpipe", "tank-inside", -80, 560, 0, true),
  s("manifold", "Feed manifold", "Trunk and two lines face the spine, valves every 30 m", "tank-2", -40, 520, 80),
  s("radiator-s", "Radiator wing, starboard", "Six panels, 560 m by 56 m, tube rows on both faces", "radiator-starboard", 300, 480, 0),
  s("radiator-p", "Radiator wing, port", "Rejects 220 GW of waste heat", "radiator-port", -300, 440, 0),
  s("stowed", "Stowed radiator pack", "The same panels folded, held by four latches", "radiators-stowed", 0, 520, 40),
  s("cradle", "Cradle rings", "Four rings per tank, each braced to the spine", "tank-3", -80, 390, -120),
  s("tank-aft", "Tank tail domes", "Pumps and feed ports at the pole", "tank-4", -80, 346, -80),
  s("lines", "Propellant lines to the drive", "Trunks carry fuel round the shield to the raft", "propellant-lines", 168, 337, 40),
  s("shadow", "Shadow shield", "Three layers shade the crew from the reactors", "shadow-shield", 120, 330, 0),
  s("hall", "Reactor hall", "Eight-sided armoured shell, a blast door on each flat", "reactor", 100, 250, 0),
  s("reactors", "Six fusion reactors", "Coil stacks round the spine, turbine drum beside each", "reactor-inside", 0, 250, 62, true),
  s("rad-roots", "Radiator manifolds", "Pipe headers where the wing roots plug in", "reactor", 106, 250, 0),
  s("blast-doors", "Blast doors", "Hazard-banded isolation doors", "reactor", 0, 212, 100),
  s("thrust-frame", "Thrust bulkhead", "Carries the whole drive's push into the spine", "drive", 0, 160, 60),
  s("heat-sinks", "Heat-sink louvres", "Dark banks on the top and bottom of the raft", "drive", -90, 166, 60),
  s("gantry", "Service gantry", "Catwalks round every nozzle at y = 104", "drive", 0, 104, 62),
  s("feed", "Nozzle feed lines", "Four lines to each injector ring", "drive-engines", 105, 138, -32),
  s("chambers", "Torch chambers", "Magnet drums and coil stacks over each throat", "drive-engines", -35, 120, 32),
  s("coils", "Field coils", "Seven copper rings along each bell", "drive-engines", 35, 55, 32),
  s("main-drive", "Main drive", "Eight fusion torch nozzles, 50 m across the lip", "drive-engines", 105, 20, -32),
  s("shutters", "Plasma shutter leaves", "Twelve leaves round each lip, open", "drive-engines", -105, 2, 32),
  s("header-v", "Vernier header tanks", "Four 7,500 t spheres feed the verniers while the main pumps start", "header-tanks", 150, 112, 94),
  s("header-m", "Main-drive header tanks", "Two cylinders hold the 800 t start charge", "header-tanks", 0, 150, 100),
  s("hp-dorsal", "Dorsal hardpoint", "Keyed mount for the mission pod: survey, settlement or tanker", "pod", 0, 540, 78),
  s("hp-ventral", "Ventral hardpoint", "The same mount underneath: cargo, laboratory or rescue pod", "pod-ventral", 0, 540, -78),
  s("hp-tips", "Wing-tip hardpoints", "Relay mast or tug on the end of each radiator wing", "tip-starboard", 472, 480, 0),
  s("verniers", "Vernier clusters", "Four clusters of three: steering and docking", "verniers", 160, 36, 52),
];

/** The sections sorted nose to tail. */
export const SECTIONS: readonly Section[] = [...LIST].sort((a, b) => b.at[1] - a.at[1]);

/** At least one label for every 5 per cent of the length. */
export const LABEL_SPACING_M = LENGTH / SECTIONS.length;
