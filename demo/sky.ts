// Backgrounds other than the Earth, drawn by wakusei-planets and only after one is chosen. Nothing here copies a picture or a size.
// The framing is the Earth's orbit view (demo/earth-model.ts): the same placement, through this element's own camera.
import { placementIn } from "./earth-model.ts";
import { orbitStepsFor, roundKm, type OrbitStep } from "./orbit.ts";

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

/** How fast a background turns. Slow is one turn in about ten minutes, from the body's own day. Faster is ten of those. Real time is the day itself. */
export type TurnPace = "still" | "slow" | "faster" | "real";
const TURN_PACES: readonly TurnPace[] = ["still", "slow", "faster", "real"];
const TURN_STEP: Record<TurnPace, number> = { still: 0, slow: 1, faster: 10, real: 100 };
let turnPace: TurnPace = "slow";

/** The pace named in the address, or the calm one. */
export const paceNamed = (value: string | null): TurnPace => (TURN_PACES as readonly string[]).includes(value ?? "") ? (value as TurnPace) : "slow";

/** The speed-button step for a pace. */
export const paceStep = (pace: TurnPace): number => TURN_STEP[pace];

/** The pace a speed button reports. */
export const paceFromStep = (step: number): TurnPace => (Object.entries(TURN_STEP).find(([, value]) => value === step)?.[0] as TurnPace | undefined) ?? "slow";

/** Remember the pace. A picture already on the page picks it up from `applyTurn`. */
export const setTurnPace = (pace: TurnPace): void => {
  turnPace = pace;
};

/** The `rate` a body should carry: signed, so a backward day stays backward. Reduced motion is still. */
export const spinRate = (hours: number): string => {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return "0";
  if (turnPace === "still") return "0";
  if (turnPace === "real") return "1";
  const calm = Math.abs(hours) * 6;
  const signed = Math.sign(hours) || 1;
  return String(signed * (turnPace === "faster" ? calm * 10 : calm));
};

/** Give every globe on the page the rate its own day and the current pace ask for. */
export const applyTurn = (root: ParentNode): void => {
  for (const node of root.querySelectorAll<HTMLElement>("wakusei-body")) node.setAttribute("rate", spinRate(Number(node.dataset.dayHours) || 24));
};
/** The picture's half-width, in body radii, when a body is drawn on its own. The package uses the same room. */
const ROOM = 2.2;
/** Camera zoom that makes the disc's radius 0.86 of the longer side, which is what placementIn asks for, while the extent is ROOM. */
const ORBIT_ZOOM = 1.72 * ROOM;
/** How long the view takes to open from the orbit picture out to the chosen moons. */
const RANGE_MS = 1000;

type Framed = HTMLElement & {
  setView(view: { yaw?: number; tilt?: number; zoom?: number; panX?: number; panY?: number }): void;
};

/** How long a change of altitude takes. The camera eases. It never jumps. */
const MOVE_MS = 800;
let shown = 0;
let frame = 0;

/** The altitude opening now, 0 at low orbit and 1 at the farthest step. */
export const orbitShown = (): number => shown;

/**
 * Ease the camera to `open`. `animate` false sets it at once, which a page load uses. The holder hears an `orbit` event on each step, so the Earth's own picture can follow.
 */
export const aimOrbit = (open: number, holder: HTMLElement, animate: boolean): void => {
  const goal = Math.min(1, Math.max(0, open));
  holder.dataset.orbitTarget = goal.toFixed(4);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  const paint = (moving: boolean) => {
    holder.dataset.orbitOpen = shown.toFixed(4);
    holder.dataset.orbitMoving = moving ? "1" : "0";
    const body = holder.querySelector("wakusei-body:not([data-moon])");
    if (goal > 0.02 && body instanceof HTMLElement) body.dataset.pull = "1";
    if (body instanceof HTMLElement) frameSky(body, holder, Number(holder.dataset.viewZoom) || Number(body.dataset.viewZoom) || 1);
    holder.dispatchEvent(new Event("orbit"));
  };
  if (!animate || Math.abs(shown - goal) < 0.0005) {
    shown = goal;
    paint(false);
    return;
  }
  const from = shown;
  const start = performance.now();
  holder.dataset.orbitMoving = "1";
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / MOVE_MS);
    const eased = 1 - (1 - t) ** 3;
    shown = from + (goal - from) * eased;
    paint(t < 1);
    frame = t < 1 ? requestAnimationFrame(step) : 0;
  };
  frame = requestAnimationFrame(step);
};

/** Put the body where the Earth sits: horizon across the middle, the surface filling everything under it, a tenth of the width to the right. Saturn is opened a little and tipped so its rings cross the sky as a band; the horizon stays on the middle. A craft camera that pulls back does not shrink the body: its edge stays outside the frame. */
const paintFrame = (node: Framed, holder: HTMLElement, viewZoom: number) => {
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
  const open = Math.min(1, Math.max(0, Number(node.dataset.open) || 0));
  // A pulled-back camera and a high orbit used to shrink the disc until its edge sat inside the frame.
  const fillZoom = Math.max(viewZoom, 1);
  const camera = ORBIT_ZOOM * (moons ? 1 : fillZoom);
  node.dataset.frameZoom = camera.toFixed(4);
  const shrink = moons ? 1 : fillZoom;
  const face = node.dataset.face;
  node.setView({
    yaw: 0,
    tilt: saturn ? -36 * (1 - open) : face ? -Number(face) : 0,
    zoom: camera,
    panX: (-2 * place.panX * shrink) / side,
    panY: (2 * place.panY * shrink) / side,
  });
};

