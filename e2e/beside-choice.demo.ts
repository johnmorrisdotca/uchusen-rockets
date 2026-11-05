// Beside it can be Saturn V, SLS or the ISS, not only Starship. The choice is in the address, a craft is not offered beside itself, and Fit holds both.
import { expect, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);

test("Saturn V, SLS and the ISS can stand beside the craft, and the choice is kept in the address", async ({ page, browserName }) => {
  await page.goto(`${URL}?rocket=falcon-9`);
  await expect(page.getByTestId("beside-on")).toBeVisible();
  await expect(page.getByTestId("beside-saturn-v")).toBeVisible();
  await expect(page.getByTestId("beside-sls")).toBeVisible();
  await expect(page.getByTestId("beside-iss")).toBeVisible();
  await expect(page.getByTestId("beside-note")).toBeHidden();

  await page.getByTestId("beside-sls").click();
  await expect(page.getByTestId("beside-sls")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("beside-on")).toHaveAttribute("aria-pressed", "false");
  await expect(hero(page)).toHaveAttribute("beside", "sls:block-1");
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  await expect(page.getByTestId("beside-note")).toContainText("Space Launch System");
  await expect.poll(() => param(page, "beside")).toBe("sls:block-1");

  await page.reload();
  await expect(page.getByTestId("beside-sls")).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page)).toHaveAttribute("beside", "sls:block-1");
  await expect(hero(page)).toHaveAttribute("rocket", "falcon-9");

  if (browserName === "chromium") {
    await hero(page).scrollIntoViewIfNeeded();
    await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    await expect(hero(page).locator("[data-beside-label]").filter({ hasText: "Space Launch System" })).toBeVisible();
    const { min, max } = build({ rocket: "falcon-9" }, { beside: [{ rocket: "sls", variant: "block-1" }] }).boundsOf("together");
    const corners = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z])));
    await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { fit(): void }).fit());
    await expect
      .poll(() => hero(page).evaluate((node, points) => points.map((point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false), corners), { timeout: 30_000 })
      .toEqual(corners.map(() => true));
  }

  await page.goto(`${URL}?rocket=saturn-v`);
  await expect(page.getByTestId("beside-saturn-v")).toBeHidden();
  await expect(page.getByTestId("beside-on")).toBeVisible();

  await page.goto(`${URL}?rocket=starship`);
  await expect(page.getByTestId("beside-on")).toBeHidden();
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await page.getByTestId("beside-saturn-v").click();
  await expect(hero(page)).toHaveAttribute("beside", "saturn-v:saturn-v");
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  await expect.poll(() => param(page, "beside")).toBe("saturn-v:saturn-v");

  await page.getByTestId("beside-saturn-v").click();
  await expect(hero(page)).toHaveAttribute("beside", "off");
  await expect.poll(() => param(page, "beside")).toBeNull();
});
