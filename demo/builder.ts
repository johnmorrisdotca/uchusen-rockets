// The code builder: choose a rocket, its look, its view and its parts, and copy the code that puts exactly that on a page. One screen, choices in rows. It draws with the package's own element and writes with `embedCode`.
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import type { EmbedPanelElement } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
import { embedCode, embedNote, LOOK_NAMES, MAKERS, OPTION_ATTRIBUTES, ROCKETS, VIEW_NAMES, attributesFromOptions, paintedCredit, rocketToParams, showsOf, variantOf, type MakerId, type RocketOptions } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { isListed } from "./listed.ts";
import { KINDS, LABELS, packageKind, panelCode, pictureOf, SIZES, type Kind } from "./embed-code.ts";

setAssetBase(new URL("assets/", document.baseURI).href);

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const rocketNode = byId<UchusenRocket>("rocket");

const first = Object.values(ROCKETS)[0];
const state = { maker: (first?.maker ?? "spacex") as MakerId, rocket: "starship", variant: "v3", show: "together", look: "line", view: "three-quarter", engines: "off" };
const panel = byId<EmbedPanelElement>("embed-panel");
const here = new URL(".", location.href).href;

function chip(label: string, testid: string, on: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.testid = testid;
  button.addEventListener("click", on);
  return button;
}

function fill(id: string, choices: readonly { id: string; label: string }[], chosen: string, prefix: string, on: (id: string) => void): void {
  const group = byId(id);
  group.replaceChildren(...choices.map((choice) => chip(choice.label, `${prefix}-${choice.id}`, () => on(choice.id))));
  for (const button of group.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === `${prefix}-${chosen}`));
}

function options(): RocketOptions {
  return { rocket: state.rocket, variant: state.variant, show: state.show, look: state.look, view: state.view, ...(state.engines === "on" ? { engines: "on" } : {}) };
}

function draw(): void {
  const entry = ROCKETS[state.rocket];
  if (!entry) return;
  fill("makers", Object.entries(MAKERS).map(([id, label]) => ({ id, label })), state.maker, "maker", (id) => {
    state.maker = id as MakerId;
    const among = Object.values(ROCKETS).find((rocket) => rocket.maker === state.maker && isListed(rocket.id));
    if (among) pick(among.id);
    else draw();
  });
  fill("rockets", Object.values(ROCKETS).filter((rocket) => rocket.maker === state.maker && isListed(rocket.id)).map((rocket) => ({ id: rocket.id, label: rocket.name })), state.rocket, "rocket", pick);
  fill("variants", entry.variants.map((variant) => ({ id: variant.id, label: variant.name })), state.variant, "variant", (id) => {
    state.variant = id;
    state.show = "together";
    draw();
  });
  const slots = variantOf(state.rocket, state.variant)?.slots ?? [];
  const shows = showsOf(slots);
  if (!shows.includes(state.show)) state.show = shows[0] ?? "together";
  fill("shows", shows.map((id) => ({ id, label: id === "together" ? "Together" : id === "apart" ? "Apart" : id })), state.show, "show", (id) => {
    state.show = id;
    draw();
  });
  fill("looks", LOOK_NAMES.map((id) => ({ id, label: id })), state.look, "look", (id) => {
    state.look = id;
    draw();
  });
  fill("views", VIEW_NAMES.map((id) => ({ id, label: id })), state.view, "view", (id) => {
    state.view = id;
    draw();
  });
  fill("engines", [{ id: "off", label: "Off" }, { id: "on", label: "On" }], state.engines, "engines", (id) => {
    state.engines = id;
    draw();
  });
  const chosen = options();
  const attributes = attributesFromOptions(chosen);
  for (const name of OPTION_ATTRIBUTES) {
    if (Object.hasOwn(attributes, name)) rocketNode.setAttribute(name, attributes[name] as string);
    else rocketNode.removeAttribute(name);
  }
  rocketNode.setAttribute("spin", "off");
  byId("builder-label").textContent = `${entry.name}, ${variantOf(state.rocket, state.variant)?.name ?? state.variant}`;
  panel.openHref = `embed.html?${rocketToParams(chosen).toString()}`;
  panel.update();
}

panel.kinds = KINDS;
panel.labels = LABELS;
panel.sizes = SIZES;
panel.size = 480;
panel.generate = ({ kind, size, preview }) => panelCode(kind as Kind, options(), { size, ...(preview ? { site: here } : {}) });
// The picture is the drawing itself, never the 3D view or an iframe: it adds no WebGL context and no frame loop to the page.
panel.preview = () => {
  const holder = document.createElement("div");
  holder.innerHTML = embedCode(options(), "svg");
  return pictureOf(holder);
};
panel.note = ({ kind }) => {
  const own = kind === "html" || kind === "iframe" || kind === "module" || kind === "svg" || kind === "data" || kind === "link";
  return own ? embedNote(packageKind(kind as Kind), options()) : "The rocket's element from the package, for a page built with a bundler. The 3D view needs three.js; the drawing does not.";
};
panel.credits = () => {
  const credit = paintedCredit(options());
  return credit === "" ? "" : `Keep this credit with a painted rocket, however you use it. ${credit}`;
};

function pick(rocket: string): void {
  const entry = ROCKETS[rocket];
  if (!entry) return;
  state.rocket = rocket;
  state.variant = entry.defaultVariant;
  state.show = "together";
  draw();
}

draw();
queueMicrotask(() => {
  document.documentElement.dataset.ready = "true";
});
