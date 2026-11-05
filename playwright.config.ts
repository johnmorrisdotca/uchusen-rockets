// The demo's own tests: a real browser, real taps. `pnpm test:demo` builds the site and runs them.
// The server is scripts/dev.ts on port 7901, at the site's real address /uchusen-rockets/: this package's block of ports is 7900 to 7999, and tests use 7901.
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.TEST_PORT ?? 7901);
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
// Every WebGL page is drawn in software (SwiftShader), never on the machine's graphics card: a test run once panicked a Mac's graphics driver.
const gl = { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } };
// WebKit has no software switch, and every page here can draw WebGL, so off CI it runs nothing; CI (a hosted runner, no graphics card) plays them.
const webkitPages = process.env.CI ? undefined : /.*/;

// CI splits the suite so no one job runs past about half an hour: DEMO_SET=freeze is the graphics-memory file alone (it takes half the time of everything else together), DEMO_SET=rest is every other file. Left out, every file runs.
const set = process.env.DEMO_SET;
const testMatch = set === "freeze" ? /[\\/]freeze\.demo\.ts$/ : set === "rest" ? /^(?!.*[\\/]freeze\.demo\.ts$).*\.demo\.(ts|mjs)$/ : "*.demo.{ts,mjs}";

export default defineConfig({
  testDir: "e2e",
  testMatch,
  fullyParallel: true,
  forbidOnly: true,
  // A hosted runner has two cores and draws 3D in software: one test at a time, with room for it.
  workers: process.env.CI ? 1 : 2,
  timeout: process.env.CI ? 240_000 : 120_000,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, reducedMotion: "reduce", locale: "en-US" },
  webServer: { command: "node scripts/dev.ts", env: { PORT: String(port) }, url: `http://127.0.0.1:${port}/uchusen-rockets/`, reuseExistingServer: false },
  projects: [
    { name: "chromium-desk", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, ...gl } },
    { name: "chromium-phone", use: { ...devices["Desktop Chrome"], ...phone, ...gl } },
    // WebKit on a desktop viewport with touch: `isMobile` is Chromium's to honour.
    { name: "webkit-phone", use: { ...devices["Desktop Safari"], viewport: phone.viewport, hasTouch: true }, testIgnore: webkitPages },
  ],
});
