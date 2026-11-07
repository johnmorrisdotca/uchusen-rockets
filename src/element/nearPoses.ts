// The nearest drones, drawn from the posed model. One group is built per pose and cloned, so six drones share the geometry. Distant drones stay the rigid instance. Pure of the page: three.js meshes only.
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { dronePieces } from "../model/fleet/drone/index.ts";
import { DRONE_POSE, type PoseName } from "../model/fleet/drone/poses.ts";
import { MATERIALS } from "../model/materials.ts";
import { meshOf } from "../model/pieces.ts";

const cache = new Map<PoseName, Group>();

function build(name: PoseName): Group {
  const mesh = meshOf(dronePieces(true, false, DRONE_POSE[name]));
  const group = new Group();
  group.name = `drone-pose-${name}`;
  for (const [material, buffers] of mesh.faces) {
    const spec = MATERIALS[material];
    if (!spec || buffers.positions.length === 0) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(buffers.positions), 3));
    if (buffers.normals.length === buffers.positions.length) geometry.setAttribute("normal", new BufferAttribute(new Float32Array(buffers.normals), 3));
    geometry.setIndex(buffers.indices);
    const opacity = "opacity" in spec ? spec.opacity : undefined;
    const made = new MeshStandardMaterial({
      color: spec.color,
      metalness: spec.metal,
      roughness: spec.rough,
      ...(opacity !== undefined && opacity < 1 ? { transparent: true, opacity } : {}),
    });
    group.add(new Mesh(geometry, made));
  }
  return group;
}

/** A clone of the posed drone. The geometry stays shared. */
export function posedDrone(name: PoseName): Group {
  let source = cache.get(name);
  if (!source) {
    source = build(name);
    cache.set(name, source);
  }
  return source.clone(true);
}

/** Drops the shared poses. The caller's clones still hold the geometry until they dispose it. */
export function clearPosedDrones(): void {
  cache.clear();
}
