// What a ship's sheet and 3D inspector read from the kit: the labels of every named section with leader anchors in the ship's metres, the numbered deck summary, the spec block, the symbol legend, the scale bar and
// the general-arrangement views at one scale, and the exploded assembly with every module named and its mounting points. All data; the page draws it. Pure: no three.js and no DOM.
import type { Vec3 } from "../pieces.ts";
import { COLLARS } from "./collars.ts";
import { engineTable, performanceOf, PROXIMA_LY, trip } from "./engines.ts";
import { FLEET_OPERATOR, GLOSSARY, type GlossaryCode } from "./glossary.ts";
import { assemble } from "./kit.ts";
import { SECTIONS, type SectionRole } from "./sections.ts";
import type { ShipList } from "./types.ts";

/**
 * One label: what it says, the part it points at in the ship's metres (so a 3D view moves it with the part), which side of the ship its text goes, and where it comes from.
 *
 * @example
 * ```ts
 * import { labelsOf, SAMPLE_SHIPS, type Label } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const first: Label = labelsOf(SAMPLE_SHIPS.scout)[0];
 * console.log(first.text, first.at, first.side);
 * ```
 */
export interface Label {
  id: string;
  /** The place in the ship's list and the module's id. */
  place: number;
  module: string;
  text: string;
  does: string;
  role: SectionRole;
  /** The point the leader line ends on, in the ship's metres. */
  at: Vec3;
  /** Which side of the sheet the text stands: `left` is -X, `right` is +X. */
  side: "left" | "right";
  /** The deck number in the ship, for a deck. */
  deck?: number;
}

/**
 * The labels of a ship: one for every named section of every module, each pointing at its part, alternating sides so a sheet can carry them on both sides. A label's point follows the module wherever the list puts it.
 *
 * @param ship The ship's list.
 * @returns The labels, bottom of the spine first.
 * @example
 * ```ts
 * import { labelsOf, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const labels = labelsOf(SAMPLE_SHIPS.hauler);
 * console.log(labels.length, labels.filter((label) => label.side === "left").length);
 * ```
 */
export function labelsOf(ship: ShipList): Label[] {
  const { placed } = assemble(ship);
  const out: Label[] = [];
  const decks = deckNumbers(ship);
  let flip = 0;
  for (const p of placed) {
    const sections = SECTIONS[p.module.id] ?? [];
    for (const section of sections) {
      const y = p.at[1] + p.module.length * ((section.from + section.to) / 2);
      const side: "left" | "right" = flip++ % 2 === 0 ? "right" : "left";
      const reach = (section.reach ?? 0.6) * (p.module.width / 2);
      const x = p.at[0] + (side === "right" ? reach : -reach);
      out.push({ id: `${p.index + 1}/${section.id}`, place: p.index, module: p.module.id, text: section.name, does: section.does, role: section.role, at: [x, y, p.at[2]], side, ...(section.deck ? { deck: decks.get(`${p.index}/${section.id}`) } : {}) });
    }
  }
  return out;
}

/**
 * One deck of the numbered summary.
 *
 * @example
 * ```ts
 * import { deckSummary, type Deck, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const deck: Deck = deckSummary(SAMPLE_SHIPS.scout)[0];
 * console.log(deck.number, deck.name);
 * ```
 */
export interface Deck {
  /** Deck 1 is at the bow (the top of the spine). */
  number: number;
  name: string;
  does: string;
  role: SectionRole;
  module: string;
  place: number;
  /** Where it lies on the spine, metres from the stern. */
  from: number;
  to: number;
}

function deckNumbers(ship: ShipList): Map<string, number> {
  const map = new Map<string, number>();
  for (const deck of deckSummary(ship)) map.set(`${deck.place}/${deck.id}`, deck.number);
  return map;
}

/**
 * The numbered deck summary of a ship, bow to stern: every section that is a deck, numbered from 1 at the bow. A deck is its own part group, so a viewer can show it alone or highlight it from its number.
 *
 * @param ship The ship's list.
 * @returns The decks, deck 1 first.
 * @example
 * ```ts
 * import { deckSummary, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const deck of deckSummary(SAMPLE_SHIPS.scout)) console.log(deck.number, deck.name);
 * ```
 */
