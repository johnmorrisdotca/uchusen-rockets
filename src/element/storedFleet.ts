// Distant drones, three rigid poses. Each is the coarse drone, instanced, so a far drone stays one shape. The nearest few stay the posed model.
import { BufferAttribute, BufferGeometry, InstancedMesh, MeshStandardMaterial, type Group } from "three";
import { farPieces } from "../model/fleet/drone/far.ts";
import { DRONE_POSE, STORED_POSES, type StoredPose } from "../model/fleet/drone/poses.ts";
import { MATERIALS } from "../model/materials.ts";
import { meshOf } from "../model/pieces.ts";

/** One instanced mesh per material, for each stored pose. */
export function storedFleet(parent: Group, capacity: number): Record<StoredPose, InstancedMesh[]> {
  const made = {} as Record<StoredPose, InstancedMesh[]>;
  for (const name of STORED_POSES) {
    const list: InstancedMesh[] = [];
    const mesh = meshOf(farPieces(DRONE_POSE[name]));
    for (const [material, buffers] of mesh.faces) {
      const spec = MATERIALS[material];
      if (!spec || buffers.positions.length === 0) continue;
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(buffers.positions), 3));
      if (buffers.normals.length === buffers.positions.length) geometry.setAttribute("normal", new BufferAttribute(new Float32Array(buffers.normals), 3));
      geometry.setIndex(buffers.indices);
      const opacity = "opacity" in spec ? spec.opacity : undefined;
      const surface = new MeshStandardMaterial({
        color: spec.color,
        metalness: spec.metal,
        roughness: spec.rough,
        ...(opacity !== undefined && opacity < 1 ? { transparent: true, opacity } : {}),
      });
      const instance = new InstancedMesh(geometry, surface, capacity);
      instance.count = 0;
      instance.frustumCulled = false;
      instance.name = `drone-stored-${name}`;
      parent.add(instance);
      list.push(instance);
    }
    made[name] = list;
  }
  return made;
}
