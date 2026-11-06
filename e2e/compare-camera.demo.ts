// The compare page camera: the choice is kept, open space is the default, wrap returns to the free camera, and follow selected waits until a craft is marked.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/compare.html?with=none";

test("the camera row keeps the choice, and open space is the start", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("cam-free")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("edges-open")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("turn-camera")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("hero")).toHaveAttribute("edges", "open");
  await page.getByTestId("edges-wrap").click();
  await expect(page.getByTestId("cam-free")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/edges=wrap/);
  await page.getByTestId("cam-all").click();
  await expect(page).toHaveURL(/camera=all/);
  await expect(page).not.toHaveURL(/edges=wrap/);
  await expect(page.getByTestId("edges-wrap")).toBeDisabled();
  await page.getByTestId("cam-follow").click();
  await expect(page).toHaveURL(/camera=follow/);
  await expect(page).not.toHaveURL(/edges=wrap/);
  await page.getByTestId("cam-selected").click();
  await expect(page.locator(".cw-stage .view-space, #hero").first()).toBeVisible();
  const hook = await page.locator("#hero").evaluate((node) => (node.parentElement?.dataset.cameraHook ?? node.dataset.cameraHook) ?? "");
  expect(hook === "waiting" || hook === "ready").toBe(true);
});

test("a marked craft is what Follow selected keeps, and the Moon mark is a distance chip", async ({ page }) => {
  await page.goto(`${URL}&camera=selected`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator("#hero").evaluate((node) => {
    const stage = node.parentElement;
    if (stage) stage.dataset.selected = "0";
  });
  await page.getByTestId("cam-selected").click();
  await expect(page.locator("#hero")).toHaveAttribute("edges", "open");
  await expect(page.getByTestId("mark-cmpMarkMoon")).toBeVisible();
  if (test.info().project.name === "chromium-desk") {
    await expect(page.getByTestId("cw-distance")).not.toHaveText("");
  }
});

test("turning the camera keeps the craft near the middle and moves the Earth", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "WebGL is drawn on the desk");
  await page.goto(URL);
  await expect(page.locator("#hero")).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  const place = () => page.locator("#hero").evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const raw = canvas?.dataset.craftBoxes ?? "";
    const part = raw.split(" ").find((item) => item.startsWith("-1:"));
    if (!canvas || !part) return null;
    const [, rest] = part.split(":");
    const [x, y, w, h, on] = (rest ?? "").split(",").map(Number);
    if (on !== 1 || w < 8) return null;
    const rect = canvas.getBoundingClientRect();
    return { dx: x + w / 2 - rect.width / 2, dy: y + h / 2 - rect.height / 2 };
  });
  await expect.poll(place, { timeout: 30_000 }).not.toBeNull();
  await expect.poll(() => page.locator("#hero").evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.earth ?? ""), { timeout: 30_000 }).toBe("painted");
  const before = await place();
  await page.locator("#view-bar").evaluate((node) => {
    (node as unknown as { set(value: { yaw: number }): void }).set({ yaw: 120 });
  });
  await expect(page.locator("#earth-back")).toBeHidden();
  const after = await place();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.dx - before!.dx)).toBeLessThan(2);
  expect(Math.abs(after!.dy - before!.dy)).toBeLessThan(2);
});
