// shots.ts opens site/element-check.html. That page and its script are written by `pnpm site`, so a fresh worktree has neither and the picture run used to fail. It builds the site first when they are missing.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function shotsSiteReady(root: string): boolean {
  return existsSync(join(root, "site", "element-check.html")) && existsSync(join(root, "site", "js", "element-check.js"));
}

/** Build the demo site when the element-check page is not there yet. `run` is the command, so a test can refuse the build without starting one. */
export function ensureShotsSite(root: string, run?: (command: string, args: string[]) => number): void {
  if (shotsSiteReady(root)) return;
  const status = (run ?? ((command, args) => spawnSync(command, args, { cwd: root, stdio: "inherit" }).status ?? 1))("pnpm", ["site"]);
  if (status !== 0 || !shotsSiteReady(root)) throw new Error(`pnpm site failed (${status}): shots needs site/element-check.html`);
}
