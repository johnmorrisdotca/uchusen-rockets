// Runs every ```ts example of the README and the docs against the built package: each one is written to a scratch file with the package's name pointing at dist/, and run with Node.
// A comment like `// true` after an expression is checked: the example's line must give that value. `pnpm test:readme` builds first.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["README.md", ...readdirSync(join(root, "docs")).filter((name) => name.endsWith(".md")).map((name) => join("docs", name))];
const scratch = mkdtempSync(join(root, "node_modules", ".uchusen-examples-"));
const dist = pathToFileURL(join(root, "dist")).href;
let ran = 0;
let failed = 0;

function rewrite(code: string): string {
  const imports = code.replaceAll('"@johnmorrisdotca/uchusen-rockets/build"', `"${dist}/build/index.js"`).replaceAll('"@johnmorrisdotca/uchusen-rockets"', `"${dist}/index.js"`);
  return imports
    .split("\n")
    .map((line) => {
      const match = /^([A-Za-z_][^=\n]*?);\s*\/\/\s*(true|false|"[^"]*"|-?[\d.]+|\[[\d, ]+\])\s*$/.exec(line);
      if (!match) return line;
      return `{ const got = ${match[1]}; const want = ${match[2]}; if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(${JSON.stringify(match[1])} + " gave " + JSON.stringify(got)); }`;
    })
    .join("\n");
}

for (const file of files) {
  const text = readFileSync(join(root, file), "utf8");
  let index = 0;
  for (const match of text.matchAll(/```ts\n([\s\S]*?)```/g)) {
    index++;
    const path = join(scratch, `example-${ran}.mjs`);
    writeFileSync(path, rewrite(match[1]));
    const run = spawnSync(process.execPath, [path], { cwd: root, encoding: "utf8" });
    ran++;
    if (run.status !== 0) {
      failed++;
      console.error(`FAIL ${file} example ${index}\n${match[1]}\n${run.stderr}`);
    }
  }
}
rmSync(scratch, { recursive: true, force: true });
if (failed) process.exit(1);
console.log(`ok   ${ran} examples of the README and the docs ran`);
