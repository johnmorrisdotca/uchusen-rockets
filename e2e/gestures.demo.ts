// The family's gesture check (kazoku-ui checkGestures) on every interactive view: turn, roll, keys, wheel, pinch, the moves and fit. A gesture a view does not have is named with its reason.
import { expect, test } from "@playwright/test";
import { checkGestures, type GestureName } from "@johnmorrisdotca/kazoku-ui/testing";
import { foldPicker } from "./picker.ts";

const BASE = "/uchusen-rockets/";

type Lacks = Partial<Record<GestureName | "picture", string>>;
const FLAT: Lacks = {
  turn: "a flat picture has no turn",
  roll: "a flat picture has no roll",
  "key-turn": "a flat picture has no turn",
};

const VIEWS: readonly { name: string; page: string; view: string; controls: string; lacks?: Lacks; height?: number }[] = [
  { name: "the rocket", page: "index.html?picker=off", view: "#hero", controls: "#view-bar" },
  // The record's own ship is Hanabusa, whose painted build takes seconds a frame in software GL: the check takes a picture for each of its 13 gestures and ran out of its four minutes on a runner
  // (MODULES-905). The hands are the page's, not the ship's, so the check is made on the lightest ship of the record.
  { name: "the fleet record", page: "fleet-db.html?picker=off&ship=fleet-kaminari", view: "#hero", controls: "kazoku-view-controls" },
  { name: "the drones", page: "inspect.html", view: "#hero", controls: "#view-bar" },
  { name: "the yard", page: "yard.html?picker=off", view: "#yard-view", controls: "#view-bar", lacks: { picture: "the Earth behind the yard is its own still picture, so the moved yard cannot be told apart in a photograph of the middle" } },
  { name: "the comparison's first view", page: "compare.html?picker=off", view: "#hero", controls: "#view-bar", lacks: { turn: "a drag that starts on a floating craft throws that craft, and the middle of this view holds one", roll: "the scale scene stays level" } },
  { name: "the fleet comparison", page: "fleet-compare.html", view: "#cmp-view", controls: "#cmp-bar", height: 3400, lacks: { ...FLAT, "ctrl-drag-pan": "on the Linux CI machine a Ctrl or Command drag moves this view only by its first step, though it passes on a Mac (a ticket is open)", "space-drag-pan": "on the Linux CI machine a Space drag moves this view only by its first step, though it passes on a Mac (a ticket is open)", picture: "the stage is a 3000 px tall scale chart, so a photograph of its middle cannot be matched to a move (a ticket is open)" } },
  { name: "the journey", page: "journey.html?picker=off", view: ".jr-stage", controls: "kazoku-view-controls", lacks: FLAT },
  { name: "the poster", page: "poster.html", view: "#poster-stage", controls: "kazoku-view-controls", lacks: FLAT },
  { name: "the drone swarm map", page: "swarm.html", view: "#swarm-stage", controls: "kazoku-view-controls", lacks: FLAT },
  { name: "the tractor beam pictures", page: "beam.html", view: "#beam-stage", controls: "kazoku-view-controls", lacks: FLAT },
];

for (const one of VIEWS) {
  test(`${one.name} (${one.page}): every gesture the family has`, async ({ page }) => {
    test.skip(test.info().project.name !== "chromium-desk", "A mouse and a keyboard");
    test.setTimeout(240_000);
    // a view taller than the window gets a window that holds all of it, so every gesture lands on the view
    if (one.height) await page.setViewportSize({ width: 1280, height: one.height });
    await page.goto(`${BASE}${one.page}`);
    await foldPicker(page);
    await page.locator(one.controls).first().evaluate((node) => (node as HTMLElement & { pause?: () => void }).pause?.());
    await page.locator(one.view).scrollIntoViewIfNeeded();
    const report = await checkGestures(page, one.view, { controls: one.controls, ...(one.lacks ? { lacks: one.lacks } : {}) });
    expect(report.length).toBeGreaterThan(5);
  });
}
