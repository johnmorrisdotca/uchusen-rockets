// The three machines the gate kept. Each is one mesh, with a glowing ring where the beam leaves.
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

test("the five yard machines, each with a glowing face", () => {
  const ids = DRONE_CONCEPTS.map((make) => make().id);
  assert.deepEqual(ids, ["drone-weld", "drone-repair", "drone-carrier", "drone-tug", "drone-fitter"]);
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
  assert.ok(counts["drone-carrier"] > 200 && counts["drone-carrier"] < 4000, `drone-carrier ${counts["drone-carrier"]}`);
  for (const id of ["drone-weld", "drone-repair", "drone-tug", "drone-fitter"] as const) assert.ok(counts[id] > 400 && counts[id] < 12_000, `${id} ${counts[id]}`);
  assert.ok(counts["drone-carrier"] * 100 < 400_000);
});