export function deckSummary(ship: ShipList): (Deck & { id: string })[] {
  const { placed } = assemble(ship);
  const all: (Deck & { id: string })[] = [];
  for (const p of placed) for (const section of SECTIONS[p.module.id] ?? []) if (section.deck) all.push({ id: section.id, number: 0, name: section.name, does: section.does, role: section.role, module: p.module.id, place: p.index, from: p.at[1] + p.module.length * section.from, to: p.at[1] + p.module.length * section.to });
  all.sort((a, b) => b.to - a.to || b.from - a.from);
  all.forEach((deck, i) => (deck.number = i + 1));
  return all;
}

/**
 * How dense a ship's labels are: labels for each hundred metres, and the share of the length each label stands for. The target is one label for every 3 to 5% of the length.
 *
 * @param ship The ship's list.
 * @returns The count, labels for each hundred metres and the share of the length each label stands for.
 * @example
 * ```ts
 * import { labelDensity, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(labelDensity(SAMPLE_SHIPS.hauler));
 * ```
 */
export function labelDensity(ship: ShipList): { labels: number; perHundredMetres: number; shareEach: number } {
  const length = assemble(ship).length;
  const labels = labelsOf(ship).length;
  return { labels, perHundredMetres: (labels / length) * 100, shareEach: 1 / labels };
}

/**
 * A line of a spec block: a name, a value with its unit, and a note.
 *
 * @example
 * ```ts
 * import { specBlock, type SpecLine, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const line: SpecLine = specBlock(SAMPLE_SHIPS.scout)[0];
 * console.log(line.name, line.value);
 * ```
 */
export interface SpecLine {
  name: string;
  value: string;
  note?: string;
}

/**
 * The spec block of a ship, for its sheet and its inspector: length, beam, height, dry and full mass, the engines by role, thrust, acceleration, top and cruise speed and the trip to Proxima Centauri in ship time
 * and in Earth's. Crew, passengers and cargo belong to the ship's own bible and are not here.
 *
 * @param ship The ship's list.
 * @param extras The ship's computer ("KAZE core v4") and its number of small craft (ATC), which belong to the ship and not to the kit.
 * @returns The lines, in the order a sheet prints them.
 * @example
 * ```ts
 * import { specBlock, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const line of specBlock(SAMPLE_SHIPS.scout)) console.log(`${line.name}: ${line.value}`);
 * ```
 */
export function specBlock(ship: ShipList, extras: { computer?: string; atc?: number } = {}): SpecLine[] {
  const a = assemble(ship);
  const p = performanceOf(ship);
  const rows = engineTable(ship);
  const t = trip(PROXIMA_LY, Math.min(p.accelerationFull, 1), Math.min(p.cruise, 0.999999));
  const n = (v: number, d = 0) => v.toLocaleString("en-US", { maximumFractionDigits: d });
  return [
    { name: "Length", value: `${n(a.length, 1)} m` },
    { name: "Beam", value: `${n(Math.max(a.width, a.depth), 1)} m` },
    { name: "Dry mass", value: `${n(a.mass)} t` },
    { name: "Full mass", value: `${n(p.full)} t`, note: `${n(a.propellant)} t of propellant` },
    ...rows.map((row) => ({ name: `Engines, ${row.role}${row.card.code ? ` (${row.card.code} ×${row.count})` : ""}`, value: `${row.count} x ${n(row.card.thrust / 1e6, 1)} MN = ${n(row.thrust / 1e6)} MN`, note: `${row.card.name}, ${n(row.card.isp)} s, exhaust ${(row.card.exhaustOfC * 100).toFixed(1)}% of c, ${row.card.operation}` })),
    ...(extras.computer ? [{ name: "Ship computer", value: extras.computer, note: GLOSSARY.KAZE }] : []),
    ...(extras.atc ? [{ name: "Small craft", value: `${extras.atc} ATC`, note: GLOSSARY.ATC }] : []),
    { name: "Acceleration", value: `${p.accelerationFull.toFixed(3)} g full, ${p.accelerationDry.toFixed(3)} g dry` },
    { name: "Cruise speed", value: `${(p.cruise * 100).toFixed(1)}% of c`, note: "the most it can reach and still stop, from its fuel" },
    { name: "Top speed", value: `${(p.topSpeed * 100).toFixed(1)}% of c`, note: "one way, all the fuel" },
    { name: "Proxima Centauri", value: `${n(t.ship, 1)} years aboard, ${n(t.earth, 1)} years on Earth`, note: `${PROXIMA_LY} light years, accelerating at ${Math.min(p.accelerationFull, 1).toFixed(2)} g, cruising at ${(t.peak * 100).toFixed(1)}% of c` },
  ];
}

