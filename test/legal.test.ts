// No logo, no mark, no brand printing on any mesh or drawing; nothing from the sources this package may not use; the credit stays; nothing private and no word on who did the work.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { LOOK_NAMES, MATERIALS, MODEL_CREDITS, type ModelCredit, PART_ENTRIES, ROCKETS, VIEW_NAMES } from "../src/index.ts";
import { build, buildPart } from "../src/build/index.ts";

const BRANDS = /spacex|nasa\b|logo|wordmark|boring company|tesla|musk/i;
const walk = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const glbJson = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)));
};

test("no brand word is in any code-made mesh's data or any drawing, in any look", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const built = build({ rocket: rocket.id, variant: variant.id });
      const json = glbJson(built.glb().bytes);
      assert.ok(!BRANDS.test(json), `${variant.id}.glb: ${BRANDS.exec(json)?.[0]}`);
      for (const look of LOOK_NAMES)
        for (const view of VIEW_NAMES) {
          const svg = built.svg({ look, view });
          assert.ok(!BRANDS.test(svg), `${variant.id} ${look}: ${BRANDS.exec(svg)?.[0]}`);
          assert.ok(!svg.includes("<text"), `${variant.id} ${look} carries words of its own`);
          assert.ok(!svg.includes("<image"), `${variant.id} ${look} carries a picture`);
        }
    }
  for (const { record } of PART_ENTRIES) if (!record.trueTo.length) assert.ok(!BRANDS.test(buildPart(record.id).svg()), record.id);
});

test("no material is named for a product or a mark", () => {
  for (const name of Object.keys(MATERIALS)) assert.ok(!BRANDS.test(name), name);
});

/** NASA's models that had no mark to remove: looked at, from every side. The station's parts, `iss-*.glb`, are one of them. */
const NO_MARKS_FOUND = new Set(["mercury-capsule.glb", "space-shuttle-stack-external-tank.glb", "space-shuttle-stack-srb.glb"]);
const OUR_MATERIALS = new Set([...Object.keys(MATERIALS), "atlas", "painted"]);
const modelFiles = readdirSync("models").filter((name) => name.endsWith(".glb"));

test("a painted model carries no logo: only our materials, only the images chosen, and its credit", () => {
  assert.ok(modelFiles.length >= 5);
  for (const name of modelFiles) {
    const bytes = new Uint8Array(readFileSync(join("models", name)));
    const json = JSON.parse(glbJson(bytes)) as { asset: { extras: Record<string, string> }; materials: { name: string }[]; images?: unknown[] };
    for (const material of json.materials) assert.ok(OUR_MATERIALS.has(material.name), `${name}: ${material.name}`);
    assert.ok((json.images?.length ?? 0) <= 4, `${name}: ${json.images?.length} images`);
    // the materials that carried a mark are gone by name too
    assert.ok(!/logo|serial|wordmark/i.test(JSON.stringify(json.materials)), name);
    assert.match(json.asset.extras.license, /CC-BY-4\.0|CC0-1\.0|^Public domain, NASA /, name);
    assert.ok(json.asset.extras.author && json.asset.extras.source && json.asset.extras.title, name);
    assert.ok(json.asset.extras.changes, `${name} says what was changed`);
  }
});

