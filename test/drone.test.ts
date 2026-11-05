// The six detailed construction machines: two silhouettes of each kind, each one mesh, each with a glowing ring where the beam leaves.
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

test("two silhouettes of each kind, each with a glowing face", () => {
  const ids = DRONE_CONCEPTS.map((make) => make().id);
  assert.deepEqual(ids, ["ring-manta", "ring-beetle", "tug-crab", "tug-boot", "arm-equal", "arm-inch"]);
  for (const id of ids) {
    const concept = droneConcept(id);
    const used = names(concept.pieces);
    assert.ok(used.has("gold"), `${id} ring`);
    assert.ok(used.has("coil-lit"), `${id} glow`);
    assert.ok(used.has("glass-clear"), `${id} lens`);
    assert.ok(concept.mouth[1] > 0, `${id} faces forward`);
  }
});

test("the small drones stay cheap enough to instance, and the others stay one mesh", () => {
  const counts = Object.fromEntries(DRONE_CONCEPTS.map((make) => [make().id, triangles(make().pieces)])) as Record<DroneConcept["id"], number>;
  for (const id of ["ring-manta", "ring-beetle"] as const) assert.ok(counts[id] > 400 && counts[id] < 4000, `${id} ${counts[id]}`);
  for (const id of ["tug-crab", "tug-boot", "arm-equal", "arm-inch"] as const) assert.ok(counts[id] > 400 && counts[id] < 8000, `${id} ${counts[id]}`);
  assert.ok(Math.max(counts["ring-manta"], counts["ring-beetle"]) * 100 < 400_000);
});
