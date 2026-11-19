// Sourced stage lengths of Ariane 5, the N1 and the Titan II GLV, kept as data, each figure naming its source. A figure with no source is blank, never estimated; where sources differ the figure keeps the one chosen and `others` holds the rest.
// The variants of those three rockets take their lengths from here.
import { blank, type Figure } from "./types.ts";

const length = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });

/**
 * The lengths of the parts of a rocket, in metres, by part: the figures its variants carry.
 *
 * @example
 * ```ts
 * import { FUTURE_STAGE_LENGTHS, type FutureRocketLengths } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const n1: FutureRocketLengths = FUTURE_STAGE_LENGTHS["n1"];
 * console.log(n1.parts["block-a"]?.value, n1.parts["block-a"]?.source);
 * ```
 */
export interface FutureRocketLengths {
  name: string;
  /** The whole rocket's height, with its payload and fairing. */
  height: Figure;
  /** The diameters worth keeping beside the lengths (metres), by part. */
  diameters: Readonly<Record<string, Figure>>;
  /** Each part's length (metres), by part id. A part no source gives apart stays a blank. */
  parts: Readonly<Record<string, Figure>>;
  note: string;
}

/**
 * The sourced lengths for `ariane-5`, `n1` and `titan-ii-glv`, read on 2026-11-18.
 *
 * @example
 * ```ts
 * import { FUTURE_STAGE_LENGTHS, SOURCES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const core = FUTURE_STAGE_LENGTHS["ariane-5"].parts["epc"]!;
 * console.log(core.value, SOURCES[core.source!].title);
 * ```
 */
