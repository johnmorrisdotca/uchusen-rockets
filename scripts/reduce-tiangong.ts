// Turns the Tiangong model of the Sketchfab user w29572227 (CC BY 4.0, kept outside this repository) into models/tiangong-station.glb. Run by hand, never by the build:
// `UCHUSEN_MODEL_SOURCES=<folder holding tiangong/scene.gltf> node scripts/reduce-tiangong.ts`. The result is committed. The source's files are data: they are only read.
//
// What it does: the flag's picture is dropped and the flag patches take the skin's plain colour; the model is turned to this package's convention (metres, Y up, the core standing on its axis with its aft end at
// y = 0, the hub at the top and the laboratories across it, the windward side toward +Z) and scaled to the sourced module sizes; its 682 pieces are joined by material, welded, simplified and quantised, so the
// painted look draws it in a few calls and the file stays about a megabyte. Its colours and metal are the source's own.
import { statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { Document, NodeIO, type Material, type Primitive } from "@gltf-transform/core";
import { MATERIALS, type MaterialName } from "../src/model/materials.ts";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, join as joinPrimitives, prune, quantize, transformMesh, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

const sources = process.env.UCHUSEN_MODEL_SOURCES ?? "";
if (!sources) throw new Error("UCHUSEN_MODEL_SOURCES must name the folder that holds tiangong/scene.gltf. The source is kept outside this repository.");
const TARGET_TRIANGLES = Number(process.env.TIANGONG_TRIANGLES ?? 80000);
/** Metres for each unit of the source's own file, set from the sourced length of the core and the laboratories (see docs): the source's wings and modules are measured against them. */
const SCALE = Number(process.env.TIANGONG_SCALE ?? 5.985);

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc: Document = await io.read(join(sources, "tiangong", "scene.gltf"));
const root = doc.getRoot();

/** This package's material for each of the source's, by its name without the copy suffix, then by its colour. The source's own names and its flag's picture reach no file. */
const OURS: Record<string, MaterialName> = {
  skin_outter: "white",
  skin_outer: "white",
  skin_inner: "hull-grey",
  material_0: "white",
  flag: "white",
  metal_silver: "engine-pale",
  metal_dark_gray: "engine-metal",
  solar_gold: "gold",
  solar_blue: "solar",
  solar_connection: "engine-metal",
  solar_connector: "engine-metal",
  metal_handle: "gold",
  handle_gold: "gold",
  metal_gold: "gold",
  jet_port: "soot",
  jet_port_silver: "engine-metal",
  metal_dark: "dark",
  window_glass: "glass",
  mirror: "steel",
};
const byColour = (m: Material): MaterialName => {
  const [r, g, b] = m.getBaseColorFactor();
  if (r > 0.7 && g > 0.3 && g < 0.5 && b < 0.3) return "gold";
  if (b > 0.6 && r < 0.2) return "solar";
  if (r < 0.1 && g < 0.1 && b < 0.1) return "dark";
  return m.getMetallicFactor() > 0.9 ? "engine-metal" : "engine-pale";
};
const made = new Map<MaterialName, Material>();
const ours = (name: MaterialName): Material => {
  let one = made.get(name);
  if (!one) {
    const spec = MATERIALS[name];
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(spec.color.slice(i, i + 2), 16) / 255);
    const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    one = doc.createMaterial(name).setBaseColorFactor([lin(r), lin(g), lin(b), 1]).setMetallicFactor(spec.metal).setRoughnessFactor(spec.rough);
    const opacity = (spec as { opacity?: number }).opacity;
    if (opacity !== undefined && opacity < 1) one.setAlpha(opacity).setAlphaMode("BLEND");
    made.set(name, one);
  }
  return one;
};
const used = new Map<string, number>();
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const was = prim.getMaterial();
    if (!was) continue;
    const key = was.getName().replace(/\.\d+$/, "");
    const name = OURS[key] ?? byColour(was);
    used.set(`${key} -> ${name}`, (used.get(`${key} -> ${name}`) ?? 0) + 1);
    prim.setMaterial(ours(name));
  }
