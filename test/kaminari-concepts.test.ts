// ISV 加美鳴 (かみなり) Kaminari, SPX-207: the three concept hulls. Their sizes, their thrusters, the size slider's scaled lengths, the numbers of their specification and how long they take to build.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { bellsOf, BUILD_BUDGET_MS, canScale, CONCEPT_IDS, MATERIALS, PART_ENTRIES, partEntry, ROCKETS, SCALE_PERCENT, scaleFactor, scalePercent, scalePieces, check, variantOf } from "../src/index.ts";
import { coarsen, detail } from "../src/model/detail.ts";
import { BERTHS, CONCEPT_SLOTS, EMIAKE_DEPLOYED, ROCKET_OF, SPECS, type ConceptKey } from "../src/model/fleet/kaminari-concepts/index.ts";
import { EXHAUST_C, LIGHT_MS } from "../src/model/fleet/kaminari-concepts/specs.ts";
import { C } from "../src/model/fleet/kaminari-concepts/c.ts";
import { expandInstances } from "../src/model/instances.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";
import { toGlb } from "../src/build/glb.ts";

const KEYS = ["a", "b", "c"] as const satisfies readonly ConceptKey[];
const NAMES: Record<ConceptKey, string> = {
  a: "ISV 加美鳴 Kaminari, SPX-207",
  b: "ISV 笑明 Emiake, SPX-109",
  c: "ISV 羅馬龍 Romaryū, SPX-118",
};
const JA: Record<ConceptKey, string> = { a: "加美鳴 かみなり", b: "笑明 えみあけ", c: "羅馬龍 ローマりゅう" };
const DESIGNATION: Record<ConceptKey, string> = { a: "SPX-207", b: "SPX-109", c: "SPX-118" };
const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const heightOf = (built: ReturnType<typeof build>) => {
  const { min, max } = built.boundsOf("together");
  return { length: max[1] - min[1], x: max[0] - min[0], z: max[2] - min[2], min, max };
};
const bellsIn = (pieces: readonly Piece[]) => pieces.filter((piece) => piece.kind === "lathe" && piece.material === "bell");

test("the three ships are three rockets, each a fit that goes together, named as the fleet is", () => {
  assert.deepEqual(CONCEPT_IDS, ["fleet-kaminari", "fleet-emiake", "fleet-romaryu"]);
  for (const key of KEYS) {
    const rocket = ROCKETS[ROCKET_OF[key]];
    assert.equal(rocket.defaultVariant, SPECS[key].id);
    assert.equal(rocket.maker, "fleet");
    assert.equal(rocket.madeBy.value, "SPX");
    assert.ok(!/fiction|Ship 0|SPXIS/i.test(rocket.name), rocket.name);
    for (const variant of rocket.variants) {
      assert.equal(variant.status, "fictional", "the hidden status stays, so no .glb is shipped");
      assert.ok(variant.name.startsWith(NAMES[key]), variant.name);
      assert.equal(variant.inspector?.spec.find(([row]) => row === "Name in Japanese")?.[1], JA[key]);
      assert.ok(!/fiction|Ship 0/i.test(`${variant.name} ${variant.note} ${JSON.stringify(variant.inspector?.spec)}`), variant.name);
      assert.equal(variant.facts.more.designation?.value, DESIGNATION[key]);
      assert.match(String(variant.inspector?.spec.find(([k]) => k === "Status")?.[1]), /Planned/);
      assert.equal(check({ rocket: ROCKET_OF[key], variant: variant.id }).ok, true);
    }
    for (const slot of rocket.variants[0].slots) assert.ok(partEntry(`${ROCKET_OF[key]}-${SPECS[key].id}-${slot}`), `${key} ${slot}`);
  }
  assert.equal(ROCKETS["fleet-emiake"].variants.map((v) => v.id).join(","), `fleet-emiake,${EMIAKE_DEPLOYED}`);
  // the first hull is kept, and is not the public ship
  assert.deepEqual(ROCKETS["fleet-02"].variants.map((v) => v.id), ["fleet-02", "fleet-02-survey", "fleet-02-tanker", "fleet-02-rescue"]);
  assert.ok(PART_ENTRIES.some((entry) => entry.record.id === "fleet-02-fleet-02-spine"));
  assert.match(ROCKETS["fleet-02-original"].name, /first design/);
  assert.equal(check({ rocket: "fleet-02-original", variant: "fleet-02" }).ok, true);
});