test("each painted model is under 8 MB and to its sourced size", () => {
  const sized: Record<string, [number, number]> = {
    "starship-v3-booster.glb": [72.3, 9],
    "starship-v3-ship.glb": [52.1, 9],
    "starship-v1-flight1-booster.glb": [69, 9],
    "starship-v1-flight1-ship.glb": [50.3, 9],
    "starship-2019-ship.glb": [50, Number.NaN],
    "falcon-9-block-5-first-stage.glb": [47.7, 3.7],
    "falcon-9-block-5-second-stage.glb": [10.85, 3.7],
    "falcon-9-block-5-fairing.glb": [13.1, 5.2],
    "dragon-dragon-2-trunk.glb": [3.94, 3.7],
    "dragon-dragon-2-capsule.glb": [4.5, 4],
    "dragon-dragon-1-trunk.glb": [2.3, 3.7],
    "dragon-dragon-1-capsule.glb": [3.8, 3.7],
    "falcon-heavy-falcon-heavy-centre.glb": [70, 3.7],
    "falcon-heavy-falcon-heavy-side-left.glb": [45.57, 3.7],
    "falcon-heavy-falcon-heavy-side-right.glb": [45.57, 3.7],
    "grasshopper-grasshopper-vehicle.glb": [32, Number.NaN],
    "space-shuttle-discovery-orbiter.glb": [37.24, 23.79],
    "lunar-module-descent.glb": [3.96, 9.4],
    "lunar-module-ascent.glb": [3.84, 4.29],
    "apollo-soyuz-csm.glb": [11, 3.9],
    "apollo-soyuz-docking-module.glb": [2.21, Number.NaN],
    "apollo-soyuz-soyuz.glb": [7.48, 2.72],
    "gemini-adapter.glb": [2.39, 3],
    "gemini-capsule.glb": [3.23, Number.NaN],
    "mercury-capsule.glb": [3.3, 1.8],
    "space-shuttle-stack-orbiter.glb": [37.24, 23.79],
    "space-shuttle-stack-external-tank.glb": [46.88, 8.41],
    "space-shuttle-stack-srb.glb": [45.46, 3.71],
    "hubble-aft-shroud.glb": [4.25, 4.69],
    "hubble-antenna-far.glb": [0.72, 1.14],
    "hubble-antenna-near.glb": [1.31, 0.88],
    "hubble-aperture-door.glb": [0.28, 3.03],
    "hubble-array-left.glb": [6.97, 3.67],
    "hubble-array-right.glb": [6.97, 3.67],
    "hubble-equipment-section.glb": [1.89, 4.72],
    "hubble-forward-shell.glb": [3.37, 4.24],
    "hubble-light-shield.glb": [5.31, 4.18],
    "iss-airlock.glb": [4.63, 3.66],
    "iss-arrays-p4.glb": [71.66, 8.13],
    "iss-arrays-p6.glb": [71.66, 8.13],
    "iss-arrays-s4.glb": [71.66, 8.13],
    "iss-arrays-s6.glb": [71.66, 8.13],
    "iss-columbus.glb": [3.68, 5.48],
    "iss-destiny.glb": [6.31, 3.74],
    "iss-harmony.glb": [6.09, 4.15],
    "iss-kibo.glb": [4.22, 16.21],
    "iss-radiators-port.glb": [19.42, 10.47],
    "iss-radiators-starboard.glb": [19.42, 10.47],
    "iss-soyuz-aft.glb": [5.57, 5.44],
    "iss-soyuz-zarya-nadir.glb": [4.66, 2.29],
    "iss-soyuz-zvezda-nadir.glb": [5.48, 2.29],
    "iss-soyuz-zvezda-zenith.glb": [2.29, 7.22],
    "iss-truss-p1.glb": [1.76, 13.25],
    "iss-truss-p3-p4.glb": [3.88, 15.98],
    "iss-truss-p5.glb": [1.63, 6.81],
    "iss-truss-p6.glb": [1.63, 13.25],
    "iss-truss-s0.glb": [1.63, 13.25],
    "iss-truss-s1.glb": [3.89, 13.25],
    "iss-truss-s3-s4.glb": [3.89, 16.39],
    "iss-truss-s5.glb": [1.63, 6.81],
    "iss-truss-s6.glb": [1.63, 13.25],
    "iss-unity.glb": [4.99, 2.26],
    "iss-zarya.glb": [11.08, 14.62],
    "iss-zvezda.glb": [11.85, 24.52],
    "jupiter-c-first-stage.glb": [15.03, 1.99],
    "jupiter-c-fourth-stage.glb": [1.93, 0.33],
    "jupiter-c-tail.glb": [3.09, 2.94],
    "jupiter-c-tub.glb": [1.44, 0.96],
    "tiangong-hub.glb": [4.58, 5.68],
    "tiangong-mengtian-arrays.glb": [55.25, 3.99],
    "tiangong-mengtian.glb": [5.02, 17.56],
    "tiangong-shenzhou-forward.glb": [9.08, 15.47],
    "tiangong-shenzhou-nadir.glb": [3.04, 16.58],
    "tiangong-tianhe-arrays.glb": [5.39, 24.26],
    "tiangong-tianhe.glb": [12.31, 6.35],
    "tiangong-tianzhou.glb": [10.6, 14.05],
    "tiangong-wentian-arrays.glb": [56.6, 4.13],
    "tiangong-wentian.glb": [5.0, 18.16],
    "fleet-drone-repair-near.glb": [1.337, 1.048],
    "fleet-drone-repair-far.glb": [1.319, 1.029],
    // each car is scaled to its sourced length or wheelbase; these are its heights at that scale, roof off for the first generation
    "roadster-first-generation-car.glb": [1.067, 1.873],
    "roadster-second-generation-car.glb": [1.137, 2],
    "roadster-second-generation-2-car.glb": [1.067, 2],
    "voyager-craft.glb": [7.74, 12.46],
    "juno-craft.glb": [6.89, 18.36],
    "jwst-craft.glb": [11.36, 21.2],
    "parker-solar-probe-craft.glb": [2.2, 2.4],
    "new-horizons-craft.glb": [2.25, 3.31],
  };
  for (const name of modelFiles) {
    assert.ok(statSync(join("models", name)).size < 8 * 1024 * 1024, name);
    const bytes = new Uint8Array(readFileSync(join("models", name)));
    const json = JSON.parse(glbJson(bytes)) as { nodes: { translation?: number[]; scale?: number[]; mesh?: number; name?: string }[]; meshes: { primitives: { attributes: { POSITION: number } }[] }[]; accessors: { min: number[]; max: number[]; normalized?: boolean; componentType: number }[] };
    const node = json.nodes.find((n) => n.mesh !== undefined);
    assert.ok(node);
    const scale = node.scale?.[1] ?? 1;
    const lift = node.translation?.[1] ?? 0;
    // packed positions: a value's real height is the raw number, over 32767 when normalized, by the node's matrix
    let lo = Infinity;
    let hi = -Infinity;
    for (const primitive of json.meshes[node.mesh as number].primitives) {
      const accessor = json.accessors[primitive.attributes.POSITION];
      const unit = accessor.normalized ? 32767 : 1;
      lo = Math.min(lo, accessor.min[1] / unit);
      hi = Math.max(hi, accessor.max[1] / unit);
    }
    const height = (hi - lo) * scale;
    const want = sized[name];
    assert.ok(want, `${name} has no sourced size in this test`);
    assert.ok(Math.abs(height - want[0]) / want[0] < 0.012, `${name}: ${height} against ${want[0]}, lift ${lift}`);
  }
});

