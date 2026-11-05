// Backgrounds other than the Earth, drawn by wakusei-planets and only after one is chosen. Nothing here copies a picture or a size.

type Lang = "en" | "ja";
type SkyForm = "line" | "painted";

export type SkyList = {
  order: readonly string[];
  moonsOf: (id: string) => readonly string[];
  name: (id: string, lang: Lang) => string;
  known: (id: string) => boolean;
  /** A chosen moon drawn bigger than its real size next to the planet, so the credit can say so. */
  enlarged: (host: string, moon: string) => boolean;
};

let listPromise: Promise<SkyList> | null = null;

/** The Sun, the planets out to Pluto, and the moons of those, as the package lists them. */
export const skyList = (): Promise<SkyList> => {
  listPromise ??= import("@johnmorrisdotca/wakusei-planets").then(({ PLANET_IDS, MOONS_OF, BODIES, ringReach }) => {
    const moons = MOONS_OF as Record<string, readonly string[]>;
    const offered = new Set<string>(["none", "sun", ...PLANET_IDS]);
    for (const id of PLANET_IDS) for (const moon of moons[id] ?? []) offered.add(moon);
    const widthOf = (host: string, moon: string) => {
      const planet = BODIES[host as keyof typeof BODIES];
      const body = BODIES[moon as keyof typeof BODIES];
      if (!planet || !body) return 1;
      return trueWidth(planet, body, ringReach(planet));
    };
    return {
      order: ["none", "sun", ...PLANET_IDS],
      moonsOf: (id: string) => moons[id] ?? [],
      name: (id: string, lang: Lang) => BODIES[id as keyof typeof BODIES]?.name[lang] ?? id,
      known: (id: string) => offered.has(id),
      enlarged: (host: string, moon: string) => moon !== "" && widthOf(host, moon) < ENLARGE_UNDER,
    };
  });
  return listPromise;
};

/** How wide the planet's disc is in the line drawing, as a fraction of the background, and a moon beside it at the package's radii. */
const PLANET_WIDTH = 0.88;
const DISC_FILL = 0.94;
const ENLARGE_UNDER = 0.08;
const ENLARGED_WIDTH = 0.18;

const trueWidth = (planet: { radiusKm: number }, moon: { radiusKm: number }, rings: number) => PLANET_WIDTH * (DISC_FILL / Math.max(1, rings)) * (moon.radiusKm / planet.radiusKm);

/** Moons that read well behind a planet when no single moon is chosen. Any other moon waits until it is picked. */
export const companionsFor = (body: string, moon: string, moonsOf: (id: string) => readonly string[]): string[] => {
  const list = moonsOf(body);
  if (moon && list.includes(moon)) return [moon];
  if (body === "earth" && list.includes("moon")) return ["moon"];
  if (body === "jupiter") return ["io", "europa", "ganymede", "callisto"].filter((id) => list.includes(id));
  if (body === "saturn" && list.includes("titan")) return ["titan"];
  return [];
};

let ticket = 0;
let clock = 0;

const clear = (holder: HTMLElement) => {
  holder.replaceChildren();
  holder.hidden = true;
  delete holder.dataset.draws;
  delete holder.dataset.form;
};

const putSvg = (holder: HTMLElement, markup: string): SVGElement | undefined => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  const svg = host.querySelector("svg");
  if (!svg) return undefined;
  holder.append(svg);
  return svg;
};

type Offset = { id: string; x: number; y: number };

/** Where each moon is from its planet, in planet radii. The Earth's picture is drawn from the Moon, so the Moon's place is its ecliptic offset, not that view. */
const offsets = async (host: string, ids: readonly string[], ms: number): Promise<Offset[]> => {
  const { BODIES, moonGeocentric, system } = await import("@johnmorrisdotca/wakusei-planets");
  if (host === "earth") {
    const [x, y] = moonGeocentric(ms);
    const radius = BODIES.earth.radiusKm;
    return ids.filter((id) => id === "moon").map((id) => ({ id, x: x / radius, y: y / radius }));
  }
  const placed = new Map(system(host as "mars", ms).moons.map((moon) => [moon.id, moon]));
  return ids.flatMap((id) => {
    const moon = placed.get(id as "moon");
    return moon ? [{ id, x: moon.x, y: moon.y }] : [];
  });
};

/** True direction. A distance that would leave the picture is shortened, the same way for every moon of that planet, so the nearer ones stay nearer. */
const lay = (found: readonly Offset[], rings: number) => {
  const discR = (PLANET_WIDTH * (DISC_FILL / Math.max(1, rings))) / 2;
  const reach = found.map((moon) => Math.hypot(moon.x, moon.y) * discR);
  const farthest = Math.max(0.001, ...reach);
  const room = 0.46;
  const scale = farthest > room ? room / farthest : 1;
  return {
    shortened: scale < 1,
    spots: found.map((moon, index) => {
      const orbit = (reach[index] ?? 0) * scale;
      const angle = Math.atan2(-moon.y, moon.x);
      return { id: moon.id, left: 50 + Math.cos(angle) * orbit * 100, top: 50 + Math.sin(angle) * orbit * 100 };
    }),
  };
};

