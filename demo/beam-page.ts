// The beam page: the same carry drawn painted, as a line, and as a dotted line.
import { tractorBeam } from "../src/beam.ts";
import { defsOf, drawPart, perspective } from "../src/draw/svg.ts";
import { PICTURE_H, PICTURE_W, VIEWS } from "../src/framing.ts";
import type { LookName } from "../src/looks.ts";

const ends = { from: [0, 0, 0] as [number, number, number], part: [0, 8, 0] as [number, number, number], slot: [0, 12, 0] as [number, number, number] };
const cam = perspective({ min: [-2, -1, -2], max: [2, 10, 2] }, VIEWS.side);

function show(id: string, look: LookName, reduced: boolean): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PICTURE_W} ${PICTURE_H}">${defsOf(look)}${drawPart(tractorBeam(ends, "carry", reduced), [0, 0, 0], cam, look)}</svg>`;
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  document.getElementById(id)?.replaceChildren(document.importNode(parsed.documentElement, true));
}

show("beam-carry", "painted", false);
show("beam-line", "line", false);
show("beam-dotted", "line", true);
