// Concept C, "Carrier": a spine with two of ISV Miyamoto and two of ISV Ariake docked round it. The shaft is a long truss round a transit tube, with two stations of propellant barrels aft and, in two pairs along its length, four slots
// where the package's own model of each ship, at its true size, docks by its keel: the first pair at the top and bottom of the shaft, the second pair a quarter turn on, so no craft's hangar shoulders meet another's.
// The drive is the flank-pod kind LESSONS 29 allows: four outrigger pods of seven magnetic-nozzle thrusters each, and one large thruster on the axis in a stack of fusion coil rings. Real ancestors: the Space Shuttle on
// its carrier aircraft and the ISS's docking ports, Gateway's visiting vehicles, the Saturn V's four outboard engines on their outriggers, Soyuz's strap-on boosters and Nautilus-X's docked modules. Pure: no three.js and no DOM.
import { detail as buildDetail } from "../../detail.ts";
import { parts as miyamotoParts } from "../ship-03/index.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../ship-03/variants.ts";
import { habitatPieces } from "../ship-02/habitat.ts";
import { BUILDERS, cub, deg, hoop, type Piece, place, revolve, rod, type Vec3 } from "./adapter.ts";
import { berthSlot } from "./berth.ts";
import { bundle, type ConceptSlot, reactorCells, ringFrame, shieldDisc, stackOf, truss } from "./common.ts";
import { coilStack, mnThruster, thrusterRings, thrusterSize } from "./drive.ts";
import { scalePieces } from "./scale.ts";

export const C = {
  centre: { s: 3.2, plane: 40 },
  pod: { r: 62, plane: 22, s: 1.5, hex: 11.5 },
  coil: { y: [46, 150] as const, r: 14, rings: 10 },
  reactors: { y: 152, rows: 2, count: 4, r: 25 },
  shield: { y: [186, 214] as const, rBack: 34, rFront: 14 },
  truss: { half: 18, bay: 36, y: [214, 1510] as const },
  barrels: { y: [250, 392], count: 6, ringR: 40, R: 15, L: 110 },
  craft: { rKeel: 34, slots: [{ az: 0, y: 560, ship: "miyamoto" }, { az: 180, y: 560, ship: "ariake" }, { az: 90, y: 980, ship: "miyamoto" }, { az: 270, y: 980, ship: "ariake" }] as const },
  ring: { scale: 0.62, y: [1380, 1430] as const },
  bow: { y: 1510 },
  length: 1790,
} as const;

const local = (pieces: Piece[], y0: number, x = 0, z = 0): Piece[] => place(pieces, { at: [-x, -y0, -z] });

function centreDrive(): Piece[] {
  const out = thrusterRings([{ count: 1, r: 0, s: C.centre.s }], C.centre.plane);
  const { plane } = C.centre;
  const R = 26;
  out.push(revolve("hull-grey-dark", [[0.01, plane], [R, plane], [R, plane + 3], [0.01, plane + 3]], 56, [0, 0], { body: true, outline: true }));
  for (let k = 0; k < 12; k++) out.push(rod("hull-grey", [R * Math.sin(deg(30 * k)), plane + 3, R * Math.cos(deg(30 * k))], [3 * Math.sin(deg(30 * k)), plane + 24, 3 * Math.cos(deg(30 * k))], 0.9, 8));
  return out;
}

