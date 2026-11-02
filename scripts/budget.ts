// What each rocket asks of a page: its triangles and the size of its file, code-made and painted, largest first, so a new one can be held against the largest there is. Writes nothing.
//
//   node scripts/budget.ts [rocket]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/rockets.ts";

const only = process.argv[2];
const rows: { name: string; triangles: number; bytes: number }[] = [];
for (const rocket of Object.values(ROCKETS))
  for (const variant of rocket.variants) {
    if (only && only !== rocket.id) continue;
    const built = build({ rocket: rocket.id, variant: variant.id });
    let triangles = 0;
    for (const part of built.parts) for (const faces of part.mesh.faces.values()) triangles += faces.indices.length / 3;
    rows.push({ name: `${rocket.id}:${variant.id}`, triangles, bytes: built.glb().bytes.byteLength });
  }
const painted: typeof rows = [];
for (const file of readdirSync("models")) {
  if (!file.endsWith(".glb")) continue;
  const bytes = new Uint8Array(readFileSync(join("models", file)));
  const size = new DataView(bytes.buffer, bytes.byteOffset).getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + size))) as { meshes: { primitives: { indices?: number; attributes: { POSITION: number } }[] }[]; accessors: { count: number }[] };
  const triangles = json.meshes.flatMap((mesh) => mesh.primitives).reduce((sum, primitive) => sum + json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
  painted.push({ name: file, triangles, bytes: statSync(join("models", file)).size });
}
const show = (title: string, list: typeof rows) => {
  console.log(title);
  for (const row of list.sort((a, b) => b.bytes - a.bytes)) console.log(`  ${row.name.padEnd(48)} ${String(row.triangles).padStart(8)} triangles ${String(Math.round(row.bytes / 1024)).padStart(7)} KB`);
};
show("Code-made meshes", rows);
if (!only) show("Painted models", painted);
