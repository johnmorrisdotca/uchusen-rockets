// Falcon 1 as the sources give it: SpaceX's own user's guide (2008), read directly, and Wikipedia's article, which disagree on its height. No source read here gives a stage's own length.
import { blank, type Figure, type Variant } from "./types.ts";

const G = "spacex-falcon-1-guide" as const;
const W = "wikipedia-falcon-1" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });
const NO_STAGE = "No source read here gives this stage's own length: it is drawn in proportion to the whole, judged from photographs.";

export const FALCON_1_VARIANTS: readonly Variant[] = [
  {
    id: "falcon-1",
    rocket: "falcon-1",
    name: "Falcon 1",
    status: "flown",
    firstFlight: said("2006-03-24", W, { note: "The first flight failed. The first to reach orbit was the fourth, on 2008-09-28, and the last the fifth, on 2009-07-14." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "One Merlin below and one Kestrel above, in the aluminium fairing the guide gives, narrower than the stages. Its first two flights used the Merlin 1A and its last three the Merlin 1C.",
    facts: {
      height: m(21.3, G, { note: "70 feet, both stages with fairing and interstage.", others: [{ value: 21, source: W, note: "The article's infobox rounds to 21 m." }, { value: 22.25, source: W, note: "The same article's table of versions says 21.3 m for the Merlin 1A and 22.25 m for the Merlin 1C, with no reason given. SpaceX's guide, written in the Merlin 1C's time, says 70 feet." }] }),
      diameter: m(1.7, W, { others: [{ value: 1.68, source: G, note: "The guide says 5.5 feet, which is 1.68 m." }] }),
      parts: {
        "first-stage": blank(NO_STAGE),
        "second-stage": blank(NO_STAGE),
        fairing: m(3.5, G, { note: "Figure 2-1 of the guide, with the 0.3 m below the separation plane. 1.54 m across." }),
      },
      engines: { "first-stage": said("1 Merlin 1A, then 1 Merlin 1C", W), "second-stage": said("1 Kestrel", W) },
      more: { fairingDiameter: m(1.54, G) as Figure<number | string> },
    },
  },
  {
    id: "falcon-1e",
    rocket: "falcon-1",
    name: "Falcon 1e (announced, never flown)",
    status: "announced",
    firstFlight: blank("It was announced and never flew: Falcon 1 was retired in favour of Falcon 9.", "Never flew"),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "An enhanced Falcon 1 that SpaceX's 2008 guide describes and that was never built to fly. Its figures are announced plans. It has a longer first stage and a wider, ogive composite fairing.",
    facts: {
      height: m(27.4, G, { brief: "announced", note: "90 feet.", others: [{ value: 26.83, source: W, note: "The article's table of versions says 26.83 m for the proposed Falcon 1e." }] }),
      diameter: m(1.7, W, { brief: "announced" }),
      parts: {
        "first-stage": blank(NO_STAGE),
        "second-stage": blank(NO_STAGE),
        fairing: m(4.4, G, { brief: "announced", note: "Figure 2-2 of the guide, 1.7 m across." }),
      },
      engines: { "first-stage": said("1 Merlin 1C", W, { brief: "announced" }), "second-stage": said("1 Kestrel", W, { brief: "announced" }) },
      more: { fairingDiameter: m(1.7, G, { brief: "announced" }) as Figure<number | string> },
    },
  },
];

/** A fairing's own width, narrower than Falcon 1's stages. */
export const variantOfFairing = (id: string): Figure => FALCON_1_VARIANTS.find((variant) => variant.id === id)?.facts.more.fairingDiameter as Figure;
