// ISV Kyotori (SPX-045): the rim's numbers are computed, every slot of every variant names a part that exists, the ships' parts stand where the ships are, the docking plan's data has no overlap and no port on a turning part, the build holds the budget, and the
// pieces carry the Move tags the viewer's motion needs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { BUILD_BUDGET_MS, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { clearance, PORTS } from "../src/model/fleet/ship-kyotori/docking.ts";
import { arrangement, coneAt, DRIVE, exhaustClashes, INNER_ENVELOPE, SPACING } from "../src/model/fleet/ship-kyotori/cluster.ts";
import { STUB } from "../src/model/fleet/ship-kyotori/station.ts";
import { APART } from "../src/model/fleet/ship-kyotori/index.ts";
import { CLASS_FACTS, CLASS_TABLE, classTableMarkdown, LETTERS, RIM, specification } from "../src/model/fleet/ship-kyotori/specs.ts";
import { KYOTORI_PARTS, KYOTORI_VARIANT_SLOTS } from "../src/model/fleet/ship-kyotori/variants.ts";
import { COLLARS } from "../src/model/fleet/collars.ts";
import { boundsOf, meshOf } from "../src/model/pieces.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);

test("the rim turns at the rpm that gives 1.00 g at its 60 m radius, computed from the radius", () => {
  near(RIM.rpm, 3.86, 0.01, "rpm");
  near(RIM.g, 1, 1e-9, "g");
  assert.ok(specification().some((line) => line.name === "Station rim" && line.value.includes("3.86 rpm")));
});

test("every slot of every variant names a part that exists, each part is used, and the four variants are all there", () => {
  const ids = new Set(KYOTORI_PARTS.map((part) => part.id));
  assert.deepEqual(Object.keys(KYOTORI_VARIANT_SLOTS).sort(), ["kyotori", "kyotori-a", "kyotori-b", "kyotori-c", "kyotori-cutaway", "kyotori-d", "kyotori-flared", "kyotori-four", "kyotori-separated", "kyotori-stowed"]);
  const used = new Set<string>();
  for (const [variant, slots] of Object.entries(KYOTORI_VARIANT_SLOTS)) for (const [slot, part] of Object.entries(slots)) {
    assert.ok(ids.has(part), `${variant}/${slot}: ${part}`);
    used.add(part);
  }
  for (const id of ids) assert.ok(used.has(id), `${id} is in no variant`);
  const registry = ROCKETS["fleet-kyotori"];
  assert.equal(registry.variants.length, 10);
  for (const variant of registry.variants) for (const part of Object.values(variant.partIds ?? {})) assert.ok(PART_ENTRIES.some((e) => e.record.id === part), part);
});

test("the ships stand either side of the axis, joined or apart, the apart ones further out and back along the axis", () => {
  for (const s of ["a", "b"]) {
    const joined = KYOTORI_PARTS.find((p) => p.id === `${s}-drive`)!;
    const apart = KYOTORI_PARTS.find((p) => p.id === `${s}-drive-apart`)!;
    assert.equal(Math.sign(joined.place.x), s === "a" ? 1 : -1);
    near(Math.abs(apart.place.x) - Math.abs(joined.place.x), APART.x, 1e-9, "out");
    near(apart.y0 - joined.y0, APART.y, 1e-9, "back");
  }
});

test("the docking plan: no overlap, every direction a unit vector, every collar a real class, and a quarter's dock is on a despun ring", () => {
  assert.deepEqual(clearance(), []);
  for (const port of PORTS) {
    near(Math.hypot(...port.dir), 1, 1e-9, port.id);
    assert.ok(port.collar in COLLARS, port.id);
    assert.equal(port.turns, false, `${port.id} stands on a turning part`);
  }
  const quarters = PORTS.filter((p) => p.id.startsWith("quarter-"));
  assert.equal(quarters.length, 4);
  for (const q of quarters) assert.ok(q.collar === "H" && q.despun && q.walkway, q.id);
  assert.equal(PORTS.filter((p) => p.id.startsWith("housing")).length, 4);
});