test("each concept is about 1.8 km long, thinner than the shipped 410 m, and its slots are the size they say", () => {
  const shipped = build({ rocket: "fleet-02", variant: "fleet-02" }).boundsOf("together");
  near(shipped.max[1] - shipped.min[1], 1820, 10, "the shipped ship");
  for (const key of KEYS) {
    const spec = SPECS[key];
    const built = build({ rocket: ROCKET_OF[key], variant: spec.id });
    const size = heightOf(built);
    assert.ok(size.length >= 1600 && size.length <= 1830, `${key}: ${size.length} m long`);
    near(size.length, spec.length, 40, `${key} length`);
    assert.ok(Math.max(size.x, size.z) < 410, `${key}: ${Math.max(size.x, size.z)} m across, the shipped ship is 410`);
    assert.ok(spec.beamHull < 410 && spec.beamOverall < 410);
    // a slot's declared size is its measured size, to a few metres
    built.parts.forEach((part, i) => {
      const slot = CONCEPT_SLOTS[key][i];
      assert.equal(part.slot, slot.slot);
      // a part's height is how far its top stands above its own origin (the base of the module, or the tail for the drive)
      near(part.bounds.max[1], slot.height, Math.max(8, slot.height * 0.04), `${key} ${slot.slot} height`);
      near(Math.max(part.bounds.max[0] - part.bounds.min[0], part.bounds.max[2] - part.bounds.min[2]), slot.diameter, Math.max(6, slot.diameter * 0.04), `${key} ${slot.slot} width`);
    });
  }
});

test("the drive is many thrusters and no scaled-up bell: the counts, each thruster's size, and the coil rings that shape its exhaust", () => {
  const counts: Record<ConceptKey, number> = { a: 19, b: 27, c: 29 };
  for (const key of KEYS) {
    const built = build({ rocket: ROCKET_OF[key], variant: SPECS[key].id });
    const engines = built.parts.filter((part) => part.record.kind === "engine");
    assert.ok(engines.length >= 1);
    const bells = engines.flatMap((part) => bellsOf(part.pieces));
    assert.equal(bells.length, counts[key], `${key}: thrusters`);
    assert.equal(SPECS[key].thrusters.count, counts[key]);
    // no bell bigger than the throat liner of a thruster: the nozzle is a flare of separate coil rings
    for (const bell of bells) assert.ok(bell.exit <= 3.2, `${key}: a bell ${bell.exit} m across at the mouth`);
    const rings = engines.flatMap((part) => part.pieces).filter((piece) => piece.kind === "lathe" && piece.material === "coil-lit");
    assert.equal(rings.length, counts[key] * 5, `${key}: five field-coil rings to a thruster`);
    // each thruster is no taller than a house of ten floors, and the drive's thrust is shared among them
    const rounded = Math.round(SPECS[key].thrustN / counts[key] / 1e6);
    assert.ok(rounded >= 10 && rounded <= 200, `${key}: ${rounded} MN each`);
  }
  // the shipped drive is eight big bells, which is what the concepts replace
  const bigBells = bellsIn(partEntry("fleet-02-fleet-02-drive-engines")!.pieces());
  assert.equal(bigBells.length, 8);
  assert.ok(Math.max(...bigBells.map((b) => Math.abs((b as unknown as { profile: number[][] }).profile[0][0]))) >= 20);
});

test("the size slider: its range, its steps, and the craft that take it", () => {
  assert.deepEqual([SCALE_PERCENT.min, SCALE_PERCENT.max, SCALE_PERCENT.step, SCALE_PERCENT.default], [60, 100, 5, 100]);
  assert.equal(scalePercent("73"), 75);
  assert.equal(scalePercent(10), 60);
  assert.equal(scalePercent(250), 100);
  assert.equal(scalePercent("nonsense"), 100);
  assert.equal(scalePercent(null), 100);
  assert.equal(scalePercent(""), 100);
  for (const key of KEYS) assert.equal(canScale(ROCKET_OF[key], SPECS[key].id), true);
  assert.equal(canScale("fleet-emiake", EMIAKE_DEPLOYED), true);
  assert.equal(canScale("fleet-02", "fleet-02"), false);
  assert.equal(canScale("saturn-v", "saturn-v"), false);
  assert.equal(scaleFactor("fleet-kaminari", "fleet-kaminari", 80), 0.8);
  assert.equal(scaleFactor("fleet-02", "fleet-02", 80), 1, "the shipped ship is not scaled");
});

