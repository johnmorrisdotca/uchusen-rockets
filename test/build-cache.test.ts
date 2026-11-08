import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("visiting fleet models releases old geometry and rebuilds the same bounds", () => {
  const buildUrl = new URL("../src/build/index.ts", import.meta.url).href;
  const rocketsUrl = new URL("../src/rockets.ts", import.meta.url).href;
  const script = `
    import assert from "node:assert/strict";
    import { build } from ${JSON.stringify(buildUrl)};
    import { ROCKETS } from ${JSON.stringify(rocketsUrl)};
    let first = build({ rocket: "fleet-samples" });
    const oldPieces = new WeakRef(first.parts[0].pieces);
    const bounds = first.parts[0].bounds;
    first = null;
    for (const rocket of Object.values(ROCKETS).filter((one) => one.id.startsWith("fleet-"))) {
      for (const variant of rocket.variants) build({ rocket: rocket.id, variant: variant.id });
      if (rocket.id === "fleet-ship-03") break;
    }
    await new Promise(setImmediate);
    global.gc();
    assert.equal(oldPieces.deref(), undefined, "old fleet geometry is still retained");
    assert.deepEqual(build({ rocket: "fleet-samples" }).parts[0].bounds, bounds);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--expose-gc", "--input-type=module", "--eval", script], { stdio: "pipe" }));
});
