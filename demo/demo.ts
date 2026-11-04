// The demo page: a rocket large with its controls, a comparison to scale, the part builder, the parts alone and every source. Everything comes from the package's own entries.
import { builderState, check, flightOf, MAKERS, type MakerId, embedCode, embedNote, paintedCredit, rocketToParams, type RocketOptions, type Figure, figureWords, LOOK_NAMES, type LookName, MODEL_CREDITS, PART_ENTRIES, PLANNED_ROCKETS, ROCKETS, SLOT_NAMES, SOURCES, type SourceId, type Variant, VIEW_NAMES, type ViewName, showsOf, variantOf, creditLine, type CreditId } from "../src/index.ts";
import { PICTURE_H, PICTURE_W } from "../src/framing.ts";
import { setAssetBase, type UchusenLineup, type UchusenRocket } from "../src/element.ts";
import { downloadBlob, svgToPng } from "@johnmorrisdotca/kazoku-ui/save-image";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import type { EmbedPanelElement } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
import { KINDS, LABELS, packageKind, panelCode, pictureOf, SIZES, type Kind } from "./embed-code.ts";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import type { EarthForm, EarthShow } from "./earth.ts";
import { WORDS } from "./words.js";

setAssetBase(new URL("assets/", document.baseURI).href);

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node as T;
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
};

type Chooser = { word(key: string): string | undefined; lang: string };
/** A word of the page in the language it is in now (the family's chooser), English where the chooser is not there or has none. */
const say = (key: string, values: Record<string, string | number> = {}): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return (chooser?.word(key) ?? WORDS.en[key] ?? key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
};
const japanese = () => document.documentElement.lang === "ja";
const slotWord = (slot: string) => (`slot_${slot}` in WORDS.en ? say(`slot_${slot}`) : (SLOT_NAMES[slot] ?? slot));
const showWord = (show: string) => (show === "together" || show === "apart" ? say(`show_${show}`) : slotWord(show));
/** The English name of a slot is what a builder row says; find the slot again to say it in the page's language. */
const slotOfName = new Map(Object.entries(SLOT_NAMES).map(([slot, name]) => [name, slot]));
const wordsKey = (text: string) => text.toLowerCase().replaceAll(" ", "_");
/** A source's own label (a size, a first-flight word) in the page's language when the page knows it. */
const knownWord = (prefix: string, text: string) => (`${prefix}_${wordsKey(text)}` in WORDS.en ? say(`${prefix}_${wordsKey(text)}`) : text);

const hero = byId<UchusenRocket>("hero");
const bar = byId<HTMLElement>("view-bar") as ViewControlsElement;
// The family's view controls turn, tip, zoom and move it; the rocket follows.
bar.addEventListener("kazoku-viewchange", (event) => hero.drive((event as CustomEvent).detail));
// The auto-turn is an introduction: the controls stop it after a minute (`autoplay-for`) and keep it idle while the view is out of sight, and the Play button starts it again.
const address = createAddressState({ defaults: { background: "none", rocket: "starship", variant: "v3", show: "together", look: "line", view: "three-quarter" } });
const BACKGROUND_NAMES = ["none", "earth"] as const;
type BackgroundName = (typeof BACKGROUND_NAMES)[number];
const askedRocket = address.get("rocket") ?? "starship";
const firstRocket = Object.hasOwn(ROCKETS, askedRocket) ? askedRocket : "starship";
const askedMaker = new URLSearchParams(location.search).get("maker") ?? "";
const state = { rocket: firstRocket, variant: address.get("variant") ?? "v3", maker: Object.hasOwn(MAKERS, askedMaker) ? (askedMaker as MakerId) : ROCKETS[firstRocket].maker, show: address.get("show") ?? "together", look: ((LOOK_NAMES as readonly string[]).includes(address.get("look") ?? "") ? address.get("look") : "line") as LookName, view: ((VIEW_NAMES as readonly string[]).includes(address.get("view") ?? "") ? address.get("view") : "three-quarter") as ViewName, background: (address.get("background") === "earth" ? "earth" : "none") as BackgroundName };