test("scaled lengths are true: at 60, 80 and 100 per cent every length, width, part, place and label is that share of the full size", () => {
  for (const key of KEYS) {
    const id = SPECS[key].id;
    const full = build({ rocket: ROCKET_OF[key], variant: id }, { detail: "coarse" });
    const a = heightOf(full);
    for (const percent of [60, 75, 80, 100]) {
      const k = percent / 100;
      const scaled = build({ rocket: ROCKET_OF[key], variant: id }, { detail: "coarse", scale: percent });
      const b = heightOf(scaled);
      near(b.length, a.length * k, 0.6, `${key} ${percent}%: length ${b.length} of ${a.length}`);
      near(b.x, a.x * k, 0.6, `${key} ${percent}%: beam`);
      near(b.min[1], a.min[1] * k, 0.6, `${key} ${percent}%: the tail stays at the tail`);
      assert.equal(scaled.report.size?.height, Math.round((full.report.size?.height ?? 0) * k * 1000) / 1000);
      scaled.parts.forEach((part, i) => {
        const home = full.parts[i];
        near(part.record.height, home.record.height * k, 0.01, `${key} ${percent}% ${part.slot} height`);
        near(part.record.strapOn?.y ?? 0, (home.record.strapOn?.y ?? 0) * k, 0.01, `${key} ${percent}% ${part.slot} place`);
        near(part.bounds.max[1] - part.bounds.min[1], (home.bounds.max[1] - home.bounds.min[1]) * k, 0.05, `${key} ${percent}% ${part.slot} measured`);
      });
      const inspector = scaled.report.variant?.inspector;
      const home = full.report.variant?.inspector;
      near(inspector!.sections[3].at[1], home!.sections[3].at[1] * k, 0.001, "a label's place");
    }
  }
  // the same ship at 100 is the very same pieces; any craft that is not a concept ignores the size
  const saturn = build({ rocket: "saturn-v" }, { detail: "coarse" }).boundsOf("together");
  assert.deepEqual(build({ rocket: "saturn-v" }, { detail: "coarse", scale: 60 }).boundsOf("together"), saturn);
  assert.equal(scalePieces([], 0.5).length, 0);
});

test("scaled pieces keep their shapes: a lathe, a plate and a line scale in every number that is a length and no number that is an angle", () => {
  const pieces: Piece[] = [
    { kind: "lathe", material: "hull-white", segs: 12, at: [3, 4], lean: [0.1, 0.2], profile: [[2, 0], [2, 10]], rings: [5], welds: [2], arc: (y) => [y * 0.1, y * 0.2] },
    { kind: "plate", material: "hull-grey", frame: { o: [1, 2, 3], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-1, -2], [1, -2], [1, 2]], thickness: 0.5, ribs: [[[0, 0], [1, 1]]], quilt: { nu: 2, nv: 2, bulge: 0.2 }, inset: { margin: 0.3, depth: 0.1 } },
    { kind: "lines", weight: "feature", paths: [[[1, 2, 3], [4, 5, 6]]] },
  ];
  const [lathe, plate, lines] = scalePieces(pieces, 0.5);
  assert.ok(lathe.kind === "lathe" && plate.kind === "plate" && lines.kind === "lines");
  assert.deepEqual(lathe.profile, [[1, 0], [1, 5]]);
  assert.deepEqual(lathe.at, [1.5, 2]);
  assert.deepEqual(lathe.lean, [0.1, 0.2], "a lean is a slope: it does not scale");
  assert.deepEqual(lathe.rings, [2.5]);
  assert.deepEqual(lathe.arc?.(5), [1, 2], "an arc is turned at the height it had at full size");
  assert.deepEqual(plate.frame.o, [0.5, 1, 1.5]);
  assert.deepEqual(plate.frame.u, [1, 0, 0]);
  assert.deepEqual(plate.outline, [[-0.5, -1], [0.5, -1], [0.5, 1]]);
  assert.equal(plate.thickness, 0.25);
  assert.deepEqual(plate.quilt, { nu: 2, nv: 2, bulge: 0.1 });
  assert.deepEqual(plate.inset, { margin: 0.15, depth: 0.05 });
  assert.deepEqual(lines.paths, [[[0.5, 1, 1.5], [2, 2.5, 3]]]);
});

