// ISV Kyotori, concept K2 "Crown", refined: the bouquet of twelve framed tanks aft, the long bare stem with the glass elevator, the payload barrel with its hinged doors, John's four-arm cross at the front (four thick habitable arms with three floors and rows of
// windows, four distinct pods, a slim rim) with the mirror reaching out through its centre. Concepts only. Pure: no three.js and no DOM.
import { ibeam, KIT, place, type Piece } from "./adapter.ts";
import { crewPort, elevator, inlineDrive, mod, telescope, truss } from "./parts.ts";
import { cross, framedTank, payloadBay2 } from "./pods.ts";
import { gAt, rpmFor } from "../ship-01/spin.ts";

const deg = (a: number): number => (a * Math.PI) / 180;

function bundle(y0: number, n: number, R: number, r: number, len: number, start: number): Piece[] {
  const out: Piece[] = [];
  const tank = framedTank(r, len);
  for (let k = 0; k < n; k++) {
    const a = deg(start + (360 * k) / n);
    out.push(...place(tank, { at: [R * Math.sin(a), y0, R * Math.cos(a)] }));
    for (const f of [0.1, 0.5, 0.9]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(a), y0 + len * f, 6.6 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}

export const K2 = { ringY: 362, R: 60 } as const;
export const k2Numbers = (): { R: number; rpm: number; g: number } => ({ R: K2.R, rpm: rpmFor(K2.R), g: gAt(K2.R, rpmFor(K2.R)) });

export function k2(): Piece[] {
  const out: Piece[] = [...inlineDrive(0), ...truss(74, 188), ...truss(302, 80)];
  out.push(...bundle(90, 6, 14, 4.5, 60, 15), ...bundle(98, 6, 25, 3.6, 44, 45), ...payloadBay2(262), ...crewPort(308), ...elevator(150, 380));
  out.push(...cross({ y: K2.ringY, R: K2.R }));
  let y = 382;
  for (const id of ["adapter-l-m", "deck-nav-m"]) {
    out.push(...mod(id, y));
    y += KIT[id].length;
  }
  out.push(...telescope(y, 24, 19, 19, 5.4).pieces);
  return out;
}
