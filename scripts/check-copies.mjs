// The copy check. jscpd reads demo/ and src/ and this fails when a new copy appears. The two numbers are the copies already
// here. Lower them when a copy is removed. Never raise them to let a new one through.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { relative, join } from "node:path";
import process from "node:process";

const CLONES = 24;
const LINES = 426;

const dir = mkdtempSync(join(tmpdir(), "jscpd-"));
let code = 0;
try {
  const run = spawnSync(
    join("node_modules", ".bin", "jscpd"),
    ["src", "demo", "--min-lines", "8", "--min-tokens", "60", "--reporters", "json", "--output", dir, "--silent"],
    { encoding: "utf8" },
  );
  let report;
  try {
    report = JSON.parse(readFileSync(join(dir, "jscpd-report.json"), "utf8"));
  } catch {
    process.stderr.write(run.stderr || run.stdout || "jscpd wrote no report\n");
    code = 1;
    report = null;
  }
  if (report) {
    const total = report.statistics.total;
    const clones = total.clones;
    const lines = total.duplicatedLines;
    if (clones === CLONES && lines === LINES) process.stdout.write(`copies: ${clones} clones, ${lines} lines\n`);
    else {
      process.stderr.write(`copies moved: ${clones} clones (${CLONES} kept), ${lines} lines (${LINES} kept)\n`);
      for (const one of report.duplicates) {
        const left = relative(process.cwd(), one.firstFile.name);
        const right = relative(process.cwd(), one.secondFile.name);
        process.stderr.write(`${one.lines} ${left} ${right}\n`);
      }
      if (clones < CLONES || lines < LINES) process.stderr.write("a copy was removed: lower CLONES and LINES in scripts/check-copies.mjs\n");
      else process.stderr.write("a new copy: use the shared part, or the numbers stay\n");
      code = 1;
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
