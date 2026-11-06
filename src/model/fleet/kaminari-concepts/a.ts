// Concept A, "Quiver": thinner cylinders. One long square truss carries everything, and everything on it is slim: rings of slim propellant tanks like the barrels of a revolver, rings of cargo containers, reactor cells,
// and two counter-rotating carousels of slim habitat drums on spokes. The drive is the long in-line kind LESSONS 29 asks of a slim ship: a ring array of magnetic-nozzle thrusters on a thrust plate with a stack of fusion
// field-coil rings behind them. Real ancestors: the ISS Integrated Truss, NASA's Mars transfer vehicle studies (DRA 5.0: a long truss, a reactor behind a shadow shield, tanks and habitat at the far end), Nautilus-X's
// centrifuge, Daedalus' coil-held fusion chamber and the Saturn V's ring of engines on a thrust structure. Pure: no three.js and no DOM.
import { rng as shipRng } from "../ship-02/adapter.ts";
import { container } from "../ship-02/cargo.ts";
import { lampHalo } from "../lights.ts";
import { BLANKET, blanketPieces, RING, ringPieces } from "./arrays.ts";
import { annulus, deg, hoop, type Piece, place, revolve, rod, stamp, type Vec3 } from "./adapter.ts";
import { berthSlot } from "./berth.ts";
import { bundle, type ConceptSlot, radiatorFin, reactorCells, repeatedDrum, ringFrame, shieldDisc, stackOf, truss } from "./common.ts";
import { coilStack, thrusterRings, type ThrusterRing } from "./drive.ts";

/** Concept A's numbers, metres: where each station starts, tail to bow. */
export const A = {
  plane: 12,
  deck: [12, 14.5],
  bay: [14.5, 40],
  roof: [40, 44],
  coil: { y: [44, 104], r: 7.5, rings: 12 },
  reactors: { y: 106, rows: 3, count: 4, r: 17 },
  shield: { y: [154, 180], rBack: 28, rFront: 12 },
  truss: { half: 12, bay: 24, y: [180, 1692] },
  fins: { y: [200, 500], r0: 13.5, reach: 78, bays: 5 },
  quiver: { y: 520, pitch: 96, count: 6, tank: { count: 8, ringR: 27, tankR: 9, length: 80 } },
  cargo: { y: 1112, pitch: 44, rings: 8, count: 8, ringR: 33 },
  carousel: { y: [1488, 1612], ringR: 118, drumR: 14, drumL: 54, count: 6, hub: 15 },
  bow: { y: 1692 },
  length: 1818,
} as const;

/** The thrusters: one on the axis, six round it and twelve round those, 19 in all. */
export const THRUSTERS: readonly ThrusterRing[] = [{ count: 12, r: 28, s: 2.0 }, { count: 6, r: 12.5, s: 1.7, start: 30 }, { count: 1, r: 0, s: 1.7 }];

const local = (pieces: Piece[], y0: number, x = 0, z = 0): Piece[] => place(pieces, { at: [-x, -y0, -z] });

function thrusters(): Piece[] {
  return thrusterRings(THRUSTERS, A.plane);
}

