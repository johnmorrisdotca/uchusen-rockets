// The painted side view. The element, and the WebGL context it owns, are loaded the first time this view is asked for and dropped as soon as the person leaves it.
import type { RocketOptions } from "../src/attrs.ts";
import type { UchusenRocket } from "../src/element.ts";
import { paintedCredit } from "../src/embed.ts";
import { bindStage } from "./viewBinder.ts";

let loading: Promise<void> | null = null;
let ticket = 0;

function load(): Promise<void> {
  loading ??= import("../src/element.ts").then((element) => {
    element.setAssetBase(new URL("assets/", document.baseURI).href);
  });
  return loading;
}

/** Takes the painted rocket off the page, which lets its context go. */
export function hidePainted(host: HTMLElement, barHost: HTMLElement, credit: HTMLElement): void {
  ticket += 1;
  delete host.dataset.pending;
  host.replaceChildren();
  barHost.replaceChildren();
  host.hidden = true;
  barHost.hidden = true;
  credit.textContent = "";
  credit.hidden = true;
}

/**
 * Shows the craft as a painted model, with the family's view controls. It is the same `uchusen-rocket` element the Rockets page draws, with `look="painted"`. Safe to call on every frame: the model is loaded once.
 * @param host Where the rocket sits, over the stage.
 * @param barHost Where the view controls sit, under the stage.
 * @param credit Where the model's credit is written.
 * @param options The rocket to draw. `look` is painted from here on.
 * @param turn The flight's rotation, as a CSS angle.
 * @param tiltMax How far the controls may tip the model, in degrees.
 */
export function showPainted(host: HTMLElement, barHost: HTMLElement, credit: HTMLElement, options: RocketOptions, turn: string, tiltMax: number): void {
  const apply = (rocket: UchusenRocket): void => {
    const view = options.view ?? "side";
    if (rocket.getAttribute("rocket") !== (options.rocket ?? "")) rocket.setAttribute("rocket", options.rocket ?? "");
    if (rocket.getAttribute("variant") !== (options.variant ?? "")) rocket.setAttribute("variant", options.variant ?? "");
    if (rocket.getAttribute("view") !== view) rocket.setAttribute("view", view);
    const engines = options.engines ?? "off";
    if (rocket.getAttribute("engines") !== engines) rocket.setAttribute("engines", engines);
    const bar = barHost.querySelector("kazoku-view-controls");
    const cap = String(tiltMax);
    if (bar && bar.getAttribute("tilt-max") !== cap) bar.setAttribute("tilt-max", cap);
    rocket.style.setProperty("--turn", turn);
    const line = paintedCredit({ rocket: options.rocket, variant: options.variant, look: "painted", view });
    credit.hidden = line === "";
    credit.textContent = line;
  };
  const rocket = host.querySelector("uchusen-rocket") as UchusenRocket | null;
  if (rocket) {
    host.hidden = false;
    barHost.hidden = false;
    apply(rocket);
    return;
  }
  if (host.dataset.pending === "1") return;
  host.dataset.pending = "1";
  const mine = ticket;
  void load().then(() => {
    if (mine !== ticket) return;
    delete host.dataset.pending;
    const made = document.createElement("uchusen-rocket") as UchusenRocket;
    made.id = "painted-rocket";
    made.dataset.testid = "painted-rocket";
    made.setAttribute("look", "painted");
    made.setAttribute("spin", "off");
    host.replaceChildren(made);
    barHost.replaceChildren();
    bindStage(made, (detail) => made.drive(detail), { where: barHost, theme: "dark", controls: "basic", testid: "painted-controls" });
    host.hidden = false;
    barHost.hidden = false;
    apply(made);
  });
}
