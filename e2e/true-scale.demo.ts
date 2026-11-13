import { expect, test } from "@playwright/test";

const url = "/uchusen-rockets/?rocket=saturn-v&variant=saturn-v&view=front&scale=true";
const data = (page: import("@playwright/test").Page, key: string) => page.locator("#hero").evaluate((node, name) => node.shadowRoot?.querySelector("canvas")?.dataset[name], key);

test("true scale shows the previous craft, then fits and returns to Fit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-state", "3d", { timeout: 30000 });
  await expect(page.getByTestId("true-scale")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("scale-bar")).toBeVisible();
  const oldDistance = Number(await data(page, "distance"));
  await page.locator("#hero").evaluate((node) => {
    const hero = node as HTMLElement & { screenPoint(point: [number, number, number]): { y: number } | null };
    const canvas = hero.shadowRoot!.querySelector("canvas")!;
    const observer = new MutationObserver(() => {
      if (canvas.dataset.ghost !== "on") return;
      const a = hero.screenPoint([0, 0, 0]);
      const b = hero.screenPoint([0, 110.64, 0]);
      const c = hero.screenPoint([0, 1820, 0]);
      if (a && b && c) canvas.dataset.scaleRatio = String(Math.abs((c.y - a.y) / (b.y - a.y)));
      observer.disconnect();
    });
    observer.observe(canvas, { attributes: true, attributeFilter: ["data-ghost"] });
  });
  await page.getByTestId("maker-fleet").click();
  // The first hull (fleet-02, 1820 m) is opened by address and is not in the list. The listed Kaminari is fleet-kaminari, 1818 m.
  await page.getByTestId("rocket-fleet-kaminari").click();
  // on a phone the buttons are below the stage, so the click scrolled the stage out of sight, where nothing is drawn and the canvas is let go: bring it back, and the switch can be seen to happen
  await page.getByTestId("hero").scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await data(page, "scaleRatio")), { timeout: 30000 }).toBeGreaterThan(0);
  const ratio = Number(await data(page, "scaleRatio"));
  expect(Math.abs(ratio / (1820 / 110.64) - 1)).toBeLessThan(0.05);
  await expect.poll(() => data(page, "ghost"), { timeout: 30000 }).toBe("off");
  await expect.poll(async () => Number(await data(page, "distance")), { timeout: 30000 }).toBeGreaterThan(oldDistance * 5);
  await page.getByTestId("view-bar").locator('[data-b="fit"]').click();
  await expect(page.getByTestId("true-scale")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("scale-bar")).toHaveCount(0);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.has("scale")).toBe(false);
});

test("ghost buffers are released after repeated craft changes", async ({ page }) => {
  await page.addInitScript(() => {
    const live = new Set<WebGLBuffer>();
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const create = proto.createBuffer;
      const remove = proto.deleteBuffer;
      proto.createBuffer = function () {
        const buffer = create.call(this);
        if (buffer) live.add(buffer);
        return buffer;
      };
      proto.deleteBuffer = function (buffer) {
        if (buffer) live.delete(buffer);
        return remove.call(this, buffer);
      };
    }
    Object.defineProperty(window, "__scaleBuffers", { get: () => live.size });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url);
  await expect(page.getByTestId("hero")).toHaveAttribute("data-state", "3d", { timeout: 30000 });
  await page.locator("#hero").evaluate((node) => {
    const canvas = node.shadowRoot!.querySelector("canvas")!;
    canvas.dataset.ghostCycles = "0";
    let seen = false;
    new MutationObserver(() => {
      if (canvas.dataset.ghost === "on") seen = true;
      if (seen && canvas.dataset.ghost === "off") {
        canvas.dataset.ghostCycles = String(Number(canvas.dataset.ghostCycles) + 1);
        seen = false;
      }
    }).observe(canvas, { attributes: true, attributeFilter: ["data-ghost"] });
  });
  let cycle = 0;
  const switchTo = async (maker: string, rocket: string) => {
    await page.getByTestId(`maker-${maker}`).click();
    await page.getByTestId(`rocket-${rocket}`).click();
    cycle += 1;
    await expect.poll(async () => Number(await data(page, "ghostCycles")), { timeout: 30000 }).toBe(cycle);
    await page.waitForTimeout(500);
  };
  await switchTo("spacex", "falcon-9");
  await switchTo("nasa", "saturn-v");
  const buffers = await page.evaluate(() => (window as unknown as { __scaleBuffers: number }).__scaleBuffers);
  await switchTo("spacex", "falcon-9");
  await switchTo("nasa", "saturn-v");
  const again = await page.evaluate(() => (window as unknown as { __scaleBuffers: number }).__scaleBuffers);
  expect(again).toBeLessThanOrEqual(buffers);
});
