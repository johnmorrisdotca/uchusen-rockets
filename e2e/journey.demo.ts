// Journey mode in a real browser: the page opens with a trip already shown, the choices are rows of buttons kept in the address, Play reaches the summary, a craft that cannot go says why in one line, no control is left in the
// browser's own style, nothing scrolls sideways. The line views draw with no WebGL and ask for no frame while nothing moves. The painted side view is the one context, and leaving it lets that context go.
import { expect, test, type Page } from "@playwright/test";

const URL = "/uchusen-rockets/journey.html?date=2026-11-04";

const problems = (page: Page): string[] => {
  const found: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") found.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => found.push(`page: ${error.message}`));
  return found;
};

test("the page opens with Earth to Mars chosen, a verdict, a route, a map and the numbers, and the choices are rows of buttons", async ({ page }) => {
  const found = problems(page);
  await page.goto(URL);
  await expect(page.getByTestId("verdict")).toContainText("no braking engine");
  await expect(page.getByTestId("from-earth")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("to-mars")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("craft-falcon-heavy")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("when-0")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("when-0")).toContainText("2026");
  await expect(page.getByTestId("phase")).toHaveText("READY");
  await expect(page.getByTestId("craft").locator("svg")).toHaveCount(1);
  await expect(page.getByTestId("route").locator("text").first()).toBeVisible();
  await expect(page.getByTestId("trip-straight")).toContainText("km");
  await expect(page.getByTestId("trip-radiation")).toContainText("No source");
  await expect(page.getByTestId("trip-cmb")).toContainText("2.72548 K");
  await expect(page.getByTestId("trip-cmb")).toContainText("Fixsen 2009");
  await expect(page.getByTestId("trip-time")).toContainText("d");
  await expect(page.getByTestId("trip-dvout")).toContainText("km/s");
  await expect(page.getByTestId("now-speed")).toHaveText("0 m/s");
  await expect(page.getByTestId("when-stamp")).toBeVisible();
  await expect(page.getByTestId("when-date")).toContainText("UTC");
  await expect(page.getByTestId("when-day")).toContainText("Day");
  await expect(page.getByTestId("from")).toContainText("Earth");
  await expect(page.getByTestId("dest")).toContainText("Mars");
  const width = (id: string) => page.getByTestId(id).evaluate((el) => el.getBoundingClientRect().width);
  const fromStart = await width("from");
  const destStart = await width("dest");
  expect(fromStart).toBeGreaterThan(destStart * 4);
  const atStart = await page.getByTestId("when-date").innerText();
  await page.getByTestId("scrub").fill("1000");
  await expect(page.getByTestId("when-date")).not.toHaveText(atStart);
  expect(await width("dest")).toBeGreaterThan(destStart * 2);
  // the shared view bar has its own More control once the painted model is up; the journey's rows stay buttons
  const disclosures = await page.locator("details, [aria-expanded]").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        let current: Element | null = node;
        while (current) {
          if (current.tagName === "KAZOKU-VIEW-CONTROLS") return false;
          const root = current.getRootNode();
          current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
        }
        return true;
      })
      .map((node) => `${node.tagName} ${node.getAttribute("aria-label") ?? node.getAttribute("data-testid") ?? ""}`.trim()),
  );
  expect(disclosures).toEqual([]);
  expect(found).toEqual([]);
});

test("choosing a place, a craft, a date and a view changes the trip and the address, and the address opens the same trip", async ({ page }) => {
  const found = problems(page);
  await page.goto(URL);
  await page.getByTestId("to-moon").click();
  await expect(page.getByTestId("verdict")).toContainText("no braking engine");
  await page.getByTestId("craft-saturn-v").click();
  await expect(page.getByTestId("verdict")).toContainText("Rated: 43.5 t to the Moon");
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "map");
  await expect(page.getByTestId("when-date")).toContainText("UTC");
  await expect(page.getByTestId("map").locator(".path-ahead")).toHaveCount(1);
  expect(page.url()).toContain("to=moon");
  expect(page.url()).toContain("craft=saturn-v");
  expect(page.url()).toContain("view=map");
  await page.goto(page.url());
  await expect(page.getByTestId("craft-saturn-v")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("view-map")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("to-mars").click();
  await page.getByTestId("when-1").click();
  await expect(page.getByTestId("when-1")).toHaveAttribute("aria-pressed", "true");
  expect(found).toEqual([]);
});

