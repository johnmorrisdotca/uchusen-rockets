// Prints what a licensed model is made of, node by node: its material, vertex count and bounds in the file's own units. A tool for choosing how to reduce it: `node scripts/model-facts.ts <file.glb>`.
import { NodeIO } from "@gltf-transform/core";
import process from "node:process";

const doc = await new NodeIO().read(process.argv[2]);
console.log(JSON.stringify(doc.getRoot().getAsset().extras));
let tris = 0;
const walk = (node: import("@gltf-transform/core").Node) => {
  const m = node.getWorldMatrix();
  for (const prim of node.getMesh()?.listPrimitives() ?? []) {
    const a = prim.getAttribute("POSITION");
    if (!a) continue;
    const el = [0, 0, 0];
    const lo = [1e9, 1e9, 1e9];
    const hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < a.getCount(); i++) {
      a.getElement(i, el);
      const w = [0, 1, 2].map((c) => m[c] * el[0] + m[4 + c] * el[1] + m[8 + c] * el[2] + m[12 + c]);
      w.forEach((v, c) => {
        lo[c] = Math.min(lo[c], v);
        hi[c] = Math.max(hi[c], v);
      });
    }
    const t = (prim.getIndices()?.getCount() ?? a.getCount()) / 3;
    tris += t;
    console.log(`${node.getName().slice(0, 24).padEnd(24)} ${(prim.getMaterial()?.getName() ?? "").padEnd(20)} ${String(t).padStart(7)} ${lo.map((v) => v.toFixed(2)).join(" ")} .. ${hi.map((v) => v.toFixed(2)).join(" ")}`);
  }
  node.listChildren().forEach(walk);
};
for (const scene of doc.getRoot().listScenes()) scene.listChildren().forEach(walk);
console.log("triangles", tris);
