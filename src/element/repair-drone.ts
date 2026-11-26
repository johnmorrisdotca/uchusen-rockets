// The baked SPX repair drone. Both levels share a texture atlas and use one
// material, so a swarm can draw each level in a single instanced draw.
import { BufferGeometry, Material, Mesh, MeshStandardMaterial, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Local positions, in metres, in the drone's +Z forward coordinate frame. */
export const DRONE_EMITTER = [0, 0.09, 0.48] as const;
export const DRONE_TOOL_POINT = [0.338, -0.42, 0.545] as const;

export interface DroneAsset {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}

/** Load one baked, single-mesh level and put its geometry in scene coordinates. */
export async function loadDrone(url: string): Promise<DroneAsset> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  let selected: Mesh | null = null;
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh && !selected) selected = node;
  });
  if (!selected) throw new Error("The repair drone asset contains no mesh");
  const mesh = selected as Mesh;
  if (Array.isArray(mesh.material) || !(mesh.material instanceof MeshStandardMaterial)) throw new Error("The repair drone asset must have one standard material");
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  mesh.geometry.dispose();
  return { geometry, material: mesh.material };
}

/** Free both model levels, including their embedded texture maps. */
export function disposeDrone(asset: DroneAsset): void {
  asset.geometry.dispose();
  const textures = new Set<Texture>();
  for (const value of Object.values(asset.material)) if (value instanceof Texture) textures.add(value);
  for (const texture of textures) texture.dispose();
  (asset.material as Material).dispose();
}
