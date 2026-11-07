// A hydroponic rack for the garden ring: trays of seedlings, a feed pipe and a grow-lamp bar. The ring's own frame: x along the street, y across the tread, z outward, so up is -z. Pure: no three.js and no DOM.
import { box, rod, type MaterialName, type Piece } from "./adapter.ts";

const slab = (m: MaterialName, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Piece => box(m, [(x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2], Math.abs(x1 - x0), Math.abs(z1 - z0), Math.abs(y1 - y0), 0, { only: "mesh", plain: true });

/** One rack on a tread, centred at `y`, standing on `z0`. `fine` adds the seedlings. */
export function trayRack(y: number, z0: number, fine: boolean): Piece[] {
  const out: Piece[] = [];
  for (const x of [-1.6, 1.6]) out.push(rod("hull-grey", [x, y, z0], [x, y, z0 - 1.6], 0.04, 6, { only: "mesh" }));
  out.push(rod("lamp-blue", [-1.6, y, z0 - 1.55], [1.6, y, z0 - 1.55], 0.06, 6, { only: "mesh" }));
  out.push(slab("hull-grey", -1.7, 1.7, y - 0.7, y + 0.7, z0 - 0.08, z0 - 0.02));
  for (const x of [-1.05, 0, 1.05]) {
    out.push(slab("hull-white", x - 0.42, x + 0.42, y - 0.55, y + 0.55, z0 - 0.22, z0 - 0.08));
    out.push(slab("soil", x - 0.34, x + 0.34, y - 0.46, y + 0.46, z0 - 0.28, z0 - 0.2));
    if (fine) for (const dy of [-0.28, 0, 0.28]) out.push(rod("crop-green", [x, y + dy, z0 - 0.28], [x, y + dy, z0 - 0.52], 0.025, 5, { only: "mesh" }));
  }
  out.push(rod("pipe-steel", [-1.6, y - 0.62, z0 - 0.16], [1.6, y - 0.62, z0 - 0.16], 0.03, 5, { only: "mesh" }));
  return out;
}
