// Backgrounds other than the Earth, drawn by wakusei-planets and only after one is chosen. Nothing here copies a picture or a size.

type Lang = "en" | "ja";
type SkyForm = "line" | "painted";

export type SkyList = {
  order: readonly string[];
  moonsOf: (id: string) => readonly string[];
  name: (id: string, lang: Lang) => string;
  known: (id: string) => boolean;
};

let listPromise: Promise<SkyList> | null = null;

/** The Sun, the planets out to Pluto, and the moons of those, as the package lists them. */
export const skyList = (): Promise<SkyList> => {
  listPromise ??= import("@johnmorrisdotca/wakusei-planets").then(({ PLANET_IDS, MOONS_OF, BODIES }) => {
    const moons = MOONS_OF as Record<string, readonly string[]>;
    const offered = new Set<string>(["none", "sun", ...PLANET_IDS]);
    for (const id of PLANET_IDS) for (const moon of moons[id] ?? []) offered.add(moon);
    return {
      order: ["none", "sun", ...PLANET_IDS],
      moonsOf: (id: string) => moons[id] ?? [],
      name: (id: string, lang: Lang) => BODIES[id as keyof typeof BODIES]?.name[lang] ?? id,
      known: (id: string) => offered.has(id),
    };
  });
  return listPromise;
};

/** Moons that read well behind a planet when no single moon is chosen. Any other moon waits until it is picked. */
export const companionsFor = (body: string, moon: string, moonsOf: (id: string) => readonly string[]): string[] => {
  const list = moonsOf(body);
  if (moon && list.includes(moon)) return [moon];
  if (body === "earth" && list.includes("moon")) return ["moon"];
  if (body === "jupiter") return ["io", "europa", "ganymede", "callisto"].filter((id) => list.includes(id));
  if (body === "saturn" && list.includes("titan")) return ["titan"];
  return [];
};

const SPOTS = [
  { left: "68%", top: "16%", width: "20%" },
  { left: "8%", top: "28%", width: "15%" },
  { left: "72%", top: "54%", width: "17%" },
  { left: "10%", top: "62%", width: "13%" },
];

let ticket = 0;

const clear = (holder: HTMLElement) => {
  holder.replaceChildren();
  holder.hidden = true;
  delete holder.dataset.draws;
  delete holder.dataset.form;
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

/** Draw `body` large, and `companions` small beside it. `earth` leaves the Earth's own picture alone. `none` clears both. */
export const placeSky = (planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang) => {
  const mine = ++ticket;
  clear(planet);
  clear(moons);
  if (body === "none") return;
  void draw(mine, planet, moons, body, companions, form, lang);
};

const draw = async (mine: number, planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang) => {
  const { lineSvg, BODIES } = await import("@johnmorrisdotca/wakusei-planets");
  if (mine !== ticket) return;
  const known = (id: string) => id in BODIES;
  if (body !== "earth" && known(body)) {
    if (form === "painted") await paint(planet, body, lang);
    else putSvg(planet, lineSvg(body as keyof typeof BODIES, { size: 640, labels: false, lang }));
    if (mine !== ticket) return clear(planet);
    planet.dataset.draws = body;
    planet.dataset.form = form === "painted" ? "painted" : "line";
    planet.hidden = false;
  }
  const shown = companions.filter(known);
  shown.forEach((id, index) => {
    const spot = shown.length === 1 ? { left: "68%", top: "20%", width: "26%" } : (SPOTS[index] ?? SPOTS[0]);
    putSvg(moons, lineSvg(id as keyof typeof BODIES, { size: 280, labels: false, lang }), spot);
  });
  if (mine !== ticket) return clear(moons);
  if (shown.length === 0) return;
  moons.dataset.draws = shown.join(",");
  moons.dataset.form = "line";
  moons.hidden = false;
};

/** The painted look is the package's own element. It fetches its picture itself. */
const paint = async (holder: HTMLElement, body: string, lang: Lang) => {
  await loadBody(body);
  await import("@johnmorrisdotca/wakusei-planets/element");
  const node = document.createElement("wakusei-body");
  node.setAttribute("body", body);
  node.setAttribute("look", "painted");
  node.setAttribute("live", "off");
  node.setAttribute("labels", "off");
  node.setAttribute("lang", lang);
  holder.append(node);
};

const loadBody = (id: string) => {
  switch (id) {
    case "sun": return import("@johnmorrisdotca/wakusei-planets/sun");
    case "mercury": return import("@johnmorrisdotca/wakusei-planets/mercury");
    case "venus": return import("@johnmorrisdotca/wakusei-planets/venus");
    case "mars": return import("@johnmorrisdotca/wakusei-planets/mars");
    case "jupiter": return import("@johnmorrisdotca/wakusei-planets/jupiter");
    case "saturn": return import("@johnmorrisdotca/wakusei-planets/saturn");
    case "uranus": return import("@johnmorrisdotca/wakusei-planets/uranus");
    case "neptune": return import("@johnmorrisdotca/wakusei-planets/neptune");
    case "pluto": return import("@johnmorrisdotca/wakusei-planets/pluto");
    case "moon": return import("@johnmorrisdotca/wakusei-planets/moons-earth");
    case "phobos":
    case "deimos": return import("@johnmorrisdotca/wakusei-planets/moons-mars");
    case "io":
    case "europa":
    case "ganymede":
    case "callisto": return import("@johnmorrisdotca/wakusei-planets/moons-jupiter");
    case "mimas":
    case "enceladus":
    case "tethys":
    case "dione":
    case "rhea":
    case "titan":
    case "iapetus": return import("@johnmorrisdotca/wakusei-planets/moons-saturn");
    case "miranda":
    case "ariel":
    case "umbriel":
    case "titania":
    case "oberon": return import("@johnmorrisdotca/wakusei-planets/moons-uranus");
    case "proteus":
    case "triton":
    case "nereid": return import("@johnmorrisdotca/wakusei-planets/moons-neptune");
    case "charon":
    case "nix":
    case "hydra": return import("@johnmorrisdotca/wakusei-planets/moons-pluto");
    default: return Promise.resolve();
  }
};

/** Credits for the body on screen, in the package's own words. */
export const skyCredit = async (body: string, moon: string, look: SkyForm): Promise<string> => {
  const { embedCredit } = await import("@johnmorrisdotca/wakusei-planets");
  const lines: string[] = [];
  if (body !== "none" && body !== "earth") lines.push(embedCredit({ body: body as "mars", look }));
  const extra = moon || (body === "earth" ? "moon" : "");
  if (extra) lines.push(embedCredit({ body: extra as "moon", look: "line" }));
  return lines.join(" ");
};

/** Round thumbnails from the package's line drawings. */
export const paintThumbs = async (root: ParentNode, lang: Lang) => {
  const { lineSvg, BODIES } = await import("@johnmorrisdotca/wakusei-planets");
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-sky]")) {
    const id = button.dataset.sky ?? "";
    const facts = BODIES[id as keyof typeof BODIES];
    const dot = button.querySelector(".thumb-dot");
    if (!facts || !dot) continue;
    button.setAttribute("aria-label", facts.name[lang]);
    const host = document.createElement("div");
    host.innerHTML = lineSvg(id as keyof typeof BODIES, { size: 48, labels: false, lang });
    const svg = host.querySelector("svg");
    if (svg) dot.replaceChildren(svg);
  }
};
