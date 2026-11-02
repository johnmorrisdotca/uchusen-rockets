// The Earth behind the rocket, loaded only when someone asks for it. The line globe redraws its SVG and needs no canvas; the realistic one is `<chikyu-earth-realistic>`, a second WebGL context, made only for the
// Painted look and given back when it is left. Both turn from one slow timer: a few draws a second, none out of sight, none on a hidden tab, none under reduced motion, and none once nobody has touched the page for a while.
import type { ChikyuEarthRealistic } from "@johnmorrisdotca/chikyu-earth/realistic/element";
import { CENTRE, placementIn, type Placement, START_TIME, stepSeconds, turnAt } from "./earth-model.ts";

export type EarthForm = "line" | "thick" | "realistic";

export interface EarthShow {
  stop(): void;
}

/** The gap between draws. At half a degree a second the land moves about 4 CSS pixels a second, so the soft realistic picture moves a pixel a draw and the line globe, which is a whole new layer to paint each time, two. */
const TICK_MS: Record<EarthForm, number> = { line: 500, thick: 500, realistic: 250 };
/** A page nobody has touched stops turning after this long, and a move, a key or a scroll starts it again. */
export const IDLE_STOP_MS = 5 * 60_000;
/** The realistic Earth moves the Sun on every this many draws and the view on the others: a change of each asks for its own draw, so both at once would draw the same picture twice. */
const SUN_EVERY = 4;
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
  document.addEventListener("visibilitychange", settle);
  motion.addEventListener("change", settle);
  for (const name of SIGNS_OF_LIFE) window.addEventListener(name, alive, { passive: true, capture: true });
  return () => {
    window.clearTimeout(timer);
    timer = 0;
    sight.disconnect();
    size.disconnect();
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
  void import("@johnmorrisdotca/chikyu-earth").then(({ globe }) => {
    if (stopped) return;
    stopTurn = turn(holder, TICK_MS[style], (seconds, { width, height, radius, panX, panY }) => {
      // the globe's SVG is square: as wide as the longer side of the box, centred on it and cut off by it
      const size = Math.max(width, height);
      holder.innerHTML = globe({ size, style, centre: CENTRE, graticule: true, view: { yaw: turnAt(seconds).yaw, tilt: 0, zoom: radius / (size / 2 - 1), panX, panY } });
      holder.dataset.draws = String(++draws);
    });
  });
  return {
    stop() {
      stopped = true;
      stopTurn?.();
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
    made.setAttribute("role", "presentation");
    made.addEventListener("chikyu-unavailable", unavailable);
    holder.append(made);
    earth = made;
    // A soft picture behind the rocket, whose widest pictures are coarser than a CSS pixel anyway, needs no more than a canvas pixel to a CSS pixel, however dense the screen: the element is half the box and shown at twice that, a quarter of the pixels on a Retina screen.
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    made.style.width = made.style.height = `${100 / ratio}%`;
    made.style.transform = `scale(${ratio})`;
    let placed: unknown = null;
    let ticks = 0;
    stopTurn = turn(holder, TICK_MS.realistic, (seconds, box) => {
      const { yaw, time } = turnAt(seconds);
      const fresh = box !== placed;
      placed = box;
      if (fresh || ticks % SUN_EVERY === 0) made.time = time;
      if (fresh || ticks % SUN_EVERY !== 0) made.setView({ yaw, tilt: 0, zoom: box.radius / ratio / discRadius(box.width / ratio, box.height / ratio, 1), panX: box.panX / ratio, panY: box.panY / ratio }, true);
      ticks++;
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
