// Whose models the painted parts are made from. Each is under Creative Commons Attribution 4.0, and each assembled rocket's credits are generated from these rows, so an author is credited exactly for
// what is used. The package's code is MIT; these assets are not: see NOTICE.md.

export interface ModelCredit {
  title: string;
  creator: string;
  creatorUrl: string;
  sourceUrl: string;
  licence: "CC BY 4.0";
  licenceUrl: string;
  /** What this package changed. */
  changes: string;
}

const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

export const MODEL_CREDITS = {
  "clarence365-block3": {
    title: "SpaceX Starship Block 3",
    creator: "Clarence365",
    creatorUrl: "https://sketchfab.com/clarence365",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 913,217 triangles; logos, wordmark and serial number removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed.",
  },
  "clarence365-s24b7": {
    title: "Spacex Starship Ship 24 & Booster 7 V4",
    creator: "clarence365",
    creatorUrl: "https://sketchfab.com/clarence365",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 870,993 triangles; logo, serial number and engine decals removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed.",
  },
  "martiandays-2019": {
    title: "SpaceX Starship",
    creator: "MartianDays",
    creatorUrl: "https://sketchfab.com/MartianDays",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-starship-a8a0b69f776841a1a465cd9fb3762fd2",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Rescaled to the sourced height; turned to this package's axes; material renamed. Its triangles and images are otherwise unchanged.",
  },
} as const satisfies Record<string, ModelCredit>;

export type CreditId = keyof typeof MODEL_CREDITS;

/** One credit as a line of text. */
export function creditLine(id: CreditId): string {
  const c: ModelCredit = MODEL_CREDITS[id];
  return `"${c.title}" by ${c.creator} (${c.sourceUrl}), ${c.licence} (${c.licenceUrl}). ${c.changes}`;
}
