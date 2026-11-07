// Distant drones, three rigid poses. Each is the coarse drone, instanced, so a far drone stays one shape. The nearest few stay the posed model.
import { InstancedMesh, type Group } from "three";
import { farPieces } from "../model/fleet/drone/far.ts";
import { STORED_POSES, STORED_SHAPE, type StoredPose } from "../model/fleet/drone/poses.ts";
import { meshOf } from "../model/pieces.ts";
import { poseMeshes } from "./poseMesh.ts";

/** One instanced mesh per material, for each stored pose. */
export function storedFleet(parent: Group, capacity: number): Record<StoredPose, InstancedMesh[]> {
  const made = {} as Record<StoredPose, InstancedMesh[]>;
  for (const name of STORED_POSES) {
    const list: InstancedMesh[] = [];
    for (const { geometry, material } of poseMeshes(meshOf(farPieces(STORED_SHAPE[name])))) {
      const instance = new InstancedMesh(geometry, material, capacity);
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
