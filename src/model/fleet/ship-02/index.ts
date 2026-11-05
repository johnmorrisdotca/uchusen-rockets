// SPX-02 加美鳴 Kaminari's slots: every module that stands on the ship, where it stands, what it is called and how to make it. The registry turns each row into a part; the renders read the same rows.
import type { PartKind } from "../../../parts.ts";
import { type Piece, shifted, turned } from "./adapter.ts";
import { cargoInside, cargoPieces } from "./cargo.ts";
import { attitudePieces, commandInside, commandPieces } from "./command.ts";
import { dockInside, dockPieces } from "./dock.ts";
import { DRIVE, LENGTH, STATION, TANK } from "./dims.ts";
import { driveEngines, drivePieces, nozzle, vernier, vernierPieces } from "./drive.ts";
import { headerPieces } from "./headers.ts";
import { relayTip, tugTip } from "./tips.ts";
import { farmInside, farmPieces } from "./farm.ts";
import { habitatInside, habitatPieces } from "./habitat.ts";
import { linesPieces } from "./lines.ts";
import { podCargo, podSettlement, podSurvey, podTanker, POD } from "./pod.ts";
import { reactorInside, reactorPieces, shadowShieldPieces } from "./reactor.ts";
import { stowed, wing } from "./radiators.ts";
import { shieldPieces } from "./shield.ts";
import { spinePieces } from "./spine.ts";
import { tank, tankInside } from "./tanks.ts";

/** One module: its slot, its place on the ship (metres from the tail on y, from the axis on x and z), its size and how to build it. `inside` modules are the cutaway contents. */
export interface Ship02Slot {
  slot: string;
  name: string;
  kind: PartKind;
  at: readonly [number, number, number];
  height: number;
  diameter: number;
  inside: boolean;
  pieces: () => Piece[];
}

const tanks = ([[1, 1, "1"], [-1, 1, "2"], [1, -1, "3"], [-1, -1, "4"]] as const).map(([sx, sz, n]): Ship02Slot => ({
  slot: `tank-${n}`,
  name: `Fuel tank ${n}`,
  kind: "tank",
  at: [sx * TANK.offset, STATION.tank.y, sz * TANK.offset],
  height: STATION.tank.length,
  diameter: TANK.radius * 2,
  inside: false,
  pieces: () => tank(Math.atan2(-sx, -sz), 2100 + Number(n), `T${n}`, sz),
}));

const cargo = Array.from({ length: STATION.cargo.count }, (_, i): Ship02Slot => ({
  slot: `cargo-${i + 1}`,
  name: `Cargo station ${i + 1}`,
  kind: "mount",
  at: [0, STATION.cargo.y + i * STATION.cargo.length, 0],
  height: STATION.cargo.length,
  diameter: 150,
  inside: false,
  pieces: () => cargoPieces(i),
}));

const S = (slot: string, name: string, kind: PartKind, at: readonly [number, number, number], height: number, diameter: number, pieces: () => Piece[], inside = false): Ship02Slot => ({ slot, name, kind, at, height, diameter, inside, pieces });
const deckSlots: Ship02Slot[] = [];
for (const [ring_, y] of [["a", STATION.habitatA.y], ["b", STATION.habitatB.y]] as const)
  for (const deck of [1, 2, 3]) deckSlots.push(S(`habitat-${ring_}-deck-${deck}`, `Habitat ring ${ring_.toUpperCase()}, deck ${deck} (${["homes", "streets", "parks"][deck - 1]}), inside`, "deck", [0, y, 0], 40, 400, () => shifted(habitatInside(0, deck - 1), 0, 0, 0), true));
void deckSlots;

