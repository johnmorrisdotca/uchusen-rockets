// The Auxiliary Transfer Craft as rows of the registry: parts drawn by this package's code, for every look. Pure: no three.js and no DOM.
import { INSIDE_OFFSET } from "../data/atc.ts";
import { ATC } from "./fleet/craft/index.ts";
import type { StackBuild } from "./stacks.ts";

const DRAWN = "This package's own design, made in code (docs/fleet/craft.md). No licensed model and no real vehicle is behind it; the lineage line on each card names the hardware it descends from.";

const shuttle = ATC["crew-shuttle"];
if (!shuttle) throw new Error("ATC craft are missing");

const wide = (craft: typeof shuttle) => Math.max(craft.envelope.across, craft.envelope.deep);

export const ATC_BUILDS: readonly StackBuild[] = [
  {
    rocket: "fleet-atc",
    variant: "crew-shuttle",
    drawnFrom: DRAWN,
    parts: [
      { slot: "shuttle", kind: "spacecraft", name: "ATC crew shuttle", height: shuttle.envelope.long, diameter: wide(shuttle), pieces: () => shuttle.pieces() },
      { slot: "shuttle-inside", kind: "spacecraft", name: "ATC crew shuttle, cabin", height: shuttle.envelope.long, diameter: wide(shuttle), place: { x: INSIDE_OFFSET, z: 0, y: 0 }, pieces: () => shuttle.pieces({ cutaway: true }) },
    ],
  },
];