test("a craft that cannot go says why in one line and offers no Play; one that can only fly past says so", async ({ page }) => {
  await page.goto(`${URL}&from=mars&to=earth&craft=saturn-v`);
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "cannot");
  await expect(page.getByTestId("verdict")).toContainText("leave from the Earth or the Moon");
  await expect(page.getByTestId("play")).toBeDisabled();
  await page.goto(`${URL}&craft=sls&to=mars`);
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "flyby");
  await expect(page.getByTestId("verdict")).toContainText("not enough fuel on board to stop at Mars");
  await expect(page.getByTestId("play")).toBeEnabled();
  await page.goto(`${URL}&craft=saturn-v&to=mars`);
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "not-rated");
});

test("leaving the Moon for the Earth is rated for Saturn V and can be played; Falcon Heavy cannot leave", async ({ page }) => {
  await page.goto(`${URL}&from=moon&to=earth&craft=saturn-v`);
  await expect(page.getByTestId("from-moon")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "rated");
  await expect(page.getByTestId("verdict")).toContainText("Apollo 11");
  await expect(page.getByTestId("route")).toContainText("ATMOSPHERE");
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Apollo command and service module");
  await expect(page.getByTestId("play")).toBeEnabled();
  await expect(page.getByText("Since departure")).toBeVisible();
  await page.getByTestId("view-map").click();
  const path = await page.getByTestId("map").locator(".path-ahead").boundingBox();
  // A phone's map is shorter than a desk's, so the bar is "not a dot", not a desk size.
  expect(path).not.toBeNull();
  expect(path!.width).toBeGreaterThan(20);
  expect(path!.height).toBeGreaterThan(10);
  await page.goto(`${URL}&from=moon&to=earth&craft=falcon-heavy`);
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "cannot");
  await expect(page.getByTestId("play")).toBeDisabled();
});

test("Play counts down, flies, flips, brakes and ends on a summary; the numbers move and the clocks run", async ({ page }) => {
  const found = problems(page);
  await page.goto(`${URL}&craft=saturn-v&to=moon&speed=4`);
  await page.getByTestId("play").click();
  await expect(page.getByTestId("phase")).toHaveText("MAIN ENGINE PREHEATING");
  await expect(page.getByTestId("preheat")).toBeVisible();
  await expect(page.getByTestId("ignition")).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId("now-speed")).not.toHaveText("0 m/s", { timeout: 8000 });
  await expect(page.getByTestId("phase")).toHaveText("COASTING", { timeout: 15_000 });
  await expect(page.getByTestId("timer")).toContainText("DECELERATION BURN IN");
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 40_000 });
  await expect(page.getByTestId("summary")).toContainText("Earth → Moon");
  await expect(page.getByTestId("summary")).toContainText("Saturn V");
  await expect(page.getByTestId("play")).toHaveText("Fly it again");
  expect(found).toEqual([]);
});

test("seeking to a moment draws that moment on its own, and the end shows the summary", async ({ page }) => {
  await page.goto(`${URL}&craft=kaminari&to=mars&t=30`);
  await expect(page.getByTestId("phase")).not.toHaveText("READY");
  await expect(page.getByTestId("now-since")).toContainText("T+");
  await page.goto(`${URL}&craft=kaminari&to=mars&t=1000`);
  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.getByTestId("now-speed")).toHaveText("0 m/s");
  await expect(page.getByTestId("summary-leaves")).toContainText("UTC");
  await expect(page.getByTestId("summary-arrives")).toContainText("UTC");
  await expect(page.getByTestId("summary")).toContainText("runs slower than the clocks at the two ends");
  await expect(page.getByTestId("summary")).toContainText("smaller than the times above");
  const fit = await page.getByTestId("summary").evaluate((el) => {
    const stage = el.closest("[data-testid=stage]");
    const card = el.getBoundingClientRect();
    const box = stage?.getBoundingClientRect();
    const inside = !!box && card.top >= box.top - 1 && card.bottom <= box.bottom + 1 && card.left >= box.left - 1 && card.right <= box.right + 1;
    return { inside, slack: el.clientHeight - el.scrollHeight };
  });
  expect(fit.inside, "the arrival card stays inside the stage").toBe(true);
  expect(fit.slack, "the arrival card shows every row").toBeGreaterThanOrEqual(-1);
  await page.goto(`${URL}&craft=saturn-v&to=moon&t=1000`);
  await expect(page.getByTestId("summary")).toBeVisible();
  await expect(page.getByTestId("summary")).not.toContainText("runs slower");
});

