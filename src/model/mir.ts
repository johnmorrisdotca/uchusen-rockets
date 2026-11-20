// Mir as this package's own two tubes: the base block and Kvant, end to end, at the lengths and diameters in NASA SP-4225. Kvant 2, Kristall, the later modules and the solar arrays are not drawn. No name or mark is drawn.
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const BASE = 13.13;
const KVANT = 5.8;
const H = BASE + KVANT;

const craft = (): Piece[] => [
  tube("white", 4.15 / 2, 0, BASE),
  tube("steel", 4.15 / 2, BASE, H),
];

export const MIR_BUILDS: readonly StackBuild[] = [
  {
    rocket: "mir",
    variant: "mir",
    drawnFrom: "This package's own two tubes for both looks, at the lengths and diameters in NASA SP-4225, Mir Hardware Heritage (NTRS 19950016829, read 2026-11-19): the base block 13.13 m by 4.15 m (section 2.9.1) and Kvant 5.8 m by 4.15 m on the aft port (section 3.5.1). Kvant 2, Kristall, Spektr, Priroda and the solar arrays are not drawn. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Mir", height: H, diameter: 4.15, pieces: craft }],
  },
];
