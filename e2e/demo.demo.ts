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
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const stopTurn = (page: Page) => bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
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

test("the look switches and the angle stays; the view controls turn it by drag and key, and a view button puts it back", async ({ page, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  const problems = watch(page);
  await page.goto(URL);
  await stopTurn(page);
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
  // a key on the view is the controls' hand
  await hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.focus());
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => Math.abs((await angle(page)).az - 90)).toBeGreaterThan(5);
  await page.keyboard.press("Home");
  await expect.poll(async () => Math.round((await angle(page)).az)).toBe(90);
  // a drag at 1x turns it, the way a drag to the right turns a thing: its front goes right, so the camera goes left
  const box = await hero(page).boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const start = await angle(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => start.az - (await angle(page)).az).toBeGreaterThan(5);
  }
  // below
  await press(page, "view-below");
  await expect.poll(async () => Math.round((await angle(page)).el)).toBe(-70);
  expect(problems).toEqual([]);
});

test("the tilt slider tips it, + zooms, the pad moves it, and Fit brings the whole rocket back", async ({ page, browserName }) => {
  test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
  const problems = watch(page);
  await page.goto(URL);
  await stopTurn(page);
  await reach3d(page);
  const home = await angle(page);
  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ tilt: 20 }));
  await expect.poll(async () => home.el - (await angle(page)).el).toBeCloseTo(20, 0);
  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ tilt: 0 }));
  await expect.poll(() => canvasData(page, "zoom")).toBe("1.00");
  await bar(page).locator('[data-b="in"]').click();
  await expect.poll(async () => Number(await canvasData(page, "zoom"))).toBeGreaterThan(1.2);
  await bar(page).locator('[data-b="right"]').click();
  await expect.poll(async () => Number((await canvasData(page, "pan")).split(",")[0])).not.toBe(0);
  await bar(page).locator('[data-b="fit"]').click();
  await expect.poll(() => canvasData(page, "zoom")).toBe("1.00");
  await expect.poll(() => canvasData(page, "pan")).toBe("0,0");
  const after = await angle(page);
  expect(Math.abs(after.az - home.az)).toBeLessThan(0.5);
  expect(Math.abs(after.el - home.el)).toBeLessThan(0.5);
  expect(problems).toEqual([]);
});

test("a drawing follows the view controls too: turn, tip, zoom and move, and a hostile choice is only numbers", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}element-check.html`);
  const drawn = page.locator("#drawn");
  await expect(drawn).toHaveAttribute("data-state", "picture");
  type Driven = HTMLElement & { drive(choice: unknown): void };
  const svg = () => drawn.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("svg")?.outerHTML ?? "");
  const transform = () => drawn.evaluate((node) => { const d = (node as HTMLElement).shadowRoot?.querySelector<HTMLElement>(".drawing"); return `${d?.dataset.zoom} ${d?.dataset.pan} ${d?.style.transform ?? ""}`; });
  const one = await svg();
  await drawn.evaluate((node) => (node as Driven).drive({ yaw: 40, tilt: 10, zoom: 2, panX: 12, panY: -8 }));
  await expect.poll(svg).not.toBe(one);
  await expect.poll(transform).toBe("2.00 12,-8 ");
  await expect(drawn).toHaveAttribute("data-driven", "true");
  const two = await svg();
  // numbers only: anything else leaves what was, and a number out of range is held to the range
  await drawn.evaluate((node) => (node as Driven).drive({ yaw: "<img src=x onerror=alert(1)>", zoom: Number.POSITIVE_INFINITY, panX: Number.NaN }));
  await expect.poll(transform).toBe("2.00 12,-8 ");
  expect(await svg()).not.toContain("onerror");
  expect(await svg()).toBe(two);
  await drawn.evaluate((node) => (node as Driven).drive({ zoom: 1000 }));
  await expect.poll(transform).toBe("8.00 12,-8 ");
  // and it can be handed back
  await drawn.evaluate((node) => (node as Driven).drive(null));
  await expect.poll(transform).toBe("1.00 0,0 ");
  await expect(drawn).not.toHaveAttribute("data-driven", /.*/);
  expect(problems).toEqual([]);
});

test("a view in the address opens the same view, and what is chosen is kept in the address", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}?yaw=40&tilt=10&zoom=2`);
  await stopTurn(page);
  await expect.poll(() => bar(page).evaluate((node) => JSON.stringify((node as HTMLElement & { state: { yaw: number; tilt: number; zoom: number } }).state))).toContain('"yaw":40');
  const state = await bar(page).evaluate((node) => (node as HTMLElement & { state: { yaw: number; tilt: number; zoom: number } }).state);
  expect([state.tilt, state.zoom]).toEqual([10, 2]);
  await expect(hero(page)).toHaveAttribute("data-state", /^(3d|fallback)$/, { timeout: 90_000 });
  if ((await hero(page).getAttribute("data-state")) === "3d") {
    await expect.poll(() => canvasData(page, "zoom")).toBe("2.00");
    await expect.poll(async () => Math.abs(32 - 40 - (await angle(page)).az) < 0.5).toBe(true);
  } else await expect.poll(() => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector<HTMLElement>(".drawing")?.dataset.zoom ?? "")).toBe("2.00");
  await bar(page).locator('[data-b="fit"]').click();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("zoom")).toBeNull();
  expect(new globalThis.URL(page.url()).searchParams.get("yaw")).toBe("40");
  expect(problems).toEqual([]);
});