console.log([...used].map(([k, v]) => `${k} (${v})`).join("\n"));
// the flag's picture and every other: none
for (const texture of root.listTextures()) texture.dispose();
for (const material of root.listMaterials()) if (!made.has(material.getName() as MaterialName)) material.dispose();
for (const mesh of root.listMeshes()) mesh.setName("");
for (const node of root.listNodes()) node.setName("");

// every node's own place goes into its vertices, so the file is one level of pieces at the origin
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh && mesh.listParents().filter((parent) => parent.propertyType === "Node").length > 1) throw new Error("a mesh is shared by two nodes: it would be moved twice");
}
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh) transformMesh(mesh, node.getWorldMatrix() as never);
}
await doc.transform(flatten());
for (const node of root.listNodes()) {
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  node.setScale([1, 1, 1]);
}
// the source's axes: core along z with its hub at +z, laboratories along x, wings along z, solar faces toward y. This package's: core along y, hub up, panels toward z.
// (x, y, z) -> (x, z, -y), then scaled (column-major)
const bounds = (): { min: number[]; max: number[] } => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const e = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, e);
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], e[k]);
          max[k] = Math.max(max[k], e[k]);
        }
      }
    }
  return { min, max };
};
const spin = [SCALE, 0, 0, 0, 0, 0, -SCALE, 0, 0, SCALE, 0, 0, 0, 0, 0, 1];
for (const mesh of root.listMeshes()) transformMesh(mesh, spin as never);
// stand it where this package's parts stand: the lowest point on y = 0, centred on the core's axis (x = 0, z = 0)
const box = bounds();
const lift = [0, -box.min[1], 0];
const move = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, lift[0], lift[1], lift[2], 1];
for (const mesh of root.listMeshes()) transformMesh(mesh, move as never);
console.log("size x y z", box.max.map((v, i) => (v - box.min[i]).toFixed(2)).join(" "), "m");

await doc.transform(dedup(), joinPrimitives(), weld());
const triangles = () => root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((total: number, prim: Primitive) => total + (prim.getIndices()?.getCount() ?? 0) / 3, 0), 0);
const before = triangles();
// the model is thousands of small separate pieces (cells, handles, rivets), which a simplifier that keeps every island cannot thin: this one may drop and merge them, so the cut is uniform
const ratio = Math.min(1, TARGET_TRIANGLES / before);
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const idx = prim.getIndices();
    if (!pos || !idx) continue;
    const keep = Math.max(3 * 12, Math.floor((idx.getCount() * ratio) / 3) * 3);
    if (keep >= idx.getCount()) continue;
    const [thinned] = MeshoptSimplifier.simplifySloppy(idx.getArray() as Uint32Array<ArrayBuffer>, pos.getArray() as Float32Array<ArrayBuffer>, 3, null, keep, Number(process.env.TIANGONG_ERROR ?? 0.1));
    idx.setArray(new Uint32Array(thinned));
  }
await doc.transform(weld());
await doc.transform(prune(), quantize({ quantizePosition: 14, quantizeNormal: 8, pattern: /^(POSITION|NORMAL)$/ }));

root.getAsset().generator = "uchusen-rockets";
root.getAsset().extras = {
  title: "tianGong",
  author: "w29572227",
  license: "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
  source: "https://sketchfab.com/3d-models/tiangong-aca22b1dd6d242c1ae7b88de2f483b77",
  changes: `Reduced from 4,425,408 triangles to ${triangles()}; its flag's picture dropped, the flag patches given the skin's plain colour; its materials renamed to this package's; turned to this package's axes (the core upright, the hub up) and scaled.`,
};
const out = join(process.cwd(), "models", "tiangong-station.glb");
await io.write(out, doc);
console.log(`${out}: ${(statSync(out).size / 1024).toFixed(0)} KB, ${triangles()} triangles from ${before}`);
