// Whose models the painted parts are made from. Each is under Creative Commons Attribution 4.0, or CC0 where the row says so, and each assembled rocket's credits are generated from these rows, so an author is credited exactly for
// what is used. The package's code is MIT; these assets are not: see NOTICE.md.

export interface ModelCredit {
  title: string;
  creator: string;
  creatorUrl: string;
  sourceUrl: string;
  licence: "CC BY 4.0" | "CC0 1.0";
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
  "stanley-falcon-9": {
    title: "Falcon 9 - SpaceX",
    creator: "Stanley Creative",
    creatorUrl: "https://sketchfab.com/Stanley_Creative",
    sourceUrl: "https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 157,889 triangles; the wordmark, logos, flags and mission marks removed with the two textures that carried them; rescaled to sourced sizes; separated into first stage, second stage and fairing; materials merged and renamed.",
  },
  "kubaha-dragon-2": {
    title: "SpaceX - Dragon 2",
    creator: "KUBAHA",
    creatorUrl: "https://sketchfab.com/KUBAHA",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 42,974 triangles; rescaled to sourced sizes; separated into capsule and trunk; materials merged and renamed.",
  },
  "progressth-dragon-1": {
    title: "SpaceX Cargo Dragon",
    creator: "ProgressTH",
    creatorUrl: "https://sketchfab.com/ProgressTH",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-cargo-dragon-0ca8951e47b343dc8a41e23b3e9c55e5",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Merged from 414 meshes; the logo decal and the hidden pressure vessel removed; rescaled to sourced sizes; stood upright; separated into capsule and trunk; materials merged and renamed.",
  },
  "antonio-falcon-heavy": {
    title: "SpaceX Falcon Heavy(Low Poly)",
    creator: "Antonio_Adams",
    creatorUrl: "https://sketchfab.com/AAdams3112",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-falcon-heavylow-poly-0dc068a462e34258b3872085a7f592c8",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "The wordmark and logos painted out of its colour, roughness and normal maps, which were also resized; rescaled to sourced sizes; separated into its centre core and two side boosters by its own connected pieces.",
  },
  "echo3-grasshopper": {
    title: "SpaceX Grasshopper",
    creator: "Echo_3",
    creatorUrl: "https://sketchfab.com/Echo_3",
    sourceUrl: "https://sketchfab.com/3d-models/spacex-grasshopper-35c07a68cdb246c59bb425610b934bf8",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "The wordmark and logo removed with the texture that carried them; rescaled to the sourced height; reduced from 55,455 triangles; materials merged and renamed.",
  },
  "smithsonian-discovery": {
    title: "Orbiter, Space Shuttle, OV-103, Discovery",
    creator: "Smithsonian Institution, National Air and Space Museum",
    creatorUrl: "https://3d.si.edu/",
    sourceUrl: "https://3d.si.edu/object/3d/orbiter-space-shuttle-ov-103-discovery:d8c636ce-4ebc-11ea-b77f-2e728ce88125",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    changes: "The agency mark, the flags, the country's name and the orbiter's name painted out of its picture; reduced from 150,000 triangles; its pictures shrunk; stood upright and scaled to the sourced length; materials renamed.",
  },
} as const satisfies Record<string, ModelCredit>;

export type CreditId = keyof typeof MODEL_CREDITS;

/** One credit as a line of text. */
export function creditLine(id: CreditId): string {
  const c: ModelCredit = MODEL_CREDITS[id];
  return `"${c.title}" by ${c.creator} (${c.sourceUrl}), ${c.licence} (${c.licenceUrl}). ${c.changes}`;
}
