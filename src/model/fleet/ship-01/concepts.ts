// Three silhouette concepts for ISV Hanabusa, drawn from the fleet kit so the family look is true: each is a spine of kit modules with the hardware that gives it its outline. Concepts only; the ship is built after one is picked.
import { BUILDERS, ibeam, KIT, place, radiator, rod, tileShield, beam, type KitModule, type Piece, type Vec3, antenna, pipeRun, roundStrut, hoop, observationDome } from "./adapter.ts";

export interface Concept {
  id: string;
  name: string;
  idea: string;
  ancestors: string;
  pieces: Piece[];
  length: number;
  beam: number;
}

const deg = (a: number): number => (a * Math.PI) / 180;

/** Stacks modules on the spine from y0, tail to nose: each module's place and where the stack ends. */
function stack(ids: readonly (string | KitModule)[], y0 = 0): { pieces: Piece[]; at: Map<string, number>; end: number } {
  let y = y0;
  const pieces: Piece[] = [];
  const at = new Map<string, number>();
  ids.forEach((one, i) => {
    const m = typeof one === "string" ? KIT[one] : one;
    if (!m) throw new Error(`no module ${String(one)}`);
    pieces.push(...place(m.pieces({ seed: `s${i}`, detail: 0.7 }), { at: [0, y, 0] }));
    at.set(`${m.id}#${i}`, y);
    at.set(m.id, y);
    y += m.length;
  });
  return { pieces, at, end: y };
}

const tankOf = (id: string, R: number, L: number): KitModule => BUILDERS.tank(id, id, R, L, "L", "L", 100, 1000, "");

/** A tank hung beside the spine on three braces to the truss. */
function hung(m: KitModule, x: number, z: number, y: number, spineR: number): Piece[] {
  const out = place(m.pieces({ seed: `${x}/${z}/${y}`, detail: 0.6 }), { at: [x, y, z] });
  const d = Math.hypot(x, z);
  const dir: Vec3 = [x / d, 0, z / d];
  const r = m.width / 2 - 1;
  for (const f of [0.1, 0.5, 0.9]) {
    const yy = y + m.length * f;
    out.push(...ibeam("hull-grey-dark", [x - dir[0] * r, yy, z - dir[2] * r], [dir[0] * spineR, yy, dir[2] * spineR], 0.9, 0.5, [0, 1, 0]));
  }
  return out;
}

/** A: the raceme. A long lance of open truss with its propellant in whorls of tanks, like florets on a stem, the crew and the survey kit at the bow. */
function raceme(): Concept {
  const main = stack(["engine-fusion-7", "reactor-fusion", "truss-l-24", "truss-l-24", "truss-l-24", "truss-l-24", "node-four", "habitat-drum-large", "adapter-l-m", "common-area-m", "lab-m", "pod-survey-m", "deck-nav-m", "dome-observation-m"]);
  const out = [...main.pieces];
  const y = main.at.get("truss-l-24#2") as number;
  // three whorls of three tanks: the biggest aft, the smallest forward
  const whorls: [number, number, number][] = [[27, 6, 44], [74, 5, 28], [105, 4, 16]];
  for (const [y0, R, L] of whorls)
    for (let k = 0; k < 3; k++) {
      const a = deg(60 + 120 * k + (y0 > 80 ? 60 : 0));
      out.push(...hung(tankOf(`t${R}x${L}`, R, L), 17 * Math.sin(a), 17 * Math.cos(a), y0, 6));
    }
  // four radiator wings on the reactor, set clear of the engine
  for (let k = 0; k < 4; k++) out.push(...radiator({ r0: 7, az: deg(45 + 90 * k), y: 34, reach: 28, height: 14, seed: `r${k}`, panels: 6 }));
  // a long sensor boom and the dish at the very nose
  const nose = main.end;
  out.push(...place(KIT["mast-sensor-40"].pieces({ detail: 0.6 }), { at: [0, nose, 0] }));
  void y;
  return { id: "a", name: "A. Raceme", idea: "A lance of open truss with its tanks hung in three whorls like florets on a stem, radiators on booms behind the reactor, the crew and survey kit at the bow.", ancestors: "NASA Mars transfer vehicle studies' truss and radiators; Saturn V's clustered tanks; the ISS truss; Hubble's boom.", pieces: out, length: nose + 40, beam: 80 };
}

