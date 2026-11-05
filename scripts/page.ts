// The demo's page, made from demo/index.html and the family's shared head, header, footer and language chooser (family-template.mjs). The Pages build (site.ts) writes it
// into site/, and the dev server serves the same files, so the tests play the page that is published. The header's words, in both languages, are demo/words.js.
import { readFileSync } from "node:fs";

import { WORDS } from "../demo/words.js";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "uchusen-rockets";
const TITLE = "Uchusen Rockets 宇宙船: rockets drawn from sourced sizes";
const DESCRIPTION = "Rockets drawn from sourced sizes: a line drawing, thick lines and a painted 3D view of each variant, together, apart and each part alone, for a page of your own. A web component, an SVG string and a typed model.";

const TITLES = {
  "index.html": [TITLE, DESCRIPTION],
  "compare.html": ["Uchusen Rockets 宇宙船: compare craft", "Up to three rockets, spacecraft or ships of the SPX fleet in one 3D view, each at its true size on one ground, with the Earth behind them."],
  "journey.html": ["Uchusen Rockets 宇宙船: journey mode", "Fly a real rocket or a ship of the SPX fleet from the Earth to the Moon or a planet: launch windows from real positions, the burns, the flip, and the numbers as it goes."],
} as const;
const LINKS = [{ href: "docs/index.html", say: "pageDocs" }, { href: "embed.html", say: "pageEmbed" }, { href: "journey.html", say: "pageJourney" }];

/** The page's text with the family's blocks put in where its comments say. */
export function renderIndex(file: keyof typeof TITLES = "index.html"): string {
  const html = readFileSync(new URL(`../demo/${file}`, import.meta.url), "utf8");
  const [title, description] = TITLES[file];
  return html
    .replace("<!--family:head-->", familyHead({ id, title, description }))
    .replace("<!--family:header-->", familyHeader({ id, links: LINKS }))
    .replace("<!--family:unreviewed-->", familyUnreviewed({ id }))
    .replace("<!--family:footer-->", familyFooter({ id }))
    .replace(
      /<!--family:scripts ([\w./-]+)-->/,
      (_, script: string) =>
        `<script>${FAMILY_SCRIPT}</script>\n<script>window.uchusenLanguage = familyLanguage({ id: ${JSON.stringify(id)}, words: ${JSON.stringify(WORDS)} });</script>\n<script type="module" src="kazoku-parts.js"></script>\n<script type="module" src="${script}"></script>`,
    );
}
