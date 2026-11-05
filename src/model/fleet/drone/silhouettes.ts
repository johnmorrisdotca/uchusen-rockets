// Four silhouettes of each construction machine, drawn before any of them is detailed. They are meant to be told apart at a glance, from the side and from above. Not the finished machines.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { hoop, post } from "../detail.ts";
import { chamfer, polygon, wedge } from "./plates.ts";

const WHITE = "hull-white" satisfies MaterialName;
const ORANGE = "hull-orange" satisfies MaterialName;
const YELLOW = "hull-yellow" satisfies MaterialName;
const DARK = "hull-grey-dark" satisfies MaterialName;
const METAL = "hull-grey" satisfies MaterialName;
const GOLD = "gold" satisfies MaterialName;

export interface Silhouette {
  id: string;
  kind: "ring" | "tug" | "arm";
  pieces: Piece[];
}

const slab = (material: MaterialName, centre: Vec3, outline: readonly (readonly [number, number])[], thick = 0.05): Piece => polygon(material, centre, [0, 0, 1], [0, 1, 0], outline, thick);

const tube = (material: MaterialName, a: Vec3, b: Vec3, radius: number): Piece => {
  const dy = b[1] - a[1] || 0.001;
  const lean: [number, number] = [(b[0] - a[0]) / dy, (b[2] - a[2]) / dy];
  return post(material, [a[0] - lean[0] * a[1], a[2] - lean[1] * a[1]], radius, a[1], radius, b[1], 12, { lean });
};

const dart = (): Silhouette => ({
  id: "dart",
  kind: "ring",
  pieces: [
    slab(WHITE, [0, 0, 0], wedge(0.32, 0.2, 0.045), 0.07),
    slab(ORANGE, [0, -0.02, 0.05], wedge(0.22, 0.08, 0.02), 0.02),
    hoop(GOLD, 0.07, 0.36, 0.012, 16, 5),
    hoop(DARK, 0.05, -0.28, 0.012, 12, 4, { at: [-0.12, -0.04] }),
    hoop(DARK, 0.05, -0.28, 0.012, 12, 4, { at: [0.12, -0.04] }),
  ],
});

const horseshoe = (): Silhouette => ({
  id: "horseshoe",
  kind: "ring",
  pieces: [
    slab(WHITE, [-0.16, 0, 0], [[-0.06, -0.22], [0.06, -0.22], [0.1, 0.2], [-0.02, 0.2]], 0.06),
    slab(WHITE, [0.16, 0, 0], [[-0.1, -0.22], [0.06, -0.22], [0.02, 0.2], [-0.06, 0.2]], 0.06),
    hoop(GOLD, 0.08, 0.02, 0.014, 16, 5),
    hoop(DARK, 0.045, 0.22, 0.01, 12, 4, { at: [-0.2, 0] }),
    hoop(DARK, 0.045, 0.22, 0.01, 12, 4, { at: [0.2, 0] }),
  ],
});

const manta = (): Silhouette => ({
  id: "manta",
  kind: "ring",
  pieces: [
    slab(WHITE, [0, 0, 0], [[-0.16, -0.42], [0.34, 0], [-0.16, 0.42], [-0.28, 0]], 0.035),
    slab(ORANGE, [0, 0.02, 0.03], [[-0.08, -0.12], [0.2, 0], [-0.08, 0.12]], 0.015),
    hoop(GOLD, 0.06, 0.36, 0.01, 16, 5),
    hoop(DARK, 0.04, -0.02, 0.01, 12, 4, { at: [-0.34, 0.02] }),
    hoop(DARK, 0.04, -0.02, 0.01, 12, 4, { at: [0.34, 0.02] }),
  ],
});

const beetle = (): Silhouette => ({
  id: "beetle",
  kind: "ring",
  pieces: [
    post(WHITE, [0, 0], 0.02, -0.22, 0.16, -0.02, 16),
    post(WHITE, [0, 0], 0.16, -0.02, 0.05, 0.28, 16),
    hoop(GOLD, 0.07, 0.3, 0.012, 16, 5),
    hoop(DARK, 0.05, 0.02, 0.012, 12, 4, { at: [-0.14, 0.06] }),
    hoop(DARK, 0.05, 0.02, 0.012, 12, 4, { at: [0.14, 0.06] }),
  ],
});

const barge = (): Silhouette => ({
  id: "barge",
  kind: "tug",
  pieces: [
    slab(YELLOW, [0, 0, 0], chamfer(0.46, 0.16, 0.05), 0.1),
    slab(WHITE, [0, 0.04, 0.07], chamfer(0.28, 0.1, 0.03), 0.02),
    slab(METAL, [-0.14, 0.42, 0], [[-0.03, -0.16], [0.03, 0], [0.03, 0.16], [-0.03, 0]], 0.04),
    slab(METAL, [0.14, 0.42, 0], [[-0.03, 0], [0.03, -0.16], [0.03, 0], [-0.03, 0.16]], 0.04),
    hoop(DARK, 0.05, -0.4, 0.012, 12, 4, { at: [-0.12, -0.08] }),
    hoop(DARK, 0.05, -0.4, 0.012, 12, 4, { at: [0.12, -0.08] }),
  ],
});