function pods(): Piece[] {
  const { r, plane, s, hex } = C.pod;
  const out: Piece[] = [];
  const unit: Piece[] = [];
  const spots: [number, number][] = [[0, 0], ...Array.from({ length: 6 }, (_, k): [number, number] => [hex * Math.sin(deg(60 * k)), hex * Math.cos(deg(60 * k))])];
  const t = mnThruster(s);
  for (const [x, z] of spots) unit.push(...place(t, { at: [x, 0, z] }));
  // the pod's deck: a hexagonal plate the thrusters stand through, a roof, and the feed ring
  const pod: Piece[] = [...unit, revolve("hull-grey-dark", [[0.01, 0], [hex + 7, 0], [hex + 7, 2], [0.01, 2]], 6, [0, 0], { body: true, outline: true }), revolve("hull-grey-dark", [[0.01, 16], [hex + 7, 16], [hex + 7, 20], [0.01, 20]], 6, [0, 0], { body: true, outline: true }), hoop("pipe-steel", hex, 14, 0.5, 36, 8), hoop("coolant", hex * 0.5, 14, 0.4, 24, 8)];
  for (let k = 0; k < 6; k++) pod.push(rod("hull-grey", [(hex + 6) * Math.sin(deg(60 * k + 30)), 2, (hex + 6) * Math.cos(deg(60 * k + 30))], [(hex + 6) * Math.sin(deg(60 * k + 30)), 16, (hex + 6) * Math.cos(deg(60 * k + 30))], 0.7, 8));
  for (const az of [45, 135, 225, 315]) {
    const a = deg(az);
    out.push(...place(pod, { at: [r * Math.sin(a), plane, r * Math.cos(a)], yaw: az }));
    // the outrigger: a deep round-tube truss from the shaft to the pod's roof, and a brace to a higher point on the shaft
    const rA = 17;
    for (const o of [-3.5, 3.5]) {
      const tx = Math.cos(a) * o;
      const tz = -Math.sin(a) * o;
      out.push(rod("hull-grey", [rA * Math.sin(a) + tx, plane + 21, rA * Math.cos(a) + tz], [(r - hex - 4) * Math.sin(a) + tx, plane + 21, (r - hex - 4) * Math.cos(a) + tz], 1.1, 10, { only: undefined }), rod("hull-grey", [rA * Math.sin(a) + tx, plane + 70, rA * Math.cos(a) + tz], [(r - hex - 4) * Math.sin(a) + tx, plane + 21, (r - hex - 4) * Math.cos(a) + tz], 0.9, 10));
    }
    for (let q = 1; q < 6; q++) {
      const rr = rA + ((r - hex - 4 - rA) * q) / 6;
      out.push(rod("hull-grey-dark", [rr * Math.sin(a) + Math.cos(a) * 3.5, plane + 21, rr * Math.cos(a) - Math.sin(a) * 3.5], [rr * Math.sin(a) - Math.cos(a) * 3.5, plane + 21, rr * Math.cos(a) + Math.sin(a) * 3.5], 0.5, 8));
    }
  }
  return out;
}

function stackAndReactors(): Piece[] {
  const out = coilStack(C.coil.r, C.coil.y[0], C.coil.y[1], C.coil.rings);
  out.push(...reactorCells(C.reactors.count, C.reactors.r, C.reactors.rows, C.reactors.y).pieces);
  out.push(revolve("hull-white", [[C.coil.r * 0.7, C.coil.y[1]], [C.coil.r * 0.7, C.shield.y[0]]], 32, [0, 0], { body: true, outline: true }));
  return out;
}

function shaft(): Piece[] {
  const out = truss(C.truss.half, C.truss.bay, C.truss.y[0], C.truss.y[1]);
  const [y0, y1] = C.truss.y;
  // the transit tube down the middle: a pressurised corridor with a ring frame at every bay, and lamps
  out.push(revolve("hull-white", [[5.5, y0], [5.5, y1]], 36, [0, 0], { body: true, outline: true }));
  for (let y = y0 + C.truss.bay / 2; y < y1; y += C.truss.bay) out.push(hoop("hull-grey-dark", 5.7, y, 0.35, 28, 6), rod("lamp-blue", [5.9, y + 4, 0], [5.9, y + 4.8, 0], 0.3, 6));
  return out;
}

function barrels(): Piece[] {
  const { y, count, ringR, R, L } = C.barrels;
  const out: Piece[] = [];
  [y[0], y[1] + 0].forEach((yy, i) => out.push(...bundle({ count, ringR, tankR: R, length: L }, C.truss.half, yy + i * L * 0.12, i + 3, 0.4)));
  return out;
}

const DOCKED_VARIANT = { miyamoto: "miyamoto-array", ariake: "ariake" } as const;

/** One of the package's own ships, in its own frame: Miyamoto with the gold array out, or Ariake with her four boxes and dawn-gold bands. */
export function docked(which: keyof typeof DOCKED_VARIANT, detail: number, level?: "coarse" | "fine"): Piece[] {
  const slots = new Set(Object.values(MIYAMOTO_VARIANT_SLOTS[DOCKED_VARIANT[which]]));
  return miyamotoParts().filter((p) => slots.has(p.id)).flatMap((p) => place(p.pieces({ detail, ...(level ? { level } : {}) }), { at: [p.place?.x ?? 0, p.y0, p.place?.z ?? 0] }));
}

/** Miyamoto with the gold array out, the craft the reference pictures stand beside the carrier. */
export function miyamoto(detail: number, level?: "coarse" | "fine"): Piece[] {
  return docked("miyamoto", detail, level);
}

