// A kit ship swaps modules by collar, the choice stays in the address, and every fleet ship with an assembly names its flights. Run under CPU_THROTTLE=4 for the slow-machine check.
import { expect, type Page } from "@playwright/test";
import { test } from "./base.ts";

const hauler = "/uchusen-rockets/?rocket=fleet-samples&variant=hauler&look=line";
const box = "container-12-5";

test.beforeEach(async ({ page, browserName }) => {
  const rate = Number(process.env.CPU_THROTTLE ?? "1");
  if (rate > 1 && browserName === "chromium") await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
});

const partIn = (page: Page, slot: string) =>
  page.locator("#hero").evaluate((node, which) => {
    const report = (node as unknown as { report: { parts: { slot: string; part: { id: string } }[] } | null }).report;
    return report?.parts.find((part) => part.slot === which)?.part.id ?? "";
  }, slot);

test("a place on a kit ship takes only the modules whose collar mates, and the choice stays in the address", async ({ page }) => {
  await page.goto(hauler);
  await expect(page.getByTestId("swap-field")).toBeVisible();
  await expect(page.getByTestId(`swap-${box}-container-12`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`swap-${box}-container-12-cold`)).toBeVisible();
  await expect(page.locator(`[data-slot=${box}] button`)).toHaveCount(2);
  await page.getByTestId(`swap-${box}-container-12-cold`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("swap")).toBe(`${box}:container-12-cold`);
  await expect.poll(() => partIn(page, box), { timeout: 20000 }).toBe(`fleet-samples-hauler-${box}-as-container-12-cold`);
  await page.reload();
  await expect(page.getByTestId(`swap-${box}-container-12-cold`)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => partIn(page, box), { timeout: 20000 }).toBe(`fleet-samples-hauler-${box}-as-container-12-cold`);
  await page.getByTestId(`swap-${box}-container-12`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("swap")).toBeNull();
});

test("an address that names a module that does not mate is dropped", async ({ page }) => {
  await page.goto(`${hauler}&swap=${box}:habitat-drum-large`);
  await expect(page.getByTestId(`swap-${box}-container-12`)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("swap")).toBeNull();
  expect(await partIn(page, box)).not.toContain("habitat-drum-large");
});

test("the modules are buttons in one wrapping row, with no fold", async ({ page }) => {
  await page.goto(hauler);
  await expect(page.getByTestId("swap-field")).toBeVisible();
  expect(await page.getByTestId("swap-field").locator("details, summary, [aria-expanded]").count()).toBe(0);
  const row = await page.locator("#swaps").evaluate((node) => ({ display: getComputedStyle(node).display, direction: getComputedStyle(node).flexDirection, wrap: getComputedStyle(node).flexWrap }));
  expect(row).toEqual({ display: "flex", direction: "row", wrap: "wrap" });
  expect(await page.locator("#swaps button").count()).toBeGreaterThan(8);
});

for (const [rocket, variant, first] of [["fleet-samples", "hauler", "Flight 1: "], ["fleet-02", "fleet-02", "Flight 1: Truss spine"], ["fleet-kyotori", "kyotori-a", "Flight 1: "]]) {
  test(`${rocket} names its first flight, and reduced motion shows stills, not a player`, async ({ page }) => {
    await page.goto(`/uchusen-rockets/?rocket=${rocket}&variant=${variant}&build=on&at=0`);
    await page.locator('[data-testid="panel-build"]').click();
    const bar = page.locator("uchusen-build");
    await expect(bar.getByTestId("build-now")).toContainText(first);
    await expect(bar.getByTestId("build-play")).toBeDisabled();
    await expect(bar.getByTestId("build-still-6")).toBeVisible();
    await bar.getByTestId("build-still-6").click();
    await expect(bar.getByTestId("build-now")).toContainText(/Flight \d+: /);
  });
}
