// Starlink as this package's own plates. The bus and the arrays are the filing's sizes. The plate is thin because the filing gives no thickness, and that thinness is judged from photographs. The craft type has no pose, and no source gives a stowed size, so only the deployed form is drawn. No name or mark is drawn.
import type { MaterialName } from "./materials.ts";
import type { Piece, Plate } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

/** Metres. A drawing choice, not a figure: the filing gives no thickness. */
const THIN = 0.1;

const DRAWN = "This package's own plates for both looks. The bus and the solar arrays are the sizes in the operator's filing of 4 October 2022. Each plate is 0.1 m thick, judged from photographs of the flat panel, because the filing gives no thickness. Each array is drawn out from the bus along the side whose length the filing gives to both. No name or mark is drawn. No stowed size is given, so the deployed form is the only one drawn.";

/** A thin plate in the X-Y plane, from its lower-left corner. */
const plate = (material: MaterialName, x: number, width: number, height: number): Plate => ({
  kind: "plate",
  material,
  plain: false,
  frame: { o: [x, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] },
  outline: [[0, 0], [width, 0], [width, height], [0, height]],
  thickness: THIN,
});

/** One bus, and one array to the right, or one to each side when the filing says two. */
const craft = (busLength: number, busWidth: number, arrayLength: number, arrayWidth: number, wings: 1 | 2): (() => Piece[]) => {
  const busX = -busWidth / 2;
  return () => {
    const pieces: Piece[] = [plate("white", busX, busWidth, busLength), plate("solar", busX + busWidth, arrayLength, arrayWidth)];
    if (wings === 2) pieces.push(plate("solar", busX - arrayLength, arrayLength, arrayWidth));
    return pieces;
  };
};

export const STARLINK_BUILDS: readonly StackBuild[] = [
  {
    rocket: "starlink",
    variant: "v2-mini",
    drawnFrom: DRAWN,
    parts: [{ slot: "craft", kind: "spacecraft", name: "Starlink v2 mini", height: 4.1, diameter: 2.7 + 12.8 * 2, pieces: craft(4.1, 2.7, 12.8, 4.1, 2) }],
  },
  {
    rocket: "starlink",
    variant: "v1-5",
    drawnFrom: DRAWN,
    parts: [{ slot: "craft", kind: "spacecraft", name: "Starlink v1.5", height: 2.8, diameter: 1.3 + 8.1, pieces: craft(2.8, 1.3, 8.1, 2.8, 1) }],
  },
];
