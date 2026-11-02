// The demo page: a rocket large with its controls, a comparison to scale, the part builder, the parts alone and every source. Everything comes from the package's own entries.
import { builderState, check, embedCode, EMBED_KINDS, embedNote, type EmbedKind, paintedCredit, rocketToParams, type RocketOptions, type Figure, figureWords, LOOK_NAMES, type LookName, MODEL_CREDITS, PART_ENTRIES, PLANNED_ROCKETS, ROCKETS, SLOT_NAMES, SOURCES, type SourceId, type Variant, VIEW_NAMES, type ViewName, showsOf, variantOf, creditLine, type CreditId } from "../src/index.ts";
import { PICTURE_H, PICTURE_W } from "../src/framing.ts";
import { setAssetBase, type UchusenLineup, type UchusenRocket } from "../src/element.ts";
import { downloadBlob, svgToPng } from "@johnmorrisdotca/kazoku-ui/save-image";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";

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

const LOOK_WORDS: Record<LookName, string> = { line: "Line drawing", thick: "Thick lines", painted: "Painted" };
const VIEW_WORDS: Record<ViewName, string> = { "three-quarter": "Three-quarter", front: "Front", back: "Back", side: "Side", below: "Below" };
const SHOW_WORDS: Record<string, string> = { together: "Together", apart: "Apart", ...SLOT_NAMES };

const hero = byId<UchusenRocket>("hero");
const bar = byId<HTMLElement>("view-bar") as ViewControlsElement;
// The family's view controls turn, tip, zoom and move it; the rocket follows.
bar.addEventListener("kazoku-viewchange", (event) => hero.drive((event as CustomEvent).detail));
// The auto-turn is an introduction: the controls stop it after a minute (`autoplay-for`) and keep it idle while the view is out of sight, and the Play button starts it again.
const state = { rocket: "starship", variant: "v3", show: "together", look: "line" as LookName, view: "three-quarter" as ViewName };

function chip(label: string, testid: string, on: () => void): HTMLButtonElement {
  const button = el("button", { type: "button", className: "chip", textContent: label });
  button.dataset.testid = testid;
  button.addEventListener("click", on);
  return button;
}
const press = (group: HTMLElement, chosen: string) => {
  for (const button of group.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === chosen));
};

const metres = (value: number) => `${value} m`;

function figureCell(figure: Figure<number | string> | undefined, unit: (v: number) => string = metres): HTMLElement {
  const cell = el("td");
  if (!figure || figure.value === null) {
    cell.append(el("span", { className: "blank", textContent: figureWords(figure) }));
    if (figure?.note) cell.append(el("span", { className: "src", textContent: figure.note }));
    return cell;
  }
  cell.append(el("span", { className: "value", textContent: typeof figure.value === "number" ? unit(figure.value) : figure.value }));
  if (figure.brief) cell.append(el("span", { className: "brief", textContent: `, ${figure.brief}` }));
  if (figure.source) {
    const source = SOURCES[figure.source];
    const link = el("a", { href: source.url, textContent: `${source.publisher}${figure.date ? `, ${figure.date}` : source.date ? `, read ${source.date}` : ""}`, rel: "noopener" });
    cell.append(el("span", { className: "src" }, link));
  }
  if (figure.note) cell.append(el("span", { className: "src", textContent: figure.note }));
  for (const other of figure.others ?? []) cell.append(el("span", { className: "other", textContent: `${SOURCES[other.source].publisher}: ${typeof other.value === "number" ? unit(other.value) : other.value}. ${other.note}` }));
  return cell;
}