/** The reader's zoom. Below 1 leaves the body filling the frame. Above 1 comes closer. A moon picture keeps its own size. */
export const frameSky = (node: HTMLElement, holder: HTMLElement, viewZoom = 1) => {
  node.dataset.open = shown.toFixed(4);
  const pull = Number(node.dataset.pull) || 1;
  const zoom = Math.max(0.25, viewZoom);
  node.dataset.viewZoom = String(zoom);
  const base = Number(node.dataset.baseRange);
  const range = node.hasAttribute("moons") ? (base > 0 ? base / zoom : Number(node.getAttribute("range")) || ROOM) : ROOM;
  if (node.hasAttribute("moons") && base > 0) node.setAttribute("range", range.toFixed(2));
  paintFrame(node as Framed, holder, zoom * pull);
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
    const hours = BODIES[body as keyof typeof BODIES]?.rotationHours;
    node.dataset.dayHours = String(typeof hours === "number" && hours !== 0 ? hours : 24);
    node.setAttribute("rate", spinRate(Number(node.dataset.dayHours)));
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
  // The Earth picture keeps its lit face toward us. A dated Moon shows today's phase, which can be the dark side of the same Sun. The portrait lights it from the same side as that Earth.
  node.removeAttribute("time");
  node.removeAttribute("rate");
  node.setAttribute("phase", "38");
  const host = BODIES.earth;
  const moon = BODIES[moonId as keyof typeof BODIES];
  const placed = system("earth", Date.now()).moons.find((item) => item.id === moonId);
  if (host && moon && placed) putMoon(node, moons, placed, host, moon);
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
  node.dataset.dayHours = "24";
  node.setAttribute("rate", spinRate(24));
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
    const far = placed.reduce((best, item) => (item.distance > best.distance ? item : best), placed[0]) as PlacedMoon;
    for (const [index, moon] of ordered.entries()) {
      await loadBody(moon.id);
      if (mine !== ticket || !planetNode.isConnected) return;
      holder.append(moonBody(moon, form, lang, index, ordered.length, (facts[moon.id]?.radiusKm ?? biggest) / biggest));
    }
    holder.dataset.where = `${far.x.toFixed(2)},${far.y.toFixed(2)}`;
    holder.dataset.reach = far.distance.toFixed(4);
    const start = performance.now();
    const step = (now: number) => {
      if (mine !== ticket || !planetNode.isConnected) return;
      if (Number(planetNode.dataset.open) > 0.02) {
        planetNode.dataset.pull = "1";
        frameSky(planetNode, holder, Number(planetNode.dataset.viewZoom) || 1);
        return;
      }
      const t = Math.min(1, (now - start) / RANGE_MS);
      const eased = 1 - (1 - t) ** 3;
      planetNode.dataset.pull = (1 - 0.12 * eased).toFixed(3);
      frameSky(planetNode, holder, Number(planetNode.dataset.viewZoom) || 1);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

/** A moon in the open sky beside the craft, large enough to read. A still, so the planet keeps the one picture. */
const moonBody = (moon: PlacedMoon, form: SkyForm, lang: Lang, index: number, count: number, scale: number) => {
  const node = globe(moon.id, form, lang);
  node.setAttribute("live", "off");
  const px = Math.max(36, Math.round(64 * scale));
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
const putMoon = (node: HTMLElement, holder: HTMLElement, moon: MoonAt, host: Disc, body: Disc) => {
  const width = trueWidth(host, body, 1);
  const discR = (PLANET_WIDTH * DISC_FILL) / 2;
  const orbit = discR + width / 2 + 0.03;
  const angle = Math.atan2(-moon.y, moon.x);
  const span = width * 100;
  const left = Math.min(98 - span, Math.max(2, 50 + Math.cos(angle) * orbit * 100 - span / 2));
  const top = Math.min(98 - span, Math.max(2, 50 + Math.sin(angle) * orbit * 100 - span / 2));
  Object.assign(node.style, { position: "absolute", left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%`, width: `${(width * 100).toFixed(2)}%` });
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
    const host = BODIES.earth;
    const body = BODIES[moonId as keyof typeof BODIES];
    const when = motion.matches || document.hidden ? t0 : t0 + elapsed * Number(spinRate(body?.rotationHours ?? 24)) * 1000;
    const placed = system("earth", when).moons.find((item) => item.id === moonId);
    if (!host || !body || !placed || mine !== ticket) return;
    putMoon(node, holder, placed, host, body);
  };
  const loop = () => {
    void step();
    if (motion.matches || document.hidden || mine !== ticket) return;
    timer = window.setTimeout(loop, 1000);
  };
  loop();
  return () => window.clearTimeout(timer);
};

export const loadBody = (id: string) => {
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

/** The distances a body offers, and how far each moon sits, in kilometres from the body's centre. */
export const orbitCatalogue = async (body: string): Promise<{ steps: OrbitStep[]; moons: { id: string; km: number }[] }> => {
  if (body === "none") return { steps: [], moons: [] };
  if (body === "earth") return { steps: orbitStepsFor(6371, 384400, true), moons: [{ id: "moon", km: 384400 }] };
  const { BODIES, MOONS_OF, system } = await import("@johnmorrisdotca/wakusei-planets");
  const facts = BODIES[body as keyof typeof BODIES];
  if (!facts) return { steps: [], moons: [] };
  const listed = (MOONS_OF as Record<string, readonly string[]>)[body] ?? [];
  const moons = listed.length === 0 ? [] : system(body as "mars", Date.now()).moons.map((moon) => ({ id: moon.id, km: roundKm(moon.distance * facts.radiusKm) }));
  const far = moons.reduce((max, moon) => Math.max(max, moon.km), 0);
  return { steps: orbitStepsFor(facts.radiusKm, far > 0 ? far : null), moons };
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
