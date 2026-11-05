// The Moon in the demo's background, drawn by wakusei-planets and only after it is chosen. Nothing here copies a picture or a size: `lineSvg` and `embedCredit` are the package's. The Earth itself stays the one chikyu-earth draws.

export const PICKER = ["none", "earth", "moon"] as const;
export type PickerId = (typeof PICKER)[number];

export const isPicker = (id: string): id is PickerId => (PICKER as readonly string[]).includes(id);

type Lang = "en" | "ja";
type SkyForm = "line" | "painted";

let ticket = 0;

const clear = (holder: HTMLElement) => {
  holder.replaceChildren();
  holder.hidden = true;
  delete holder.dataset.draws;
  delete holder.dataset.form;
};

/** Drop whatever picture is up, so the next choice never keeps the last one's canvas. */
export const stopSky = (planet: HTMLElement, moons: HTMLElement) => {
  ticket += 1;
  clear(planet);
  clear(moons);
};

const putSvg = (holder: HTMLElement, markup: string, spot?: { left: string; top: string; width: string }) => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  const svg = host.querySelector("svg");
  if (!svg) return;
  if (spot) {
    svg.style.left = spot.left;
    svg.style.top = spot.top;
    svg.style.width = spot.width;
  }
  holder.append(svg);
};

/**
 * `earth` leaves the Earth's own picture alone and draws the Moon small beside it.
 * `moon` draws the Moon as the picture. `none` clears both.
 */
export const placeSky = (planet: HTMLElement, moons: HTMLElement, choice: PickerId, form: SkyForm, lang: Lang) => {
  const mine = ++ticket;
  clear(planet);
  clear(moons);
  if (choice === "none") return;
  void draw(mine, planet, moons, choice, form, lang);
};

const draw = async (mine: number, planet: HTMLElement, moons: HTMLElement, choice: PickerId, form: SkyForm, lang: Lang) => {
  const { lineSvg } = await import("@johnmorrisdotca/wakusei-planets");
  if (mine !== ticket) return;
  if (choice === "earth") {
    putSvg(moons, lineSvg("moon", { size: 320, labels: false, lang }), { left: "68%", top: "20%", width: "26%" });
    if (mine !== ticket) return clear(moons);
    moons.dataset.draws = "moon";
    moons.dataset.form = "line";
    moons.hidden = false;
    return;
  }
  if (form === "painted") await paint(planet, "moon", lang);
  else putSvg(planet, lineSvg("moon", { size: 640, labels: false, lang }));
  if (mine !== ticket) return clear(planet);
  planet.dataset.draws = "moon";
  planet.dataset.form = form === "painted" ? "painted" : "line";
  planet.hidden = false;
};

/** The painted look is the package's own element, which fetches its picture itself. No texture is copied into this site. */
const paint = async (holder: HTMLElement, body: string, lang: Lang) => {
  await import("@johnmorrisdotca/wakusei-planets/moons-earth");
  await import("@johnmorrisdotca/wakusei-planets/element");
  const node = document.createElement("wakusei-body");
  node.setAttribute("body", body);
  node.setAttribute("look", "painted");
  node.setAttribute("live", "off");
  node.setAttribute("labels", "off");
  node.setAttribute("lang", lang);
  holder.append(node);
};

/** The credit line the package gives for a body, in the look on screen. */
export const skyCredit = async (look: SkyForm): Promise<string> => {
  const { embedCredit } = await import("@johnmorrisdotca/wakusei-planets");
  return embedCredit({ body: "moon", look });
};

/** Small round thumbnails of the Earth and the Moon, from the package's line drawings. */
export const paintThumbs = async (root: ParentNode, lang: Lang) => {
  const { lineSvg, BODIES } = await import("@johnmorrisdotca/wakusei-planets");
  for (const id of ["earth", "moon"] as const) {
    const button = root.querySelector<HTMLButtonElement>(`[data-sky="${id}"]`);
    const dot = button?.querySelector(".thumb-dot");
    if (!button || !dot) continue;
    button.setAttribute("aria-label", BODIES[id].name[lang]);
    const host = document.createElement("div");
    host.innerHTML = lineSvg(id, { size: 48, labels: false, lang });
    const svg = host.querySelector("svg");
    if (!svg) continue;
    dot.replaceChildren(svg);
  }
};
