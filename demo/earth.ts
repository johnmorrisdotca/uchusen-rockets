// The Earth behind the rocket, loaded only when someone asks for it. The line globe redraws its SVG and needs no canvas; the realistic one is `<chikyu-earth-realistic>`, a second WebGL context, made only for the
// Painted look and given back when it is left. Both turn from one slow timer: a few draws a second, none out of sight, none on a hidden tab, none under reduced motion, and none once nobody has touched the page for a while.
import type { ChikyuEarthRealistic } from "@johnmorrisdotca/chikyu-earth/realistic/element";
import { CENTRE, placementIn, type Placement, START_TIME, stepSeconds, turnAt } from "./earth-model.ts";

/** Low orbit uses the picture as it is. A higher orbit pulls the pan back to the middle and shrinks the disc until the whole Earth is in frame. The reader's zoom multiplies that. */
const orbitBlend = (holder: HTMLElement, box: Placement & { width: number; height: number }) => {
  const open = Math.min(1, Math.max(0, Number(holder.dataset.orbitOpen) || 0));
  const asked = Number(holder.dataset.viewZoom);
  const view = asked > 0 ? asked : 1;
  const full = Math.min(box.width, box.height) * 0.42;
  return {
    radius: (box.radius * (1 - open) + full * open) * view,
    panX: box.panX * (1 - open),
    panY: box.panY * (1 - open),
  };
};

export type EarthForm = "line" | "thick" | "realistic";

export interface EarthShow {
  stop(): void;
}

/** The gap between draws. At half a degree a second the land moves about 4 CSS pixels a second, so the soft realistic picture moves a pixel a draw and the line globe, which is a whole new layer to paint each time, two. */
const TICK_MS: Record<EarthForm, number> = { line: 500, thick: 500, realistic: 250 };
/** A page nobody has touched stops turning after this long, and a move, a key or a scroll starts it again. */
export const IDLE_STOP_MS = 5 * 60_000;
const SIGNS_OF_LIFE = ["pointermove", "pointerdown", "keydown", "wheel", "scroll"] as const;

/** How far it has turned, kept when the look or the choice changes, so the same land is in view afterwards. */
let seconds = 0;

/** Calls `draw` at once and then on one timer, only while it is worth anything to anyone. Everything it holds is given back by the function it returns. */
function turn(holder: HTMLElement, tickMs: number, draw: (seconds: number, box: Placement & { width: number; height: number }) => void): () => void {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  let last = 0;
  let active = performance.now();
  let onScreen = true;
  let stale = true;
  let box = { width: holder.clientWidth, height: holder.clientHeight, ...placementIn(holder.clientWidth, holder.clientHeight) };
  const seen = () => onScreen && !document.hidden;
  const turning = () => seen() && !motion.matches && performance.now() - active < IDLE_STOP_MS;
  const redraw = () => {
    stale = false;
    draw(seconds, box);
  };
  const tick = () => {
    timer = 0;
    if (!turning()) return settle();
    const now = performance.now();
    seconds += stepSeconds(now - last);
    last = now;
    redraw();
    timer = window.setTimeout(tick, tickMs);
  };
  const settle = () => {
    if (seen() && stale) redraw();
    const on = turning();
    holder.dataset.turning = String(on);
    if (on && !timer) {
      last = performance.now();
      timer = window.setTimeout(tick, tickMs);
    } else if (!on && timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
  };
  const alive = () => {
    active = performance.now();
    if (!timer) settle();
  };
  const onOrbit = () => {
    stale = true;
    settle();
  };
  const sight = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    settle();
  });
  const size = new ResizeObserver(() => {
    const width = holder.clientWidth;
    const height = holder.clientHeight;
    if (width === box.width && height === box.height) return;
    box = { width, height, ...placementIn(width, height) };
    stale = true;
    settle();
  });
  sight.observe(holder);
  size.observe(holder);
  holder.addEventListener("orbit", onOrbit);
  document.addEventListener("visibilitychange", settle);
  motion.addEventListener("change", settle);
  for (const name of SIGNS_OF_LIFE) window.addEventListener(name, alive, { passive: true, capture: true });
  return () => {
    window.clearTimeout(timer);
    timer = 0;
    sight.disconnect();
    size.disconnect();
    holder.removeEventListener("orbit", onOrbit);
    document.removeEventListener("visibilitychange", settle);
    motion.removeEventListener("change", settle);
    for (const name of SIGNS_OF_LIFE) window.removeEventListener(name, alive, { capture: true });
    delete holder.dataset.turning;
  };
}