function driveBay(): Piece[] {
  const out: Piece[] = [];
  const [d0, d1] = A.deck;
  const [b0, b1] = A.bay;
  out.push(revolve("hull-grey-dark", [[0.01, d0], [34, d0], [34, d1], [0.01, d1]], 64, [0, 0], { body: true, outline: true }));
  // the bay between the mounting deck and the roof is open: round girders and ring beams carry the thrust, and the chambers and feed lines stand in it
  for (let k = 0; k < 24; k++) {
    const a = deg(15 * k);
    out.push(rod("hull-grey", [34 * Math.sin(a), d1, 34 * Math.cos(a)], [34 * Math.sin(a), b1, 34 * Math.cos(a)], 0.9, 10, { only: undefined }));
    if (k % 2 === 0) out.push(rod("hull-grey", [34 * Math.sin(a), d1, 34 * Math.cos(a)], [34 * Math.sin(deg(15 * (k + 2))), b1, 34 * Math.cos(deg(15 * (k + 2)))], 0.5, 8));
  }
  for (const y of [b0 + 6, (b0 + b1) / 2 + 3]) out.push(hoop("hull-grey", 34, y, 0.8, 64, 8, { outline: true }));
  // the roof: a deep ring truss with radial girders that takes the thrust into the spine
  out.push(revolve("hull-grey-dark", [[0.01, A.roof[0]], [34, A.roof[0]], [34, A.roof[1]], [0.01, A.roof[1]]], 64, [0, 0], { body: true, outline: true }));
  out.push(hoop("hull-grey", 34, A.roof[0] + 2, 2, 64, 10, { outline: true }), hoop("hull-white", 17, A.roof[0] + 2, 1.4, 48, 8));
  for (let k = 0; k < 16; k++) {
    const a = deg(22.5 * k);
    out.push(rod("hull-grey", [3 * Math.sin(a), A.roof[1], 3 * Math.cos(a)], [34 * Math.sin(a), A.roof[0] + 1, 34 * Math.cos(a)], 1.1, 8));
  }
  // feed rings: a ring main round the bay carries propellant to every chamber, with a branch to each ring of thrusters
  out.push(hoop("pipe-steel", 34.9, b0 + 4, 0.6, 64, 8), hoop("coolant", 28, b1 - 3, 0.5, 64, 8), hoop("pipe-steel", 12.5, b1 - 3, 0.45, 40, 8));
  // lamps and numbers: strobes on the rim, floodlights on the deck
  for (let k = 0; k < 6; k++) out.push(rod(k % 2 ? "strobe" : "lamp-amber", [35.2 * Math.sin(deg(60 * k)), b0 + 1, 35.2 * Math.cos(deg(60 * k))], [35.2 * Math.sin(deg(60 * k)), b0 + 2.4, 35.2 * Math.cos(deg(60 * k))], 0.5, 8));
  return out;
}

function reactors(): Piece[] {
  const out: Piece[] = [];
  out.push(...coilStack(A.coil.r, A.coil.y[0], A.coil.y[1], A.coil.rings));
  const cells = reactorCells(A.reactors.count, A.reactors.r, A.reactors.rows, A.reactors.y);
  out.push(...cells.pieces);
  // the coil stack runs on up the middle of the cells as the reaction chamber's bore
  out.push(revolve("hull-white", [[A.coil.r * 0.7, A.coil.y[1]], [A.coil.r * 0.7, A.shield.y[0]]], 32, [0, 0], { body: true, outline: true }));
  // four radial heat pipes from the chamber to the cells
  for (let k = 0; k < 4; k++) {
    const a = deg(90 * k);
    for (let row = 0; row < A.reactors.rows; row++) out.push(rod("coolant", [A.coil.r * 0.75 * Math.sin(a), A.reactors.y + row * 15.5 + 7, A.coil.r * 0.75 * Math.cos(a)], [(A.reactors.r - 6) * Math.sin(a), A.reactors.y + row * 15.5 + 7, (A.reactors.r - 6) * Math.cos(a)], 0.4, 8));
  }
  return out;
}

function shadowShield(): Piece[] {
  return shieldDisc(A.shield.rBack, A.shield.rFront, A.shield.y[0], A.shield.y[1], "a-shadow");
}

function spine(): Piece[] {
  const [y0, y1] = A.truss.y;
  return [...truss(A.truss.half, A.truss.bay, y0, y1), ...lampHalo("port", [-4, y0 + 220, 0]), ...lampHalo("starboard", [4, (y0 + y1) / 2, 0]), ...lampHalo("beacon", [0, y1 - 80, 0]), ...lampHalo("nav-white", [0, y0 + 40, 0])];
}

function fins(): Piece[] {
  const out: Piece[] = [];
  [45, 135, 225, 315].forEach((az, i) => out.push(...radiatorFin(deg(az), A.fins.r0, A.fins.reach, A.fins.y[0], A.fins.y[1], A.fins.bays, i)));
  return out;
}

