// One description, one mesh and one drawing: the same bytes every time, real sizes, and the counts the sources give.
import assert from "node:assert/strict";
import { test } from "node:test";
import { LOOK_NAMES, LOOKS, ROCKETS, VIEW_NAMES, showsOf, variantOf } from "../src/index.ts";
import { build, buildPart, drawnPieces, lineupSvg } from "../src/build/index.ts";
import { PART_ENTRIES, partEntry } from "../src/model/registry.ts";
import type { Lathe, Piece } from "../src/model/pieces.ts";
import { STARSHIP_DRAWS } from "../src/model/starship.ts";
import { readMetrics } from "./metrics.ts";

const MESH_LIMIT = 600 * 1024;
// the fleet's ships are far bigger than any real rocket and are built in the browser, so they ship no prebuilt file; each of their modules is within 1.25 MB (test/fleet-kit.test.ts)
const DRAWING_LIMIT = 80 * 1024;
// a fleet ship that carries the real Starship meshes: the same number as FLEET_DRAWING_LIMIT in scripts/make-assets.ts
const FLEET_DRAWING_LIMIT = 512 * 1024;

const bellsOf = (pieces: readonly Piece[]) => pieces.filter((piece) => piece.kind === "lathe" && piece.material === "bell");

test("the same description gives the same bytes", () => {
  const a = build({ rocket: "starship", variant: "v3" });
  const b = build({ rocket: "starship", variant: "v3" });
  assert.deepEqual(a.glb().bytes, b.glb().bytes);
  assert.equal(a.svg({ look: "thick", view: "below", show: "apart" }), b.svg({ look: "thick", view: "below", show: "apart" }));
});

test("every variant, in every look, from every side, in every choice of parts: within the limits", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const built = build({ rocket: rocket.id, variant: variant.id });
      assert.deepEqual(built.shows, showsOf(variant.slots));
      const glb = variant.status === "fictional" ? { bytes: new Uint8Array(0) } : built.glb();
      // the fictional fleet is far more detailed than a phone should be handed as a file: its 3D view is built in code at run time, and its .glb is made only on request
      if (variant.status !== "fictional") assert.ok(glb.bytes.byteLength < MESH_LIMIT, `${variant.id}: ${glb.bytes.byteLength}`);
      for (const show of built.shows)
        for (const look of LOOK_NAMES)
          for (const view of VIEW_NAMES) {
            const svg = built.svg({ look, view, show });
            assert.ok(svg.length < (rocket.id.startsWith("fleet-") ? FLEET_DRAWING_LIMIT : DRAWING_LIMIT), `${variant.id} ${show} ${look} ${view}: ${svg.length}`);
            assert.ok(svg.startsWith("<svg "));
            assert.ok(!/NaN|Infinity/.test(svg), `${variant.id} ${show} ${look} ${view}`);
          }
    }
});

test("each part is its real size", () => {
  for (const [id, height] of [
    ["starship-v1-booster", 71],
    ["starship-v1-ship", 50.3],
    ["starship-v2-ship", 52.1],
    ["starship-v3-booster", 72.3],
    ["starship-v3-ship", 52.1],
    ["starship-v4-booster", 81],
    ["starship-v4-ship", 61],
  ] as const) {
    const { bounds } = buildPart(id);
    assert.ok(Math.abs(bounds.max[1] - height) < 0.01, `${id} top ${bounds.max[1]}`);
    assert.ok(Math.abs(bounds.min[1]) < 0.01, `${id} bottom ${bounds.min[1]}`);
  }
  const b = build({ rocket: "starship", variant: "v3" }).boundsOf("together");
  assert.ok(Math.abs(b.max[1] - 124.4) < 0.01);
  // the hull itself is 9 m across
  const hull = partEntry("starship-v3-booster")?.pieces().find((piece): piece is Lathe => piece.kind === "lathe" && piece.material === "steel" && piece.body === true);
  assert.ok(hull);
  assert.equal(Math.max(...hull.profile.map(([r]) => r)) * 2, 9);
});

