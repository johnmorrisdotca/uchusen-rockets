// The SPX repair drone: a small work drone, about a metre across, that flies round ships under construction and mends them. This package's own design, so every figure is blank and says it is a design. The painted look
// is built from NASA's models (Cluster II, the High Energy Transient Explorer, the Curiosity rover, the InSight lander and a grease gun) and this package's own detail.
import { DRONE } from "../model/fleet/drone/index.ts";
import { DRONE_SIZE } from "../model/fleet/drone/size.ts";
import { blank, type Inspector, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(2))} m, as designed`;

const r = (p: readonly number[]) => p as readonly [number, number, number];

const inspector: Inspector = {
  sections: [
    { id: "lens", name: "Camera lens and tractor-beam emitter", job: "A lens that sees the work and, in a build, sends the beam that carries a part", slot: "drone", at: r(DRONE.emitter), inside: false },
    { id: "pods", name: "Thruster pods", job: "Two cold-gas pods with red noses, for short moves round a hull", slot: "drone", at: r([0.262, DRONE.emitter[1], 0.58]), inside: false },
    { id: "antennas", name: "Antennas", job: "Two whips with lights on their tips, so a crew can see where the drone is", slot: "drone", at: r([0.2, DRONE.emitter[1] + 0.58, -0.1]), inside: false },
    { id: "core", name: "Core drum", job: "The power and control drum under the saucer, in gold foil, with the ring light round it", slot: "drone", at: r([0, DRONE.emitter[1] - 0.2, 0]), inside: false },
    { id: "grip", name: "Grip arm", job: "Four segments ending in a five-claw gripper", slot: "drone", at: r(DRONE.gripper), inside: false },
    { id: "weld", name: "Weld arm", job: "Four segments ending in a welding tool", slot: "drone", at: r(DRONE.weldTip), inside: false },
  ],
  places: { drone: [0, 0, 0] },
  spec: [
    ["Width", `${DRONE_SIZE.width.toFixed(2)} m (the saucer is ${DRONE.diameter.toFixed(2)} m across)`],
    ["Length", `${DRONE_SIZE.length.toFixed(2)} m`],
    ["Height", `${DRONE_SIZE.height.toFixed(2)} m to the antenna tips`],
    ["Tractor beam emitter", `${DRONE.emitter.map((n) => n.toFixed(2)).join(", ")} m, the middle of the lens glass, beam along +Z`],
    ["Weld tip", `${DRONE.weldTip.map((n) => n.toFixed(2)).join(", ")} m, the end of the left arm's tool`],
  ],
  notes: {
    propulsion: ["Two thruster pods and an attitude ring under the saucer."],
    construction: ["A layered white saucer shell, its top deck raised and domed, round a gold-foil core drum; the equipment block, arms, gripper and tool are NASA's models and this package's own detail."],
    history: [],
    equipment: ["Camera lens and tractor-beam emitter.", "Two jointed arms: a five-claw gripper and a welding tool.", "Two antennas with lights, a cyan ring light under the rim."],
  },
  insets: [],
};

/** The repair drone's variant. */
export const DRONE_VARIANTS: readonly Variant[] = [
  {
    id: "repair-drone",
    rocket: "fleet-drone",
    name: "SPX repair drone",
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots: ["drone"],
    note: "A work drone for the construction swarm: a camera lens that is also the tractor-beam emitter, two thruster pods, two antennas, a cyan ring light and two arms, a gripper and a welding tool. The painted look is built from NASA's models.",
    inspector,
    view: { tiltMax: 90 },
    facts: {
      height: fiction(metres(DRONE_SIZE.height)),
      diameter: fiction(metres(DRONE_SIZE.width)),
      parts: { drone: fiction(metres(DRONE_SIZE.height)) },
      engines: {},
      more: {},
    },
  },
];
