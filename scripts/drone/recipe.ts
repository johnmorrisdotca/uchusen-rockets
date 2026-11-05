// What is taken from each of NASA's models and where it goes on the drone. Each import names a model's file, picks its triangles (by node, material or place in the file) and says how they are moved: the arms' links
// are stretched between the drone's own joints, the gripper and the tool stand at the wrist, the core drum is turned over and squeezed under the saucer. Every pick was found by looking at the file's own pictures and
// then at the result from every side. These models are NASA's; no logo, insignia, flag or lettering is shipped.
import { ARMS, joints, wristOf } from "../../src/model/fleet/drone/layout.ts";
import { DRONE_LIFT } from "../../src/model/fleet/drone/index.ts";
import { GRIP_LENGTH, TOOL_LENGTH } from "../../src/model/fleet/drone/arms.ts";
import type { MaterialName } from "../../src/model/materials.ts";
import { add, fit, type V3, type Xf, pca, scale as mulV, sub } from "./math.ts";
import type { Tri } from "./sources.ts";

export interface Import {
  id: string;
  /** A key of `SOURCE_FILES`. */
  file: string;
  /** Which of the file's triangles. */
  pick: (t: Tri, centre: V3) => boolean;
  /** Painted with one of this package's materials in place of the file's own (an STL has none). */
  paint?: MaterialName;
  /** How the picked triangles are moved, from the picked cloud. */
  place: (cloud: V3[], tris: Tri[]) => Xf;
  /** Leave out the long thin slivers some models carry: they draw as dark streaks. */
  noSlivers?: boolean;
  /** The most triangles it keeps in the far model; left out, it is not in the far model. */
  far?: number;
  /** What credit the file's NASA model carries. */
  credit: "nasa-cluster-ii" | "nasa-insight" | "nasa-curiosity" | "nasa-hete" | "nasa-grease-gun";
}

/** The file of each source, under the folder named by `UCHUSEN_MODEL_SOURCES`. */
export const SOURCE_FILES: Readonly<Record<string, { path: string; kind: "glb" | "stl" }>> = {
  cluster: { path: "cluster-ii.glb", kind: "glb" },
  hete: { path: "hete.glb", kind: "glb" },
  grease: { path: "grease-gun.glb", kind: "glb" },
  insight: { path: "insight-arm-deployed.glb", kind: "glb" },
  "cur-upper": { path: "curiosity-detailed/upper-arm.stl", kind: "stl" },
  "cur-lower": { path: "curiosity-detailed/lower-arm.stl", kind: "stl" },
  "cur-turret": { path: "curiosity-detailed/mahli-apxs.stl", kind: "stl" },
};

const lift = (p: V3): V3 => [p[0], p[1] + DRONE_LIFT, p[2]];
const grip = ARMS[0];
const weld = ARMS[1];
const gj = joints(grip);
const wj = joints(weld);
const gw = wristOf(grip);
const ww = wristOf(weld);

/** Stretches a part's long axis between two points, thickened across by `width` metres at its widest. */
function span(from: V3, to: V3, up: V3, width: number) {
  return (cloud: V3[]): Xf => {
    const c = pca(cloud);
    const length = Math.hypot(...sub(to, from));
    const mid = mulV(add(from, to), 0.5);
    const across = width / 2 / Math.max(c.width, 1e-6);
    return fit(add(c.centre, mulV(c.axis, (c.lo + c.hi) / 2)), c.axis, c.second, lift(mid), mulV(sub(to, from), 1 / length), up, [length / (c.hi - c.lo), across, across]);
  };
}

const named = (re: RegExp) => (t: Tri) => re.test(t.node);

/** One of InSight's landing legs, hung from the belly's rear, splayed outward at an azimuth, a quarter of its size. */
function leg(id: string, az: number): Import {
  const out: V3 = [Math.sin(az), 0, Math.cos(az)];
  return {
    id,
    far: 160,
    file: "insight",
    credit: "nasa-insight",
    pick: named(/^leg_b$/),
    place: (cloud) => {
      const top = Math.max(...cloud.map((p) => p[1]));
      const slice = cloud.filter((p) => p[1] > top - 0.05);
      const c = slice.reduce((a, p) => add(a, mulV(p, 1 / slice.length)), [0, 0, 0] as V3);
      const mount: V3 = [out[0] * 0.27, -0.165, out[2] * 0.27];
      return fit(c, [0, 1, 0], [0, 0, -1], lift(mount), [0, 1, 0], out, 0.23);
    },
  };
}