test("engines: 33 on every booster, and the ship's by version", () => {
  for (const id of ["v1", "v2", "v3", "v4"]) {
    const entry = partEntry(`starship-${id}-booster`);
    assert.equal(bellsOf(entry?.pieces() ?? []).length, 33, id);
  }
  assert.equal(bellsOf(partEntry("starship-v3-ship")?.pieces() ?? []).length, 6);
  assert.equal(bellsOf(partEntry("starship-v4-ship")?.pieces() ?? []).length, 9);
  const rings = STARSHIP_DRAWS.v3.boosterEngines.map((ring) => ring.count);
  assert.deepEqual(rings, [3, 10, 20]);
});

test("grid fins: four on Blocks 1 and 2, three on Block 3 at 90, 90 and 180 degrees", () => {
  assert.equal(STARSHIP_DRAWS.v1.fins.az.length, 4);
  assert.equal(STARSHIP_DRAWS.v2.fins.az.length, 4);
  assert.deepEqual([...STARSHIP_DRAWS.v3.fins.az], [0, 90, -90]);
});

test("apart stands the parts clear of each other from the front, the side and the back; one part alone fills its own bounds", () => {
  const built = build({ rocket: "starship", variant: "v3" });
  const apart = built.placesOf("apart");
  assert.ok(apart.every((place) => place.shown));
  assert.ok(apart.every((place) => place.at[1] === 0), "both stand on the ground");
  const [a, b] = apart;
  const across = Math.abs(a.at[0] - b.at[0]);
  const deep = Math.abs(a.at[2] - b.at[2]);
  // the widest reach is 8.7 + 8.1 m: seen along either axis the two must still clear
  assert.ok(across > 16.8 && deep > 16.8, `${across} ${deep}`);
  const ship = built.placesOf("ship");
  assert.deepEqual(ship.map((place) => place.shown), [false, true]);
  assert.deepEqual(ship[1].at, [0, 0, 0]);
  assert.ok(Math.abs(built.boundsOf("ship").max[1] - 52.1) < 0.01);
  assert.ok(Math.abs(built.boundsOf("booster").max[1] - 72.3) < 0.01);
  assert.deepEqual(built.placesOf("together")[1].at, [0, 72.3, 0]);
});

test("a variant with one part offers that part only", () => {
  const built = build({ rocket: "starship", variant: "2019" });
  assert.deepEqual(built.shows, ["ship"]);
  assert.equal(built.parts.length, 1);
  assert.equal(built.report.parts[0].part.joints.top, undefined);
});

test("the drawing is seen from the camera it names", () => {
  const built = build({ rocket: "starship", variant: "v3" });
  assert.notEqual(built.svg({ view: "front" }), built.svg({ view: "back" }));
  assert.notEqual(built.svg({ view: "front" }), built.svg({ view: { az: 10, el: 3 } }));
  assert.notEqual(built.svg({ look: "line" }), built.svg({ look: "thick" }));
  assert.notEqual(built.svg({ look: "line" }), built.svg({ look: "painted" }));
  // from below the engines are drawn, from the front they are mostly behind the hull's own end
  assert.ok(built.svg({ view: "below" }).length > 2000);
});

test("the lineup turns the Shuttle so its orbiter shows, and asked for another side it keeps that side", () => {
  const stack = ["space-shuttle:stack"];
  const front = lineupSvg({ items: stack, unit: 2 }).svg;
  assert.equal(front, lineupSvg({ items: stack, unit: 2, view: "back" }).svg);
  assert.notEqual(front, lineupSvg({ items: stack, unit: 2, view: "side" }).svg);
  assert.equal(variantOf("space-shuttle", "stack")?.lineupView, "back");
});

test("in a painted lineup a rocket that is black all over takes a light outline, and nothing else about it changes", () => {
  const light = LOOKS.line.line;
  const electron = lineupSvg({ items: ["electron:electron"], unit: 3, look: "painted" });
  assert.ok(electron.svg.includes(`stroke="${light}"`));
  assert.equal(electron.height, lineupSvg({ items: ["electron:electron"], unit: 3, look: "line" }).height);
  assert.equal(variantOf("electron")?.facts.height.value, 18);
  assert.ok(!lineupSvg({ items: ["falcon-9:block-5"], unit: 3, look: "painted" }).svg.includes(`stroke="${light}"`));
});