test("NASA's models rest on the owner's decision, which says so, with no suggestion of endorsement, and carry no mark", () => {
  const notice = readFileSync("NOTICE.md", "utf8");
  assert.match(notice, /owner's decision of 2026-11-02/);
  assert.match(notice, /not affiliated with or endorsed by SpaceX, NASA/);
  assert.match(notice, /No NASA logo, insignia, flag or lettering/);
  for (const c of Object.values(MODEL_CREDITS) as readonly ModelCredit[]) if (c.creator === "NASA") assert.match(c.sourceUrl, /^https:\/\/(data\.nasa\.gov\/dataset|science\.nasa\.gov\/3d-resources|science\.nasa\.gov\/resource)\//);
  for (const name of modelFiles) {
    const extras = (JSON.parse(glbJson(new Uint8Array(readFileSync(join("models", name))))) as { asset: { extras: Record<string, string> } }).asset.extras;
    if (extras.author === "NASA") assert.ok(/painted out|removed|no mark/i.test(extras.changes) || NO_MARKS_FOUND.has(name) || name.startsWith("iss-"), `${name} says what became of its marks`);
  }
});

test("the source says what it may not use", () => {
  const notice = readFileSync("NOTICE.md", "utf8");
  for (const c of Object.values(MODEL_CREDITS)) {
    assert.ok(notice.includes(c.creator), c.creator);
    assert.ok(notice.includes(c.sourceUrl), c.sourceUrl);
    assert.ok(notice.includes(c.title), c.title);
  }
  assert.ok(notice.includes("https://creativecommons.org/licenses/by/4.0/"));
  assert.match(notice, /All trademarks belong to their owners/);
  assert.match(notice, /not affiliated with or endorsed by SpaceX/);
  assert.match(notice, /r-spacex\/SpaceX-API/);
  assert.ok(existsSync("LICENSES/CC-BY-4.0.txt") && existsSync("LICENSES/MIT.txt") && existsSync("LICENSES/ODbL-1.0.txt"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { license: string; dependencies?: object };
  assert.equal(pkg.license, "MIT AND CC-BY-4.0 AND ODbL-1.0");
  assert.equal(pkg.dependencies, undefined);
});

test("what comes from OpenStreetMap says so, where it is and where the licences are listed: its licence, not MIT", () => {
  for (const file of ["NOTICE.md", "README.md", "src/data/starbase.ts", "src/model/starbase.ts", "src/data/tower.ts", "src/model/tower.ts"]) {
    const text = readFileSync(file, "utf8");
    assert.match(text, /© OpenStreetMap contributors/, file);
    assert.match(text, /ODbL/, file);
    assert.match(text, /not MIT/, file);
  }
});

test("the README says whose the trademarks are, and credits the models", () => {
  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /All trademarks belong to their owners/);
  assert.match(readme, /not affiliated/);
  for (const c of Object.values(MODEL_CREDITS)) assert.ok(readme.includes(c.creator), c.creator);
});

test("nothing private, no other project's name, no word on who did the work", () => {
  const banned = /hotaru|\/Users\/john|Projects\/backups|Dropbox|Downloads|10\.0\.0\.|192\.168\.|co-authored|generated with|\bclaude\b|\bgrok\b|chatgpt|\bcopilot\b/i;
  const words = [...walk("src"), ...walk("demo"), ...walk("scripts"), ...walk("test").filter((file) => !file.endsWith("legal.test.ts")), ...walk("docs").filter((file) => file.endsWith(".md")), "README.md", "NOTICE.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "AGENTS.md"];
  for (const file of words) {
    const text = readFileSync(file, "utf8");
    assert.ok(!banned.test(text), `${file}: ${banned.exec(text)?.[0]}`);
  }
});

test("the code that draws has no mark in it, and takes nothing from a source it may not use", () => {
  const banned = /appleMark|"Logo"\s*:\s*"|thingiverse|Spiri0|Forest Katsch|Crew_Dragon/i;
  for (const file of [...walk("src"), ...walk("scripts").filter((name) => !name.endsWith("model-recipes.ts"))]) {
    const text = readFileSync(file, "utf8");
    assert.ok(!banned.test(text), `${file}: ${banned.exec(text)?.[0]}`);
  }
});
