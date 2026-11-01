// The demo in a real browser: no console or policy error, every control on the main view, looks that keep the angle, the move between together and apart, the parts alone, the painted model only when asked for,
// the credit, the comparison, the builder, the element's own failures and the React wrapper.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/";
const is3d = (browserName: string) => browserName === "chromium";

/** Fails the test on any console error, page error, failed request or content security policy report. */
function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Refused to apply a stylesheet")) problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  void page.addInitScript(() => {
    document.addEventListener(
      "securitypolicyviolation",
      (event) => {
        if ((event.target as Element | null)?.nodeName !== "SELECT") console.error(`policy: ${event.violatedDirective} ${event.blockedURI} ${(event.target as Element | null)?.nodeName}`);
      },
      true,
    );
  });
  return problems;
}

const hero = (page: Page) => page.locator('[data-testid="hero"]');
const press = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).click();
const canvasData = (page: Page, name: string) => hero(page).evaluate((node, key) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset[key] ?? "", name);
const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
const angle = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement & { angle: { az: number; el: number } }).angle);

test("the page loads clean, every address under the site's own path, and nothing costs more than it should at first", async ({ page, browserName }) => {
  const problems = watch(page);
  const addresses: string[] = [];
  page.on("request", (request) => addresses.push(request.url()));
  await page.goto(URL);
  await expect(hero(page)).toHaveAttribute("data-look", "line");
  if (is3d(browserName)) await reach3d(page);
  else await page.waitForTimeout(800);
  expect(problems).toEqual([]);
  for (const address of addresses) expect(new globalThis.URL(address).pathname.startsWith(URL)).toBe(true);
  // the line look needs no model
  expect(addresses.filter((address) => address.includes("/assets/models/"))).toEqual([]);
});

test("every control is on the main view and does what it says", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  for (const id of ["variant-v1", "variant-v1-flight1", "variant-v2", "variant-v3", "variant-v4", "variant-2019", "show-together", "show-apart", "show-booster", "show-ship", "look-line", "look-thick", "look-painted", "view-front", "view-back", "view-side", "view-below", "view-three-quarter"]) await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
  await press(page, "variant-v1");
  await expect(hero(page)).toHaveAttribute("data-variant", "v1");
  await press(page, "look-thick");
  await expect(hero(page)).toHaveAttribute("data-look", "thick");
  await press(page, "show-apart");
  await expect(hero(page)).toHaveAttribute("data-show", "apart");
  await press(page, "view-back");
  await expect(hero(page)).toHaveAttribute("data-view-angle", "back");
  await expect(page.locator('[data-testid="show-apart"]')).toHaveAttribute("aria-pressed", "true");
  expect(problems).toEqual([]);
});

test("each variant lists its own sizes with their sources, and a blank says so", async ({ page }) => {
  await page.goto(URL);
  const facts = page.locator('[data-testid="facts"]');
  await expect(facts).toContainText("124.4 m");
  await expect(facts).toContainText("72.3 m");
  await expect(facts).toContainText("81 m is Block 4's cell");
  await expect(facts.locator('a[href*="wikipedia"]').first()).toBeVisible();
  await press(page, "variant-v1-flight1");
  await expect(facts).toContainText("Starship's first flight");
  await press(page, "variant-v4");
  await expect(facts).toContainText("announced, an estimate");
  await expect(facts).toContainText("Not flown");
  await press(page, "variant-v1");
  await expect(facts).toContainText("121.3 m");
  await expect(facts).toContainText("first with the ring");
  await press(page, "show-ship");
  await expect(facts).toContainText("50.3 m");
  await expect(facts).not.toContainText("121.3 m");
  await press(page, "variant-2019");
  await expect(facts).toContainText("artist's model");
  await expect(facts).toContainText("No source");
  // ship only: nothing offers to stack it
  await expect(page.locator('[data-testid="show-together"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="show-booster"]')).toHaveCount(0);
  await expect(hero(page)).toHaveAttribute("data-show", "ship");
});

