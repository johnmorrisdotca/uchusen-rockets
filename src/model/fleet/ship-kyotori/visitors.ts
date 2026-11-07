// The visiting craft at the quarters' docks, at true scale from the package's own models: a Crew Dragon (trunk and capsule) at an S-class port on an adapter cone from the stub's H collar, and a Starship upper stage on a short docking drum. Both dock from
// below, nose up, to a stub that faces aft. Pure: no three.js and no DOM.
import { DRAGON_DRAWS, capsule, trunk } from "../../falcon.ts";
import { STARSHIP_DRAWS, shipPieces } from "../../starship.ts";
import { dockingPort } from "../dockJoints.ts";
import { place, type Lathe, type Piece } from "./adapter.ts";
import { STUB, STUB_FACE } from "./station.ts";

const DRAGON = DRAGON_DRAWS["dragon-2"];
const DRAW = STARSHIP_DRAWS.v3;
const at = (index: number): [number, number] => [STUB.radius * Math.sin((Math.PI / 2) * index), STUB.radius * Math.cos((Math.PI / 2) * index)];

/** A short cone from the stub's H ring down to a docking port. The cone is 2 m and the port's face is its lower end, so a visitor's nose meets that face. */
function adapter(index: number, r: number, cls: "S" | "M"): Piece[] {
  const [x, z] = at(index);
  const len = 2;
  const cone: Lathe = { kind: "lathe", material: "hull-white", segs: 32, only: "mesh", at: [x, z], body: true, outline: true, profile: [[r, STUB_FACE - len], [4.4, STUB_FACE]] };
  return [cone, ...place(dockingPort(cls, 1, -1), { at: [x, STUB_FACE - len, z] })];
}

/** A Crew Dragon at the quarter `index`'s dock: its nose to the adapter's S port, trunk below. */
export function dragonPieces(index: number): Piece[] {
  const [x, z] = at(index);
  const height = DRAGON.trunk + DRAGON.capsule - DRAGON.nest;
  // The nose is a point. Half a metre past the face seats it in the ring; the port's adapter stands above the face.
  const y = STUB_FACE - 1.5 - height;
  return [...adapter(index, 1.7, "S"), ...place([...trunk(DRAGON), ...place(capsule(DRAGON), { at: [0, DRAGON.trunk - DRAGON.nest, 0] })], { at: [x, y, z] })];
}

/** A Starship upper stage at the quarter `index`'s dock, nose on the adapter's port, the ship hanging below. */
export function starshipPieces(index: number): Piece[] {
  const [x, z] = at(index);
  return [...adapter(index, 4.5, "M"), ...place(shipPieces(DRAW), { at: [x, STUB_FACE - 2 - DRAW.shipHeight, z] })];
}
