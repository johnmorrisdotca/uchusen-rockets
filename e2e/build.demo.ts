// The build row: a ship with an order shows play, the rates and, under reduced motion, numbered stills. A rocket does not.
import { expect, test } from "@playwright/test";
import { buildOf, playFrame } from "../src/buildPlay.ts";

test("the build row is on a ship with an order, and a still keeps the place", async ({ page }) => {
  const steps = buildOf("miyamoto");
  if (!steps) throw new Error("Miyamoto has no build");
  const day = (at: number) => String(Math.round(playFrame(steps, at).day));

  await page.goto("/uchusen-rockets/?rocket=starship&variant=v3");
  await expect(page.locator("#build-field")).toBeHidden();

  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&build=on&at=0.25");
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

test("the row is on for each ship with an order, and off for a ship without one", async ({ page }) => {
  const shown = [
    "/uchusen-rockets/?rocket=fleet-ship-ariake&variant=ariake",
    "/uchusen-rockets/?rocket=fleet-ship-01&variant=hanabusa",
    "/uchusen-rockets/?rocket=fleet-kaminari&variant=fleet-kaminari",
    "/uchusen-rockets/?rocket=fleet-emiake&variant=fleet-emiake",
    "/uchusen-rockets/?rocket=fleet-romaryu&variant=fleet-romaryu",
  ];
  for (const url of shown) {
    await page.goto(url);
    await expect(page.locator("#build-field")).toBeVisible();
    await expect(page.locator("uchusen-build").getByTestId("build-play")).toBeDisabled();
  }
  for (const url of ["/uchusen-rockets/?rocket=fleet-kyotori&variant=kyotori", "/uchusen-rockets/?rocket=fleet-02&variant=fleet-02"]) {
    await page.goto(url);
    await expect(page.locator("#build-field")).toBeHidden();
  }
});
