import { expect, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";
import { expectStillPicture } from "./still.ts";

const URL = "/uchusen-rockets/compare.html?layout=lineup";

test("the old fleet page opens the line-up on the compare page", async ({ page }) => {
  await page.goto("/uchusen-rockets/fleet-compare.html");
  await foldPicker(page);
  await expect(page).toHaveURL(/layout=lineup/);
  await expect(page.getByTestId("cmp-lineup")).toHaveAttribute("pose", "stand");
  await expect(page).toHaveTitle("Uchusen Rockets 宇宙船: three ships at one scale");
});

test("the old fleet page keeps the language and the rest of the address", async ({ page }) => {
  await page.goto("/uchusen-rockets/fleet-compare.html?lang=ja&view=side");
  await foldPicker(page);
  await expect(page).toHaveURL(/layout=lineup/);
  const query = new URLSearchParams(page.url().split("?")[1] ?? "");
  expect(query.get("lang")).toBe("ja");
  expect(query.get("view")).toBe("side");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("cmp-lineup")).toHaveAttribute("view", "side");
});

test("the three ships stand at one scale, the view stays in the address, and the transport is the long one", async ({ page }) => {
  await page.goto(URL);
  await foldPicker(page);
  const lineup = page.getByTestId("cmp-lineup");
  await expect(lineup).toHaveAttribute("pose", "stand");
  await expect(lineup).toHaveAttribute("data-count", "3");
  await expect(page.getByTestId("cmp-view-three-quarter")).toHaveAttribute("aria-pressed", "true");
  const metresOf = async (testId: string) => Number.parseFloat((await page.getByTestId(testId).innerText()).replaceAll(",", ""));
  const transport = await metresOf("cmp-length-fleet-kaminari");
  const command = await metresOf("cmp-length-fleet-ship-03");
  expect(transport).toBe(1818);
  expect(transport).toBeGreaterThan(command * 2);
  await expect(page.getByTestId("cmp-length-source")).toHaveText("Length is the figure in the ship's record.");
  await expect(page.getByTestId("look-painted")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("nav a[aria-current='page']")).toHaveText("Compare");
  const frame = await page.getByTestId("cmp-view").boundingBox();
  const drawn = await lineup.locator("svg").boundingBox();
  expect(drawn && frame, `drawn ${drawn?.width}x${drawn?.height} in ${frame?.width}x${frame?.height}`).toBeTruthy();
  expect(drawn!.width).toBeLessThanOrEqual(frame!.width + 2);
  expect(drawn!.height).toBeLessThanOrEqual(frame!.height + 2);
  const before = await lineup.locator("svg").innerHTML();
  await page.getByTestId("cmp-view-side").click();
  await expect(page).toHaveURL(/view=side/);
  await expect(lineup).toHaveAttribute("view", "side");
  await expect(page.getByTestId("cmp-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("cmp-view-three-quarter")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => lineup.locator("svg").innerHTML()).not.toBe(before);
  await expect(page.getByTestId("cmp-dry-mass-fleet-kaminari")).not.toHaveText("");
  await expect(page.getByTestId("cmp-full-mass-fleet-ship-01")).not.toHaveText("");
  await expect(page.getByTestId("cmp-crew-fleet-kaminari")).not.toHaveText("");
  await expect(page.getByTestId("cmp-cargo-fleet-ship-03")).not.toHaveText("");
  await expect(page.getByTestId("cmp-cargo-fleet-ship-01")).toHaveText("— not given");
  await expect(page.getByTestId("cmp-main-drive-fleet-kaminari")).not.toHaveText("");
  await expect(page.getByTestId("cmp-peak-speed-fleet-ship-03")).not.toHaveText("");
  await expect(page.getByTestId("cmp-peak-speed-fleet-kaminari")).toHaveText("— not given");
  const picks = page.getByTestId("cmp-picks");
  await expect(picks.getByTestId("cmp-ship-fleet-emiake")).toBeVisible();
  await expect(picks.locator("[aria-pressed='true']")).toHaveCount(3);
  await picks.getByTestId("cmp-ship-fleet-emiake").click();
  await expect(page).toHaveURL(/fleet-emiake/);
  await expect(picks.locator("[aria-pressed='true']")).toHaveCount(3);
  await expect(picks.getByTestId("cmp-ship-fleet-ship-01")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("cmp-length-fleet-emiake")).not.toHaveText("");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(wide).toBe(false);
  const cut = await picks.evaluate((node) => {
    if (window.innerWidth < 1000) return [];
    const view = node.getBoundingClientRect();
    return [...node.children].flatMap((child) => {
      const box = child.getBoundingClientRect();
      return box.left < view.left - 1 || box.right > view.right + 1 ? [child.textContent ?? ""] : [];
    });
  });
  expect(cut).toEqual([]);
});

test("ctrl and the wheel zooms the line-up and the page does not scroll", async ({ page }) => {
  await page.goto(URL);
  await foldPicker(page);
  const frame = page.getByTestId("cmp-view");
  await frame.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  const box = await frame.boundingBox();
  if (!box) throw new Error("no frame");
  await page.mouse.move(box.x + box.width / 2, Math.max(box.y, 0) + Math.min(box.height, page.viewportSize()!.height) / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  await expect.poll(() => page.getByTestId("cmp-lineup").locator("svg").evaluate((node) => (node as SVGElement).style.transform)).toContain("scale");
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test.describe("the line-up opens moving", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the ships turn by themselves: the picture changes between two frames, and Turn is kept in the address", async ({ page }) => {
    await page.goto(URL);
    await foldPicker(page);
    const lineup = page.getByTestId("cmp-lineup");
    await expect(lineup).toHaveAttribute("data-count", "3", { timeout: 30_000 });
    const first = await lineup.screenshot();
    await expect.poll(async () => !(await lineup.screenshot()).equals(first), { timeout: 30_000 }).toBe(true);
    await page.getByTestId("cmp-turn").click();
    await expect(page).toHaveURL(/turn=0/);
    await expect(page.getByTestId("cmp-turn")).toHaveAttribute("aria-pressed", "false");
  });

  test("reduced motion keeps the ships still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(URL);
    await foldPicker(page);
    const lineup = page.getByTestId("cmp-lineup");
    await expect(lineup).toHaveAttribute("data-count", "3", { timeout: 30_000 });
    await expectStillPicture(page, () => lineup.screenshot(), "the ships stand still");
  });

  test("with turn=0 in the address the ships stand still", async ({ page }) => {
    await page.goto(`${URL}&turn=0`);
    await foldPicker(page);
    const lineup = page.getByTestId("cmp-lineup");
    await expect(lineup).toHaveAttribute("data-count", "3", { timeout: 30_000 });
    await expectStillPicture(page, () => lineup.screenshot(), "the ships stand still");
  });
});
