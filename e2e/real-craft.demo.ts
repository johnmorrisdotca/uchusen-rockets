// "Real craft for scale" on the comparison page: Starship with Super Heavy, Saturn V, SLS and the ISS lie in the fleet band, each with its name and length. The toggle is on by default and lives in the address.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/";
const lineup = (page: Page) => page.locator('[data-testid="lineup"]');
const toggle = (page: Page) => page.locator('[data-testid="compare-real"]');
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);
const words = (page: Page) => lineup(page).evaluate((node) => node.shadowRoot?.textContent ?? "");

test("Real craft for scale: on by default with a label each, off and on again through the address, gone with Rockets alone", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(URL);
  await page.locator('[data-testid="more-compare"]').click();
  await page.locator('[data-testid="compare-fleet-02:fleet-02"]').click();
  await lineup(page).scrollIntoViewIfNeeded();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(lineup(page)).toHaveAttribute("real", "on");
  await expect(lineup(page)).toHaveAttribute("data-real", "4");
  const text = await words(page);
  for (const label of ["Starship with Super Heavy, 124.4 m", "Saturn V, 110.64 m", "SLS Block 1, 98.15 m", "ISS, 109 m"]) expect(text).toContain(label);
  expect(param(page, "real")).toBeNull();
  // the scale still fits the frame
  const [box, svg] = await Promise.all([page.locator('[data-testid="compare-view"]').boundingBox(), lineup(page).locator("svg").evaluate((node) => node.getBoundingClientRect().toJSON())]);
  expect(svg.width).toBeLessThanOrEqual(box!.width + 1);
  expect(svg.height).toBeLessThanOrEqual(box!.height + 1);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(lineup(page)).toHaveAttribute("real", "off");
  await expect(lineup(page)).toHaveAttribute("data-real", "0");
  expect(await words(page)).not.toContain("Saturn V, ");
  expect(param(page, "real")).toBe("off");

  // a reload keeps it off
  await page.reload();
  await page.locator('[data-testid="more-compare"]').click();
  await page.locator('[data-testid="compare-fleet-02:fleet-02"]').click();
  await lineup(page).scrollIntoViewIfNeeded();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(lineup(page)).toHaveAttribute("data-real", "0");

  await toggle(page).click();
  await expect(lineup(page)).toHaveAttribute("data-real", "4");
  expect(param(page, "real")).toBeNull();

  // Rockets alone have no fleet band, so nothing to lie in it
  await page.locator('[data-testid="compare-filter-rockets"]').click();
  await expect(toggle(page)).toBeHidden();
  await expect(lineup(page)).toHaveAttribute("data-real", "0");
  expect(problems).toEqual([]);
});
