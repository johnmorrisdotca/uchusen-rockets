// Rockets and what to compare them with, side by side on one baseline at one scale, as one drawing with a ruler. Orthographic, so a metre is the same on every one. Pure.
import { BESIDE_NAME } from "../beside.ts";
import { build, type Built, drawnPieces } from "./index.ts";
import { check } from "../fit.ts";
import { axesOf, cleanView, directionOf, VIEWS, type ViewName } from "../framing.ts";
import { DEFAULT_LOOK, LOOKS, type LookName } from "../looks.ts";
import { type Camera, defsOf, drawPart, orthographic } from "../draw/svg.ts";
import { MATERIALS } from "../model/materials.ts";
import type { Bounds } from "../model/pieces.ts";
import { variantOf } from "../rockets.ts";

/**
 * Comparison shapes: plain round sizes, for scale, not facts about anything.
 *
 * @example
 * ```ts
 * import { COMPARES } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * console.log(COMPARES.person.height, COMPARES.building.height);
 * ```
 */
export const COMPARES = {
  person: { name: "A person, 1.8 m", height: 1.8, width: 0.5 },
  building: { name: "A ten-storey building, 30 m", height: 30, width: 18 },
} as const;
/**
 * The name of a comparison shape that can stand in a lineup: `person` or `building`.
 *
 * @example
 * ```ts
 * import type { CompareId } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const id: CompareId = "person";
 * console.log(id);
 * ```
 */
export type CompareId = keyof typeof COMPARES;

/**
 * The real craft that lie in the fleet band for scale: Starship with Super Heavy, Saturn V, SLS and the International Space Station. Each is a variant of the package, so its length is the sourced figure, `axis` is the way its length runs in its own model
 * (`y` up the stack, nose up; `x` along the station's long axis), and a rocket points its nose right. They are never scaled: they are drawn at the lineup's own scale.
 *
 * @example
 * ```ts
 * import { REAL_CRAFT } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * console.log(REAL_CRAFT.map((craft) => craft.name));
 * ```
 */
export const REAL_CRAFT = [
  { key: "starship:v3", name: BESIDE_NAME, axis: "y" },
  { key: "saturn-v:saturn-v", name: "Saturn V", axis: "y" },
  { key: "sls:block-1", name: "SLS Block 1", axis: "y" },
  { key: "iss:iss", name: "ISS", axis: "x" },
] as const;

/**
 * One thing standing in a lineup: its key (`starship:v3` or a comparison's name), its label and its height in metres.
 *
 * @example
 * ```ts
 * import { lineupSvg, type LineupItem } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const items: LineupItem[] = lineupSvg({ items: ["starship:v3", "person"], unit: 3 }).items;
 * console.log(items.map((item) => item.label));
 * ```
 */
export interface LineupItem {
  /** "starship:v3" or a comparison's name. */
  key: string;
  label: string;
  height: number;
}

const xmlText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => (Math.round(v * 10) / 10).toString();

/** A rocket painted black all over vanishes on the dark ground of a lineup, so it takes the line look's colour for its outline. Only the lines change: its shape and its figures stay. */
const edgeOf = (built: Built, look: LookName): string | undefined => {
  if (look !== "painted") return undefined;
  const hulls = built.parts.flatMap((part) => part.pieces).filter((piece) => piece.kind === "lathe" && piece.body);
  return hulls.length && hulls.every((piece) => piece.kind === "lathe" && MATERIALS[piece.material].fill === "dark") ? LOOKS.line.line : undefined;
};

/**
 * What a lineup is asked for: the items by key, how many pixels make a metre, and optionally the look, the view, what to show, a ruler and labels.
 *
 * @example
 * ```ts
 * import { lineupSvg, type LineupOptions } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const options: LineupOptions = { items: ["starship:v2", "starship:v3", "building"], unit: 3, ruler: true, labels: true };
 * console.log(lineupSvg(options).width);
 * ```
 */
