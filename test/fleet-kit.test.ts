// The fleet module kit: sizes in metres, the collar standard, ships as lists on a spine, detail on every module, one mesh for one description, and the kit as parts of the registry.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { check, FLEET_PALETTE, MATERIALS, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { foilBand } from "../src/model/fleet/detail.ts";
import { COLLARS, COLLAR_CLASSES, assemble, deckParts, hardpointsOf, KIT, mates, SAMPLE_SHIPS, shipParts, shipPieces, swapsFor } from "../src/model/fleet/kit.ts";
import { expandInstances } from "../src/model/instances.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const modules = Object.values(KIT);
const measured = (pieces: readonly Piece[]) => {
  const { min, max } = boundsOf(meshOf(pieces));
  return { width: max[0] - min[0], depth: max[2] - min[2], length: max[1] - min[1], low: min[1], high: max[1] };
};
const copies = (pieces: readonly Piece[]) => expandInstances(pieces);
const materialsOf = (pieces: readonly Piece[]) => new Set(copies(pieces).filter((piece) => piece.kind !== "lines").map((piece) => piece.material));

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
    const pieces = copies(module.pieces());
    assert.ok(pieces.length >= 140, `${module.id}: ${pieces.length} pieces`);
    assert.ok(materialsOf(pieces).size >= 8, `${module.id}: ${materialsOf(pieces).size} materials`);
  }
  // every kind of detail of the detail kit is somewhere: seams, hatches, conduits, radiators, tiles, joints, antennae, markings
  const everything = modules.flatMap((module) => copies(module.pieces()));
  const has = (material: string) => everything.some((piece) => piece.kind !== "lines" && ((piece as { material: string }).material === material || (piece as { top?: string }).top === material));
  for (const material of ["copper", "coil-lit", "radiator", "tile", "hazard", "lamp-amber", "lamp-blue", "lamp-red", "glass", "plant", "frost", "panel-dark", "hull-orange", "hull-white", "hull-yellow", "hull-blue"]) assert.ok(has(material), material);
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
  const full = copies(KIT["habitat-drum-large"].pieces({ detail: 1 })).length;
  const low = copies(KIT["habitat-drum-large"].pieces({ detail: 0.3 })).length;
  assert.ok(low < full * 0.8, `${low} against ${full}`);
  assert.ok(Math.abs(measured(KIT["habitat-drum-large"].pieces({ detail: 0.3 })).length - 24) < 0.5);
});