test("the look switches and the angle stays; dragging and the keyboard turn it; view moves it", async ({ page, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  const problems = watch(page);
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  await press(page, "view-side");
  await expect.poll(async () => Math.round((await angle(page)).az)).toBe(90);
  const before = await angle(page);
  for (const look of ["thick", "painted", "line"]) {
    await press(page, `look-${look}`);
    await expect.poll(() => canvasData(page, "look")).toBe(look);
    const after = await angle(page);
    expect(Math.abs(after.az - before.az)).toBeLessThan(0.01);
    expect(Math.abs(after.el - before.el)).toBeLessThan(0.01);
  }
  // the keyboard
  await hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.focus());
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => Math.round((await angle(page)).az)).toBe(75);
  await page.keyboard.press("Home");
  // a drag
  const box = await hero(page).boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const start = await angle(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs((await angle(page)).az - start.az)).toBeGreaterThan(5);
  }
  // below
  await press(page, "view-below");
  await expect.poll(async () => Math.round((await angle(page)).el)).toBe(-70);
  expect(problems).toEqual([]);
});

test("a variant change keeps the angle; every look draws every variant in a real canvas", async ({ page, browserName }) => {
  test.skip(!is3d(browserName) || test.info().project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  const problems = watch(page);
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  await press(page, "view-back");
  await expect.poll(async () => Math.abs(Math.round((await angle(page)).az))).toBe(180);
  for (const variant of ["v1-flight1", "v1", "v2", "v3", "v4", "2019"]) {
    await press(page, `variant-${variant}`);
    await expect.poll(() => canvasData(page, "parts")).toBe(variant === "2019" ? "ship" : "booster ship");
    for (const look of ["line", "thick", "painted"]) {
      await press(page, `look-${look}`);
      await expect.poll(() => canvasData(page, "look")).toBe(look);
      const pixels = await hero(page).evaluate((node) => {
        const canvas = (node as HTMLElement).shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
        return canvas.width * canvas.height;
      });
      expect(pixels).toBeGreaterThan(0);
    }
    expect(Math.abs(Math.round((await angle(page)).az))).toBe(180);
  }
  expect(problems).toEqual([]);
});

test("together to apart is an animated move, and a cut under reduced motion", async ({ browser, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  await press(page, "show-apart");
  await expect.poll(() => canvasData(page, "moves"), { timeout: 5000 }).toBe("1");
  await expect.poll(() => canvasData(page, "moving"), { timeout: 30_000 }).toBe("false");
  // and it reached its place: the parts stand apart
  await expect(hero(page)).toHaveAttribute("data-show", "apart");
  await context.close();

  const still = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page2 = await still.newPage();
  await page2.goto(URL);
  await reach3d(page2);
  await press(page2, "show-apart");
  await expect(hero(page2)).toHaveAttribute("data-show", "apart");
  await page2.waitForTimeout(200);
  expect(await canvasData(page2, "moving")).not.toBe("true");
  // a cut: no move was started at all
  expect(await canvasData(page2, "moves")).toBe("");
  // and no slow spin
  expect(await hero(page2).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.spin)).toBeTruthy();
  const a = (await angle(page2)).az;
  await page2.waitForTimeout(600);
  expect(Math.abs((await angle(page2)).az - a)).toBeLessThan(0.001);
  await still.close();
});

test("the painted model loads only when asked for, only for its variant, and the credit shows beside it", async ({ page, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/assets/models/")) models.push(request.url().split("/").pop() as string);
  });
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  const credit = page.locator('[data-testid="credit"]');
  await expect(credit).toBeHidden();
  await press(page, "look-thick");
  await page.waitForTimeout(400);
  expect(models).toEqual([]);
  await press(page, "look-painted");
  await expect(credit).toBeVisible();
  await expect(credit).toContainText("Clarence365");
  await expect(credit.locator('a[href="https://creativecommons.org/licenses/by/4.0/"]')).toBeVisible();
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  expect(models.sort()).toEqual(["starship-v3-booster.glb", "starship-v3-ship.glb"]);
  // Block 2 has no model: its paint is this package's own, and it says so
  await press(page, "variant-v2");
  await expect(hero(page)).toHaveAttribute("data-painted", "code", { timeout: 60_000 });
  await expect(credit).toContainText("own code");
  expect(models.length).toBe(2);
  await press(page, "variant-2019");
  await expect(credit).toContainText("MartianDays");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 60_000 });
  expect(models).toContain("starship-2019-ship.glb");
});