function quiver(i: number): Piece[] {
  const { tank } = A.quiver;
  return bundle(tank, A.truss.half, A.quiver.y + i * A.quiver.pitch, i + 1, 0.4);
}

const containerTemplates = (): Piece[][] => [0, 1].map((k) => {
  const r = shipRng(2200 + k);
  return container(0, 20, 0, 1, 1, r, `Q${k + 1}-0${k + 1}`, k ? "hull-orange" : "hull-grey-dark");
});

function cargoRing(i: number): Piece[] {
  const { y, pitch, count, ringR } = A.cargo;
  const templates = containerTemplates();
  const y0 = y + i * pitch;
  const out: Piece[] = [];
  for (let k = 0; k < count; k++) {
    const a = (360 * k) / count + 22.5 * (i % 2);
    out.push(...place(templates[(k + i) % 2], { at: [ringR * Math.sin(deg(a)), y0 + 2, ringR * Math.cos(deg(a))], yaw: a }));
  }
  out.push(...ringFrame(ringR, 11, A.truss.half, y0 + 1.5, i), ...ringFrame(ringR, 11, A.truss.half, y0 + pitch - 5.5, i + 1));
  return out;
}

function carousel(which: 0 | 1): Piece[] {
  const [y0, y1] = A.carousel.y;
  const mid = which === 0 ? y0 : (y0 + y1) / 2 + 2;
  const hubL = 56;
  const { ringR, drumR, drumL, count, hub } = A.carousel;
  const out: Piece[] = [];
  // the hub: a bearing drum round the truss that turns, with a stationary collar at each end
  out.push(revolve("hull-white", [[hub, mid], [hub, mid + hubL]], 40, [0, 0], { body: true, outline: true }), annulus("hull-grey-dark", hub - 1, hub + 2, mid - 1, mid + 2, 40, { outline: true }), annulus("hull-grey-dark", hub - 1, hub + 2, mid + hubL - 2, mid + hubL + 1, 40, { outline: true }));
  const drum = repeatedDrum(drumR, drumL);
  const poses = Array.from({ length: count }, (_, i) => ({ at: [ringR * Math.sin(deg((360 * i) / count + 30 * which)), mid + (hubL - drumL) / 2, ringR * Math.cos(deg((360 * i) / count + 30 * which))] as Vec3, yaw: (360 * i) / count + 30 * which }));
  out.push(...stamp(drum, poses));
  // spokes: two for every drum, each a lattice of round tube from the hub to the rim cage, and a rim cage at each end of the drums: two hoops, inside and outside the drums, tied by a strut at each drum
  for (let i = 0; i < count; i++) {
    const a = deg((360 * i) / count + 30 * which);
    const sn = Math.sin(a);
    const cs = Math.cos(a);
    for (const dy of [0.15, 0.85]) {
      const y = mid + hubL * dy;
      for (const [s, t] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) out.push(rod("hull-grey", [hub * sn + (s * 2.2 * cs), y + t * 2.2, hub * cs - s * 2.2 * sn], [(ringR - drumR - 1.5) * sn + s * 2.2 * cs, y + t * 2.2, (ringR - drumR - 1.5) * cs - s * 2.2 * sn], 0.7, 8, { only: undefined }));
      for (let q = 0; q < 14; q++) {
        const r0 = hub + ((ringR - drumR - 1.5 - hub) * q) / 14;
        const r1 = hub + ((ringR - drumR - 1.5 - hub) * (q + 1)) / 14;
        const f = q % 2 ? 1 : -1;
        out.push(rod("hull-grey-dark", [r0 * sn + f * 2.2 * cs, y, r0 * cs - f * 2.2 * sn], [r1 * sn - f * 2.2 * cs, y, r1 * cs + f * 2.2 * sn], 0.3, 6), rod("hull-grey-dark", [r0 * sn, y + f * 2.2, r0 * cs], [r1 * sn, y - f * 2.2, r1 * cs], 0.3, 6));
      }
    }
  }
  for (const y of [mid + (hubL - drumL) / 2 - 3, mid + (hubL + drumL) / 2 + 3]) {
    out.push(hoop("hull-grey", ringR - drumR - 1.5, y, 1.1, 96, 8, { outline: true }), hoop("hull-grey", ringR + drumR + 1.5, y, 1.1, 96, 8, { outline: true }));
    for (let i = 0; i < count; i++) {
      const a = deg((360 * i) / count + 30 * which);
      out.push(rod("hull-grey", [(ringR - drumR - 1.5) * Math.sin(a), y, (ringR - drumR - 1.5) * Math.cos(a)], [(ringR + drumR + 1.5) * Math.sin(a), y, (ringR + drumR + 1.5) * Math.cos(a)], 0.9, 8));
    }
  }
  return out;
}