test("a variant change keeps the angle; every look draws every variant in a real canvas", async ({ page, browserName }) => {
  test.skip(!is3d(browserName) || test.info().project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  const problems = watch(page);
  await page.goto(URL);
  await stopTurn(page);
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
  await stopTurn(page);
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
  await stopTurn(page);
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
  await press(page, "more-compare");
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

test("the builder offers parts from every rocket, labels a mix as what it is, and never reaches one that does not fit", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  await press(page, "more-builder");
  const report = page.locator('[data-testid="builder-report"]');
  const pick = (index: number) => page.locator(`[data-testid="pick-${index}"]`);
  const rocket = page.locator('[data-testid="builder-rocket"]');
  // it starts on a real vehicle
  await expect(report).toHaveAttribute("data-kind", "real");
  const bottoms = await pick(0).locator("option").evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  for (const id of ["starship-v3-booster", "falcon-9-block-5-first-stage", "falcon-heavy-falcon-heavy-centre", "dragon-dragon-2-trunk", "grasshopper-grasshopper-vehicle"]) expect(bottoms).toContain(id);
  // a mix says so, in no alarming colour
  const first = await pick(0).inputValue();
  expect(first).toBe("starship-v1-flight1-booster");
  await pick(1).selectOption("starship-v2-ship");
  await expect(report).toContainText("Custom build, not a vehicle that flew");
  await expect(report).toHaveAttribute("data-kind", "custom");
  await expect(rocket).toHaveAttribute("data-custom", "true");
  // a Falcon 9 stage: the rows change, and what could not fit is not offered
  await pick(0).selectOption("falcon-9-block-5-first-stage");
  await expect(report).not.toContainText("Custom build");
  await expect(report).toContainText("Falcon 9 Block 5");
  const seconds = await pick(1).locator("option").evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  expect(seconds.every((id) => id.includes("second-stage"))).toBe(true);
  // the third row is a fairing or a Dragon, and a Dragon brings its own row
  const tops = await pick(2).locator("option").evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  expect(tops).toContain("falcon-9-block-5-fairing");
  expect(tops).toContain("dragon-dragon-2-trunk");
  await pick(2).selectOption("dragon-dragon-2-trunk");
  await expect(report).toContainText("Falcon 9 Block 5 with Dragon 2");
  await expect(rocket).toHaveAttribute("data-variant", "block-5-dragon-2");
  await expect(pick(3)).toBeVisible();
  // Falcon Heavy's side boosters have one answer each: made for the reader, with no question
  await pick(0).selectOption("falcon-heavy-falcon-heavy-centre");
  await expect(page.locator('[data-testid="pick-1-only"]')).toContainText("side booster, left");
  await expect(page.locator('[data-testid="pick-2-only"]')).toContainText("side booster, right");
  await expect(report).toContainText("Falcon Heavy");
  await expect(rocket).toHaveAttribute("data-variant", "falcon-heavy");
  // a thing that stands alone
  await pick(0).selectOption("grasshopper-grasshopper-vehicle");
  await expect(report).toContainText("Grasshopper");
  await expect(pick(1)).toHaveCount(0);
  await expect(page.locator(".report")).toHaveCSS("border-color", "rgb(39, 52, 76)");
  expect(problems).toEqual([]);
});

test("the sections under the rocket are one at a time, in a row of tabs, and the address keeps the choice", async ({ page }) => {
  const problems = watch(page);
  await page.goto(URL);
  const shown = () => page.locator("main > section:not(#main-view):visible").evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(await shown()).toEqual(["embed"]);
  await press(page, "more-builder");
  expect(await shown()).toEqual(["builder"]);
  await expect(page.locator('[data-testid="more-builder"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-testid="more-embed"]')).toHaveAttribute("aria-selected", "false");
  expect(new globalThis.URL(page.url()).hash).toBe("#builder");
  await page.goto(`${URL}#sources`);
  await page.reload();
  expect(await shown()).toEqual(["sources"]);
  expect(problems).toEqual([]);
});

test("the sources and the credits are on the page, and the page says no one endorsed it", async ({ page }) => {
  await page.goto(URL);
  await press(page, "more-sources");
  await expect(page.locator('[data-testid="sources"]')).toContainText("Wikipedia");
  const credits = page.locator('[data-testid="credits"]');
  for (const name of ["Clarence365", "clarence365", "MartianDays", "Stanley Creative", "KUBAHA", "ProgressTH", "Antonio_Adams", "Echo_3"]) await expect(credits).toContainText(name);
  await expect(page.locator("footer")).toContainText("not affiliated with or endorsed by SpaceX");
  await press(page, "more-planned");
  await expect(page.locator('[data-testid="planned"]')).toContainText("Vulcan");
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
  await stopTurn(page);
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

test("the Space Shuttle's painted Discovery is the Smithsonian's scan, credited as CC0, with the others' rockets beside it", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  const problems = watch(page);
  await page.goto(URL);
  await stopTurn(page);
  await reach3d(page);
  await press(page, "look-painted");
  await press(page, "rocket-space-shuttle");
  await press(page, "variant-discovery");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  const credit = page.locator('[data-testid="credit"]');
  await expect(credit).toContainText("Smithsonian Institution");
  await expect(credit).toContainText("CC0 1.0");
  for (const id of ["saturn-v", "sls", "new-glenn", "electron", "soyuz", "falcon-1", "droneship", "landing-zone", "launch-tower", "starbase"]) await expect(page.locator(`[data-testid="rocket-${id}"]`)).toBeVisible();
  await press(page, "rocket-droneship");
  await expect(page.locator('[data-testid="facts"]')).toContainText("Deck length");
  await expect(page.locator('[data-testid="facts"]')).toContainText("In service");
  await press(page, "rocket-starbase");
  await expect(page.locator('[data-testid="facts"]')).toContainText("Tower 1 to tower 2");
  expect(problems).toEqual([]);
});

test("NASA's models load only when chosen, and are credited to NASA as public domain", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  const problems = watch(page);
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/assets/models/")) models.push(request.url());
  });
  await page.goto(URL);
  await stopTurn(page);
  await reach3d(page);
  const nasaFile = /(lunar-module|apollo-soyuz|gemini|mercury|jupiter-c|iss|hubble|space-shuttle-stack)-/;
  expect(models.filter((url) => nasaFile.test(url))).toEqual([]);
  await press(page, "rocket-lunar-module");
  await reach3d(page);
  // the line look asks for none of them
  expect(models.filter((url) => nasaFile.test(url))).toEqual([]);
  await press(page, "look-painted");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  expect(models.filter((url) => nasaFile.test(url)).map((url) => url.split("/").pop())).toEqual(expect.arrayContaining(["lunar-module-descent.glb", "lunar-module-ascent.glb"]));
  const credit = page.locator('[data-testid="credit"]');
  await expect(credit).toContainText("NASA");
  await expect(credit).toContainText("Public domain (NASA)");
  for (const id of ["apollo-soyuz", "gemini", "mercury", "jupiter-c", "iss", "hubble"]) await expect(page.locator(`[data-testid="rocket-${id}"]`)).toBeVisible();
  expect(problems).toEqual([]);
});

