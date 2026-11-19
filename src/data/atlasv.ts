// Atlas V in the 401 form: no solid boosters, one RL10, the 4.2 m fairing. ULA's 2010 user's guide gives the common core, the Centaur III and the large fairing. The drawn fairing stays the article's 9 m. This form's height stays blank: the guide's 57.3 m is the stack with that 12.0 m fairing, and the drawing is still the three lengths added.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-atlas-v" as const;
const U = "ula-atlas-v-guide" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const ATLAS_V_FAIRING_DIAMETER = m(4.2, { source: U, note: "165.4 inches, the 400-series fairings. The 5.4 m fairings, 20.7 m, 23.4 m and 26.5 m on the guide's 500-series figure (its prose says the medium is 23.5 m), are not listed." });
export const ATLAS_V_CENTAUR_DIAMETER = m(3.05, { source: U, note: "120 inches, Centaur III. The guide also gives a 400-series interstage, 2.52 m of cylinder and a 1.61 m cone. The narrowing from 3.81 m to 3.05 m, and from 3.05 m to the 4.2 m fairing, is still drawn inside the sourced stage lengths." });

export const ATLAS_V_VARIANTS: readonly Variant[] = [
  {
    id: "401",
    rocket: "atlas-v",
    name: "Atlas V 401",
    status: "flown",
    firstFlight: said("2002-08-21", { note: "Hot Bird 6, which the article names as an Atlas V 401. The guide says the 400 and 500 series were placed into service in 2002, and does not give the day." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "No solid boosters and one RL10, the 401. The article's height is up to 58.3 m for the family, and the 2010 guide's figure gives 57.3 m (188 feet) with the 12.0 m fairing, so this form's height is left blank. The drawing is the common core, the Centaur III and the article's 9 m fairing added (54.14 m). The guide's extended fairings are 12.9 m and 13.8 m, and the article's 10 m and 11 m, and none of those is drawn. The 5.4 m fairings and the forms with boosters or two RL10 engines are not listed. No name or mark is drawn.",
    facts: {
      height: {
        ...blank("The article says up to 58.3 m, the family's height, not this form's. The 2010 guide gives 57.3 m with the 12.0 m fairing. The drawing is 32.46 m + 12.68 m + 9 m."),
        others: [
          { value: 57.3, source: U, note: "188 feet, with the 12.0 m large fairing." },
          { value: 58.3, source: S, note: "Up to 58.3 m, the family's height in the article, not this form." },
        ],
      },
      diameter: m(3.81, { source: U, note: "150 inches, the 400-series booster.", others: [{ value: 3.8, source: S, note: "The body of the article rounds the core to 3.8 m and 32.5 m." }] }),
      parts: {
        "first-stage": m(32.46, { source: U, note: "1,278 inches, the 400-series booster, one RD-180." }),
        "second-stage": m(12.68, { source: U, note: "499 inches, with the extended nozzle. 3.05 m across. The 401 is the single-engine form." }),
        fairing: m(9, { note: "The article's original length of the 4.2 m fairing. The guide's large fairing is 12.0 m (472.4 inches). The guide's extended lengths are 12.9 m and 13.8 m, and the article's are 10 m and 11 m. The article does not say which length the first flight used.", others: [{ value: 12, source: U, note: "12.0 m, the large 4 m fairing." }] }),
      },
      engines: { "first-stage": said("1 RD-180", { source: U }), "second-stage": said("1 RL10A", { source: U, note: "The guide names the model RL10A-4-2." }) },
      more: {},
      sizes: { "Fairing diameter": ATLAS_V_FAIRING_DIAMETER, "Centaur diameter": ATLAS_V_CENTAUR_DIAMETER },
    },
  },
];
