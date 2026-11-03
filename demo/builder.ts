// The code builder: choose a rocket, its look, its view and its parts, and copy the code that puts exactly that on a page. One screen, choices in rows. It draws with the package's own element and writes with `embedCode`.
import { EMBED_KINDS, embedCode, embedNote, LOOK_NAMES, MAKERS, OPTION_ATTRIBUTES, ROCKETS, VIEW_NAMES, attributesFromOptions, paintedCredit, rocketToParams, showsOf, variantOf, type EmbedKind, type MakerId, type RocketOptions } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";

setAssetBase(new URL("assets/", document.baseURI).href);

const KIND_WORDS: Readonly<Record<EmbedKind, string>> = { element: "CDN script", iframe: "Iframe", module: "Module", svg: "SVG", data: "Data address", link: "Image link" };
const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const rocketNode = byId<UchusenRocket>("rocket");

const first = Object.values(ROCKETS)[0];
const state = { maker: (first?.maker ?? "spacex") as MakerId, rocket: "starship", variant: "v3", show: "together", look: "line", view: "three-quarter", engines: "off", kind: "element" as EmbedKind };
let full = "";

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
    const among = Object.values(ROCKETS).find((rocket) => rocket.maker === state.maker);
    if (among) pick(among.id);
    else draw();
  });
  fill("rockets", Object.values(ROCKETS).filter((rocket) => rocket.maker === state.maker).map((rocket) => ({ id: rocket.id, label: rocket.name })), state.rocket, "rocket", pick);
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
  fill("kinds", EMBED_KINDS.map((id) => ({ id, label: KIND_WORDS[id] })), state.kind, "kind", (id) => {
    state.kind = id as EmbedKind;
    draw();
  });
  for (const button of byId("kinds").querySelectorAll("button")) {
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(button.getAttribute("aria-pressed") === "true"));
    button.removeAttribute("aria-pressed");
  }
  const chosen = options();
  const attributes = attributesFromOptions(chosen);
  for (const name of OPTION_ATTRIBUTES) {
    if (Object.hasOwn(attributes, name)) rocketNode.setAttribute(name, attributes[name] as string);
    else rocketNode.removeAttribute(name);
  }
  rocketNode.setAttribute("spin", "off");
  byId("builder-label").textContent = `${entry.name}, ${variantOf(state.rocket, state.variant)?.name ?? state.variant}`;
  full = embedCode(chosen, state.kind);
  byId("embed-note").textContent = embedNote(state.kind, chosen);
  byId("code").textContent = full.length > 1600 ? `${full.slice(0, 1600)}…` : full;
  const credit = paintedCredit(chosen);
  const creditNode = byId("credit");
  creditNode.hidden = credit === "";
  creditNode.textContent = credit === "" ? "" : `Keep this credit with a painted rocket, however you use it. ${credit}`;
  byId<HTMLAnchorElement>("open").href = `embed.html?${rocketToParams(chosen).toString()}`;
  byId("status").textContent = "";
}

function pick(rocket: string): void {
  const entry = ROCKETS[rocket];
  if (!entry) return;
  state.rocket = rocket;
  state.variant = entry.defaultVariant;
  state.show = "together";
  draw();
}

byId("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(full);
    byId("status").textContent = "Copied.";
  } catch {
    byId("status").textContent = "Your browser would not copy. Select the code and copy it.";
  }
});

draw();
queueMicrotask(() => {
  document.documentElement.dataset.ready = "true";
});
