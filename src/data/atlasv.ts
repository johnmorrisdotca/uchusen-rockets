// Atlas V in the 401 form: no solid boosters, one RL10, the 4.2 m fairing. The article gives the common core, the Centaur III and the original fairing; the infobox's height is the family's maximum, not this form, so this form's height is the three lengths added.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-atlas-v" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const ATLAS_V_FAIRING_DIAMETER = m(4.2, { note: "The 4 m class. The 5.4 m fairing, in lengths 20.7 m, 23.4 m and 26.5 m, is not listed." });
export const ATLAS_V_CENTAUR_DIAMETER = m(3.05, { note: "Centaur III. The part also narrows from the core's 3.81 m, inside this stage's own length, because no interstage length is given." });

export const ATLAS_V_VARIANTS: readonly Variant[] = [
  {
    id: "401",
    rocket: "atlas-v",
    name: "Atlas V 401",
    status: "flown",
    firstFlight: said("2002-08-21", { note: "Hot Bird 6, which the article names as an Atlas V 401." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "No solid boosters and one RL10, the 401. The infobox's height is up to 58.3 m for the family, so this form's height is left blank and the drawing is the common core, the Centaur III and the original 9 m fairing added (54.14 m). The article gives no interstage length: the narrowing from 3.81 m to 3.05 m, and from 3.05 m to the 4.2 m fairing, is drawn inside those sourced lengths. The 10 m and 11 m fairings, the 5.4 m fairings, and the forms with boosters or two RL10 engines are not listed. No name or mark is drawn.",
    facts: {
      height: blank("The infobox says up to 58.3 m, the family's height, not this form's. The drawing is 32.46 m + 12.68 m + 9 m."),
      diameter: m(3.81, { others: [{ value: 3.8, source: S, note: "The body of the article rounds the core to 3.8 m and 32.5 m." }] }),
      parts: {
        "first-stage": m(32.46, { note: "Common core booster, 3.81 m across, one RD-180." }),
        "second-stage": m(12.68, { note: "Centaur III, 3.05 m across. The 401 is the single-engine form." }),
        fairing: m(9, { note: "The original length of the 4.2 m fairing. The extended lengths are 10 m and 11 m, and the article does not say which length the first flight used." }),
      },
      engines: { "first-stage": said("1 RD-180"), "second-stage": said("1 RL10A") },
      more: {},
      sizes: { "Fairing diameter": ATLAS_V_FAIRING_DIAMETER, "Centaur diameter": ATLAS_V_CENTAUR_DIAMETER },
    },
  },
];
