// The Kaminari size slider: 60 to 100 per cent of a concept hull, in the address, kept on a reload, held by Fit with Starship beside it, and offered to the three concepts only.
import { expect, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";
const is3d = (browserName: string) => browserName === "chromium";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const slider = (page: Page) => page.locator('[data-testid="kscale"]');
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);
const stopTurn = (page: Page) => page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
const reach3d = async (page: Page) => {
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 120_000 });
};

/** Every corner of the box the concept at this size fills (and Starship beside it, when asked) is on the picture after Fit. */
async function inView(page: Page, variant: string, scale: number, beside: boolean) {
  const { min, max } = build({ rocket: "fleet-kaminari", variant }, { detail: "coarse", scale, beside }).boundsOf("together");
  const corners = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z])));
  await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { fit(): void }).fit());
  await expect
    .poll(() => hero(page).evaluate((node, points) => points.map((point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false), corners), { timeout: 60_000 })
    .toEqual(corners.map(() => true));
}

test("the size slider: offered to the concepts only, 60 to 100 in steps of 5, in the address, kept on a reload, and Fit follows it", async ({ page, browserName }) => {
  test.setTimeout(240_000);
  const problems: string[] = [];
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  page.on("pageerror", (error) => problems.push(error.message));
  // a craft that is not a concept has no slider
  await page.goto(`${URL}?rocket=saturn-v`);
  await expect(slider(page)).toBeHidden();
  await expect(hero(page)).not.toHaveAttribute("scale", /.*/);

  await page.goto(`${URL}?rocket=fleet-kaminari&variant=fleet-kaminari`);
  await expect(slider(page)).toBeVisible();
  await expect(slider(page)).toHaveAttribute("min", "60");
  await expect(slider(page)).toHaveAttribute("max", "100");
  await expect(slider(page)).toHaveAttribute("step", "5");
  await expect(slider(page)).toHaveValue("100");
  await expect(hero(page)).toHaveAttribute("scale", "100");
  expect(param(page, "kscale")).toBeNull();
  await expect(page.locator('[data-testid="kscale-note"]')).toContainText("100 per cent");
  await stopTurn(page);
  if (is3d(browserName)) {
    await reach3d(page);
    await inView(page, "fleet-kaminari", 100, false);
  }

  // 60 per cent: the address says so, the ship is built at that size and Fit holds it
  await slider(page).fill("60");
  await expect.poll(() => param(page, "kscale")).toBe("60");
  await expect(hero(page)).toHaveAttribute("scale", "60");
  await expect(hero(page)).toHaveAttribute("data-size", "60");
  await expect(page.locator('[data-testid="kscale-out"]')).toHaveText("60%");
  await expect(page.locator('[data-testid="kscale-note"]')).toContainText("60 per cent");
  await expect(page.locator('[data-testid="kscale-note"]')).toContainText("1,091 m");
  if (is3d(browserName)) {
    await reach3d(page);
    await inView(page, "fleet-kaminari", 60, false);
    // with Starship beside it at true size, both are held
    await page.locator('[data-testid="beside-on"]').click();
    await expect(hero(page)).toHaveAttribute("data-beside", "on");
    await inView(page, "fleet-kaminari", 60, true);
    // the thumb is let go: `change` is what rebuilds the ship, and a range filled while the view is settling does not always fire it
    await slider(page).evaluate((node) => {
      const input = node as HTMLInputElement;
      input.value = "85";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(() => param(page, "kscale")).toBe("85");
    await expect(hero(page)).toHaveAttribute("data-size", "85");
    await inView(page, "fleet-kaminari", 85, true);
  } else await slider(page).fill("85");

  // a reload keeps it, and a size between two steps lands on the nearest
  await page.reload();
  await expect(slider(page)).toHaveValue("85");
  await expect(hero(page)).toHaveAttribute("scale", "85");
  await page.goto(`${URL}?rocket=fleet-romaryu&variant=fleet-romaryu&kscale=73`);
  await expect(slider(page)).toHaveValue("75");
  await expect(hero(page)).toHaveAttribute("scale", "75");
  await page.goto(`${URL}?rocket=fleet-emiake&variant=fleet-emiake&kscale=nonsense`);
  await expect(slider(page)).toHaveValue("100");

  // the size goes with the choice to another concept, and goes away with a craft that has none
  await page.goto(`${URL}?rocket=fleet-kaminari&variant=fleet-kaminari&kscale=70`);
  await page.locator('[data-testid="rocket-fleet-emiake"]').click();
  await expect(slider(page)).toHaveValue("70");
  await expect(hero(page)).toHaveAttribute("scale", "70");
  await page.locator(`[data-testid="maker-${ROCKETS["saturn-v"].maker}"]`).click();
  await page.locator('[data-testid="rocket-saturn-v"]').click();
  await expect(slider(page)).toBeHidden();
  await expect(hero(page)).not.toHaveAttribute("scale", /.*/);
  // the shipped Kaminari has none: it is not a concept
  await page.goto(`${URL}?rocket=fleet-02`);
  await expect(slider(page)).toBeHidden();
  expect(problems).toEqual([]);
});
