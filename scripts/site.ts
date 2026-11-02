// Builds the static demo for GitHub Pages into ./site: the page, its styles, its scripts bundled with three.js, the shipped assets and the docs. Every address in it is relative, so it works at the Pages address
// (https://johnmorrisdotca.github.io/uchusen-rockets/) and anywhere else. `pnpm site` builds first.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
for (const file of ["index.html", "demo.css", "react-check.html", "element-check.html", "embed.html"]) cpSync(join(root, "demo", file), join(site, file));
cpSync(join(root, "dist", "assets"), join(site, "assets"), { recursive: true });
// the realistic Earth's pictures, from the package: no wider than the demo asks for (`max-texture` in demo/earth.ts)
const earthPictures = join(root, "node_modules", "@johnmorrisdotca", "chikyu-earth", "dist", "textures");
mkdirSync(join(site, "textures"));
for (const file of readdirSync(earthPictures)) if (/-(1024|2048)\.webp$/.test(file)) cpSync(join(earthPictures, file), join(site, "textures", file));
await build({
  entryPoints: { demo: join(root, "demo", "demo.ts"), embed: join(root, "demo", "embed.ts"), "react-check": join(root, "demo", "react-check.ts"), "element-check": join(root, "demo", "element-check.ts") },
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