/** A rocket is thin: the controls hold a pan so that a quarter of it stays in view. Its size on the screen: the picture is as wide as the box and a third taller, and the framing leaves 8% round the rocket. */
function sizeObject() {
  const variant = variantOf(state.rocket, state.variant);
  const box = hero.getBoundingClientRect();
  const height = state.show === "together" ? variant?.facts.height.value : state.show === "apart" ? null : variant?.facts.parts[state.show]?.value;
  const width = variant?.facts.diameter.value;
  if (!box.width || typeof height !== "number" || typeof width !== "number") return bar.removeAttribute("object-size");
  const scale = Math.min(box.width / width, (box.width * 4) / 3 / height) / 1.08;
  bar.setAttribute("object-size", `${Math.round(width * scale)},${Math.round(height * scale)}`);
}
new ResizeObserver(sizeObject).observe(hero);

/** A chip. `say` is the key of its words where the family's chooser should keep them up to date. */
function chip(label: string, testid: string, on: () => void, key?: string): HTMLButtonElement {
  const button = el("button", { type: "button", className: "chip", textContent: key ? say(key) : label });
  button.dataset.testid = testid;
  if (key) button.dataset.say = key;
  button.addEventListener("click", on);
  return button;
}
const press = (group: HTMLElement, chosen: string) => {
  for (const button of group.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === chosen));
};

const metres = (value: number) => `${value} m`;

/** A blank figure says why in its own English; the one blank the page words itself, "No source", is said in the page's language. */
const blankWords = (figure: Figure<number | string> | undefined) => (!figure?.brief ? say("noSource") : figureWords(figure));

function figureCell(figure: Figure<number | string> | undefined, unit: (v: number) => string = metres): HTMLElement {
  const cell = el("td");
  if (!figure || figure.value === null) {
    cell.append(el("span", { className: "blank", textContent: blankWords(figure) }));
    if (figure?.note) cell.append(el("span", { className: "src", textContent: figure.note }));
    return cell;
  }
  cell.append(el("span", { className: "value", textContent: typeof figure.value === "number" ? unit(figure.value) : figure.value }));
  if (figure.brief) cell.append(el("span", { className: "brief", textContent: `, ${figure.brief}` }));
  if (figure.source) {
    const source = SOURCES[figure.source];
    const link = el("a", { href: source.url, textContent: `${source.publisher}${figure.date ? `, ${figure.date}` : source.date ? `, ${say("read", { date: source.date })}` : ""}`, rel: "noopener" });
    cell.append(el("span", { className: "src" }, link));
  }
  if (figure.note) cell.append(el("span", { className: "src", textContent: figure.note }));
  for (const other of figure.others ?? []) cell.append(el("span", { className: "other", textContent: `${SOURCES[other.source].publisher}: ${typeof other.value === "number" ? unit(other.value) : other.value}. ${other.note}` }));
  return cell;
}

function factsFor(variant: Variant): HTMLElement[] {
  const show = state.show;
  const name = showWord;
  // a row is found by its English label, whatever language it is said in
  const rows2: [string, string, Figure<number | string> | undefined][] = [];
  if (show === "together" || show === "apart") {
    rows2.push(["Whole height", say("wholeHeight"), variant.facts.height]);
    // a ship of many modules has its heights in the apart view and its parts list, not a row each: the facts stay on the screen
    if (variant.slots.length <= 12) for (const slot of variant.slots) rows2.push([`${SLOT_NAMES[slot] ?? slot} height`, say("partHeight", { name: name(slot) }), variant.facts.parts[slot]]);
  } else rows2.push([`${SLOT_NAMES[show] ?? show} height`, say("partHeight", { name: name(show) }), variant.facts.parts[show]]);
  rows2.push(["Diameter", say("diameter"), variant.facts.diameter]);
  for (const [label, figure] of Object.entries(variant.facts.sizes ?? {})) rows2.push([label, knownWord("size", label), figure]);
  // a part with no engines of its own has no row for them
  for (const slot of show === "together" || show === "apart" ? variant.slots : [show]) if (variant.facts.engines[slot]) rows2.push([`${SLOT_NAMES[slot] ?? slot} engines`, say("partEngines", { name: name(slot) }), variant.facts.engines[slot]]);
  rows2.push([variant.firstWord ?? "First flew", knownWord("first", variant.firstWord ?? "First flew"), variant.firstFlight]);
  if (ROCKETS[variant.rocket].madeBy.value !== null) rows2.push(["Made by", say("madeBy"), ROCKETS[variant.rocket].madeBy]);
  const table = el("table", { className: "sizes" });
  for (const [key, label, figure] of rows2) {
    const row = el("tr");
    row.append(el("th", { scope: "row", textContent: label }), figureCell(figure));
    row.dataset.row = key;
    table.append(row);
  }
  const heading = el("h3", { textContent: show === "together" || show === "apart" ? variant.name : `${name(show)}: ${variant.name}` });
  const out: HTMLElement[] = [heading, table];
  if (variant.note) out.push(el("p", { className: "note", textContent: variant.note }));
  return out;
}

