// Falcon 9 and Falcon Heavy as the sources give them. r/SpaceX's SpaceX-API (Apache-2.0, archived in 2024) has one row per rocket, not per version, read from its repository's docs. A blank stays blank.
import { blank, type Figure, type Variant } from "./types.ts";

const F9 = "wikipedia-falcon-9" as const;
const FH = "wikipedia-falcon-heavy" as const;
const B5 = "wikipedia-falcon-9-block-5" as const;
const API = "r-spacex" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });
const num = (value: number, source: Figure<number | string>["source"], extra: Partial<Figure<number | string>> = {}): Figure<number | string> => ({ value, source, ...extra });

const FAIRING_NOTE = "The article's height is measured to the top of the payload fairing.";
const FIRST_STAGE_WITH_INTERSTAGE = m(47.7, F9, { note: "With the interstage. The stage alone is 41.2 m." });
const SECOND_STAGE = m(13.8, F9);
const FAIRING = m(13.1, API, { note: "SpaceX-API's Falcon 9 row, which gives one row for every version, 5.2 m across.", others: [{ value: 13, source: F9, note: "The Falcon 9 article rounds: 13 m long and 5.2 m in diameter." }] });

/** How wide the second stage's vacuum engine is at the end of its nozzle extension. */
export const MVAC_EXIT_DIAMETER = m(3.3, "wikipedia-merlin", { note: "The vacuum Merlin 1D's diameter in the infobox (0.92 m at sea level). The same article says the first Merlin Vacuum's niobium nozzle was 9 ft (about 2.7 m) long, and that a shorter extension flew from the Transporter-7 mission." });

