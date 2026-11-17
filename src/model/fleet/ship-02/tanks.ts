// The four fuel tanks: 80 m across and 440 m long, domed at both ends, in the corners of the cross round the spine. Banded insulation, cradle rings braced to the spine, a feed manifold facing the
// spine, vent stacks on the domes, valve houses, access hatches and service lettering. The inside of all four (the propellant, baffles and pumps) is a separate part so a cutaway can open them.
import { rng, type Piece } from "./adapter.ts";
import { tankInsidePieces, tankPieces } from "../heavy/tank.ts";
import { SPINE, TANK } from "./dims.ts";

const R = TANK.radius;
const H = 440;

/** A tank standing at the origin of its own frame; `toward` is the angle from +z towards +x that points at the spine. The kit draws it (`../heavy/tank.ts`); this ship asks for its own size and its own spine. */
export function tank(toward: number, seed: number, label: string, sz: 1 | -1): Piece[] {
  return tankPieces({ radius: R, length: H }, { toward, seed, label, sz, brace: { distance: Math.hypot(TANK.offset, TANK.offset), half: SPINE.half } });
}

/** The propellant and the works inside all four tanks, in the frame of the whole cross: filled to 90%, with anti-slosh rings, a central standpipe and the pump deck. */
export function tankInside(): Piece[] {
  const out: Piece[] = [];
  const r = rng(2005);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(...tankInsidePieces({ radius: R, length: H }, [sx * TANK.offset, sz * TANK.offset], r));
  return out;
}