export interface LineupOptions {
  /** "starship:v1,starship:v3,person,building". */
  items: readonly string[];
  /** Pixels a metre. */
  unit: number;
  look?: LookName;
  view?: ViewName;
  show?: string;
  ruler?: boolean;
  labels?: boolean;
  /** Real craft for scale: Starship with Super Heavy, Saturn V, SLS and the ISS lie sideways in the fleet band, at the same scale as the fleet ships, nose right, each labelled with its name and length. Left out: not drawn. Only where the fleet band is. */
  real?: boolean;
  /** `rockets` or `fleet` leaves out the other kind; `all` (the default) draws both. A fleet ship (a rocket whose id starts with `fleet-`) lies lengthwise in its own band below the rockets, unless `pose` is `stand`. */
  filter?: "all" | "rockets" | "fleet";
  /** Shrinks the scale, never grows it, until the whole drawing fits this many pixels across and down (either may be left out). Without it the scale is `unit`, as it always was. */
  fit?: { width?: number; height?: number };
  /** `stand` draws each fleet ship upright in the row, beside the others, at the same scale, and `view` turns it. Left out, a fleet ship lies in its own band, as it always has. */
  pose?: "stand";
}

const isFleet = (key: string): boolean => key.startsWith("fleet-");

/** A label broken at its spaces into lines of about `room` characters, one word at least to a line. A number keeps its unit: "30 m" is not broken. */
function wrapWords(label: string, room: number): string[] {
  const out: string[] = [];
  for (const word of label.replace(/(\d) (m)\b/g, "$1\u0000$2").split(" ")) {
    const text = word.replace("\u0000", " ");
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + text.length <= room) out[out.length - 1] = `${last} ${text}`;
    else out.push(text);
  }
  return out.length ? out : [label];
}

function comparison(id: CompareId, x: number, base: number, unit: number, line: string, fill: string): string {
  const { height, width } = COMPARES[id];
  const h = height * unit;
  const w = width * unit;
  if (id === "person") {
    const head = Math.max(0.6, h * 0.11);
    return `<circle cx="${n(x + w / 2)}" cy="${n(base - h + head)}" r="${n(head)}" fill="${fill}" stroke="${line}" stroke-width=".6"/><path d="M${n(x + w * 0.12)} ${n(base)}L${n(x + w * 0.2)} ${n(base - h * 0.76)}H${n(x + w * 0.8)}L${n(x + w * 0.88)} ${n(base)}Z" fill="${fill}" stroke="${line}" stroke-width=".6"/>`;
  }
  let floors = "";
  for (let i = 1; i < 10; i++) floors += `M${n(x)} ${n(base - (h * i) / 10)}h${n(w)}`;
  return `<rect x="${n(x)}" y="${n(base - h)}" width="${n(w)}" height="${n(h)}" fill="${fill}" stroke="${line}" stroke-width=".9"/><path d="${floors}" stroke="${line}" stroke-width=".35" opacity=".6"/>`;
}

/**
 * The whole picture as SVG text. Unknown items are left out.
 *
 * @param options The items and how they are drawn.
 * @returns The picture as SVG text, the items it holds, the real craft lying beside the fleet (`real`, with their lengths), its width and height and the scale it was drawn at (pixels a metre: less than `unit` when `fit` shrank it).
 * @example
 * ```ts
 * import { lineupSvg } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const picture = lineupSvg({ items: ["falcon-9:block-5", "falcon-heavy:falcon-heavy", "person"], unit: 4, ruler: true });
 * console.log(picture.items.length, picture.svg.startsWith("<svg"));
 * ```
 */
export function lineupSvg(options: LineupOptions): { svg: string; items: LineupItem[]; real: LineupItem[]; width: number; height: number; unit: number } {
  const filter = options.filter ?? "all";
  const stand = options.pose === "stand";
  const keys = options.items.map((raw) => raw.trim()).filter((key) => (isFleet(key) ? filter !== "rockets" : filter !== "fleet" || false));
  const fleetKeys = stand ? [] : keys.filter(isFleet);
  const rocketKeys = stand ? keys : keys.filter((key) => !isFleet(key));
  // the fleet filter shows ships only: no person, no building. Standing puts those ships upright in the row.
  const standing = filter === "fleet" && !stand ? [] : rocketKeys;
  let unit = options.unit;
  let drawn = draw({ ...options, items: standing }, fleetKeys, unit);
  const room = options.fit;
  if (room)
    for (let i = 0; i < 40; i++) {
      const tooWide = room.width !== undefined && drawn.width > room.width;
      const tooTall = room.height !== undefined && drawn.height > room.height;
      if (!tooWide && !tooTall) break;
      const next = draw({ ...options, items: standing }, fleetKeys, unit * 0.88, Math.max(0.75, (unit * 0.88) / options.unit));
      // a frame narrower than the cells themselves: shrinking the craft further would only make them unreadable, and the page's frame scrolls
      if (!tooTall && next.width >= drawn.width - 0.5) break;
      unit *= 0.88;
      drawn = next;
    }
  return { ...drawn, unit };
}

