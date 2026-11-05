// The fleet's hull markings: lettering made from open-licence outlines, laid on a wall or wrapped on a hull in metres, in the three looks; the licence of the face that ships with it; the public words; and the budget.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { BUILD_BUDGET_MS, FLEET_MARKS, KIT, MATERIALS, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { clearGlyphCache, glyphCacheSize, hazardMarking, dockingMarking, layoutOf, marking, markingWidth } from "../src/model/fleet/marking.ts";
import { CONCEPT_FACES, conceptHull, conceptStyle, demoHull, heightFor, lockup, markedHauler, miyamotoHull, nameplate } from "../src/model/fleet/markingSets.ts";
import { areaOf, contains, coverage, simplified, triangulate } from "../src/model/fleet/triangulate.ts";
import { GOLDMAN, KANJI, LATIN, ORBITRON, TYPEFACE_CREDITS } from "../src/model/fleet/typeface.ts";
import { boundsOf, meshOf, pointOf, type Piece, type Plate, type Vec3 } from "../src/model/pieces.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const flat = (height: number, extra: object = {}) => ({ at: [0, 0, 0] as Vec3, right: [1, 0, 0] as Vec3, up: [0, 1, 0] as Vec3, height, ...extra });
const vertices = (pieces: readonly Piece[]): Vec3[] => {
  const out: Vec3[] = [];
  const mesh = meshOf(pieces);
  for (const faces of mesh.faces.values()) for (let i = 0; i < faces.positions.length; i += 3) out.push([faces.positions[i], faces.positions[i + 1], faces.positions[i + 2]]);
  return out;
};
const triangles = (pieces: readonly Piece[]) => [...meshOf(pieces).faces.values()].reduce((sum, faces) => sum + faces.indices.length / 3, 0);

test("the face: every public word is drawn, and each glyph's triangles cover exactly its outline", () => {
  const words = Object.values(FLEET_MARKS.ships).flatMap((ship) => [ship.prefix, ship.name, ship.registry ?? "SPX-???", ship.classLine?.latin ?? ""]).concat(["SPX", "NO STEP", "HANGAR 2", "DECK 07", "P1", "EVA 2", "C-01"]);
  for (const word of words) for (const ch of word) assert.ok(LATIN[ch], `${ch} in ${word}`);
  for (const ship of Object.values(FLEET_MARKS.ships)) for (const ch of ship.kanji + (ship.classLine?.kanji ?? "")) assert.ok(KANJI[ch], ch);
  for (const [name, face] of [["latin", LATIN], ["kanji", KANJI]] as const)
    for (const [ch, [advance, contours]] of Object.entries(face)) {
      assert.ok(advance > 0, `${name} ${ch}`);
      if (!contours.length) continue;
      const biggest = contours.reduce((a, b) => (Math.abs(areaOf(a)) >= Math.abs(areaOf(b)) ? a : b));
      const sign = Math.sign(areaOf(biggest));
      const outers = contours.filter((c) => Math.sign(areaOf(c)) === sign);
      const holes = contours.filter((c) => Math.sign(areaOf(c)) !== sign);
      let want = outers.reduce((sum, c) => sum + Math.abs(areaOf(c)), 0);
      for (const hole of holes) want -= Math.abs(areaOf(hole));
      let got = 0;
      for (const outer of outers) {
        const own = holes.filter((hole) => contains(outer, hole[0], hole[1]));
        got += coverage(triangulate(outer, own));
      }
      // a kanji's strokes overlap, so its outlines count some ink twice
      assert.ok(Math.abs(got - want) <= want * (name === "kanji" ? 0.2 : 0.02) + 1e-6, `${name} ${ch}: ${got} against ${want}`);
    }
});

test("triangulation handles a square with a hole, and a line is thinned to fewer points", () => {
  const square = [0, 0, 4, 0, 4, 4, 0, 4];
  const hole = [1, 1, 1, 3, 3, 3, 3, 1];
  assert.ok(Math.abs(coverage(triangulate(square, [hole])) - 12) < 1e-9);
  const circle = Array.from({ length: 200 }, (_, i) => [Math.cos((i * Math.PI) / 100), Math.sin((i * Math.PI) / 100)]).flat();
  const thin = simplified(circle, 0.01);
  assert.ok(thin.length < circle.length / 3 && thin.length >= 12);
});