export const FUTURE_STAGE_LENGTHS = {
  "ariane-5": {
    name: "Ariane 5",
    height: length(46, "wikipedia-ariane-5", { brief: "a range, 46 to 52 m", note: "The whole is given as 46 to 52 m, by version and payload, not as one height. 46 m is kept. 52 m is in `others`.", others: [{ value: 52, source: "wikipedia-ariane-5", note: "52 m, the high end of 46 to 52 m." }] }),
    diameters: {
      epc: length(5.4, "wikipedia-ariane-5"),
      eap: length(3.06, "wikipedia-ariane-5", { note: "The solid booster, P238 and P241 alike." }),
    },
    parts: {
      eap: length(31.6, "wikipedia-ariane-5", { note: "Each of the two solid boosters, P238 and P241 alike." }),
      epc: length(23.8, "wikipedia-ariane-5", { note: "The core stage, H158 or H173: the same length for both.", others: [{ value: 30.5, source: "wikipedia-ariane-5", note: "The article's text: a tank 5.4 m across and 30.5 m high. It does not say what that takes in, and the stage infobox's length is the one kept, as for the boosters and the upper stages." }] }),
      eps: length(3.4, "wikipedia-ariane-5", { note: "The upper stage of the G, G+, GS and ES (the L9.7 and the L10): the Aestus." }),
      esc: length(4.711, "wikipedia-ariane-5", { note: "The upper stage of the ECA and the ECA+: the HM7B." }),
      fairing: blank("No source read here gives the fairing a length. The article does not, and Arianespace's user manual could not be read (HTTP 410).", "not given"),
    },
    note: "Wikipedia's stage infoboxes, read as raw wikitext. The upper stage differs by version (the EPS on the G, G+, GS and ES, the ESC on the ECA); the core and the boosters do not. The whole is a range, and the fairing has no figure.",
  },
  n1: {
    name: "N1",
    height: length(105.3, "wikipedia-n1", { note: "The infobox, citing RSC Energia's N1-L3 components page, which could not be reached from here; russianspaceweb's table gives 105 m.", others: [{ value: 105, source: "russianspaceweb-n1", note: "The N1 (11A52) row of RussianSpaceWeb's table of the N1 family, in whole metres." }] }),
    diameters: {
      "block-a": length(16.875, "russianspaceweb-n1", { note: "The maximum diameter." }),
      "block-b": length(10.3, "russianspaceweb-n1", { note: "The maximum diameter." }),
      "block-v": length(7.6, "russianspaceweb-n1", { note: "The maximum diameter." }),
      "block-g": length(4.1, "russianspaceweb-n1", { note: "The maximum diameter." }),
      "block-d": length(3.7, "russianspaceweb-n1", { note: "Its page says the structural diameter did not exceed 3.7 m. Wikipedia's article on Blok D gives 3.70 m in its infobox for the stage in all its rockets." }),
    },
    parts: {
      "block-a": length(30.09, "russianspaceweb-n1", { note: "The first stage; its page gives 30.090 m." }),
      "block-b": length(20.461, "russianspaceweb-n1", { note: "The second stage." }),
      "block-v": length(11.51, "russianspaceweb-n1", { note: "The third stage." }),
      "block-g": length(7.91, "russianspaceweb-n1", { note: "The fourth stage, its main body." }),
      "block-d": length(5.5, "russianspaceweb-n1", {
        note: "The fifth stage: RussianSpaceWeb's page for it says the torus fuel tank was apparently there to limit the overall length of the stage to 5.5 m; it is the direct per-stage page, so it is the one kept. Wikipedia's article on Blok D says 5.70 m in its text and 6.28 m in its infobox.",
        others: [
          { value: 5.7, source: "wikipedia-blok-d", note: "The article's text: it has 5.70 meters length." },
          { value: 6.28, source: "wikipedia-blok-d", note: "The article's infobox." },
        ],
      }),
      "payload-and-escape": blank("No source read gives the payload, its shroud and the escape tower apart. With the five blocks (Block D at 5.5 m) they leave about 29.8 m of the 105.3 m, which a build would draw as one part.", "not given apart"),
    },
    note: "RussianSpaceWeb's per-stage pages, read directly, and its overview table. The five blocks add to 75.471 m with Block D at 5.5; what the 105.3 m leaves above them, about 29.8 m, is not given apart.",
  },
  "titan-ii-glv": {
    name: "Titan II GLV",
    height: length(33.2, "wikipedia-titan-ii-glv", { brief: "109 ft with the spacecraft", note: "109 ft, the stack with the Gemini spacecraft (NASA's own report gives the same 109 ft; the stations of its figure 3-1 give 107.6 ft from the top of the spacecraft to the engine bells).", others: [{ value: 32.8, source: "nasa-gemini-iv-report", note: "107.6 ft, from the top of the spacecraft to the engine bells, by the stations of figure 3-1." }] }),
    diameters: {
      glv: length(3.048, "wikipedia-titan-ii-glv", { note: "10 ft." }),
    },
    parts: {
      "stage-1": length(21.395, "nasa-gemini-iv-report", {
        note: "Figure 3-1 puts the stage 1-2 separation at station X 500.000 and the engine bells at X 1342.31, in inches: 842.31 in, 70 ft 2.31 in, 21.395 m. It includes the interstage that holds the second stage's engine.",
      }),
      "stage-2": length(5.669, "nasa-gemini-iv-report", {
        note: "The figure puts the interface with the spacecraft adapter at station X 276.825 and the stage 1-2 separation at X 500.000: 223.175 in, 5.669 m, above the separation plane. The 7.78 m (25 ft 6.375 in) and 8.23 m (27 ft) that popular pages give for the second stage most likely include the interstage or the engine; no NASA text read gives a stage length.",
      }),
    },
    note: "NASA's Gemini IV mission report, figure 3-1, read from the PDF page (page 62 of 428): the stations of GLV-4 in inches. Stage 2 is what the figure puts above the separation plane; the report's text gives no lengths. Wikipedia's article on the Titan II missile gives 67 ft and 29 ft for the missile's stages, not the GLV's.",
  },
} as const satisfies Readonly<Record<string, FutureRocketLengths>>;
