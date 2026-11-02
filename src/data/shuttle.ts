// The Space Shuttle as stacked for launch: each part's size from its own article. Where the parts stand against each other has no figure in a source read here.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-space-shuttle" as const;
const O = "wikipedia-shuttle-orbiter" as const;
const T = "wikipedia-shuttle-tank" as const;
const B = "wikipedia-shuttle-srb" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const SHUTTLE_TANK_DIAMETER = m(8.41, T, { note: "27.6 feet." });
export const SHUTTLE_SRB_DIAMETER = m(3.71, B, { note: "12.17 feet." });
export const ORBITER_SPAN = m(23.79, O, { note: "The wingspan." });

export const SHUTTLE_VARIANTS: readonly Variant[] = [
  {
    id: "stack",
    rocket: "space-shuttle",
    name: "Space Shuttle, stacked for launch",
    status: "flown",
    firstFlight: said("1981-04-12", S, { note: "STS-1." }),
    slots: ["external-tank", "srb-left", "srb-right", "orbiter"],
    note: "Stacked as for launch: the orbiter on the tank's side, a booster either side. No source read here gives how far apart the parts stand, so that and the orbiter's outline are judged from photographs. No name, flag or mark is drawn. Front is the orbiter's belly side, so it stands behind the tank from the front: turn it, or show it alone.",
    facts: {
      height: m(56, S, { note: "Stacked. The tank's top stands this high." }),
      diameter: m(8.41, T, { note: "The tank, 27.6 feet.", others: [{ value: 8.7, source: S, note: "The Space Shuttle article's infobox says 8.7 m for the tank; the tank's own article says 27.6 feet." }] }),
      parts: {
        "external-tank": m(46.88, T, { note: "153.8 feet." }),
        "srb-left": m(45.46, B, { note: "149.16 feet." }),
        "srb-right": m(45.46, B, { note: "149.16 feet." }),
        orbiter: m(37.24, O, { note: "Its length, nose to tail. It stands 17.86 m tall on its gear." }),
      },
      engines: { orbiter: said("3 RS-25", S), "srb-left": said("1 solid motor", B), "srb-right": said("1 solid motor", B) },
      more: { span: ORBITER_SPAN as Figure<number | string>, standing: blank("No source read here gives where the parts stand against each other.") as Figure<number | string> },
    },
  },
];
