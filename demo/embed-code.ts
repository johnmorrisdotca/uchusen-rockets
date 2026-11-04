// The tabs of the family's embed panel for a rocket. The package writes six ways itself (`embedCode`: the CDN script and tag, an iframe, a module, the SVG, a data address and a link to the shipped picture); the framework tabs
// are the shared snippets for the element, with the rocket's attributes and, for a painted rocket, its credit beside it. Pure: no DOM. The index page and the builder fill the panel from here.
import { embedSnippet, type EmbedKind as FamilyKind } from "@johnmorrisdotca/kazoku-ui/embed-panel";
import { attributesFromOptions, embedCode, paintedCredit, rocketToParams, SITE, type EmbedKind, type EmbedSettings, type RocketOptions } from "../src/index.ts";

export const PACKAGE = "@johnmorrisdotca/uchusen-rockets";

/** The panel's tabs: the family's seven, then the package's SVG, data address and image link. */
export const KINDS = ["html", "module", "react", "vue", "angular", "svelte", "iframe", "svg", "data", "link"] as const;
export type Kind = (typeof KINDS)[number];

/** The words for the tabs the family has no word for. */
export const LABELS = { data: "Data address", link: "Image link" } as const;

/** The sizes the panel offers: the iframe's largest width and the linked picture's width. */
export const SIZES = [240, 320, 480, 640] as const;

/** The package's own name for a tab that is one of its six. */
const OWN: Partial<Record<Kind, EmbedKind>> = { html: "element", module: "module", iframe: "iframe", svg: "svg", data: "data", link: "link" };

const html = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The tab's name in the package's `embedCode`/`embedNote`. The framework tabs are the element's, so they answer as `element`. */
export const packageKind = (kind: Kind): EmbedKind => OWN[kind] ?? "element";

/**
 * The text of one tab.
 *
 * @param kind - The tab.
 * @param options - The rocket as it is set up.
 * @param settings - Where the demo and the CDN are; `size` is the panel's size.
 */
export function panelCode(kind: Kind, options: RocketOptions, settings: EmbedSettings = {}): string {
  const own = OWN[kind];
  if (own !== undefined) return embedCode(options, own, settings);
  const credit = paintedCredit(options);
  const attrs = Object.entries(attributesFromOptions(options));
  const code = embedSnippet(kind as FamilyKind, {
    package: PACKAGE,
    cdn: "https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets",
    tag: "uchusen-rocket",
    element: "element",
    entries: [],
    attrs,
    name: "rocket",
    iframe: { src: `${settings.site ?? SITE}embed.html?${rocketToParams(options).toString()}`, title: options.label ?? "Rocket", width: settings.size ?? 480, height: Math.round(((settings.size ?? 480) * 4) / 3) },
  });
  if (credit === "") return code;
  const text = html(credit).replaceAll("\n", "<br>\n");
  const tag = /<uchusen-rocket\b[^>]*?(?:\/>|><\/uchusen-rocket>)/s.exec(code)?.[0];
  if (tag === undefined) return code;
  if (kind === "react") return code.replace(`return ${tag};`, `return (\n    <>\n      ${tag}\n      <p>{${JSON.stringify(credit)}}</p>\n    </>\n  );`);
  return code.replace(tag, `${tag}\n  <p>${text}</p>`);
}

/**
 * The drawing's own size, as the picture beside the code needs it: the panel scales a picture to its box from the size it is laid out at, so the drawing is given its `width` and `height` attributes as a size (set by script, which a strict policy allows).
 *
 * @param holder - An element holding the SVG text as markup.
 */
export function pictureOf(holder: HTMLElement): HTMLElement {
  const svg = holder.querySelector("svg");
  if (svg !== null) {
    svg.style.width = `${svg.getAttribute("width") ?? "480"}px`;
    svg.style.height = `${svg.getAttribute("height") ?? "640"}px`;
  }
  return holder;
}
