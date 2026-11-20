// The crawler-transporter in a plain slab for the line looks. The length, the width and the retracted height are the fact sheet's. The painted look is NASA's model.
import { CRAWLER_HEIGHT, CRAWLER_LENGTH, CRAWLER_WIDTH } from "../data/crawler.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const craft = (): Piece[] => [
  {
    kind: "plate",
    material: "white",
    frame: { o: [-CRAWLER_WIDTH / 2, 0, -CRAWLER_LENGTH / 2], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
    outline: [[0, 0], [CRAWLER_WIDTH, 0], [CRAWLER_WIDTH, CRAWLER_LENGTH], [0, CRAWLER_LENGTH]],
    thickness: CRAWLER_HEIGHT,
    plain: true,
  },
];

// NASA's model (crawler-craft.glb), metres as drawn. The length is the sourced 39.93 m. The deck is narrower than the fact sheet's 114 feet, and taller than the 20-foot retracted height. The default frame holds this box; the drawing and the sizes keep the slab.
const REACH = { min: [-16.37, 0, -19.96], max: [16.37, 7.73, 19.96] } as const;

export const CRAWLER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "crawler",
    variant: "crawler",
    drawnFrom: "NASA's model for the painted look, scaled so the length is the fact sheet's 131 feet (39.93 m), with the tracks on the ground. This package's own slab for the two line looks, at 131 by 114 feet and the 20-foot retracted height. The trucks stay in the painted model only. No mark is drawn.",
    parts: [{ slot: "craft", kind: "deck", name: "Crawler", height: CRAWLER_HEIGHT, diameter: CRAWLER_WIDTH, sourcedDiameter: { value: CRAWLER_WIDTH, source: "nasa-crawler-fact-sheet", note: "114 feet wide." }, reach: REACH, painted: { file: "crawler-craft.glb", credit: "nasa-crawler" }, pieces: craft }],
  },
];
