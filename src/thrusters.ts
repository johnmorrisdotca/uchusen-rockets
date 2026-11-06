// Where the small jets sit, and how a puff dies. Pure: no three.js and no page.
// Real craft take only the jets their photos show. Fleet ships and the yard get a quad at each end and side.
import { AS_CSM_LONG, AS_CSM_WIDE } from "./data/apollosoyuz.ts";
import { DRAGON_DRAWS } from "./model/falcon.ts";
import { BAYS } from "./model/fleet/shipyard-concepts/multibay.ts";

export type Fuel = "hypergolic" | "cold";

/** One nozzle. `dir` is the way the puff leaves, a unit vector. `at` is the exit, in that part's own space. */
export interface Jet {
  slot: string;
  at: readonly [number, number, number];
  dir: readonly [number, number, number];
  fuel: Fuel;
  /** Bell length, metres. The exit is about half of that across. */
  bell: number;
}

export type ThrusterMode = "off" | "show" | "station-keeping";

/** A puff is bright for this long, and it is gone by then. */
export const PUFF_LIFE = 0.7;
/** How far a puff travels before it is gone, metres. Vacuum plumes stay short. */
export const PUFF_REACH = 4;
/** How long one pulse burns. */
export const PULSE = 0.45;
/** Station-keeping waits this long between corrections. */
export const KEEP_GAP = 20;

const MODES: readonly ThrusterMode[] = ["off", "show", "station-keeping"];

/** The attribute's word, or off when it is missing or not one of the three. */
export function thrusterMode(value: string | null): ThrusterMode {
  return MODES.includes(value as ThrusterMode) ? (value as ThrusterMode) : "off";
}

/** Fleet ships, the Shuttle, Dragon, Apollo and the station. Everything else has none. */
export function hasThrusters(rocket: string): boolean {
  return rocket.startsWith("fleet-") || rocket === "space-shuttle" || rocket === "dragon" || rocket === "apollo-soyuz" || rocket === "iss";
}

const unit = (x: number, y: number, z: number): [number, number, number] => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

const jet = (slot: string, at: readonly [number, number, number], dir: readonly [number, number, number], fuel: Fuel, bell: number): Jet => ({
  slot,
  at,
  dir: unit(dir[0], dir[1], dir[2]),
  fuel,
  bell,
});

/**
 * Shuttle RCS, in the orbiter's own space (nose at high Y, cabin toward -Z, as `orbiter()` draws it).
 * Forward jets sit in the nose. Aft jets sit on the two OMS pods, not on the main bells.
 */
function shuttleJets(): Jet[] {
  const nose = 36.3;
  const podY = 8.6;
  const out: Jet[] = [
    jet("orbiter", [0, nose, -0.12], [0, 1, 0], "hypergolic", 0.16),
    jet("orbiter", [0.28, nose - 0.3, -0.16], [1, 0.2, 0], "hypergolic", 0.16),
    jet("orbiter", [-0.28, nose - 0.3, -0.16], [-1, 0.2, 0], "hypergolic", 0.16),
    jet("orbiter", [0, nose - 0.35, -0.42], [0, 0.15, -1], "hypergolic", 0.16),
    jet("orbiter", [0.16, nose - 0.55, 0.22], [0.2, -0.1, 1], "hypergolic", 0.16),
    jet("orbiter", [-0.16, nose - 0.55, 0.22], [-0.2, -0.1, 1], "hypergolic", 0.16),
  ];
  for (const side of [1, -1] as const) {
    const at = [side * 2, podY, -1.9] as const;
    out.push(
      jet("orbiter", at, [0, 0, -1], "hypergolic", 0.18),
      jet("orbiter", at, [side, 0, -0.25], "hypergolic", 0.18),
      jet("orbiter", at, [0, -1, -0.15], "hypergolic", 0.18),
      jet("orbiter", at, [side * 0.3, 0.2, -1], "hypergolic", 0.14),
    );
  }
  return out;
}