test("no control is left in the browser's own style, and nothing scrolls sideways", async ({ page }) => {
  await page.goto(URL);
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    for (const node of document.querySelectorAll<HTMLElement>("button, input, select, textarea")) {
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const css = getComputedStyle(node);
      const name = `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.dataset.testid ? `[${node.dataset.testid}]` : ""}`;
      if (node.tagName === "INPUT" && (node as HTMLInputElement).type === "range") {
        if (css.appearance !== "none") out.push(`${name}: appearance ${css.appearance}`);
        continue;
      }
      if (css.borderTopLeftRadius === "0px") out.push(`${name}: square corners`);
      if (css.backgroundColor === "rgb(239, 239, 239)" || css.backgroundColor === "rgba(239, 239, 239, 1)") out.push(`${name}: the default grey`);
      if (box.height < 43.5) out.push(`${name}: ${box.height}px high`);
    }
    return out;
  });
  expect(bad).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the page makes no WebGL context and asks for no frame while nothing moves", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: number; __raf: number };
    w.__gl = 0;
    w.__raf = 0;
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (/webgl/i.test(kind)) w.__gl += 1;
      return (real as (...args: unknown[]) => unknown).call(this, kind, ...rest) as never;
    } as typeof real;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      w.__raf += 1;
      return raf(callback);
    };
  });
  await page.goto(`${URL}&look=line`);
  await expect(page.getByTestId("phase")).toHaveText("READY");
  const before = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  expect(after - before).toBe(0);
  await page.getByTestId("view-map").click();
  await page.locator("#speeds").getByRole("button", { name: "4×" }).click();
  await page.getByTestId("play").click();
  await expect(page.getByTestId("phase")).not.toHaveText("READY");
  await page.getByTestId("play").click();
  const paused = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => (window as unknown as { __raf: number }).__raf)) - paused).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBe(0);
});

test("the Japanese page says its words in Japanese and keeps the trip", async ({ page }) => {
  await page.goto(`${URL}&lang=ja`);
  await expect(page.getByTestId("phase")).toHaveText("準備完了");
  await expect(page.getByTestId("play")).toHaveText("再生");
  await expect(page.getByTestId("to-mars")).toHaveText("火星");
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-level", "flyby");
  await page.getByTestId("craft-saturn-v").click();
  await page.getByTestId("to-moon").click();
  await expect(page.getByTestId("trip-fuel")).toContainText("、");
});