const shift = async (moons: HTMLElement, host: string, ids: readonly string[], ms: number, rings: number) => {
  const laid = lay(await offsets(host, ids, ms), rings);
  moons.dataset.shortened = laid.shortened ? "1" : "0";
  for (const spot of laid.spots) {
    const node = [...moons.children].find((child) => child instanceof Element && child.getAttribute("data-moon") === spot.id);
    if (!(node instanceof Element)) continue;
    const styled = node as HTMLElement;
    const width = parseFloat(styled.style.width) || 0;
    styled.style.left = `${(spot.left - width / 2).toFixed(2)}%`;
    styled.style.top = `${(spot.top - width / 2).toFixed(2)}%`;
  }
};

/** Whether the moons are drawn closer in than they are, so the credit can say so. */
export const distancesShortened = async (host: string, ids: readonly string[], ms: number): Promise<boolean> => {
  if (ids.length === 0 || host === "none" || host === "sun") return false;
  const { BODIES, ringReach } = await import("@johnmorrisdotca/wakusei-planets");
  const hostFacts = BODIES[host as keyof typeof BODIES];
  if (!hostFacts) return false;
  return lay(await offsets(host, ids, ms), ringReach(hostFacts)).shortened;
};

/** Draw `body` large, and `companions` small beside it at the package's position for `when` (`null` is now, and it keeps moving). `earth` leaves the Earth's own picture alone. `none` clears both. A chosen moon that would be a speck is drawn larger. */
export const placeSky = (planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang, chosen = "", when: number | null = null) => {
  const mine = ++ticket;
  window.clearInterval(clock);
  clock = 0;
  clear(planet);
  clear(moons);
  if (body === "none") return;
  void draw(mine, planet, moons, body, companions, form, lang, chosen, when);
};

const draw = async (mine: number, planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang, chosen: string, when: number | null) => {
  const { lineSvg, BODIES, ringReach } = await import("@johnmorrisdotca/wakusei-planets");
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
  const hostId = body === "earth" ? "earth" : body;
  const host = BODIES[hostId as keyof typeof BODIES];
  const shown = companions.filter(known);
  const widths = new Map<string, number>();
  for (const id of shown) {
    const moon = BODIES[id as keyof typeof BODIES];
    if (!host || !moon) continue;
    const ratio = trueWidth(host, moon, ringReach(host));
    widths.set(id, id === chosen && ratio < ENLARGE_UNDER ? ENLARGED_WIDTH : ratio);
  }
  for (const id of shown) {
    const width = widths.get(id);
    if (width === undefined) continue;
    const node = form === "painted"
      ? await paint(moons, id, lang, body === "earth" ? undefined : "off")
      : putSvg(moons, lineSvg(id as keyof typeof BODIES, { size: 280, labels: false, lang }));
    if (node) {
      node.dataset.moon = id;
      node.style.position = "absolute";
      node.style.width = `${(width * 100).toFixed(2)}%`;
    }
    if (mine !== ticket) return clear(moons);
  }
  if (shown.length === 0 || !host) return;
  const rings = ringReach(host);
  await shift(moons, hostId, shown, when ?? Date.now(), rings);
  if (mine !== ticket) return clear(moons);
  moons.dataset.draws = shown.join(",");
  moons.dataset.form = form === "painted" ? "painted" : "line";
  moons.hidden = false;
  if (when === null) {
    clock = window.setInterval(() => {
      if (mine !== ticket || document.hidden) return;
      void shift(moons, hostId, shown, Date.now(), rings);
    }, 10_000);
  }
};

/** The painted look is the package's own element. It fetches its picture itself. A moon beside another painted body does not take the one shared picture (`live` off), so the planet keeps it. */
const paint = async (holder: HTMLElement, body: string, lang: Lang, live?: "off") => {
  await loadBody(body);
  await import("@johnmorrisdotca/wakusei-planets/element");
  const node = document.createElement("wakusei-body");
  node.setAttribute("body", body);
  node.setAttribute("look", "painted");
  node.setAttribute("fit", "tight");
  node.setAttribute("labels", "off");
  node.setAttribute("lang", lang);
  if (live !== undefined) node.setAttribute("live", live);
  holder.append(node);
  return node;
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
  if (extra) lines.push(embedCredit({ body: extra as "moon", look }));
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
    const name = button.querySelector(".thumb-name");
    if (name) name.textContent = facts.name[lang];
    const host = document.createElement("div");
    host.innerHTML = lineSvg(id as keyof typeof BODIES, { size: 48, labels: false, lang });
    const svg = host.querySelector("svg");
    if (svg) dot.replaceChildren(svg);
  }
};
