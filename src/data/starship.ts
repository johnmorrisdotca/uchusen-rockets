// Starship's variants as the sources give them. No figure here is measured from a picture or worked out to fill a gap: a blank stays blank. Column layout matters in the Wikipedia table these come from:
// its "81 m" is Block 4's booster, not Block 3's, which is how one secondary site came to print it for Block 3.
import { blank, type Figure, type Variant } from "./types.ts";

const WP = "wikipedia-starship" as const;
const SH = "wikipedia-super-heavy" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });
const num = (value: number, source: Figure<number | string>["source"], extra: Partial<Figure<number | string>> = {}): Figure<number | string> => ({ value, source, ...extra });

const GUNTER_NOTE = "Gunter's Space Page gives one set of figures for every version, 118 m with stages of 68 m and 50 m. It does not change them by version, so the block table is used.";

export const STARSHIP_VARIANTS: readonly Variant[] = [
  {
    id: "v1",
    rocket: "starship",
    name: "Block 1 (V1)",
    status: "flown",
    firstFlight: said("2023-11-18", "gunter", { note: "With the vented ring, flight test 2, Ship 25. Block 1 itself first flew on 2023-04-20 without it: see the next variant." }),
    slots: ["booster", "ship"],
    facts: {
      height: m(121.3, WP, { date: "2023", others: [{ value: 118, source: "gunter", note: GUNTER_NOTE }] }),
      diameter: m(9, WP),
      parts: {
        booster: m(71, SH, { note: "With the vented interstage. 69 m without it.", others: [{ value: 68, source: "gunter", note: GUNTER_NOTE }] }),
        ship: m(50.3, WP, { others: [{ value: 50, source: "gunter", note: GUNTER_NOTE }] }),
      },
      engines: {
        booster: said("33 Raptor 2", SH),
        ship: said("3 sea-level and 3 vacuum Raptor 2", WP),
      },
      more: {
        gridFins: num(4, "satnews-v3", { note: "V3 went from four to three." }),
        forwardFlaps: said("Both at 180 degrees", "wikipedia-ship"),
        boosterPropellantT: num(3250, WP, { others: [{ value: 3400, source: SH, note: "The Super Heavy article's infobox gives 3,400 t for Blocks 1 and 2; the block table is used." }] }),
        shipPropellantT: num(1200, WP),
        boosterThrustTf: num(7500, WP),
        shipThrustTf: num(1250, WP),
        payloadT: num(15, WP),
      },
    },
  },
  {
    id: "v1-flight1",
    rocket: "starship",
    name: "Block 1, first flight (Ship 24, Booster 7)",
    status: "flown",
    firstFlight: said("2023-04-20", "wikipedia-flight-1", { note: "Flight test 1. Gunter's Space Page calls this version v1.1 and the ringed one v1.2." }),
    slots: ["booster", "ship"],
    note: "The one vehicle of flight test 1, with no vented ring: that came with the next flight. Its stated height and its parts do not add up, by 1.7 m: the parts are drawn to the parts' figures, so it is drawn 119.3 m tall.",
    facts: {
      height: m(121, "wikipedia-flight-1", { date: "2023-04-20", note: "The flight's article says 121 m. Its parts' own figures add to 119.3 m, and the drawing follows the parts." }),
      diameter: m(9, WP),
      parts: {
        booster: m(69, SH, { note: "Wikipedia's infobox: 69 m without the vented interstage. It gives no reference for that figure." }),
        ship: m(50.3, WP),
      },
      engines: {
        booster: said("33 Raptor 2", SH),
        ship: said("3 sea-level and 3 vacuum Raptor 2", WP),
      },
      more: {
        gridFins: num(4, "satnews-v3"),
        forwardFlaps: said("Both at 180 degrees", "wikipedia-ship"),
      },
    },
  },
  {
    id: "v2",
    rocket: "starship",
    name: "Block 2 (V2)",
    status: "flown",
    firstFlight: said("2025-01-16", "gunter", { note: "Flight test 7, Ship 33." }),
    slots: ["booster", "ship"],
    facts: {
      height: m(123.1, WP, { date: "2025", others: [{ value: 123.3, source: WP, note: "The same article's table says 123.3 m; its infobox says 123.1 m, which is also 71 m plus 52.1 m." }] }),
      diameter: m(9, WP),
      parts: {
        booster: m(71, SH),
        ship: m(52.1, WP),
      },
      engines: {
        booster: said("33 Raptor 2", SH),
        ship: said("3 sea-level and 3 vacuum Raptor 2", WP),
      },
      more: {
        gridFins: num(4, "satnews-v3"),
        forwardFlaps: said("Thinner, moved leeward, angled to about 140 degrees", "wikipedia-ship"),
        boosterPropellantT: num(3250, WP),
        shipPropellantT: num(1500, WP),
        boosterThrustTf: num(7500, WP),
        shipThrustTf: num(1400, WP),
        payloadT: num(35, WP),
      },
    },
  },
  {
    id: "v3",
    rocket: "starship",
    name: "Block 3 (V3)",
    status: "flown",
    firstFlight: said("2026-05-22", WP, { note: "Flight test 12, Booster 19 and Ship 39." }),
    slots: ["booster", "ship"],
    facts: {
      height: m(124.4, WP, {
        date: "2026",
        others: [
          { value: 124, source: "spacex-starship", note: "SpaceX's vehicle page, as a search engine quoted it: 124 m (407 ft), rounded. The page itself would not load." },
          { value: 124, source: "satnews-v3", note: "About 124 m, roughly 1.5 m taller than V2, from SpaceX's briefing." },
        ],
      }),
      diameter: m(9, SH),
      parts: {
        booster: m(72.3, SH, {
          date: "2025-05-30",
          note: "Wikipedia cites NASASpaceflight, 2025-05-30, which could not be read directly.",
          others: [
            { value: 72, source: "spacex-starship", note: "SpaceX's page as quoted by a search engine: 72 m (236 ft), rounded." },
            { value: 81, source: WP, note: "81 m is Block 4's cell in Wikipedia's table, where colspans shift the columns. A site that printed it for Block 3 misread it: 81 m plus 52.1 m does not make 124.4 m." },
          ],
        }),
        ship: m(52.1, WP, { others: [{ value: 52, source: "spacex-starship", note: "SpaceX's page as quoted by a search engine: 52 m (171 ft), rounded." }] }),
      },
      engines: {
        booster: said("33 Raptor 3", SH),
        ship: said("3 sea-level and 3 vacuum Raptor 3", WP),
      },
      more: {
        gridFins: num(3, SH, { note: "In a 90/90/180 degree arrangement. About 50% larger each, by SatNews." }),
        hotStage: said("Vented interstage and forward dome integrated into the methane tank", SH),
        docking: said("Docking ports for refuelling", WP),
        boosterPropellantT: num(3650, WP),
        shipPropellantT: num(1600, WP),
        boosterThrustTf: num(8240, WP),
        shipThrustTf: num(1600, WP),
        payloadT: num(100, WP),
      },
    },
  },
  {
    id: "v4",
    rocket: "starship",
    name: "Block 4 (V4), announced",
    status: "announced",
    firstFlight: blank("Not flown."),
    slots: ["booster", "ship"],
    note: "Announced, not built. Its sizes are stated targets marked as estimates at the source. Its drawing is Block 3's details on Block 4's sizes, which is thin evidence: no source shows its parts.",
    facts: {
      height: m(142, WP, { note: "Marked an estimate at the source." }),
      diameter: m(9, WP),
      parts: {
        booster: m(81, WP, { note: "Marked with the block table's estimates. SpaceX's planned high bay is also quoted as clearing vehicles up to 81 m." }),
        ship: m(61, WP),
      },
      engines: {
        booster: said("33 Raptor 3", "gunter"),
        ship: said("3 sea-level and 6 vacuum", WP, { note: "Three more vacuum engines, from a public statement by Elon Musk." }),
      },
      more: {
        gridFins: blank("No source gives it."),
        boosterPropellantT: num(4050, WP),
        shipPropellantT: num(2300, WP),
        boosterThrustTf: num(10000, WP),
        shipThrustTf: num(2700, WP),
        payloadT: num(200, WP),
      },
    },
  },
  {
    id: "2019",
    rocket: "starship",
    name: "2019 design (artist's model)",
    status: "artist-model",
    firstFlight: blank("It never flew: this is a design, drawn when it was shown."),
    slots: ["ship"],
    note: "An artist's model of the upper stage shown in September 2019, published on 2019-09-30, not a flown block. It has no booster. The height is the Mk1 prototype's, which was built to that design.",
    facts: {
      height: m(50, "spacecom-mk1", { date: "2019-09", note: "Musk's figure for the Mk1 prototype, as a search engine quoted the article." }),
      diameter: blank("No source read here gives the 2019 design's diameter."),
      parts: { ship: m(50, "spacecom-mk1", { date: "2019-09" }) },
      engines: { ship: said("3 sea-level and 3 vacuum", WP, { note: "The design had settled on six Raptors by 2019." }) },
      more: {},
    },
  },
];