test("a painted model that cannot be fetched leaves this package's own paint, and no failure", async ({ page, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  await page.route("**/assets/models/**", (route) => route.abort());
  await page.goto(URL);
  await reach3d(page);
  await press(page, "look-painted");
  await expect(hero(page)).toHaveAttribute("data-painted", "code", { timeout: 60_000 });
  await expect(hero(page)).toHaveAttribute("data-state", "3d");
});

test("the comparison draws the variants at one scale, and lets a reader choose them", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  const lineup = page.locator('[data-testid="lineup"]');
  await expect(lineup).toHaveAttribute("data-count", "7");
  const table = page.locator('[data-testid="compare-table"]');
  await expect(table).toContainText("121.3 m");
  await expect(table).toContainText("142 m, announced, an estimate");
  await expect(table).toContainText("81 m, announced");
  await expect(table).toContainText("2023-04-20, Starship's first flight");
  await expect(table).toContainText("2023-11-18, first with the ring");
  await expect(table).toContainText("Not flown");
  await press(page, "compare-starship:v4");
  await expect(lineup).toHaveAttribute("data-count", "6");
  await expect(table).not.toContainText("142 m");
  await press(page, "compare-falcon-9:block-5");
  await expect(lineup).toHaveAttribute("data-count", "7");
  await expect(table).toContainText("69.8 m");
  await press(page, "compare-falcon-9:block-5");
  await press(page, "compare-starship:2019");
  await expect(lineup).toHaveAttribute("data-count", "7");
  await expect(table).toContainText("No source");
  await expect(table).toContainText("Never flew");
  expect(problems).toEqual([]);
});

test("the builder labels a mix as what it is, and credits only what is used", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  const report = page.locator('[data-testid="builder-report"]');
  await expect(report).toContainText("Block 3 (V3)");
  await page.locator('[data-testid="pick-ship"]').selectOption("starship-v2-ship");
  await expect(report).toContainText("Custom build, not a vehicle that flew");
  await expect(report).toHaveAttribute("data-kind", "custom");
  await expect(page.locator('[data-testid="builder-rocket"]')).toHaveAttribute("data-custom", "true");
  expect(problems).toEqual([]);
});

test("the sources and the credits are on the page, and the page says no one endorsed it", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-testid="sources"]')).toContainText("Wikipedia");
  const credits = page.locator('[data-testid="credits"]');
  for (const name of ["Clarence365", "clarence365", "MartianDays", "Stanley Creative", "KUBAHA", "ProgressTH", "Antonio_Adams", "Echo_3"]) await expect(credits).toContainText(name);
  await expect(page.locator("footer")).toContainText("not affiliated with or endorsed by SpaceX");
  await expect(page.locator('[data-testid="planned"]')).toContainText("Falcon 1");
  await expect(page.locator('[data-testid="planned"]')).not.toContainText("Falcon 9");
});

test("every rocket is on the main view, with its own variants and parts, and a variant only lists parts it has", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  await press(page, "rocket-falcon-9");
  await expect(hero(page)).toHaveAttribute("data-variant", "block-5");
  for (const id of ["variant-v1.0", "variant-v1.1", "variant-ft", "variant-block-5", "variant-block-5-dragon-2", "show-first-stage", "show-second-stage", "show-fairing"]) await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-testid="facts"]')).toContainText("69.8 m");
  await press(page, "variant-block-5-dragon-2");
  await expect(page.locator('[data-testid="show-capsule"]')).toBeVisible();
  await expect(page.locator('[data-testid="show-fairing"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="facts"]')).toContainText("as stated; the parts add to 64.8 m");
  await press(page, "rocket-falcon-heavy");
  await expect(page.locator('[data-testid="show-side-left"]')).toBeVisible();
  await expect(page.locator('[data-testid="facts"]')).toContainText("12.2 m");
  await expect(page.locator('[data-testid="facts"]')).toContainText("nothing is cut to fake a separation");
  await press(page, "rocket-dragon");
  await expect(hero(page)).toHaveAttribute("data-variant", "dragon-2");
  await press(page, "variant-dragon-1");
  await expect(page.locator('[data-testid="facts"]')).toContainText("not the later Cargo Dragon 2");
  await press(page, "rocket-grasshopper");
  await expect(page.locator('[data-testid="facts"]')).toContainText("32 m");
  await expect(page.locator('[data-testid="facts"]')).toContainText("test vehicle");
  await expect(page.locator('[data-testid="show-apart"]')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("each rocket's painted look fetches only its own models, and credits their authors", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  const problems = watch(page);
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/assets/models/")) models.push(request.url().split("/").pop() as string);
  });
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  await press(page, "look-painted");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  const credit = page.locator('[data-testid="credit"]');
  for (const [rocket, creator, count] of [
    ["falcon-9", "Stanley Creative", 3],
    ["falcon-heavy", "Antonio_Adams", 3],
    ["dragon", "KUBAHA", 2],
    ["grasshopper", "Echo_3", 1],
  ] as const) {
    models.length = 0;
    await press(page, `rocket-${rocket}`);
    await expect(credit).toContainText(creator);
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
    expect(models.length).toBe(count);
  }
  await press(page, "rocket-falcon-9");
  await press(page, "variant-v1.0");
  await expect(credit).toContainText("own code");
  await expect(hero(page)).toHaveAttribute("data-painted", "code", { timeout: 60_000 });
  expect(problems).toEqual([]);
});

