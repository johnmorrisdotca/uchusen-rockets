// The Space Shuttle as stacked for launch. The orbiter's length and span, and the booster length, are the 1981 news reference's tables. The tank's 153.8 feet and 27.6 feet stay on the tank article, with the news reference's 47 m and 8.7 m beside them. Where the parts stand against each other has no figure in a source read here.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-space-shuttle" as const;
const T = "wikipedia-shuttle-tank" as const;
const B = "wikipedia-shuttle-srb" as const;
const R = "nasa-shuttle-news-1981" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const SHUTTLE_TANK_DIAMETER = m(8.41, T, { note: "27.6 feet.", others: [{ value: 8.7, source: R, note: "The 1981 news reference's overview says 8.7 m (28.6 feet). The shuttle article's infobox also says 8.7 m." }, { value: 8.4, source: R, note: "The same book's oxygen and hydrogen tanks are 8.4 m (27.5 feet) across." }] });
export const SHUTTLE_SRB_DIAMETER = m(3.71, B, { note: "12.17 feet.", others: [{ value: 3.8, source: R, note: "A figure in the 1981 news reference says 3.8 m (12.38 feet)." }] });
export const ORBITER_SPAN = m(23.79, R, { note: "78.06 feet, the dimensions table. The opening summary rounds the span to 24 m (79 feet)." });

const D = "wikipedia-discovery" as const;

export const SHUTTLE_VARIANTS: readonly Variant[] = [
  {
    id: "stack",
    rocket: "space-shuttle",
    name: "Space Shuttle, stacked for launch",
    status: "flown",
    firstFlight: said("1981-04-12", S, { note: "STS-1." }),
    slots: ["external-tank", "srb-left", "srb-right", "orbiter"],
    lineupView: "back",
    note: "Stacked as for launch: the orbiter on the tank's side, a booster either side. NASA's models paint it, each its part's sourced length, with their marks painted out, and with the orbiter's bay shut. No source read here gives how far apart the parts stand, so that and the outline of the line looks' orbiter are judged from photographs. No name, flag or mark is drawn. Front is the orbiter's belly side, so it stands behind the tank from the front: turn it, or show it alone.",
    facts: {
      height: m(56, S, { note: "Stacked. The tank's top stands this high." }),
      diameter: SHUTTLE_TANK_DIAMETER,
      parts: {
        "external-tank": m(46.88, T, { note: "153.8 feet.", others: [{ value: 47, source: R, note: "The 1981 news reference's overview says 47 m (154 feet)." }] }),
        "srb-left": m(45.46, R, { note: "149.16 feet." }),
        "srb-right": m(45.46, R, { note: "149.16 feet." }),
        orbiter: m(37.24, R, { note: "122.17 feet, the dimensions table. On its gear the same table says 17.25 m (56.58 feet). The opening summary rounds the length to 37 m (121 feet)." }),
      },
      engines: { orbiter: said("3 RS-25", R, { note: "Three main engines." }), "srb-left": said("1 solid motor", R), "srb-right": said("1 solid motor", R) },
      more: { span: ORBITER_SPAN as Figure<number | string>, standing: blank("No source read here gives where the parts stand against each other.") as Figure<number | string> },
    },
  },
  {
    id: "discovery",
    rocket: "space-shuttle",
    name: "Discovery, OV-103, as displayed (a scan)",
    status: "flown",
    firstFlight: said("1984-08-30", D, { note: "STS-41-D." }),
    slots: ["orbiter"],
    note: "A real orbiter: the Smithsonian's scan, painted, with its landing gear down as it stands on display. The agency mark, the flags, the country's name and its own name are painted out, which leaves plain patches on its wings and sides. Its line looks are this package's own orbiter, with no gear. It is under CC0: the owner of this package confirmed that from the Smithsonian's record, https://www.si.edu/object/nasm_A20120325000, on 2026-11-02.",
    facts: {
      height: m(37.24, R, { note: "122.17 feet, the dimensions table. On its gear the same table says 17.25 m (56.58 feet)." }),
      diameter: ORBITER_SPAN,
      parts: { orbiter: m(37.24, R, { note: "122.17 feet, the dimensions table." }) },
      engines: { orbiter: said("3 RS-25", S) },
      more: {},
    },
  },
];
