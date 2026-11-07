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

/** A clone of the posed drone. `own` copies the geometry, so a blend can write this clone without moving the shared one. */
export function posedDrone(name: PoseName, own = false): Group {
  let source = cache.get(name);
  if (!source) {
    source = build(name);
    cache.set(name, source);
  }
  const clone = source.clone(true);
  if (!own) return clone;
  clone.traverse((node) => {
    if (node instanceof Mesh) node.geometry = node.geometry.clone();
  });
  return clone;
}

/** Writes a blend of two poses into `group`. `t` is 0 at `from` and 1 at `to`. The group must be an owned clone of one pose. */
export function blendPoses(group: Group, from: PoseName, to: PoseName, t: number): boolean {
  const a = cache.get(from) ?? build(from);
  const b = cache.get(to) ?? build(to);
  cache.set(from, a);
  cache.set(to, b);
  const u = Math.min(1, Math.max(0, t));
  const meshes = group.children.filter((node): node is Mesh => node instanceof Mesh);
  const fromMeshes = a.children.filter((node): node is Mesh => node instanceof Mesh);
  const toMeshes = b.children.filter((node): node is Mesh => node instanceof Mesh);
  if (meshes.length !== fromMeshes.length || meshes.length !== toMeshes.length) return false;
  for (let i = 0; i < meshes.length; i += 1) {
    const dest = meshes[i].geometry.getAttribute("position");
    const left = fromMeshes[i].geometry.getAttribute("position");
    const right = toMeshes[i].geometry.getAttribute("position");
    if (dest.count !== left.count || dest.count !== right.count) return false;
    const out = dest.array as Float32Array;
    const x = left.array as Float32Array;
    const y = right.array as Float32Array;
    for (let k = 0; k < out.length; k += 1) out[k] = x[k] + (y[k] - x[k]) * u;
    dest.needsUpdate = true;
  }
  return true;
}

/** Drops the shared poses. The caller's clones still hold the geometry until they dispose it. */
export function clearPosedDrones(): void {
  cache.clear();
}
