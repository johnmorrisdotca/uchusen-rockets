// The three bay ships, from the same build the viewer plays, standing in the yard at true size.
import { Group, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { build } from "../src/build/index.ts";
import { buildOf, playFrame, type PlayStep } from "../src/buildPlay.ts";
import { SwarmRig, type SwarmPose } from "../src/element/swarm.ts";
import type { PartMesh } from "../src/model/pieces.ts";
import { berthRing, carries, grounded, swarmCount, swarmJobs } from "../src/swarm.ts";

export type BayId = "hall" | "spine" | "dock";

const SPECS: { id: BayId; rocket: string; variant: string; at: readonly [number, number, number]; rest: number }[] = [
  { id: "hall", rocket: "fleet-kaminari", variant: "fleet-kaminari", at: [0, 160, 0], rest: 0.45 },
  { id: "spine", rocket: "fleet-ship-03", variant: "miyamoto", at: [760, 180, 0], rest: 1 },
  { id: "dock", rocket: "fleet-ship-01", variant: "hanabusa", at: [1520, 180, 20], rest: 1 },
];

interface Bay {
  id: BayId;
  variant: string;
  rest: number;
  steps: readonly PlayStep[];
  slots: Map<string, Group>;
  places: Map<string, [number, number, number]>;
  boxes: Map<string, { min: [number, number, number]; max: [number, number, number] }>;
  swarm: SwarmRig;
  scale: number;
  length: [number, number];
}

/** Builds the three ships once and parents them on `root`. `addMesh` is the yard's own mesh builder. */
export function mountBays(root: Object3D, addMesh: (mesh: PartMesh, parent: Group) => void, wake: () => void): {
  paint: (active: BayId | null, at: number, reduced: boolean) => void;
  steps: (id: BayId) => readonly PlayStep[];
  rest: (id: BayId) => number;
  variant: (id: BayId) => string;
} {
  const bays = SPECS.map((spec): Bay => {
    const made = build({ rocket: spec.rocket, variant: spec.variant }, { detail: "coarse" });
    const group = new Group();
    group.position.set(spec.at[0], spec.at[1], spec.at[2]);
    const slots = new Map<string, Group>();
    const places = new Map<string, [number, number, number]>();
    const boxes = new Map<string, { min: [number, number, number]; max: [number, number, number] }>();
    for (const place of made.placesOf("together")) places.set(place.slot, [...place.at]);
    let longest = 1;
    const ys: number[] = [];
    for (const part of made.parts) {
      const at = places.get(part.slot) ?? [0, 0, 0];
      const slot = new Group();
      slot.position.set(at[0], at[1], at[2]);
      addMesh(part.mesh, slot);
      group.add(slot);
      slots.set(part.slot, slot);
      boxes.set(part.slot, { min: [...part.bounds.min], max: [...part.bounds.max] });
      ys.push(at[1]);
      const span = Math.max(part.bounds.max[0] - part.bounds.min[0], part.bounds.max[1] - part.bounds.min[1], part.bounds.max[2] - part.bounds.min[2]);
      longest = Math.max(longest, span);
    }
    root.add(group);
    return {
      id: spec.id,
      variant: spec.variant,
      rest: spec.rest,
      steps: buildOf(spec.variant) ?? [],
      slots,
      places,
      boxes,
      swarm: new SwarmRig(group, (file) => new GLTFLoader().loadAsync(new URL(`assets/models/${file}`, document.baseURI).href).then((gltf) => gltf.scene), wake),
      scale: Math.min(16, Math.max(1, longest / 50)),
      length: [Math.min(...ys), Math.max(...ys)],
    };
  });

  const paint = (active: BayId | null, at: number, reduced: boolean): void => {
    for (const bay of bays) {
      const here = active === bay.id ? at : bay.rest;
      const frame = playFrame(bay.steps, here);
      for (const [slot, group] of bay.slots) {
        const step = bay.steps.find((one) => one.slot === slot);
        if (!step) {
          group.visible = here >= 0.999;
          continue;
        }
        const seated = grounded(step.slot, frame.done);
        group.visible = seated && (frame.done.includes(step.slot) || frame.going.includes(step.slot));
      }
      const shown = [...bay.places.entries()].filter(([slot]) => bay.slots.get(slot)?.visible);
      const dock: [number, number, number] = shown.length === 0 ? [40, 0, 0] : [Math.max(...shown.map(([, place]) => place[0])) + 40, shown.reduce((sum, [, place]) => sum + place[1], 0) / shown.length, 0];
      const count = swarmCount(bay.variant) ?? 0;
      const working = active === bay.id;
      const open = frame.going.filter((slot) => grounded(slot, frame.done));
      const jobs = working && open.length > 0 ? swarmJobs(bay.steps.filter((step) => !frame.going.includes(step.slot) || open.includes(step.slot)), count, here) : [];
      const poses: SwarmPose[] = carries(jobs, here, bay.steps, (slot) => bay.places.get(slot), dock, bay.length).map((pose) => {
        const box = bay.boxes.get(pose.slot);
        return {
          where: pose.where,
          part: pose.part,
          weld: pose.duty === "work",
          duty: pose.duty,
          rank: pose.rank,
          skin: box
            ? { min: [pose.part[0] + box.min[0], pose.part[1] + box.min[1], pose.part[2] + box.min[2]], max: [pose.part[0] + box.max[0], pose.part[1] + box.max[1], pose.part[2] + box.max[2]] }
            : undefined,
        };
      });
      bay.swarm.show(poses, jobs.length ? [] : berthRing(count, dock), dock, reduced || !working, bay.scale);
    }
  };

  return {
    paint,
    steps: (id) => bays.find((bay) => bay.id === id)?.steps ?? [],
    rest: (id) => bays.find((bay) => bay.id === id)?.rest ?? 0,
    variant: (id) => bays.find((bay) => bay.id === id)?.variant ?? "",
  };
}