export const FALCON_9_VARIANTS: readonly Variant[] = [
  {
    id: "v1.0",
    rocket: "falcon-9",
    name: "Falcon 9 v1.0",
    status: "flown",
    firstFlight: said("2010-06-04", F9, { note: "The Dragon qualification flight." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "Its nine Merlin 1C engines stood in a 3 by 3 grid. Stated with a fairing, though its height with Dragon 1 was 47.8 m. No source read here gives its parts with the interstage, so they are drawn in proportion to the whole.",
    facts: {
      height: m(54.9, F9, { note: FAIRING_NOTE, others: [{ value: 53, source: F9, note: "The same article's table of versions says 53 m; its infobox, with a note on how it is measured, says 54.9 m." }] }),
      diameter: m(3.7, F9),
      parts: {
        "first-stage": m(39.6, F9, { brief: "the stage alone, without its interstage" }),
        "second-stage": blank("No source read here gives it for this version."),
        fairing: blank("No source read here gives it for this version."),
      },
      engines: { "first-stage": said("9 Merlin 1C, in a 3 by 3 grid", F9), "second-stage": said("1 Merlin 1C Vacuum", F9) },
      more: { landingLegs: blank("It had none on the sources read here.", "None shown") },
    },
  },
  {
    id: "v1.1",
    rocket: "falcon-9",
    name: "Falcon 9 v1.1",
    status: "flown",
    firstFlight: said("2013-09-29", F9, { note: "CASSIOPE." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "Its height with Dragon 1 was 63.4 m. No source read here gives its parts with the interstage, so they are drawn in proportion to the whole.",
    facts: {
      height: m(68.4, F9, { note: FAIRING_NOTE }),
      diameter: m(3.7, F9),
      parts: {
        "first-stage": m(41.2, F9, { brief: "the stage alone, without its interstage" }),
        "second-stage": blank("No source read here gives it for this version."),
        fairing: blank("No source read here gives it for this version."),
      },
      engines: { "first-stage": said("9 Merlin 1D", F9), "second-stage": said("1 Merlin 1D Vacuum", F9) },
      more: {},
    },
  },
  {
    id: "ft",
    rocket: "falcon-9",
    name: "Falcon 9 Full Thrust",
    status: "flown",
    firstFlight: said("2015-12-22", F9, { note: "OG2 Flight 2." }),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "Blocks 3 and 4 are part of Full Thrust. Block 4 was a transition between them and Block 5, with incremental thrust upgrades; its full design first flew on 2017-08-14. Neither the Falcon 9 article nor the Full Thrust article gives it sizes of its own, so it is not listed apart.",
    facts: {
      height: m(69.8, F9, { note: FAIRING_NOTE, others: [{ value: 70, source: F9, note: "The same article's table of versions rounds to 70 m." }, { value: 71, source: "wikipedia-falcon-9-ft", note: "The Full Thrust article's infobox says 71 m with the fairing, citing SpaceX's user's guide; its own Block 5 box says 69.8 m." }] }),
      diameter: m(3.7, F9),
      parts: { "first-stage": FIRST_STAGE_WITH_INTERSTAGE, "second-stage": SECOND_STAGE, fairing: FAIRING },
      engines: { "first-stage": said("9 Merlin 1D+", F9), "second-stage": said("1 Merlin 1D Vacuum", F9) },
      more: { landingLegs: num(4, F9) },
    },
  },
  {
    id: "block-5",
    rocket: "falcon-9",
    name: "Falcon 9 Block 5",
    status: "flown",
    firstFlight: said("2018-05-11", F9, { note: "Bangabandhu Satellite-1." }),
    slots: ["first-stage", "second-stage", "fairing"],
    facts: {
      height: m(69.8, B5, { note: "With the payload fairing, from Block 5's own article.", others: [{ value: 70, source: F9, note: "The Falcon 9 article's table of versions rounds to 70 m." }, { value: 70, source: API, note: "SpaceX-API's Falcon 9 row says 70 m, for every version." }] }),
      diameter: m(3.7, B5, { others: [{ value: 3.66, source: F9, note: "The Falcon 9 article's table of versions says 3.66 m; the infoboxes and SpaceX-API say 3.7 m." }] }),
      parts: { "first-stage": FIRST_STAGE_WITH_INTERSTAGE, "second-stage": SECOND_STAGE, fairing: FAIRING },
      engines: { "first-stage": said("9 Merlin 1D, upgraded", F9), "second-stage": said("1 Merlin 1D Vacuum, upgraded", F9) },
      more: { landingLegs: num(4, F9) },
    },
  },
  {
    id: "block-5-dragon-2",
    rocket: "falcon-9",
    name: "Falcon 9 Block 5 with Dragon 2",
    status: "flown",
    firstFlight: said("2019-03-02", "wikipedia-dragon-2", { note: "Crew Dragon's uncrewed test flight." }),
    slots: ["first-stage", "second-stage", "trunk", "capsule"],
    partIds: { "first-stage": "falcon-9-block-5-first-stage", "second-stage": "falcon-9-block-5-second-stage", trunk: "dragon-dragon-2-trunk", capsule: "dragon-dragon-2-capsule" },
    note: "The same parts as Falcon 9 Block 5 and Dragon 2, joined at their joints.",
    facts: {
      height: m(65.7, B5, { brief: "as stated; the parts add to 64.8 m", note: "Block 5's height with Dragon 2. The parts' own figures add to 64.8 m, and it is drawn to them." }),
      diameter: m(3.7, F9),
      parts: { "first-stage": FIRST_STAGE_WITH_INTERSTAGE, "second-stage": SECOND_STAGE, trunk: blank("No source read here gives the trunk alone."), capsule: m(4.5, "wikipedia-dragon-2") },
      engines: { "first-stage": said("9 Merlin 1D, upgraded", F9), "second-stage": said("1 Merlin 1D Vacuum, upgraded", F9), capsule: said("16 Draco and 8 SuperDraco thrusters", "wikipedia-dragon-2") },
      more: {},
    },
  },
];

export const FALCON_HEAVY_VARIANTS: readonly Variant[] = [
  {
    id: "falcon-heavy",
    rocket: "falcon-heavy",
    name: "Falcon Heavy",
    status: "flown",
    firstFlight: said("2018-02-06", FH, { note: "The test flight." }),
    slots: ["centre", "side-left", "side-right"],
    note: "The painted model is one merged mesh. Its side boosters separate by their own connected pieces, and its centre core, upper stage and fairing are one continuous shell, so they stay one part: nothing is cut to fake a separation. Low detail: a low-poly model.",
    facts: {
      height: m(70, FH, { others: [{ value: 70, source: API, note: "SpaceX-API says the same." }] }),
      diameter: m(12.2, FH, { brief: "across the three cores; 3.7 m each" }),
      parts: { centre: m(70, FH), "side-left": blank("No source read here gives a side booster's height."), "side-right": blank("No source read here gives a side booster's height.") },
      engines: { centre: said("9 Merlin 1D, and 1 vacuum Merlin above", FH), "side-left": said("9 Merlin 1D", FH), "side-right": said("9 Merlin 1D", FH) },
      more: { engines: num(27, FH, { note: "On the three cores." }) },
    },
  },
];
