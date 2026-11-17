// The names and registry numbers of the small craft, in one map. They come from the owner: until he gives them, each craft shows the plain placeholder and no number, and nothing else in the package spells a
// craft's name. Pure: no three.js and no DOM.

/** The six craft of the family, by the id the code uses. */
export const ATC_IDS = ["crew-shuttle", "cargo-tug", "rescue-cutter", "survey-lander", "survey-drone", "eva-pod"] as const;
export type AtcId = (typeof ATC_IDS)[number];

/** A craft's public name and its registry number (`null` until one is given). */
export interface AtcName {
  name: string;
  number: string | null;
}

/** The single names map. Replace a row to name a craft; every card, label and table reads from here. */
export const ATC_NAMES: Readonly<Record<AtcId, AtcName>> = {
  "crew-shuttle": { name: "ATC crew shuttle", number: null },
  "cargo-tug": { name: "ATC cargo tug", number: null },
  "rescue-cutter": { name: "ATC rescue cutter", number: null },
  "survey-lander": { name: "ATC survey lander", number: null },
  "survey-drone": { name: "ATC survey drone", number: null },
  "eva-pod": { name: "ATC EVA work pod", number: null },
};