/**
 * A symbol of the legend: its id, its name, what it means on a sheet, and a small drawing as an SVG path in a 24 by 24 box.
 *
 * @example
 * ```ts
 * import { LEGEND, type LegendSymbol } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const symbol: LegendSymbol = LEGEND[0];
 * console.log(symbol.name, symbol.path);
 * ```
 */
export interface LegendSymbol {
  id: string;
  name: string;
  means: string;
  path: string;
}

/**
 * The symbol legend: the marks a sheet uses for hatches, locks, ladders, lifts, valves, pumps, lines and radiation. They are this package's own plain shapes; each is a stroke path in a 24 by 24 box.
 *
 * @example
 * ```ts
 * import { LEGEND } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(LEGEND.map((symbol) => symbol.name).join(", "));
 * ```
 */
export const LEGEND: readonly LegendSymbol[] = [
  { id: "hatch", name: "Hatch", means: "A door between rooms", path: "M4 4h16v16H4z M4 20L20 4" },
  { id: "airlock", name: "Airlock", means: "Two doors with a chamber", path: "M2 6h20v12H2z M9 6v12 M15 6v12" },
  { id: "eva", name: "EVA hatch", means: "A door to the outside", path: "M12 3a9 9 0 1 0 0.01 0z M12 7v10 M7 12h10" },
  { id: "ladder", name: "Ladder or stair", means: "A way between decks", path: "M8 3v18 M16 3v18 M8 7h8 M8 11h8 M8 15h8 M8 19h8" },
  { id: "lift", name: "Lift", means: "A car on a shaft", path: "M5 3h14v18H5z M12 8l-3 4h6z M12 16l-3-4h6z" },
  { id: "valve", name: "Valve", means: "A gate on a line", path: "M3 12h18 M7 6l5 6-5 6z M17 6l-5 6 5 6z" },
  { id: "pump", name: "Pump", means: "Moves a liquid", path: "M12 4a8 8 0 1 0 0.01 0z M12 4l5 8-5 8" },
  { id: "fuel-line", name: "Feed or transfer line", means: "Propellant moving", path: "M2 12h20 M18 8l4 4-4 4" },
  { id: "coolant", name: "Coolant line", means: "Heat moving", path: "M2 12c3-6 5 6 8 0s5 6 8 0 M18 8l4 4-4 4" },
  { id: "power", name: "Power bus", means: "Electric power", path: "M13 2L5 14h6l-1 8 8-12h-6z" },
  { id: "data", name: "Data line", means: "Signals and control", path: "M3 12h4 M10 12h4 M17 12h4 M3 7h18 M3 17h18" },
  { id: "radiation", name: "Radiation shield", means: "A shielded volume", path: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M12 3v5 M5 17l4-3 M19 17l-4-3" },
  { id: "sensor", name: "Sensor", means: "Looks at something", path: "M3 12c4-6 14-6 18 0-4 6-14 6-18 0z M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" },
  { id: "antenna", name: "Antenna", means: "Talks to something", path: "M12 21V9 M6 5a8 8 0 0 1 12 0 M8 8a5 5 0 0 1 8 0" },
  { id: "dock", name: "Docking port", means: "Where another module mates", path: "M12 3a9 9 0 1 0 0.01 0z M12 8a4 4 0 1 0 0.01 0z" },
  { id: "tank", name: "Tank", means: "Holds a fluid", path: "M6 5a6 3 0 0 1 12 0v14a6 3 0 0 1-12 0z M6 5a6 3 0 0 0 12 0" },
  { id: "medical", name: "Medical", means: "Care for the sick", path: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" },
  { id: "hazard", name: "Hazard", means: "Take care", path: "M12 3l10 18H2z M12 10v5 M12 18v1" },
];

/**
 * A scale bar: a length in metres, its pixels at the sheet's scale, and the ticks along it.
 *
 * @example
 * ```ts
 * import { scaleBar, type ScaleBar } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const bar: ScaleBar = scaleBar(2, 300);
 * console.log(bar.metres, bar.ratio);
 * ```
 */
export interface ScaleBar {
  metres: number;
  pixels: number;
  ticks: { at: number; label: string }[];
  ratio: string;
}

/**
 * A scale bar for a sheet: a round length in metres that fits `maxPixels` at the scale `pixelsPerMetre`, with ticks, and the ratio when the sheet is `dpi` dots to an inch.
 *
 * @param pixelsPerMetre The sheet's scale.
 * @param maxPixels The longest bar the sheet has room for.
 * @param dpi The sheet's dots to the inch, for the ratio (default 96).
 * @returns The bar: its metres, its pixels, its ticks and the ratio as text.
 * @example
 * ```ts
 * import { scaleBar } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const bar = scaleBar(2, 300);
 * console.log(bar.metres, bar.pixels, bar.ticks.length, bar.ratio);
 * ```
 */
export function scaleBar(pixelsPerMetre: number, maxPixels: number, dpi = 96): ScaleBar {
  const room = maxPixels / pixelsPerMetre;
  const decade = 10 ** Math.floor(Math.log10(room));
  const metres = [5, 2, 1].map((k) => k * decade).find((m) => m <= room) ?? decade;
  const steps = metres / decade === 5 ? 5 : metres / decade === 2 ? 4 : 5;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => ({ at: (i * metres * pixelsPerMetre) / steps, label: `${Number(((i * metres) / steps).toPrecision(3))}` }));
  return { metres, pixels: metres * pixelsPerMetre, ticks, ratio: `1:${Math.round(((1 / pixelsPerMetre) * dpi) / 0.0254)}` };
}

/**
 * The general-arrangement views at one scale.
 *
 * @example
 * ```ts
 * import { arrangement, type Arrangement, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const a: Arrangement = arrangement(SAMPLE_SHIPS.scout, { width: 400, height: 800 });
 * console.log(a.scale, a.views.length);
 * ```
 */
export interface Arrangement {
  /** Pixels a metre, the same in every view. */
  scale: number;
  views: { id: "side" | "front" | "top"; width: number; height: number; /** Which of the ship's axes run along the sheet's x and y. */ axes: ["x" | "z", "y" | "z"] }[];
  ruler: ScaleBar;
  /** The ship's length ruler: a tick every `step` metres along the spine. */
  lengthRuler: { step: number; ticks: number[] };
}

/**
 * The general-arrangement views of a ship at one scale: side (the spine up the sheet), front (looking down the spine) and top, in a frame `width` by `height` pixels, with one scale for all three and a ruler along the length.
 *
 * @param ship The ship's list.
 * @param frame The room each view has, in pixels.
 * @returns The scale, the size of each view, a scale bar and the length ruler's ticks.
 * @example
 * ```ts
 * import { arrangement, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const a = arrangement(SAMPLE_SHIPS.scout, { width: 400, height: 900 });
 * console.log(a.scale.toFixed(2), a.views.map((view) => view.id), a.lengthRuler.step);
 * ```
 */
export function arrangement(ship: ShipList, frame: { width: number; height: number }): Arrangement {
  const a = assemble(ship);
  const scale = Math.min(frame.height / a.length, frame.width / Math.max(a.width, a.depth));
  const step = [10, 20, 50, 100, 200, 500].find((s) => a.length / s <= 14) ?? 1000;
  return {
    scale,
    views: [
      { id: "side", width: a.width * scale, height: a.length * scale, axes: ["x", "y"] },
      { id: "front", width: a.width * scale, height: a.depth * scale, axes: ["x", "z"] },
      { id: "top", width: a.width * scale, height: a.depth * scale, axes: ["x", "z"] },
    ],
    ruler: scaleBar(scale, frame.width * 0.8),
    lengthRuler: { step, ticks: Array.from({ length: Math.floor(a.length / step) + 1 }, (_, i) => i * step) },
  };
}

/**
 * One module of an exploded assembly: its name, how far it moves from its place, and the points it mounts at.
 *
 * @example
 * ```ts
 * import { exploded, type ExplodedModule, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const one: ExplodedModule = exploded(SAMPLE_SHIPS.scout)[0];
 * console.log(one.name, one.mounts.length);
 * ```
 */
export interface ExplodedModule {
  place: number;
  module: string;
  name: string;
  /** Where it stands assembled and where the exploded view puts it, as the origin of its base. */
  assembled: Vec3;
  exploded: Vec3;
  /** Its mounting points: each collar (class, diameter and centre of its face, exploded) and each port. */
  mounts: { id: string; kind: "collar-top" | "collar-bottom" | "port"; collar: string; diameter: number; at: Vec3 }[];
}

/**
 * The exploded assembly of a ship: every module moved apart along the spine by `gap` metres so none touches, with its name and its mounting points (the centre of each collar's face and each port) in the exploded positions.
 * Modules hung beside the spine move out along their own direction.
 *
 * @param ship The ship's list.
 * @param gap The gap between modules, in metres. Left out: a tenth of the ship's length, at most 20.
 * @returns One entry for each module, bottom first.
 * @example
 * ```ts
 * import { exploded, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const one of exploded(SAMPLE_SHIPS.scout)) console.log(one.name, one.mounts.length);
 * ```
 */
export function exploded(ship: ShipList, gap?: number): ExplodedModule[] {
  const a = assemble(ship);
  const g = gap ?? Math.min(20, a.length / 10);
  const out: ExplodedModule[] = [];
  let step = 0;
  for (const p of a.placed) {
    const parent = ship[p.index].on ? out.find((o) => o.place === ship[p.index].on?.place) : undefined;
    const lift = p.how === "spine" ? step * g : parent ? parent.exploded[1] - parent.assembled[1] + g * 0.6 : 0;
    const away = Math.hypot(p.at[0], p.at[2]);
    const dir: Vec3 = away > 0.1 ? [p.at[0] / away, 0, p.at[2] / away] : [0, 0, 0];
    const at: Vec3 = p.how === "spine" ? [p.at[0], p.at[1] + lift, p.at[2]] : [p.at[0] + dir[0] * g * 0.8, p.at[1] + (p.how === "port" ? lift : 0), p.at[2] + dir[2] * g * 0.8];
    const mounts: ExplodedModule["mounts"] = [];
    if (p.module.top) mounts.push({ id: "top", kind: "collar-top", collar: p.module.top, diameter: COLLARS[p.module.top].outer, at: [at[0], at[1] + p.module.length, at[2]] });
    if (p.module.bottom) mounts.push({ id: "bottom", kind: "collar-bottom", collar: p.module.bottom, diameter: COLLARS[p.module.bottom].outer, at });
    for (const port of p.module.ports) mounts.push({ id: port.id, kind: "port", collar: port.collar, diameter: COLLARS[port.collar].outer, at: [at[0] + port.at[0], at[1] + port.at[1], at[2] + port.at[2]] });
    out.push({ place: p.index, module: p.module.id, name: p.module.name, assembled: p.at, exploded: at, mounts });
    if (p.how === "spine") step++;
  }
  return out;
}

/**
 * A sheet's title block: the office, a line for each of the vehicle, its registry, class, drive and computer, the maker, sheet, scale, revision and status, and the vehicle's line in the fleet's own form.
 *
 * @example
 * ```ts
 * import { titleBlock, type TitleBlock } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const block: TitleBlock = titleBlock({ designation: "SPX-207", name: "Kaminari", shipClass: "IHT", drive: { code: "FTD", count: 8 }, computer: "KAZE core v4", sheet: "exterior", sheetNo: [1, 8], scale: "1:1000", revision: "A", date: "2026-11-04", stage: "planned", firstFlight: 2412 });
 * console.log(block.line);
 * ```
 */
export interface TitleBlock {
  office: string;
  rows: { name: string; value: string }[];
  /** The status line on its own, such as "PLANNED · FIRST FLIGHT 2412". */
  status: string;
  /** The vehicle's line, such as "ISV Kaminari, SPX-207 · IHT class · SPX · FTD ×8 · KAZE core v4". */
  line: string;
}

/**
 * A sheet's title block, written in-universe: the SPX fleet drawing office, the vehicle as "ISV <name>, <registry>", the maker "SPX", its class, drive and computer in the fleet's own codes (see `GLOSSARY`), and a
 * status in the future tense: "PLANNED · FIRST FLIGHT 2412" or "IN DEVELOPMENT · FIRST FLIGHT PLANNED 2412", never "in service". A date is a planned date. The operator is `FLEET_OPERATOR`, just "SPX".
 *
 * @param o The designation (SPX- and any registry number, such as SPX-207) and name, its Japanese name with its ruby (`{ kanji: "加美鳴", ruby: "かみなり" }`, always shown together), the class, drive and computer, the sheet (its title and its place in the set), the scale, the revision and its date, the stage and the planned year of the first flight.
 * @returns The block's rows, its status line and the vehicle's line.
 * @example
 * ```ts
 * import { titleBlock } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const block = titleBlock({ designation: "SPX-207", name: "Kaminari", shipClass: "IHT", drive: { code: "FTD", count: 8 }, computer: "KAZE core v4", sheet: "exterior", sheetNo: [1, 8], scale: "1:1000", revision: "A", date: "2026-11-04", stage: "planned", firstFlight: 2412 });
 * console.log(block.line, block.status);
 * ```
 */
export function titleBlock(o: { designation: string; name: string; shipClass?: "IHT" | "ICV" | "IXV"; drive?: { code: "FTD" | "DCD"; count: number }; computer?: string; ja?: { kanji: string; ruby: string }; sheet: string; sheetNo: readonly [number, number]; scale: string; revision: string; date: string; stage: "planned" | "development"; firstFlight: number }): TitleBlock {
  if (!o.designation.startsWith("SPX-")) throw new Error(`"${o.designation}" does not start with SPX-.`);
  const status = o.stage === "planned" ? `PLANNED · FIRST FLIGHT ${o.firstFlight}` : `IN DEVELOPMENT · FIRST FLIGHT PLANNED ${o.firstFlight}`;
  const vehicle = `ISV ${o.name}, ${o.designation}`;
  const parts = [vehicle, o.shipClass ? `${o.shipClass} class` : "", FLEET_OPERATOR, o.drive ? `${o.drive.code} ×${o.drive.count}` : "", o.computer ?? ""].filter((part) => part !== "");
  return {
    office: "SPX FLEET DRAWING OFFICE",
    status,
    line: parts.join(" · "),
    rows: [
      { name: "Vehicle", value: vehicle },
      { name: "Designation", value: o.designation },
      ...(o.ja ? [{ name: "Name in Japanese", value: `${o.ja.kanji} ${o.ja.ruby}` }] : []),
      ...(o.shipClass ? [{ name: "Class", value: `${o.shipClass}, ${GLOSSARY[o.shipClass]}` }] : []),
      ...(o.drive ? [{ name: "Main drive", value: `${o.drive.code} ×${o.drive.count}, ${GLOSSARY[o.drive.code]}` }] : []),
      ...(o.computer ? [{ name: "Ship computer", value: `${o.computer}, ${GLOSSARY.KAZE}` }] : []),
      ...(FLEET_OPERATOR ? [{ name: "Operator", value: FLEET_OPERATOR }] : []),
      { name: "Maker", value: "SPX" },
      { name: "Sheet", value: `${o.sheetNo[0]} of ${o.sheetNo[1]} · ${o.sheet}` },
      { name: "Scale", value: o.scale },
      { name: "Revision", value: `${o.revision} · ${o.date}` },
      { name: "Status", value: status },
    ],
  };
}

/** The glossary code a drive card carries. */
export type DriveCode = Extract<GlossaryCode, "FTD" | "DCD">;
