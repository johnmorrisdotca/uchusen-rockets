// ISV 加美鳴 Kaminari, SPX-207, the fictional Heavy Transport, as parts for the registry: the same way Saturn V, the Shuttle and SLS are. Every module is a part standing on the ship's axis (y from the tail), placed rather than
// stacked, so together, apart and one module alone all work. The geometry is in src/model/fleet/ship-02/.
import { SHIP_02_SLOTS, SHIP_02_VARIANT_PARTS } from "./fleet/ship-02/index.ts";
import { coarsen, detail } from "./detail.ts";
import type { StackBuild } from "./stacks.ts";

const DRAWN = "This package's own fictional design, made in code from a table of numbers in metres (docs/fleet/ship-02.md). No licensed model, no photograph and no real ship is behind it; it is not a prediction of anything. The inside parts are the cutaway's contents.";

export const SHIP_02_BUILDS: readonly StackBuild[] = [
  {
    rocket: "fleet-02",
    variant: "fleet-02",
    drawnFrom: DRAWN,
    parts: SHIP_02_SLOTS.map((s, i) => ({
      slot: s.slot,
      kind: s.kind,
      name: s.name,
      height: s.height,
      diameter: s.diameter,
      sourcedDiameter: { value: s.diameter, source: "uchusen-fleet-ship-02" },
      ...(i === 0 ? {} : { place: { x: s.at[0], z: s.at[2], y: s.at[1] } }),
      alsoTrueTo: Object.entries(SHIP_02_VARIANT_PARTS).filter(([, parts]) => !(s.slot in parts)).map(([id]) => id),
      pieces: () => (detail.level === "coarse" ? coarsen(s.pieces()) : s.pieces()),
    })),
  },
];
