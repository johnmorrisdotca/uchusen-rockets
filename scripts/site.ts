// Builds the static demo for GitHub Pages into ./site: the page, its styles, its scripts bundled with three.js, the shipped assets and the docs. Every address in it is relative, so it works at the Pages address
// (https://johnmorrisdotca.github.io/uchusen-rockets/) and anywhere else. `pnpm site` builds first.
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
for (const file of ["demo.css", "react-check.html", "element-check.html"]) cpSync(join(root, "demo", file), join(site, file));
// The view controls put their styles in a <style> of their own; the page's policy allows exactly that text, by its hash, so it stays strict and a new version of them is allowed by the build.
const { STYLES } = (await import(pathToFileURL(join(root, "node_modules", "@johnmorrisdotca", "kazoku-ui", "dist", "view-controls", "styles.js")).href)) as { STYLES: string };
writeFileSync(join(site, "index.html"), readFileSync(join(root, "demo", "index.html"), "utf8").replace("%KAZOKU_STYLE%", `'sha256-${createHash("sha256").update(STYLES).digest("base64")}'`));
cpSync(join(root, "dist", "assets"), join(site, "assets"), { recursive: true });
await build({
  entryPoints: { demo: join(root, "demo", "demo.ts"), "react-check": join(root, "demo", "react-check.ts"), "element-check": join(root, "demo", "element-check.ts") },
  outdir: join(site, "js"),
  bundle: true,
  splitting: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  sourcemap: false,
  chunkNames: "chunks/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
writeFileSync(join(site, ".nojekyll"), "");
console.log("site/ is ready");
