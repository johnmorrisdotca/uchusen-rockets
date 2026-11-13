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

  test("Pause holds the rings and the address, Play runs them again", async ({ page }) => {
    await page.goto(URL);
    const carry = page.getByTestId("beam-carry");
    const pause = page.getByTestId("beam-pause");
    await expect(carry.locator("[data-ring]").first()).toBeAttached();
    // on a phone the carrying beam can start below the fold, and a page draws nothing out of sight
    await carry.scrollIntoViewIfNeeded();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await expect(pause).toHaveText("Pause");
    await pause.focus();
    await page.keyboard.press("Enter");
    await expect(pause).toHaveAttribute("aria-pressed", "false");
    await expect(pause).toHaveText("Play");
    await expect(page).toHaveURL(/play=0/);
    const held = await carry.innerHTML();
    await page.waitForTimeout(1500);
    expect(await carry.innerHTML()).toBe(held);
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await expect(page).not.toHaveURL(/play=0/);
    await carry.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await carry.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });

  test("play=0 opens held, and Play runs it", async ({ page }) => {
    await page.goto(`${URL}?play=0`);
    const carry = page.getByTestId("beam-carry");
    const pause = page.getByTestId("beam-pause");
    await expect(carry.locator("[data-ring]").first()).toBeAttached();
    // on a phone the carrying beam can start below the fold, and a page draws nothing out of sight
    await carry.scrollIntoViewIfNeeded();
    await expect(pause).toHaveAttribute("aria-pressed", "false");
    const held = await carry.innerHTML();
    await page.waitForTimeout(1500);
    expect(await carry.innerHTML()).toBe(held);
    await pause.click();
    await carry.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await carry.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });

  test("the button names its state in Japanese", async ({ page }) => {
    await page.goto(`${URL}?lang=ja`);
    const pause = page.getByTestId("beam-pause");
    await expect(pause).toHaveText("一時停止");
    await pause.click();
    await expect(pause).toHaveText("再生");
  });

  test("reduced motion opens held with Play ready, and Play runs it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(URL);
    const carry = page.getByTestId("beam-carry");
    const pause = page.getByTestId("beam-pause");
    await expect(carry.locator("[data-ring]").first()).toBeAttached();
    // on a phone the carrying beam can start below the fold, and a page draws nothing out of sight
    await carry.scrollIntoViewIfNeeded();
    await expect(pause).toHaveText("Play");
    const held = await carry.innerHTML();
    await pause.click();
    await carry.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await carry.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });
});
