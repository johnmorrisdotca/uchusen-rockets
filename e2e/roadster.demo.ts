// The Roadster: one kind, three cars chosen in a row. Each car's model is fetched only when it is chosen, and changing car frees the one before. Given the Sun's direction, the lit side faces it.
import { expect, test, type Page } from "@playwright/test";

const CARS = ["first-generation", "second-generation", "second-generation-2"] as const;

/** Live WebGL buffers and textures, counted from the calls that make and delete them. */
const COUNT = () => {
  const live = { Buffer: 0, Texture: 0 };
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[])
    for (const kind of ["Buffer", "Texture"] as const) {
      const make = proto[`create${kind}`];
      const free = proto[`delete${kind}`];
      proto[`create${kind}`] = function (this: object, ...args: unknown[]) {
        live[kind] += 1;
        return make.apply(this, args);
      };
      proto[`delete${kind}`] = function (this: object, ...args: unknown[]) {
        if (args[0]) live[kind] -= 1;
        return free.apply(this, args);
      };
    }
  Object.assign(window, { __live: live });
};
const live = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __live: { Buffer: number; Texture: number } }).__live }));

test("each car's model loads only when it is chosen, and the one before is freed", async ({ page, browserName }, info) => {
  // one counter of the GPU's buffers for the whole page: read in software Chromium at a desk's width only, as the freeze test does
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "the GPU count is read in desk Chromium only");
  await page.addInitScript(COUNT);
  const fetched: string[] = [];
  page.on("request", (request) => {
    const name = /models\/(roadster-[a-z0-9-]+\.glb)$/.exec(request.url())?.[1];
    if (name) fetched.push(name);
  });
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(`/uchusen-rockets/?rocket=roadster&variant=${CARS[0]}&look=painted`);
  const hero = page.getByTestId("hero");
  const canvas = hero.locator("canvas");
  // the car is a licensed model and Starman this package's own, so the painted picture is mixed once the model is in
  await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  expect(fetched).toEqual([`roadster-${CARS[0]}-car.glb`]);
  const first = await live(page);
  // the three choices sit in one row
  for (const car of CARS) await expect(page.getByTestId(`variant-${car}`)).toBeVisible();
  for (const car of [CARS[1], CARS[2]]) {
    const arrived = page.waitForResponse((response) => response.url().endsWith(`models/roadster-${car}-car.glb`));
    await page.getByTestId(`variant-${car}`).click();
    await expect(hero).toHaveAttribute("variant", car);
    await arrived;
    await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  }
  // each was fetched once, when it was chosen, and no other car's file
  expect(fetched).toEqual(CARS.map((car) => `roadster-${car}-car.glb`));
  await page.getByTestId(`variant-${CARS[0]}`).click();
  await expect(hero).toHaveAttribute("variant", CARS[0]);
  await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  // back on the first car, what the other two took is given back
  await expect.poll(async () => (await live(page)).Buffer).toBeLessThanOrEqual(first.Buffer);
  await expect.poll(async () => (await live(page)).Texture).toBeLessThanOrEqual(first.Texture);
  expect(problems).toEqual([]);
});

/** How much brighter the right half of the picture is than the left, and how bright it is overall. */
const tilt = async (page: Page): Promise<{ tilt: number; mean: number }> => {
  const shot = (await page.locator("#r canvas").screenshot()).toString("base64");
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const board = document.createElement("canvas");
    board.width = image.naturalWidth;
    board.height = image.naturalHeight;
    const context = board.getContext("2d") as CanvasRenderingContext2D;
    context.drawImage(image, 0, 0);
    const { data: pixels, width, height } = context.getImageData(0, 0, board.width, board.height);
    let left = 0;
    let right = 0;
    for (let y = 0; y < height; y += 2)
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const luma = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
        if (x < width / 2) left += luma;
        else right += luma;
      }
    const cells = (width * height) / 4;
    return { tilt: (right - left) / cells, mean: (right + left) / cells };
  }, shot);
};

