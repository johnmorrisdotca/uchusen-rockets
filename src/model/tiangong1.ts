// Tiangong-1 as this package's own two tubes and a cone: the experiment section, the joining cone and the service module, at the catalogue's diameters and the lengths it states or that its 10.4 m leaves. The front cone and the solar panels are not drawn. No name or mark is drawn.
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const LENGTH = 10.4;
const SERVICE = 3.2;
const CONE = 1.6;
const EXPERIMENT = Number((LENGTH - SERVICE - CONE).toFixed(2));
const WIDE = 3.35 / 2;
const NARROW = 2.8 / 2;

const craft = (): Piece[] => [
  tube("white", WIDE, 0, EXPERIMENT),
  { kind: "lathe", material: "steel", segs: 40, body: true, outline: true, profile: [[WIDE, EXPERIMENT], [NARROW, EXPERIMENT + CONE]] },
  tube("steel", NARROW, EXPERIMENT + CONE, LENGTH),
];

export const TIANGONG_1_BUILDS: readonly StackBuild[] = [
  {
    rocket: "tiangong-1",
    variant: "tiangong-1",
    drawnFrom: "This package's own two tubes and a cone for both looks. The overall 10.4 m, the 3.35 m and 2.8 m diameters, the 3.2 m service module and the 1.6 m cone are the Czech Academy of Sciences library catalogue for 2011-053A, read 2026-11-19. The experiment section's 5.6 m is what that 10.4 m leaves. The front cone and the solar panels are not drawn: the cone's height is not given, and ESA's FAQ gives the panels only as approximately 3 by 7 m with no place along the module. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Tiangong-1", height: LENGTH, diameter: 3.35, pieces: craft }],
  },
];