/** The pieces' extent, front to back and side to side and up and down, in metres, of a ship lying lengthwise (its long axis y drawn across the page, z up). */
function lying(built: Built): { length: number; beam: number; height: number; from: number; low: number } {
  const b = built.boundsOf("together");
  return { length: b.max[1] - b.min[1], beam: b.max[0] - b.min[0], height: b.max[2] - b.min[2], from: b.min[1], low: b.min[2] };
}

/**
 * The camera of a real craft lying in the fleet band, square on to its windward side: a rocket (`y`) points its nose right with its windward side towards us, and the station (`x`) runs along its long axis with y up. Orthographic at the lineup's scale, so
 * a metre is the same on it as on every ship.
 */
export function lyingCamera(axis: "x" | "y", b: Bounds, x0: number, baseY: number, unit: number): Camera {
  const along = axis === "y" ? 1 : 0;
  return {
    project: (p) => [x0 + (p[along] - b.min[along]) * unit, axis === "y" ? baseY + (p[0] - b.max[0]) * unit : baseY - (p[1] - b.min[1]) * unit],
    depth: (p) => -p[2],
    toward: () => [0, 0, 1],
    above: false,
  };
}

function draw(options: LineupOptions, fleetKeys: readonly string[], unit: number, squeeze = 1): { svg: string; items: LineupItem[]; real: LineupItem[]; width: number; height: number } {
  const { items, look = DEFAULT_LOOK, view = "front", ruler = true, labels = true } = options;
  const angle = VIEWS[cleanView(view)];
  const known: { key: string; built?: Built; compare?: CompareId; height: number; width: number; label: string }[] = [];
  for (const raw of items) {
    const key = raw.trim();
    if (Object.hasOwn(COMPARES, key)) {
      const c = COMPARES[key as CompareId];
      known.push({ key, compare: key as CompareId, height: c.height, width: c.width, label: c.name });
      continue;
    }
    const [rocket, variant] = key.split(":");
    const named = variantOf(rocket, variant);
    if (!named) continue;
    const report = check({ rocket, variant: named.id });
    if (!report.ok) continue;
    const built = build({ rocket, variant: named.id });
    const show = options.show && built.shows.includes(options.show) ? options.show : built.shows[0];
    const b = built.boundsOf(show);
    known.push({ key, built, height: b.max[1], width: Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]), Math.abs(b.min[2]), Math.abs(b.max[2])) * 2, label: named.name });
  }
  // a narrow frame shrinks the room between the craft along with the craft
  const gap = 28 * squeeze;
  const top = 26;
  const minCell = (options.pose === "stand" ? 220 : 96) * squeeze;
  // a label is wrapped to its own cell, so neighbours never run into each other. A standing ship's name is long, and 11px type is wider than the 5.5 estimate.
  const per = options.pose === "stand" ? 8 : 5.5;
  const cells = known.map((item) => Math.max(minCell, item.width * unit + gap));
  const lines = known.map((item, i) => wrapWords(item.label, Math.floor((cells[i] - 12) / per)));
  const labelRoom = labels ? Math.max(44, 18 + 13 * Math.max(...lines.map((one) => one.length))) : 0;
  const rulerRoom = ruler ? 46 : 8;
  const tallest = known.length ? Math.max(10, ...known.map((item) => item.height)) : 0;
  const bandHeight = known.length ? top + tallest * unit + labelRoom + 10 : 0;
  const base = top + tallest * unit;
  let x = rulerRoom;
  const body: string[] = [];
  const { line } = LOOKS[look];
  for (const [index, item] of known.entries()) {
    const cell = cells[index];
    const cx = x + cell / 2;
    if (item.compare) body.push(comparison(item.compare, cx - (COMPARES[item.compare].width * unit) / 2, base, unit, line, "url(#metal)"));
    else if (item.built) {
      const show = options.show && item.built.shows.includes(options.show) ? options.show : item.built.shows[0];
      const faced = cleanView(view) === "front" ? variantOf(item.key.split(":")[0], item.key.split(":")[1])?.lineupView : undefined;
      const facing = faced ? VIEWS[faced] : angle;
      const cam = orthographic(facing, unit, cx, base);
      const places = item.built.placesOf(show).filter((place) => place.shown);
      const { forward } = axesOf(directionOf(facing));
      const edge = edgeOf(item.built, look);
      for (const place of places.sort((a, b) => b.at[0] * forward[0] + b.at[2] * forward[2] - a.at[0] * forward[0] - a.at[2] * forward[2])) {
        const part = item.built.parts.find((p) => p.slot === place.slot);
        if (part) body.push(drawPart(drawnPieces(part, show === "together"), place.at, cam, look, 0.7, edge));
      }
    }
    if (labels) body.push(`<text x="${n(cx)}" y="${n(base + 16)}" text-anchor="middle" font-size="11" fill="currentColor">${lines[index].map((word, i) => `<tspan x="${n(cx)}" dy="${i ? 13 : 0}">${xmlText(word)}</tspan>`).join("")}</text>`);
    x += cell;
  }
  let width = known.length ? x + 8 : rulerRoom + 8;
  // the fleet: each ship lies lengthwise (its long axis across the page) in its own band below the rockets, at the same scale
  const ships: { key: string; label: string; built: Built; size: ReturnType<typeof lying> }[] = [];
  for (const key of fleetKeys) {
    const [rocket, variant] = key.split(":");
    const named = variantOf(rocket, variant);
    if (!named || !check({ rocket, variant: named.id }).ok) continue;
    const built = build({ rocket, variant: named.id });
    ships.push({ key, label: named.name, built, size: lying(built) });
  }
  let fleetY = bandHeight + (known.length && ships.length ? 12 : 0);
  const fleetBody: string[] = [];
  let longest = 0;
  const fleetBase: number[] = [];
  for (const ship of ships) {
    const { length, height: tall, from, low } = ship.size;
    const baseY = fleetY + 8 + tall * unit;
    const x0 = rulerRoom;
    const cam: Camera = { project: (p) => [x0 + (p[1] - from) * unit, baseY - (p[2] - low) * unit], depth: (p) => -p[0], toward: () => [1, 0, 0], above: false };
    const show = options.show && ship.built.shows.includes(options.show) ? options.show : ship.built.shows[0];
    const places = ship.built.placesOf(show).filter((place) => place.shown).sort((a, b) => a.at[0] - b.at[0]);
    const edge = edgeOf(ship.built, look);
    for (const place of places) {
      const part = ship.built.parts.find((p) => p.slot === place.slot);
      if (part) fleetBody.push(drawPart(drawnPieces(part, show === "together"), place.at, cam, look, 0.7, edge));
    }
    fleetBody.push(`<path d="M${n(x0)} ${n(baseY)}H${n(x0 + length * unit)}" stroke="currentColor" stroke-width=".6" opacity=".4"/>`);
    if (labels) fleetBody.push(`<text x="${n(x0)}" y="${n(baseY + 15)}" font-size="11" fill="currentColor">${xmlText(ship.label)}</text>`);
    fleetBase.push(baseY);
    longest = Math.max(longest, length);
    fleetY = baseY + (labels ? 26 : 12);
  }
  // the real craft for scale lie in the same band, one row each, at the same scale: a rocket nose right, the station along its long axis
  const real: LineupItem[] = [];
  let realEnd = 0;
  if (ships.length && options.real)
    for (const craft of REAL_CRAFT) {
      const [rocket, variant] = craft.key.split(":");
      const named = variantOf(rocket, variant);
      if (!named || !check({ rocket, variant: named.id }).ok) continue;
      const built = build({ rocket, variant: named.id });
      const b = built.boundsOf("together");
      // a rocket's long axis is y and the picture's up is -x (its windward side faces us); the station's is x, with y up
      const along = craft.axis === "y" ? 1 : 0;
      const length = b.max[along] - b.min[along];
      const tall = craft.axis === "y" ? b.max[0] - b.min[0] : b.max[1] - b.min[1];
      const baseY = fleetY + 6 + tall * unit;
      const x0 = rulerRoom;
      const cam = lyingCamera(craft.axis, b, x0, baseY, unit);
      const show = built.shows[0];
      const edge = edgeOf(built, look);
      for (const place of built.placesOf(show).filter((one) => one.shown).sort((a, c) => a.at[2] - c.at[2])) {
        const part = built.parts.find((p) => p.slot === place.slot);
        if (part) fleetBody.push(drawPart(drawnPieces(part, show === "together"), place.at, cam, look, 0.7, edge));
      }
      fleetBody.push(`<path d="M${n(x0)} ${n(baseY)}H${n(x0 + length * unit)}" stroke="currentColor" stroke-width=".6" opacity=".4"/>`);
      // the length is the sourced one: a rocket's height, the station's overall length
      const sourced = craft.axis === "y" ? named.facts.height.value : named.facts.diameter.value;
      const metres = typeof sourced === "number" ? sourced : Math.round(length * 10) / 10;
      const text = `${craft.name}, ${metres.toLocaleString("en-US")} m`;
      if (labels) fleetBody.push(`<text x="${n(x0 + length * unit + 8)}" y="${n(baseY - 2)}" font-size="11" fill="currentColor">${xmlText(text)}</text>`);
      real.push({ key: craft.key, label: craft.name, height: metres });
      realEnd = Math.max(realEnd, x0 + length * unit + (labels ? 8 + text.length * 6.2 : 0));
      fleetY = baseY + 10;
    }
  if (ships.length) {
    // the ruler's last number and its unit sit past the end of the longest ship
    width = Math.max(width, rulerRoom + longest * unit + (ruler ? 34 : 8), realEnd + 8);
    if (ruler) {
      // the metres, along the ground of the fleet band, the same scale as the rockets' ruler
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
      const step = steps.find((v) => v * unit >= 56) ?? 2000;
      const yy = fleetY + 4;
      fleetBody.push(`<path d="M${n(rulerRoom)} ${n(yy)}H${n(rulerRoom + longest * unit)}" stroke="currentColor" stroke-width="1" opacity=".7"/>`);
      for (let m = 0; m <= longest + 0.001; m += step) fleetBody.push(`<path d="M${n(rulerRoom + m * unit)} ${n(yy)}v5" stroke="currentColor" stroke-width="1" opacity=".7"/><text x="${n(rulerRoom + m * unit)}" y="${n(yy + 16)}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".85">${m.toLocaleString("en-US")}</text>`);
      fleetBody.push(`<text x="${n(rulerRoom + longest * unit + 22)}" y="${n(yy + 16)}" font-size="10" fill="currentColor" opacity=".85">m</text>`);
      fleetY = yy + 24;
    }
  }
  const height = known.length || ships.length ? Math.max(bandHeight, 0) + (ships.length ? fleetY - bandHeight : 0) : 36;
  let rule = "";
  if (ruler && known.length) {
    // a number every 24 pixels at the least, so the numbers never lie on each other
    const step = [10, 20, 50, 100, 200, 500, 1000, 2000].find((v) => v * unit >= 24) ?? 2000;
    rule += `<path d="M${rulerRoom - 8} ${n(base)}V${n(base - tallest * unit)}" stroke="currentColor" stroke-width="1" opacity=".7"/>`;
    for (let m = 0; m <= tallest + 0.001; m += step) rule += `<path d="M${rulerRoom - 8} ${n(base - m * unit)}h-5" stroke="currentColor" stroke-width="1" opacity=".7"/><text x="${rulerRoom - 16}" y="${n(base - m * unit + 3.5)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".85">${m}</text>`;
    rule += `<text x="${rulerRoom - 16}" y="${n(base - tallest * unit - 10)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".85">m</text><path d="M${rulerRoom - 8} ${n(base)}H${n(width)}" stroke="currentColor" stroke-width=".6" opacity=".4"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" role="img" aria-label="${xmlText(`To scale: ${[...known.map((item) => item.label), ...ships.map((ship) => ship.label)].join(", ")}`)}">${defsOf(look)}${rule}${body.join("")}${fleetBody.join("")}</svg>`;
  return { svg, width, height, real, items: [...known.map(({ key, label, height: h }) => ({ key, label, height: h })), ...ships.map((ship) => ({ key: ship.key, label: ship.label, height: ship.size.length }))] };
}
