// The three construction machines: a small ring drone cheap enough to draw a hundred times, a claw tug, and an arm that grips at both ends.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DRONE_CONCEPTS, droneConcept, type DroneConcept } from "../src/model/fleet/drone/concepts.ts";
import { meshOf, type Piece } from "../src/model/pieces.ts";

const names = (pieces: readonly Piece[]) => new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));

const triangles = (pieces: readonly Piece[]) => {
  const mesh = meshOf(pieces);
  let count = 0;
  for (const buffers of mesh.faces.values()) count += buffers.indices.length / 3;
  return count;
};

test("three machines: a ring drone, a tug and an arm", () => {
  const ids = DRONE_CONCEPTS.map((make) => make().id);
  assert.deepEqual(ids, ["ring", "tug", "arm"]);
  for (const id of ids) {
    const concept = droneConcept(id);
    const used = names(concept.pieces);
    assert.ok(used.has("hull-white"), `${id} body`);
    assert.ok(used.has("hull-grey"), `${id} frame`);
    assert.ok(used.has("lamp-amber"), `${id} work light`);
    assert.ok(concept.mouth[1] > 0, `${id} works forward`);
  }
  const ring = names(droneConcept("ring").pieces);
  assert.ok(ring.has("gold"), "the ring is gold");
  assert.ok(ring.has("glass-clear"), "the ring has a lens");
  assert.ok(ring.has("hull-orange"), "orange on the edges");
  const tug = names(droneConcept("tug").pieces);
  assert.ok(tug.has("hull-yellow"), "the tug is yellow");
  assert.ok(tug.has("hull-orange"), "the tug's claws are marked");
});

test("the ring drone is cheap enough that a hundred stay light, and the other two stay instanced", () => {
  const counts = Object.fromEntries(DRONE_CONCEPTS.map((make) => [make().id, triangles(make().pieces)])) as Record<DroneConcept["id"], number>;
  assert.ok(counts.ring > 1000 && counts.ring < 4000, `ring ${counts.ring}`);
  assert.ok(counts.ring * 100 < 400_000, "a hundred ring drones");
  assert.ok(counts.tug > 1000 && counts.tug < 8000, `tug ${counts.tug}`);
  assert.ok(counts.arm > 1000 && counts.arm < 8000, `arm ${counts.arm}`);
});

test("the arm grips at both ends", () => {
  const concept: DroneConcept = droneConcept("arm");
  const lamps = concept.pieces.filter((piece) => piece.kind !== "lines" && piece.material === "lamp-amber");
  assert.ok(lamps.length >= 2, "a light at each gripper");
  const along = (piece: Piece) => (piece.kind === "plate" ? piece.frame.o[1] : 0);
  const ys = lamps.map(along);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.4, "the grippers are apart");
  const across = (piece: Piece) => (piece.kind === "plate" ? piece.frame.o[0] : 0);
  assert.ok(Math.max(...lamps.map(across)) - Math.min(...lamps.map(across)) > 0.2, "the arm bends");
});