test("after each burn only what is left is drawn: the whole rocket, the upper stage with its payload, then the payload", async ({ page }) => {
  const found = problems(page);
  await page.goto(`${URL}&craft=saturn-v&to=moon`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Saturn V");
  const size = async () => (await page.getByTestId("craft").locator("svg").innerHTML()).length;
  const whole = await size();
  await page.goto(`${URL}&craft=saturn-v&to=moon&t=26`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "S-IVB with the Apollo spacecraft");
  const upper = await size();
  await page.goto(`${URL}&craft=saturn-v&to=moon&t=51`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Apollo command and service module");
  const payload = await size();
  expect(whole).toBeGreaterThan(upper);
  expect(upper).toBeGreaterThan(payload);
  await page.goto(`${URL}&craft=falcon-heavy&to=mars&t=26`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Upper stage with its payload");
  await page.goto(`${URL}&craft=sls&to=moon&t=26`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Upper stage with Orion");
  expect(found).toEqual([]);
});

test("Falcon Heavy at lift-off shows all three cores", async ({ page }) => {
  await page.goto(`${URL}&craft=falcon-heavy&to=mars`);
  await expect(page.getByTestId("craft")).toHaveAttribute("data-stage", "Falcon Heavy");
  // three cores are many more paths than the upper stage and its payload
  await page.goto(`${URL}&craft=falcon-heavy&to=mars`);
  const paths = await page.getByTestId("craft").locator("svg path").count();
  await page.goto(`${URL}&craft=falcon-heavy&to=mars&t=26`);
  const upperPaths = await page.getByTestId("craft").locator("svg path").count();
  expect(paths).toBeGreaterThan(upperPaths * 2);
});

test("the Fuel row is the propellant used or n/a with a reason, and the payload has its own row, named for the target", async ({ page }) => {
  await page.goto(`${URL}&craft=falcon-heavy&to=mars`);
  await expect(page.getByTestId("trip-payload")).toHaveText("16.8 t");
  await expect(page.locator("#trip").getByText("Payload to Mars")).toBeVisible();
  await expect(page.getByTestId("trip-fuel")).toContainText("n/a: it does not brake");
  await expect(page.getByTestId("trip-ratio")).toContainText("n/a: it does not brake");
  await page.goto(`${URL}&craft=saturn-v&to=moon`);
  await expect(page.getByTestId("trip-payload")).toHaveText("43.5 t");
  await expect(page.getByTestId("trip-fuel")).toContainText("10.2 t");
  await expect(page.getByTestId("trip-escsurf")).toContainText("km/s");
  await expect(page.getByTestId("trip-escpark")).toContainText("km/s");
  await expect(page.getByTestId("trip-ratio")).toContainText("the braking burn only");
  await page.goto(`${URL}&craft=saturn-v&to=mars`);
  await expect(page.getByTestId("trip-payload")).toContainText("n/a: no published payload figure covers a trip to Mars");
  await page.goto(`${URL}&craft=kaminari&to=mars`);
  await expect(page.getByTestId("trip-fuel")).toContainText("/");
  await expect(page.getByTestId("trip-ratio")).toHaveText(/^[0-9]+\.[0-9]+$/);
  await expect(page.getByTestId("trip-escsurf")).toHaveCount(0);
  await expect(page.getByTestId("trip-payload")).toContainText("million t");
});

test("Side, Front, Rear, Cockpit and Map are one row, and each one changes the picture", async ({ page }) => {
  const found = problems(page);
  await page.goto(`${URL}&look=line`);
  const names = ["side", "front", "rear", "cockpit", "chase", "orbit", "map"];
  const tops = [];
  for (const name of names) {
    const box = await page.getByTestId(`view-${name}`).boundingBox();
    expect(box).not.toBeNull();
    tops.push(box!.y);
  }
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);
  await page.getByTestId("view-front").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "front");
  await expect(page.getByTestId("dest")).toBeVisible();
  await expect(page.getByTestId("from")).toBeHidden();
  await expect(page.getByTestId("craft").locator("svg")).toHaveCount(1);
  expect(page.url()).toContain("view=front");
  await page.getByTestId("view-rear").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "rear");
  await expect(page.getByTestId("craft").locator("svg")).toHaveCount(1);
  await page.getByTestId("view-cockpit").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "cockpit");
  await expect(page.getByTestId("dest")).toBeVisible();
  await expect(page.getByTestId("dest")).toContainText("Mars");
  await expect(page.getByTestId("from")).toBeHidden();
  await expect(page.getByTestId("craft")).toBeHidden();
  await page.getByTestId("view-chase").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "chase");
  await expect(page.getByTestId("dest")).toBeVisible();
  await expect(page.getByTestId("craft").locator("svg")).toHaveCount(1);
  await page.getByTestId("view-orbit").click();
  await expect(page.getByTestId("stage")).toHaveAttribute("data-view", "orbit");
  await expect(page.getByTestId("dest")).toBeHidden();
  await expect(page.getByTestId("craft").locator("svg")).toHaveCount(1);
  await page.getByTestId("hold").click();
  await expect(page.getByTestId("hold")).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toContain("hold=1");
  const svg = page.getByTestId("craft").locator("svg");
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2);
  await page.mouse.up();
  await expect(page.getByTestId("craft")).not.toHaveAttribute("data-yaw", "0");
  expect(found).toEqual([]);
});

