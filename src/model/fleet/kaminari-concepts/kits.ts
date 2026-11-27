// Kaminari's solar kits: the same three Miyamoto carries, sized for a ship of 1.8 km, on the dorsal truss.
import { solarKit, type SolarKit } from "../solarKit.ts";
import type { ConceptSlot } from "./common.ts";

const AT = [0, 900, 24] as const;
const RADIUS = 200;

const NAME: Readonly<Record<SolarKit, string>> = { blanket: "Blanket mast", rollout: "Roll-out array", sail: "Square sail" };
const NOTE: Readonly<Record<SolarKit, string>> = {
  blanket: "A lattice mast with a gold cell blanket each side of it, 400 m of mast, turned to face the Sun.",
  rollout: "One gold blanket unrolled from a canister, turned to face the Sun.",
  sail: "A square gold sail on four booms, turned to face the Sun.",
};

/** One solar kit on the dorsal truss, in the part's own frame (the socket is the origin). */
export function kaminariKit(kind: SolarKit): ConceptSlot {
  return {
    slot: "kit",
    name: NAME[kind],
    kind: "array",
    at: AT,
    height: kind === "sail" ? 220 : kind === "blanket" ? 120 : 80,
    diameter: kind === "sail" ? 220 : 220,
    note: `${NOTE[kind]} Descends from the ISS solar array wings and iROSA's roll-out blankets.`,
    pieces: () => solarKit(kind, RADIUS),
  };
}