const crab = (): Silhouette => ({
  id: "crab",
  kind: "tug",
  pieces: [
    slab(YELLOW, [0, 0, 0], chamfer(0.18, 0.28, 0.08), 0.1),
    slab(WHITE, [0, 0.02, 0.07], chamfer(0.1, 0.16, 0.03), 0.02),
    tube(METAL, [-0.26, 0.05, 0.04], [-0.16, 0.32, 0.08], 0.03),
    tube(METAL, [-0.16, 0.32, 0.08], [-0.04, 0.48, 0.02], 0.022),
    tube(METAL, [0.26, 0.05, 0.04], [0.16, 0.32, 0.08], 0.03),
    tube(METAL, [0.16, 0.32, 0.08], [0.04, 0.48, 0.02], 0.022),
  ],
});

const boot = (): Silhouette => ({
  id: "boot",
  kind: "tug",
  pieces: [
    polygon(YELLOW, [0, 0, 0], [1, 0, 0], [0, 1, 0], [[-0.38, -0.06], [0.32, -0.06], [0.16, 0.18], [-0.38, 0.2]], 0.24),
    slab(WHITE, [0, 0.05, 0.12], chamfer(0.2, 0.08, 0.03), 0.02),
    tube(METAL, [0.1, 0.28, -0.02], [0.06, 0.52, 0.02], 0.025),
    hoop(DARK, 0.05, -0.32, 0.012, 12, 4, { at: [0.08, -0.04] }),
    hoop(DARK, 0.05, -0.32, 0.012, 12, 4, { at: [-0.08, -0.04] }),
  ],
});

const catamaran = (): Silhouette => ({
  id: "cat",
  kind: "tug",
  pieces: [
    slab(YELLOW, [-0.16, 0, 0], chamfer(0.4, 0.06, 0.03), 0.08),
    slab(YELLOW, [0.16, 0, 0], chamfer(0.4, 0.06, 0.03), 0.08),
    slab(WHITE, [0, 0.05, 0.08], chamfer(0.16, 0.2, 0.04), 0.03),
    tube(METAL, [-0.08, 0.36, 0], [-0.02, 0.56, 0], 0.02),
    tube(METAL, [0.08, 0.36, 0], [0.02, 0.56, 0], 0.02),
  ],
});

const equal = (): Silhouette => ({
  id: "equal",
  kind: "arm",
  pieces: [hoop(GOLD, 0.07, 0.02, 0.012, 14, 5), tube(WHITE, [0, 0.08, 0], [0, 0.7, 0], 0.035), tube(METAL, [0, 0.66, 0], [0, 0.78, 0], 0.06), tube(WHITE, [0, 0.74, 0], [0.4, 1.3, 0], 0.035), hoop(GOLD, 0.06, 1.34, 0.012, 14, 5, { at: [0.42, 0] })],
});

const shoulder = (): Silhouette => ({
  id: "shoulder",
  kind: "arm",
  pieces: [post(METAL, [0, 0], 0.12, 0, 0.12, 0.16, 16), tube(WHITE, [0, 0.16, 0], [0.15, 1.15, 0], 0.03), hoop(GOLD, 0.05, 1.18, 0.01, 14, 5, { at: [0.16, 0] })],
});

const inch = (): Silhouette => ({
  id: "inch",
  kind: "arm",
  pieces: [hoop(GOLD, 0.09, 0.02, 0.016, 14, 5), tube(YELLOW, [0, 0.08, 0], [0, 0.28, 0], 0.07), tube(YELLOW, [0, 0.26, 0], [0.22, 0.5, 0], 0.06), hoop(GOLD, 0.08, 0.54, 0.014, 14, 5, { at: [0.24, 0] })],
});

const crane = (): Silhouette => ({
  id: "crane",
  kind: "arm",
  pieces: [slab(METAL, [0, 0, 0], chamfer(0.08, 0.14, 0.04), 0.08), tube(WHITE, [0, 0.1, 0], [0.55, 1.35, 0], 0.028), hoop(GOLD, 0.06, 1.4, 0.012, 14, 5, { at: [0.58, 0] })],
});

/** Twelve silhouettes: four ring drones, four tugs, four arms. */
export const SILHOUETTES: readonly (() => Silhouette)[] = [dart, horseshoe, manta, beetle, barge, crab, boot, catamaran, equal, shoulder, inch, crane];
