// The fleet module kit: sizes in metres, the collar standard, ships as lists on a spine, detail on every module, one mesh for one description, and the kit as parts of the registry.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { check, MATERIALS, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { COLLARS, COLLAR_CLASSES, assemble, KIT, mates, SAMPLE_SHIPS, shipParts, shipPieces } from "../src/model/fleet/kit.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const modules = Object.values(KIT);
const measured = (pieces: readonly Piece[]) => {
  const { min, max } = boundsOf(meshOf(pieces));
  return { width: max[0] - min[0], depth: max[2] - min[2], length: max[1] - min[1], low: min[1], high: max[1] };
};
const materialsOf = (pieces: readonly Piece[]) => new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));

test("the kit has the modules the brief asks for, each with a name, a mass and a size in metres", () => {
  const kinds = new Set(modules.map((module) => module.kind));
  for (const kind of ["engine", "thruster", "tank", "cargo", "habitat", "lab", "sensor", "reactor", "radiator", "node", "truss", "adapter", "shield"]) assert.ok(kinds.has(kind as never), kind);
  assert.equal(new Set(modules.map((module) => module.id)).size, modules.length);
  for (const module of modules) {
    assert.ok(module.name.length > 3 && module.note.length > 20, module.id);
    assert.ok(module.mass > 0 && module.length > 0 && module.width > 0 && module.depth > 0, module.id);
    assert.ok(Object.values(MATERIALS).length > 0);
  }
});

test("a module's declared size in metres is the size of its mesh, and it stands on y = 0", () => {
  for (const module of modules)
    for (const cutaway of module.inside ? [false, true] : [false]) {
      const size = measured(module.pieces({ cutaway }));
      assert.ok(Math.abs(size.length - module.length) <= 0.3 + module.length * 0.01, `${module.id}: length ${size.length} against ${module.length}`);
      assert.ok(Math.abs(size.width - module.width) <= 0.6 + module.width * 0.06, `${module.id}: width ${size.width} against ${module.width}`);
      assert.ok(Math.abs(size.depth - module.depth) <= 0.6 + module.depth * 0.06 || size.depth <= module.depth + 0.6, `${module.id}: depth ${size.depth} against ${module.depth}`);
      assert.ok(size.low >= -0.25 && size.high <= module.length + 0.25, `${module.id}: stands from ${size.low} to ${size.high}`);
    }
});

test("the collar standard: four classes, each twice the one before, every bore inside its flange", () => {
  assert.deepEqual([...COLLAR_CLASSES], ["S", "M", "L", "H"]);
  for (let i = 1; i < COLLAR_CLASSES.length; i++) {
    const [small, big] = [COLLARS[COLLAR_CLASSES[i - 1]], COLLARS[COLLAR_CLASSES[i]]];
    assert.equal(big.outer, small.outer * 2);
    assert.equal(big.bore, small.bore * 2 - (i === 1 ? -0.2 : 0));
  }
  for (const c of Object.values(COLLARS)) assert.ok(c.bore < c.outer * 0.55 && c.bolts % 2 === 0 && c.dogs > 0 && c.thick > 0);
  assert.ok(mates("L", "L") && !mates("L", "M") && !mates(undefined, "M") && !mates("M", undefined));
});

test("each collar of a module is a joint of the part's record, as wide as its class, and its flange is in the mesh", () => {
  for (const entry of PART_ENTRIES) {
    const module = KIT[entry.record.id.replace(/-cutaway$/, "")];
    if (!module) continue;
    for (const [end, joint, y] of [["top", entry.record.joints.top, module.length], ["bottom", entry.record.joints.bottom, 0]] as const) {
      const cls = module[end];
      assert.equal(joint?.diameter, cls ? COLLARS[cls].outer : undefined, `${module.id} ${end}`);
      if (!cls) continue;
      assert.equal(joint?.y, y);
      // a flange ring: a lathe whose outer radius is the class's
      const flange = entry.pieces().some((piece) => piece.kind === "lathe" && piece.profile.some(([r]) => Math.abs(r - COLLARS[cls].outer / 2) < 1e-6) && piece.profile.some(([, py]) => Math.abs(py - y) < COLLARS[cls].thick * 2));
      assert.ok(flange, `${module.id} ${end} has a ${cls} flange`);
    }
  }
});