function showLine(holder: HTMLElement, style: "line" | "thick"): EarthShow {
  let stopTurn: (() => void) | null = null;
  let stopped = false;
  let draws = 0;
  // the globe is redrawn a few times a second, in a shadow root of its own: the family header's help switch watches the page's own markup for changes, and a redraw is none of its business
  const mount = document.createElement("div");
  holder.append(mount);
  const root = mount.attachShadow({ mode: "open" });
  const sheet = document.createElement("style");
  sheet.textContent = "svg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0.55; }";
  const picture = document.createElement("div");
  root.replaceChildren(sheet, picture);
  void import("@johnmorrisdotca/chikyu-earth").then(({ globe }) => {
    if (stopped) return;
    stopTurn = turn(holder, TICK_MS[style], (seconds, box) => {
      const size = Math.max(box.width, box.height);
      const framed = orbitBlend(holder, box);
      picture.innerHTML = globe({ size, style, centre: CENTRE, graticule: true, view: { yaw: turnAt(seconds).yaw, tilt: 0, zoom: framed.radius / (size / 2 - 1), panX: framed.panX, panY: framed.panY } });
      holder.dataset.draws = String(++draws);
    });
  });
  return {
    stop() {
      stopped = true;
      stopTurn?.();
      mount.remove();
      holder.replaceChildren();
      delete holder.dataset.draws;
    },
  };
}

function showRealistic(holder: HTMLElement, unavailable: () => void): EarthShow {
  let stopTurn: (() => void) | null = null;
  let stopped = false;
  let earth: ChikyuEarthRealistic | null = null;
  void Promise.all([import("@johnmorrisdotca/chikyu-earth/realistic"), import("@johnmorrisdotca/chikyu-earth/realistic/element")]).then(([{ discRadius }]) => {
    if (stopped) return;
    const made = document.createElement("chikyu-earth-realistic") as ChikyuEarthRealistic;
    made.setAttribute("center", `${CENTRE.lon},${CENTRE.lat}`);
    made.setAttribute("time", new Date(START_TIME).toISOString());
    made.setAttribute("texture-base", new URL("textures/", document.baseURI).href);
    made.setAttribute("max-texture", "2048");
    // a soft picture behind the rocket needs no more than a canvas pixel to a CSS pixel, however dense the screen
    made.setAttribute("max-ratio", "1");
    made.setAttribute("role", "presentation");
    made.addEventListener("chikyu-unavailable", unavailable);
    holder.append(made);
    earth = made;
    stopTurn = turn(holder, TICK_MS.realistic, (seconds, box) => {
      const framed = orbitBlend(holder, box);
      const { yaw, time } = turnAt(seconds);
      made.time = time;
      made.setView({ yaw, tilt: 0, zoom: framed.radius / discRadius(box.width, box.height, 1), panX: framed.panX, panY: framed.panY }, true);
    });
  });
  return {
    stop() {
      stopped = true;
      stopTurn?.();
      earth?.remove();
    },
  };
}

export function showEarth(holder: HTMLElement, form: EarthForm, unavailable: () => void): EarthShow {
  holder.dataset.form = form;
  const show = form === "realistic" ? showRealistic(holder, unavailable) : showLine(holder, form);
  return {
    stop() {
      show.stop();
      delete holder.dataset.form;
    },
  };
}
