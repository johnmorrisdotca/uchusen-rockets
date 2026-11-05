// The four ships of the Kyotori class are one design with deliberate differences, as the sisters Miyamoto and Ariake are: each carries one extra role group on its outer side and shares every other part. A: survey and mapping (sensor booms with
// radar, lidar and camera heads). B: laboratory (sample labs, a clean room and a cold store). C: astronomy (a second telescope on its own mast). D: crew and medical (extra quarters and a sick bay). Names come later: A, B, C and D stand in. Standing
// in a ship's own frame (the shaft up Y, its outer side +X), built from the kit's modules and plates only. Pure: no three.js and no DOM.
import { antenna, box, horn, ibeam, KIT, lamps, place, rod, roundStrut, type Piece, type Vec3 } from "./adapter.ts";
import { mod, telescope } from "./parts.ts";

export type Role = "survey" | "laboratory" | "astronomy" | "crew";

const side = (id: string, y: number, x: number, z = 0): Piece[] => place(mod(id, 0), { at: [x, y, z] });
const strut = (y: number, x: number): Piece[] => [...ibeam("hull-grey", [6.4, y, 0], [x - 5, y, 0], 1.0, 0.7, [0, 1, 0]), ...ibeam("hull-grey", [6.4, y + KIT["lab-m"].length, 0], [x - 5, y + KIT["lab-m"].length, 0], 1.0, 0.7, [0, 1, 0])];

/** A survey ship's two sensor booms: a lattice mast 34 m out from the shaft, with a lidar drum, a radar panel, a camera cluster and a star tracker on its head, and a deployed-looking hinge half way. */
function survey(): Piece[] {
  const out: Piece[] = [];
  for (const [y, tilt] of [[150, 0.12], [214, -0.1]] as const) {
    const tip: Vec3 = [40, y + tilt * 40, 0];
    out.push(...ibeam("hull-grey", [6.4, y, 0], tip, 1.4, 1.0, [0, 1, 0]), ...ibeam("hull-grey", [6.4, y + 1.2, 0], [tip[0], tip[1] + 1.2, 0], 1.4, 1.0, [0, 1, 0]));
    for (let k = 0; k < 6; k++) out.push(...roundStrut("hull-grey-dark", [10 + k * 5, y, 0.0], [12.5 + k * 5, y + 1.2, 0], 0.16));
    out.push(box("hull-grey-dark", [20, y + 0.6 + tilt * 14, 0], 1.6, 1.6, 2.4, 0, { only: "mesh", plain: true }), box("hull-yellow", [20, y + 0.6 + tilt * 14, 0], 1.7, 0.2, 2.5, 0, { only: "mesh", plain: true }));
    // the head: a lidar drum, a radar panel, a camera cluster, a star tracker
    out.push(rod("hull-white", [tip[0], tip[1] - 1.6, 0], [tip[0], tip[1] + 1.6, 0], 1.7, 16, { only: "mesh" }), rod("black", [tip[0], tip[1] + 0.2, 1.7], [tip[0], tip[1] + 0.4, 1.75], 0.5, 12, { only: "mesh" }), box("hull-grey-dark", [tip[0] + 2.2, tip[1], 0], 0.25, 5.4, 3.4, 0, { only: "mesh", plain: true }));
    for (let r = 0; r < 4; r++) out.push(box("window", [tip[0] + 2.35, tip[1] - 1 + r * 0.8, 0], 0.05, 5.0, 0.5, 0, { only: "mesh", plain: true }));
    out.push(...horn("hull-grey", [tip[0] + 1.8, tip[1] - 1, -1.4], [tip[0] + 3.4, tip[1] - 1, -1.4], [0.35, 0.5], 10), ...horn("hull-grey", [tip[0] + 1.8, tip[1] - 1, 1.4], [tip[0] + 3.4, tip[1] - 1, 1.4], [0.35, 0.5], 10), ...antenna("whip", [tip[0], tip[1] + 1.6, 0], [0, 1, 0], 4, `sv${y}`), ...lamps([{ at: [tip[0] + 0.2, tip[1] + 1.8, 0.2], colour: "strobe", size: 0.14 }]));
  }
  return out;
}

/** A laboratory ship's side labs: two lab modules and a refrigerated container on struts from the shaft, with a clean room (a white box with an airlock and a glass front lit blue) and a sample rack of cases between them. */
function laboratory(): Piece[] {
  const out: Piece[] = [...side("lab-m", 160, 17), ...strut(160, 17), ...side("lab-m", 178, 17), ...strut(178, 17), ...side("container-12-cold", 196, 17), ...strut(196, 17)];
  out.push(box("hull-white", [17, 216, 0], 8, 9, 9, 0, { only: "mesh", plain: true }), box("lamp-blue", [21.05, 220, 0], 0.1, 7, 4.8, 0, { only: "mesh", plain: true }), box("hull-grey-dark", [21.1, 216.2, 0], 0.2, 2.2, 3.6, 0, { only: "mesh", plain: true }), box("hazard", [21.12, 216.2, 0], 0.05, 2.3, 0.3, 0, { only: "mesh", plain: true }), ...ibeam("hull-grey", [6.4, 217, 0], [12.4, 217, 0], 1.0, 0.7, [0, 1, 0]));
  for (let k = 0; k < 8; k++) out.push(box(k % 3 ? "hull-white-worn" : "hull-blue", [17 + (k % 4) * 1.1 - 1.6, 228 + Math.floor(k / 4) * 1.1, 0], 1, 1, 0.9, 0, { only: "mesh", plain: true }));
  out.push(...lamps([{ at: [21.2, 224.2, 3.6], colour: "blue", size: 0.16 }]));
  return out;
}

/** An astronomy ship's second telescope: its own lattice mast out from the shaft carrying a smaller mirror of seven segments and a sun shield, so the ship can watch while the station's mirror watches another sky. */
function astronomy(): Piece[] {
  const out: Piece[] = [...ibeam("hull-grey", [6.4, 200, 0], [20, 200, 0], 1.6, 1.0, [0, 1, 0]), ...ibeam("hull-grey", [6.4, 203, 0], [20, 203, 0], 1.6, 1.0, [0, 1, 0])];
  out.push(...place(telescope(200, 14, 9, 9, 2.6).pieces, { at: [20, 0, 0] }));
  out.push(box("hull-grey-dark", [20, 199.2, 0], 3, 3, 1.6, 0, { only: "mesh", plain: true }), ...lamps([{ at: [20, 199, 1.6], colour: "amber", size: 0.18 }]));
  return out;
}

/** A crew and medical ship's extra quarters: two more habitat drums, a common area and a medical pod (the sick bay) on struts, with a red-cross panel and a lit window band. */
function crew(): Piece[] {
  const out: Piece[] = [...side("habitat-drum-crew", 156, 18), ...strut(156, 18), ...side("habitat-drum-crew", 176, 18), ...strut(176, 18), ...side("common-area-m", 196, 18), ...strut(196, 18), ...side("pod-medical-m", 210, 18, 0), ...strut(210, 18)];
  out.push(box("hull-white", [18, 215.4, 4.2], 2.4, 0.1, 2.4, 0, { only: "mesh", plain: true }), box("lamp-red", [18, 215.4, 4.28], 2.0, 0.02, 0.5, 0, { only: "mesh", plain: true }), box("lamp-red", [18, 215.4, 4.28], 0.5, 0.02, 2.0, 0, { only: "mesh", plain: true }));
  return out;
}

/** The role group of a role, in the ship's own frame. */
export const rolePieces = (role: Role): Piece[] => ({ survey, laboratory, astronomy, crew })[role]();
