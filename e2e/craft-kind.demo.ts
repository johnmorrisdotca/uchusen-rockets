// Spacecraft (probes, telescopes and crewed craft) are their own kind: Real spacecraft in the ship picker, a Spacecraft row beside the Rocket row, no "Launch stack / In space" row for a craft with no stack, and each row named for what it measures.
import { expect, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";
import { foldPicker } from "./picker.ts";

const URL = "/uchusen-rockets/";
const SPACECRAFT = ["voyager", "juno", "jwst", "parker-solar-probe", "hubble", "dragon", "gemini", "mercury", "lunar-module", "apollo-soyuz", "cassini", "galileo", "pioneer", "new-horizons", "europa-clipper", "starlink", "lageos", "vanguard-1"];

test("the ship picker has a Real spacecraft kind that holds the probes, telescopes and crewed craft, and Real rockets holds none of them", async ({ page }) => {
  await page.goto(URL);
  const picker = page.getByTestId("ship-picker");
  await expect(picker.getByTestId("pick-kind-craft")).toHaveText("Real spacecraft");
  await picker.getByTestId("pick-kind-craft").click();
  for (const id of SPACECRAFT) await expect(picker.getByTestId(`pick-${id}`)).toBeVisible();
  await expect(picker.getByTestId("pick-saturn-v")).toHaveCount(0);
  await picker.getByTestId("pick-kind-rocket").click();
  await expect(picker.getByTestId("pick-saturn-v")).toBeVisible();
  for (const id of SPACECRAFT) await expect(picker.getByTestId(`pick-${id}`)).toHaveCount(0);
  await picker.getByTestId("pick-kind-station").click();
  await expect(picker.getByTestId("pick-iss")).toBeVisible();
  await expect(picker.getByTestId("pick-hubble")).toHaveCount(0);
});

test("the Rocket row holds the launchers, and the spacecraft are in a row of their own under it", async ({ page }) => {
  await page.goto(`${URL}?rocket=voyager`);
  await foldPicker(page);
  await expect(page.getByTestId("craft-field")).toBeVisible();
  await expect(page.locator("#craft-title")).toHaveText("Spacecraft");
  for (const id of SPACECRAFT.filter((one) => ["nasa"].includes(ROCKETS[one].maker))) await expect(page.locator(`#crafts [data-testid="rocket-${id}"]`)).toBeVisible();
  await expect(page.locator('#rockets [data-testid="rocket-saturn-v"]')).toBeVisible();
  for (const id of SPACECRAFT) await expect(page.locator(`#rockets [data-testid="rocket-${id}"]`)).toHaveCount(0);
  // a maker with no spacecraft has no row
  await page.locator('[data-testid="maker-blue-origin"]').click();
  await expect(page.getByTestId("craft-field")).toBeHidden();
  await page.locator('[data-testid="maker-nasa"]').click();
  await expect(page.getByTestId("craft-field")).toBeVisible();
  await page.locator('#crafts [data-testid="rocket-juno"]').click();
  await expect(page.getByTestId("hero")).toHaveAttribute("rocket", "juno");
});

test("a craft with no launch stack has no Launch stack / In space row, and a stacked one has", async ({ page }) => {
  for (const id of ["jwst", "juno", "voyager", "parker-solar-probe", "hubble"]) {
    await page.goto(`${URL}?rocket=${id}`);
    await expect(page.getByTestId("hero")).toHaveAttribute("rocket", id);
    await expect(page.getByTestId("forms"), id).toBeHidden();
  }
  await page.goto(`${URL}?rocket=starship&variant=v3`);
  await expect(page.getByTestId("forms")).toBeVisible();
  await expect(page.locator('[data-testid="form-space"]')).toBeVisible();
});

test("the compare page hides Shown for a craft with no stack too", async ({ page }) => {
  await page.goto(`${URL}compare.html?rocket=jwst&variant=jwst`);
  await expect(page.getByTestId("cw-facts")).toContainText("James Webb Space Telescope");
  await expect(page.getByTestId("cw-form")).toBeHidden();
  await page.goto(`${URL}compare.html?rocket=saturn-v&variant=saturn-v`);
  await expect(page.getByTestId("cw-facts")).toContainText("Saturn V");
  await expect(page.getByTestId("cw-form")).toBeVisible();
});

test("Webb's height row says it is the sunshield's layers, not the spacecraft's height", async ({ page }) => {
  await page.goto(`${URL}?rocket=jwst`);
  const first = page.locator("#facts tr").first();
  await expect(first.locator("th")).toHaveText("Sunshield layers height");
  await expect(first.locator("td")).toContainText("4.8 m");
  await expect(page.locator("#facts")).not.toContainText("Spacecraft height");
  // another craft keeps the part's own name
  await page.goto(`${URL}?rocket=juno`);
  await expect(page.locator("#facts tr").first().locator("th")).toHaveText("Spacecraft height");
});