export const SHIP_02_SLOTS: readonly Ship02Slot[] = [
  S("spine", "Truss spine", "spacecraft", [0, 0, 0], 1760, 40, spinePieces),
  S("drive", "Drive raft", "engine", [0, STATION.drive.y, 0], STATION.drive.length + 60, 380, drivePieces),
  S("drive-engines", "Main drive: eight torch nozzles", "engine", [0, 0, 0], 150, 280, driveEngines),
  S("verniers", "Vernier clusters", "engine", [0, 0, 0], 130, 380, vernierPieces),
  S("header-tanks", "Header tanks", "tank", [0, 0, 0], 170, 380, headerPieces),
  S("reactor", "Reactor hall", "service-module", [0, STATION.reactor.y, 0], 150, 220, reactorPieces),
  S("shadow-shield", "Shadow shield", "fairing", [0, STATION.reactor.y + 146, 0], 30, 300, shadowShieldPieces),
  S("propellant-lines", "Propellant lines", "adapter", [0, 0, 0], 4 + 337, 380, linesPieces),
  ...tanks,
  S("radiator-starboard", "Radiator wing, starboard", "arms", [0, 200, 0], 560, 700, () => wing(1, 560, 6, 56, 104)),
  S("radiator-port", "Radiator wing, port", "arms", [0, 200, 0], 560, 700, () => wing(-1, 560, 6, 56, 104)),
  S("radiators-stowed", "Stowed radiator packs", "arms", [0, 420, 0], 240, 120, () => [...shifted(stowed(240), 0, 0, 24), ...turned(shifted(stowed(240), 0, 0, 24), Math.PI)]),
  // the mission hardpoints: the dorsal and ventral pod mounts on the spine, and the two wing-tip mounts
  S("pod", "Dorsal pod mount: settlement pod", "service-module", [0, POD.y, POD.z], POD.length + 28, 40, podSettlement),
  S("pod-ventral", "Ventral pod mount: cargo pod", "service-module", [0, POD.y, -POD.z], POD.length + 28, 40, () => turned(podCargo(), Math.PI)),
  S("tip-port", "Wing-tip mount, port: relay mast", "mount", [-472, 480, 0], 80, 24, () => relayTip()),
  S("tip-starboard", "Wing-tip mount, starboard: relay mast", "mount", [472, 480, 0], 80, 24, () => relayTip()),
  ...cargo,
  S("dock", "Dock and works", "deck", [0, STATION.dock.y, 0], STATION.dock.length + 30, 420, dockPieces),
  S("farm", "Farm drum", "ring", [0, STATION.farm.y, 0], STATION.farm.length, 200, farmPieces),
  S("habitat-a", "Habitat ring A", "ring", [0, STATION.habitatA.y, 0], 36, 400, () => habitatPieces(0)),
  S("habitat-b", "Habitat ring B", "ring", [0, STATION.habitatB.y, 0], 36, 400, () => habitatPieces(1)),
  S("command", "Command citadel", "spacecraft", [0, STATION.command.y, 0], STATION.command.length + 20, 100, commandPieces),
  S("attitude-thrusters", "Attitude thrusters (32)", "engine", [0, STATION.command.y, 0], STATION.command.length, 120, attitudePieces),
  S("shield", "Bow shield", "fairing", [0, STATION.shield.y, 0], STATION.shield.length, 410, shieldPieces),
  // the cutaway's contents, one part to a deck or room
  S("reactor-inside", "Reactors, inside", "deck", [0, STATION.reactor.y, 0], STATION.reactor.length, 200, reactorInside, true),
  S("tank-inside", "Propellant and tank works, inside", "deck", [0, STATION.tank.y, 0], STATION.tank.length, 240, tankInside, true),
  S("cargo-inside", "Cargo, inside the containers", "deck", [0, STATION.cargo.y, 0], STATION.cargo.length * STATION.cargo.count, 150, () => Array.from({ length: STATION.cargo.count }, (_, i) => shifted(cargoInside(), 0, i * STATION.cargo.length, 0)).flat(), true),
  S("dock-hangar", "Hangar and craft in its cradle, inside", "deck", [0, STATION.dock.y, 0], STATION.dock.length, 140, () => dockInside("hangar"), true),
  S("dock-works", "Manufacturing hall and stores, inside", "deck", [0, STATION.dock.y, 0], STATION.dock.length, 140, () => dockInside("works"), true),
  ...[0, 1, 2].map((t) => S(`farm-terrace-${t + 1}`, `Farm terrace ${t + 1}, inside`, "deck", [0, STATION.farm.y, 0], STATION.farm.length, 130, () => farmInside(t), true)),
  ...deckSlots,
  S("command-bridge", "Bridge deck, inside", "deck", [0, STATION.command.y, 0], STATION.command.length, 90, () => commandInside("bridge"), true),
  S("command-crew", "Command crew deck, inside", "deck", [0, STATION.command.y, 0], STATION.command.length, 90, () => commandInside("crew"), true),
  S("command-medbay", "Sick bay, inside", "deck", [0, STATION.command.y, 0], STATION.command.length, 90, () => commandInside("med"), true),
];

/** Parts that fit the same mounts as the standard ones: another pod for the dorsal and ventral mounts, another module for the wing tips. */
export const SHIP_02_ALTERNATES = [
  { id: "fleet-02-pod-survey", name: "Dorsal pod mount: survey pod", like: "pod", pieces: podSurvey },
  { id: "fleet-02-pod-tanker", name: "Dorsal pod mount: tanker pod", like: "pod", pieces: podTanker },
  { id: "fleet-02-pod-ventral-lab", name: "Ventral pod mount: laboratory pod", like: "pod-ventral", pieces: () => turned(podSurvey(), Math.PI) },
  { id: "fleet-02-pod-ventral-rescue", name: "Ventral pod mount: rescue pod", like: "pod-ventral", pieces: () => turned(podSettlement(), Math.PI) },
  { id: "fleet-02-tip-port-tug", name: "Wing-tip mount, port: tug", like: "tip-port", pieces: () => tugTip() },
  { id: "fleet-02-tip-starboard-tug", name: "Wing-tip mount, starboard: tug", like: "tip-starboard", pieces: () => tugTip() },
] as const;

/** The named variants: the same ship with other modules in its hardpoints. Each lists the alternate part for a slot; every other slot is the standard one. */
export const SHIP_02_VARIANT_PARTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "fleet-02-survey": { pod: "fleet-02-pod-survey", "pod-ventral": "fleet-02-pod-ventral-lab" },
  "fleet-02-tanker": { pod: "fleet-02-pod-tanker", "tip-port": "fleet-02-tip-port-tug", "tip-starboard": "fleet-02-tip-starboard-tug" },
  "fleet-02-rescue": { "pod-ventral": "fleet-02-pod-ventral-rescue", "tip-port": "fleet-02-tip-port-tug", "tip-starboard": "fleet-02-tip-starboard-tug" },
};

/** The two engines drawn on their own, for the propulsion cards. */
export const SHIP_02_CARDS = [
  { id: "fleet-02-nozzle-main", name: "Fusion torch nozzle, main drive (one of eight)", height: 135, diameter: 56, pieces: () => nozzle(0, 0, 0, DRIVE.exit, DRIVE.throat, DRIVE.length) },
  { id: "fleet-02-vernier-cluster", name: "Vernier cluster, manoeuvring (one of four)", height: 80, diameter: 30, pieces: () => vernier(0, 0, 0) },
] as const;

export { DRIVE, LENGTH };
