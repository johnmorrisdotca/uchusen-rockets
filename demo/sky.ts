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

/** How wide the Earth's disc is, as a fraction of the background, so the Moon beside it can take its real share of that. */
const PLANET_WIDTH = 0.88;
const DISC_FILL = 0.94;

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
let stopClock: (() => void) | null = null;

/** Simulated seconds for each real second. A body then turns on its own period and its own way, Venus and Uranus included, fast enough to see. */
const SPIN_RATE = "4000";
/** A moon farther out than this, in planet radii, stays out of the picture. One distant moon would shrink the planet to a speck. The package cuts there too. */
const MOON_REACH = 80;

const clear = (holder: HTMLElement) => {
  holder.replaceChildren();
  holder.hidden = true;
  delete holder.dataset.draws;
  delete holder.dataset.form;
  delete holder.dataset.moons;
  delete holder.dataset.where;
  delete holder.dataset.chosen;
  delete holder.dataset.spin;
};

/** Draw `body` as a globe that turns, and its moons where they are. `earth` leaves the Earth's own picture alone and puts the Moon beside it. `none` clears both. */
export const placeSky = (planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang, chosen = "") => {
  stopClock?.();
  stopClock = null;
  const mine = ++ticket;
  clear(planet);
  clear(moons);
  if (body === "none") return;
  void draw(mine, planet, moons, body, companions, form, lang, chosen);
};

const lookOf = (form: SkyForm) => (form === "painted" ? "painted" : "line");

const draw = async (mine: number, planet: HTMLElement, moons: HTMLElement, body: string, companions: readonly string[], form: SkyForm, lang: Lang, chosen: string) => {
  const { BODIES, system } = await import("@johnmorrisdotca/wakusei-planets");
  await import("@johnmorrisdotca/wakusei-planets/element");
  if (mine !== ticket) return;
  const known = (id: string) => id in BODIES;
  if (body !== "earth" && known(body)) {
    await loadBody(body);
    if (mine !== ticket) return;
    const facts = BODIES[body as keyof typeof BODIES];
    const around = facts.parent === undefined && body !== "sun" ? system(body as "mars", Date.now()).moons.filter((item) => item.distance <= MOON_REACH) : [];
    if (body === "sun") planet.append(sunGlow());
    planet.append(globe(body, form, lang, around.length > 0));
    if (mine !== ticket) return clear(planet);
    planet.dataset.draws = body;
    planet.dataset.form = lookOf(form);
    planet.dataset.spin = "clock";
    if (around.length > 0) planet.dataset.moons = around.map((item) => item.id).join(",");
    if (chosen) planet.dataset.chosen = chosen;
    planet.hidden = false;
  }
  const moonId = body === "earth" ? companions.find(known) : undefined;
  if (!moonId) return;
  await loadBody(moonId);
  if (mine !== ticket) return;
  const node = globe(moonId, form, lang, false);
  const host = BODIES.earth;
  const moon = BODIES[moonId as keyof typeof BODIES];
  const placed = system("earth", Date.now()).moons.find((item) => item.id === moonId);
  if (host && moon && placed) putMoon(node, moons, placed, host, moon, Date.now());
  moons.append(node);
  if (mine !== ticket) return clear(moons);
  moons.dataset.draws = moonId;
  moons.dataset.form = lookOf(form);
  moons.dataset.spin = "clock";
  moons.hidden = false;
  stopClock = followMoon(node, moons, mine, moonId);
};

/** A soft round corona. It fades out before the box, so the glow has no square edge. */
const sunGlow = () => {
  const glow = document.createElement("div");
  glow.className = "sun-glow";
  glow.dataset.testid = "sun-glow";
  glow.dataset.glow = "round";
  return glow;
};

/** One globe. `withMoons` asks the package for the moons on their real orbits at `time`. */
const globe = (body: string, form: SkyForm, lang: Lang, withMoons: boolean) => {
  const node = document.createElement("wakusei-body");
  node.setAttribute("body", body);
  node.setAttribute("look", lookOf(form));
  node.setAttribute("time", "now");
  node.setAttribute("rate", SPIN_RATE);
  node.setAttribute("labels", "off");
  node.setAttribute("lang", lang);
  if (withMoons) {
    node.setAttribute("moons", "");
    // Ten radii keeps the inner moons and Saturn's rings at their real places, and leaves the globe big enough to see behind the craft. A moon farther out is simply outside this view.
    node.setAttribute("range", "10");
  } else if (body !== "sun") node.setAttribute("fit", "tight");
  return node;
};

type MoonAt = { id: string; x: number; y: number; distance: number };
type Disc = { radiusKm: number };

/** The Moon beside the Earth, on the bearing the package gives, at its real size against the Earth's disc. */
const putMoon = (node: HTMLElement, holder: HTMLElement, moon: MoonAt, host: Disc, body: Disc, when: number) => {
  const width = trueWidth(host, body, 1);
  const discR = (PLANET_WIDTH * DISC_FILL) / 2;
  const orbit = discR + width / 2 + 0.03;
  const angle = Math.atan2(-moon.y, moon.x);
  const span = width * 100;
  const left = Math.min(98 - span, Math.max(2, 50 + Math.cos(angle) * orbit * 100 - span / 2));
  const top = Math.min(98 - span, Math.max(2, 50 + Math.sin(angle) * orbit * 100 - span / 2));
  Object.assign(node.style, { position: "absolute", left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%`, width: `${(width * 100).toFixed(2)}%` });
  node.setAttribute("time", new Date(when).toISOString());
  holder.dataset.where = `${moon.x.toFixed(2)},${moon.y.toFixed(2)}`;
};

/** Move the Earth's moon as time runs, and stop when the picture is replaced. A reader who prefers less motion keeps the place it had. */
const followMoon = (node: HTMLElement, holder: HTMLElement, mine: number, moonId: string) => {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  const t0 = Date.now();
  const started = performance.now();
  const step = async () => {
    if (mine !== ticket) return;
    const { BODIES, system } = await import("@johnmorrisdotca/wakusei-planets");
    const elapsed = (performance.now() - started) / 1000;
    const when = motion.matches || document.hidden ? t0 : t0 + elapsed * Number(SPIN_RATE) * 1000;
    const host = BODIES.earth;
    const body = BODIES[moonId as keyof typeof BODIES];
    const placed = system("earth", when).moons.find((item) => item.id === moonId);
    if (!host || !body || !placed || mine !== ticket) return;
    putMoon(node, holder, placed, host, body, when);
  };
  const loop = () => {
    void step();
    if (motion.matches || document.hidden || mine !== ticket) return;
    timer = window.setTimeout(loop, 1000);
  };
  loop();
  return () => window.clearTimeout(timer);
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
