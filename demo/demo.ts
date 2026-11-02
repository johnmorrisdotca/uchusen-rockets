// The demo page: a rocket large with its controls, a comparison to scale, the part builder, the parts alone and every source. Everything comes from the package's own entries.
import { check, type Description, type Figure, figureWords, LOOK_NAMES, type LookName, MODEL_CREDITS, PART_ENTRIES, PLANNED_ROCKETS, ROCKETS, SLOT_NAMES, SOURCES, type SourceId, type Variant, VIEW_NAMES, type ViewName, showsOf, variantOf, creditLine, type CreditId } from "../src/index.ts";
import { setAssetBase, type UchusenLineup, type UchusenRocket } from "../src/element.ts";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import type { EarthForm, EarthShow } from "./earth.ts";

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
const address = createAddressState({ defaults: { background: "none" } });
const BACKGROUND_WORDS = { none: "None", earth: "Earth" } as const;
type BackgroundName = keyof typeof BACKGROUND_WORDS;
const state = { rocket: "starship", variant: "v3", show: "together", look: "line" as LookName, view: "three-quarter" as ViewName, background: (address.get("background") === "earth" ? "earth" : "none") as BackgroundName };

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
  // a part with no engines of its own has no row for them
  for (const slot of show === "together" || show === "apart" ? variant.slots : [show]) if (variant.facts.engines[slot]) rows.push([`${name(slot)} engines`, variant.facts.engines[slot]]);
  rows.push(["First flew", variant.firstFlight]);
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
  press(byId("rockets"), `rocket-${state.rocket}`);
  const shows = showsOf(variant.slots);
  if (!shows.includes(state.show)) state.show = shows[0];
  const showBox = byId("shows");
  showBox.replaceChildren(...shows.map((show) => chip(SHOW_WORDS[show] ?? show, `show-${show}`, () => pick({ show }))));
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
  syncEarth();
}

function pick(change: Partial<typeof state>) {
  if (change.view !== undefined && change.view !== state.view) bar.set({ yaw: 0, tilt: 0 });
  Object.assign(state, change);
  if (change.background) address.set("background", change.background);
  renderMain();
}

byId("rockets").append(...Object.values(ROCKETS).map((rocket) => chip(rocket.name, `rocket-${rocket.id}`, () => pick({ rocket: rocket.id, variant: rocket.defaultVariant }))));
byId("looks").append(...LOOK_NAMES.map((look) => chip(LOOK_WORDS[look], `look-${look}`, () => pick({ look }))));
byId("views").append(...VIEW_NAMES.map((view) => chip(VIEW_WORDS[view], `view-${view}`, () => pick({ view }))));
byId("backgrounds").append(...(Object.keys(BACKGROUND_WORDS) as BackgroundName[]).map((background) => chip(BACKGROUND_WORDS[background], `background-${background}`, () => pick({ background }))));
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
const pickBooster = byId<HTMLSelectElement>("pick-booster");
const pickShip = byId<HTMLSelectElement>("pick-ship");
const fill = (select: HTMLSelectElement, kind: string) => {
  for (const { record } of PART_ENTRIES) if (record.kind === kind) select.append(el("option", { value: record.id, textContent: record.name }));
};
fill(pickBooster, "booster");
fill(pickShip, "ship");
pickBooster.value = "starship-v3-booster";
pickShip.value = "starship-v3-ship";
function renderBuilder() {
  const description: Description = { rocket: "starship", variant: "v3", parts: { booster: pickBooster.value, ship: pickShip.value } };
  const report = check(description);
  const box = byId("builder-report");
  box.dataset.kind = !report.ok ? "refused" : report.custom ? "custom" : "real";
  box.textContent = !report.ok ? report.issues.filter((issue) => issue.level === "error").map((issue) => issue.message).join(" ") : `${report.label}. ${report.size?.height.toFixed(1)} m tall as drawn.`;
  const trim = report.custom ? description : { rocket: "starship", variant: "v3" };
  byId("builder-code").textContent = `build(${JSON.stringify(trim)})`;
  if (report.ok) builderRocket.description = trim;
}
pickBooster.addEventListener("change", renderBuilder);
pickShip.addEventListener("change", renderBuilder);
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
