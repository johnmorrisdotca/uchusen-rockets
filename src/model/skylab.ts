// Skylab as this package's own three tubes: the orbital workshop, the airlock module and the multiple docking adapter, end to end at NASA SP-400's lengths and diameters. The airlock shroud's other diameters, the telescope mount and the solar wings are not drawn: no source read gives their places or sizes. No name or mark is drawn.
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const OWS = 14.66;
const AM = 5.36;
const MDA = 5.27;
const H = OWS + AM + MDA;

const craft = (): Piece[] => [
  tube("white", 6.7 / 2, 0, OWS),
  tube("steel", 3.04 / 2, OWS, OWS + AM),
  tube("white", 3.04 / 2, OWS + AM, H),
];

export const SKYLAB_BUILDS: readonly StackBuild[] = [
  {
    rocket: "skylab",
    variant: "skylab",
    drawnFrom: "This package's own three tubes for both looks, at the lengths and diameters of NASA SP-400's table 'General characteristics of the Skylab cluster' (chapter 2, read 2026-11-17). The airlock shroud's wider and narrower diameters, the telescope mount and the solar wings are not drawn: no source read gives their places or sizes. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Skylab", height: H, diameter: 6.7, pieces: craft }],
  },
];
