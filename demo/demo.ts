// The demo page: a rocket large with its controls, a comparison to scale, the part builder, the parts alone and every source. Everything comes from the package's own entries.
import { check, type Description, type Figure, LOOK_NAMES, type LookName, MODEL_CREDITS, PART_ENTRIES, PLANNED_ROCKETS, ROCKETS, SOURCES, type SourceId, type Variant, VIEW_NAMES, type ViewName, showsOf, variantOf, creditLine, type CreditId } from "../src/index.ts";
import { setAssetBase, type UchusenLineup, type UchusenRocket } from "../src/element.ts";

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

const ROCKET = ROCKETS.starship;
const LOOK_WORDS: Record<LookName, string> = { line: "Line drawing", thick: "Thick lines", painted: "Painted" };
const VIEW_WORDS: Record<ViewName, string> = { "three-quarter": "Three-quarter", front: "Front", back: "Back", side: "Side", below: "Below" };
const SHOW_WORDS: Record<string, string> = { together: "Together", apart: "Apart", booster: "Super Heavy", ship: "Ship" };

const hero = byId<UchusenRocket>("hero");
const state = { variant: "v3", show: "together", look: "line" as LookName, view: "three-quarter" as ViewName };

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
    cell.append(el("span", { className: "blank", textContent: "No source" }));
    if (figure?.note) cell.append(el("span", { className: "src", textContent: figure.note }));
    return cell;
  }
  cell.append(el("span", { className: "value", textContent: typeof figure.value === "number" ? unit(figure.value) : figure.value }));
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
  for (const slot of show === "together" || show === "apart" ? variant.slots : [show]) rows.push([`${name(slot)} engines`, variant.facts.engines[slot]]);
  rows.push(["First flight", variant.firstFlight]);
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
const creditFor = (variant: Variant): CreditId | null => {
  const report = check({ rocket: variant.rocket, variant: variant.id });
  return (report.credits[0]?.id as CreditId | undefined) ?? null;
};

function renderMain() {
  const variant = variantOf("starship", state.variant) as Variant;
  const shows = showsOf(variant.slots);
  if (!shows.includes(state.show)) state.show = shows[0];
  const showBox = byId("shows");
  showBox.replaceChildren(...shows.map((show) => chip(SHOW_WORDS[show] ?? show, `show-${show}`, () => pick({ show }))));
  press(showBox, `show-${state.show}`);
  press(byId("variants"), `variant-${state.variant}`);
  press(byId("looks"), `look-${state.look}`);
  press(byId("views"), `view-${state.view}`);
  hero.setAttribute("variant", state.variant);
  hero.setAttribute("show", state.show);
  hero.setAttribute("look", state.look);
  hero.setAttribute("view", state.view);
  byId("facts").replaceChildren(...factsFor(variant));
  const id = creditFor(variant);
  credit.hidden = !(state.look === "painted");
  if (id) {
    const c = MODEL_CREDITS[id];
    credit.replaceChildren(
      "Painted from ",
      el("a", { href: c.sourceUrl, textContent: c.title, rel: "noopener" }),
      ` by `,
      el("a", { href: c.creatorUrl, textContent: c.creator, rel: "noopener" }),
      ", ",
      el("a", { href: c.licenceUrl, textContent: c.licence, rel: "noopener" }),
      `. ${c.changes}`,
    );
  } else credit.textContent = "Painted by this package's own code, from sourced sizes. No licensed model shows this variant.";
}

function pick(change: Partial<typeof state>) {
  Object.assign(state, change);
  renderMain();
}

byId("variants").append(...ROCKET.variants.map((variant) => chip(variant.name, `variant-${variant.id}`, () => pick({ variant: variant.id }))));
byId("looks").append(...LOOK_NAMES.map((look) => chip(LOOK_WORDS[look], `look-${look}`, () => pick({ look }))));
byId("views").append(...VIEW_NAMES.map((view) => chip(VIEW_WORDS[view], `view-${view}`, () => pick({ view }))));
byId<HTMLInputElement>("spin").addEventListener("change", (event) => hero.setAttribute("spin", (event.target as HTMLInputElement).checked ? "slow" : "off"));
hero.setAttribute("spin", "slow");
renderMain();

// ------------------------------------------------------------- compare
const lineup = byId<UchusenLineup>("lineup");
const compared = new Set(["v1", "v2", "v3", "v4"]);
const comparePicks = byId("compare-picks");
function renderCompare() {
  for (const button of comparePicks.querySelectorAll("button")) button.setAttribute("aria-pressed", String(compared.has((button.dataset.testid as string).slice(8))));
  const chosen = ROCKET.variants.filter((variant) => compared.has(variant.id));
  lineup.setAttribute("items", [...chosen.map((variant) => `starship:${variant.id}`), "building", "person"].join(","));
  lineup.setAttribute("look", state.look === "painted" ? "painted" : "line");
  const table = byId("compare-table");
  const head = el("tr", {}, el("th", { textContent: "" }), ...chosen.map((variant) => el("th", { scope: "col", textContent: variant.name })));
  const rows: [string, (variant: Variant) => Figure<number | string> | undefined][] = [
    ["Whole height", (variant) => variant.facts.height],
    ["Super Heavy", (variant) => variant.facts.parts.booster],
    ["Ship", (variant) => variant.facts.parts.ship],
    ["Diameter", (variant) => variant.facts.diameter],
    ["First flight", (variant) => variant.firstFlight],
  ];
  const body = rows.map(([label, read]) =>
    el(
      "tr",
      {},
      el("th", { scope: "row", textContent: label }),
      ...chosen.map((variant) => {
        const figure = read(variant);
        const cell = el("td");
        if (!figure || figure.value === null) cell.append(el("span", { className: "blank", textContent: "No source" }));
        else cell.textContent = typeof figure.value === "number" ? `${figure.value} m` : figure.value;
        return cell;
      }),
    ),
  );
  table.replaceChildren(el("thead", {}, head), el("tbody", {}, ...body));
}
comparePicks.append(
  ...ROCKET.variants.map((variant) =>
    chip(variant.name, `compare-${variant.id}`, () => {
      if (compared.has(variant.id)) compared.delete(variant.id);
      else compared.add(variant.id);
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