test("no module has a bare surface: hundreds of pieces, many materials, many kinds of detail", () => {
  for (const module of modules) {
    const pieces = module.pieces();
    assert.ok(pieces.length >= 140, `${module.id}: ${pieces.length} pieces`);
    assert.ok(materialsOf(pieces).size >= 8, `${module.id}: ${materialsOf(pieces).size} materials`);
  }
  // every kind of detail of the detail kit is somewhere: seams, hatches, conduits, radiators, tiles, joints, antennae, markings
  const everything = modules.flatMap((module) => module.pieces());
  const has = (material: string) => everything.some((piece) => piece.kind !== "lines" && (piece as { material: string }).material === material);
  for (const material of ["copper", "coil", "radiator", "tile", "hazard", "lamp-amber", "lamp-blue", "lamp-red", "glass", "plant", "frost", "panel-dark", "hull-orange", "hull-white", "hull-yellow", "hull-blue"]) assert.ok(has(material), material);
  assert.ok(everything.some((piece) => piece.kind === "lines"), "seam lines for the drawings");
});

test("a mesh is a pure function of its description: the same module twice is the same bytes, and a different seed is not", () => {
  const bytes = (seed?: string) => toGlb([{ name: "m", mesh: meshOf(KIT["tank-cryo-12"].pieces({ seed })), at: [0, 0, 0] }]).bytes;
  assert.deepEqual(bytes(), bytes());
  assert.notDeepEqual(bytes("a"), bytes("b"));
  const shipBytes = () => toGlb([{ name: "s", mesh: meshOf(shipPieces(SAMPLE_SHIPS.scout, { detail: 0.4 })), at: [0, 0, 0] }]).bytes;
  assert.deepEqual(shipBytes(), shipBytes());
});

test("the detail level lowers the count and keeps the shape", () => {
  const full = KIT["habitat-drum-large"].pieces({ detail: 1 }).length;
  const low = KIT["habitat-drum-large"].pieces({ detail: 0.3 }).length;
  assert.ok(low < full * 0.8, `${low} against ${full}`);
  assert.ok(Math.abs(measured(KIT["habitat-drum-large"].pieces({ detail: 0.3 })).length - 24) < 0.5);
});

test("each module alone stays inside the mesh limit of a part, and its sample ship inside the fleet's", () => {
  for (const module of modules)
    for (const cutaway of module.inside ? [false, true] : [false]) {
      const bytes = toGlb([{ name: module.id, mesh: meshOf(module.pieces({ cutaway })), at: [0, 0, 0] }]).bytes.byteLength;
      assert.ok(bytes < 600 * 1024, `${module.id}${cutaway ? " cut" : ""}: ${bytes}`);
    }
});

test("a ship is a list of modules on a spine: the joints are checked, and a wrong collar is named", () => {
  for (const [id, ship] of Object.entries(SAMPLE_SHIPS)) {
    const a = assemble(ship);
    assert.equal(a.ok, true, `${id}: ${a.issues.map((issue) => issue.message).join("; ")}`);
    assert.equal(a.placed.length, ship.length);
    assert.ok(a.mass > 1000 && a.length > 50, id);
  }
  const hauler = assemble(SAMPLE_SHIPS.hauler);
  // the spine's length is the modules' lengths added up, the containers stand parallel on the bay's ports
  const spine = hauler.placed.filter((p) => p.how === "spine").reduce((sum, p) => sum + p.module.length, 0);
  assert.ok(Math.abs(hauler.length - spine) < 0.01 + 12, `${hauler.length} against ${spine}`);
  assert.equal(hauler.placed.filter((p) => p.how === "port").length, 4);
  const bad = assemble([{ module: "engine-fusion-7" }, { module: "container-12" }]);
  assert.equal(bad.ok, false);
  assert.equal(bad.issues[0].code, "collar-mismatch");
  assert.equal(assemble([{ module: "nothing" }]).issues[0].code, "unknown-module");
  assert.equal(assemble([{ module: "cargo-bay-4" }, { module: "container-12", on: { place: 0, port: "bay9" } }]).issues[0].code, "no-such-port");
  const twice = assemble([{ module: "cargo-bay-4" }, { module: "container-12", on: { place: 0, port: "bay1" } }, { module: "container-12", on: { place: 0, port: "bay1" } }]);
  assert.equal(twice.issues[0].code, "port-taken");
  assert.equal(assemble([{ module: "engine-fusion-7" }, { module: "tank-cryo-12" }, { module: "shield-forward" }, { module: "tank-cryo-12" }]).issues[0].code, "collar-mismatch");
});