test("Painted is the one WebGL context, and leaving Side lets it go", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: number };
    w.__gl = 0;
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (/webgl/i.test(kind)) w.__gl += 1;
      return (real as (...args: unknown[]) => unknown).call(this, kind, ...rest) as never;
    } as typeof real;
  });
  await page.goto(`${URL}&look=line`);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBe(0);
  await page.getByTestId("look-painted").click();
  await expect(page.getByTestId("painted-rocket")).toBeVisible();
  await expect(page.getByTestId("painted-rocket")).toHaveAttribute("look", "painted");
  await expect(page.getByTestId("painted-controls")).toBeVisible();
  await expect(page.getByTestId("painted-note")).toBeHidden();
  const bar = await page.getByTestId("painted-bar").evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(bar).toBe("rgb(28, 29, 34)");
  await expect.poll(() => page.getByTestId("painted-rocket").getAttribute("data-state")).toBe("3d");
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBeGreaterThan(0);
  await page.getByTestId("view-front").click();
  await expect(page.getByTestId("painted-rocket")).toBeVisible();
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("painted-rocket")).toHaveCount(0);
  const left = await page.evaluate(() => (window as unknown as { __gl: number }).__gl);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBe(left);
  await page.getByTestId("view-side").click();
  await expect(page.getByTestId("painted-rocket")).toBeVisible();
  expect(page.url()).not.toContain("look=");
});

test("the painted craft stays whole and every HUD block has the same backing", async ({ page }) => {
  await page.goto(`${URL}&from=earth&to=jupiter&craft=falcon-heavy&look=painted`);
  const rocket = page.getByTestId("painted-rocket");
  await expect(rocket).toBeVisible();
  await expect(rocket).toHaveAttribute("look", "painted");
  const read = () => page.evaluate(() => {
    const stage = document.querySelector(".jr-stage")!.getBoundingClientRect();
    const craft = document.getElementById("painted-rocket")!.getBoundingClientRect();
    const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
    const hits = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const speed = box("speed");
    const when = box("when-stamp");
    const phase = box("phase");
    return {
      inside: craft.width > 40 && craft.left >= stage.left - 1 && craft.right <= stage.right + 1 && craft.top >= stage.top - 1 && craft.bottom <= stage.bottom + 1,
      clear: !hits(craft, speed) && !hits(craft, when) && !hits(craft, phase),
      plate: getComputedStyle(document.getElementById("speed")!).backgroundColor,
    };
  });
  await expect.poll(async () => (await read()).inside).toBe(true);
  const start = await read();
  expect(start.clear).toBe(true);
  expect(start.plate).toBe("rgba(5, 10, 20, 0.82)");
  await page.getByTestId("scrub").evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = input.max;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByTestId("summary-close").click();
  await expect(page.getByTestId("phase")).toHaveText("ARRIVED");
  await expect.poll(async () => (await read()).inside).toBe(true);
  await expect.poll(async () => (await read()).clear).toBe(true);
});