const credit = byId("credit");
const creditsFor = (variant: Variant) => check({ rocket: variant.rocket, variant: variant.id }).credits;

// ------------------------------------------------------------- the Earth behind it: nothing of it is loaded or runs until it is chosen
const earthHolder = byId("earth-back");
let earthShown: EarthShow | null = null;
let earthForm: EarthForm | null = null;
let earthAsked = 0;
/** No WebGL here, or a picture would not load: the line globe needs neither. */
let realisticBarred = false;
hero.addEventListener("uchusen-fallback", () => {
  realisticBarred = true;
  syncEarth();
});
function syncEarth() {
  byId("earth-credit").hidden = state.background !== "earth";
  const form: EarthForm | null = state.background !== "earth" ? null : state.look === "line" ? "line" : state.look === "thick" || realisticBarred ? "thick" : "realistic";
  if (form === earthForm) return;
  earthForm = form;
  const asked = ++earthAsked;
  earthShown?.stop();
  earthShown = null;
  earthHolder.hidden = form === null;
  if (form)
    void import("./earth.ts").then(({ showEarth }) => {
      if (asked === earthAsked)
        earthShown = showEarth(earthHolder, form, () => {
          realisticBarred = true;
          syncEarth();
        });
    });
}

function renderMain() {
  const rocket = ROCKETS[state.rocket];
  if (!rocket.variants.some((one) => one.id === state.variant)) state.variant = rocket.defaultVariant;
  const variant = variantOf(state.rocket, state.variant) as Variant;
  const variantBox = byId("variants");
  variantBox.replaceChildren(...rocket.variants.map((one) => chip(one.name, `variant-${one.id}`, () => pick({ variant: one.id }))));
  drawMakers();
  const shows = showsOf(variant.slots);
  if (!shows.includes(state.show)) state.show = shows[0];
  const showBox = byId("shows");
  showBox.replaceChildren(...shows.map((show) => chip(showWord(show), `show-${show}`, () => pick({ show }))));
  press(showBox, `show-${state.show}`);
  press(byId("variants"), `variant-${state.variant}`);
  press(byId("looks"), `look-${state.look}`);
  press(byId("views"), `view-${state.view}`);
  press(byId("backgrounds"), `background-${state.background}`);
  hero.setAttribute("rocket", state.rocket);
  hero.setAttribute("variant", state.variant);
  hero.setAttribute("show", state.show);
  hero.setAttribute("look", state.look);
  hero.setAttribute("view", state.view);
  byId("facts").replaceChildren(...factsFor(variant));
  byId("flight-field").classList.toggle("has-flight", flightOf(state.rocket, state.variant) !== null);
  credit.hidden = state.look !== "painted";
  const credits = creditsFor(variant);
  if (credits.length) {
    credit.replaceChildren(
      ...credits.flatMap((c) => [
        el(
          "span",
          { className: "one-credit" },
          say(c.usedFor.length > 1 ? "creditAll" : "creditPart"),
          el("a", { href: c.sourceUrl, textContent: c.title, rel: "noopener" }),
          say("creditBy"),
          el("a", { href: c.creatorUrl, textContent: c.creator, rel: "noopener" }),
          ", ",
          el("a", { href: c.licenceUrl, textContent: c.licence, rel: "noopener" }),
          `. ${c.changes}`,
        ),
      ]),
    );
  } else credit.textContent = say("creditOwn");
  drawEmbed();
  syncEarth();
  sizeObject();
}

