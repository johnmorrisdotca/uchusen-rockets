// Mir as it was after Kvant docked at the aft port. The lengths and diameters are NASA SP-4225, Mir Hardware Heritage (NTRS 19950016829), read 2026-11-19. The side modules, the solar arrays and the forward node's own length are not drawn: the book does not place them.
import type { Variant } from "./types.ts";

const BOOK = "nasa-sp-4225" as const;

/** Section 2.9.1, the base block. */
const BASE = 13.13;
/** Section 3.5.1, Kvant. The table lists the weights and then this length. */
const KVANT = 5.8;
/** The two modules end to end. The book does not state this sum. */
const LENGTH = Number((BASE + KVANT).toFixed(2));

/** Mir: the base block and Kvant, one cylinder of two tubes. */
export const MIR: Variant = {
  id: "mir",
  rocket: "mir",
  name: "Mir",
  status: "flown",
  firstFlight: { value: "1986-02-19", source: BOOK, note: "Section 2.9 heads the station 19 February 1986 to the present, and the timeline's first block is Mir's launch, 19 February to 15 March 1986." },
  slots: ["craft"],
  facts: {
    height: { value: LENGTH, source: BOOK, note: "This package's own sum of the base block, 13.13 m, and Kvant, 5.8 m. The book's 33 m is the 1994 complex with a Soyuz and a Progress docked, so it is not this height." },
    diameter: { value: 4.15, source: BOOK, note: "The base block's maximum diameter in section 2.9.1. Kvant's maximum diameter, in section 3.5.1, is the same 4.15 m." },
    parts: {
      craft: { value: LENGTH, source: BOOK, note: "The base block and Kvant end to end." },
    },
    engines: {},
    more: {
      mass: { value: 20400, source: BOOK, note: "The base block's weight at launch in section 2.9.1, 20,400 kg. Kvant's own module weight, 11,000 kg, is not added in." },
      baseLength: { value: BASE, source: BOOK, note: "Section 2.9.1: the base block is 13.13 m long and 4.15 m across." },
      kvantLength: { value: KVANT, source: BOOK, note: "Section 3.5.1 lists the launch weight, the module weight and the tug's weight, then the length. The length value is 5.8 m and the maximum diameter is 4.15 m. Kvant docked at the aft port." },
      kvantMass: { value: 11000, source: BOOK, note: "Section 3.5.1: the Mir module weight is 11,000 kg. The whole launch, with the tug, is 20,600 kg, and that tug is not drawn." },
      kvant2Length: { value: 13.73, source: BOOK, note: "Section 3.6.1: Kvant 2 is 13.73 m long and 4.35 m across. It occupies one of four lateral ports. The book does not say which, so it is not drawn." },
      kristallLength: { value: 13.73, source: BOOK, note: "Section 3.7.1: Kristall is 13.73 m long and 4.35 m across, on another lateral port. The book does not give the angle between the ports, so it is not drawn." },
    },
    sizes: { "Base block": { value: BASE, source: BOOK, note: "13.13 m." }, Kvant: { value: KVANT, source: BOOK, note: "5.8 m." } },
  },
  note: "Mir after Kvant had docked at the aft port. The lengths and diameters are NASA SP-4225. The height, 18.93 m, is this package's sum of the base block and Kvant. Kvant 2, Kristall, Spektr, Priroda, the solar arrays and the forward node's own length are not drawn: the book sizes Kvant 2 and Kristall and puts them on lateral ports without saying which, names Spektr and Priroda as still to come, and gives array spans without a chord or a station along the axis. Both looks are the same two tubes. No name or mark is drawn. The country is left blank: the Soviet Union is not an ISO 3166-1 code in this list.",
};

export const MIR_VARIANTS: readonly Variant[] = [MIR];
