import assert from "node:assert/strict";
import { test } from "node:test";

import { build } from "../src/build/index.ts";
import { FLIGHTS } from "../src/data/flights.ts";
import { frameAt, phasePosition } from "../src/flight.ts";
import { moved, movingGroupsOf, turnedVector } from "../src/model/moves.ts";
import { type Piece, meshOf, moveGroups } from "../src/model/pieces.ts";

const part = (rocket: string, variant: string, slot: string) => {
  const found = build({ rocket, variant }).parts.find((one) => one.slot === slot);
  assert.ok(found, `${rocket}/${variant}/${slot}`);
  return found;
};
const glbJson = (rocket: string, variant: string) => {
  const { bytes } = build({ rocket, variant }).glb();
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + length))) as { nodes: { name: string; extras?: { axis: number[]; group: string }; children?: number[] }[] };
};

test("the pieces a flight can turn are named: grid fins, legs and flaps, and nothing else", () => {
  assert.deepEqual(movingGroupsOf(part("starship", "v3", "booster").pieces), ["grid-fins"]);
  assert.deepEqual(movingGroupsOf(part("starship", "v3", "ship").pieces), ["aft-flaps", "forward-flaps"]);
  assert.deepEqual(movingGroupsOf(part("starship", "v1", "ship").pieces), ["aft-flaps", "forward-flaps"]);
  assert.deepEqual(movingGroupsOf(part("falcon-9", "block-5", "first-stage").pieces).sort(), ["grid-fins", "legs"]);
  assert.deepEqual(movingGroupsOf(part("falcon-9", "v1.1", "first-stage").pieces), ["legs"]);
  assert.deepEqual(movingGroupsOf(part("falcon-9", "v1.0", "first-stage").pieces), []);
  assert.deepEqual(movingGroupsOf(part("falcon-heavy", "falcon-heavy", "side-left").pieces), ["legs"]);
  // one group for each fin, leg or flap, each with its own pivot
  assert.equal(moveGroups(part("starship", "v3", "booster").pieces).length, 3);
  assert.equal(moveGroups(part("starship", "v1", "booster").pieces).length, 4);
  assert.equal(moveGroups(part("starship", "v3", "ship").pieces).length, 4);
  assert.equal(moveGroups(part("falcon-9", "block-5", "first-stage").pieces).length, 8);
});

test("the .glb holds each moving group as a node of its own, named, at its pivot, with its axis, and no triangle is lost or added", () => {
  const json = glbJson("starship", "v3");
  const nodes = json.nodes.filter((node) => node.name.includes("~") && !node.name.endsWith("-mesh"));
  assert.deepEqual(nodes.map((node) => node.name).filter((name) => name.startsWith("booster")), ["booster~grid-fins~0", "booster~grid-fins~1", "booster~grid-fins~2"]);
  for (const node of nodes) {
    assert.equal(node.extras?.axis.length, 3, node.name);
    assert.ok(Math.abs(Math.hypot(...(node.extras?.axis ?? [])) - 1) < 1e-3, `${node.name}: a unit axis`);
    assert.equal(node.children?.length, 1);
  }
  for (const [rocket, variant] of [["starship", "v3"], ["falcon-9", "block-5"], ["starship", "v1"]] as const) {
    const built = build({ rocket, variant });
    let fixed = 0;
    for (const one of built.parts) {
      const whole = meshOf(one.pieces.map((piece) => ({ ...piece, move: undefined }) as Piece));
      for (const buffers of whole.faces.values()) fixed += buffers.indices.length / 3;
    }
    assert.equal(built.glb().triangles, fixed, `${rocket}/${variant}`);
  }
});

