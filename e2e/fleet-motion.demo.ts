// The fleet ships' moving parts: with Motion on the rings of Hanabusa turn, drawn at most thirty times a second; with it off, or for a reader who asked for reduced motion, they stand still and nothing draws; out of sight or on a hidden
// tab nothing draws either. The Motion choice is kept in the address.
import { expect as plainExpect, type Page, test } from "@playwright/test";

const expect = plainExpect.configure({ timeout: 60_000 });
const ROOT = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const canvasData = (page: Page, key: string) => hero(page).evaluate((node, name) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset[name] ?? "", key);
const drawn = async (page: Page) => Number(await canvasData(page, "frames")) || 0;
/** Only the motion should draw: the view's own controls and spin stand down. */
const quiet = async (page: Page) => {
  await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await hero(page).evaluate((node) => {
    (node as HTMLElement & { drive(choice: null): void }).drive(null);
    node.setAttribute("spin", "off");
  });
};
const stand = async (page: Page, query: string) => {
  await page.goto(`${ROOT}?rocket=fleet-ship-01&variant=hanabusa&look=painted${query}`);
  await expect.poll(() => canvasData(page, "frames"), { timeout: 90_000 }).not.toBe("");
  await quiet(page);
};

test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

test.describe("motion on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("Hanabusa's rings turn, drawn at most thirty times a second", async ({ page }) => {
    await stand(page, "&motion=on");
    await expect(hero(page)).toHaveAttribute("data-motion", "on");
    await expect.poll(() => canvasData(page, "motionAngle"), { timeout: 90_000 }).not.toBe("");
    const a0 = Number(await canvasData(page, "motionAngle"));
    const f0 = await drawn(page);
    const t0 = Date.now();
    await page.waitForTimeout(3000);
    const seconds = (Date.now() - t0) / 1000;
    const a1 = Number(await canvasData(page, "motionAngle"));
    expect(a1).not.toBe(a0);
    expect((await drawn(page)) - f0).toBeLessThanOrEqual(Math.ceil(30 * seconds) + 3);
    expect(await canvasData(page, "motion")).toBe("1x");
  });

  test("ten times faster turns it ten times as far", async ({ page }) => {
    await stand(page, "&motion=fast");
    await expect(hero(page)).toHaveAttribute("data-motion", "fast");
    await expect.poll(() => canvasData(page, "motion"), { timeout: 90_000 }).toBe("10x");
  });

  test("off, it stands at rest and draws nothing once settled", async ({ page }) => {
    await stand(page, "&motion=off");
    await expect(hero(page)).toHaveAttribute("data-motion", "off");
    await expect.poll(async () => {
      const mark = await drawn(page);
      await page.waitForTimeout(1000);
      return (await drawn(page)) - mark;
    }, { timeout: 90_000 }).toBe(0);
    expect(await canvasData(page, "motionAngle")).toBe("");
  });

  test("a hidden tab draws nothing, and the rings go on when it is back", async ({ page }) => {
    await stand(page, "&motion=on");
    await expect.poll(() => canvasData(page, "motionAngle"), { timeout: 90_000 }).not.toBe("");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(600);
    const mark = await drawn(page);
    await page.waitForTimeout(1500);
    expect(await drawn(page)).toBe(mark);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => drawn(page), { timeout: 60_000 }).toBeGreaterThan(mark);
  });

  test("the Motion choice is kept in the address, and the Speed choice goes with it", async ({ page }) => {
    await page.goto(`${ROOT}?rocket=fleet-ship-01&variant=hanabusa`);
    await page.locator('[data-testid="panel-motion"]').click();
    await page.locator('[data-testid="motion-off"]').click();
    await expect(hero(page)).toHaveAttribute("motion", "off");
    await expect.poll(() => new URL(page.url()).searchParams.get("motion")).toBe("off");
    await page.locator('[data-testid="motion-on"]').click();
    await page.locator('[data-testid="motion-fast"]').click();
    await expect(hero(page)).toHaveAttribute("motion", "fast");
    await expect.poll(() => new URL(page.url()).searchParams.get("motion")).toBe("fast");
    await expect(page.locator('[data-testid="motion-note"]')).toContainText("3.43 rpm");
    await page.goto(`${ROOT}?rocket=starship`);
    await expect(page.locator("#motion-field")).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("asked to move, a reader who wants reduced motion still sees the rings still", async ({ page }) => {
    await stand(page, "&motion=on");
    await expect(hero(page)).toHaveAttribute("data-motion", "off");
    await page.waitForTimeout(1500);
    expect(await canvasData(page, "motionAngle")).toBe("");
  });
});
