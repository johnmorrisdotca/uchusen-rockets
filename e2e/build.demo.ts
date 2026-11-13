// The build row: a ship with an order shows play, the rates and, under reduced motion, numbered stills. A rocket does not.
import { expect, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";
import { buildOf, playFrame } from "../src/buildPlay.ts";

test("the build row is on a ship with an order, and a still keeps the place", async ({ page }) => {
  const steps = buildOf("miyamoto");
  if (!steps) throw new Error("Miyamoto has no build");
  const day = (at: number) => String(Math.floor(playFrame(steps, at).day));

  await page.goto("/uchusen-rockets/?rocket=starship&variant=v3");
  await foldPicker(page);
  await expect(page.locator("#build-field")).toBeHidden();

  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&build=on&at=0.25");
  await foldPicker(page);
  await page.locator('[data-testid="panel-build"]').click();
  await expect(page.locator("#build-field")).toBeVisible();
  const bar = page.locator("uchusen-build");
  await expect(bar.getByTestId("build-play")).toBeDisabled();
  await expect(bar.getByTestId("build-still-1")).toBeVisible();
  await expect(bar.getByTestId("build-still-6")).toBeVisible();
  await expect(bar.getByTestId("build-now")).toContainText(day(0.25));
  await bar.getByTestId("build-still-4").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("at")).toBe("0.6000");
  await expect(bar.getByTestId("build-now")).toContainText(day(0.6));
});

const WITH_ORDER = [
  "/uchusen-rockets/?rocket=fleet-ship-ariake&variant=ariake",
  "/uchusen-rockets/?rocket=fleet-ship-01&variant=hanabusa",
  "/uchusen-rockets/?rocket=fleet-kaminari&variant=fleet-kaminari",
  "/uchusen-rockets/?rocket=fleet-emiake&variant=fleet-emiake",
  "/uchusen-rockets/?rocket=fleet-romaryu&variant=fleet-romaryu",
];
const WITHOUT_ORDER = ["/uchusen-rockets/?rocket=fleet-kyotori&variant=kyotori", "/uchusen-rockets/?rocket=fleet-02&variant=fleet-02"];

// One test a ship: each is a full page load, and seven of them in one test spent the whole test's time on a slow runner.
for (const url of WITH_ORDER) {
  test(`the row is on for ${new URL(url, "http://x").searchParams.get("rocket")}, a ship with an order`, async ({ page }) => {
    await page.goto(url);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    await expect(page.locator("#build-field")).toBeVisible();
    await expect(page.locator("uchusen-build").getByTestId("build-play")).toBeDisabled();
  });
}
for (const url of WITHOUT_ORDER) {
  test(`the row is off for ${new URL(url, "http://x").searchParams.get("rocket")}, a ship without an order`, async ({ page }) => {
    await page.goto(url);
    await foldPicker(page);
    // the row is hidden in the page's own markup until the page has chosen the ship, so "hidden" proves nothing before then: wait for the ship's facts, which the same step writes
    await expect(page.locator("#facts")).not.toBeEmpty();
    // the Build tab is what the page offers or withholds: the field itself is also hidden inside a panel that is not open, so on its own it would pass for a ship that has an order
    await expect(page.locator('[data-testid="panel-build"]')).toBeHidden();
    await expect(page.locator("#build-field")).toBeHidden();
  });
}

