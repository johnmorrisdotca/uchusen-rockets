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
    drawnFrom: "The line looks are this package's own three tubes, at the lengths and diameters of NASA SP-400's table 'General characteristics of the Skylab cluster' (chapter 2, read 2026-11-17). The painted look is NASA's model, scaled so the round body is the sourced 6.70 m; at that scale it stands 31.46 m. The airlock shroud's wider and narrower diameters are not in the line drawing: no source read gives their lengths. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Skylab", height: H, diameter: 6.7, reach: { min: [-4.78, 0, -12.12], max: [4.78, 31.46, 12.12] }, painted: { file: "skylab-craft.glb", credit: "nasa-skylab" }, pieces: craft }],
  },
];
