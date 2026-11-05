// A marked platform under a craft that flies in space, so it is not read as a rocket standing on a pad. The platform sits on the ground line and reaches down, wider than the footprint, with a light band at its foot. It is not part of the box the camera fits.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import type { Vec3 } from "../framing.ts";

export interface Footprint {
  min: Vec3;
  max: Vec3;
}

export interface PlinthBox {
  /** Centre, in metres. The slab's top is the ground (y = 0). */
  at: Vec3;
  size: Vec3;
  /** `mark` is the light band; `slab` is the platform. */
  kind: "mark" | "slab";
}

/**
 * The two boxes of one plinth: a light band a little wider than the footprint, and the dark platform whose top is the ground. Both reach down from the ground, so the craft is not moved and the camera's box is unchanged.
 *
 * @param foot The box the craft fills, in metres.
 * @returns The mark, then the slab.
 */
export function plinthBoxes(foot: Footprint): PlinthBox[] {
  const w = Math.max(0, foot.max[0] - foot.min[0]);
  const d = Math.max(0, foot.max[2] - foot.min[2]);
  const h = Math.max(0, foot.max[1] - foot.min[1]);
  // a fraction of the craft, so the platform reads at any size and still sits inside the camera's margin
  const overhang = Math.max(w, d) * 0.22 + Math.max(1, h * 0.012);
  const thick = Math.max(h * 0.045, Math.max(w, d) * 0.08);
  const cx = (foot.min[0] + foot.max[0]) / 2;
  const cz = (foot.min[2] + foot.max[2]) / 2;
  const slabW = w + overhang * 2;
  const slabD = d + overhang * 2;
  return [
    { kind: "mark", at: [cx, -thick + thick * 0.11, cz], size: [slabW + 0.6, thick * 0.22, slabD + 0.6] },
    { kind: "slab", at: [cx, -thick * 0.39, cz], size: [slabW, thick * 0.78, slabD] },
  ];
}

/** The plinths, one group, ready to add to the scene. An empty list is an empty group. */
export function plinthGroup(feet: readonly Footprint[]): Group {
  const group = new Group();
  group.name = "plinths";
  if (feet.length === 0) return group;
  const gold = new MeshBasicMaterial({ color: "#f2c14e" });
  const dark = new MeshBasicMaterial({ color: "#8b97a8" });
  for (const foot of feet) {
    for (const box of plinthBoxes(foot)) {
      const mesh = new Mesh(new BoxGeometry(box.size[0], box.size[1], box.size[2]), box.kind === "mark" ? gold : dark);
      mesh.position.set(box.at[0], box.at[1], box.at[2]);
      mesh.name = box.kind === "mark" ? "plinth-mark" : "plinth-slab";
      group.add(mesh);
    }
  }
  return group;
}
