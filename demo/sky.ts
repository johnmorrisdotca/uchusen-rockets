// Backgrounds other than the Earth, drawn by wakusei-planets and only after one is chosen. Nothing here copies a picture or a size.
// The framing is the Earth's orbit view (demo/earth-model.ts): the same placement, through this element's own camera.
import { placementIn } from "./earth-model.ts";

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

/** The moons to draw. None, until one is chosen; `all` is every moon of that planet. A planet on its own is the globe alone. */
export const companionsFor = (body: string, moon: string, moonsOf: (id: string) => readonly string[]): string[] => {
  if (!moon || body === "none" || body === "sun") return [];
  const list = moonsOf(body);
  if (moon === "all") return [...list];
  return list.includes(moon) ? [moon] : [];
};

let ticket = 0;
let stopClock: (() => void) | null = null;
let stopWatch: (() => void) | null = null;

/** Simulated seconds for each real second. A body then turns on its own period and its own way, Venus and Uranus included, fast enough to see. */
const SPIN_RATE = "4000";
/** The picture's half-width, in body radii, when a body is drawn on its own. The package uses the same room. */
const ROOM = 2.2;
/** Camera zoom that makes the disc's radius 0.86 of the longer side, which is what placementIn asks for, while the extent is ROOM. */
const ORBIT_ZOOM = 1.72 * ROOM;
/** How long the view takes to open from the orbit picture out to the chosen moons. */
const RANGE_MS = 1000;

type Framed = HTMLElement & {
  setView(view: { yaw?: number; tilt?: number; zoom?: number; panX?: number; panY?: number }): void;
};

/** Put the body where the Earth sits: horizon across the middle, the surface filling everything under it, a tenth of the width to the right. Saturn is opened a little and tipped so its rings cross the sky as a band; the horizon stays on the middle. `viewZoom` below 1 opens the same picture further. */
const paintFrame = (node: Framed, holder: HTMLElement, range: number, viewZoom: number) => {
  const width = holder.clientWidth;
  const height = holder.clientHeight;
  if (width < 2 || height < 2 || typeof node.setView !== "function") return;
  const side = Math.max(width, height);
  node.style.width = `${side}px`;
  node.style.height = `${side}px`;
  node.style.aspectRatio = "auto";
  const place = placementIn(width, height);
  const saturn = node.getAttribute("body") === "saturn";
  const moons = node.hasAttribute("moons");
  const widen = saturn ? 0.48 : 1;
  const camera = (moons ? ORBIT_ZOOM : ORBIT_ZOOM * viewZoom) * widen;
  const shrink = (moons ? ROOM / Math.max(ROOM, range) : viewZoom) * widen;
  const face = node.dataset.face;
  node.setView({
    yaw: 0,
    tilt: saturn ? -36 : face ? -Number(face) : 0,
    zoom: camera,
    panX: (-2 * place.panX * shrink) / side,
    panY: (2 * place.panY * shrink) / side,
  });
};

/** The reader's zoom. Below 1 opens the picture further. A moon picture opens its range; a body alone opens the camera, and neither one adds moons. */
export const frameSky = (node: HTMLElement, holder: HTMLElement, viewZoom = 1) => {
  const pull = Number(node.dataset.pull) || 1;
  const zoom = Math.max(0.25, viewZoom);
  node.dataset.viewZoom = String(zoom);
  const base = Number(node.dataset.baseRange);
  const range = node.hasAttribute("moons") ? (base > 0 ? base / zoom : Number(node.getAttribute("range")) || ROOM) : ROOM;
  if (node.hasAttribute("moons") && base > 0) node.setAttribute("range", range.toFixed(2));
  paintFrame(node as Framed, holder, range, zoom * pull);
};

const watchFrame = (node: HTMLElement, holder: HTMLElement) => {
  const apply = () => frameSky(node, holder, Number(node.dataset.viewZoom) || 1);
  const size = new ResizeObserver(apply);
  size.observe(holder);
  apply();
  return () => size.disconnect();
};

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
  stopWatch?.();
  stopWatch = null;
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
    const wanted = companions.filter((id) => known(id));
    if (body === "sun") planet.append(sunGlow());
    const node = globe(body, form, lang);
    if (body === "venus") {
      const light = system("venus", Date.now()).planet.light;
      node.dataset.face = (Math.atan2(light[1], light[2]) * (180 / Math.PI)).toFixed(2);
    }
    planet.append(node);
    planet.hidden = false;
    stopWatch = watchFrame(node, planet);
    if (wanted.length > 0) placeMoons(mine, node, planet, body, wanted, form, lang);
    if (mine !== ticket) {
      stopWatch?.();
      stopWatch = null;
      return clear(planet);
    }
    planet.dataset.draws = body;
    planet.dataset.form = lookOf(form);
    planet.dataset.spin = "clock";
    if (wanted.length > 0) planet.dataset.moons = wanted.join(",");
    if (chosen) planet.dataset.chosen = chosen;
  }
  const moonId = body === "earth" ? companions.find(known) : undefined;
  if (!moonId) return;
  await loadBody(moonId);
  if (mine !== ticket) return;
  const node = globe(moonId, form, lang);
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

