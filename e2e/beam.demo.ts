// The beam page draws the carry in both looks, and the reduced-motion picture is the dotted one.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/beam.html";

test("the beam page shows the light, the line and the dotted line on a dark ground", async ({ page }) => {
  await page.goto(URL);
  const carry = page.getByTestId("beam-carry");
  await expect(carry.locator("svg")).toBeVisible();
  await expect(carry.locator("svg rect")).toHaveAttribute("fill", "#070b14");
  await expect(carry.locator("[data-beam=light]")).toBeVisible();
  await expect(carry.locator("stop[stop-opacity='0']")).toHaveCount(1);
  await expect(page.getByTestId("beam-line").locator("[data-beam=line]")).toBeVisible();
  await expect(page.getByTestId("beam-dotted").locator("[data-beam=still]")).toBeVisible();
  await expect(page.getByTestId("beam-carry").locator("[data-ring]").first()).toBeVisible();
});

test.describe("the beam page opens moving", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the carrying beam's rings run to the part: its picture changes between two frames, and the others stay still", async ({ page }) => {
    await page.goto(URL);
    const carry = page.getByTestId("beam-carry");
    await expect(carry.locator("[data-ring]").first()).toBeAttached();
    const first = await carry.screenshot();
    // the markup, not a screenshot: a scroll to the carrying beam on a phone moves the line a fraction of a pixel and changes its antialiasing, and the picture is the same
    const line = await page.getByTestId("beam-line").innerHTML();
    await expect.poll(async () => !(await carry.screenshot()).equals(first), { timeout: 30_000 }).toBe(true);
    expect(await page.getByTestId("beam-line").innerHTML()).toBe(line);
  });

  test("reduced motion keeps the carrying beam still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(URL);
    const carry = page.getByTestId("beam-carry");
    await expect(carry.locator("[data-ring]").first()).toBeAttached();
    const first = await carry.screenshot();
    await page.waitForTimeout(1500);
    expect((await carry.screenshot()).equals(first)).toBe(true);
  });
});
