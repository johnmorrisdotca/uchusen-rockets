// Rockets and what to compare them with, side by side on one baseline at one scale, as one drawing with a ruler. Orthographic, so a metre is the same on every one. Pure.
import { build, type Built, drawnPieces } from "./index.ts";
import { check } from "../fit.ts";
import { axesOf, cleanView, directionOf, VIEWS, type ViewName } from "../framing.ts";
import { DEFAULT_LOOK, LOOKS, type LookName } from "../looks.ts";
import { defsOf, drawPart, orthographic } from "../draw/svg.ts";
import { MATERIALS } from "../model/materials.ts";
import { variantOf } from "../rockets.ts";

/** Comparison shapes: plain round sizes, for scale, not facts about anything. */
export const COMPARES = {
  person: { name: "A person, 1.8 m", height: 1.8, width: 0.5 },
  building: { name: "A ten-storey building, 30 m", height: 30, width: 18 },
} as const;
export type CompareId = keyof typeof COMPARES;

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

/** The whole picture as SVG text. Unknown items are left out. */
export function lineupSvg(options: LineupOptions): { svg: string; items: LineupItem[]; width: number; height: number } {
  const { items, unit, look = DEFAULT_LOOK, view = "front", ruler = true, labels = true } = options;
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
  const gap = 28;
  const top = 26;
  const labelRoom = labels ? 44 : 0;
  const rulerRoom = ruler ? 46 : 8;
  const tallest = Math.max(10, ...known.map((item) => item.height));
  const height = top + tallest * unit + labelRoom + 10;
  const base = top + tallest * unit;
  const minCell = 96;
  let x = rulerRoom;
  const body: string[] = [];
  const { line } = LOOKS[look];
  for (const item of known) {
    const cell = Math.max(minCell, item.width * unit + gap);
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
    if (labels) {
      const words = item.label.length > 19 ? [item.label.slice(0, item.label.lastIndexOf(" ", 19)), item.label.slice(item.label.lastIndexOf(" ", 19) + 1)] : [item.label];
      body.push(`<text x="${n(cx)}" y="${n(base + 16)}" text-anchor="middle" font-size="11" fill="currentColor">${words.map((word, i) => `<tspan x="${n(cx)}" dy="${i ? 13 : 0}">${xmlText(word)}</tspan>`).join("")}</text>`);
    }
    x += cell;
  }
  const width = x + 8;
  let rule = "";
  if (ruler) {
    const step = tallest * unit < 240 ? 10 : 20;
    rule += `<path d="M${rulerRoom - 8} ${n(base)}V${n(base - tallest * unit)}" stroke="currentColor" stroke-width="1" opacity=".7"/>`;
    for (let m = 0; m <= tallest + 0.001; m += step) rule += `<path d="M${rulerRoom - 8} ${n(base - m * unit)}h-5" stroke="currentColor" stroke-width="1" opacity=".7"/><text x="${rulerRoom - 16}" y="${n(base - m * unit + 3.5)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".85">${m}</text>`;
    rule += `<text x="${rulerRoom - 16}" y="${n(base - tallest * unit - 10)}" text-anchor="end" font-size="10" fill="currentColor" opacity=".85">m</text><path d="M${rulerRoom - 8} ${n(base)}H${n(width)}" stroke="currentColor" stroke-width=".6" opacity=".4"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" role="img" aria-label="${xmlText(`To scale: ${known.map((item) => item.label).join(", ")}`)}">${defsOf(look)}${rule}${body.join("")}</svg>`;
  return { svg, width, height, items: known.map(({ key, label, height: h }) => ({ key, label, height: h })) };
}
