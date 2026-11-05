// Pictures of the three kept machines, and of each one working. The beam in these pictures is narrowed to the machine. The arm is shown with its clamp closed on a truss fixture. `node scripts/drone-shots.ts <folder>`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments } from "@gltf-transform/functions";
import { toGlb } from "../src/build/glb.ts";
import { DRONE_CONCEPTS } from "../src/model/fleet/drone/concepts.ts";
import { discZ, hoop, post, rod } from "../src/model/fleet/detail.ts";
import { meshOf, strut, type Piece, type Vec3 } from "../src/model/pieces.ts";
import { chamfer, polygon } from "../src/model/fleet/drone/plates.ts";

const out = resolve(process.argv[2] ?? "drone");
mkdirSync(join(out, "glb"), { recursive: true });

const part = (at: Vec3): Piece => polygon("hull-orange", at, [0, 1, 0], [1, 0, 0], chamfer(0.05, 0.04, 0.015), 0.03);

/** The carry cone, drawn at a drone's size. The package beam is 1.2 m across, which hides a machine this small. */
function pictureBeam(from: Vec3, to: Vec3): Piece[] {
  const along: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(along[0], along[1], along[2]) || 1;
  const u: Vec3 = [along[0] / length, along[1] / length, along[2] / length];
  const seed: Vec3 = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const raw: Vec3 = [u[1] * seed[2] - u[2] * seed[1], u[2] * seed[0] - u[0] * seed[2], u[0] * seed[1] - u[1] * seed[0]];
  const l = Math.hypot(raw[0], raw[1], raw[2]) || 1;
  const v: Vec3 = [raw[0] / l, raw[1] / l, raw[2] / l];
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const spot = (alongM: number, turn: number, radius: number): Vec3 => {
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    return [from[0] + u[0] * alongM + (v[0] * c + w[0] * s) * radius, from[1] + u[1] * alongM + (v[1] * c + w[1] * s) * radius, from[2] + u[2] * alongM + (v[2] * c + w[2] * s) * radius];
  };
  const narrow = 0.03;
  const wide = 0.11;
  const sides = 16;
  const out: Piece[] = [];
  for (let i = 0; i < sides; i++) {
    const turn = (i / sides) * Math.PI * 2;
    out.push(strut("lamp-blue", spot(0, turn, narrow), spot(length, turn, wide), wide * 0.35, 0.02));
  }
  return out;
}

/** A truss whose grapple fixture sits at `at`, so a clamp there reads as closed on it. */
function trussAt(at: Vec3): Piece[] {
  return [
    rod("hull-grey", [at[0] - 0.6, at[1], at[2]], [at[0] + 0.55, at[1], at[2]], 0.032, 8),
    post("hull-grey", [at[0], at[2]], 0.03, at[1] - 0.18, 0.03, at[1] + 0.18, 8),
    hoop("hull-grey", 0.065, at[1], 0.012, 14, 4, { at: [at[0], at[2]] }),
    hoop("lamp-blue", 0.02, at[1], 0.006, 10, 4, { at: [at[0], at[2]] }),
  ];
}