test("a ship that burns all the way can be asked for 1 g, and a rocket is not offered the choice", async ({ page }) => {
  await page.goto(`${URL}&craft=kaminari`);
  await expect(page.getByTestId("pull-field")).toBeVisible();
  await expect(page.getByTestId("pull-ship")).toHaveAttribute("aria-pressed", "true");
  const rated = await page.getByTestId("trip-time").innerText();
  await page.getByTestId("pull-1").click();
  await expect(page.getByTestId("pull-1")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("verdict")).toContainText("at 1 g");
  await expect(page.getByTestId("verdict")).toContainText("rated at 0.015 g");
  expect(page.url()).toContain("pull=1");
  expect(await page.getByTestId("trip-time").innerText()).not.toBe(rated);
  await page.goto(page.url());
  await expect(page.getByTestId("pull-1")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("craft-falcon-heavy").click();
  await expect(page.getByTestId("pull-field")).toBeHidden();
  expect(page.url()).not.toContain("pull=");
});

test("a rocket to Saturn can swing past Jupiter, and the path says it is an assist", async ({ page }) => {
  await page.goto(`${URL}&from=earth&to=saturn&craft=falcon-heavy&view=map&via=jupiter`);
  await expect(page.getByTestId("via-field")).toBeVisible();
  await expect(page.getByTestId("via-jupiter")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("map").locator("[data-assist=jupiter]")).toHaveText("ASSIST");
  await expect(page.getByTestId("trip-swing")).toContainText("km/s");
  await expect(page.getByTestId("verdict")).toContainText("swings past Jupiter");
  expect(page.url()).toContain("via=jupiter");
  await page.getByTestId("via-direct").click();
  await expect(page.getByTestId("trip-swing")).toHaveCount(0);
  expect(page.url()).not.toContain("via=");
  await page.getByTestId("to-mars").click();
  await expect(page.getByTestId("via-field")).toBeHidden();
  await page.goto(`${URL}&from=moon&to=saturn&craft=saturn-v`);
  await expect(page.getByTestId("via-field")).toBeHidden();
});

test("perceived size is the default and the destination grows through the trip; true size is a choice", async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("size-perceived")).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).not.toContain("size=");
  const span = () => page.getByTestId("dest").getAttribute("data-span").then((value) => Number(value));
  const start = await span();
  expect(start).toBeLessThan(0.08);
  await page.getByTestId("scrub").fill("400");
  const mid = await span();
  await page.getByTestId("scrub").fill("1000");
  const end = await span();
  expect(mid).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(mid);
  expect(end).toBeGreaterThan(0.5);
  await page.getByTestId("size-true").click();
  expect(page.url()).toContain("size=true");
  await expect(page.getByTestId("size-true")).toHaveAttribute("aria-pressed", "true");
});

test("Painted draws a painted planet and the craft's painted model", async ({ page }) => {
  await page.goto(`${URL}&look=painted`);
  await expect(page.getByTestId("stage")).toHaveAttribute("data-look", "painted");
  const planet = page.getByTestId("dest").locator("wakusei-body");
  await expect(planet).toHaveAttribute("body", "mars");
  await expect(planet).toHaveAttribute("look", "painted");
  await expect(page.getByTestId("painted-rocket")).toBeVisible();
  await expect(page.getByTestId("from").locator("chikyu-earth-realistic")).toBeVisible();
});

test("the arrival card closes by the cross, Escape and a click outside, and Summary opens it again", async ({ page }) => {
  await page.goto(`${URL}&craft=saturn-v&to=moon&t=1000`);
  const card = page.getByTestId("summary");
  await expect(card).toBeVisible();
  const stage = await page.getByTestId("stage").boundingBox();
  const box = await card.boundingBox();
  expect(stage && box && box.width < stage.width * 0.9).toBe(true);
  await page.getByTestId("summary-close").click();
  await expect(card).toBeHidden();
  await page.getByTestId("summary-open").click();
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await page.getByTestId("summary-open").click();
  await page.getByTestId("stage").click({ position: { x: 8, y: 8 } });
  await expect(card).toBeHidden();
});

test("a trip that cannot start says why on the stage and on Play, and can leave from the Earth", async ({ page }) => {
  await page.goto(`${URL}&from=uranus&to=saturn&craft=falcon-heavy`);
  await expect(page.getByTestId("blocked")).toBeVisible();
  await expect(page.getByTestId("blocked-title")).toHaveText("NO TRIP");
  await expect(page.getByTestId("phase")).toHaveText("");
  await expect(page.getByTestId("blocked-why")).toContainText("leave from the Earth or the Moon");
  await expect(page.getByTestId("play")).toBeDisabled();
  await expect(page.getByTestId("play")).toHaveAttribute("title", /leave from the Earth or the Moon/);
  await page.getByTestId("leave-earth").click();
  await expect(page.getByTestId("from-earth")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("blocked")).toBeHidden();
  await expect(page.getByTestId("play")).toBeEnabled();
});

test("the page bar links every page on one row and marks this page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  const bar = page.getByTestId("page-links");
  for (const name of ["Rockets", "Compare", "Journey", "Fleet", "Yard", "Builder", "Docs", "Embed"]) {
    await expect(bar.getByRole("link", { name })).toBeVisible();
  }
  await expect(bar.getByRole("button", { name: "Help" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Journey" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("link", { name: "Compare" })).toHaveAttribute("href", "compare.html");
  const tops = await bar.locator("a, button").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
  expect(new Set(tops).size, tops.join(",")).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