export const IMPORTS: readonly Import[] = [
  {
    id: "core-drum",
    far: 420,
    file: "cluster",
    credit: "nasa-cluster-ii",
    pick: (_t, c) => Math.hypot(c[0], c[2]) <= 1.55 && Math.abs(c[1]) <= 1,
    // turned over so its gold foil faces down, a third of its size across and a fifth of its height
    place: () => ({ r: [0.3, 0, 0, 0, -0.2, 0, 0, 0, -0.3], t: [0, -0.04 + DRONE_LIFT, 0] }),
  },
  {
    id: "equipment-block",
    noSlivers: true,
    far: 380,
    file: "hete",
    credit: "nasa-hete",
    pick: () => true,
    // its long side across the saucer's rear, its top up
    place: () => fit([0, 0.025, -0.05], [0, 0, 1], [0, 1, 0], lift([0, 0.285, -0.205]), [1, 0, 0], [0, 1, 0], 0.26),
  },
  {
    id: "gripper",
    far: 220,
    file: "insight",
    credit: "nasa-insight",
    // the body and its five claws, not the thin cable above them
    pick: (t, c) => /^(grapple|claw_0\d)$/.test(t.node) && c[1] <= 1.07,
    place: (cloud) => {
      const ys = cloud.map((p) => p[1]);
      const top = Math.max(...ys);
      const k = GRIP_LENGTH / (top - Math.min(...ys));
      const cx = cloud.reduce((a, p) => a + p[0], 0) / cloud.length;
      const cz = cloud.reduce((a, p) => a + p[2], 0) / cloud.length;
      return fit([cx, top, cz], [0, -1, 0], [1, 0, 0], lift(add(gw.to, mulV(gw.d, 0.02))), gw.d, gw.up, k);
    },
  },
  { id: "grip-upper-link", file: "insight", credit: "nasa-insight", pick: named(/^arm_02$/), place: span(add(gj[1].from, mulV(gj[1].d, 0.1)), gj[1].to, gj[1].up, 0.06) },
  { id: "grip-forearm-link", file: "insight", credit: "nasa-insight", pick: named(/^arm_03$/), place: span(add(gj[2].from, mulV(gj[2].d, 0.09)), gj[2].to, gj[2].up, 0.06) },
  { id: "weld-upper-link", file: "cur-upper", credit: "nasa-curiosity", paint: "hull-grey", pick: () => true, place: span(add(wj[1].from, mulV(wj[1].d, 0.1)), wj[1].to, wj[1].up, 0.07) },
  { id: "weld-forearm-link", file: "cur-lower", credit: "nasa-curiosity", paint: "engine-pale", pick: () => true, place: span(add(wj[2].from, mulV(wj[2].d, 0.1)), wj[2].to, wj[2].up, 0.07) },
  {
    id: "tool-turret",
    far: 150,
    file: "cur-turret",
    credit: "nasa-curiosity",
    paint: "engine-metal",
    pick: () => true,
    place: (cloud) => {
      const c = pca(cloud);
      return fit(c.centre, [1, 0, 0], [0, 1, 0], lift(add(ww.to, mulV(ww.d, 0.03))), ww.d, ww.up, 0.09 / (c.hi - c.lo));
    },
  },
  {
    id: "wrist-camera",
    file: "insight",
    credit: "nasa-insight",
    pick: named(/^IDC$/),
    // InSight's own arm camera, on the grip arm's wrist, looking where the gripper does
    place: (cloud) => {
      const c = pca(cloud);
      const mid = add(c.centre, mulV(c.axis, (c.lo + c.hi) / 2));
      return fit(mid, c.axis, c.second, lift(add(add(gw.to, mulV(gw.up, 0.05)), mulV(gw.d, 0.02))), gw.d, gw.up, 0.075 / (c.hi - c.lo));
    },
  },
  leg("leg-right", (150 * Math.PI) / 180),
  leg("leg-left", (-150 * Math.PI) / 180),
  {
    id: "weld-tool",
    far: 140,
    file: "grease",
    credit: "nasa-grease-gun",
    pick: () => true,
    place: (cloud, tris) => {
      const c = pca(cloud);
      // the muzzle end is where the nozzle and its tip are
      const front = tris.filter((t) => /nozzle|tip/.test(t.mat)).flatMap((t) => t.p);
      const fc = front.reduce((a, p) => add(a, mulV(p, 1 / front.length)), [0, 0, 0] as V3);
      const dir = (fc[0] - c.centre[0]) * c.axis[0] + (fc[1] - c.centre[1]) * c.axis[1] + (fc[2] - c.centre[2]) * c.axis[2] >= 0 ? 1 : -1;
      const axis = mulV(c.axis, dir);
      const mid = add(c.centre, mulV(c.axis, (c.lo + c.hi) / 2));
      const start = add(ww.to, mulV(ww.d, 0.05));
      const end = add(ww.to, mulV(ww.d, TOOL_LENGTH));
      const l = Math.hypot(...sub(end, start));
      return fit(mid, axis, mulV(c.second, dir), lift(mulV(add(start, end), 0.5)), ww.d, ww.up, l / (c.hi - c.lo));
    },
  },
];