test("a group turns about its own pivot and axis, and a positive angle opens it", () => {
  const stage = part("falcon-9", "block-5", "first-stage");
  const legs = stage.pieces.filter((piece) => piece.move?.name === "legs");
  assert.equal(legs.length, 4);
  const [leg] = legs;
  assert.ok(leg && leg.kind === "plate");
  const outward = (turned: Piece) => {
    assert.equal(turned.kind, "plate");
    if (turned.kind !== "plate") return 0;
    // the leg's top, as a point in the frame's own up and out
    const top = turned.outline[turned.outline.length - 1];
    const p = [turned.frame.o[0] + turned.frame.u[0] * top[0] + turned.frame.v[0] * top[1], 0, turned.frame.o[2] + turned.frame.u[2] * top[0] + turned.frame.v[2] * top[1]];
    return Math.hypot(p[0], p[2]);
  };
  const [at60] = moved([leg], { legs: 60 });
  const [at0] = moved([leg], { legs: 0 });
  assert.equal(at0, leg, "no turn, the same piece");
  assert.ok(at60.move === undefined, "turned, it is drawn where it stands");
  assert.ok(Math.abs(outward(at60) - outward(leg)) > 1, "the foot moved");
  // the top of a leg swings away from the hull
  const frame = leg.frame;
  const up = turnedVector(frame.v, frame.w, 60);
  const outwards = up[0] * frame.u[0] + up[1] * frame.u[1] + up[2] * frame.u[2];
  assert.ok(outwards > 0.8, `the top of the leg goes out: ${outwards}`);
  // a group nobody names stays put
  assert.equal(moved(stage.pieces, { nonsense: 40 }), stage.pieces);
});

test("the drawing turns what a flight turns, and is the drawing at rest when nothing does", () => {
  const rocket = build({ rocket: "starship", variant: "v3" });
  const rest = rocket.svg({ look: "line", view: "below", show: "together" });
  assert.equal(rocket.svg({ look: "line", view: "below", show: "together", moves: {} }), rest);
  assert.equal(rocket.svg({ look: "line", view: "below", show: "together", moves: { booster: { "grid-fins": 0 } } }), rest);
  assert.notEqual(rocket.svg({ look: "line", view: "below", show: "together", moves: { booster: { "grid-fins": 25 } } }), rest);
  assert.notEqual(rocket.svg({ look: "thick", view: "side", show: "ship", moves: { ship: { "forward-flaps": 40, "aft-flaps": 10 } } }), rocket.svg({ look: "thick", view: "side", show: "ship" }));
});

test("a flight carries what turns in each phase, mixes it between phases, and says which page says so", () => {
  const flight = FLIGHTS.find((one) => one.id === "starship-flight-5");
  assert.ok(flight);
  const phase = (id: string) => flight.phases[phasePosition(flight, id) ?? 0];
  assert.deepEqual(phase("booster-landing").pose.booster?.moves, { "grid-fins": -10 });
  assert.deepEqual(phase("liftoff").pose.booster?.moves, {});
  assert.deepEqual(phase("flip").pose.ship?.moves, { "forward-flaps": 60, "aft-flaps": 20 });
  assert.ok(flight.moves?.every((one) => one.source && one.says.length > 20));
  const parts = [{ slot: "booster", baseY: 0 }, { slot: "ship", baseY: 72 }];
  const at = phasePosition(flight, "boostback-end") ?? 0;
  const turned = (position: number) => frameAt(flight, position, parts, 124).poses.booster?.moves["grid-fins"] ?? 0;
  assert.equal(turned(at), 10);
  assert.ok(turned(at + 0.25) > 0 && turned(at + 0.25) < 10, "on its way from 10 to -10");
  assert.ok(Math.abs(turned(at + 0.5)) < 1e-9, "halfway through, it is at the middle");
  // Falcon 9: folded for the ascent, open before the landing
  const falcon = FLIGHTS.find((one) => one.id === "falcon-9-crs-16");
  assert.ok(falcon);
  const pose = (id: string) => falcon.phases[phasePosition(falcon, id) ?? 0].pose["first-stage"]?.moves;
  assert.deepEqual(pose("liftoff"), { "grid-fins": 85, legs: 0 });
  assert.deepEqual(pose("entry-burn"), { "grid-fins": 0, legs: 0 });
  assert.deepEqual(pose("landing"), { "grid-fins": 0, legs: 60 });
  // a flight that moves nothing says so
  assert.equal(FLIGHTS.find((one) => one.id === "starship-flight-1")?.moves, undefined);
});