test("concept C docks two of ISV Miyamoto and two of ISV Ariake, each the package's own model, and they scale with the carrier", () => {
  const built = build({ rocket: "fleet-romaryu", variant: "fleet-romaryu" }, { detail: "full" });
  const craft = built.parts.filter((part) => part.slot.startsWith("miyamoto-"));
  assert.equal(craft.length, 4);
  const ownOf = {
    miyamoto: build({ rocket: "fleet-ship-03", variant: "miyamoto-array" }).boundsOf("together"),
    ariake: build({ rocket: "fleet-ship-ariake", variant: "ariake" }).boundsOf("together"),
  };
  for (const [i, part] of craft.entries()) {
    const own = ownOf[C.craft.slots[i].ship];
    near(part.bounds.max[1] - part.bounds.min[1], own.max[1] - own.min[1], 0.5, `${part.slot} length`);
  }
  assert.equal(craft.filter((_, i) => C.craft.slots[i].ship === "miyamoto").length, 2);
  assert.equal(craft.filter((_, i) => C.craft.slots[i].ship === "ariake").length, 2);
  // no two craft touch: the envelopes of the four, in the frame of the whole ship, are apart
  const boxes = craft.map((part) => {
    const at = built.placesOf("together").find((place) => place.slot === part.slot)!.at;
    return { min: part.bounds.min.map((v, i) => v + at[i]), max: part.bounds.max.map((v, i) => v + at[i]) };
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const overlap = [0, 1, 2].every((c) => boxes[i].min[c] < boxes[j].max[c] - 0.01 && boxes[j].min[c] < boxes[i].max[c] - 0.01);
    assert.equal(overlap, false, `craft ${i + 1} and ${j + 1} overlap`);
  }
  // each stands with its keel the same way from the shaft, at 0, 180, 90 and 270 degrees
  const keels = craft.map((part, i) => {
    const slot = C.craft.slots[i];
    const turn = (slot.az * Math.PI) / 180;
    return { turn, reach: Math.hypot(part.bounds.max[0], part.bounds.max[2], part.bounds.min[0], part.bounds.min[2]) };
  });
  assert.deepEqual(keels.map((k) => Math.round((k.turn * 180) / Math.PI)), [0, 180, 90, 270]);
  const small = build({ rocket: "fleet-romaryu", variant: "fleet-romaryu" }, { detail: "coarse", scale: 60 });
  for (const [i, part] of small.parts.filter((p) => p.slot.startsWith("miyamoto-")).entries()) near(part.bounds.max[1] - part.bounds.min[1], (ownOf[C.craft.slots[i].ship].max[1] - ownOf[C.craft.slots[i].ship].min[1]) * 0.6, 1, `${part.slot} at 60 per cent`);
});

test("each concept's numbers add up: the drive rule, the masses, the acceleration and the delta-v", () => {
  for (const key of KEYS) {
    const s = SPECS[key];
    const jet = s.reactorCells * 6e15 * 0.5;
    near(s.thrustN, (2 * jet) / (EXHAUST_C * LIGHT_MS), 1, `${key} thrust`);
    near(s.fullT, s.dryT + s.propellantT + s.cargoT + ((640 + 60_000) * 100) / 1000, 1, `${key} full mass`);
    near(s.accelG, s.thrustN / (s.fullT * 1000 * 9.80665), 1e-9, `${key} acceleration`);
    near(s.deltaVC, 0.4 * Math.log(s.fullT / (s.fullT - s.propellantT)), 1e-9, `${key} delta-v`);
    assert.ok(s.accelG > 0.01 && s.accelG < 0.2, `${key}: ${s.accelG} g`);
    assert.ok(s.proximaShipYears > 10 && s.proximaShipYears < 60, `${key}: ${s.proximaShipYears} years`);
    assert.ok(s.fullT > 8e5 && s.fullT < 3e6);
  }
  // the carrier's four craft are its cargo: 21,000 t inert each, in its dry mass
  assert.ok(SPECS.c.dryT > 4 * 21_000 && SPECS.c.containers === 0);
  assert.equal(SPECS.a.tanks, 48);
  assert.equal(SPECS.a.containers, 64);
});

test("every concept builds inside the budget: the first picture in a second, the full detail in three, on this computer", () => {
  for (const key of KEYS) {
    const once = (level: "coarse" | "full") => {
      const before = detail.level;
      detail.level = level;
      try {
        const start = performance.now();
        const parts = CONCEPT_SLOTS[key].map((slot) => {
          const pieces = level === "coarse" ? coarsen(slot.pieces()) : slot.pieces();
          return { name: slot.slot, mesh: meshOf(pieces), at: slot.at, count: pieces.length };
        });
        const glb = toGlb(parts);
        return { ms: performance.now() - start, pieces: parts.reduce((n, p) => n + p.count, 0), triangles: glb.triangles };
      } finally {
        detail.level = before;
      }
    };
    once("full");
    const best = (level: "coarse" | "full") => [0, 1, 2].map(() => once(level)).sort((a, b) => a.ms - b.ms)[0];
    const coarse = best("coarse");
    const full = best("full");
    console.log(`build ${key}, coarse ${coarse.ms.toFixed(0)} ms (${coarse.pieces} pieces), full ${full.ms.toFixed(0)} ms (${full.pieces} pieces, ${(full.triangles / 1e6).toFixed(1)} M triangles)`);
    assert.ok(coarse.ms < BUILD_BUDGET_MS.coarse, `${key}: the coarse build took ${coarse.ms.toFixed(0)} ms`);
    assert.ok(full.ms < BUILD_BUDGET_MS.fine, `${key}: the full build took ${full.ms.toFixed(0)} ms`);
    assert.ok(coarse.pieces < full.pieces * 0.25, `${key}: the coarse level is a small share`);
  }
});

test("each ship records the ports a craft can use", () => {
  for (const key of KEYS) {
    const ports = BERTHS[key];
    assert.equal(ports.filter((port) => port.accepts === "stack" && port.craft.includes("starship") && port.collar === "L").length, 1);
    assert.equal(ports.filter((port) => port.accepts === "tanker").length, 2);
    assert.equal(ports.filter((port) => port.accepts === "crew" && port.craft.includes("dragon") && port.collar === "M").length, 1);
    for (const port of ports) {
      assert.ok(port.at.every((n) => Number.isFinite(n)), port.name);
      const length = Math.hypot(port.direction[0], port.direction[1], port.direction[2]);
      assert.ok(Math.abs(length - 1) < 1e-6, port.name);
      assert.match(variantOf(ROCKET_OF[key])?.inspector?.notes.docking.join(" ") ?? "", new RegExp(port.name));
    }
  }
});

test("every module is real: it has pieces, builds the same twice, stays inside its own bounds, and uses the fleet's materials only", () => {
  for (const key of KEYS) {
    for (const slot of CONCEPT_SLOTS[key]) {
      const a = expandInstances(slot.pieces());
      assert.ok(a.length >= 8, `${key} ${slot.slot}: ${a.length} pieces`);
      assert.equal(a.length, expandInstances(slot.pieces()).length, `${key} ${slot.slot}: the same twice`);
      const box = boundsOf(meshOf(a));
      assert.ok(Number.isFinite(box.min[0] + box.max[2]), `${key} ${slot.slot}: a finite mesh`);
      for (const piece of a) if (piece.kind !== "lines") assert.ok(piece.material in MATERIALS, `${key} ${slot.slot}: ${piece.material}`);
      assert.ok(/Descends from|ISV Miyamoto's own/.test(slot.note) || slot.slot === "bow" || slot.slot === "bridge", `${key} ${slot.slot}: names its real ancestor`);
    }
  }
});
