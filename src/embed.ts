// `embedCode`: the text to put a rocket in a page, in each of the five ways: the custom element, an iframe of `embed.html`, a JavaScript module, and the SVG itself or a data address.
// A painted rocket's credit is generated from the parts that show, and every painted form carries it.
import { build } from "./build/index.ts";
import { creditLine } from "./data/credits.ts";
import { check, type Description } from "./fit.ts";
import { cleanView } from "./framing.ts";
import { cleanLook } from "./looks.ts";
import { attributesFromOptions, rocketToParams, type RocketOptions } from "./attrs.ts";

export const EMBED_KINDS = ["element", "iframe", "module", "svg", "data"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export interface EmbedSettings {
  /** The address of the published demo, where `embed.html` is. */
  site?: string;
  /** The CDN or package path the element is loaded from. */
  cdn?: string;
}

export const SITE = "https://johnmorrisdotca.github.io/uchusen-rockets/";
export const CDN = "https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets@0";

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
    return `import { build } from "${cdn}/dist/build/index.js";\n// or, from npm: import { build } from "@johnmorrisdotca/uchusen-rockets/build";\n\nconst rocket = build(${JSON.stringify(description, null, 2)});\ndocument.querySelector("#rocket").innerHTML = rocket.svg(${JSON.stringify(svgOptions)});${caption}`;
  }
  const attrs = Object.entries(attributesFromOptions(options)).map(([name, value]) => `${name}="${esc(value)}"`);
  return `<script type="module" src="${cdn}/dist/element.js"></script>\n\n<uchusen-rocket${attrs.length === 0 ? "" : `\n  ${attrs.join("\n  ")}`}\n></uchusen-rocket>${creditHtml(credit)}`;
}