test("layout is in metres: the width grows with the height, and a text is as wide as it says", () => {
  assert.ok(Math.abs(markingWidth("SPX-207", 2) - 2 * markingWidth("SPX-207", 1)) < 1e-9);
  assert.ok(markingWidth("ISV KAMINARI", 1) > markingWidth("SPX", 1));
  assert.equal(markingWidth("", 1), 0);
  const { x, width } = layoutOf("AB", 0.14);
  assert.equal(x[0], 0);
  assert.ok(Math.abs(x[1] + LATIN.B[0] - width) < 1e-9);
  for (const align of ["start", "middle", "end"] as const) {
    const pieces = marking("SPX-207", flat(1.2, { align }), { lines: false });
    const { min, max } = boundsOf(meshOf(pieces));
    const width2 = markingWidth("SPX-207", 1.2);
    const start = align === "start" ? 0 : align === "middle" ? -width2 / 2 : -width2;
    // the ink lies inside the advance, a letter's side bearing in from each end
    assert.ok(min[0] >= start - 0.001 && max[0] <= start + width2 + 0.2, `${align}: ${min[0]} to ${max[0]}`);
    assert.ok(max[0] - min[0] > width2 * 0.85, `${align}: wide enough`);
    // the capitals stand 1.2 m tall, a few centimetres of overshoot on the round ones
    assert.ok(max[1] - min[1] > 1.18 && max[1] - min[1] < 1.3, `${align}: ${max[1] - min[1]}`);
    assert.ok(Math.abs((max[1] + min[1]) / 2) < 0.05, "centred on the anchor");
  }
});

test("a flat wall: the text lies on it, reads along `right`, and stands a hair off it", () => {
  const wall = { at: [10, 5, 0] as Vec3, right: [0, 0, -1] as Vec3, up: [0, 1, 0] as Vec3, height: 0.6 };
  const pieces = marking("NO STEP", wall, { lines: false });
  const points = vertices(pieces);
  // the wall faces +X: right x up = +X
  for (const [x, y, z] of points) {
    assert.ok(x > 10 && x < 10.03, `off the wall: ${x}`);
    assert.ok(y > 4.6 && y < 5.4);
    assert.ok(z <= 0.001);
  }
  const first = vertices(marking("N", wall, { lines: false }));
  const last = vertices(marking("P", { ...wall, at: [10, 5, 0] }, { lines: false }));
  assert.ok(first.length > 0 && last.length > 0);
});

test("a hull: the text follows the curve, in metres, and never sinks into the hull", () => {
  const R = 6.7;
  const place = { radius: R, y: 14, az: 0, height: 1.2, align: "middle" as const };
  const pieces = marking("SPX-207", place, { lines: false });
  const points = vertices(pieces);
  let low = Infinity;
  let high = -Infinity;
  for (const [x, y, z] of points) {
    const r = Math.hypot(x, z);
    low = Math.min(low, r);
    high = Math.max(high, r);
    assert.ok(y > 14 - 0.65 && y < 14 + 0.65);
  }
  // paint stands just off the true surface: no point inside it, none more than a few centimetres out
  assert.ok(low >= R - 1e-6, `inside the hull: ${low}`);
  assert.ok(high <= R + 0.08, `floating: ${high}`);
  // it reads left to right as seen from outside: from -X to +X at the +Z side
  const xs = points.map(([x]) => x);
  assert.ok(Math.min(...xs) < -4 && Math.max(...xs) > 4);
  // the width round the hull, as arc length, is the text's width in metres
  const arc = (Math.asin(Math.max(...xs) / R) - Math.asin(Math.min(...xs) / R)) * R;
  assert.ok(Math.abs(arc - markingWidth("SPX-207", 1.2)) < 1, `${arc} against ${markingWidth("SPX-207", 1.2)}`);
  // the letters stay the same size when the hull is bigger: a flat sheet would not
  const big = vertices(marking("SPX-207", { ...place, radius: 40 }, { lines: false }));
  assert.ok(Math.max(...big.map(([x]) => x)) - Math.min(...big.map(([x]) => x)) > 10);
});