function factsFor(variant: Variant): HTMLElement[] {
  const rows: [string, Figure<number | string> | undefined][] = [];
  const show = state.show;
  const name = (slot: string) => SHOW_WORDS[slot] ?? slot;
  if (show === "together" || show === "apart") {
    rows.push(["Whole height", variant.facts.height]);
    for (const slot of variant.slots) rows.push([`${name(slot)} height`, variant.facts.parts[slot]]);
  } else rows.push([`${name(show)} height`, variant.facts.parts[show]]);
  rows.push(["Diameter", variant.facts.diameter]);
  for (const [label, figure] of Object.entries(variant.facts.sizes ?? {})) rows.push([label, figure]);
  // a part with no engines of its own has no row for them
  for (const slot of show === "together" || show === "apart" ? variant.slots : [show]) if (variant.facts.engines[slot]) rows.push([`${name(slot)} engines`, variant.facts.engines[slot]]);
  rows.push([variant.firstWord ?? "First flew", variant.firstFlight]);
  const table = el("table", { className: "sizes" });
  for (const [label, figure] of rows) {
    const row = el("tr");
    row.append(el("th", { scope: "row", textContent: label }), figureCell(figure));
    row.dataset.row = label;
    table.append(row);
  }
  const heading = el("h3", { textContent: show === "together" || show === "apart" ? variant.name : `${name(show)}: ${variant.name}` });
  const out: HTMLElement[] = [heading, table];
  if (variant.note) out.push(el("p", { className: "note", textContent: variant.note }));
  return out;
}

const credit = byId("credit");
const creditsFor = (variant: Variant) => check({ rocket: variant.rocket, variant: variant.id }).credits;

function renderMain() {
  const rocket = ROCKETS[state.rocket];
  if (!rocket.variants.some((one) => one.id === state.variant)) state.variant = rocket.defaultVariant;
  const variant = variantOf(state.rocket, state.variant) as Variant;
  const variantBox = byId("variants");
  variantBox.replaceChildren(...rocket.variants.map((one) => chip(one.name, `variant-${one.id}`, () => pick({ variant: one.id }))));
  press(byId("rockets"), `rocket-${state.rocket}`);
  const shows = showsOf(variant.slots);
  if (!shows.includes(state.show)) state.show = shows[0];
  const showBox = byId("shows");
  showBox.replaceChildren(...shows.map((show) => chip(SHOW_WORDS[show] ?? show, `show-${show}`, () => pick({ show }))));
  press(showBox, `show-${state.show}`);
  press(byId("variants"), `variant-${state.variant}`);
  press(byId("looks"), `look-${state.look}`);
  press(byId("views"), `view-${state.view}`);
  hero.setAttribute("rocket", state.rocket);
  hero.setAttribute("variant", state.variant);
  hero.setAttribute("show", state.show);
  hero.setAttribute("look", state.look);
  hero.setAttribute("view", state.view);
  byId("facts").replaceChildren(...factsFor(variant));
  credit.hidden = state.look !== "painted";
  const credits = creditsFor(variant);
  if (credits.length) {
    credit.replaceChildren(
      ...credits.flatMap((c) => [
        el(
          "span",
          { className: "one-credit" },
          `${c.usedFor.length > 1 ? "Painted" : "Part painted"} from `,
          el("a", { href: c.sourceUrl, textContent: c.title, rel: "noopener" }),
          " by ",
          el("a", { href: c.creatorUrl, textContent: c.creator, rel: "noopener" }),
          ", ",
          el("a", { href: c.licenceUrl, textContent: c.licence, rel: "noopener" }),
          `. ${c.changes}`,
        ),
      ]),
    );
  } else credit.textContent = "Painted by this package's own code, from sourced sizes. No licensed model shows this variant.";
  drawEmbed();
}

function pick(change: Partial<typeof state>) {
  if (change.view !== undefined && change.view !== state.view) bar.set({ yaw: 0, tilt: 0 });
  Object.assign(state, change);
  renderMain();
}

byId("rockets").append(...Object.values(ROCKETS).map((rocket) => chip(rocket.name, `rocket-${rocket.id}`, () => pick({ rocket: rocket.id, variant: rocket.defaultVariant }))));
byId("looks").append(...LOOK_NAMES.map((look) => chip(LOOK_WORDS[look], `look-${look}`, () => pick({ look }))));
byId("views").append(...VIEW_NAMES.map((view) => chip(VIEW_WORDS[view], `view-${view}`, () => pick({ view }))));