test("in space the car is lit from the Sun's side: from one side, then from the other", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "one picture test is enough");
  await page.goto("/uchusen-rockets/element-check.html");
  await page.evaluate(() => {
    document.body.style.cssText = "margin:0;background:#000";
    const rocket = document.createElement("uchusen-rocket");
    rocket.id = "r";
    rocket.style.cssText = "display:block;width:640px;height:400px";
    for (const [name, value] of [["rocket", "roadster"], ["variant", "first-generation"], ["look", "painted"], ["view", "front"], ["spin", "off"]]) rocket.setAttribute(name, value);
    document.body.replaceChildren(rocket);
  });
  const canvas = page.locator("#r canvas");
  await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  // a new Sun draws a new frame
  const lightFrom = async (sun: string) => {
    const frames = Number((await canvas.getAttribute("data-frames")) ?? "0");
    await page.locator("#r").evaluate((node, value) => node.setAttribute("sun", value), sun);
    await expect(canvas).toHaveAttribute("data-sun", "on");
    await expect.poll(async () => Number((await canvas.getAttribute("data-frames")) ?? "0")).toBeGreaterThan(frames);
  };
  await lightFrom("1,0.2,0");
  const one = await tilt(page);
  await lightFrom("-1,0.2,0");
  const other = await tilt(page);
  // the bright half changes sides with the Sun, by a clear margin
  expect(Math.sign(one.tilt)).toBe(-Math.sign(other.tilt));
  expect(Math.abs(one.tilt - other.tilt)).toBeGreaterThan(1.5);
  // without a Sun the showroom light comes back: lit from the front and all round, so the whole picture is brighter than under one Sun
  const frames = Number((await canvas.getAttribute("data-frames")) ?? "0");
  await page.locator("#r").evaluate((node) => node.removeAttribute("sun"));
  await expect(canvas).toHaveAttribute("data-sun", "off");
  await expect.poll(async () => Number((await canvas.getAttribute("data-frames")) ?? "0")).toBeGreaterThan(frames);
  const showroom = await tilt(page);
  expect(showroom.mean).toBeGreaterThan(Math.max(one.mean, other.mean) * 1.2);
});

test("Falcon Heavy takes any of the three cars: a second-generation car is fetched when it is chosen, says it has not flown, and is given back", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "the GPU count is read in desk Chromium only");
  await page.addInitScript(COUNT);
  const fetched: string[] = [];
  page.on("request", (request) => {
    const name = /models\/(roadster-[a-z0-9-]+\.glb)$/.exec(request.url())?.[1];
    if (name) fetched.push(name);
  });
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto("/uchusen-rockets/?rocket=falcon-heavy&variant=test-flight&look=painted");
  const hero = page.getByTestId("hero");
  const canvas = hero.locator("canvas");
  await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  expect(fetched).toEqual(["roadster-first-generation-car.glb"]);
  const first = await live(page);
  // the payload slot's three cars sit in the one row of variants, with the plain Falcon Heavy
  for (const id of ["falcon-heavy", "test-flight", "test-flight-second-generation", "test-flight-second-generation-2"]) await expect(page.getByTestId(`variant-${id}`)).toBeVisible();
  for (const car of ["second-generation", "second-generation-2"]) {
    const id = `test-flight-${car}`;
    const arrived = page.waitForResponse((response) => response.url().endsWith(`models/roadster-${car}-car.glb`));
    await page.getByTestId(`variant-${id}`).click();
    await expect(hero).toHaveAttribute("variant", id);
    await arrived;
    await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
    // the car that has not flown is named as not flown
    await expect(page.getByTestId(`variant-${id}`)).toContainText(/not flown/i);
  }
  expect(fetched).toEqual(["roadster-first-generation-car.glb", "roadster-second-generation-car.glb", "roadster-second-generation-2-car.glb"]);
  await page.getByTestId("variant-test-flight").click();
  await expect(hero).toHaveAttribute("variant", "test-flight");
  await expect(canvas).toHaveAttribute("data-painted", "mixed", { timeout: 60_000 });
  // back on the first car, what the other two took is given back
  await expect.poll(async () => (await live(page)).Buffer).toBeLessThanOrEqual(first.Buffer);
  await expect.poll(async () => (await live(page)).Texture).toBeLessThanOrEqual(first.Texture);
  expect(problems).toEqual([]);
});