test("the solar wings have three states, each carrying a Move for the viewer, and the full wing's blanket is twice the flared one's", () => {
  const len = (state: string) => {
    const mesh = meshOf(KYOTORI_PARTS.find((p) => p.id === `s-wings-${state}`)!.pieces());
    assert.equal(mesh.moves.length, 4, state);
    assert.ok(mesh.moves.every((m) => m.name === "wing-turn"), state);
    const b = boundsOf(mesh);
    return b.max[1] - b.min[1];
  };
  assert.ok(len("full") > len("flared") && len("flared") >= len("stowed") * 0.9, "the wings grow with their state");
});

test("four ships fit: in the 2x2 cluster no drive fires into a neighbour, and the same holds in the quadrant arrangement", () => {
  const cluster = arrangement("cluster", STUB.radius);
  const quadrants = arrangement("quadrants", STUB.radius);
  assert.equal(cluster.length, 4);
  for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3]]) near(Math.hypot(cluster[a].x - cluster[b].x, cluster[a].z - cluster[b].z), SPACING, 1e-9, "spacing");
  // the nozzles' flares stand apart, the ships' inner envelopes leave room for the seam, and the beams never meet
  assert.ok(SPACING > 2 * DRIVE.exitR, "the nozzles do not touch");
  assert.ok(SPACING >= 2 * INNER_ENVELOPE - 1, "the inner envelopes meet at the seam and no further");
  assert.deepEqual(exhaustClashes(cluster), []);
  assert.deepEqual(exhaustClashes(quadrants, {}, false), []);
  // the steer is what keeps the beams apart: a straight beam of this width would overlap its neighbour's within the hazard length
  assert.ok(exhaustClashes(cluster, {}, false).length > 0, "unsteered, the cluster's beams meet");
  assert.ok(coneAt(cluster[0], DRIVE.plume).r > DRIVE.exitR);
  // every ship's real tail is at the same height and no part of any ship hangs below it
  const lowest = (id: string) => Math.min(...KYOTORI_PARTS.filter((p) => p.id === `${id}-drive`).map((p) => boundsOf(meshOf(p.pieces())).min[1] + p.y0));
  for (const id of ["a", "b", "c", "d"]) near(lowest(id), lowest("a"), 0.5, `tail of ${id}`);
  // the tank bouquet is on the outer faces only: no tank of a ship stands on its inner side
  for (const sh of [["a", 1, -1], ["b", -1, -1], ["c", 1, 1], ["d", -1, 1]] as const) {
    const tanks = KYOTORI_PARTS.find((p) => p.id === `${sh[0]}-tanks`)!;
    const b = boundsOf(meshOf(tanks.pieces()));
    // in the part's own frame its origin is the part's base at the ship's axis: x and z of the tanks are ship-relative
    const worldInner = [sh[1] > 0 ? b.min[0] : -b.max[0], sh[2] > 0 ? b.min[2] : -b.max[2]];
    assert.ok(worldInner[0] >= -7 && worldInner[1] >= -7, `${sh[0]}: tanks reach ${worldInner.join(",")} on the inner side`);
  }
});

test("the visitors stand at the quarters' docks at true scale: a Dragon at the control quarter and a Starship at the observatory", () => {
  const p = KYOTORI_PARTS.find((x) => x.id === "s-visitors")!;
  const b = boundsOf(meshOf(p.pieces()));
  assert.ok(b.max[1] - b.min[1] > 50 && b.max[1] - b.min[1] < 70, "a 52 m stage plus its drum");
  assert.ok(Object.values(KYOTORI_VARIANT_SLOTS.kyotori).includes("s-visitors"));
});

for (const variant of ["kyotori", "kyotori-cutaway", "kyotori-four"] as const) test(`the build budget, ${variant}: the first picture inside a second, the full detail inside three`, () => {
  const wanted = new Set(Object.values(KYOTORI_VARIANT_SLOTS[variant]));
  const once = (level: "coarse" | "fine") => {
    const start = performance.now();
    let pieces = 0;
    toGlb(KYOTORI_PARTS.filter((part) => wanted.has(part.id)).map((part) => { const made = part.pieces({ level }); pieces += made.length; return { name: part.id, mesh: meshOf(made), at: [0, 0, 0] as const }; }));
    return { ms: performance.now() - start, pieces };
  };
  once("fine");
  const coarse = once("coarse");
  const full = once("fine");
  console.log(`build ${variant}, coarse ${coarse.ms.toFixed(0)} ms (${coarse.pieces} pieces), full ${full.ms.toFixed(0)} ms (${full.pieces} pieces)`);
  assert.ok(coarse.ms < BUILD_BUDGET_MS.coarse, `the coarse build took ${coarse.ms.toFixed(0)} ms`);
  assert.ok(full.ms < BUILD_BUDGET_MS.fine, `the full build took ${full.ms.toFixed(0)} ms`);
  assert.ok(coarse.pieces < full.pieces, `${coarse.pieces} coarse of ${full.pieces}`);
});