test("each module alone stays inside the mesh limit of a fleet part (1.25 MB: the fleet is built in the browser), and its sample ship inside the fleet's", () => {
  for (const module of modules)
    for (const cutaway of module.inside ? [false, true] : [false]) {
      const bytes = toGlb([{ name: module.id, mesh: meshOf(module.pieces({ cutaway })), at: [0, 0, 0] }]).bytes.byteLength;
      assert.ok(bytes < 1280 * 1024, `${module.id}${cutaway ? " cut" : ""}: ${bytes}`);
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

test("every module is a part and a variant, in the SPX fleet, with its cutaway where it has an inside", () => {
  for (const module of modules) {
    const entry = PART_ENTRIES.find(({ record }) => record.id === module.id);
    assert.ok(entry, module.id);
    assert.ok(entry.record.height === module.length);
    const variants = Object.values(ROCKETS).filter((rocket) => rocket.id.startsWith("fleet-")).flatMap((rocket) => rocket.variants);
    const own = variants.filter((variant) => variant.id === module.id || variant.id === `${module.id}-cutaway`);
    assert.equal(own.length, module.inside ? 2 : 1, module.id);
    for (const variant of own) {
      assert.equal(variant.status, "fictional");
      assert.doesNotMatch(variant.name, /fictional/i);
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

test("names: the fleet's maker is SPX and every designation starts with SPX-", async () => {
  const { designation, FLEET_MAKER } = await import("../src/index.ts");
  assert.equal(FLEET_MAKER, "SPX");
  assert.equal(designation("03"), "SPX-03");
  assert.equal(designation("02"), "SPX-02");
  assert.throws(() => designation(""));
  assert.throws(() => designation("spx 3"));
  const rocket = ROCKETS["fleet-samples"];
  assert.equal(rocket.madeBy.value, "SPX");
  for (const variant of rocket.variants) assert.match(variant.name, /^SPX-[A-Z0-9-]+ /, variant.id);
  for (const one of Object.values(ROCKETS).filter((r) => r.id.startsWith("fleet-"))) assert.equal(one.madeBy.value, "SPX", one.id);
});

test("levels: coarse is the hull, the collars and the big shapes; fine adds the detail, in a pass of its own, and the two make the whole", async () => {
  const { BUILD_BUDGET_MS, isCoarse, shipLevels } = await import("../src/index.ts");
  for (const module of modules) {
    const all = module.pieces();
    const coarse = module.pieces({ level: "coarse" });
    assert.ok(coarse.length >= 3 && coarse.length < all.length * 0.5, `${module.id}: ${coarse.length} of ${all.length}`);
    assert.ok(coarse.every(isCoarse), module.id);
    // the coarse level keeps the collars, so the joints still show
    for (const end of ["top", "bottom"] as const) {
      const cls = module[end];
      if (cls) assert.ok(coarse.some((piece) => piece.kind === "lathe" && piece.profile.some(([r]) => Math.abs(r - COLLARS[cls].outer / 2) < 1e-6)), `${module.id} ${end}`);
    }
  }
  const ship = SAMPLE_SHIPS.scout;
  const levels = shipLevels(ship, { detail: 0.4 });
  const batches = [...levels.fine()];
  assert.equal(batches.length, ship.length);
  assert.deepEqual(batches.map((b) => b.place), ship.map((_, i) => i));
  const whole = shipPieces(ship, { detail: 0.4, level: "fine" });
  assert.equal(levels.coarse.length + batches.reduce((sum, b) => sum + b.pieces.length, 0), whole.length);
  // nearest first: the order the viewer asks for
  assert.deepEqual([...shipLevels(ship, { detail: 0.4 }, [5, 2]).fine()].map((b) => b.place), [5, 2]);
  assert.ok(BUILD_BUDGET_MS.coarse === 1000 && BUILD_BUDGET_MS.fine === 3000);
});

test("build time: a sample assembly's first picture is built within a second and its full detail within three, and a build over budget fails here", async () => {
  const { BUILD_BUDGET_MS, timeBuild } = await import("../src/index.ts");
  for (const [id, ship] of Object.entries(SAMPLE_SHIPS)) {
    // the best of three: a busy machine's one slow run is not a slow build
    const best = (level: "coarse" | "fine") => Math.min(...[0, 1, 2].map(() => timeBuild(ship, level).ms));
    const coarse = best("coarse");
    const fine = best("fine");
    assert.ok(coarse <= BUILD_BUDGET_MS.coarse, `${id}: the coarse build took ${coarse.toFixed(0)} ms, over ${BUILD_BUDGET_MS.coarse}`);
    assert.ok(fine <= BUILD_BUDGET_MS.fine, `${id}: the fine build took ${fine.toFixed(0)} ms, over ${BUILD_BUDGET_MS.fine}`);
    assert.ok(coarse < fine);
  }
  // the whole path the viewer takes for the registered sample ship: its parts, its mesh and the bytes of its file
  const start = performance.now();
  const built = build({ rocket: "fleet-samples", variant: "hauler" });
  const glb = built.glb();
  const took = performance.now() - start;
  assert.ok(glb.triangles > 100_000);
  assert.ok(took <= BUILD_BUDGET_MS.fine, `build and file took ${took.toFixed(0)} ms, over ${BUILD_BUDGET_MS.fine}`);
  console.log(`hauler: build and file ${took.toFixed(0)} ms, ${glb.triangles} triangles`);
});

test("every module names the real hardware it descends from; pipes are round with flanges, bends and brackets; braces are I-beams, channels and round struts", async () => {
  const { DETAIL } = await import("../src/model/fleet/kit.ts");
  for (const module of modules) assert.ok(module.ancestor.length > 20, module.id);
  const mesh = (pieces: Parameters<typeof meshOf>[0]) => meshOf(pieces);
  const run = DETAIL.pipeRun([[0, 0, 0], [0, 3, 0], [2, 3, 0], [2, 3, 3]], 0.1, "coolant", { support: [-1, 0, 0], bracketEvery: 1.2 });
  const rods = run.filter((piece) => piece.kind === "plate" && piece.material === "coolant");
  assert.ok(rods.length >= 3, "a round tube for each run, and a chain of them round each bend");
  for (const rod of rods) assert.ok(rod.kind === "plate" && rod.outline.length >= 12, "twelve sides or more");
  // a real bend: the corners are rounded, so more tubes than runs, with a round joint inside each bend, flanges at the ends and brackets on legs
  assert.ok(rods.length > 3 && run.filter((piece) => piece.kind === "lathe" && piece.material === "coolant").length >= 2);
  assert.ok(run.filter((piece) => piece.kind === "plate" && piece.material === "hull-grey-dark").length >= 10);
  assert.ok(boundsOf(mesh(run)).max[0] > 2);
  // never a bare end: each end of a run has a flange or a gland wider than the pipe
  const ends = DETAIL.pipeRun([[0, 0, 0], [0, 0, 4]], 0.1, "coolant", { ends: ["flange", "cap"] });
  const wide = (z: number) => ends.some((piece) => piece.kind === "plate" && piece.material !== "coolant" && piece.outline.length >= 6 && Math.max(...piece.outline.map(([a]) => a)) > 0.15 && Math.abs(piece.frame.o[2] - z) < 0.2);
  assert.ok(wide(0) && wide(4), "a flange at each end");
  const i = DETAIL.iBeam("hull-grey", [0, 0, 0], [0, 4, 0], [1, 0, 0], 0.4, 0.3);
  assert.equal(i.length, 3, "a web and two flanges");
  const c = DETAIL.channel("hull-grey", [0, 0, 0], [0, 4, 0], [1, 0, 0], 0.4, 0.3);
  assert.equal(c.length, 3);
  const s = DETAIL.strut("hull-grey", [0, 0, 0], [0, 4, 0], 0.1);
  assert.ok(s.length >= 5 && s.every((piece) => piece.kind === "plate" && piece.outline.length >= 12));
  assert.ok(modules.some((module) => module.kind === "truss"));
});

test("any registry number is a designation, and the kit's builders make a module of a ship's own size", async () => {
  const { BUILDERS, designation } = await import("../src/index.ts");
  assert.equal(designation("207"), "SPX-207");
  assert.equal(designation("3"), "SPX-3");
  const container40 = BUILDERS.container("test-container-40", "Container, 40 m", 40, false, 400);
  assert.equal(container40.length, 40);
  assert.ok(container40.pieces({ detail: 0.4 }).length > 100);
  const tank80 = BUILDERS.tank("test-tank-80", "Tank, 80 m", 6, 80, "L", "L", 900, 12000, "A long tank.");
  assert.equal(tank80.length, 80);
  assert.ok(Math.abs(measured(tank80.pieces({ detail: 0.4 })).length - 80) < 0.5);
  assert.ok(assemble([{ module: "engine-fusion-7" }]).ok);
});

test("a cutaway opens where the ship says: +Z by default, +X for cutYaw 90", () => {
  const tank = KIT["tank-cryo-12"];
  const open = (cutYaw?: number) => tank.pieces({ cutaway: true, cutYaw }).filter((piece) => piece.kind === "lathe" && piece.arc && piece.body);
  const mid = (cutYaw?: number) => {
    const shell = open(cutYaw)[0];
    assert.ok(shell && shell.kind === "lathe" && shell.arc);
    const [a, b] = shell.arc(5);
    // the middle of the hull that is left is opposite the opening
    return ((((a + b) / 2) * 180) / Math.PI + 360) % 360;
  };
  assert.ok(Math.abs(mid(0) - 180) < 1);
  assert.ok(Math.abs(mid(90) - 270) < 1);
  assert.ok(Math.abs(mid(180) - 0) < 1 || Math.abs(mid(180) - 360) < 1);
});

test("solids by range and by corner, shared from SPX-03's adapter: a box, a prism, a quad, discs facing X and Z", async () => {
  const { DETAIL } = await import("../src/model/fleet/kit.ts");
  const bounds = (pieces: Parameters<typeof meshOf>[0]) => boundsOf(meshOf(pieces));
  const box = bounds([DETAIL.cub("hull-grey", [0, 2], [0, 3], [1, 5])]);
  assert.deepEqual([box.min, box.max].map((v) => v.map((n) => Math.round(n * 100) / 100)), [[0, 0, 1], [2, 3, 5]]);
  const prism = bounds([DETAIL.prism("hull-grey", DETAIL.chamfered(2, 1, 0.5), 3, 7)]);
  assert.ok(Math.abs(prism.max[1] - 7) < 1e-6 && Math.abs(prism.min[1] - 3) < 1e-6 && Math.abs(prism.max[0] - 2) < 1e-6);
  const slope = bounds([DETAIL.quad("hull-grey", [0, 0, 0], [4, 0, 0], [3, 2, 0], [1, 2, 0], 0.2)]);
  assert.ok(slope.max[0] - slope.min[0] > 3.9 && slope.max[1] - slope.min[1] > 1.9);
  assert.ok(bounds([DETAIL.discZ("hull-grey", 1, 1, 0, 2, 0.5)]).max[2] > 1.99 && bounds([DETAIL.discX("hull-grey", 1, 1, 0, 3, 0.5)]).max[0] > 2.99);
});

test("plating has depth: a quilted blanket is pillows with creases, a framed panel has a raised frame round a sunk field, foil is loose facets, a sheet is one face", () => {
  const faces = (piece: Piece) => {
    const mesh = meshOf([piece]);
    let verts = 0;
    let triangles = 0;
    for (const buffers of mesh.faces.values()) {
      verts += buffers.positions.length / 3;
      triangles += buffers.indices.length / 3;
    }
    return { verts, triangles, ...boundsOf(mesh) };
  };
  const frame = { o: [0, 0, 0] as [number, number, number], u: [1, 0, 0] as [number, number, number], v: [0, 1, 0] as [number, number, number], w: [0, 0, 1] as [number, number, number] };
  const outline = [[-1, -0.6], [1, -0.6], [1, 0.6], [-1, 0.6]] as const;
  const flat = faces({ kind: "plate", material: "blanket", frame, outline, thickness: 0.1 });
  const quilt = faces({ kind: "plate", material: "blanket", frame, outline, thickness: 0.1, quilt: { nu: 3, nv: 2, bulge: 0.05 } });
  assert.ok(quilt.triangles > flat.triangles * 4, "pillows are many faces");
  assert.ok(quilt.max[2] > flat.max[2] + 0.04, "each pillow stands proud of the panel's edge");
  const framed = faces({ kind: "plate", material: "hull-grey", top: "hull-white", frame, outline, thickness: 0.1, inset: { margin: 0.1, depth: 0.04 } });
  assert.ok(framed.triangles > flat.triangles, "a frame and walls");
  const mesh = meshOf([{ kind: "plate", material: "hull-grey", top: "hull-white", frame, outline, thickness: 0.1, inset: { margin: 0.1, depth: 0.04 } }]);
  assert.ok(mesh.faces.has("hull-white") && mesh.faces.has("hull-grey"), "the field and the frame are two materials");
  const sheet = faces({ kind: "plate", material: "foil", frame, outline, thickness: 0.01, sheet: true });
  assert.equal(sheet.verts, 4, "a sheet is one face");
  const foil = DETAIL_FOIL();
  assert.ok(foil.length >= 1 && foil.every((piece) => piece.kind === "plate" && Boolean(piece.facets?.length)));
  const facets = foil.reduce((sum, piece) => sum + (piece.kind === "plate" ? (piece.facets?.length ?? 0) : 0), 0);
  assert.ok(facets >= 60, `${facets} facets`);
  // every facet takes the light on its own: the normals of a foil band differ from facet to facet
  const normals = new Set<string>();
  for (const buffers of meshOf(foil).faces.values()) for (let i = 0; i < buffers.normals.length; i += 9) normals.add(buffers.normals.slice(i, i + 3).map((n) => n.toFixed(2)).join(","));
  assert.ok(normals.size > facets * 0.8, "crinkled, not smooth");
});

function DETAIL_FOIL(): Piece[] {
  return foilBand("foil", 4, 0, 1.5, 0, 1.2, "test");
}

test("the livery is mostly white thermal blanket: most plating is quilted blanket or a white or grey rigid panel, foil is rare and colour is only a few small access panels", async () => {
  const { hullPanels, LIVERY } = await import("../src/model/fleet/detail.ts");
  for (const name of Object.keys(LIVERY) as (keyof typeof LIVERY)[]) {
    const pieces = hullPanels({ r: 6, y0: 0, y1: 40, livery: LIVERY[name], seed: `livery-${name}`, wide: 2.4, tall: 1.6, raise: 0.09 });
    const plates = pieces.filter((piece) => piece.kind === "plate");
    const area = (piece: Piece) => (piece.kind === "plate" ? piece.outline.reduce((sum, [a, b], i) => sum + (a * piece.outline[(i + 1) % piece.outline.length][1] - piece.outline[(i + 1) % piece.outline.length][0] * b), 0) / 2 : 0);
    const share = (test: (piece: Piece) => boolean) => plates.filter(test).reduce((sum, piece) => sum + Math.abs(area(piece)), 0) / plates.reduce((sum, piece) => sum + Math.abs(area(piece)), 0);
    const coloured = (piece: Piece) => piece.kind === "plate" && (["hull-orange", "hull-orange-worn", "hull-yellow", "hazard", "hull-blue"] as string[]).includes(piece.top ?? piece.material);
    // the accent colours (orange, and blue on the command scheme) are on at most a few small access panels
    const quilted = share((piece) => piece.kind === "plate" && Boolean(piece.quilt));
    assert.ok(share(coloured) < (name === "command" ? 0.06 : 0.04), `${name}: ${(share(coloured) * 100).toFixed(1)}% colour`);
    assert.ok(quilted > 0.5, `${name}: ${(quilted * 100).toFixed(0)}% of the plating is quilted blanket`);
    for (const piece of plates) if (Math.abs(area(piece)) > 0.3) assert.ok(piece.kind === "plate" && piece.material !== "hull-yellow" && piece.material !== "hazard", `${name}: no yellow slab`);
  }
});

test("round hardware has proper ends: a bulkhead gland, a valve and a blind flange; a separation joint is latches, bolt caps and umbilical plates and can be planned on a ship's place", async () => {
  const { pipeRun, separationJoint } = await import("../src/model/fleet/detail.ts");
  const kinds = (pieces: Piece[]) => pieces.filter((piece) => piece.kind === "plate").length;
  const [gland, valve, cap] = (["bulkhead", "valve", "cap"] as const).map((end) => pipeRun([[0, 0, 0], [0, 0, 3]], 0.1, "pipe-steel", { ends: ["flange", end] }));
  assert.ok(kinds(gland) > kinds(pipeRun([[0, 0, 0], [0, 0, 3]], 0.1, "pipe-steel", { ends: ["flange", "flange"] })) - 4);
  assert.ok(valve.some((piece) => piece.kind === "plate" && piece.material === "lamp-red"), "a valve has its handwheel");
  assert.ok(cap.length > 10);
  const joint = separationJoint(4.5, 12, { latches: 8, umbilicals: 3 });
  assert.ok(copies(joint).length > 50, `${copies(joint).length} pieces`);
  assert.ok(joint.some((piece) => piece.kind === "lines"), "the groove is a seam line in the drawing");
  const { min, max } = boundsOf(meshOf(joint));
  assert.ok(min[1] < 12 - 0.3 && max[1] > 12 + 0.3 && max[0] > 4.5, "it straddles the joint plane and stands proud of the collar");
  // planned on a ship: only the places that ask carry one, and the joint is at the place's base
  const plain = shipPieces([{ module: "tank-cryo-12" }, { module: "tank-cryo-12" }], { detail: 0.3 });
  const planned = shipPieces([{ module: "tank-cryo-12" }, { module: "tank-cryo-12", separation: true }], { detail: 0.3 });
  assert.ok(copies(planned).length > copies(plain).length + 40);
  assert.ok(copies(KIT["tank-cryo-12"].pieces({ detail: 0.3, separation: { latches: 4 } })).length > copies(KIT["tank-cryo-12"].pieces({ detail: 0.3 })).length);
});

test("the Lit look: coils, windows, navigation lights, strobes and floodlights are emissive materials that glow with the engines, and every ship has them", () => {
  const glowing = Object.entries(MATERIALS).filter(([, spec]) => "glow" in spec && (spec as { glow: number }).glow > 0).map(([name]) => name);
  for (const name of ["coil-lit", "window", "nav-red", "nav-green", "strobe", "flood", "lamp-amber", "lamp-blue", "lamp-red"]) assert.ok(glowing.includes(name), name);
  const used = new Set(Object.values(SAMPLE_SHIPS.hauler).flatMap((place) => copies(KIT[place.module].pieces({ detail: 0.4 }))).flatMap((piece) => (piece.kind === "lines" ? [] : [piece.material, ...(piece.kind === "plate" && piece.top ? [piece.top] : [])])));
  for (const name of ["coil-lit", "window", "nav-red", "nav-green", "strobe", "flood"]) assert.ok(used.has(name as never), `${name} is on the hauler`);
  // a lit colour is its own: a palette role for each
  for (const role of ["coilGlow", "windowLit", "navRed", "navGreen", "strobe", "flood"]) assert.match((FLEET_PALETTE as Record<string, string>)[role], /^#[0-9a-f]{6}$/i, role);
});

test("life aboard: a porthole with a burn shutter open and closed, an observation dome with its petals open and closed, sixteen furnished rooms, and a dome lounge and a solarium in the kit", async () => {
  const { observationDome, porthole, room } = await import("../src/model/fleet/detail.ts");
  const open = porthole(5, 0.3, 4, 0.5, "open");
  const shut = porthole(5, 0.3, 4, 0.5, "closed");
  assert.ok(open.length > 15 && shut.length > 15);
  const standoff = (pieces: Piece[]) => {
    let top = -Infinity;
    for (const buffers of meshOf(pieces).faces.values()) for (let i = 0; i < buffers.positions.length; i += 3) top = Math.max(top, buffers.positions[i] * Math.sin(0.3) + buffers.positions[i + 2] * Math.cos(0.3));
    return top;
  };
  // closed, the shutter stands proud of the pane; open, it lies folded back flat beside the port
  assert.ok(standoff(shut) > standoff(open) + 0.15, `${standoff(shut)} against ${standoff(open)}`);
  assert.ok(open.some((piece) => piece.kind === "plate" && piece.material === "window") && shut.some((piece) => piece.kind === "plate" && piece.material === "window"), "the pane is there either way");
  assert.ok(shut.some((piece) => piece.kind === "plate" && piece.material === "hazard"), "a closed shutter wears its burn stripe");
  const dome = observationDome([0, 9, 0], 3, "open");
  const closed = observationDome([0, 9, 0], 3, "closed");
  for (const set of [dome, closed]) assert.ok(set.some((piece) => piece.kind === "lathe" && piece.material === "glass-clear"), "glazing is clear glass");
  assert.ok(MATERIALS["glass-clear"].opacity < 0.5 && !("opacity" in MATERIALS["hull-grey"]));
  assert.ok(dome.filter((piece) => piece.kind === "lathe" && piece.arc).length >= 6, "six meridian ribs");
  assert.ok(closed.some((piece) => piece.kind === "lathe" && piece.material === "hull-grey" && piece.arc), "six armoured petals over the glass");
  const { ROOMS } = await import("../src/index.ts");
  assert.equal(Object.keys(ROOMS).length, 16);
  for (const spec of Object.values(ROOMS)) {
    assert.ok(spec.name.length > 4 && spec.job.length > 20, spec.id);
    const pieces = room(spec.id, "t");
    assert.ok(pieces.length >= 6, `${spec.id}: ${pieces.length}`);
    const { min, max } = boundsOf(meshOf(pieces));
    assert.ok(max[0] - min[0] <= spec.size[0] + 3 && max[2] - min[2] <= spec.size[1] + 3 && max[1] - min[1] <= spec.size[2] + 2, `${spec.id} fits its size`);
  }
  assert.ok(room("garden").some((piece) => piece.kind === "plate" && piece.material === "grow-lamp"), "a garden has grow-lamps");
  for (const id of ["dome-observation-m", "solarium-m"]) {
    assert.ok(KIT[id], id);
    const pieces = copies(KIT[id].pieces());
    assert.ok(pieces.some((piece) => piece.kind === "lathe" && piece.material === "glass-clear"), `${id} is glazed`);
    assert.ok(measured(pieces).length > 10);
  }
  assert.ok(copies(KIT["solarium-m"].pieces()).some((piece) => piece.kind === "lathe" && piece.material === "grow-lamp"), "the solarium has grow-lamps");
  assert.ok(copies(KIT["dome-observation-m"].pieces()).filter((piece) => piece.kind === "plate" && piece.material === "window").length >= 15, "armoured portholes round the lounge");
});

test("a port is a hardpoint, a shared slot is a set of variants, and each deck is a part", () => {
  const points = hardpointsOf(KIT["node-four"]);
  assert.equal(points.length, KIT["node-four"].ports.length);
  assert.ok(points.every((point) => point.accepts.includes("pod-survey-m") && point.accepts.includes("pod-medical-m") && !point.accepts.includes("shield-forward")));
  assert.deepEqual(swapsFor("pod-survey-m").map((module) => module.id), ["pod-medical-m"]);
  assert.deepEqual(swapsFor("pod-medical-m").map((module) => module.id), ["pod-survey-m"]);
  const decks = deckParts("scout", SAMPLE_SHIPS.scout);
  assert.ok(decks.length > 8, `${decks.length} decks`);
  assert.equal(new Set(decks.map((deck) => deck.record.id)).size, decks.length);
  assert.ok(decks.every((deck) => deck.record.height > 0 && deck.record.strapOn && deck.record.name.length > 2));
  assert.ok(decks.some((deck) => deck.pieces().length > 0), "a deck keeps the pieces that sit in its band");
});
