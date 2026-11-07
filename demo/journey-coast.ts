// The no-braking line: the same route drawing, on a log scale out to Andromeda, if the ship had kept its acceleration.
import { ANDROMEDA_LY, C, G0, GALACTIC_CENTRE_LY, LY_M, PROXIMA_LY, coastPlace, duration, gWords, keptGoing, type State, type Trip } from "../src/journey/index.ts";

const NS = "http://www.w3.org/2000/svg";
const X0 = 78;
const X1 = 940;
const LINE = 96;

type Say = (key: string, values?: Record<string, string | number>) => string;

export type CoastArt = {
  mark: SVGElement;
  ship: SVGElement;
  earth: SVGElement;
};

type Mark = { metres: number; key: string; name?: boolean; test?: string; under?: string };

const MARKS: Mark[] = [
  { metres: C, key: "jMarkLightSecond" },
  { metres: C * 3600, key: "jMarkLightHour" },
  { metres: LY_M, key: "jMarkLy" },
  { metres: 1_000 * LY_M, key: "jMarkThousandLy" },
  { metres: 1_000_000 * LY_M, key: "jMarkMillionLy" },
  { metres: PROXIMA_LY * LY_M, key: "jProxima", name: true, test: "coast-proxima", under: "jStar" },
  { metres: GALACTIC_CENTRE_LY * LY_M, key: "jGalacticCentre", name: true, test: "coast-centre" },
  { metres: ANDROMEDA_LY * LY_M, key: "jAndromeda", name: true, test: "coast-andromeda" },
];

const el = (tag: string, attrs: Record<string, string | number>, text?: string): SVGElement => {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

const at = (metres: number): number => X0 + (X1 - X0) * coastPlace(metres);

/** Draw the log line for a continuous trip into `svg`, and return the marker and the two clocks. */
export function buildCoast(svg: SVGSVGElement, trip: Trip, say: Say): CoastArt {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "0 0 1000 148");
  svg.setAttribute("data-coast", "1");
  const g = (trip.continuous?.a ?? 0) / G0;
  const add = (...nodes: SVGElement[]): void => svg.append(...nodes);
  add(el("text", { class: "coast-title", x: 500, y: 22, "text-anchor": "middle", "data-testid": "coast-title" }, say("jKeptTitle", { g: gWords(g) })));
  const ship = el("text", { class: "coast-clock", x: X0, y: 46, "text-anchor": "start", "data-testid": "coast-ship" }, "");
  const earth = el("text", { class: "coast-clock", x: X1, y: 46, "text-anchor": "end", "data-testid": "coast-earth" }, "");
  add(ship, earth, el("line", { class: "rail", x1: X0, y1: LINE, x2: X1, y2: LINE }));
  for (const mark of MARKS) {
    const x = at(mark.metres);
    const anchor = x < X0 + 36 ? "start" : x > X1 - 70 ? "end" : "middle";
    if (mark.name) {
      const label = say(mark.key);
      const lines = label.split(" ");
      const wide = mark.key === "jGalacticCentre" || mark.key === "jAndromeda";
      const anchor = mark.key === "jAndromeda" || mark.key === "jGalacticCentre" ? "end" : "middle";
      const nx = mark.key === "jAndromeda" ? X1 : mark.key === "jGalacticCentre" ? x - 16 : x;
      const top = mark.key === "jGalacticCentre" ? LINE - 40 : LINE - 28;
      const name: Record<string, string | number> = { class: "coast-name", x: nx.toFixed(1), y: top, "text-anchor": anchor };
      if (mark.test) name["data-testid"] = mark.test;
      add(el("circle", { class: mark.key === "jProxima" ? "coast-star" : "coast-body", cx: x.toFixed(1), cy: LINE, r: 5 }));
      const node = el("text", name);
      if (lines.length < 2 || !wide) node.textContent = label;
      else lines.forEach((line, index) => node.append(el("tspan", { x: nx.toFixed(1), y: top + index * 14 }, index === 0 ? line : ` ${line}`)));
      add(node);
      if (mark.under) add(el("text", { class: "coast-name coast-under", x: nx.toFixed(1), y: top + 14, "text-anchor": anchor }, say(mark.under)));
    } else {
      add(el("line", { class: "tick", x1: x.toFixed(1), y1: LINE - 7, x2: x.toFixed(1), y2: LINE + 7 }));
      add(el("text", { class: "coast-tick", x: x.toFixed(1), y: LINE + 26, "text-anchor": anchor }, say(mark.key)));
    }
  }
  const mark = el("g", { "data-testid": "coast-mark", "data-x": String(X0) });
  mark.append(el("path", { class: "chev", d: "M-9 -10L2 0L-9 10M-1 -10L10 0L-1 10" }, undefined));
  add(mark);
  return { mark, ship, earth };
}

/** Move the marker to the distance this ship time would have reached, and write both clocks. */
export function drawCoast(art: CoastArt, trip: Trip, state: State, say: Say): void {
  const a = trip.continuous?.a ?? 0;
  const gone = keptGoing(a, state.shipS);
  const x = at(gone.distanceM);
  art.mark.setAttribute("transform", `translate(${x.toFixed(1)} ${LINE})`);
  art.mark.setAttribute("data-x", x.toFixed(1));
  const ship = say("jShipClock", { time: duration(state.shipS) });
  const earth = say("jEarthClock", { time: duration(gone.earthS) });
  if (art.ship.textContent !== ship) art.ship.textContent = ship;
  if (art.earth.textContent !== earth) art.earth.textContent = earth;
}
