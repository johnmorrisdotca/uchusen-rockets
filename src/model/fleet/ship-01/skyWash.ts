// A pale shell just inside a ring's glass, so the hall reads as lit by sky through the roof. Pure: no three.js and no DOM.
import type { Lathe, Piece } from "./adapter.ts";
import { roundSection, type Geo } from "./wheelparts.ts";

const TAU = Math.PI * 2;
const deg = (a: number): number => (a * Math.PI) / 180;

/** The wash sits 0.45 m inside the glass, and it follows a cutaway's opening. */
export function skyWash(g: Geo, y: number, gap?: number): Piece[] {
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  const shell: Lathe = { kind: "lathe", material: "sky-wash", segs: 96, only: "mesh", profile: roundSection(g, y, -0.45), ...(arc ? { arc } : {}) };
  return [shell];
}
