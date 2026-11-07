// The research ring's hall: an open atrium and terraces of laboratories. It is not a second copy of the living town, so it has no canal and no houses. The ring's own frame, up toward the hub. Pure: no three.js and no DOM.
import { box, place, type Lathe, type MaterialName, type Piece } from "./adapter.ts";
import { dims, ground, STEP } from "./rings.ts";
import type { Geo } from "./wheelparts.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;

/** A box by its ranges: x centre and width, axial from y0 to y1, radial from z0 to z1. */
const blk = (material: MaterialName, x: number, wide: number, y0: number, y1: number, z0: number, z1: number): Piece => box(material, [x, y0, (z0 + z1) / 2], wide, Math.abs(z1 - z0), y1 - y0, 0, { only: "mesh", plain: true });

/** One laboratory on a terrace: a bench, a glass screen behind it, and a blue lamp over the bench. */
function laboratory(y0: number, y1: number, floor: number): Piece[] {
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  const back = y0 < y1 ? hi - 0.15 : lo + 0.15;
  return [
    blk("hull-grey", 0, 4.6, lo + 0.35, hi - 0.35, floor - 0.72, floor - 0.08),
    blk("hull-white", 0, 4.8, lo + 0.25, hi - 0.25, floor - 0.86, floor - 0.72),
    blk("window", 0, 4.4, back - 0.04, back + 0.04, floor - 2.4, floor - 0.9),
    blk("lamp-blue", 0, 3.8, (lo + hi) / 2 - 0.55, (lo + hi) / 2 + 0.55, floor - 1.75, floor - 1.35),
  ];
}

/**
 * The research ring opened as laboratories round an atrium. The nave is a clear floor with a lit well. Each terrace step is a row of benches. `bare` keeps the floors and leaves the benches off.
 */
export function researchHall(g: Geo, y: number, gap?: number, bare = false): Piece[] {
  const { nave, tread } = dims(g);
  const rg = ground(g);
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  const shut = (az: number): boolean => !gap || (az >= gap && az <= 360 - gap);
  const lathe = (material: MaterialName, profile: [number, number][]): Lathe => ({ kind: "lathe", material, segs: 160, only: "mesh", profile, ...(arc ? { arc } : {}) });
  const out: Piece[] = [lathe("concrete", [[rg, y - nave], [rg, y + nave]]), lathe("hull-grey", [[rg - 0.05, y - 1.6], [rg - 0.05, y + 1.6]]), lathe("lamp-blue", [[rg - 0.02, y - 0.4], [rg - 0.02, y + 0.4]])];
  for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
    const floor = rg - STEP * k;
    const e0 = nave + tread * (k - 1);
    out.push(lathe("concrete", [[floor, y + s * e0], [floor, y + s * (e0 + tread)]]), lathe("hull-white", [[floor, y + s * e0], [rg - STEP * (k - 1), y + s * e0]]));
  }
  if (bare) return out;
  const n = Math.round((TAU * rg) / 6.4);
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (!shut(az)) continue;
    const bay: Piece[] = [];
    for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
      const e0 = nave + tread * (k - 1);
      const y0 = s > 0 ? e0 + 0.2 : -(e0 + tread - 0.2);
      const y1 = s > 0 ? e0 + tread - 0.2 : -(e0 + 0.2);
      bay.push(...laboratory(y0, y1, rg - STEP * k));
    }
    out.push(...place(bay, { at: [0, y, 0], yaw: az }));
  }
  return out;
}