/** One globe, as the Earth sees it now. Venus's painted map is a radar picture, so the Painted choice uses the package's cloud surface instead. */
const globe = (body: string, form: SkyForm, lang: Lang) => {
  const node = document.createElement("wakusei-body");
  node.setAttribute("body", body);
  node.setAttribute("look", body === "venus" && form === "painted" ? "realistic" : lookOf(form));
  node.setAttribute("time", "now");
  node.setAttribute("rate", SPIN_RATE);
  node.setAttribute("live", "always");
  node.setAttribute("labels", "off");
  node.setAttribute("lang", lang);
  return node;
};

type PlacedMoon = { id: string; x: number; y: number; z: number; distance: number };

/** Each chosen moon is its own body, on its bearing, large enough to read. The planet eases back a little and stays in the orbit view. */
const placeMoons = (mine: number, planetNode: HTMLElement, holder: HTMLElement, body: string, ids: readonly string[], form: SkyForm, lang: Lang) => {
  void import("@johnmorrisdotca/wakusei-planets").then(async ({ BODIES, system }) => {
    if (mine !== ticket) return;
    const placed = system(body as "mars", Date.now()).moons.filter((item) => ids.includes(item.id));
    if (placed.length === 0) return;
    const facts = BODIES as Record<string, { radiusKm?: number }>;
    const biggest = Math.max(...placed.map((item) => facts[item.id]?.radiusKm ?? 1), 1);
    const ordered = [...placed].sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z));
    for (const [index, moon] of ordered.entries()) {
      await loadBody(moon.id);
      if (mine !== ticket || !planetNode.isConnected) return;
      holder.append(moonBody(moon, form, lang, index, ordered.length, (facts[moon.id]?.radiusKm ?? biggest) / biggest));
    }
    const far = placed.reduce((best, item) => (item.distance > best.distance ? item : best), placed[0]) as PlacedMoon;
    holder.dataset.where = `${far.x.toFixed(2)},${far.y.toFixed(2)}`;
    const start = performance.now();
    const step = (now: number) => {
      if (mine !== ticket || !planetNode.isConnected) return;
      const t = Math.min(1, (now - start) / RANGE_MS);
      const eased = 1 - (1 - t) ** 3;
      planetNode.dataset.pull = (1 - 0.12 * eased).toFixed(3);
      frameSky(planetNode, holder, Number(planetNode.dataset.viewZoom) || 1);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

/** A moon in the sky above the horizon: its true bearing across the frame, at least 16 px, lit by the package for this instant. */
const moonBody = (moon: PlacedMoon, form: SkyForm, lang: Lang, index: number, count: number, scale: number) => {
  const node = globe(moon.id, form, lang);
  const px = Math.max(16, Math.round(56 * scale));
  const left = count === 1 ? 22 : 12 + (76 * index) / (count - 1);
  const top = 14 + (index % 2) * 8;
  node.dataset.moon = moon.id;
  node.dataset.place = `${moon.x.toFixed(2)},${moon.y.toFixed(2)},${moon.z.toFixed(2)}`;
  node.style.position = "absolute";
  node.style.left = `${left}%`;
  node.style.top = `${top}%`;
  node.style.width = `${px}px`;
  node.style.height = `${px}px`;
  node.style.transform = "translate(-50%, -50%)";
  node.style.aspectRatio = "auto";
  node.style.zIndex = "2";
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
  const planetLine = body !== "none" && body !== "earth" ? embedCredit({ body: body as "mars", look }) : "";
  const extra = moon || (body === "earth" ? "moon" : "");
  const moonLine = extra ? embedCredit({ body: extra as "moon", look }) : "";
  if (planetLine) lines.push(planetLine);
  if (moonLine && moonLine !== planetLine) lines.push(moonLine);
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