const jobs: unknown[] = [];
for (const make of DRONE_CONCEPTS) {
  const concept = make();
  const file = join(out, "glb", `${concept.id}.glb`);
  writeFileSync(file, toGlb([{ name: concept.id, mesh: meshOf(concept.pieces), at: [0, 0, 0] }]).bytes);
  if (concept.id === "drone-repair") await mountDrum(file);
  const held: Vec3 = [concept.mouth[0], concept.mouth[1] + 0.32, concept.mouth[2]];
  const working: Piece[] = [...concept.pieces, ...pictureBeam(concept.mouth, held), part(held)];
  if (concept.id.startsWith("arm-")) working.push(...trussAt([0, -0.16, 0.05]));
  if (concept.toolKind === "weld") {
    working.push(discZ("coil-lit", concept.tool[0], concept.tool[1], concept.tool[2], concept.tool[2] + 0.02, 0.02, 8));
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      working.push(rod("lamp-blue", concept.tool, [concept.tool[0] + Math.cos(t) * 0.07, concept.tool[1] + 0.03, concept.tool[2] + Math.sin(t) * 0.05], 0.006, 3));
    }
  } else {
    working.push(rod("coil-lit", concept.tool, [concept.tool[0], concept.tool[1] + 0.16, concept.tool[2]], 0.006, 4));
  }
  const workFile = join(out, "glb", `${concept.id}-work.glb`);
  writeFileSync(workFile, toGlb([{ name: concept.id, mesh: meshOf(working), at: [0, 0, 0] }]).bytes);
  if (concept.id === "drone-repair") await mountDrum(workFile);
  const far = concept.id === "drone-repair";
  const eye = (name: string, at: [number, number, number], up: [number, number, number] = [0, 0, 1]) => ({
    name: `${concept.id}-${name}`,
    eye: at,
    target: (far ? [0, 1.1, 0.2] : [0, 0.3, 0]) as [number, number, number],
    up,
    fov: 30,
    size: [900, 700] as [number, number],
    fill: 0.84,
    look: "painted" as const,
    shadow: 3,
  });
  jobs.push({
    glb: file,
    shots: far
      ? [eye("quarter", [2.8, 5.4, 0.7]), eye("side", [5.2, 1.2, 0.5]), eye("top", [0.3, 0.8, 5], [0, 1, 0])]
      : [eye("quarter", [1.8, 0.5, 1.3]), eye("side", [2.4, 0.2, 0.25]), eye("top", [0.1, 0.3, 2.4], [0, 1, 0])],
  });
  jobs.push({
    glb: workFile,
    shots: [{ ...eye("work", [2.2, 0.4, 1.5]), look: "lit", sun: 0.15, glow: 2.2 }],
  });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(join(out, "jobs.json"));

/** The repair's body is the Cluster II drum, Y up. Turn it so that axis is the drone's up, and keep its foil and panels. */
async function mountDrum(file: string): Promise<void> {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const drum = await io.readBinary(new Uint8Array(readFileSync(join("models", "cluster-ii-body.glb"))));
  const turn = Math.PI / 2;
  const q = [Math.sin(turn / 2), 0, 0, Math.cos(turn / 2)];
  for (const node of drum.getRoot().listNodes()) node.setRotation(q as [number, number, number, number]);
  const fittings = await io.readBinary(new Uint8Array(readFileSync(file)));
  mergeDocuments(fittings, drum);
  await hangArm(io, fittings, [1.15, 1.15, -0.05], 1);
  await hangArm(io, fittings, [-1.15, 1.15, -0.05], -1);
  const scene = fittings.getRoot().listScenes()[0];
  for (const extra of fittings.getRoot().listScenes()) {
    if (extra === scene) continue;
    for (const child of extra.listChildren()) scene.addChild(child);
    extra.dispose();
  }
  const keep = fittings.getRoot().listBuffers()[0];
  for (const accessor of fittings.getRoot().listAccessors()) {
    if (accessor.getBuffer() && accessor.getBuffer() !== keep) {
      const array = accessor.getArray();
      accessor.setBuffer(keep);
      if (array) accessor.setArray(array);
    }
  }
  for (const buffer of fittings.getRoot().listBuffers()) if (buffer !== keep) buffer.dispose();
  writeFileSync(file, await io.writeBinary(fittings));
}

/** One InSight arm, hung under the drum. `sign` mirrors it to the other side. The arm file stands on Y; this turns that axis downward. */
async function hangArm(io: NodeIO, fittings: Awaited<ReturnType<NodeIO["readBinary"]>>, at: [number, number, number], sign: number): Promise<void> {
  const arm = await io.readBinary(new Uint8Array(readFileSync(join("models", "insight-arm-arm.glb"))));
  const scene = arm.getRoot().listScenes()[0];
  const parent = arm.createNode(sign < 0 ? "arm-right" : "arm-left");
  for (const child of scene.listChildren().slice()) parent.addChild(child);
  scene.addChild(parent);
  const down = -Math.PI / 2;
  parent.setRotation([Math.sin(down / 2), 0, 0, Math.cos(down / 2)]);
  parent.setTranslation(at);
  parent.setScale([sign * 0.42, 0.42, 0.42]);
  mergeDocuments(fittings, arm);
}