test.describe("the build plays", () => {
  test.use({ reducedMotion: "no-preference" });
  const miyamoto = "/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto";

  test("1x is real time: the clock gains about one story second a second, and Pause shows while it plays", async ({ page }) => {
    await page.goto(miyamoto);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    const bar = page.locator("uchusen-build");
    await expect(bar.getByTestId("build-now")).toContainText("Day 0, 00:00:00");
    await expect(bar.locator("kazoku-speed-buttons").getByRole("button", { name: "1×" })).toHaveAttribute("aria-pressed", "true");
    await expect(bar.locator("kazoku-speed-buttons").getByRole("button", { name: "86400×" })).toBeVisible();
    await bar.getByTestId("build-play").click();
    await expect(bar.getByTestId("build-play")).toHaveText("Pause");
    const storyS = async () => {
      const text = await bar.getByTestId("build-now").innerText();
      const clock = text.match(/(\d+):(\d{2}):(\d{2})/);
      const day = Number(text.match(/Day (\d+)/)?.[1] ?? 0);
      if (!clock) return day * 86_400;
      return day * 86_400 + Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    };
    await expect.poll(storyS, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    const wall = Date.now();
    const first = await storyS();
    await page.waitForTimeout(3_000);
    const elapsed = (Date.now() - wall) / 1000;
    const gained = (await storyS()) - first;
    expect(gained).toBeGreaterThanOrEqual(1);
    expect(gained).toBeLessThanOrEqual(elapsed + 2);
  });

  test("repeat wraps from the end to the keel, and the address keeps the speed and the repeat", async ({ page }) => {
    await page.goto(miyamoto);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    const bar = page.locator("uchusen-build");
    const speeds = bar.locator("kazoku-speed-buttons");
    await speeds.getByRole("button", { name: "60×" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("build-speed")).toBe("60");
    await bar.getByTestId("build-repeat").click();
    await expect.poll(() => new URL(page.url()).searchParams.get("repeat")).toBe("on");
    await speeds.getByRole("button", { name: "10000×" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("build-speed")).toBe("10000");
    await speeds.getByRole("button", { name: "100000×" }).click();
    await bar.getByTestId("build-range").fill("0.995");
    await expect(bar.getByTestId("build-now")).not.toContainText("Day 0");
    await bar.getByTestId("build-play").click();
    await expect.poll(async () => {
      const day = Number((await bar.getByTestId("build-now").innerText()).match(/Day (\d+)/)?.[1]);
      return day < 40;
    }, { timeout: 30_000 }).toBe(true);
    await expect(bar.getByTestId("build-play")).toHaveText("Pause");
    await bar.getByTestId("build-play").click();
    expect(new URL(page.url()).searchParams.get("repeat")).toBe("on");
    expect(new URL(page.url()).searchParams.get("build-speed")).toBe("100000");
    expect(new URL(page.url()).searchParams.get("pace")).toBe(null);
    await page.goto(`${miyamoto}&build-speed=10000&repeat=on`);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    await expect(bar.getByTestId("build-repeat")).toHaveAttribute("aria-pressed", "true");
    await expect(speeds.getByRole("button", { name: "10000×" })).toHaveAttribute("aria-pressed", "true");
    await expect(new URL(page.url()).searchParams.get("build-speed")).toBe("10000");
  });

  test("the build speed and the turn's pace keep their own address keys", async ({ page }) => {
    await page.goto(miyamoto);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    const buildSpeeds = page.locator("uchusen-build kazoku-speed-buttons");
    const turnSpeeds = page.locator("#view-bar kazoku-speed-buttons");
    await buildSpeeds.getByRole("button", { name: "60×" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("build-speed")).toBe("60");
    expect(new URL(page.url()).searchParams.get("pace")).toBe(null);
    expect(new URL(page.url()).searchParams.has("speed")).toBe(false);
    await turnSpeeds.getByRole("button", { name: "2×" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("pace")).toBe("2");
    expect(new URL(page.url()).searchParams.get("build-speed")).toBe("60");
    await expect(buildSpeeds.getByRole("button", { name: "60×" })).toHaveAttribute("aria-pressed", "true");
    await expect(turnSpeeds.getByRole("button", { name: "2×" })).toHaveAttribute("aria-pressed", "true");
  });

  test("back to the start resets the build to day 0", async ({ page }) => {
    await page.goto(`${miyamoto}&build=on&at=0.25`);
    await foldPicker(page);
    await page.locator('[data-testid="panel-build"]').click();
    const bar = page.locator("uchusen-build");
    await expect(bar.getByTestId("build-now")).not.toContainText("Day 0,");
    await expect(bar.getByTestId("build-start")).toHaveText("Back to start");
    await expect(bar.getByTestId("build-play").locator("svg")).toHaveCount(1);
    await expect(bar.getByTestId("build-start").locator("svg")).toHaveCount(1);
    await expect(bar.getByTestId("build-start")).toHaveAttribute("title", "Back to start");
    await bar.getByTestId("build-start").click();
    await expect(bar.getByTestId("build-now")).toContainText("Day 0");
    await expect.poll(() => new URL(page.url()).searchParams.get("at")).toBe(null);
  });
});
