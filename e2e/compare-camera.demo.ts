// The compare page camera: the choice is kept, open space is the default, wrap returns to the free camera, and follow selected waits until a craft is marked.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/compare.html?with=none";

test("sky groups start on, and turning the planets off is kept in the address", async ({ page }, testInfo) => {
  await page.goto(URL);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const row = page.getByTestId("cw-groups");
  await expect(row.getByTestId("group-planets")).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByTestId("group-moons")).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByTestId("group-dwarfs")).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByTestId("group-belts")).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByTestId("group-craft")).toHaveAttribute("aria-pressed", "true");
  await row.scrollIntoViewIfNeeded();
  if (testInfo.project.name.startsWith("chromium")) await page.screenshot({ path: testInfo.outputPath("sky-groups.png") });
  await row.getByTestId("group-planets").click();
  await expect(row.getByTestId("group-planets")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => new URLSearchParams(page.url().split("?")[1] ?? "").get("groups")).toBe("moons,dwarfs,belts,craft");
  await expect(page.locator("#hero")).toHaveAttribute("data-groups", "moons,dwarfs,belts,craft");
});

test("a click flies to that body and the address keeps the place", async ({ page }, testInfo) => {
  await page.goto(URL);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const query = (): URLSearchParams => new URLSearchParams(page.url().split("?")[1] ?? "");
  const pivot = () => page.locator("#hero").evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.pivot ?? "");
  const fly = async (mark: string, id: string): Promise<void> => {
    const chip = page.getByTestId(`mark-${mark}`);
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await expect.poll(() => query().get("at")).toBe(id);
    await expect(page.locator("#hero")).toHaveAttribute("data-at", id);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  };
  const drawn = testInfo.project.name.startsWith("chromium");
  if (drawn) await expect(page.locator("#hero")).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await fly("cmpBodyJupiter", "jupiter");
  if (drawn) {
    await expect.poll(pivot, { timeout: 30_000 }).toBe("jupiter");
    await expect.poll(() => page.locator("#hero").evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.moving ?? ""), { timeout: 30_000 }).toBe("false");
    if (testInfo.project.name === "chromium-desk") await page.locator("#hero").screenshot({ path: testInfo.outputPath("desk.png") });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    await expect.poll(() => query().get("at")).toBe("jupiter");
    await expect(page.locator("#hero")).toHaveAttribute("data-at", "jupiter");
    await expect.poll(pivot, { timeout: 30_000 }).toBe("jupiter");
  }
  await fly("cmpBodyCeres", "ceres");
  await fly("cmpMarkMoon", "moon");
  await fly("cmpMarkAsteroids", "asteroids");
  await fly("cmpMarkKuiper", "kuiper");
  if (drawn) await expect.poll(pivot, { timeout: 30_000 }).toBe("kuiper");
  await page.getByTestId("mark-cmpMarkAu").click();
  await expect.poll(() => query().get("at")).toBe(null);
  await expect(page.locator("#hero")).not.toHaveAttribute("data-at");
});

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

test("Miyamoto with the radiators out is painted when it fills the frame, and every variant chip has a name", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "WebGL is drawn on the desk");
  await page.goto("/uchusen-rockets/compare.html?rocket=fleet-ship-03&variant=miyamoto-deployed&look=painted&background=saturn&camera=planet&with=none");
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const labels = page.locator("#variants button");
  await expect(labels.first()).toBeVisible();
  for (const text of await labels.allTextContents()) expect(text.trim().length).toBeGreaterThan(0);
  await expect(page.getByTestId("variant-miyamoto-array")).toHaveText("ISV 宮本 Miyamoto, SPX-452, solar array out");
  await expect(page.locator("#hero")).toHaveAttribute("data-detail", "full", { timeout: 90_000 });
});

test("one astronomical unit shows the Sun and Jupiter", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "WebGL is drawn on the desk");
  await page.goto(URL);
  await expect(page.locator("#hero")).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await page.getByTestId("mark-cmpMarkAu").click();
  await expect(page.getByTestId("body-jupiter")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("body-sun")).toBeVisible();
  await expect(page.getByTestId("body-mercury")).toBeVisible();
  const before = await page.getByTestId("body-mercury").getAttribute("data-angle");
  await page.getByTestId("cmp-day").click();
  await expect.poll(() => page.getByTestId("body-mercury").getAttribute("data-angle")).not.toBe(before);
  const text = await page.getByTestId("cw-distance").innerText();
  expect(Number(text.replaceAll(/[^0-9]/g, ""))).toBeGreaterThan(100_000_000);
});

test("a body marker moves the pivot, the paths can hide, and the days play", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "WebGL is drawn on the desk");
  await page.goto(URL);
  await expect(page.locator("#hero")).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await page.getByTestId("mark-cmpMarkAu").click();
  await expect(page.getByTestId("body-jupiter")).toBeVisible({ timeout: 15_000 });
  const before = await page.getByTestId("body-mercury").getAttribute("data-angle");
  await page.getByTestId("cmp-day").click();
  await expect.poll(() => page.getByTestId("body-mercury").getAttribute("data-angle")).not.toBe(before);
  await page.getByTestId("body-jupiter").click();
  const canvasOf = (key: string) => page.locator("#hero").evaluate((node, name) => node.shadowRoot?.querySelector("canvas")?.dataset[name] ?? "", key);
  await expect.poll(() => canvasOf("pivot")).toBe("jupiter");
  await expect(page.getByTestId("body-mercury")).toHaveCount(0);
  await page.getByTestId("cmp-paths").click();
  await expect.poll(() => canvasOf("paths")).toBe("off");
  await page.getByTestId("cmp-play").click();
  await expect(page.getByTestId("cmp-play")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("cmp-play").click();
  await expect(page.getByTestId("cmp-play")).toHaveAttribute("aria-pressed", "false");
});
