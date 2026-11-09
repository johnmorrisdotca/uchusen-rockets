// One CI job's share of the demo's browser tests: node scripts/ci-shard.mjs <project> <job> <jobs> [playwright arguments].
// It lists the tests, gives each its measured seconds from scripts/demo-times.json (by a short hash of project and title; a test not in it counts for half a second), fills the jobs longest first so every job takes about the same, and plays this job's tests.
// A test that is new or renamed is still played by one job: only its share is a guess.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const [project, jobText, jobsText, ...extra] = process.argv.slice(2);
const job = Number(jobText);
const jobs = Number(jobsText);
const run = (args, options = {}) => spawnSync("pnpm", ["exec", "playwright", "test", `--project=${project}`, ...args], { stdio: "inherit", ...options });
if (jobs === 1) process.exit(run(extra).status ?? 1);

const listed = spawnSync("pnpm", ["exec", "playwright", "test", "--list", "--reporter=json", `--project=${project}`, ...extra], { encoding: "utf8", maxBuffer: 1 << 28 });
if (listed.status !== 0) {
  process.stderr.write(listed.stderr);
  process.exit(1);
}
const times = JSON.parse(readFileSync(new URL("./demo-times.json", import.meta.url), "utf8"));
const tests = [];
const walk = (suite, path) => {
  for (const spec of suite.specs ?? []) {
    const key = `${project}|${[...path, spec.title].join(" › ")}`;
    tests.push({ key, title: spec.title, seconds: times[createHash("sha1").update(key).digest("hex").slice(0, 10)] ?? 0.5 });
  }
  for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
};
for (const file of JSON.parse(listed.stdout).suites) walk(file, [file.title]);
tests.sort((a, b) => b.seconds - a.seconds || (a.key < b.key ? -1 : 1));
const loads = Array.from({ length: jobs }, () => 0);
const mine = [];
for (const test of tests) {
  const to = loads.indexOf(Math.min(...loads));
  loads[to] += test.seconds;
  if (to === job - 1) mine.push(test);
}
console.log(`job ${job} of ${jobs}: ${mine.length} of ${tests.length} tests, about ${Math.round(loads[job - 1])} s (the jobs: ${loads.map((one) => Math.round(one)).join(" ")})`);
if (mine.length === 0 || process.env.PLAN_ONLY) process.exit(0);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
process.exit(run([...extra, "--grep", `(?:${[...new Set(mine.map((test) => escape(test.title)))].join("|")})$`]).status ?? 1);