test("a hull, read up its length: the spine is the way the text runs, and a cone's radius is followed", () => {
  const up = vertices(marking("ISV KAMINARI", { radius: 6, y: 20, az: Math.PI / 2, height: 1, run: "up", align: "middle" }, { lines: false }));
  const ys = up.map(([, y]) => y);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - markingWidth("ISV KAMINARI", 1)) < 1.2);
  const across = up.map(([x, , z]) => Math.atan2(x, z));
  assert.ok(Math.max(...across) - Math.min(...across) < 1.4 / 6, "a capital high, round the hull");
  const down = vertices(marking("ISV", { radius: 6, y: 20, az: Math.PI / 2, height: 1, run: "down" }, { lines: false }));
  assert.ok(Math.max(...down.map(([, y]) => y)) <= 20.6);
  const cone = (y: number) => 8 - y * 0.1;
  for (const [x, y, z] of vertices(marking("SPX", { radius: cone, y: 20, az: 0.3, height: 1, align: "middle" }, { lines: false }))) assert.ok(Math.hypot(x, z) >= cone(y) - 0.01 && Math.hypot(x, z) < cone(y) + 0.1, `${y}`);
});

test("a marking is geometry for all three looks: filled shapes for the painted look, an outline of lines for the line and thick looks", () => {
  const pieces = marking("SPX-207", flat(1), {});
  assert.ok(pieces.some((piece) => piece.kind === "plate"));
  assert.ok(pieces.every((piece) => piece.only === "mesh"));
  const lines = pieces.filter((piece) => piece.kind === "lines");
  assert.equal(lines.length, 1);
  assert.ok(lines[0].kind === "lines" && lines[0].weight === "feature" && lines[0].paths.length >= 9);
  const mesh = meshOf(pieces);
  assert.ok(mesh.feature.positions.length > 600);
  assert.equal(meshOf(marking("SPX-207", flat(1), { lines: false })).feature.positions.length, 0);
  for (const piece of pieces) if (piece.kind === "plate") assert.ok(piece.material in MATERIALS && piece.sheet === true && piece.outline.length <= 8);
  // every outline closes on itself and runs at the paint's own height
  for (const path of lines[0].kind === "lines" ? lines[0].paths : []) assert.ok(Math.hypot(...(path[0].map((v, i) => v - path[path.length - 1][i]) as Vec3)) < 1e-9);
});

test("the extras: a frame, a plate under the text, floodlights, kanji, a hazard box and a docking marker", () => {
  const plain = triangles(marking("DECK 07", { radius: 6, y: 5, az: 0, height: 0.6 }));
  const framed = marking("DECK 07", { radius: 6, y: 5, az: 0, height: 0.6 }, { frame: true });
  assert.ok(triangles(framed) > plain);
  const field = marking("DECK 07", { radius: 6, y: 5, az: 0, height: 0.6 }, { field: { material: "hull-white", raise: 0.5 } });
  const r = Math.max(...vertices(field).map(([x, , z]) => Math.hypot(x, z)));
  assert.ok(r > 6.5 && r < 6.6, `the paint stands on the plate: ${r}`);
  const lit = marking("SPX", { radius: 6, y: 5, az: 0, height: 1 }, { field: "hull-white", flood: true });
  assert.ok(lit.some((piece) => piece.kind === "plate" && ((piece.material as string) === "lamp-blue" || (piece.material as string) === "flood")), "a lamp that glows when lit");
  assert.ok(vertices(marking("加美鳴", flat(1), { lines: false })).length > 100);
  assert.ok(hazardMarking(flat(0.5), 4).some((piece) => piece.kind === "plate" && piece.material === "hazard"));
  assert.ok(dockingMarking("P4", { radius: 7, y: 5, az: 0, height: 2 }).length > 20);
  // two plates of the same text are the same bytes
  const bytes = (p: Piece[]) => toGlb([{ name: "m", mesh: meshOf(p), at: [0, 0, 0] }]).bytes;
  assert.deepEqual(bytes(marking("ISV KAMINARI", flat(1))), bytes(marking("ISV KAMINARI", flat(1))));
});