/** B: the parasol. A wide dust shield at the nose, everything crew-side in its shadow, swept radiator wings, a long clean hull. */
function parasol(): Concept {
  const main = stack(["engine-fusion-4", "reactor-fusion", "tank-cryo-24", "tank-cryo-24", "tank-cryo-24", "tank-cryo-12", "truss-l-24", "adapter-l-m", "habitat-drum-crew", "lab-m", "pod-survey-m", "deck-nav-m", "comms-array-m"]);
  const out = [...main.pieces];
  // two big radiator wings, like a dart's fins
  for (const az of [90, 270]) out.push(...radiator({ r0: 7, az: deg(az), y: 34, reach: 36, height: 26, seed: `w${az}`, panels: 8 }));
  const nose = main.end;
  // the shield: a shallow dished disc of tile on a ring truss, a mast through its middle
  const R = 24;
  out.push(...place(tileShield([[R, 0], [R * 0.82, 1.6], [R * 0.55, 3.2], [R * 0.25, 4.6], [R * 0.08, 5.4]], "dust", 64, 32), { at: [0, nose + 14, 0] }));
  out.push(hoop("hull-grey-dark", R, nose + 14, 0.9, 64, 10));
  for (let k = 0; k < 8; k++) {
    const a = deg(45 * k);
    out.push(...ibeam("hull-grey-dark", [7 * Math.sin(a), nose, 7 * Math.cos(a)], [R * Math.sin(a), nose + 14, R * Math.cos(a)], 1.2, 0.7, [0, 1, 0]));
  }
  out.push(...place(KIT["mast-sensor-40"].pieces({ detail: 0.6 }), { at: [0, nose + 18, 0] }));
  return { id: "b", name: "B. Parasol", idea: "A 48 m dust shield leads the ship, because a fast ship meets dust like bullets; the crew and instruments sit in its shadow, the radiators sweep back like fins.", ancestors: "Daedalus' beryllium dust shield; Orion's heat shield; NASA Mars transfer vehicle shadow shield and radiators.", pieces: out, length: nose + 58, beam: 150 };
}

/** C: the catamaran. Two propellant booms joined by cross-frames, the habitat and survey kit on a short central keel that runs on ahead. */
function catamaran(): Concept {
  const out: Piece[] = [];
  const X = 26;
  for (const sx of [-1, 1]) {
    const boom = stack(["engine-fusion-3", "tank-cryo-24", "tank-cryo-24", "tank-cryo-24", "tank-cryo-24", "tank-cryo-24", "tank-cryo-24", "tank-cryo-12", "node-two"]);
    out.push(...place(boom.pieces, { at: [sx * X, 0, 0] }));
  }
  // the central keel: reactor, shield, habitat chain, runs on ahead of the booms
  const keel = stack(["reactor-fusion", "truss-l-24", "truss-l-24", "truss-l-24", "habitat-drum-large", "adapter-l-m", "common-area-m", "lab-m", "pod-survey-m", "deck-nav-m", "dome-observation-m"], 24);
  out.push(...keel.pieces);
  // cross-frames between the booms and the keel
  const frame = (y: number): Piece[] => {
    const o: Piece[] = [];
    for (const sx of [-1, 1]) {
      const a = sx * (X - 7);
      const b = sx * 7.5;
      for (const z of [5, -5]) {
        o.push(...ibeam("hull-grey", [a, y, z], [b, y, z], 1.6, 1.0, [0, 0, 1]));
        o.push(...roundStrut("hull-grey", [a, y, z], [b, y + 15, z], 0.45), ...roundStrut("hull-grey", [b, y, z], [a, y + 15, z], 0.45));
      }
      o.push(...roundStrut("hull-grey", [a, y, 5], [a, y, -5], 0.5), ...roundStrut("hull-grey", [b, y, 5], [b, y, -5], 0.5));
    }
    return o;
  };
  for (const y of [36, 66, 96, 126, 156]) out.push(...frame(y));
  // radiators fold out from the keel: two wings above and two below the plane of the booms
  for (const az of [0, 180]) out.push(...radiator({ r0: 7, az: deg(az), y: 50, reach: 26, height: 16, seed: `c${az}`, panels: 6 }));
  const nose = keel.end;
  out.push(...place(KIT["mast-sensor-40"].pieces({ detail: 0.6 }), { at: [0, nose, 0] }));
  return { id: "c", name: "C. Catamaran", idea: "Two propellant booms with a cross-frame ladder between them and a central keel that runs on ahead as the bow: a wide stable gantry with an open bay for survey craft between the booms.", ancestors: "NASA's twin-boom Mars cargo trusses; the ISS truss with its modules; container-ship cell guides; Space Shuttle's payload bay between its engines.", pieces: out, length: nose + 40, beam: 70 };
}

export const CONCEPTS = (): Concept[] => [raceme(), parasol(), catamaran()];
void rod;
void beam;
void antenna;
void pipeRun;
void roundStrut;
void observationDome;
