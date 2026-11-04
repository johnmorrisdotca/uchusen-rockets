// Writes src/data/fleet/badges/svgs.ts from the .svg files beside it: the SVGs are the pictures, the module holds them as strings so a browser or a bundler needs no loader. `pnpm badges` writes it; the badges test fails
// when it is out of date.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const BADGE_FOLDER = fileURLToPath(new URL("../src/data/fleet/badges/", import.meta.url));

/** The text svgs.ts must hold: every .svg of the folder by its file name without the ending, in order. */
export function svgsModule(folder = BADGE_FOLDER): string {
  const names = readdirSync(folder).filter((name) => name.endsWith(".svg")).sort();
  const entries = names.map((name) => `  ${JSON.stringify(name.slice(0, -4))}: ${JSON.stringify(readFileSync(join(folder, name), "utf8"))},`);
  return `// Made by \`pnpm badges\` (scripts/make-badges.ts) from the .svg files in this folder: change an SVG, then run it. Never edit this file.\n\nexport const BADGE_SVGS: Readonly<Record<string, string>> = {\n${entries.join("\n")}\n};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(join(BADGE_FOLDER, "svgs.ts"), svgsModule());
