// The station in plain shapes, for the line looks: its length and truss are sourced, and where its arrays and modules stand is measured from NASA's model at that scale. Boxes and tubes, few enough for a drawing. The painted look is NASA's model.
import { ISS_DRAWN_TALL, ISS_LONG } from "../data/iss.ts";
import { tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const SPAN = (ISS_LONG.value ?? 0) / 2;
const TRUSS_Y = 34;
const TRUSS = 94 / 2;

const array = (x: number, y0: number, y1: number): Piece => {
  const frame = { o: [x, 0, 0] as Vec3, u: [1, 0, 0] as Vec3, v: [0, 1, 0] as Vec3, w: [0, 0, 1] as Vec3 };
  return { kind: "plate", material: "gold", frame, outline: [[-2.4, y0], [2.4, y0], [2.4, y1], [-2.4, y1]], thickness: 0.1 };
};

const station = (): Piece[] => {
  const out: Piece[] = [strut("engine-pale", [-TRUSS, TRUSS_Y, 0], [TRUSS, TRUSS_Y, 0], 1.5, 1.5, { plain: false })];
  for (const x of [SPAN - 3, SPAN - 17, -(SPAN - 3), -(SPAN - 17)]) out.push(array(x, 0, TRUSS_Y - 2), array(x, TRUSS_Y + 2, ISS_DRAWN_TALL));
  // the long run of modules, and the crossing ones
  out.push(tube("white", 2.1, 16, 47, { rings: [24, 34, 40] }));
  for (const [y, half] of [[20, 7], [44, 8]] as const) out.push(strut("white", [-half, y, 0], [half, y, 0], 3.6, 3.6));
  // radiators
  for (const side of [1, -1]) out.push({ kind: "plate", material: "white", frame: { o: [side * 22, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-6, 18], [6, 18], [6, TRUSS_Y - 1], [-6, TRUSS_Y - 1]], thickness: 0.1 });
  return out;
};

export const ISS_BUILDS: readonly StackBuild[] = [
  {
    rocket: "iss",
    variant: "iss",
    drawnFrom: "NASA's model for the painted look, with its colours judged from photographs. This package's plain shapes for the two line looks, from the sourced length and truss; where its arrays and modules stand is measured from NASA's model. No flag or mark is drawn.",
    parts: [{ slot: "station", kind: "spacecraft", name: "International Space Station", height: ISS_DRAWN_TALL, diameter: SPAN * 2, sourcedDiameter: ISS_LONG, painted: { file: "iss-station.glb", credit: "nasa-iss" }, pieces: station }],
  },
];
