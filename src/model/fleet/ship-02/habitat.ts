// A habitat ring: a spinning torus of rectangular section 165 m from the axis, spun at 1.65 rpm for half an Earth gravity at the floor, with six spokes (a lift tube and a service pipe each) to a hub on the
// spine. Outside: window rows, plating in three tones, docking collars, radiator fins, the hub's bearings. Inside (separate): three decks of streets, blocks and park, lit by a ceiling strip.
import { rng, type Piece } from "./adapter.ts";
import { ringInsidePieces, ringPieces } from "../heavy/ring.ts";
import { HABITAT } from "./dims.ts";


/** One habitat ring at the origin, its base at y = 0. The kit draws it (`../heavy/ring.ts`); this ship asks for its own size, `which` picking the rim's tone and the generator's seed. */
export function habitatPieces(which: 0 | 1): Piece[] {
  return ringPieces({ major: HABITAT.radius, tube: HABITAT.tube }, which === 0 ? "hull-orange" : "hull-white", rng(2030 + which));
}

/** Decks inside both rings in the frame of the ring: three floors, rows of blocks, a park strip, a central rail. `which` picks the ring's y. */
export function habitatInside(y0: number, only?: number): Piece[] {
  return ringInsidePieces({ major: HABITAT.radius, tube: HABITAT.tube }, y0, only, rng(2040 + y0));
}