test("bolder Michroma: a heavier weight and an outline ring add paint round every letter, a solid fill has no inline, and the name takes its ratio of the registry", () => {
  const plain = marking("SPX-207", flat(1), { lines: false, weight: 0.016 });
  const bold = marking("SPX-207", flat(1), { lines: false, weight: 0.08 });
  const area = (pieces: Piece[]) => pieces.reduce((sum, piece) => (piece.kind === "plate" ? sum + Math.abs(areaOf(piece.outline.flat())) : sum), 0);
  assert.ok(area(bold) > area(plain) * 1.25, `${area(bold)} against ${area(plain)}`);
  const ringed = marking("SPX-207", flat(1), { lines: false, weight: 0.05, outline: { material: "hull-grey", width: 0.03 } });
  assert.ok(ringed.some((piece) => piece.kind === "plate" && piece.material === "hull-grey"));
  assert.ok(!marking("SPX-207", flat(1), { lines: false, weight: 0.05 }).some((piece) => piece.kind === "plate" && piece.material !== "black"));
  const height = (pieces: Piece[]) => {
    const { min, max } = boundsOf(meshOf(pieces));
    return max[1] - min[1];
  };
  const wide = lockup("SPX-207", "ISV KAMINARI", flat(1, { align: "middle" }), { lines: false }, undefined, 0.5);
  const slim = lockup("SPX-207", "ISV KAMINARI", flat(1, { align: "middle" }), { lines: false }, undefined, 0.3);
  assert.ok(height(wide) > height(slim));
});

test("glyphs are cut once and shared: many markings share a small cache, and clearing it changes nothing", () => {
  clearGlyphCache();
  const before = marking("ISV KAMINARI", flat(1.2));
  const size = glyphCacheSize();
  for (let i = 0; i < 20; i++) marking("ISV KAMINARI", flat(1.2, { at: [0, i, 0] }));
  assert.equal(glyphCacheSize(), size);
  assert.ok(size <= 12);
  clearGlyphCache();
  assert.deepEqual(marking("ISV KAMINARI", flat(1.2)), before);
});

test("the face's licence ships with it, and the credits are in NOTICE.md", () => {
  for (const file of ["LICENSES/OFL-Michroma.txt", "LICENSES/OFL-MPLUS1p.txt", "LICENSES/OFL-Oxanium.txt", "LICENSES/OFL-Goldman.txt", "fonts/OFL-Michroma.txt"]) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
    assert.match(read(file), /SIL OPEN FONT LICENSE Version 1\.1/);
  }
  assert.match(read("LICENSES/OFL-Michroma.txt"), /Copyright 2011 The Michroma Project Authors/);
  assert.match(read("LICENSES/OFL-MPLUS1p.txt"), /Copyright 2016 The M\+ Project Authors/);
  assert.match(read("LICENSES/OFL-Orbitron.txt"), /Copyright \(c\) 2009, Matt McInerney/);
  assert.match(read("LICENSES/OFL-Orbitron.txt"), /SIL OPEN FONT LICENSE Version 1\.1|Open Font License/i);
  assert.ok(existsSync(new URL("../fonts/Michroma-Regular.ttf", import.meta.url)));
  // these licences reserve no font name (Orbitron's does, and NOTICE.md says how it is kept)
  for (const file of ["LICENSES/OFL-Michroma.txt", "LICENSES/OFL-MPLUS1p.txt", "LICENSES/OFL-Oxanium.txt", "LICENSES/OFL-Goldman.txt"]) assert.doesNotMatch(read(file).split("PREAMBLE")[0], /Reserved Font Name/i);
  const notice = read("NOTICE.md");
  assert.match(notice, /Michroma/);
  assert.match(notice, /M PLUS 1p/);
  assert.match(notice, /SIL Open Font License/);
  assert.equal(TYPEFACE_CREDITS.length, 5);
  for (const credit of TYPEFACE_CREDITS) assert.ok(read("NOTICE.md").includes(credit.split(",")[0]));
  assert.ok((JSON.parse(read("package.json")) as { files: string[] }).files.includes("LICENSES"));
  assert.match(read("src/model/fleet/typeface.ts"), /LICENSES\/OFL-Michroma\.txt/);
});