/** The maker's row, and in the rocket's row only that maker's rockets. */
function drawMakers() {
  press(byId("makers"), `maker-${state.maker}`);
  press(byId("rockets"), `rocket-${state.rocket}`);
  for (const button of byId("rockets").querySelectorAll("button")) button.hidden = ROCKETS[(button.dataset.testid ?? "").replace("rocket-", "")]?.maker !== state.maker;
  // the address has the rocket, and the maker only when it is not that rocket's own
  address.set("maker", state.maker === ROCKETS[state.rocket].maker ? null : state.maker);
}

function pick(change: Partial<typeof state>) {
  if (change.view !== undefined && change.view !== state.view) bar.set({ yaw: 0, tilt: 0 });
  Object.assign(state, change);
  if (change.rocket) state.maker = ROCKETS[change.rocket].maker;
  if (change.background) address.set("background", change.background);
  renderMain();
  address.set("rocket", state.rocket);
  address.set("variant", state.variant);
  address.set("show", state.show);
  address.set("look", state.look);
  address.set("view", state.view);
}

/** A maker with one rocket has one answer, and it is chosen for the reader; otherwise the rocket on screen stays until another is pressed. */
function pickMaker(maker: MakerId) {
  const theirs = Object.values(ROCKETS).filter((rocket) => rocket.maker === maker);
  if (theirs.length === 1) {
    if (state.rocket !== theirs[0].id) pick({ rocket: theirs[0].id, variant: theirs[0].defaultVariant });
    return;
  }
  state.maker = maker;
  drawMakers();
}

byId("makers").append(...(Object.keys(MAKERS) as MakerId[]).map((maker) => chip(MAKERS[maker], `maker-${maker}`, () => pickMaker(maker), `maker_${maker}`)));
byId("rockets").append(...Object.values(ROCKETS).map((rocket) => chip(rocket.name, `rocket-${rocket.id}`, () => pick({ rocket: rocket.id, variant: rocket.defaultVariant }))));
byId("looks").append(...LOOK_NAMES.map((look) => chip(WORDS.en[`look_${look}`], `look-${look}`, () => pick({ look }), `look_${look}`)));
byId("views").append(...VIEW_NAMES.map((view) => chip(WORDS.en[`view_${view.replaceAll("-", "_")}`], `view-${view}`, () => pick({ view }), `view_${view.replaceAll("-", "_")}`)));
byId("backgrounds").append(...BACKGROUND_NAMES.map((background) => chip(WORDS.en[`background_${background}`], `background-${background}`, () => pick({ background }), `background_${background}`)));

