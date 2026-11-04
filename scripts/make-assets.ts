// Makes the shipped pictures: dist/assets/<rocket>-<variant>[-<show>][.<look>].svg and .glb for each, parts/<id>.* for each small part, and copies the licensed models to models/. The same input always gives the
// same bytes. Limits are held here: a mesh a phone can load, a drawing a page can carry.
//
//   node scripts/make-assets.ts [--out <dir>]
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build, buildPart } from "../src/build/index.ts";
import { PART_ENTRIES } from "../src/model/registry.ts";
import { DEFAULT_LOOK, LOOK_NAMES, type LookName } from "../src/looks.ts";
import { ROCKETS } from "../src/rockets.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : join(root, "dist", "assets");
export const MESH_LIMIT = 600 * 1024;
/** The fleet's sample ships are far bigger than any real rocket; their parts still keep to MESH_LIMIT. */
export const FLEET_MESH_LIMIT = 6 * 1024 * 1024;
export const DRAWING_LIMIT = 80 * 1024;
export const MODEL_LIMIT = 8 * 1024 * 1024;
mkdirSync(join(out, "parts"), { recursive: true });
mkdirSync(join(out, "models"), { recursive: true });

const lookSuffix = (look: LookName) => (look === DEFAULT_LOOK ? "" : `.${look}`);

function writeMesh(path: string, bytes: Uint8Array, limit = MESH_LIMIT): void {
  if (bytes.byteLength > limit) throw new Error(`${path} is ${bytes.byteLength} bytes, over ${limit}`);
  writeFileSync(path, bytes);
}

function writeDrawing(path: string, svg: string): void {
  if (svg.length > DRAWING_LIMIT) throw new Error(`${path} is ${svg.length} bytes, over ${DRAWING_LIMIT}`);
  writeFileSync(path, svg);
}

let meshes = 0;
let drawings = 0;
for (const rocket of Object.values(ROCKETS)) {
  for (const variant of rocket.variants) {
    const built = build({ rocket: rocket.id, variant: variant.id });
    const stem = `${rocket.id}-${variant.id}`;
    writeMesh(join(out, `${stem}.glb`), built.glb().bytes, rocket.id.startsWith("fleet-") ? FLEET_MESH_LIMIT : MESH_LIMIT);
    meshes++;
    for (const show of built.shows) {
      const name = show === built.shows[0] ? stem : `${stem}-${show}`;
      for (const look of LOOK_NAMES) {
        writeDrawing(join(out, `${name}${lookSuffix(look)}.svg`), built.svg({ look, show }));
        drawings++;
      }
    }
    if (built.parts.length > 1)
      for (const part of built.parts) {
        writeMesh(join(out, `${stem}-${part.slot}.glb`), buildPart(part.record.id).glb().bytes);
        meshes++;
      }
  }
}
for (const { record } of PART_ENTRIES) {
  if (record.trueTo.length) continue;
  const part = buildPart(record.id);
  writeMesh(join(out, "parts", `${record.id}.glb`), part.glb().bytes);
  meshes++;
  for (const look of LOOK_NAMES) {
    writeDrawing(join(out, "parts", `${record.id}${lookSuffix(look)}.svg`), part.svg({ look }));
    drawings++;
  }
}
let models = 0;
for (const name of readdirSync(join(root, "models"))) {
  if (!name.endsWith(".glb")) continue;
  const size = statSync(join(root, "models", name)).size;
  if (size > MODEL_LIMIT) throw new Error(`models/${name} is ${size} bytes, over ${MODEL_LIMIT}`);
  copyFileSync(join(root, "models", name), join(out, "models", name));
  models++;
}
console.log(`assets: ${meshes} meshes, ${drawings} drawings and ${models} painted models in ${out}`);