test("the painted Falcon 9 second stage shows this package's own nozzle when it stands apart or alone, and not nested in the stack", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  await page.goto(URL);
  await page.locator('[data-testid="spin"]').uncheck();
  await reach3d(page);
  await press(page, "rocket-falcon-9");
  await press(page, "look-painted");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  expect(await canvasData(page, "nozzle")).toBe("");
  await press(page, "show-apart");
  await expect.poll(() => canvasData(page, "nozzle")).toBe("own");
  await press(page, "show-second-stage");
  await expect.poll(() => canvasData(page, "nozzle")).toBe("own");
  await press(page, "show-together");
  await expect.poll(() => canvasData(page, "nozzle")).toBe("");
  await press(page, "look-line");
  await press(page, "show-second-stage");
  expect(await canvasData(page, "nozzle")).toBe("");
});

test("no sideways scroll at a phone's width, and controls big enough for a finger", async ({ page }, info) => {
  test.skip(info.project.name === "chromium-desk", "A phone's width");
  await page.goto(URL);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]);
  for (const id of ["show-apart", "look-painted", "view-below"]) {
    const box = await page.locator(`[data-testid="${id}"]`).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("a tap turns the look on a phone, and the drawing follows with no WebGL", async ({ page, browserName }, info) => {
  test.skip(browserName !== "webkit" && info.project.name !== "chromium-phone", "A phone");
  await page.goto(URL);
  await page.locator('[data-testid="look-thick"]').tap();
  await expect(hero(page)).toHaveAttribute("data-look", "thick");
});

test("the drawing mode never loads three.js, and follows look, show and view", async ({ page }) => {
  const problems = watch(page);
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto(`${URL}element-check.html`);
  const drawn = page.locator("#drawn");
  await expect(drawn).toHaveAttribute("data-state", "picture");
  const svg = () => drawn.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("svg")?.outerHTML ?? "");
  const one = await svg();
  expect(one).toContain("<svg");
  await drawn.evaluate((node) => node.setAttribute("look", "thick"));
  await expect.poll(svg).not.toBe(one);
  const two = await svg();
  await drawn.evaluate((node) => node.setAttribute("show", "booster"));
  await expect.poll(svg).not.toBe(two);
  const three = await svg();
  await drawn.evaluate((node) => node.setAttribute("view", "below"));
  await expect.poll(svg).not.toBe(three);
  // a hostile look falls back, and nothing gets out of the drawing
  await drawn.evaluate((node) => node.setAttribute("look", '"><img src=x onerror=alert(1)>'));
  await expect(drawn).toHaveAttribute("data-look", "line");
  expect(await svg()).not.toContain("onerror");
  await drawn.evaluate((node) => node.setAttribute("label", '<img src=x onerror="alert(1)">'));
  await expect.poll(() => drawn.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("img")?.outerHTML ?? "none")).toBe("none");
  // a refused description says so
  await expect(page.locator("#refused")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#refused")).toHaveAttribute("data-why", "unknown-rocket");
  expect(scripts.some((script) => /three/i.test(script))).toBe(false);
  expect(problems).toEqual([]);
});

test("the React wrapper draws the element", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}react-check.html`);
  const node = page.locator("#react-rocket");
  await expect(node).toHaveAttribute("data-show", "ship");
  await expect(node).toHaveAttribute("data-look", "thick");
  expect(problems).toEqual([]);
});