/** Apollo's four quads around the service module: two bells splayed outward, two pointing opposite ways around the hull. */
function apolloJets(): Jet[] {
  const length = AS_CSM_LONG.value ?? 11;
  const radius = (AS_CSM_WIDE.value ?? 3.9) / 2;
  const y = (2.59 + (length - 3.28)) / 2;
  const out: Jet[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const at = [c * (radius + 0.08), y, s * (radius + 0.08)] as const;
    out.push(
      jet("csm", at, [c, 0.45, s], "hypergolic", 0.32),
      jet("csm", at, [c, -0.45, s], "hypergolic", 0.32),
      jet("csm", at, [-s, 0, c], "hypergolic", 0.32),
      jet("csm", at, [s, 0, -c], "hypergolic", 0.32),
    );
  }
  return out;
}

/** Draco ports: a ring on the capsule and a ring at the trunk's aft end. Not the SuperDraco abort bells. */
function dragonJets(variant: string): Jet[] {
  const draw = DRAGON_DRAWS[variant] ?? DRAGON_DRAWS["dragon-2"];
  if (!draw) return [];
  const out: Jet[] = [];
  const around = variant === "dragon-1" ? 10 : 8;
  for (let i = 0; i < around; i++) {
    const angle = (i / around) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const y = draw.capsule * 0.22;
    out.push(jet("capsule", [c * draw.baseRadius, y, s * draw.baseRadius], [c, -0.25, s], "hypergolic", 0.12));
  }
  const aft = variant === "dragon-1" ? 8 : 8;
  for (let i = 0; i < aft; i++) {
    const angle = (i / aft) * Math.PI * 2 + 0.2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const r = draw.trunkRadius * 0.72;
    out.push(jet("trunk", [c * r, 0.25, s * r], [c * 0.35, -1, s * 0.35], "hypergolic", 0.14));
  }
  return out;
}

/**
 * Zvezda's aft end, in the station's plain model: the module tube runs from y = 16, and that low end is aft.
 * Two large bells side by side, then a ring of small attitude jets.
 */
function issJets(): Jet[] {
  const out: Jet[] = [
    jet("station", [0.7, 15.2, 0], [0, -1, 0], "hypergolic", 0.9),
    jet("station", [-0.7, 15.2, 0], [0, -1, 0], "hypergolic", 0.9),
  ];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    out.push(jet("station", [c * 2.25, 16.3, s * 2.25], [c * 0.6, -0.8, s * 0.6], "hypergolic", 0.22));
  }
  return out;
}

/** Four nozzles on one block. The first faces out, the second back, and the other two lie on the face, so a turn can use opposite corners. */
function quad(slot: string, at: readonly [number, number, number], dirs: readonly (readonly [number, number, number])[], fuel: Fuel, bell: number): Jet[] {
  return dirs.slice(0, 4).map((dir) => jet(slot, at, dir, fuel, bell));
}

/** Quads at the two ends and the four sides of a box. Y is the long axis, as a rocket stands. Cold gas. */
export function endQuads(min: readonly [number, number, number], max: readonly [number, number, number]): Jet[] {
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const span = Math.max(max[1] - min[1], max[0] - min[0], max[2] - min[2], 1);
  const bell = Math.min(2.2, Math.max(0.25, span * 0.004));
  const spots: { at: [number, number, number]; dirs: readonly (readonly [number, number, number])[] }[] = [
    { at: [cx, max[1], cz], dirs: [[0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, 1]] },
    { at: [cx, min[1], cz], dirs: [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, -1]] },
    { at: [max[0], cy, cz], dirs: [[1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]] },
    { at: [min[0], cy, cz], dirs: [[-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1]] },
    { at: [cx, cy, max[2]], dirs: [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0]] },
    { at: [cx, cy, min[2]], dirs: [[0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, -1, 0]] },
  ];
  return spots.flatMap((spot) => quad("", spot.at, spot.dirs, "cold", bell));
}

