// Hanabusa's painted ring interiors (concepts for MODULES-433): `node scripts/ship-01-interiors.ts <folder>` builds the living ring and the garden ring opened at the cut, with the painted fill, and draws them from the cut's mouth, from street level, from a terrace and from above with
// scripts/ship-01-render.ts. One browser at a time (the caller holds the lock).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { interiorScene } from "../src/model/fleet/ship-01/interiors.ts";
import { geoOf, ground, rings } from "../src/model/fleet/ship-01/rings.ts";
import { meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "interiors");
mkdirSync(join(out, "glb"), { recursive: true });
type V3 = [number, number, number];
const rad = (a: number): number => (a * Math.PI) / 180;
const at = (az: number, r: number, y: number): V3 => [r * Math.sin(rad(az)), y, r * Math.cos(rad(az))];
const upAt = (az: number): V3 => [-Math.sin(rad(az)), 0, -Math.cos(rad(az))];
const jobs: unknown[] = [];
for (const use of ["living", "hydro"] as const) {
  const ring = rings().find((r) => r.use === use)!;
  const rg = ground(geoOf({ ...ring, y: 0 }));
  const files: Record<string, string> = {};
  for (const level of ["fine", "coarse"] as const) {
    const start = performance.now();
    const pieces: Piece[] = interiorScene(use, 58, level);
    const mesh = meshOf(pieces);
    const took = Math.round(performance.now() - start);
    const file = join(out, "glb", `${use}-${level}.glb`);
    const glb = toGlb([{ name: use, mesh, at: [0, 0, 0] }]).bytes;
    writeFileSync(file, glb);
    files[level] = file;
    let triangles = 0;
    for (const faces of mesh.faces.values()) triangles += faces.indices.length / 3;
    console.log(use, level, "ground radius", rg.toFixed(1), "pieces", pieces.length, "triangles", triangles, "build+mesh ms", took, "glb MB", (glb.length / 1e6).toFixed(1));
  }
  const shot = (name: string, eye: V3, target: V3, up: V3, fov: number, shadow = 120, extra: Record<string, unknown> = {}) => ({ name: `${use}-${name}`, eye, target, up, size: [1800, 900], fov, shadow, shadowBias: 0.004, look: "painted", daylight: true, ...(use === "hydro" ? { golden: true } : {}), background: "#79a9e0", sunDir: [...upAt(75).map((v, i) => v + (i === 1 ? 0.35 : 0))] as V3, ...extra });
  jobs.push({ glb: files.fine, shots: [
    shot("mouth", at(61, rg - 3.4, 1.5), at(128, rg - 11, 0.4), upAt(61), 78, 150),
    shot("street", at(63, rg - 1.7, 2.2), at(98, rg - 2.2, 4), upAt(63), 62, 100),
    shot("terrace", at(70, rg - 7, -4), at(88, rg - 4, 9), upAt(70), 58, 80),
    shot("terrace-close", at(80, rg - 5, 3), at(92, rg - 3, 8.5), upAt(80), 50, 50),
    shot("above", at(78, rg - 38, 0), at(100, rg - 2, 0), upAt(78), 62, 130),
  ] });
  jobs.push({ glb: files.coarse, shots: [shot("mouth-coarse", at(61, rg - 3.4, 1.5), at(128, rg - 11, 0.4), upAt(61), 78, 150)] });
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs));
const run = spawnSync("node", ["scripts/ship-01-render.ts", join(out, "jobs.json"), join(out, "renders")], { stdio: "inherit" });
process.exit(run.status ?? 1);
