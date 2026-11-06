// The builder and the Embed page share this screen: the same rows, the same live rocket and the same embed panel.
// The builder leaves the address alone. The Embed page reads it and writes the choice back. The copied code still points at the bare frame, embed.html.
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import type { EmbedPanelElement } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
import { embedCode, embedNote, LOOK_NAMES, MAKERS, OPTION_ATTRIBUTES, ROCKETS, VIEW_NAMES, attributesFromOptions, paintedCredit, rocketFromParams, rocketToParams, showsOf, variantOf, type MakerId, type RocketOptions } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { isListed } from "./listed.ts";
import { KINDS, LABELS, packageKind, panelCode, pictureOf, SIZES, type Kind } from "./embed-code.ts";
import { fillChoices, fillEngines, fillLooks, fillParts, fillViews } from "./chip.ts";

/** Fills the builder's rows. `address` keeps the choice in the query, which the Embed page does and the builder does not. */
export function mountCodePage(options: { address: boolean }): void {
  setAssetBase(new URL("assets/", document.baseURI).href);

  const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
  const rocketNode = byId<UchusenRocket>("rocket");
  const first = Object.values(ROCKETS)[0];
  const state = { maker: (first?.maker ?? "spacex") as MakerId, rocket: "starship", variant: "v3", show: "together", look: "line", view: "three-quarter", engines: "off" };
  const panel = byId<EmbedPanelElement>("embed-panel");
  const here = new URL(".", location.href).href;

  function fill(id: string, choices: readonly { id: string; label: string }[], chosen: string, prefix: string, on: (id: string) => void): void {
    fillChoices(byId(id), choices, chosen, prefix, on);
  }

  function chosenOptions(): RocketOptions {
    return { rocket: state.rocket, variant: state.variant, show: state.show, look: state.look, view: state.view, ...(state.engines === "on" ? { engines: "on" } : {}) };
  }

  function readAddress(): void {
    if (!options.address) return;
    const asked = rocketFromParams(new URLSearchParams(location.search));
    const entry = asked.rocket ? ROCKETS[asked.rocket] : undefined;
    if (!entry || !isListed(entry.id)) return;
    state.rocket = entry.id;
    state.maker = entry.maker as MakerId;
    state.variant = entry.variants.some((variant) => variant.id === asked.variant) ? asked.variant ?? entry.defaultVariant : entry.defaultVariant;
    const shows = showsOf(variantOf(state.rocket, state.variant)?.slots ?? []);
    state.show = asked.show && shows.includes(asked.show) ? asked.show : "together";
    state.look = asked.look && (LOOK_NAMES as readonly string[]).includes(asked.look) ? asked.look : "line";
    state.view = asked.view && (VIEW_NAMES as readonly string[]).includes(asked.view) ? asked.view : "three-quarter";
    state.engines = asked.engines === "on" ? "on" : "off";
  }

  function writeAddress(chosen: RocketOptions): void {
    if (!options.address) return;
    const next = `?${rocketToParams(chosen).toString()}`;
    if (location.search !== next) history.replaceState(null, "", next);
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
    fillParts(byId("shows"), shows, state.show, (id) => {
      state.show = id;
      draw();
    });
    fillLooks(byId("looks"), state.look, (id) => {
      state.look = id;
      draw();
    });
    fillViews(byId("views"), state.view, (id) => {
      state.view = id;
      draw();
    });
    fillEngines(byId("engines"), state.engines, (id) => {
      state.engines = id;
      draw();
    });
    const chosen = chosenOptions();
    const attributes = attributesFromOptions(chosen);
    for (const name of OPTION_ATTRIBUTES) {
      if (Object.hasOwn(attributes, name)) rocketNode.setAttribute(name, attributes[name] as string);
      else rocketNode.removeAttribute(name);
    }
    rocketNode.setAttribute("spin", "off");
    byId("builder-label").textContent = `${entry.name}, ${variantOf(state.rocket, state.variant)?.name ?? state.variant}`;
    panel.openHref = `embed.html?${rocketToParams(chosen).toString()}`;
    panel.update();
    writeAddress(chosen);
  }

  panel.kinds = KINDS;
  panel.labels = LABELS;
  panel.sizes = SIZES;
  panel.size = 480;
  panel.generate = ({ kind, size, preview }) => panelCode(kind as Kind, chosenOptions(), { size, ...(preview ? { site: here } : {}) });
  panel.preview = () => {
    const holder = document.createElement("div");
    holder.innerHTML = embedCode(chosenOptions(), "svg");
    return pictureOf(holder);
  };
  panel.note = ({ kind }) => {
    const own = kind === "html" || kind === "iframe" || kind === "module" || kind === "svg" || kind === "data" || kind === "link";
    return own ? embedNote(packageKind(kind as Kind), chosenOptions()) : "The rocket's element from the package, for a page built with a bundler. The 3D view needs three.js; the drawing does not.";
  };
  panel.credits = () => {
    const credit = paintedCredit(chosenOptions());
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

  readAddress();
  draw();
  queueMicrotask(() => {
    document.documentElement.dataset.ready = "true";
  });
}