/** The yard's quads, in the yard's own space (Z up, Y along the bays). Cold gas, on the ends and the outer sides. */
export function yardJets(): Jet[] {
  const hall = BAYS.hall.length;
  const spots: { at: [number, number, number]; out: [number, number, number] }[] = [
    { at: [230, 30, 36], out: [1, 0, 0] },
    { at: [-230, 30, 36], out: [-1, 0, 0] },
    { at: [230, hall - 30, 36], out: [1, 0, 0] },
    { at: [-230, hall - 30, 36], out: [-1, 0, 0] },
    { at: [0, 12, 36], out: [0, -1, 0] },
    { at: [0, hall - 12, 36], out: [0, 1, 0] },
    { at: [BAYS.spine.shipAt[0], 12, 24], out: [0, -1, 0] },
    { at: [BAYS.spine.shipAt[0], BAYS.spine.length - 12, 24], out: [0, 1, 0] },
    { at: [BAYS.dock.shipAt[0], 12, 40], out: [0, -1, 0] },
    { at: [BAYS.dock.shipAt[0], BAYS.dock.length - 12, 40], out: [0, 1, 0] },
  ];
  return spots.flatMap((spot) => {
    const [x, y, z] = unit(spot.out[0], spot.out[1], spot.out[2]);
    const side: [number, number, number] = Math.abs(y) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    return quad("yard", spot.at, [spot.out, [-x, -y, -z], side, [-side[0], -side[1], -side[2]]], "cold", 2.4);
  });
}

/** Placed jets for a real craft, or "ends" when the ship gets a quad on each face of its own box. Null when it has none. */
export function craftJets(rocket: string, variant: string): readonly Jet[] | "ends" | null {
  if (rocket.startsWith("fleet-")) return "ends";
  if (rocket === "space-shuttle") return shuttleJets();
  if (rocket === "dragon") return dragonJets(variant);
  if (rocket === "apollo-soyuz") return apolloJets();
  if (rocket === "iss") return issJets();
  return null;
}

/** Two jets that turn the craft: opposite corners along its length, or, on a short hull, two that point opposite ways. */
export function turnPair(jets: readonly Jet[]): readonly [Jet, Jet] | null {
  const nose = jets.filter((one) => one.dir[0] < -0.4).sort((a, b) => b.at[1] - a.at[1])[0];
  const tail = jets.filter((one) => one.dir[0] > 0.4).sort((a, b) => a.at[1] - b.at[1])[0];
  if (nose && tail && nose !== tail && nose.at[1] - tail.at[1] >= 0.5) return [nose, tail];
  let best: readonly [Jet, Jet] | null = null;
  let apart = 0.4;
  for (const a of jets) {
    for (const b of jets) {
      if (a === b) continue;
      const oppose = -(a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1] + a.dir[2] * b.dir[2]);
      const gap = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1], a.at[2] - b.at[2]);
      if (oppose > 0.5 && gap > apart) {
        apart = gap;
        best = [a, b];
      }
    }
  }
  return best;
}

/** The jets that push the craft along `sign` of an axis. The puff leaves the other way. */
export function pushJets(jets: readonly Jet[], axis: 0 | 1 | 2, sign: 1 | -1): Jet[] {
  return jets.filter((one) => one.dir[axis] * sign < -0.45);
}

/** Where a puff is, and how bright, or null once it has died. It never goes past `PUFF_REACH`. */
export function puffStep(age: number, at: readonly [number, number, number], dir: readonly [number, number, number]): { at: [number, number, number]; alpha: number } | null {
  if (age < 0 || age >= PUFF_LIFE) return null;
  const k = age / PUFF_LIFE;
  const dist = PUFF_REACH * k;
  return {
    at: [at[0] + dir[0] * dist, at[1] + dir[1] * dist, at[2] + dir[2] * dist],
    alpha: (1 - k) * (1 - k),
  };
}