test("only public words are painted: the ships' names, registries, class and operator, never the word fictional", () => {
  assert.deepEqual(
    Object.values(FLEET_MARKS.ships).map((ship) => [ship.prefix, ship.name, ship.kanji, ship.registry]),
    [
      ["ISV", "KAMINARI", "加美鳴", "SPX-207"],
      ["ISV", "MIYAMOTO", "宮本", "SPX-452"],
      ["ISV", "ARIAKE", "有明", "SPX-186"],
      ["ISV", "HANABUSA", "花房", null],
    ],
  );
  assert.equal(FLEET_MARKS.operator, "SPX");
  assert.equal(FLEET_MARKS.ships.miyamoto.classLine?.latin, "ROMURUSU CLASS");
  assert.equal(FLEET_MARKS.ships.ariake.classLine?.kanji, "ロムルス級");
  const source = [read("src/model/fleet/markingSets.ts"), read("src/model/fleet/marking.ts"), read("src/data/fleetMarkings.ts")].join("\n");
  const words = JSON.stringify(Object.values(FLEET_MARKS.ships)) + [...source.matchAll(/marking\("([^"]+)"/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(words.toLowerCase(), /fictional/);
  // Hanabusa has no number yet: its hull shows a placeholder, not a number made up
  const none = vertices(nameplate(FLEET_MARKS.ships.hanabusa, { radius: 5, y: 10, az: 0, height: 0.8 })).length;
  assert.ok(none > 0);
});

test("the helper is shown on the kit's own hull: a concept for each face, and the sample hauler and the ships' hulls build as parts of their own", () => {
  for (const id of Object.keys(CONCEPT_FACES)) {
    const [hull, lettering] = conceptHull(id);
    assert.ok(hull.pieces().length > 50 && lettering.pieces().length > 150, id);
    for (const entry of [hull, lettering]) assert.ok(PART_ENTRIES.some(({ record }) => record.id === entry.record.id), entry.record.id);
    assert.ok(ROCKETS["fleet-markings"].variants.some((variant) => variant.id === `concept-${id}`));
  }
  const hauler = markedHauler();
  assert.ok(hauler.slots.includes("markings"));
  // the modules themselves are untouched: the same pieces as the sample's
  const sample = hauler.entries.find(({ record }) => record.id.endsWith("tank-cryo-24-2"));
  assert.equal(sample?.pieces().length, KIT["tank-cryo-24"].pieces({ detail: 0.25, seed: "1" }).length);
  const marks = hauler.entries.find(({ record }) => record.id.endsWith("-markings"));
  assert.ok(marks && marks.record.strapOn && marks.pieces().length > 500);
  for (const id of Object.keys(FLEET_MARKS.ships)) assert.ok(demoHull(id)[1].pieces().length > 500, id);
  for (const id of Object.keys(CONCEPT_FACES)) {
    const [hull, lettering] = miyamotoHull(id);
    assert.ok(hull.pieces().length > 50 && lettering.pieces().length > 80, id);
    assert.ok(ROCKETS["fleet-markings"].variants.some((variant) => variant.id === `miyamoto-${id}`));
  }
});

test("each concept face keeps the S open and the 8 as two counters, and the concepts add no stroke", () => {
  const holes = (glyph: readonly [number, readonly (readonly number[])[]]): number => {
    const contours = glyph[1];
    const biggest = contours.reduce((a, b) => (Math.abs(areaOf(a)) >= Math.abs(areaOf(b)) ? a : b));
    const sign = Math.sign(areaOf(biggest));
    return contours.filter((contour) => Math.sign(areaOf(contour)) !== sign).length;
  };
  for (const [name, face] of [["michroma", LATIN], ["orbitron", ORBITRON], ["goldman", GOLDMAN]] as const) {
    assert.equal(holes(face.S), 0, `${name} S`);
    assert.equal(holes(face["8"]), 2, `${name} 8`);
  }
  assert.deepEqual(Object.keys(CONCEPT_FACES), ["goldman"]);
  assert.equal(conceptStyle("goldman").weight, 0);
  assert.equal(conceptStyle("goldman").lines, false);
  // the registry runs along the real tank, and the whole of it stays on the near face
  const along = vertices(conceptHull("goldman")[1].pieces()).map(([, y]) => y);
  assert.ok(Math.max(...along) - Math.min(...along) > 40);
});

test("the lamps stay a letter clear of the letters, and the letters face out off the field", () => {
  const boxOf = (piece: Plate) => {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    const half = piece.thickness / 2;
    for (const [a, b] of piece.outline) for (const c of [-half, half]) {
      const p = pointOf(piece.frame, a, b, c);
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
    return { min, max };
  };
  const gapBetween = (a: { min: Vec3; max: Vec3 }, b: { min: Vec3; max: Vec3 }) => Math.hypot(...([0, 1, 2] as const).map((k) => Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k])));
  const style = conceptStyle("goldman");
  const hulls = [
    ["kaminari", conceptHull("goldman")[1].pieces(), heightFor("SPX-207", 70, 10, style)],
    ["miyamoto", miyamotoHull("goldman")[1].pieces(), heightFor("SPX-452", 36, 6, style)],
  ] as const;
  for (const [name, pieces, height] of hulls) {
    const plates = pieces.filter((piece): piece is Plate => piece.kind === "plate");
    const letters = plates.filter((piece) => piece.material === "black");
    const lamps = plates.filter((piece) => piece.material === "hull-grey-dark" || piece.material === "flood");
    const fieldR = Math.max(...pieces.filter((piece) => piece.kind === "lathe" && piece.material === "hull-white").flatMap((piece) => (piece.kind === "lathe" ? piece.profile.map(([r]) => r) : [])));
    const need = markingWidth("M", height * 0.36, style);
    const letterBoxes = letters.map(boxOf);
    assert.ok(lamps.length >= 2 && letters.length > 20, name);
    for (const lamp of lamps) {
      const box = boxOf(lamp);
      const nearest = letterBoxes.reduce((best, letter) => Math.min(best, gapBetween(box, letter)), Infinity);
      assert.ok(nearest >= need, `${name} lamp is ${nearest.toFixed(2)} m from a letter, and a letter is ${need.toFixed(2)} m wide`);
    }
    for (const letter of letters) {
      const [x, , z] = letter.frame.o;
      const radial = Math.hypot(x, z);
      const dot = (letter.frame.w[0] * x + letter.frame.w[2] * z) / radial;
      assert.ok(dot > 0.5, `${name} letter faces out`);
      assert.ok(radial > fieldR + 0.03, `${name} letter is ${(radial - fieldR).toFixed(3)} m off the field`);
    }
  }
});