/** One slot: the craft, turned to face outward at `az` degrees round the shaft and standing with its keel `rKeel` from the axis. */
function craft(az: number, y0: number, which: keyof typeof DOCKED_VARIANT, detail: number, level?: "coarse" | "fine"): Piece[] {
  const a = deg(az);
  return place(docked(which, detail, level), { at: [(C.craft.rKeel + 40) * Math.sin(a), y0, (C.craft.rKeel + 40) * Math.cos(a)], yaw: az });
}

/** The cradle of a slot: two rails along the keel, five clamp towers from the shaft to the rails, umbilical lines and the lamps that say the slot is in use. Built facing +Z, then turned. */
function cradle(az: number, y0: number): Piece[] {
  const local0: Piece[] = [];
  const rk = C.craft.rKeel;
  const h = C.truss.half;
  for (const x of [-8, 8]) local0.push(cub("hull-grey-dark", [x - 1.6, x + 1.6], [y0 + 14, y0 + 366], [rk - 2.4, rk + 0.4], { only: undefined }), rod("hull-yellow", [x, y0 + 14, rk - 2.6], [x, y0 + 366, rk - 2.6], 0.4, 8));
  for (const dy of [20, 100, 190, 280, 360]) {
    for (const x of [-8, 8]) local0.push(rod("hull-grey", [x * 0.8, y0 + dy, h], [x, y0 + dy, rk - 2.4], 1.2, 10, { only: undefined }));
    local0.push(rod("hull-grey-dark", [-8, y0 + dy, rk - 2.4], [8, y0 + dy, rk - 2.4], 0.9, 8), cub("hull-orange", [-3, 3], [y0 + dy - 3, y0 + dy + 3], [h - 0.4, h + 3.6]), rod("lamp-amber", [-6, y0 + dy, rk - 3], [-6, y0 + dy + 1.2, rk - 3], 0.5, 8), rod("lamp-blue", [6, y0 + dy, rk - 3], [6, y0 + dy + 1.2, rk - 3], 0.5, 8));
  }
  for (const x of [-3, 3]) local0.push(rod(x < 0 ? "coolant" : "copper", [x, y0 + 30, h + 1], [x, y0 + 350, h + 1], 0.45, 8));
  return place(local0, { at: [0, 0, 0], yaw: az });
}

const BOW = ["node-four", "farm-drum", "habitat-drum-large", "farm-drum", "habitat-drum-large", "adapter-l-m", "common-area-m", "solarium-m", "lab-m", "pod-survey-m", "deck-nav-m", "dome-observation-m"];
const bowEnd = stackOf(BOW, C.bow.y, 0.25).end;

function habitatRings(): Piece[] {
  const ring = scalePieces(habitatPieces(0), C.ring.scale);
  const second = scalePieces(habitatPieces(1), C.ring.scale);
  return [...place(ring, { at: [0, 0, 0] }), ...place(second, { at: [0, 21.5 * 1.7, 0] })];
}
const ringsHeight = 36 * C.ring.scale * 1 + 21.5 * 1.7;

