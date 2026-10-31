// No logo, no mark, no brand printing on any mesh or drawing; nothing from the sources this package may not use; the credit stays; nothing private and no word on who did the work.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { LOOK_NAMES, MATERIALS, MODEL_CREDITS, PART_ENTRIES, ROCKETS, VIEW_NAMES } from "../src/index.ts";
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
    assert.match(json.asset.extras.license, /CC-BY-4\.0/, name);
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
  assert.ok(existsSync("LICENSES/CC-BY-4.0.txt") && existsSync("LICENSES/MIT.txt"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { license: string; dependencies?: object };
  assert.equal(pkg.license, "MIT AND CC-BY-4.0");
  assert.equal(pkg.dependencies, undefined);
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
