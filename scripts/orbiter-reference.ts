// Writes test/data/orbiter-elements.json: what Orbiter's own Elements class (Src/Orbiter/Element.cpp, compiled unchanged) gives for a few
// orbits, so test/physics-orbiter.test.ts can hold the port to it without Orbiter. By hand, never in the build or CI:
//
//   ORBITER_SOURCE=<a checkout of github.com/orbitersim/orbiter> node scripts/orbiter-reference.ts
//
// Needs a C++ compiler (`c++`). Element.cpp, Element.h, Vecmat.h and Vecmat.cpp are copied from the checkout into a scratch folder with
// the stand-in headers of scripts/orbiter-reference/stubs, and Vecmat.h loses two default arguments on friend declarations that only
// Microsoft's compiler takes. Orbiter's frame is left-handed with y as the pole, so y and z swap on the way in and out.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type V = [number, number, number];
interface Case { name: string; gm: number; position: V; velocity: V; times: number[]; anomalies: number[] }

const root = fileURLToPath(new URL("..", import.meta.url));
const source = process.env.ORBITER_SOURCE;
if (!source) {
  console.error("Set ORBITER_SOURCE to a checkout of https://github.com/orbitersim/orbiter");
  process.exit(1);
}
const EARTH = 3.986004418e14;
const circular = Math.sqrt(EARTH / 7_000_000);
const tilt = (63.4 * Math.PI) / 180;
const CASES: Case[] = [
  { name: "low orbit, tilted and slightly oval", gm: EARTH, position: [7_000_000, 100_000, 200_000], velocity: [100, 7_400, 1_500], times: [0, 600, 1_800, 5_000, -1_200, 20_000], anomalies: [0.3, 1.5, 3.0, 4.5, 6.0] },
  { name: "Molniya-like, 63.4 degrees", gm: EARTH, position: [6_900_000, 0, 0], velocity: [0, 10_000 * Math.cos(tilt), 10_000 * Math.sin(tilt)], times: [0, 3_600, 21_600, 43_000, -7_200], anomalies: [0.3, 1.5, 3.0, 4.5, 6.0] },
  { name: "transfer orbit, nearly in the equator", gm: EARTH, position: [6_563_000, 0, 1], velocity: [0, 10_240, 0.5], times: [0, 1_000, 19_000, 40_000], anomalies: [0.3, 1.5, 3.0, 4.5, 6.0] },
  { name: "circle, tilted 51.6 degrees", gm: EARTH, position: [7_000_000, 0, 0], velocity: [0, circular * Math.cos((51.6 * Math.PI) / 180), circular * Math.sin((51.6 * Math.PI) / 180)], times: [0, 1_000, 4_000], anomalies: [0.3, 1.5, 3.0, 4.5, 6.0] },
  { name: "oval in the equator", gm: EARTH, position: [8_000_000, 0, 0], velocity: [-500, 6_000, 0], times: [0, 2_000, 9_000], anomalies: [0.3, 1.5, 3.0, 4.5, 6.0] },
  { name: "escape, hyperbolic", gm: EARTH, position: [7_000_000, 0, 0], velocity: [0, 12_000, 500], times: [0, 3_600, 20_000, -1_800], anomalies: [0.3, 1.5, -1.0, 0.8] },
];

const work = mkdtempSync(join(tmpdir(), "orbiter-reference-"));
try {
  const src = join(source, "Src", "Orbiter");
  for (const file of ["Element.cpp", "Element.h", "Vecmat.h", "Vecmat.cpp"]) copyFileSync(join(src, file), join(work, file));
  const stubs = join(root, "scripts", "orbiter-reference", "stubs");
  for (const file of readdirSync(stubs)) copyFileSync(join(stubs, file), join(work, file));
  copyFileSync(join(root, "scripts", "orbiter-reference", "harness.cpp"), join(work, "harness.cpp"));
  const vecmat = join(work, "Vecmat.h");
  writeFileSync(vecmat, readFileSync(vecmat, "latin1").replaceAll("int *sing = 0);", "int *sing);"), "latin1");
  execFileSync("c++", ["-std=c++17", "-O1", "-w", "-I.", "-o", "harness", "harness.cpp", "Element.cpp", "Vecmat.cpp"], { cwd: work, stdio: "inherit" });
  const swap = (v: V): V => [v[0], v[2], v[1]];
  const input = CASES.map((c) => [...[c.gm, ...swap(c.position), ...swap(c.velocity), ...c.times].map((n) => n.toPrecision(17)), "|", ...c.anomalies.map((n) => n.toPrecision(17))].join(" ")).join("\n");
  const answers = JSON.parse(execFileSync(join(work, "harness"), { input, encoding: "utf8" })) as { states: { t: number; position: V; velocity: V }[]; anomalies: { position: V; velocity: V }[]; period: number; apoapsis: number }[];
  const commit = execFileSync("git", ["-C", source, "log", "-1", "--format=%H %cs"], { encoding: "utf8" }).trim();
  const out = {
    source: `Orbiter, https://github.com/orbitersim/orbiter, commit ${commit}, Src/Orbiter/Element.cpp (Elements::Calculate, PosVel, PosVel_TA, Spd_TA and MeanAnomaly_from_TrueAnomaly), Copyright (c) 2000-2026 Martin Schweiger, MIT licence`,
    frame: "right-handed, z the pole (Orbiter's y and z swapped back)",
    cases: CASES.map((c, k) => {
      const answer = answers[k]!;
      return {
        ...c,
        orbiter: {
          ...answer,
          period: answer.period < 0 ? null : answer.period,
          apoapsis: answer.apoapsis < 0 ? null : answer.apoapsis,
          states: answer.states.map((s) => ({ t: s.t, position: swap(s.position), velocity: swap(s.velocity) })),
          anomalies: answer.anomalies.map((s) => ({ ...s, position: swap(s.position), velocity: swap(s.velocity) })),
        },
      };
    }),
  };
  writeFileSync(join(root, "test", "data", "orbiter-elements.json"), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`wrote test/data/orbiter-elements.json: ${CASES.length} orbits from ${commit}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
