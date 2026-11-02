// `embedCode`: the text to put a rocket in a page, in each of the six ways: the custom element from a CDN, an iframe of `embed.html`, a JavaScript module, the SVG itself, a data address, and a link to the shipped picture.
// A painted rocket's credit is generated from the parts that show, and every painted form carries it.
import { build } from "./build/index.ts";
import { creditLine } from "./data/credits.ts";
import { check, type Description } from "./fit.ts";
import { cleanView } from "./framing.ts";
import { cleanShow, showsOf } from "./layout.ts";
import { cleanLook, DEFAULT_LOOK } from "./looks.ts";
import { attributesFromOptions, rocketToParams, type RocketOptions } from "./attrs.ts";

export const EMBED_KINDS = ["element", "iframe", "module", "svg", "data", "link"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export interface EmbedSettings {
  /** The address of the published demo, where `embed.html` is. */
  site?: string;
  /** The CDN or package path the element is loaded from. */
  cdn?: string;
}

export const SITE = "https://johnmorrisdotca.github.io/uchusen-rockets/";
export const CDN = "https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets@0";
/** The three.js a page with no bundler takes from the CDN: the version this package is built and tested with. */
export const THREE_VERSION = "0.186.1";
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const IMPORT_MAP = `<script type="importmap">\n  { "imports": { "three": "${THREE_CDN}/build/three.module.js", "three/addons/": "${THREE_CDN}/examples/jsm/" } }\n</script>`;

const esc = (value: string): string => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640" role="img"></svg>`;

function descriptionOf(options: RocketOptions): Description {
  if (options.build) {
    try {
      const parsed = JSON.parse(options.build) as Partial<Description>;
      if (parsed && typeof parsed === "object" && typeof parsed.rocket === "string") {
        return {
          rocket: parsed.rocket,
          ...(typeof parsed.variant === "string" ? { variant: parsed.variant } : {}),
          ...(parsed.parts && typeof parsed.parts === "object" ? { parts: parsed.parts } : {}),
        };
      }
    } catch {
      // a build that is not JSON falls through to the named rocket
    }
  }
  return { rocket: options.rocket ?? "starship", ...(options.variant ? { variant: options.variant } : {}) };
}

/** What an embed asks of the page around it, in words: a line for the demo to show. */
export function embedNote(kind: EmbedKind, options: RocketOptions): string {
  const notes: Readonly<Record<EmbedKind, string>> = {
    element: "One script from the CDN and the tag. The import map names three.js, for the 3D view; a page with a bundler needs neither, only the package.",
    iframe: "No script of your own. It draws the drawing at once, and the 3D view when the browser can. Add flight=1 to the address for the flight's controls.",
    module: "The drawing from a script of your own, with no three.js.",
    svg: "The drawing itself: nothing to load. Paste it in a page or save it as a file.",
    data: "The drawing as an address, for an image tag or a stylesheet.",
    link: options.view && options.view !== "three-quarter" ? "A link to the file in the package. Those show the three-quarter view, with no flames: use the SVG or data tab for this view." : "A link to the file in the package. Those show the three-quarter view, with no flames.",
  };
  return notes[kind];
}

/**
 * The CC BY line for a painted rocket, generated from the parts that are showing.
 * Empty when the look is not painted, or when those parts are this package's own paint.
 */
export function paintedCredit(options: RocketOptions): string {
  if (cleanLook(options.look) !== "painted") return "";
  const report = check(descriptionOf(options));
  if (!report.ok) return "";
  const show = options.show;
  const names = new Set(
    report.parts.filter(({ slot }) => !show || show === "together" || show === "apart" || show === slot).map(({ part }) => part.name),
  );
  return report.credits
    .map((credit) => {
      const used = credit.usedFor.filter((name) => names.has(name));
      return used.length === 0 ? "" : `${used.join(", ")}: ${creditLine(credit.id)}`;
    })
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * The shipped picture of these options, under the package's `dist/assets/`: `starship-v3.svg`, `falcon-9-block-5-apart.thick.svg`. These are drawn from the default view, with no flames. Null for a custom build, which has no file, or a variant, part or look that does not exist.
 */
export function assetPathOf(options: RocketOptions): string | null {
  if (options.build) return null;
  const description = descriptionOf(options);
  const report = check(description);
  if (!report.ok || !report.variant || report.custom) return null;
  const slots = report.parts.map(({ slot }) => slot);
  const shows = showsOf(slots);
  const show = cleanShow(options.show, slots);
  if (!shows.includes(show)) return null;
  const look = cleanLook(options.look);
  return `${report.variant.rocket}-${report.variant.id}${show === shows[0] ? "" : `-${show}`}${look === DEFAULT_LOOK ? "" : `.${look}`}.svg`;
}

function svgOptionsOf(options: RocketOptions) {
  return {
    look: cleanLook(options.look),
    view: cleanView(options.view),
    ...(options.show ? { show: options.show } : {}),
    ...(options.engines === "on" ? { engines: true } : {}),
  };
}

function drawingOf(options: RocketOptions): string {
  try {
    const drawn = build(descriptionOf(options)).svg(svgOptionsOf(options));
    const credit = paintedCredit(options);
    return credit === "" ? drawn : drawn.replace("</svg>", `<desc>${esc(credit)}</desc></svg>`);
  } catch {
    return EMPTY_SVG;
  }
}

const creditHtml = (credit: string): string => (credit === "" ? "" : `\n<p>${esc(credit).replaceAll("\n", "<br>\n")}</p>`);

/** The text of one embed. The `module` one imports the package; the `data` one is a `data:image/svg+xml` address for an `<img>`. */
export function embedCode(options: RocketOptions, kind: EmbedKind = "element", settings: EmbedSettings = {}): string {
  const site = settings.site ?? SITE;
  const cdn = settings.cdn ?? CDN;
  const credit = paintedCredit(options);
  if (kind === "svg") return drawingOf(options);
  if (kind === "data") return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawingOf(options))}`;
  if (kind === "link") {
    const path = assetPathOf(options);
    const alt = esc(options.label ?? "Rocket");
    const src = path === null ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawingOf(options))}` : `${cdn}/dist/assets/${path}`;
    return `<img src="${esc(src)}" alt="${alt}" width="480" height="640" loading="lazy">${creditHtml(credit)}`;
  }
  if (kind === "iframe") {
    const query = rocketToParams(options).toString();
    const src = `${site}embed.html${query === "" ? "" : `?${query}`}`;
    const title = options.label ?? "Rocket";
    return `<iframe\n  src="${esc(src)}"\n  title="${esc(title)}"\n  loading="lazy"\n  style="width:100%;max-width:480px;aspect-ratio:3 / 4;border:0"\n></iframe>${creditHtml(credit)}`;
  }
  if (kind === "module") {
    const description = descriptionOf(options);
    const svgOptions = svgOptionsOf(options);
    const caption = credit === "" ? "" : `\ndocument.querySelector("#credit").textContent = ${JSON.stringify(credit)};`;
    return `// In a page with <div id="rocket"></div>${credit === "" ? "" : ' and <p id="credit"></p>'}.\nimport { build } from "${cdn}/dist/build/index.js";\n// or, from npm: import { build } from "@johnmorrisdotca/uchusen-rockets/build";\n\nconst rocket = build(${JSON.stringify(description, null, 2)});\ndocument.querySelector("#rocket").innerHTML = rocket.svg(${JSON.stringify(svgOptions)});${caption}`;
  }
  const attrs = Object.entries(attributesFromOptions(options)).map(([name, value]) => `${name}="${esc(value)}"`);
  return `${IMPORT_MAP}\n<script type="module" src="${cdn}/dist/element.js"></script>\n\n<uchusen-rocket${attrs.length === 0 ? "" : `\n  ${attrs.join("\n  ")}`}\n></uchusen-rocket>${creditHtml(credit)}`;
}