const BOW = ["node-four", "adapter-l-m", "habitat-drum-crew", "common-area-m", "solarium-m", "lab-m", "pod-survey-m", "deck-nav-m", "dome-observation-m"];
function bow(): Piece[] {
  return stackOf(BOW, A.bow.y, 0.8, "bowA").pieces;
}

const bowEnd = stackOf(BOW, A.bow.y, 0.25).end;

function shieldFront(): Piece[] {
  return shieldDisc(26, 8, bowEnd, A.length, "a-bow");
}

/** The slots, tail to bow. */
export const SLOTS_A: readonly ConceptSlot[] = [
  { slot: "spine", name: "Truss spine", kind: "spacecraft", at: [0, A.truss.y[0], 0], height: A.truss.y[1] - A.truss.y[0], diameter: 28, note: "A 24 m square truss in 24 m bays, 1.5 km long, with four service lines. Descends from the ISS Integrated Truss and the Mars transfer vehicle studies' long truss.", pieces: () => local(spine(), A.truss.y[0]) },
  { slot: "thrusters", name: "Drive array: 19 magnetic-nozzle thrusters", kind: "engine", at: [0, 0, 0], height: 35, diameter: 72, note: "Nineteen magnetic-nozzle thrusters in three rings, on the mounting deck. Descends from the VASIMR VX-200 and the X3 nested Hall thruster.", pieces: thrusters },
  { slot: "drive-bay", name: "Engine bay and thrust plate", kind: "service-module", at: [0, A.deck[0], 0], height: A.roof[1] - A.deck[0], diameter: 2 * 36, note: "The mounting deck, the open girder bay with its feed rings, and the thrust plate that carries the thrust into the truss. Descends from the Saturn V's thrust structure.", pieces: () => local(driveBay(), A.deck[0]) },
  { slot: "reactors", name: "Fusion coil stack and reactor cells", kind: "service-module", at: [0, A.coil.y[0], 0], height: A.reactors.y + 3 * 15.5 - A.coil.y[0], diameter: 48, note: "A stack of twelve superconducting coil rings on a ceramic bore and twelve reactor cells round it. Descends from Princeton's direct fusion drive and the Daedalus reaction chamber.", pieces: () => local(reactors(), A.coil.y[0]) },
  { slot: "shadow-shield", name: "Shadow shield", kind: "fairing", at: [0, A.shield.y[0], 0], height: A.shield.y[1] - A.shield.y[0], diameter: 2 * A.shield.rBack, note: "A tiled cone that throws a shadow of the radiation of the reactors over the length of the ship behind it. Descends from the NERVA and Kilopower shadow shields.", pieces: () => local(shadowShield(), A.shield.y[0]) },
  { slot: "radiators", name: "Radiator fins (four)", kind: "arms", at: [0, A.fins.y[0], 0], height: A.fins.y[1] - A.fins.y[0], diameter: 132, note: "Four flat radiator fins on boom trusses, 300 m long and 78 m deep, set on the diagonals clear of the exhaust. Descends from the ISS thermal radiator wings and the Mars transfer vehicle studies' radiators.", pieces: () => local([...fins(), ...lampHalo("port", [-16, 300, 0], 3), ...lampHalo("starboard", [16, 400, 0], 3), ...lampHalo("beacon", [0, 250, 16], 3), ...lampHalo("nav-white", [0, 450, 0], 3)], A.fins.y[0]) },
  berthSlot("a"),
  ...Array.from({ length: A.quiver.count }, (_, i): ConceptSlot => ({ slot: `quiver-${i + 1}`, name: `Tank quiver ${i + 1}: eight slim tanks`, kind: "tank", at: [0, A.quiver.y + i * A.quiver.pitch, 0], height: A.quiver.tank.length + 4, diameter: 2 * (A.quiver.tank.ringR + A.quiver.tank.tankR) + 2, note: "Eight slim propellant tanks 18 m across and 80 m long round the truss, held at both ends by ring frames. Descends from the Space Shuttle's external tank and Soyuz's bundle of tanks.", pieces: () => local(quiver(i), A.quiver.y + i * A.quiver.pitch) })),
  ...Array.from({ length: A.cargo.rings }, (_, i): ConceptSlot => ({ slot: `cargo-${i + 1}`, name: `Cargo ring ${i + 1}: eight containers`, kind: "mount", at: [0, A.cargo.y + i * A.cargo.pitch, 0], height: A.cargo.pitch, diameter: 94, note: "Eight 22 by 22 by 40 m containers on a ring frame with twist-locks. Descends from container-ship cell guides and the ISS external logistics carriers.", pieces: () => local(cargoRing(i), A.cargo.y + i * A.cargo.pitch) })),
  { slot: "carousel-a", name: "Habitat carousel A: six slim drums", kind: "ring", at: [0, A.carousel.y[0], 0], height: 60, diameter: 268, note: "Six slim habitat drums on spokes round a bearing hub, turning once in 22 s for one g at the rim. Descends from NASA's Nautilus-X centrifuge and von Braun's wheel.", pieces: () => local(carousel(0), A.carousel.y[0]) },
  { slot: "carousel-b", name: "Habitat carousel B: six slim drums, counter-rotating", kind: "ring", at: [0, (A.carousel.y[0] + A.carousel.y[1]) / 2 + 2, 0], height: 60, diameter: 268, note: "The second carousel turns the other way, so the two cancel each other's torque. Descends from the same wheel studies.", pieces: () => local(carousel(1), (A.carousel.y[0] + A.carousel.y[1]) / 2 + 2) },
  { slot: "bow", name: "Crew bow: command, common area, solarium, laboratory and dome", kind: "spacecraft", at: [0, A.bow.y, 0], height: bowEnd - A.bow.y + 1, diameter: 20, note: "A stack of the kit's crew modules: the docking node, a crew drum, the common area, the solarium, a laboratory, the survey pod, the navigation deck and the observation dome. Descends from the ISS nodes, Columbus and the Cupola.", pieces: () => local(bow(), A.bow.y) },
  { slot: "shield", name: "Forward dust shield", kind: "fairing", at: [0, bowEnd, 0], height: A.length - bowEnd, diameter: 52, note: "A tiled cone ahead of the crew: at a quarter of the speed of light, dust hits like bullets. Descends from Daedalus' beryllium dust shield.", pieces: () => local(shieldFront(), bowEnd) },
  { slot: "array-blanket", name: "Blanket array", kind: "arms", at: [0, BLANKET.y, 0], height: BLANKET.half, diameter: 51, note: "Two gold cell blankets on a lattice mast at the tail. Eight panels stack into 50 m and pay out to 400 m. Descends from the ISS solar array wings.", pieces: () => local(blanketPieces(), BLANKET.y) },
  { slot: "array-ring", name: "Ring array", kind: "arms", at: [0, RING.y, 0], height: RING.half, diameter: 224, note: "A ring of trapezoid solar panels on spokes at the bow. Folded, the wide outer wedges stack on the hub (about 224 m across); paid out, they meet as one annulus 400 m across. Descends from annular solar arrays.", pieces: () => local(ringPieces(), RING.y) },
];
