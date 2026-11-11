// The demo's page, made from demo/index.html and the family's shared head, header, footer and language chooser (family-template.mjs). The Pages build (site.ts) writes it
// into site/, and the dev server serves the same files, so the tests play the page that is published. The header's words, in both languages, are demo/words.js.
import { readFileSync } from "node:fs";

import { pageCreditsHtml, pageHeaderHtml, type PageTexts } from "@johnmorrisdotca/kazoku-ui/page-frame";

import { WORDS } from "../demo/words.js";
import { FAMILY_SCRIPT, familyFooter, familyHead, familyHeader, familyUnreviewed } from "./family-template.mjs";

const id = "uchusen-rockets";
/** Where every credit is written in full. */
const NOTICE = "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/NOTICE.md";

/** The family's footer. The credits are the page frame's credit line just above it (`frame`). */
export const footer = (): string => familyFooter({ id });
const TITLE = "Uchusen Rockets 宇宙船: rockets drawn from sourced sizes";
const DESCRIPTION = "Rockets drawn from sourced sizes: a line drawing, thick lines and a painted 3D view of each variant, together, apart and each part alone, for a page of your own. A web component, an SVG string and a typed model.";

const TITLES = {
  "index.html": [TITLE, DESCRIPTION],
  "compare.html": ["Uchusen Rockets 宇宙船: compare craft", "Up to three rockets, spacecraft or ships of the SPX fleet in one 3D view, each at its true size on one ground, with the Earth behind them."],
  "journey.html": ["Uchusen Rockets 宇宙船: journey mode", "Fly a real rocket or a ship of the SPX fleet from the Earth to the Moon or a planet: launch windows from real positions, the burns, the flip, and the numbers as it goes."],
  "poster.html": ["Uchusen Rockets 宇宙船: Rockets of the World", "Every built craft at one true scale, with the SPX ships in their own row, to print or to zoom."],
  "beam.html": ["Uchusen Rockets 宇宙船: tractor beam", "A soft cone from a drone to the part it carries, in the painted look, the line look, and as a dotted line when motion is reduced."],
  "swarm.html": ["Uchusen Rockets 宇宙船: drone swarm", "Boxes stand in for the drones. They fly outside the hull and move in on the last leg, at the busiest moment of the build."],
  "inspect.html": ["Uchusen Rockets 宇宙船: inspect", "A finished ship sits still. From one drone to a hundred fly around it, pause to look, and move on. Nothing is built."],
  "fleet-db.html": ["Uchusen Rockets 宇宙船: fleet record", "The SPX ships, then one ship's sections, chosen in one row and kept in the address."],
  "fleet-compare.html": ["Uchusen Rockets 宇宙船: three ships at one scale", "The explorer, the command ship and the heavy transport stand side by side at one scale, from their own models, and the view stays in the address."],
  "yard.html": ["Uchusen Rockets 宇宙船: yard", "Three bays side by side. The name is a placeholder. Choose a bay, the lounge, the visitor port or the free spine, and play that bay's ship being built."],
  "embed-page.html": ["Uchusen Rockets 宇宙船: embed", "Choose a rocket and copy the code that puts exactly that on a page of your own. The same choices open the bare frame."],
} as const;
/** What each page is, in both languages, for the page frame's header line (and its title and description in the reader's language). The English is the page's title and description above. */
const WHAT: Record<string, { en: string; ja: string; jaDescription: string }> = {
  "index.html": { en: "rockets drawn from sourced sizes", ja: "出典のある寸法から描いたロケット", jaDescription: "出典のある寸法から描いたロケットです。線の絵、太い線、彩色の 3D で、組み立てた姿、ばらした姿、部品ひとつずつを見られ、自分のページにも置けます。" },
  "compare.html": { en: "compare craft", ja: "機体をくらべる", jaDescription: "ロケット、宇宙船、SPX 艦隊の船を3つまで、同じ地面に本当の大きさで並べて、地球を背にした 3D で見くらべます。" },
  "journey.html": { en: "journey mode", ja: "旅のモード", jaDescription: "本物のロケットや SPX 艦隊の船で、地球から月や惑星へ飛びます。実際の位置から出発の時期を決め、噴射、向きの反転、飛行中の数値を見られます。" },
  "poster.html": { en: "Rockets of the World", ja: "世界のロケット", jaDescription: "作られたすべての機体を同じ縮尺で並べ、SPX の船は別の列に置いたポスターです。印刷も拡大もできます。" },
  "beam.html": { en: "tractor beam", ja: "トラクタービーム", jaDescription: "ドローンから運ぶ部品へのびるやわらかい光の円すいを、彩色、線の絵、動きを減らす設定の点線で見せます。" },
  "swarm.html": { en: "drone swarm", ja: "ドローンの群れ", jaDescription: "箱がドローンの代わりです。船体の外を飛び、組み立てがいちばん忙しいときに最後の区間で近づきます。" },
  "inspect.html": { en: "inspect", ja: "点検", jaDescription: "完成した船が止まっています。1機から100機のドローンが周りを飛び、止まって見て、次へ移ります。何も組み立てません。" },
  "fleet-db.html": { en: "fleet record", ja: "艦隊の記録", jaDescription: "SPX の船と、1隻の区画を、1列のボタンで選びます。選んだものはアドレスに残ります。" },
  "fleet-compare.html": { en: "three ships at one scale", ja: "3隻を同じ縮尺で", jaDescription: "探査船、指揮船、大型輸送船を、それぞれのモデルから同じ縮尺で並べます。表示はアドレスに残ります。" },
  "yard.html": { en: "yard", ja: "造船所", jaDescription: "3つのベイが並んでいます。名前は仮のものです。ベイ、ラウンジ、見学用の港、空いている背骨を選び、そのベイの船ができていく様子を再生します。" },
  "embed-page.html": { en: "embed", ja: "自分のページに置く", jaDescription: "ロケットを選び、そのとおりの絵を自分のページに置くコードをコピーします。同じ選び方で、枠だけのページも開けます。" },
  "builder.html": { en: "code builder", ja: "コードを作る", jaDescription: "ロケット、見た目、見せる部品を選び、そのとおりの絵を自分のページに置くコードをコピーします。" },
};

