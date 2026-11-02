// Packs the package the way it is published (`npm pack`), installs the tarball into an empty project, and uses it as somebody who installed it would: every entry imported, a rocket built that must equal the one
// this checkout builds, every asset there. A package whose `exports` name a file that is not in the tarball fails here, before it is published. `pnpm test:package` builds first.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { LOOK_NAMES, PART_ENTRIES, ROCKETS } from "../src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string; version: string; main: string; types: string; files: string[]; dependencies?: Record<string, string>; exports: Record<string, string | Record<string, string>> };
const windows = process.platform === "win32";
const scratch = mkdtempSync(join(tmpdir(), "uchusen-package-"));

function run(command: string, args: string[], cwd: string, viaShell = false) {
  const shell = viaShell && windows;
  const ran = spawnSync(shell && /[\\/]/.test(command) ? `"${command}"` : command, args, { cwd, encoding: "utf8", shell, maxBuffer: 64 * 1024 * 1024 });
  if (ran.status !== 0) {
    console.error(`FAIL ${command} ${args.join(" ")}\n${ran.stdout}\n${ran.stderr}`);
    process.exit(1);
  }
  return ran.stdout;
}
const fail = (message: string) => {
  console.error(`FAIL ${message}`);
  process.exit(1);
};

// 1. Pack, with npm.
const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], root, true)) as { filename: string; size: number; unpackedSize: number; files: { path: string }[] }[];
const tarball = join(scratch, packed[0].filename);
const inTarball = new Set(packed[0].files.map((file) => file.path));
console.log(`ok   npm pack: ${packed[0].filename}, ${packed[0].files.length} files, ${(packed[0].size / 1024 / 1024).toFixed(1)} MB packed, ${(packed[0].unpackedSize / 1024 / 1024).toFixed(1)} MB unpacked`);
if (packed[0].size > 40 * 1024 * 1024) fail("the tarball is over 40 MB");

// 2. Only what should ship.
const allowed = /^(dist\/|README\.md$|LICENSE$|LICENSES\/|NOTICE\.md$|CHANGELOG\.md$|package\.json$)/;
const strays = [...inTarball].filter((file) => !allowed.test(file) || /\.test\.|\.(ts|map)$/.test(file.replace(/\.d\.ts$/, ".d")));
if (strays.length) fail(`the tarball holds what should not ship: ${strays.slice(0, 10).join(", ")}`);
console.log("ok   no source, test, demo, doc or picture is in the tarball");
const pointed = [pkg.main, pkg.types, ...Object.values(pkg.exports).flatMap((entry) => (typeof entry === "string" ? [entry] : Object.values(entry)))].filter((file) => !file.includes("*") && !file.endsWith("package.json"));
for (const file of new Set(pointed)) if (!inTarball.has(file.replace(/^\.\//, ""))) fail(`package.json points at ${file}, which is not in the tarball`);
console.log(`ok   every file package.json points at is in the tarball (${new Set(pointed).size})`);
for (const named of pkg.files) if (![...inTarball].some((file) => file === named || file.startsWith(`${named}/`))) fail(`package.json's files names ${named}, which is not in the tarball`);
if (Object.keys(pkg.dependencies ?? {}).length > 0) fail("the package has runtime dependencies; three.js is a peer");
console.log("ok   no runtime dependencies");
if (!inTarball.has("LICENSES/CC-BY-4.0.txt") || !inTarball.has("LICENSES/MIT.txt") || !inTarball.has("LICENSES/ODbL-1.0.txt") || !inTarball.has("NOTICE.md")) fail("a licence is not in the tarball");
console.log("ok   the three licences and the notice are in the tarball");

// 3. Every asset is there.
let assets = 0;
for (const rocket of Object.values(ROCKETS))
  for (const variant of rocket.variants) {
    const stem = `${rocket.id}-${variant.id}`;
    if (!inTarball.has(`dist/assets/${stem}.glb`)) fail(`no ${stem}.glb`);
    for (const look of LOOK_NAMES) if (!inTarball.has(`dist/assets/${stem}${look === "line" ? "" : `.${look}`}.svg`)) fail(`no ${stem}.${look}.svg`);
    assets++;
  }
for (const { record } of PART_ENTRIES) {
  if (record.painted && !inTarball.has(`dist/assets/models/${record.painted.file}`)) fail(`no painted ${record.painted.file}`);
  if (!record.trueTo.length && !inTarball.has(`dist/assets/parts/${record.id}.glb`)) fail(`no part ${record.id}.glb`);
  if (!record.trueTo.length && !inTarball.has(`dist/assets/parts/${record.id}.svg`)) fail(`no part ${record.id}.svg`);
}
console.log(`ok   every rocket and part has its mesh and a drawing in every look (${assets} variants, ${PART_ENTRIES.length} parts)`);

// 4. Install it into an empty project, with its peers.
const project = join(scratch, "project");
mkdirSync(project);
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "scratch", private: true, version: "0.0.0" }));
run("npm", ["install", "--no-audit", "--no-fund", "--silent", tarball, "three@0.186.1", "react@19", "react-dom@19"], project, true);
console.log("ok   npm install of the tarball and its peers");

// 5. Every entry, and a rocket that must equal this checkout's.
const local = (await import(new URL("../dist/build/index.js", import.meta.url).href)) as typeof import("../src/build/index.ts");
const rocket = local.build({ rocket: "starship", variant: "v3" });
writeFileSync(
  join(project, "esm.mjs"),
  `import { check, ROCKETS } from ${JSON.stringify(pkg.name)};
import { build } from ${JSON.stringify(`${pkg.name}/build`)};
import { UchusenRocket } from ${JSON.stringify(`${pkg.name}/element`)};
import { UchusenRocket as ReactRocket } from ${JSON.stringify(`${pkg.name}/react`)};
import { createRequire } from "node:module";
if (!check({ rocket: "starship", variant: "v3" }).ok || ROCKETS.starship.variants.length !== ${ROCKETS.starship.variants.length}) throw new Error("the catalogue");
if (typeof UchusenRocket !== "function" || typeof ReactRocket !== "function") throw new Error("the element");
const rocket = build({ rocket: "starship", variant: "v3" });
if (rocket.svg() !== ${JSON.stringify(rocket.svg())}) throw new Error("the installed package drew another rocket");
if (rocket.glb().bytes.length !== ${rocket.glb().bytes.length}) throw new Error("the installed package made another mesh");
const require = createRequire(import.meta.url);
const asset = require.resolve(${JSON.stringify(`${pkg.name}/assets/models/starship-v3-ship.glb`)});
if (!asset.endsWith("starship-v3-ship.glb")) throw new Error("the asset's address");
console.log("ok");
`,
);
run(process.execPath, ["esm.mjs"], project);
console.log("ok   every entry imports, by ESM, and the installed package makes the same rocket");
writeFileSync(join(project, "cjs.cjs"), `const core = require(${JSON.stringify(pkg.name)}); if (!core.check({ rocket: "starship" }).ok) throw new Error("require");`);
run(process.execPath, ["cjs.cjs"], project);
console.log("ok   the core imports by require");
