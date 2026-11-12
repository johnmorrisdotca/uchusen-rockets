// The craft built as parts in slots, painted: each station's parts come in as one picture with the one credit, a part shows alone in the same paint, and the line look fetches none of their files.
import { expect, type Page, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";
import { foldPicker } from "./picker.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
const press = async (page: Page, id: string) => {
  await foldPicker(page);
  const rocket = /^rocket-(.+)$/.exec(id)?.[1];
  if (rocket) await page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`).click();
  await page.locator(`[data-testid="${id}"]`).click();
};
const stopTurn = async (page: Page) => {
  await foldPicker(page);
  await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
};

const CRAFT = [
  { rocket: "tiangong", creator: "w29572227", files: 10, alone: "wentian" },
  { rocket: "hubble", creator: "Cybertron B-127", files: 9, alone: "light-shield" },
  { rocket: "iss", creator: "NASA", files: 27, alone: "zvezda" },
  { rocket: "jupiter-c", creator: "NASA", files: 4, alone: "tub" },
  { rocket: "voyager", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "juno", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "jwst", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "parker-solar-probe", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "cassini", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "galileo", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "pioneer", creator: "NASA", files: 1, alone: "craft" },
  { rocket: "new-horizons", creator: "NASA", files: 1, alone: "craft" },
] as const;

for (const craft of CRAFT)
  test(`${craft.rocket}, painted: every part's file comes in, with its credit, and one part shows alone in the same paint`, async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "Once, at a desk's width");
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const models: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/assets/models/")) models.push(request.url().split("/").pop() as string);
    });
    await page.goto(`${URL}?rocket=${craft.rocket}&look=line`);
    await foldPicker(page);
    await stopTurn(page);
    await reach3d(page);
    expect(models.filter((file) => file.startsWith(`${craft.rocket}-`))).toEqual([]);
    await press(page, "look-painted");
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 120_000 });
    expect(new Set(models.filter((file) => file.startsWith(`${craft.rocket}-`))).size).toBe(craft.files);
    await expect(page.locator('[data-testid="credit"]')).toContainText(craft.creator);
    // a craft of many parts lists the rest of them in one menu
    const chip = page.locator(`[data-testid="show-${craft.alone}"]`);
    if (await chip.count()) await press(page, `show-${craft.alone}`);
    else await page.getByTestId("show-menu").selectOption(craft.alone);
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 60_000 });
    await expect(hero(page)).toHaveAttribute("show", craft.alone);
    expect(errors).toEqual([]);
  });