// ------------------------------------------------------------- which way it turns
// The family's controls turn it at their `speed`: positive takes the near side to the right, negative to the left. A press changes the way at once, from where it is, and starts the turn if it had stopped.
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
turnBox.append(chip("Turn left", "turn-left", () => turnTo("left")), chip("Turn right", "turn-right", () => turnTo("right")));
bar.addEventListener("kazoku-viewchange", drawTurn);

// ------------------------------------------------------------- the engines
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const enginesBox = byId("engines");
function lightEngines(on: boolean) {
  hero.setAttribute("engines", on ? "on" : "off");
  press(enginesBox, `engines-${on ? "on" : "off"}`);
  const note = byId("engines-note");
  note.hidden = !(on && reducedMotion);
  note.textContent = "This device asks for reduced motion, so the flames stay off. The engine chart still says which ones burn.";
  drawEmbed();
}
enginesBox.append(chip("Dark", "engines-off", () => lightEngines(false)), chip("Lit", "engines-on", () => lightEngines(true)));
press(enginesBox, "engines-off");

// ------------------------------------------------------------- copy the rocket that is on screen
const EMBED_WORDS: Readonly<Record<EmbedKind, string>> = { element: "CDN script", iframe: "Iframe", module: "Module", svg: "SVG", data: "Data address", link: "Image link" };
let embedKind: EmbedKind = "element";
let embedFull = "";
const embedTabs = byId("embed-tabs");
const embedCodeNode = byId("embed-code");
const embedStatus = byId("embed-status");
for (const kind of EMBED_KINDS) {
  const button = el("button", { type: "button", className: "chip", textContent: EMBED_WORDS[kind] });
  button.dataset.testid = `tab-${kind}`;
  button.setAttribute("role", "tab");
  button.addEventListener("click", () => {
    embedKind = kind;
    drawEmbed();
  });
  embedTabs.append(button);
}
function embedOptions(): RocketOptions {
  const flying = hero.flightState;
  const engines = hero.getAttribute("engines");
  // what turns here by the controls turns there by itself: left is `cw`, the near side going left
  const turning = bar.state.turning ? { spin: "slow", way: turnWay === "left" ? "cw" : "ccw" } : {};
  return { rocket: state.rocket, variant: state.variant, show: state.show, look: state.look, view: state.view, ...turning, ...(engines === "on" ? { engines } : {}), ...(flying.active ? { phase: flying.phase } : {}) };
}
function drawEmbed() {
  const options = embedOptions();
  embedFull = embedCode(options, embedKind);
  byId("embed-note").textContent = embedNote(embedKind, options);
  const credit = paintedCredit(options);
  const creditNode = byId("embed-credit");
  creditNode.hidden = credit === "";
  creditNode.textContent = credit === "" ? "" : `Keep this credit with a painted rocket, however you use it. ${credit}`;
  byId<HTMLAnchorElement>("embed-open").href = `embed.html?${rocketToParams(options).toString()}`;
  embedStatus.textContent = "";
  embedCodeNode.textContent = embedFull.length > 1400 ? `${embedFull.slice(0, 1400)}…` : embedFull;
  for (const button of embedTabs.querySelectorAll("button")) button.setAttribute("aria-selected", String(button.dataset.testid === `tab-${embedKind}`));
}
byId("embed-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(embedFull);
  } catch {
    const area = el("textarea");
    area.value = embedFull;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  embedStatus.textContent = "Copied";
});
const fileName = () => ["uchusen", state.rocket, state.variant, state.show === "together" ? "" : state.show, state.look].filter(Boolean).join("-");
const drawingText = () => embedCode(embedOptions(), "svg");
byId("embed-svg").addEventListener("click", () => {
  downloadBlob(new Blob([drawingText()], { type: "image/svg+xml" }), `${fileName()}.svg`);
  embedStatus.textContent = "Saved";
});
byId("embed-png").addEventListener("click", async () => {
  try {
    downloadBlob((await svgToPng(drawingText(), PICTURE_W, PICTURE_H, 2)).blob, `${fileName()}.png`);
    embedStatus.textContent = "Saved";
  } catch {
    embedStatus.textContent = "This browser could not make a PNG. Save SVG still works.";
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
    ["Whole height", (variant) => variant.facts.height],
    ...slots.map((slot): [string, (variant: Variant) => Figure<number | string> | undefined] => [SLOT_NAMES[slot] ?? slot, (variant) => (variant.slots.includes(slot) ? variant.facts.parts[slot] : { value: null, source: null, brief: "None" })]),
    ["Diameter", (variant) => variant.facts.diameter],
    ["First flew", (variant) => variant.firstFlight],
  ];
  const body = rows.map(([label, read]) =>
    el(
      "tr",
      {},
      el("th", { scope: "row", textContent: label }),
      ...chosen.map((variant) => {
        const figure = read(variant);
        const cell = el("td");
        if (!figure || figure.value === null) cell.append(el("span", { className: "blank", textContent: figureWords(figure) }));
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
      const label = el("label", {}, row.label);
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
  box.textContent = `${report.label}. ${report.size?.height.toFixed(1)} m tall as drawn.`;
  byId("builder-code").textContent = `build(${JSON.stringify(description)})`;
  builderRocket.description = description;
}
renderBuilder();

// ------------------------------------------------------------- the parts alone
const assets = new URL("assets/", document.baseURI).href;
byId("gallery").append(
  ...PART_ENTRIES.filter(({ record }) => record.trueTo.length === 0).map(({ record }) =>
    el(
      "figure",
      { className: "tile" },
      el("img", { src: `${assets}parts/${record.id}.svg`, alt: record.name, loading: "lazy", width: 240, height: 320 }),
      el("figcaption", {}, record.name, el("small", { textContent: record.sourced.height.value === null ? "Size judged from photographs" : `${record.sourced.height.value} m long, ${record.sourced.diameter.value} m across` })),
    ),
  ),
);

// ------------------------------------------------------------- what is coming, and where it all comes from
byId("planned").hidden = PLANNED_ROCKETS.length === 0;
byId("planned-list").append(
  ...PLANNED_ROCKETS.map((rocket) =>
    el(
      "li",
      {},
      el("strong", { textContent: rocket.name }),
      `: ${rocket.height.value} m tall, ${rocket.diameter.value} m across${rocket.diameter.note ? ` (${rocket.diameter.note.toLowerCase()})` : ""}, first flown ${rocket.firstFlight.value}. From `,
      el("a", { href: SOURCES[rocket.source].url, textContent: SOURCES[rocket.source].publisher, rel: "noopener" }),
      ".",
    ),
  ),
);
byId("source-list").append(
  ...(Object.keys(SOURCES) as SourceId[]).map((id) => {
    const source = SOURCES[id];
    return el("li", {}, el("a", { href: source.url, textContent: source.title, rel: "noopener" }), `, ${source.publisher}${source.date ? `, ${source.date}` : ""}.${source.read === "search" ? " Read only as a search engine quoted it." : source.read === "cited" ? " Known through another source's citation." : ""}`);
  }),
);
byId("credit-list").append(...(Object.keys(MODEL_CREDITS) as CreditId[]).map((id) => el("li", { textContent: creditLine(id) })));

// ------------------------------------------------------------- one section at a time, chosen in a row, and kept in the address
const MORE: readonly (readonly [string, string])[] = [["embed", "Put it on your site"], ["compare", "Compare to scale"], ["builder", "Build from parts"], ["details", "The parts"], ["planned", "Still to come"], ["sources", "Sources"]];
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
  });
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", id);
  moreTabs.append(tab);
}
const askedTab = location.hash.slice(1);
showMore(MORE.some(([id]) => id === askedTab) ? askedTab : MORE[0][0]);
