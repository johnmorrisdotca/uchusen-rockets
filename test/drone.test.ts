// The three construction-drone concepts: a white body, orange on the panels that come off, work lights, a docking foot, and a ringed nozzle. One of them must stay cheap enough to draw a hundred times.
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

test("three concepts, each with the livery, a lit ring and a work light", () => {
  const ids = DRONE_CONCEPTS.map((make) => make().id);
  assert.deepEqual(ids, ["box", "long", "pod"]);
  for (const id of ids) {
    const concept = droneConcept(id);
    const used = names(concept.pieces);
    assert.ok(used.has("hull-white"), `${id} body`);
    assert.ok(used.has("hull-orange"), `${id} panel`);
    assert.ok(used.has("hull-grey"), `${id} frame`);
    assert.ok(used.has("coil-lit"), `${id} ring`);
    assert.ok(used.has("glass-clear"), `${id} lens`);
    assert.ok(used.has("lamp-amber"), `${id} work light`);
    assert.ok(concept.mouth[1] > 0, `${id} mouth is forward`);
  }
});

test("one drone is cheap enough that a hundred of them stay light", () => {
  const counts = DRONE_CONCEPTS.map((make) => triangles(make().pieces));
  for (const count of counts) {
    assert.ok(count > 1000, `too plain: ${count} triangles`);
    assert.ok(count < 4000, `too heavy: ${count} triangles`);
  }
  assert.ok(Math.max(...counts) * 100 < 400_000, "a hundred drones");
});

test("the long concept keeps its nozzle under the body and its foot at the nose", () => {
  const concept: DroneConcept = droneConcept("long");
  assert.ok(concept.mouth[2] < -0.2, "the ring hangs under the belly");
  const shoe = concept.pieces.filter((piece) => piece.kind === "plate" && piece.material === "hull-grey");
  assert.ok(shoe.length > 0, "the shoe");
});
