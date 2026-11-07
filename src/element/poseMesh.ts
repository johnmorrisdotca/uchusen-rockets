// One three.js mesh per material of a drone's pieces. The posed drones and the three stored poses both draw through this.
import { BufferAttribute, BufferGeometry, MeshStandardMaterial } from "three";
import { MATERIALS } from "../model/materials.ts";
import type { PartMesh } from "../model/pieces.ts";

/** A geometry and a plain material for each material that has triangles. */
export function poseMeshes(mesh: PartMesh): { geometry: BufferGeometry; material: MeshStandardMaterial }[] {
  const out: { geometry: BufferGeometry; material: MeshStandardMaterial }[] = [];
  for (const [material, buffers] of mesh.faces) {
    const spec = MATERIALS[material];
    if (!spec || buffers.positions.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(buffers.positions), 3));
    if (buffers.normals.length === buffers.positions.length) geometry.setAttribute("normal", new BufferAttribute(new Float32Array(buffers.normals), 3));
    geometry.setIndex(buffers.indices);
    const opacity = "opacity" in spec ? spec.opacity : undefined;
    out.push({
      geometry,
      material: new MeshStandardMaterial({
        color: spec.color,
        metalness: spec.metal,
        roughness: spec.rough,
        ...(opacity !== undefined && opacity < 1 ? { transparent: true, opacity } : {}),
      }),
    });
  }
  return out;
}
