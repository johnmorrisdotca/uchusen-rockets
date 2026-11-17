// Fittings the small craft share, in a craft's own metres. Pure: no three.js and no DOM.
import { cub, rod } from "../detail.ts";
import type { Piece } from "../../pieces.ts";

/** One thruster quad (the Apollo service module's kind, as the ISS and the Shuttle used it), standing out of the service section facing +Z: a housing, a bracket and four small bells. */
export function thrusterQuad(): Piece[] {
  const bells = [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]] as const;
  return [
    cub("hull-grey", [-0.5, 0.5], [-0.4, 0.4], [0, 0.45]),
    cub("hull-grey-dark", [-0.58, 0.58], [-0.1, 0.1], [0, 0.12]),
    ...bells.flatMap(([x, y]) => [rod("hull-grey-dark", [x, y, 0.45], [x, y, 0.6], 0.15, 10), rod("bell", [x, y, 0.6], [x, y, 0.85], 0.12, 10)]),
  ];
}

