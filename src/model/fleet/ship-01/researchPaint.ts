// The research ring painted from inside: benches and blue lamps on terraces round an open atrium, under the glass roof. It is not the living town, so there is no canal and there are no houses. Pure: no three.js and no DOM.
import { ball, box, place, rod, type Lathe, type MaterialName, type Piece } from "./adapter.ts";
import { person, type Level } from "./interiors.ts";
import { researchHall } from "./researchHall.ts";
import { cutaway4, dims, geoOf, glass, ground, ringPieces, rings, STEP } from "./rings.ts";
import { skyWash } from "./skyWash.ts";
import { rIn } from "./wheelparts.ts";

const TAU = Math.PI * 2;
const span = (m: MaterialName, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Piece => box(m, [(x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2], Math.abs(x1 - x0), Math.abs(z1 - z0), Math.abs(y1 - y0), 0, { only: "mesh", plain: true });
const tone: MaterialName[] = ["hull-white", "blanket", "frost"];

/** A wood bench with legs and a back, and a blue globe lamp at the aisle end. `aisle` is the nave side, `wall` the side toward the terrace wall. */
function bench(aisle: number, wall: number, floor: number): Piece[] {
  const y0 = Math.min(aisle, wall);
  const y1 = Math.max(aisle, wall);
  const mid = (y0 + y1) / 2;
  const back = wall > aisle ? y1 - 0.07 : y0;
  const out: Piece[] = [span("wood", -1.6, 1.6, y0, y1, floor - 0.5, floor - 0.43), span("wood", -1.6, 1.6, back, back + 0.07, floor - 1.02, floor - 0.46)];
  for (const x of [-1.45, 1.45]) for (const y of [y0 + 0.08, y1 - 0.08]) out.push(rod("hull-grey-dark", [x, y, floor], [x, y, floor - 0.43], 0.035, 5, { only: "mesh" }));
  out.push(rod("hull-grey", [1.95, mid, floor], [1.95, mid, floor - 1.7], 0.04, 6, { only: "mesh" }), ball("blue", [1.95, mid, floor - 1.88], 0.17));
  out.push(span("blanket", -0.4, 0.65, mid - 0.14, mid + 0.14, floor - 0.54, floor - 0.5));
  return out;
}

/** The instrument wall at the back of a tread: two cabinets, dark screens, and blue lamps, with a glass hood between them. `nave` is +1 when the street is toward +y. */
function rack(rear: number, nave: 1 | -1, floor: number, paint: MaterialName): Piece[] {
  const y0 = nave > 0 ? rear : rear - 0.22;
  const y1 = nave > 0 ? rear + 0.22 : rear;
  const proud = nave > 0 ? y1 : y0 - 0.05;
  const out: Piece[] = [span(paint, -2.3, -0.35, y0, y1, floor - 1.55, floor), span(paint, 0.35, 2.3, y0, y1, floor - 1.35, floor)];
  out.push(span("window", -2.05, -0.55, proud, proud + 0.05, floor - 1.35, floor - 0.55), span("window", 0.55, 2.05, proud, proud + 0.05, floor - 1.15, floor - 0.45));
  out.push(span("hull-white", -0.28, 0.28, y0, y1, floor - 2.15, floor), span("glass-clear", -0.22, 0.22, proud, proud + 0.06, floor - 1.9, floor - 0.7));
  out.push(span("lamp-blue", -2.1, -0.5, proud, proud + 0.04, floor - 1.48, floor - 1.38), span("lamp-blue", 0.5, 2.1, proud, proud + 0.04, floor - 1.28, floor - 1.18));
  out.push(ball("blue", [-2.05, (y0 + y1) / 2, floor - 1.7], 0.11), ball("blue", [2.05, (y0 + y1) / 2, floor - 1.5], 0.11));
  return out;
}

/** The face of a terrace step, toward the nave: a white wall with a row of screens and a blue lamp over each, so the step reads as a laboratory and not one dark panel. */
function riser(edge: number, nave: 1 | -1, floor: number): Piece[] {
  const y0 = nave > 0 ? edge : edge - 0.06;
  const y1 = nave > 0 ? edge + 0.06 : edge;
  const lip = nave > 0 ? y1 : y0 - 0.04;
  const out: Piece[] = [span("hull-white", -2.8, 2.8, y0, y1, floor + 0.18, floor + STEP - 0.16), span("lamp-blue", -2.5, 2.5, lip, lip + 0.04, floor + 2.05, floor + 2.18)];
  for (const x of [-1.7, -0.55, 0.55, 1.7]) out.push(span("window", x - 0.36, x + 0.36, lip, lip + 0.05, floor + 0.95, floor + 1.75), span("lamp-blue", x - 0.16, x + 0.16, lip, lip + 0.045, floor + 0.7, floor + 0.84));
  return out;
}

/** A rail along the lip of a tread. */
function rail(lip: number, floor: number): Piece[] {
  const out: Piece[] = [rod("hull-white", [-3.05, lip, floor - 0.9], [3.05, lip, floor - 0.9], 0.035, 5, { only: "mesh" })];
  for (const x of [-2.4, 0, 2.4]) out.push(rod("hull-grey", [x, lip, floor], [x, lip, floor - 0.9], 0.03, 5, { only: "mesh" }));
  return out;
}

/** One bay of laboratories: three steps each side, each a bench, a lamp and an instrument wall, and now and then a person. The atrium stays clear. */
function bay(i: number, floor: number, naveW: number, tread: number, level: Level): Piece[] {
  const out: Piece[] = [];
  for (const s of [1, -1] as const) {
    for (let k = 1; k <= 3; k++) {
      const e0 = naveW + tread * (k - 1);
      const near = s > 0 ? e0 + 0.16 : -(e0 + 0.16);
      const far = s > 0 ? e0 + tread - 0.14 : -(e0 + tread - 0.14);
      const deck = floor - STEP * k;
      out.push(...riser(s > 0 ? e0 : -e0, (s > 0 ? -1 : 1) as 1 | -1, deck));
      out.push(...rail(s > 0 ? e0 + 0.08 : -(e0 + 0.08), deck));
      out.push(...bench(near + s * 0.28, near + s * 0.92, deck));
      out.push(...rack(far, (s > 0 ? -1 : 1) as 1 | -1, deck, tone[(i + k + (s > 0 ? 1 : 0)) % 3]));
      if (level === "fine" || (i + k) % 3 === 0) out.push(...person(s * 0.35, near + s * 0.55, deck, i * 9 + k * 4 + (s > 0 ? 2 : 8), false, "sit"));
    }
  }
  if (i % 4 === 1) out.push(...person((i % 3) - 1, i % 2 ? 2.3 : -2.3, floor, i + 40));
  if (i % 6 === 4) out.push(rod("hull-grey", [1.2, 2.5, floor], [1.2, 2.5, floor - 2.3], 0.045, 6, { only: "mesh" }), ball("blue", [1.2, 2.5, floor - 2.5], 0.18));
  return out;
}

/** The research ring opened and painted: glass, the sky inside it, the bare floors and the lit well, then laboratories stamped round the atrium. */
export function researchInterior(gap = 58, level: Level = "fine"): Piece[] {
  const found = rings("bow").find((one) => one.use === "research");
  if (!found) return [];
  const g = geoOf({ ...found, y: 0 });
  const rg = ground(g);
  const { nave: naveW, tread } = dims(g);
  const arc = (): readonly [number, number] => [(gap * Math.PI) / 180, TAU - (gap * Math.PI) / 180];
  const wash = (profile: [number, number][]): Lathe => ({ kind: "lathe", material: "sand", segs: 120, only: "mesh", profile, arc });
  const glow = (dy: number): Lathe => ({ kind: "lathe", material: "lamp-blue", segs: 96, only: "mesh", profile: [[rIn(g) + 2.2, dy - 0.18], [rIn(g) + 2.2, dy + 0.18]], arc });
  const out: Piece[] = [...glass(g, 0, gap), ...skyWash(g, 0, gap), ...researchHall(g, 0, gap, true), wash([[rg - 0.02, 1.4], [rg - 0.02, naveW - 0.05]]), wash([[rg - 0.02, -(naveW - 0.05)], [rg - 0.02, -1.4]]), glow(-4.2), glow(4.2)];
  const n = Math.round((TAU * rg) / 6.4);
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (az < gap || az > 360 - gap) continue;
    out.push(...place(bay(i, rg, naveW, tread, level), { at: [0, 0, 0], yaw: az }));
  }
  return out;
}

/** The research ring opened for a look inside, with the painted laboratories in place of the bare hall. */
export function researchScene(level: Level = "fine"): Piece[] {
  const gap = 58;
  const found = rings().find((one) => one.use === "research");
  if (!found) return researchInterior(gap, level);
  const dropped = ringPieces({ ...found, y: 0 }, gap).length;
  return [...cutaway4("research").slice(dropped), ...researchInterior(gap, level)];
}