test("the painted Falcon 9 second stage shows this package's own nozzle when it stands apart or alone, and not nested in the stack", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(240_000);
  await page.goto(URL);
  await stopTurn(page);
  await reach3d(page);
  await press(page, "rocket-falcon-9");
  await press(page, "look-painted");
  await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
  expect(await canvasData(page, "nozzle")).toBe("");
  await press(page, "show-apart");
  await expect.poll(() => canvasData(page, "nozzle"), { timeout: 30_000 }).toBe("own");
  await press(page, "show-second-stage");
  await expect.poll(() => canvasData(page, "nozzle"), { timeout: 30_000 }).toBe("own");
  await press(page, "show-together");
  await expect.poll(() => canvasData(page, "nozzle"), { timeout: 30_000 }).toBe("");
  // in a flight the stage leaves the one below, so its nozzle shows, and back in the stack it goes again
  await hero(page).evaluate((node) => (node as HTMLElement & { seek(position: number): void }).seek(5));
  await expect.poll(() => canvasData(page, "nozzle"), { timeout: 30_000 }).toBe("own");
  await hero(page).evaluate((node) => (node as HTMLElement & { endFlight(): void }).endFlight());
  await expect.poll(() => canvasData(page, "nozzle"), { timeout: 30_000 }).toBe("");
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
  // the view controls are beside the view, inside the screen, with finger-sized buttons
  for (const id of ["in", "fit", "front", "play"]) {
    const box = await bar(page).locator(`[data-b="${id}"]`).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width[1]);
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

test("the copy panel matches the rocket on screen, in every form, and the embed page draws its address", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const problems = watch(page);
  await page.goto(URL);
  const code = page.locator('[data-testid="embed-code"]');
  await expect(code).toContainText("uchusen-rocket");
  await expect(code).toContainText('rocket="starship"');
  await expect(code).toContainText("importmap");
  await expect(code).not.toContainText("Clarence365");
  await expect(page.locator('[data-testid="embed-credit"]')).toBeHidden();
  await press(page, "look-painted");
  await expect(code).toContainText("Clarence365");
  await expect(code).toContainText("creativecommons.org/licenses/by/4.0");
  await expect(page.locator('[data-testid="embed-credit"]')).toContainText("Clarence365");
  await press(page, "tab-svg");
  await expect(code).toContainText("<svg");
  await page.locator('[data-testid="embed-copy"]').click();
  await expect(page.locator("#embed-status")).toHaveText("Copied");
  await press(page, "tab-iframe");
  await expect(code).toContainText("embed.html?");
  await press(page, "look-line");
  await press(page, "tab-link");
  await expect(code).toContainText("dist/assets/starship-v3.svg");
  // the link's file is one the site has too
  const response = await page.request.get(`${URL}assets/starship-v3.svg`);
  expect(response.status()).toBe(200);
  // a phase of the flight goes along
  await page.locator('[data-testid="flight"]').locator('[data-testid="flight-next"]').click();
  await press(page, "tab-iframe");
  await expect(code).toContainText("phase=liftoff");
  await expect(page.locator('[data-testid="embed-open"]')).toHaveAttribute("href", /embed\.html\?.*phase=liftoff/);
  // and the embed page draws what an address says
  await page.goto(`${URL}embed.html?rocket=falcon-9&variant=block-5&look=line&show=apart`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator('[data-testid="rocket"]')).toHaveAttribute("data-look", "line");
  await expect(page.locator('[data-testid="rocket"]')).toHaveAttribute("data-show", "apart");
  await expect(page.locator('[data-testid="embed-credit"]')).toBeHidden();
  await page.goto(`${URL}embed.html?rocket=starship&variant=v3&look=painted&show=ship`);
  await expect(page.locator('[data-testid="embed-credit"]')).toContainText("Clarence365");
  await expect(page.locator('[data-testid="embed-credit"]')).toContainText("Ship");
  await expect(page.locator('[data-testid="embed-credit"]')).not.toContainText("Super Heavy");
  await page.goto(`${URL}embed.html?rocket=falcon-9&variant=block-5&flight=1&phase=liftoff`);
  await expect(page.locator('[data-testid="rocket"]')).toHaveAttribute("data-phase", "liftoff");
  await expect(page.locator('[data-testid="flight"]').locator('[data-testid="flight-now"]')).toContainText("Liftoff");
  expect(problems).toEqual([]);
});