// ------------------------------------------------------------- which way it turns
// The family's controls turn it at their `speed` times the speed buttons' `pace` (0.5×, 1×, 2×): positive takes the near side to the right, negative to the left. A press changes the way at once, from where it is, and starts the turn if it had stopped.
const TURN_SPEED = 5;
const turnBox = byId("turn");
const TURN_FOR_MS = 60_000;
let turnTimer = 0;
let turnWay: "left" | "right" = "right";
function drawTurn() {
  const turning = bar.state.turning;
  for (const way of ["left", "right"] as const) {
    const button = turnBox.querySelector<HTMLButtonElement>(`[data-testid="turn-${way}"]`);
    const pressed = String(turning && turnWay === way);
    if (button && button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
  }
}
function turnTo(way: "left" | "right") {
  turnWay = way;
  bar.setAttribute("speed", String(way === "left" ? -TURN_SPEED : TURN_SPEED));
  if (!bar.state.turning) bar.play();
  // a turn someone asked for ends too, as the first one does: a tab left open draws nothing for ever
  window.clearTimeout(turnTimer);
  turnTimer = window.setTimeout(() => bar.pause(), TURN_FOR_MS);
  drawTurn();
  drawEmbed();
}
turnBox.append(chip("Turn left", "turn-left", () => turnTo("left"), "turnLeft"), chip("Turn right", "turn-right", () => turnTo("right"), "turnRight"));
bar.addEventListener("kazoku-viewchange", drawTurn);
// the speed buttons write the speed to the bar's `pace`
new MutationObserver(() => drawEmbed()).observe(bar, { attributes: true, attributeFilter: ["pace"] });

// ------------------------------------------------------------- the engines
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const enginesBox = byId("engines");
function lightEngines(on: boolean) {
  hero.setAttribute("engines", on ? "on" : "off");
  press(enginesBox, `engines-${on ? "on" : "off"}`);
  const note = byId("engines-note");
  note.hidden = !(on && reducedMotion);
  note.textContent = say("enginesNote");
  drawEmbed();
}
enginesBox.append(chip("Dark", "engines-off", () => lightEngines(false), "engines_off"), chip("Lit", "engines-on", () => lightEngines(true), "engines_on"));
press(enginesBox, "engines-off");

// ------------------------------------------------------------- copy the rocket that is on screen
const embedStatus = byId("embed-status");
const panel = byId<EmbedPanelElement>("embed-panel");
const here = new URL(".", location.href).href;
function embedOptions(): RocketOptions {
  const flying = hero.flightState;
  const engines = hero.getAttribute("engines");
  // what turns here by the controls turns there by itself, as fast: left is `cw`, the near side going left
  const turning = bar.state.turning ? { spin: String(Math.round(360 / (TURN_SPEED * (Number(bar.getAttribute("pace")) || 1)))), way: turnWay === "left" ? "cw" : "ccw" } : {};
  return { rocket: state.rocket, variant: state.variant, show: state.show, look: state.look, view: state.view, ...turning, ...(engines === "on" ? { engines } : {}), ...(flying.active ? { phase: flying.phase } : {}) };
}
panel.kinds = KINDS;
panel.labels = LABELS;
panel.sizes = SIZES;
panel.size = 480;
panel.generate = ({ kind, size, preview }) => panelCode(kind as Kind, embedOptions(), { size, ...(preview ? { site: here } : {}) });
// The picture is the drawing itself, never the 3D view or an iframe: it adds no WebGL context and no frame loop to the page.
panel.preview = () => {
  const holder = document.createElement("div");
  holder.innerHTML = embedCode(embedOptions(), "svg");
  return pictureOf(holder);
};
panel.note = ({ kind }) => {
  const options = embedOptions();
  const own = kind === "html" || kind === "iframe" || kind === "module" || kind === "svg" || kind === "data" || kind === "link";
  const noteKey = kind === "link" && options.view && options.view !== "three-quarter" ? "note_linkView" : own ? `note_${packageKind(kind as Kind)}` : "note_framework";
  const text = japanese() || !own ? say(noteKey) : embedNote(packageKind(kind as Kind), options);
  return `${text}${state.background === "earth" ? say("embedEarth") : ""}`;
};
panel.credits = () => {
  const credit = paintedCredit(embedOptions());
  return credit === "" ? "" : `${say("embedKeep")}${credit}`;
};
// The panel is kept up to date only while it is near the screen: a page of 3D views changes the code often (every phase of a flight), and nothing is made for a section nobody can see.
// It catches up when it comes near. The drawing beside the code appears with it.
let embedNear = false;
let embedStale = true;
panel.setAttribute("no-preview", "");
new IntersectionObserver((seen) => {
  embedNear = seen.some((one) => one.isIntersecting);
  if (!embedNear) return;
  panel.removeAttribute("no-preview");
  if (embedStale) drawEmbed();
}, { rootMargin: "400px" }).observe(panel);
function drawEmbed() {
  if (!embedNear) {
    embedStale = true;
    return;
  }
  embedStale = false;
  panel.setAttribute("lang", japanese() ? "ja" : "en");
  panel.openHref = `embed.html?${rocketToParams(embedOptions()).toString()}`;
  embedStatus.textContent = "";
  panel.update();
}
const fileName = () => ["uchusen", state.rocket, state.variant, state.show === "together" ? "" : state.show, state.look].filter(Boolean).join("-");
const drawingText = () => embedCode(embedOptions(), "svg");
byId("embed-svg").addEventListener("click", () => {
  downloadBlob(new Blob([drawingText()], { type: "image/svg+xml" }), `${fileName()}.svg`);
  embedStatus.textContent = say("saved");
});
byId("embed-png").addEventListener("click", async () => {
  try {
    downloadBlob((await svgToPng(drawingText(), PICTURE_W, PICTURE_H, 2)).blob, `${fileName()}.png`);
    embedStatus.textContent = say("saved");
  } catch {
    embedStatus.textContent = say("pngFail");
  }
});
// a phase of flight is part of what is copied: it is said when it changes, not on every step of the slider
let embedPhase = "";
hero.addEventListener("uchusen-flight", () => {
  const { active, phase } = hero.flightState;
  const now = active ? phase : "";
  if (now === embedPhase) return;
  embedPhase = now;
  drawEmbed();
});
renderMain();

// ------------------------------------------------------------- compare
const lineup = byId<UchusenLineup>("lineup");
const every = Object.values(ROCKETS).flatMap((rocket) => rocket.variants);
const keyOf = (variant: Variant) => `${variant.rocket}:${variant.id}`;
const compared = new Set(["starship:v1-flight1", "starship:v1", "starship:v2", "starship:v3", "starship:v4"]);
const comparePicks = byId("compare-picks");
function renderCompare() {
  for (const button of comparePicks.querySelectorAll("button")) button.setAttribute("aria-pressed", String(compared.has((button.dataset.testid as string).slice(8))));
  const chosen = every.filter((variant) => compared.has(keyOf(variant)));
  lineup.setAttribute("items", [...chosen.map(keyOf), "building", "person"].join(","));
  lineup.setAttribute("look", state.look === "painted" ? "painted" : "line");
  const table = byId("compare-table");
  const head = el("tr", {}, el("th", { textContent: "" }), ...chosen.map((variant) => el("th", { scope: "col", textContent: variant.name })));
  const slots = [...new Set(chosen.flatMap((variant) => variant.slots))];
  const rows: [string, (variant: Variant) => Figure<number | string> | undefined][] = [
    [say("wholeHeight"), (variant) => variant.facts.height],
    ...slots.map((slot): [string, (variant: Variant) => Figure<number | string> | undefined] => [slotWord(slot), (variant) => (variant.slots.includes(slot) ? variant.facts.parts[slot] : { value: null, source: null, brief: say("compareNone") })]),
    [say("diameter"), (variant) => variant.facts.diameter],
    [say("first_first_flew"), (variant) => variant.firstFlight],
  ];
  const body = rows.map(([label, read]) =>
    el(
      "tr",
      {},
      el("th", { scope: "row", textContent: label }),
      ...chosen.map((variant) => {
        const figure = read(variant);
        const cell = el("td");
        if (!figure || figure.value === null) cell.append(el("span", { className: "blank", textContent: blankWords(figure) }));
        else cell.textContent = figureWords(figure, " m");
        return cell;
      }),
    ),
  );
  table.replaceChildren(el("thead", {}, head), el("tbody", {}, ...body));
}
comparePicks.append(
  ...every.map((variant) =>
    chip(variant.name, `compare-${keyOf(variant)}`, () => {
      if (compared.has(keyOf(variant))) compared.delete(keyOf(variant));
      else compared.add(keyOf(variant));
      renderCompare();
    }),
  ),
);
renderCompare();

// ------------------------------------------------------------- builder
const builderRocket = byId<UchusenRocket>("builder-rocket");
const builderRows = byId("builder-rows");
let builderPicks: string[] = [];
function renderBuilder() {
  const { rows, description, report } = builderState(builderPicks);
  // what the builder chose is what stands: a later change starts from here
  builderPicks = rows.map((row) => row.chosen);
  builderRows.replaceChildren(
    ...rows.map((row, index) => {
      const label = el("label", {}, row.label.split(" or ").map((name) => (slotOfName.has(name) ? slotWord(slotOfName.get(name) as string) : name)).join(say("builderOr")));
      if (row.auto) {
        // one answer: no question to ask
        label.append(el("output", { className: "builder-only", textContent: row.options[0].name }));
        label.dataset.testid = `pick-${index}-only`;
        return label;
      }
      const select = el("select");
      select.dataset.testid = `pick-${index}`;
      for (const rocket of new Set(row.options.map((option) => option.rocket))) {
        const group = el("optgroup", { label: rocket });
        for (const option of row.options) if (option.rocket === rocket) group.append(el("option", { value: option.id, textContent: option.name }));
        select.append(group);
      }
      select.value = row.chosen;
      select.addEventListener("change", () => {
        builderPicks[index] = select.value;
        renderBuilder();
      });
      label.append(select);
      return label;
    }),
  );
  const box = byId("builder-report");
  box.dataset.kind = report.custom ? "custom" : "real";
  box.textContent = say("builderReport", { label: report.label, height: report.size?.height.toFixed(1) ?? "" });
  byId("builder-code").textContent = `build(${JSON.stringify(description)})`;
  builderRocket.description = description;
}
renderBuilder();

// ------------------------------------------------------------- the parts alone
const assets = new URL("assets/", document.baseURI).href;
const gallery = () =>
  PART_ENTRIES.filter(({ record }) => record.trueTo.length === 0).map(({ record }) =>
    el(
      "figure",
      { className: "tile" },
      el("img", { src: `${assets}parts/${record.id}.svg`, alt: record.name, loading: "lazy", width: 240, height: 320 }),
      el("figcaption", {}, record.name, el("small", { textContent: record.sourced.height.value === null ? say("partJudged") : say("partSize", { height: record.sourced.height.value, width: record.sourced.diameter.value as number }) })),
    ),
  );
byId("gallery").append(...gallery());

// ------------------------------------------------------------- what is coming, and where it all comes from
byId("planned").hidden = PLANNED_ROCKETS.length === 0;
const planned = () =>
  PLANNED_ROCKETS.map((rocket) =>
    el(
      "li",
      {},
      el("strong", { textContent: rocket.name }),
      say("plannedLine", { height: rocket.height.value as number, width: rocket.diameter.value as number, note: rocket.diameter.note ? ` (${rocket.diameter.note.toLowerCase()})` : "", first: rocket.firstFlight.value as string }),
      el("a", { href: SOURCES[rocket.source].url, textContent: SOURCES[rocket.source].publisher, rel: "noopener" }),
      say("plannedEnd"),
    ),
  );
byId("planned-list").append(...planned());
const sourceItems = () =>
  (Object.keys(SOURCES) as SourceId[]).map((id) => {
    const source = SOURCES[id];
    return el("li", {}, el("a", { href: source.url, textContent: source.title, rel: "noopener" }), `, ${source.publisher}${source.date ? `, ${source.date}` : ""}.${source.read === "search" ? say("sourceSearch") : source.read === "cited" ? say("sourceCited") : ""}`);
  });
byId("source-list").append(...sourceItems());
byId("credit-list").append(...(Object.keys(MODEL_CREDITS) as CreditId[]).map((id) => el("li", { textContent: creditLine(id) })));

// ------------------------------------------------------------- one section at a time, chosen in a row, and kept in the address
const MORE: readonly (readonly [string, string])[] = ["embed", "compare", "builder", "details", "planned", "sources"].map((id) => [id, WORDS.en[`more_${id}`]] as const);
const moreTabs = byId("more-tabs");
function showMore(chosen: string) {
  for (const [id] of MORE) {
    byId(id).hidden = id !== chosen;
    moreTabs.querySelector(`[data-testid="more-${id}"]`)?.setAttribute("aria-selected", String(id === chosen));
  }
}
for (const [id, words] of MORE) {
  const tab = chip(words, `more-${id}`, () => {
    showMore(id);
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`);
  }, `more_${id}`);
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", id);
  moreTabs.append(tab);
}
const askedTab = location.hash.slice(1);
showMore(MORE.some(([id]) => id === askedTab) ? askedTab : MORE[0][0]);

// ------------------------------------------------------------- the language: the family's chooser has filled every data-say; what the page draws itself is drawn again
const flightBar = byId<HTMLElement & { words: Record<string, string> }>("flight");
function setWords() {
  byId("data-note").hidden = !japanese();
  flightBar.words = Object.fromEntries(["play", "pause", "again", "back", "next", "leave", "range", "none", "sourced", "reduced", "from"].map((key) => [key, say(`flight${key[0].toUpperCase()}${key.slice(1)}`)]));
}
function speak() {
  setWords();
  renderMain();
  renderCompare();
  renderBuilder();
  lightEngines(hero.getAttribute("engines") === "on");
  drawTurn();
  byId("gallery").replaceChildren(...gallery());
  byId("planned-list").replaceChildren(...planned());
  byId("source-list").replaceChildren(...sourceItems());
}
document.addEventListener("kazoku-languagechange", () => queueMicrotask(speak));
setWords();
