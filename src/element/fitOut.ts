// The tanks and the pipe that arrive after a ring is sealed and before it is pressurised. They sit in the ring's own space, large enough to read at the distance the ring is framed, and they are taken off once the ring is finished so the finished ship is the model.
import { Box3, CylinderGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, TorusGeometry, Vector3 } from "three";

const NAME = "fit-tanks";

/** The middle of the ring's meshes, in `parent`'s own space, so the tanks sit in the wheel and not at the ship's origin. */
function localCenter(parent: Object3D): Vector3 {
  parent.updateWorldMatrix(true, true);
  const into = new Matrix4().copy(parent.matrixWorld).invert();
  const placed = new Matrix4();
  const box = new Box3();
  const one = new Box3();
  parent.traverse((child) => {
    if (!(child instanceof Mesh) || child.name === "outline" || child.name === "fit-tank") return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    if (!bounds) return;
    placed.multiplyMatrices(into, child.matrixWorld);
    one.copy(bounds).applyMatrix4(placed);
    box.union(one);
  });
  return box.isEmpty() ? new Vector3() : box.getCenter(new Vector3());
}

/**
 * Shows the oxygen and nitrogen tanks and the pipe that joins them while `grown` is the filling stage. Hidden otherwise.
 * @param holder The ring.
 * @param grown How much of the ring stands, from 0 to 1.
 */
export function fitTanks(holder: Group, grown: number): void {
  const parent = holder.children.find((child) => child instanceof Group && child.name !== NAME) ?? holder;
  let group = parent.getObjectByName(NAME);
  const on = grown >= 0.84 && grown < 0.995;
  if (!on) {
    if (group) group.visible = false;
    return;
  }
  if (!group) {
    group = new Group();
    group.name = NAME;
    group.position.copy(localCenter(parent));
    const oxygen = new MeshStandardMaterial({ color: 0x3aa0d8, metalness: 0.45, roughness: 0.4 });
    const nitrogen = new MeshStandardMaterial({ color: 0xd4a017, metalness: 0.4, roughness: 0.45 });
    const pipe = new MeshStandardMaterial({ color: 0x8aa0b4, metalness: 0.45, roughness: 0.5 });
    for (let i = 0; i < 4; i += 1) {
      const tank = new Mesh(new CylinderGeometry(3.4, 3.4, 16, 20), i % 2 === 0 ? oxygen : nitrogen);
      tank.name = "fit-tank";
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      tank.position.set(Math.sin(angle) * 32, 0, Math.cos(angle) * 32);
      tank.rotation.x = Math.PI / 2;
      group.add(tank);
    }
    const ring = new Mesh(new TorusGeometry(38, 0.9, 10, 64), pipe);
    ring.name = "fit-tank";
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    parent.add(group);
  }
  group.visible = true;
  const grownIn = Math.min(1, (grown - 0.84) / 0.05);
  group.scale.setScalar(0.35 + 0.65 * grownIn);
}
