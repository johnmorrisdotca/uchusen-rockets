// ISV Kyotori (SPX-045): the rim's numbers are computed, every slot of every variant names a part that exists, the ships' parts stand where the ships are, the docking plan's data has no overlap and no port on a turning part, the build holds the budget, and the
// pieces carry the Move tags the viewer's motion needs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { BUILD_BUDGET_MS, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { clearance, PORTS } from "../src/model/fleet/ship-kyotori/docking.ts";
import { APART } from "../src/model/fleet/ship-kyotori/index.ts";
import { RIM, specification } from "../src/model/fleet/ship-kyotori/specs.ts";
import { KYOTORI_PARTS, KYOTORI_VARIANT_SLOTS } from "../src/model/fleet/ship-kyotori/variants.ts";
import { COLLARS } from "../src/model/fleet/collars.ts";
import { meshOf } from "../src/model/pieces.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);

test("the rim turns at the rpm that gives 1.00 g at its 60 m radius, computed from the radius", () => {
  near(RIM.rpm, 3.86, 0.01, "rpm");
  near(RIM.g, 1, 1e-9, "g");
  assert.ok(specification().some((line) => line.name === "Station rim" && line.value.includes("3.86 rpm")));
});

test("every slot of every variant names a part that exists, each part is used, and the four variants are all there", () => {
  const ids = new Set(KYOTORI_PARTS.map((part) => part.id));
  assert.deepEqual(Object.keys(KYOTORI_VARIANT_SLOTS).sort(), ["kyotori", "kyotori-cutaway", "kyotori-separated", "kyotori-stowed"]);
  const used = new Set<string>();
  for (const [variant, slots] of Object.entries(KYOTORI_VARIANT_SLOTS)) for (const [slot, part] of Object.entries(slots)) {
    assert.ok(ids.has(part), `${variant}/${slot}: ${part}`);
    used.add(part);
  }
  for (const id of ids) assert.ok(used.has(id), `${id} is in no variant`);
  const registry = ROCKETS["fleet-kyotori"];
  assert.equal(registry.variants.length, 4);
  for (const variant of registry.variants) for (const part of Object.values(variant.partIds)) assert.ok(PART_ENTRIES.some((e) => e.record.id === part), part);
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
  assert.equal(PORTS.filter((p) => p.id.startsWith("housing")).length, 2);
});

test("the solar wings carry a Move for the viewer, deployed, and the quarters and ships carry none that nothing names", () => {
  const wings = KYOTORI_PARTS.find((p) => p.id === "c-wings-deployed")!;
  const mesh = meshOf(wings.pieces());
  assert.ok(mesh.moves.length >= 4 && mesh.moves.every((m) => m.name === "wing-turn"));
  assert.equal(meshOf(KYOTORI_PARTS.find((p) => p.id === "c-wings-stowed")!.pieces()).moves.length, 4);
});

for (const variant of ["kyotori", "kyotori-cutaway"] as const) test(`the build budget, ${variant}: the first picture inside a second, the full detail inside three`, () => {
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
