import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { buildPart } from "../src/build/index.ts";
import { check, DRONE, DRONE_FILES, ROCKETS } from "../src/index.ts";
import { ARMS, joints, wristOf } from "../src/model/fleet/drone/layout.ts";
import { dronePieces } from "../src/model/fleet/drone/index.ts";
import { DRONE_SIZE } from "../src/model/fleet/drone/size.ts";
import { meshOf } from "../src/model/pieces.ts";

interface Gltf {
  asset: { extras: Record<string, string> };
  meshes: { primitives: { indices: number; material: number }[] }[];
  accessors: { count: number }[];
  materials: { name: string }[];
  images: unknown[];
}
const glb = (name: string): Gltf => {
  const bytes = new Uint8Array(readFileSync(`models/${name}`));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))) as Gltf;
};
const triangles = (g: Gltf) => g.accessors[g.meshes[0].primitives[0].indices].count / 3;

test("the repair drone is one part of the fleet, about a metre across, with the two working points of a build named", () => {
  assert.ok(ROCKETS["fleet-drone"]);
  assert.equal(ROCKETS["fleet-drone"].maker, "fleet");
  assert.ok(DRONE_SIZE.width > 0.9 && DRONE_SIZE.width < 1.2, `${DRONE_SIZE.width}`);
  // the beam leaves the middle of the lens glass, on the axis, in front of the saucer, along +Z
  const [ex, ey, ez] = DRONE.emitter;
  assert.equal(ex, 0);
  assert.ok(ez > 0.5 && ez < 0.65 && ey > 0.7 && ey < 1.1, `${DRONE.emitter}`);
  assert.deepEqual(DRONE.emitterDirection, [0, 0, 1]);
  // the weld's tip is the end of the left arm's tool, and the gripper is on the right arm, both below the saucer and in front of it
  assert.ok(DRONE.weldTip[0] < -0.15 && DRONE.weldTip[2] > 0.4 && DRONE.weldTip[1] < ey - 0.3, `${DRONE.weldTip}`);
  assert.ok(DRONE.gripper[0] > 0.15 && DRONE.gripper[2] > 0.4 && DRONE.gripper[1] < ey - 0.3, `${DRONE.gripper}`);
});

test("each arm has four segments, each with a housing and a motor, and the joints join end to end", () => {
  for (const arm of ARMS) {
    const js = joints(arm);
    assert.equal(js.length, 4);
    assert.ok(js.length >= 3 && js.length <= 5);
    for (let i = 0; i + 1 < js.length; i++) assert.deepEqual(js[i].to, js[i + 1].from);
    assert.deepEqual(wristOf(arm), js[3]);
  }
  assert.deepEqual(ARMS.map((a) => a.id), ["grip", "weld"]);
});

test("its pieces are the same every time and its code-made mesh stays inside the fleet's mesh limit", () => {
  const a = JSON.stringify(dronePieces(true));
  assert.equal(a, JSON.stringify(dronePieces(true)));
  const part = buildPart("fleet-drone-repair-drone-drone");
  assert.ok(part.glb().bytes.byteLength < 1.25 * 1024 * 1024, `${part.glb().bytes.byteLength}`);
  // the fine detail (bolts, slots) is in the painted model's pieces only
  assert.ok(dronePieces(false, true).length > dronePieces(true).length);
  const faces = meshOf(dronePieces(false, true)).faces;
  assert.ok([...faces.keys()].includes("lamp-blue"), "it has lights that glow");
});

test("the painted model is one draw: one mesh, one primitive, one material, three pictures, near and far", () => {
  for (const name of [DRONE_FILES.near, DRONE_FILES.far]) {
    const g = glb(name);
    assert.equal(g.meshes.length, 1, name);
    assert.equal(g.meshes[0].primitives.length, 1, name);
    assert.deepEqual(g.materials.map((m) => m.name), ["atlas"], name);
    assert.equal(g.images.length, 3, `${name}: colour, metal and roughness, glow`);
    assert.ok(statSync(`models/${name}`).size < 8 * 1024 * 1024, name);
    assert.equal(g.asset.extras.author, "NASA");
  }
  const near = triangles(glb(DRONE_FILES.near));
  const far = triangles(glb(DRONE_FILES.far));
  assert.ok(near >= 100_000 && near <= 200_000, `near ${near}`);
  assert.ok(far >= 1_500 && far <= 4_000, `far ${far}`);
  assert.ok(far * 20 < near);
});

test("every NASA model it is built from is credited, with its page, in the fit report", () => {
  const report = check({ rocket: "fleet-drone", variant: "repair-drone" });
  assert.ok(report.ok, JSON.stringify(report.issues));
  const ids = report.credits.map((c) => c.id).sort();
  assert.deepEqual(ids, ["nasa-cluster-ii", "nasa-curiosity", "nasa-grease-gun", "nasa-hete", "nasa-insight"]);
  for (const c of report.credits) assert.match(c.sourceUrl, /^https:\/\/science\.nasa\.gov\/3d-resources\//);
});