test("the lineup is to one scale: its picture's height is the tallest rocket's", () => {
  const { svg, items, height } = lineupSvg({ items: ["starship:v1", "starship:v3", "starship:v4", "person", "building", "<script>", "nothing:v1"], unit: 2, ruler: true, labels: true });
  assert.deepEqual(items.map((item) => item.key), ["starship:v1", "starship:v3", "starship:v4", "person", "building"]);
  // the longest label (Block 1 with the vented ring) is wrapped to three lines in its cell
  assert.ok(Math.abs(height - (26 + 142 * 2 + 57 + 10)) < 0.01);
  assert.ok(!svg.includes("<script"));
  assert.ok(svg.includes("A person, 1.8 m"));
  readMetrics(svg);
});

test("a part alone is a drawing and a mesh too", () => {
  for (const id of ["raptor-sea-level", "raptor-vacuum", "grid-fin-three", "grid-fin-four", "flap-aft", "flap-forward"]) {
    const part = buildPart(id);
    assert.ok(part.glb().bytes.byteLength > 100, id);
    assert.ok(part.svg().startsWith("<svg "), id);
    assert.ok(part.glb().triangles > 0, id);
  }
});

test("a nozzle nested in the stage below is not drawn over it in a stack, and is when the part stands alone", () => {
  const rocket = build({ rocket: "falcon-9", variant: "block-5" });
  const second = rocket.parts.find((part) => part.slot === "second-stage");
  assert.ok(second);
  const bells = (pieces: readonly Piece[]) => pieces.filter((piece) => piece.kind === "lathe" && piece.material === "bell").length;
  assert.equal(bells(drawnPieces(second, true)), 0);
  assert.equal(bells(drawnPieces(second, false)), 1);
  const first = rocket.parts.find((part) => part.slot === "first-stage");
  assert.ok(first);
  assert.equal(bells(drawnPieces(first, true)), 9);
});

test("the painted Falcon 9 second stage is told to draw this package's own nozzle at the sourced exit width, and no other painted part is", () => {
  const exit = (id: string) => (bellsOf(partEntry(id)?.pieces() ?? [])[0] as Lathe).profile[0][0];
  assert.equal(partEntry("falcon-9-block-5-second-stage")?.record.painted?.ownNozzle, true);
  assert.ok(Math.abs(exit("falcon-9-block-5-second-stage") - 1.65) < 1e-9, "3.3 m across, from the Merlin article's infobox");
  assert.ok(Math.abs(exit("falcon-9-ft-second-stage") - 1.65) < 1e-9);
  assert.ok(exit("falcon-9-v1.0-second-stage") < 1.65, "no sourced width for the v1.0's vacuum engine");
  assert.ok(exit("falcon-9-block-5-second-stage") < 1.85, "it fits within the stage");
  const owners = PART_ENTRIES.filter(({ record }) => record.painted?.ownNozzle).map(({ record }) => record.id);
  assert.deepEqual(owners, ["falcon-9-block-5-second-stage"]);
});

test("Falcon 9 has its 9 engines, and a v1.0's stand in a 3 by 3 grid", () => {
  assert.equal(bellsOf(partEntry("falcon-9-block-5-first-stage")?.pieces() ?? []).length, 9);
  assert.equal(bellsOf(partEntry("falcon-9-v1.0-first-stage")?.pieces() ?? []).length, 9);
  for (const id of ["falcon-heavy-falcon-heavy-centre", "falcon-heavy-falcon-heavy-side-left", "falcon-heavy-falcon-heavy-side-right"]) assert.equal(bellsOf(partEntry(id)?.pieces() ?? []).length, 9, id);
  assert.equal(bellsOf(partEntry("grasshopper-grasshopper-vehicle")?.pieces() ?? []).length, 1);
});

test("Falcon Heavy stands its side boosters beside the core, apart on the ground, and alone at the middle", () => {
  const heavy = build({ rocket: "falcon-heavy" });
  const together = heavy.placesOf("together");
  assert.deepEqual(together.map((place) => place.at[1]), [0, 0, 0]);
  assert.ok(together[1].at[0] < 0 && together[2].at[0] > 0);
  assert.deepEqual(heavy.placesOf("side-left").find((place) => place.slot === "side-left")?.at, [0, 0, 0]);
  assert.ok(heavy.boundsOf("together").max[1] > 69.9);
});