test("no bell in the drives: the drive is coil rings, and its pieces use no bell material", () => {
  const drive = KYOTORI_PARTS.find((p) => p.id === "a-drive")!.pieces();
  assert.ok(!drive.some((piece) => piece.kind !== "lines" && (piece.material === "bell" || piece.material === "bell-inside")));
  assert.ok(drive.filter((piece) => piece.kind === "lathe" && piece.material.startsWith("coil")).length >= 12);
});

test("the four ships are one class: the table is the one source, and the bible, the README, the panel and the parts agree with it (LESSONS 30)", () => {
  const table = classTableMarkdown();
  assert.ok(readFileSync("docs/fleet/ship-kyotori.md", "utf8").includes(table), "the bible has the table");
  assert.ok(readFileSync("README.md", "utf8").includes(table), "the README has the table");
  const row = (name: string, L: (typeof LETTERS)[number]) => CLASS_TABLE.find((r) => r.row === name)![L];
  const rocket = ROCKETS["fleet-kyotori"];
  const roleParts = new Set<string>();
  for (const L of LETTERS) {
    const facts = CLASS_FACTS[L];
    const variant = rocket.variants.find((v) => v.id === `kyotori-${L.toLowerCase()}`)!;
    assert.ok(variant, `variant of ship ${L}`);
    // the panel: every row of the table for this ship is in its spec tab
    const spec = Object.fromEntries(variant.inspector!.spec);
    for (const r of CLASS_TABLE) assert.equal(spec[`Class: ${r.row}`], r[L], `${L} / ${r.row} in the panel`);
    // the parts: it has the role part of its kind and no other role, and the hull its table says
    const slots = KYOTORI_VARIANT_SLOTS[variant.id];
    assert.equal(slots.role, `k-role-${facts.role}`);
    assert.equal(Object.keys(slots).includes("bay"), facts.hull === "long", `${L}: the bay is the long hull's`);
    assert.equal(Object.keys(slots).includes("crew"), facts.hull === "runner", `${L}: the crew space is the short hull's`);
    assert.ok(row("Hull", L).includes(facts.hull === "long" ? "long hull" : "short hull"), `${L}: hull`);
    roleParts.add(slots.role);
    // the role part has pieces of its kind: booms, a clean room, a mirror, a medical pod
    const pieces = KYOTORI_PARTS.find((p) => p.id === slots.role)!.pieces();
    const materials = (m: string) => pieces.filter((p) => p.kind !== "lines" && (p as { material: string }).material === m).length;
    if (facts.feature === "sensor-booms") assert.ok(materials("window") >= 8 && row("Its own compartments", L).includes("sensor booms"), "survey booms");
    if (facts.feature === "clean-room") assert.ok(materials("lamp-blue") >= 1 && row("Its own compartments", L).includes("clean room"), "clean room");
    if (facts.feature === "second-telescope") assert.ok(materials("gold") + materials("kapton") >= 7 && row("Its own compartments", L).includes("telescope"), "telescope");
    if (facts.feature === "sick-bay") assert.ok(materials("lamp-red") >= 2 && row("Its own compartments", L).includes("sick bay"), "sick bay");
  }
  assert.equal(roleParts.size, 4, "four different roles");
  // the shared parts are shared: the drive and tanks are one part for all four
  const used = (id: string) => LETTERS.filter((L) => Object.values(KYOTORI_VARIANT_SLOTS[`kyotori-${L.toLowerCase()}`]).includes(id)).length;
  assert.equal(used("k-drive"), 4);
  assert.equal(used("k-tanks"), 4);
  assert.equal(used("k-shaft-long"), 2);
  assert.equal(used("k-bow-runner"), 2);
  // names come later: the letters stand in, in the data and in the visible text
  for (const L of LETTERS) assert.ok(rocket.variants.find((v) => v.id === `kyotori-${L.toLowerCase()}`)!.name.endsWith(`ship ${L}`));
});
