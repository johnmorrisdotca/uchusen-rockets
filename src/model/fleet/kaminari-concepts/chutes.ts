// Kaminari's chute arrays: the same part Miyamoto carries, sized for a ship of 1.8 km. The ring is the one on the dorsal truss. Stowed ribs lie along the mast; open is a disc 400 m across.
import { chute, type ChuteForm, type ChutePose } from "../chute.ts";
import type { ConceptSlot } from "./common.ts";

const AT = [0, 900, 24] as const;
const RADIUS = 200;

/** One chute on the dorsal truss, in the part's own frame (the mast base is the origin). */
export function kaminariChute(form: ChuteForm, pose: ChutePose): ConceptSlot {
  const open = pose === "open";
  return {
    slot: "chute",
    name: `Chute array, ${form}, ${pose}`,
    kind: "array",
    at: AT,
    height: open ? 400 : pose === "half" ? 280 : 50,
    diameter: open ? 400 : pose === "half" ? 280 : 50,
    note: `${form === "ring" ? "An annular panel on spokes, open at the hub." : form === "fan" ? "Pleated fins in one plane." : "Petals in to the hub."} ${pose === "stowed" ? "Ribs folded along the mast." : "Ribs open, 400 m across."} Descends from a radial-rib reflector, the Galileo high-gain antenna and AstroMesh.`,
    pieces: () => chute(form, pose, RADIUS),
  };
}