/** The slots, tail to bow. */
export const SLOTS_C: readonly ConceptSlot[] = [
  { slot: "shaft", name: "Shaft: truss and transit tube", kind: "spacecraft", at: [0, C.truss.y[0], 0], height: C.truss.y[1] - C.truss.y[0], diameter: 40, note: "A 36 m square truss in 36 m bays round a pressurised transit tube, 1.3 km long. Descends from the ISS Integrated Truss and the Mars transfer vehicle studies' long truss.", pieces: () => local(shaft(), C.truss.y[0]) },
  { slot: "centre-drive", name: "Axis thruster: one large magnetic-nozzle thruster", kind: "engine", at: [0, 0, 0], height: 76, diameter: 53, note: "One thruster 3.2 times the size of a pod thruster, on the axis, on a plate with twelve spokes. Descends from the VASIMR VX-200 and Princeton's direct fusion drive.", pieces: centreDrive },
  { slot: "pods", name: "Flank drive pods: four pods of seven thrusters", kind: "engine", at: [0, 0, 0], height: 92, diameter: 126, note: "Four hexagonal pods of seven magnetic-nozzle thrusters each, on outrigger trusses on the diagonals, clear of the docked craft. Descends from the Saturn V's four outboard engines and the Space Shuttle's OMS pods.", pieces: pods },
  { slot: "coil-stack", name: "Fusion coil stack and reactor cells", kind: "service-module", at: [0, C.coil.y[0], 0], height: C.shield.y[0] - C.coil.y[0] + 1, diameter: 64, note: "Ten superconducting coil rings on a ceramic bore, and eight reactor cells round it. Descends from Princeton's direct fusion drive and Kilopower.", pieces: () => local(stackAndReactors(), C.coil.y[0]) },
  { slot: "shadow-shield", name: "Shadow shield", kind: "fairing", at: [0, C.shield.y[0], 0], height: C.shield.y[1] - C.shield.y[0], diameter: 2 * C.shield.rBack, note: "A tiled cone that throws a shadow of the reactors' radiation forward over the shaft, the craft and the crew. Descends from the NERVA and Kilopower shadow shields.", pieces: () => local(shieldDisc(C.shield.rBack, C.shield.rFront, C.shield.y[0], C.shield.y[1], "c-shadow"), C.shield.y[0]) },
  { slot: "barrels", name: "Propellant barrels: two stations of six", kind: "tank", at: [0, C.barrels.y[0], 0], height: C.barrels.y[1] + C.barrels.L * 1.12 - C.barrels.y[0], diameter: 114, note: "Twelve propellant barrels 30 m across and 110 m long, in two rings of six round the shaft. Descends from the Space Shuttle's external tank and Soyuz's strap-on tanks.", pieces: () => local(barrels(), C.barrels.y[0]) },
  ...C.craft.slots.map((s, i): ConceptSlot => ({ slot: `miyamoto-${i + 1}`, name: s.ship === "miyamoto" ? `Docked craft ${i + 1}: ISV Miyamoto, solar array out` : `Docked craft ${i + 1}: ISV Ariake`, kind: "module", at: [0, s.y, 0], height: 380, diameter: s.ship === "miyamoto" ? 200 : 207, note: s.ship === "miyamoto" ? "ISV Miyamoto's own model at its true size, the gold solar array deployed, docked by its keel in a cradle. Descends from the Space Shuttle on its carrier aircraft and the ISS's visiting vehicles." : "ISV Ariake's own model at its true size, four hangar boxes, the hex engine end and the dawn-gold bands, docked by its keel in a cradle. Descends from the Space Shuttle on its carrier aircraft and the ISS's visiting vehicles.", pieces: () => local(craft(s.az, s.y, s.ship, 1, buildDetail.level === "coarse" ? "coarse" : "fine"), s.y) })),
  ...C.craft.slots.map((s, i): ConceptSlot => ({ slot: `cradle-${i + 1}`, name: `Docking cradle ${i + 1}`, kind: "mount", at: [0, s.y, 0], height: 366, diameter: 19, note: "Two rails, five clamp towers from the shaft, and umbilical lines that hold a docked craft by its keel. Descends from the ISS common berthing mechanism and the Shuttle's payload-bay latches.", pieces: () => local(cradle(s.az, s.y), s.y) })),
  berthSlot("c"),
  { slot: "rings", name: "Habitat rings (two, counter-rotating)", kind: "ring", at: [0, C.ring.y[0], 0], height: ringsHeight, diameter: 239, note: "Two counter-rotating habitat rings 100 m from the axis, at one turn in 24 s for a little under one Earth gravity. Descends from Von Braun's wheel and NASA's Nautilus-X centrifuge.", pieces: habitatRings },
  { slot: "bow", name: "Crew bow: farms, passenger drums, common area, solarium, laboratory and dome", kind: "spacecraft", at: [0, C.bow.y, 0], height: bowEnd - C.bow.y + 1, diameter: 17, note: "The kit's crew modules end to end: a docking node, two farm drums, two passenger drums, the common area, the solarium, a laboratory, the survey pod, the navigation deck and the observation dome.", pieces: () => local(stackOf(BOW, C.bow.y, 0.7, "bowC").pieces, C.bow.y) },
  { slot: "shield", name: "Forward dust shield", kind: "fairing", at: [0, bowEnd, 0], height: C.length - bowEnd, diameter: 56, note: "A tiled cone ahead of the crew. Descends from Daedalus' dust shield.", pieces: () => local(shieldDisc(28, 8, bowEnd, C.length, "c-bow"), bowEnd) },
];
void [BUILDERS, ringFrame, thrusterSize] as unknown;
export type { Vec3 };