test("Save SVG and Save PNG give files of what is on the screen", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "One browser's downloads are enough");
  const problems = watch(page);
  await page.goto(URL);
  const save = async (id: string) => {
    const [download] = await Promise.all([page.waitForEvent("download"), press(page, id)]);
    return download;
  };
  const svg = await save("embed-svg");
  expect(svg.suggestedFilename()).toBe("uchusen-starship-v3-line.svg");
  const png = await save("embed-png");
  expect(png.suggestedFilename()).toBe("uchusen-starship-v3-line.png");
  const path = await png.path();
  const { readFileSync } = await import("node:fs");
  const bytes = readFileSync(path);
  // a real PNG, at twice the picture's size
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(960);
  expect(problems).toEqual([]);
});

test("the CDN snippet alone works on a stranger's page, with the 3D view, a painted model and its credit", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(180_000);
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { embedCode } = await import("../src/embed.ts");
  const snippet = embedCode({ rocket: "falcon-9", variant: "block-5", look: "painted", spin: "off" }, "element");
  const problems = watch(page);
  const TYPES: Record<string, string> = { js: "text/javascript", glb: "model/gltf-binary", svg: "image/svg+xml" };
  // jsDelivr, answered from this checkout: the package's dist and three.js at the version the snippet names
  await page.route("https://cdn.jsdelivr.net/npm/**", (route) => {
    const path = new globalThis.URL(route.request().url()).pathname.replace(/^\/npm\//, "");
    const file = path.startsWith("three@") ? join("node_modules/three", path.slice(path.indexOf("/") + 1)) : join(".", path.slice(path.indexOf("/", path.indexOf("/") + 1) + 1));
    try {
      return route.fulfill({ body: readFileSync(file), headers: { "content-type": TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream", "access-control-allow-origin": "*" } });
    } catch {
      return route.fulfill({ status: 404, body: `no ${file}`, headers: { "access-control-allow-origin": "*" } });
    }
  });
  await page.route("https://stranger.example/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body style="background:#123">${snippet}</body></html>` }));
  await page.goto("https://stranger.example/page.html");
  const rocket = page.locator("uchusen-rocket");
  await expect(rocket).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect(rocket).toHaveAttribute("data-painted", /^(model|mixed)$/, { timeout: 90_000 });
  await expect(page.locator("body")).toContainText("Stanley Creative");
  expect(problems).toEqual([]);
});

test.describe("the engines", () => {
  test.use({ reducedMotion: "no-preference" });

  test("light when asked and go dark when turned off, in the drawing and the 3D view", async ({ page, browserName }) => {
    const problems = watch(page);
    await page.goto(URL);
    await stopTurn(page);
    await expect(hero(page)).toHaveAttribute("data-engines", "off");
    const plumes = () => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelectorAll("[data-plume]").length ?? 0);
    await expect.poll(plumes).toBe(0);
    await press(page, "engines-on");
    await expect(hero(page)).toHaveAttribute("data-engines", "on");
    await expect.poll(plumes).toBe(33);
    if (is3d(browserName)) {
      await reach3d(page);
      await expect.poll(() => canvasData(page, "engines")).toBe("on");
      await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    }
    await press(page, "engines-off");
    await expect(hero(page)).toHaveAttribute("data-engines", "off");
    await expect.poll(plumes).toBe(0);
    if (is3d(browserName)) await expect.poll(() => canvasData(page, "plumes")).toBe("0");
    await press(page, "engines-on");
    await press(page, "look-painted");
    await expect.poll(plumes).toBe(33);
    if (is3d(browserName)) {
      // software draws slowly: a page busy building a material can miss the default five seconds
      await expect.poll(() => canvasData(page, "look"), { timeout: 60_000 }).toBe("painted");
      await expect.poll(() => canvasData(page, "plumes"), { timeout: 60_000 }).toBe("33");
    }
    await press(page, "show-ship");
    await expect.poll(plumes, { timeout: 60_000 }).toBe(6);
    if (is3d(browserName)) await expect.poll(() => canvasData(page, "plumes"), { timeout: 60_000 }).toBe("6");
    expect(problems).toEqual([]);
  });
});

test.describe("the way it turns", () => {
  test.use({ reducedMotion: "no-preference" });
  const yaw = (page: Page) => bar(page).evaluate((node) => (node as HTMLElement & { state: { yaw: number } }).state.yaw);
  const turning = (page: Page) => bar(page).evaluate((node) => (node as HTMLElement & { state: { turning: boolean } }).state.turning);
  const button = (page: Page, way: string) => page.locator(`[data-testid="turn-${way}"]`);

  test("a press changes the way at once, with no jump, starts it if it had stopped, and a change of look or parts keeps it", async ({ page, browserName }) => {
    const problems = watch(page);
    await page.goto(URL);
    if (is3d(browserName)) await reach3d(page);
    // going right by itself: the angle grows
    await stopTurn(page);
    await expect.poll(() => turning(page)).toBe(false);
    await expect(button(page, "left")).toHaveAttribute("aria-pressed", "false");
    await expect(button(page, "right")).toHaveAttribute("aria-pressed", "false");
    const still = await yaw(page);
    await press(page, "turn-left");
    await expect.poll(() => turning(page)).toBe(true);
    await expect(button(page, "left")).toHaveAttribute("aria-pressed", "true");
    await expect(button(page, "right")).toHaveAttribute("aria-pressed", "false");
    // left is the yaw going down, which the view shows as the near side going left
    await expect.poll(() => yaw(page), { timeout: 30_000 }).toBeLessThan(still - 1);
    if (is3d(browserName)) await expect.poll(async () => Number(await canvasData(page, "azimuth")), { timeout: 30_000 }).toBeGreaterThan(32 + 1);
    const mid = await yaw(page);
    await press(page, "turn-right");
    await expect(button(page, "right")).toHaveAttribute("aria-pressed", "true");
    // no jump: it goes on from where it was
    expect(Math.abs((await yaw(page)) - mid)).toBeLessThan(8);
    const from = await yaw(page);
    await expect.poll(() => yaw(page), { timeout: 30_000 }).toBeGreaterThan(from + 1);
    // the choice survives the other controls
    await press(page, "look-thick");
    await press(page, "show-apart");
    await press(page, "variant-v2");
    await expect(button(page, "right")).toHaveAttribute("aria-pressed", "true");
    expect(await bar(page).getAttribute("speed")).toBe("5");
    // on a phone those buttons are below the view, and it does not turn out of sight
    await hero(page).scrollIntoViewIfNeeded();
    const later = await yaw(page);
    await expect.poll(() => yaw(page), { timeout: 30_000 }).toBeGreaterThan(later + 1);
    await stopTurn(page);
    await expect(button(page, "right")).toHaveAttribute("aria-pressed", "false");
    expect(problems).toEqual([]);
  });

  test("the element's own spin goes either way, and a bad value is the default", async ({ page, browserName }) => {
    test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
    const problems = watch(page);
    await page.goto(URL);
    await stopTurn(page);
    await reach3d(page);
    await hero(page).evaluate((node) => {
      (node as HTMLElement & { drive(choice: null): void }).drive(null);
      node.setAttribute("spin", "fast");
      node.setAttribute("way", "ccw");
    });
    await expect.poll(() => canvasData(page, "spin")).toBe("20ccw");
    const a = await angle(page);
    await expect.poll(async () => (await angle(page)).az, { timeout: 30_000 }).toBeLessThan(a.az - 1);
    await hero(page).evaluate((node) => node.setAttribute("way", '"><script>'));
    await expect.poll(() => canvasData(page, "spin")).toBe("20cw");
    const b = await angle(page);
    await expect.poll(async () => (await angle(page)).az, { timeout: 30_000 }).toBeGreaterThan(b.az + 1);
    expect(problems).toEqual([]);
  });
});

test("under reduced motion nothing turns by itself, and the buttons are there for a press", async ({ page }) => {
  await page.goto(URL);
  expect(await bar(page).evaluate((node) => (node as HTMLElement & { state: { turning: boolean } }).state.turning)).toBe(false);
  await expect(page.locator('[data-testid="turn-left"]')).toBeVisible();
  await expect(page.locator('[data-testid="turn-left"]')).toHaveAttribute("aria-pressed", "false");
});

test.describe("the flight", () => {
  test.use({ reducedMotion: "no-preference" });
  const flight = (page: Page) => page.locator('[data-testid="flight"]');
  const part = (page: Page, id: string) => flight(page).locator(`[data-testid="${id}"]`);
  const chart = (page: Page, slot: string) => flight(page).locator(`figure[data-slot="${slot}"]`);

  test("steps through the published engines, plays, and goes back to the rocket", async ({ page, browserName }) => {
    const problems = watch(page);
    await page.goto(URL);
    await stopTurn(page);
    await expect(part(page, "flight-now")).toContainText("T-0:03, Ignition");
    await expect(chart(page, "booster")).toHaveAttribute("data-burning", "33");
    await expect(chart(page, "ship")).toHaveAttribute("data-burning", "0");
    await expect(part(page, "flight-about")).toContainText("illustrative");
    await expect(part(page, "flight-about").locator("a")).toHaveAttribute("href", /Starship_flight_test_12/);
    for (let i = 0; i < 4; i++) await part(page, "flight-next").click();
    await expect(part(page, "flight-now")).toContainText("T+2:24, Hot staging");
    await expect(hero(page)).toHaveAttribute("data-phase", "hot-staging");
    await expect(chart(page, "booster")).toHaveAttribute("data-burning", "5");
    await expect(chart(page, "ship")).toHaveAttribute("data-burning", "6");
    // the chart shows which: lit dots
    expect(await chart(page, "booster").locator("circle[data-lit]").count()).toBe(5);
    if (is3d(browserName)) {
      await reach3d(page);
      await expect.poll(() => canvasData(page, "phase")).toBe("hot-staging");
      await expect.poll(() => canvasData(page, "plumes")).toBe("11");
    } else await page.waitForTimeout(300);
    // the slider moves it too
    await part(page, "flight-range").evaluate((node) => {
      (node as HTMLInputElement).value = "0.5";
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(part(page, "flight-now")).toContainText("Ignition");
    await part(page, "flight-play").click();
    await expect(part(page, "flight-play")).toHaveText("Pause");
    await expect(flight(page)).toHaveAttribute("data-playing", "true");
    await expect.poll(() => part(page, "flight-range").evaluate((node) => Number((node as HTMLInputElement).value)), { timeout: 60_000 }).toBeGreaterThan(0.6);
    await part(page, "flight-play").click();
    await expect(flight(page)).toHaveAttribute("data-playing", "false");
    await part(page, "flight-leave").click();
    await expect(hero(page)).toHaveAttribute("data-phase", "");
    if (is3d(browserName)) await expect.poll(() => canvasData(page, "plumes")).toBe("0");
    expect(problems).toEqual([]);
  });

  test("each version has its own flight or says it has none, and choosing parts leaves the flight", async ({ page }) => {
    await page.goto(URL);
    await stopTurn(page);
    await press(page, "variant-v4");
    await expect(part(page, "flight-none")).toBeVisible();
    await expect(part(page, "flight-play")).toBeHidden();
    await press(page, "variant-v2");
    await expect(part(page, "flight-about").locator("a")).toHaveAttribute("href", /Starship_flight_test_7/);
    await press(page, "rocket-falcon-9");
    await expect(part(page, "flight-about").locator("a")).toHaveAttribute("href", /timeline-for-falcon-9-launch-of-starlink/);
    await expect(chart(page, "first-stage")).toHaveAttribute("data-burning", "9");
    await part(page, "flight-next").click();
    await expect(hero(page)).toHaveAttribute("data-phase", "liftoff");
    await press(page, "show-apart");
    await expect(hero(page)).toHaveAttribute("data-phase", "");
    await press(page, "rocket-falcon-heavy");
    await expect(chart(page, "centre")).toHaveAttribute("data-burning", "0");
    await expect(chart(page, "side-left")).toHaveAttribute("data-burning", "9");
    await press(page, "rocket-dragon");
    await expect(part(page, "flight-none")).toBeVisible();
  });

  test("the drawing with no WebGL follows the flight too, and draws only the engines that burn", async ({ page }) => {
    await page.goto(`${URL}element-check.html`);
    const rocket = page.locator("uchusen-rocket").first();
    await rocket.evaluate((node) => {
      node.setAttribute("mode", "drawing");
      node.setAttribute("rocket", "falcon-9");
      node.setAttribute("variant", "block-5");
    });
    await expect(rocket).toHaveAttribute("data-flight", "falcon-9-starlink-2019");
    const plumes = () => rocket.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelectorAll("[data-plume]").length ?? 0);
    await rocket.evaluate((node) => node.setAttribute("phase", "liftoff"));
    await expect.poll(plumes).toBe(9);
    await rocket.evaluate((node) => node.setAttribute("phase", "landing-burn"));
    await expect.poll(plumes).toBe(2);
    await rocket.evaluate((node) => node.removeAttribute("phase"));
    await expect.poll(plumes).toBe(0);
    await rocket.evaluate((node) => (node as HTMLElement & { play(): void }).play());
    await expect.poll(() => rocket.getAttribute("data-phase"), { timeout: 30_000 }).toBe("max-q");
    await rocket.evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  });
});

test("under reduced motion the flight does not play and shows no flame, and the slider and the charts still work", async ({ page, browserName }) => {
  const problems = watch(page);
  await page.goto(URL);
  const flight = page.locator('[data-testid="flight"]');
  const part = (id: string) => flight.locator(`[data-testid="${id}"]`);
  await expect(part("flight-play")).toBeDisabled();
  await expect(part("flight-about")).toContainText("reduced motion");
  await part("flight-next").click();
  await expect(hero(page)).toHaveAttribute("data-phase", "liftoff");
  await expect(flight.locator('figure[data-slot="booster"]')).toHaveAttribute("data-burning", "33");
  await hero(page).evaluate((node) => (node as HTMLElement & { play(): void }).play());
  expect(await hero(page).evaluate((node) => (node as HTMLElement & { flightState: { playing: boolean } }).flightState.playing)).toBe(false);
  if (is3d(browserName)) {
    await reach3d(page);
    await expect.poll(() => canvasData(page, "phase")).toBe("liftoff");
    expect(await canvasData(page, "plumes")).toBe("0");
  }
  expect(problems).toEqual([]);
});

test("under reduced motion the engines stay off, and the page says why", async ({ page, browserName }) => {
  const problems = watch(page);
  await page.goto(URL);
  await press(page, "engines-on");
  await expect(hero(page)).toHaveAttribute("data-engines", "off");
  await expect(page.locator('[data-testid="engines-note"]')).toContainText("reduced motion");
  const plumes = await hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelectorAll("[data-plume]").length ?? 0);
  expect(plumes).toBe(0);
  if (is3d(browserName)) {
    await reach3d(page);
    await expect.poll(() => canvasData(page, "plumes")).toBe("0");
  }
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

test("the Earth behind the rocket: off by default, kept in the address, behind the rocket, and the rocket still turns", async ({ page, browserName }) => {
  const problems = watch(page);
  const earth = page.locator('[data-testid="earth"]');
  const credit = page.locator('[data-testid="earth-credit"]');
  await page.goto(URL);
  await expect(page.locator('[data-testid="background-none"]')).toHaveAttribute("aria-pressed", "true");
  await expect(earth).toBeHidden();
  await expect(credit).toBeHidden();
  await stopTurn(page);
  if (is3d(browserName)) await reach3d(page);

  await press(page, "background-earth");
  await expect(page.locator('[data-testid="background-earth"]')).toHaveAttribute("aria-pressed", "true");
  // on a phone the row is below the view, and nothing is drawn out of sight: it is drawn when the view comes back
  await hero(page).scrollIntoViewIfNeeded();
  await expect(earth.locator("svg")).toBeVisible({ timeout: 30_000 });
  await expect(earth).toHaveAttribute("data-form", "line");
  await expect(credit).toContainText("Natural Earth");
  await expect(credit).toContainText("NASA");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBe("earth");

  // it sits behind, takes no press, and a drag still turns the rocket
  const box = (await hero(page).boundingBox())!;
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, middle)).toBe("hero");
  const yaw = () => bar(page).evaluate((node) => (node as HTMLElement & { state: { yaw: number } }).state.yaw);
  const before = await yaw();
  await page.mouse.move(middle.x, middle.y);
  await page.mouse.down();
  await page.mouse.move(middle.x + 60, middle.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(yaw).not.toBe(before);

  // the view's choices and this one share the address
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("yaw")).not.toBeNull();
  expect(new globalThis.URL(page.url()).searchParams.get("background")).toBe("earth");
  await page.reload();
  await expect(page.locator('[data-testid="background-earth"]')).toHaveAttribute("aria-pressed", "true");
  await hero(page).scrollIntoViewIfNeeded();
  await expect(earth.locator("svg")).toBeVisible({ timeout: 30_000 });

  // each look has its own form, and the realistic one's pictures load under the strict policy
  await press(page, "look-thick");
  await expect(earth).toHaveAttribute("data-form", "thick");
  if (is3d(browserName)) {
    await press(page, "look-painted");
    await expect(earth).toHaveAttribute("data-form", "realistic", { timeout: 30_000 });
    await expect(earth.locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "live", { timeout: 90_000 });
    await expect(earth.locator("svg")).toHaveCount(0);
    await press(page, "look-line");
    await expect(earth.locator("chikyu-earth-realistic")).toHaveCount(0);
  }

  await press(page, "background-none");
  await expect(earth).toBeHidden();
  await expect(earth.locator("svg")).toHaveCount(0);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBeNull();
  expect(problems).toEqual([]);
});

test("every variant's painted look names whose models it is, and the sources list every one", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "Once, at a desk's width");
  test.setTimeout(300_000);
  const { check, creditLine, MODEL_CREDITS, ROCKETS } = await import("../src/index.ts");
  const problems = watch(page);
  await page.goto(URL);
  await stopTurn(page);
  await reach3d(page);
  const credit = page.locator('[data-testid="credit"]');
  // in the line look: the words are there whichever look is on, and no model is asked for on the way
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      await press(page, `rocket-${rocket.id}`);
      await press(page, `variant-${variant.id}`);
      const { credits } = check({ rocket: rocket.id, variant: variant.id });
      if (credits.length === 0) await expect(credit, `${rocket.id} ${variant.id}`).toContainText("this package's own code");
      for (const one of credits) {
        await expect(credit, `${rocket.id} ${variant.id}`).toContainText(one.creator);
        await expect(credit, `${rocket.id} ${variant.id}`).toContainText(one.licence);
      }
    }
  await press(page, "more-sources");
  const listed = page.locator('[data-testid="credits"]');
  for (const id of Object.keys(MODEL_CREDITS) as (keyof typeof MODEL_CREDITS)[]) await expect(listed).toContainText(creditLine(id));
  await expect(page.locator('[data-testid="sources"]')).toContainText("OpenStreetMap contributors");
  await expect(page.locator("footer")).toContainText("ODbL");
  expect(problems).toEqual([]);
});