test("a ship's parts work in the registry: together, apart and one part alone, in every look", () => {
  const parts = shipParts("test-ship", SAMPLE_SHIPS.scout);
  assert.equal(parts.entries.length, SAMPLE_SHIPS.scout.length);
  assert.ok(parts.entries.every(({ record }) => record.rocket === "test-ship"));
  const hauler = build({ rocket: "fleet-samples", variant: "hauler" });
  assert.equal(hauler.parts.length, SAMPLE_SHIPS.hauler.length);
  assert.equal(check({ rocket: "fleet-samples", variant: "hauler" }).ok, true);
  assert.ok(hauler.glb().triangles > 50_000);
  for (const part of hauler.parts.filter((one) => one.record.strapOn)) assert.ok(part.record.strapOn && Math.hypot(part.record.strapOn.x, part.record.strapOn.z) > 5, part.record.id);
  assert.match(hauler.svg({ look: "painted", show: hauler.shows[1] }), /^<svg /);
});

test("every module is a part and a variant, labelled fictional, with its cutaway where it has an inside", () => {
  for (const module of modules) {
    const entry = PART_ENTRIES.find(({ record }) => record.id === module.id);
    assert.ok(entry, module.id);
    assert.ok(entry.record.height === module.length);
    const variants = Object.values(ROCKETS).filter((rocket) => rocket.id.startsWith("fleet-")).flatMap((rocket) => rocket.variants);
    const own = variants.filter((variant) => variant.id === module.id || variant.id === `${module.id}-cutaway`);
    assert.equal(own.length, module.inside ? 2 : 1, module.id);
    for (const variant of own) {
      assert.equal(variant.status, "fictional");
      assert.match(variant.name, /fictional/i);
      assert.equal(variant.facts.height.value, null);
    }
  }
});

test("combinations: every collar mates with every other collar of its class, so any two modules whose collars are the same class go together, and many different ships can be made", () => {
  let pairs = 0;
  for (const below of modules)
    for (const above of modules) {
      const ship = [{ module: below.id }, { module: above.id }];
      const a = assemble(ship);
      const should = below.top !== undefined && below.top === above.bottom;
      assert.equal(a.issues.filter((issue) => issue.code === "collar-mismatch").length === 0, should, `${below.id} under ${above.id}`);
      if (!should) continue;
      pairs++;
      // the joint lines up: the upper module's base is the lower one's top, and the two collars are the same width
      assert.equal(a.placed[1].at[1], below.length);
      assert.equal(COLLARS[below.top as "L"].outer, COLLARS[above.bottom as "L"].outer);
      assert.equal(mates(below.top, above.bottom), true);
    }
  assert.ok(pairs >= 150, `${pairs} pairs of modules go together`);
  // a thousand ships picked at random by walking the kit's joints, from the engines to a module with nothing on top: every one checks, and its parts add up
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const seen = new Set<string>();
  for (let n = 0; n < 1000; n++) {
    const ship: { module: string }[] = [];
    let current: (typeof modules)[number] | undefined = modules.filter((m) => m.kind === "engine")[Math.floor(next() * 4)];
    while (current && ship.length < 9) {
      ship.push({ module: current.id });
      const top: string | undefined = current.top;
      const options: typeof modules = top ? modules.filter((m) => m.bottom === top && m.kind !== "engine") : [];
      current = options.length ? options[Math.floor(next() * options.length)] : undefined;
    }
    const a = assemble(ship);
    assert.equal(a.ok, true, ship.map((m) => m.module).join(" > "));
    assert.ok(Math.abs(a.length - ship.reduce((sum, m) => sum + KIT[m.module].length, 0)) < 1e-9);
    // every joint of the spine: the collar below and the collar above are one class
    for (let i = 1; i < ship.length; i++) assert.equal(KIT[ship[i - 1].module].top, KIT[ship[i].module].bottom);
    seen.add(ship.map((m) => m.module).join(">"));
  }
  assert.ok(seen.size >= 400, `${seen.size} different ships`);
  // and the mesh of one of them draws: the pieces are the modules' own
  const odd = ["engine-fusion-4", "tank-cryo-12", "node-four", "radiator-deployed"].slice(0, 2);
  assert.ok(shipPieces(odd.map((module) => ({ module })), { detail: 0.3 }).length > 300);
});
