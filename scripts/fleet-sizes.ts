// Measures every module of the fleet kit and writes src/model/fleet/sizes.ts: the size of each module's mesh in metres. `test/fleet-kit.test.ts` holds the table to the meshes, so run this after changing a module.
//
//   node scripts/fleet-sizes.ts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KIT } from "../src/model/fleet/modules.ts";
import { boundsOf, meshOf } from "../src/model/pieces.ts";

const lines: string[] = [];
for (const module of Object.values(KIT)) {
  let w = 0;
  let d = 0;
  for (const cutaway of module.inside ? [false, true] : [false]) {
    const { min, max } = boundsOf(meshOf(module.pieces({ cutaway })));
    w = Math.max(w, max[0] - min[0]);
    d = Math.max(d, max[2] - min[2]);
  }
  const up = (v: number) => Math.round(v * 10) / 10;
  lines.push(`  "${module.id}": [${up(w)}, ${up(d)}, ${module.length}],`);
}
const out = `// The size of each module's mesh in metres: width (X), depth (Z), length (Y). Made by \`node scripts/fleet-sizes.ts\`; test/fleet-kit.test.ts holds it to the meshes.\nexport const SIZES: Readonly<Record<string, readonly [number, number, number]>> = {\n${lines.join("\n")}\n};\n`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "model", "fleet", "sizes.ts"), out);
console.log(`${lines.length} sizes`);