/** The family's page frame for a page: what it is, a way home, and its credits, in the place of the source's <!--frame:header--> and <!--frame:credits--> (kazoku-ui's page-frame). */
export function frame(html: string, file: string, description: string): string {
  const what = WHAT[file];
  if (!what) throw new Error(`no page frame words for ${file}`);
  const texts: PageTexts = {
    en: { name: "Uchusen Rockets 宇宙船", what: what.en, description },
    ja: { name: "宇宙船 Uchusen Rockets", what: what.ja, description: what.jaDescription },
  };
  const credits = pageCreditsHtml({ en: (WORDS.en as Record<string, string>).creditLine!, ja: (WORDS.ja as Record<string, string>).creditLine! }, { href: NOTICE });
  return html.replace("<!--frame:header-->", pageHeaderHtml(texts, { meta: true })).replace("<!--frame:credits-->", credits);
}

const PAGES = [
  ["index.html", "pageRockets"],
  ["compare.html", "pageCompare"],
  ["journey.html", "pageJourney"],
  ["fleet-db.html", "pageFleet"],
  ["yard.html", "pageYard"],
  ["builder.html", "pageBuilder"],
  ["docs/index.html", "pageDocs"],
  ["embed-page.html", "pageEmbed"],
] as const;

/** The English a page shows before the language script runs. The script replaces it. */
function said(key: string): string {
  const table = WORDS.en as Record<string, string>;
  return table[key] ?? (key === "help" ? "Help" : "");
}

/** One row of links to every demo page, the open one marked, with Help beside them. */
export function pageBar(file: string): string {
  const links = PAGES.map(([href, say]) => `<a href="${href}" data-say="${say}"${href === file ? ` aria-current="page"` : ""}>${said(say)}</a>`).join("");
  const help = `<button type="button" class="fam-button" data-help-switch aria-pressed="false" data-say="help" data-say-title="helpTip">${said("help")}</button>`;
  const wide = WIDE_PAGES.includes(file) ? WIDE_TOGGLE : "";
  return `<nav class="page-links" data-testid="page-links" aria-label="Pages">${links}${help}${wide}</nav>`;
}

/** The pages with a side panel, which get the Wide toggle at the end of the page bar. The choice is kept in the address and on the device. */
const WIDE_PAGES: readonly string[] = ["index.html", "fleet-db.html", "yard.html", "journey.html", "builder.html", "embed-page.html"];
const WIDE_TOGGLE = `<kazoku-wide-toggle address storage="johnmorrisdotca.wide" data-testid="wide"></kazoku-wide-toggle>`;

/** The page's text with the family's blocks put in where its comments say. */
export function renderIndex(file: keyof typeof TITLES = "index.html"): string {
  const html = readFileSync(new URL(`../demo/${file}`, import.meta.url), "utf8");
  const [title, description] = TITLES[file];
  // The page links and the frame's header line share one row, so on a desk the line takes no height of its own and the choices stay on the first screen; a narrower screen wraps it under them.
  const rowed = html.replace("<!--family:header--><!--frame:header-->", '<!--family:header-->\n      <div class="page-row"><!--page-bar--><!--frame:header--></div>');
  return frame(rowed, file, description)
    .replace("<!--family:head-->", `${familyHead({ id, title, description })}\n    <link rel="icon" href="icon.png" />`)
    .replace("<!--family:header-->", familyHeader({ id }))
    .replace("<!--page-bar-->", pageBar(file))
    .replace("<!--family:unreviewed-->", familyUnreviewed({ id }))
    .replace("<!--family:footer-->", footer())
    .replace(
      /<!--family:scripts ([\w./-]+)-->/,
      (_, script: string) =>
        `<script>${FAMILY_SCRIPT}</script>\n<script>window.uchusenLanguage = familyLanguage({ id: ${JSON.stringify(id)}, words: ${JSON.stringify(WORDS)} });</script>\n<script type="module" src="kazoku-parts.js"></script>\n<script type="module" src="${script}"></script>`,
    );
}