test("a part with markings stays a mesh a phone can load, and the build stays inside the budget", () => {
  for (const id of Object.keys(CONCEPT_FACES))
    for (const entry of conceptHull(id)) {
      const bytes = toGlb([{ name: entry.record.id, mesh: meshOf(entry.pieces()), at: [0, 0, 0] }]).bytes.byteLength;
      assert.ok(bytes < 1024 * 1024, `${entry.record.id}: ${bytes}`);
    }
  for (const entry of markedHauler().entries.filter(({ record }) => record.id.endsWith("-markings"))) assert.ok(toGlb([{ name: "m", mesh: meshOf(entry.pieces()), at: [0, 0, 0] }]).bytes.byteLength < 1024 * 1024);
  // the lettering is fine detail, so the first picture never waits for it, and the whole of it costs well under the full-detail budget
  const times = Array.from({ length: 3 }, () => {
    const start = performance.now();
    clearGlyphCache();
    let n = 0;
    for (const id of Object.keys(FLEET_MARKS.ships)) n += meshOf(demoHull(id)[1].pieces()).faces.size;
    for (const id of Object.keys(CONCEPT_FACES)) n += meshOf(conceptHull(id)[1].pieces()).faces.size;
    for (const entry of markedHauler().entries) if (entry.record.id.endsWith("-markings")) n += meshOf(entry.pieces()).faces.size;
    assert.ok(n > 0);
    return performance.now() - start;
  });
  const best = Math.min(...times);
  console.log(`markings of the hauler, the four ships and the concepts: ${best.toFixed(0)} ms`);
  assert.ok(best < BUILD_BUDGET_MS.fine / 3, `${best} ms`);
  const start = performance.now();
  for (let i = 0; i < 20; i++) marking("ISV KAMINARI", { radius: 6, y: i, az: 0, height: 1.2 }, { field: "hull-white", flood: true });
  assert.ok(performance.now() - start < 500);
});
