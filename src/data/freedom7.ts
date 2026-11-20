// Freedom 7. The length and the diameter are the early-years summary's table, read 2026-11-19: 2.9 m by 1.9 m. Friendship 7 keeps the spacecraft article's 3.3 m by 1.8 m.
import { type Variant } from "./types.ts";

const E = "nasa-early-years" as const;

/** 2.9 m, the table's length. */
export const FREEDOM_LENGTH = 2.9;
/** 1.9 m, the table's diameter. */
export const FREEDOM_WIDTH = 1.9;

export const FREEDOM_VARIANTS: readonly Variant[] = [
  {
    id: "freedom-7",
    rocket: "freedom-7",
    name: "Freedom 7",
    status: "flown",
    firstFlight: { value: "1961-05-05", source: E, note: "The first crewed Mercury. Friendship 7, on Mercury-Atlas 6, flew on 1962-02-20." },
    slots: ["capsule"],
    note: "NASA's model in the painted look. The file is a little taller for its width than the table, so the length and the width are scaled on their own: 2.9 m long and 1.9 m across. Those are the early-years table, not Friendship 7's 3.3 m by 1.8 m, which are the spacecraft article's and stay on that variant. The line look is this package's own capsule outline at the table's two sizes. NASA's copy leaves its materials all one grey, and that grey is kept. No name or flag is drawn. Maker NASA, country the United States.",
    facts: {
      height: { value: FREEDOM_LENGTH, source: E, note: "2.9 metres (9.5 feet), the table. Friendship 7 is drawn at 3.3 m, from the spacecraft article." },
      diameter: { value: FREEDOM_WIDTH, source: E, note: "1.9 metres (6.2 feet), the table. Friendship 7 is drawn at 1.8 m." },
      parts: { capsule: { value: FREEDOM_LENGTH, source: E, note: "2.9 metres, the table, without the escape tower." } },
      engines: {},
      more: {},
      sizes: {
        Length: { value: FREEDOM_LENGTH, source: E, note: "2.9 metres (9.5 feet), the table." },
        Diameter: { value: FREEDOM_WIDTH, source: E, note: "1.9 metres (6.2 feet), the table." },
      },
    },
  },
];
