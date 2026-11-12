// Whose models the painted parts are made from. Each is under Creative Commons Attribution 4.0, or CC0 or public domain where the row says so, and each assembled rocket's credits are generated from these rows, so an author is credited exactly for
// what is used. The package's code is MIT; these assets are not: see NOTICE.md.

/**
 * The credit for one licensed model: its title, its creator and their page, where it came from, its licence and what this package changed.
 *
 * @example
 * ```ts
 * import { MODEL_CREDITS, type ModelCredit } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const credit: ModelCredit = MODEL_CREDITS["clarence365-block3"];
 * console.log(credit.creator, credit.licence);
 * ```
 */
export interface ModelCredit {
  title: string;
  creator: string;
  creatorUrl: string;
  sourceUrl: string;
  licence: "CC BY 4.0" | "CC0 1.0" | "Public domain (NASA)";
  licenceUrl: string;
  /** What this package changed. */
  changes: string;
}

const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

/** One of NASA's own models: its source named, with no suggestion that NASA endorses anything. See NOTICE.md for what this rests on. */
const nasa = (title: string, slug: string, changes: string): ModelCredit => ({
  title,
  creator: "NASA",
  creatorUrl: "https://science.nasa.gov/3d-resources/",
  sourceUrl: slug.startsWith("https://") ? slug : `https://data.nasa.gov/dataset/${slug}`,
  licence: "Public domain (NASA)",
  licenceUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  changes,
});

/**
 * Every licensed model this package paints with, by credit id. A painted rocket must carry the credit of the parts that are showing; `embedCode` writes it for you.
 *
 * @example
 * ```ts
 * import { MODEL_CREDITS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(MODEL_CREDITS).length > 10);
 * ```
 */
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
  "nasa-shuttle-hi-res": nasa("Shuttle (Hi-Res)", "nasa-3d-models-shuttle-hi-res", "The agency mark, the flag, the country's name and the rest of the lettering painted out of its pictures; its open bay closed with its own doors and what was inside it left out; its engines put in place; reduced; rescaled to the sourced length; stood upright; its materials made into one picture."),
  "nasa-shuttle-parts": nasa("Shuttle Parts (Hi-Res)", "nasa-3d-models-shuttle-parts-hi-res", "Its external tank and solid rocket booster only; rescaled to the sourced lengths; stood upright; its materials made into one picture; its pictures shrunk."),
  "nasa-lunar-module": nasa("Apollo Lunar Module", "nasa-3d-models-apollo-lunar-module", "The flag and the country's name removed with the two plates that carried them; reduced from 97,588 triangles; rescaled to the sourced height; separated into its two stages; its materials made into one picture."),
  "nasa-apollo-soyuz": nasa("Apollo Soyuz", "nasa-3d-models-apollo-soyuz", "The flags and the countries' names painted out of its pictures; reduced from 32,996 triangles; rescaled to the sourced lengths and widths; stood on end; separated into its three craft; its materials made into one picture."),
  "nasa-gemini": nasa("Gemini", "nasa-3d-models-gemini", "The flag and the country's name painted out of its picture; reduced from 38,840 triangles; rescaled to the sourced length; separated into adapter and capsule; its materials made into one picture."),
  "nasa-friendship-7": nasa("Friendship 7", "nasa-3d-models-friendship-7", "Reduced from 164,622 triangles; rescaled to the sourced length and width; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs. It carried no mark to remove."),
  "nasa-jupiter-c": nasa("Jupiter-C", "nasa-3d-models-jupiter-c", "The lettering removed with the two pictures that carried it, which are plain white here; rescaled to the sourced height; separated into its tail unit, Redstone body, spinning tub and top stage by its own named objects; its materials made into one picture a part."),
  "nasa-iss": nasa("ISS", "nasa-3d-models-iss", "Reduced from 174,440 triangles; a ball of stray pieces far above it left out; rescaled to the sourced length; separated into its modules, truss segments, arrays, radiators and visiting craft by where each stands; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs. It carried no mark to remove."),
  "robo-reboot-hubble": {
    title: "Hubble space telescope",
    creator: "Cybertron B-127",
    creatorUrl: "https://sketchfab.com/robo-reboot",
    sourceUrl: "https://sketchfab.com/3d-models/hubble-space-telescope-e22236fab9634c959c0525c7ab9c83d7",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "The agency's wordmark and the agencies' logos painted out of its picture, the agency's logo decal and a lettered plate left out; rescaled to the sourced length and width; its aperture door turned shut; separated into its aft shroud, equipment section, forward shell, light shield, aperture door, two solar arrays and two high-gain antennas; its materials made into one picture a part.",
  },
  "w29572227-tiangong": {
    title: "tianGong",
    creator: "w29572227",
    creatorUrl: "https://sketchfab.com/w29572227",
    sourceUrl: "https://sketchfab.com/3d-models/tiangong-aca22b1dd6d242c1ae7b88de2f483b77",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "The flags and the agency's mark left out with the picture that carried them; reduced from 4,425,408 triangles; stood on end; each module and craft rescaled to its own sourced length and width; separated into Tianhe, its node, Wentian, Mengtian, the three pairs of solar wings, two Shenzhou and a Tianzhou; its materials made into one picture a part.",
  },
  "nasa-cluster-ii": nasa("Cluster II", "https://science.nasa.gov/3d-resources/cluster-ii/", "Only the drum, its lid and the instruments on it kept, the booms left out; turned over so its gold foil faces down; squeezed to a third of its height and a third of its size across; its materials made into one picture with this package's own. No mark was on it."),
  "nasa-insight": nasa("InSight Cruise and Lander, arm deployed", "https://science.nasa.gov/3d-resources/insight-cruise-lander/", "Only the arm's links, its five-claw grapple and a leg kept; each moved and scaled to the drone's arms; its materials made into one picture with this package's own. The lettering and flag plates were left out."),
  "nasa-curiosity": nasa("Curiosity Rover (Detailed)", "https://science.nasa.gov/3d-resources/curiosity-rover-detailed/", "Only the arm's two links, its tool turret and a swivel kept, from NASA's printable parts (STL, no textures); painted by this package; moved and scaled to the drone's arms. No mark was on it."),
  "nasa-hete": nasa("High Energy Transient Explorer", "https://science.nasa.gov/3d-resources/high-energy-transient-explorer/", "Its body kept as the drone's equipment block, turned and scaled; its materials made into one picture with this package's own. No mark was on it."),
  "nasa-grease-gun": nasa("Grease Gun", "https://science.nasa.gov/3d-resources/grease-gun/", "Scaled from millimetres to the drone's welding tool and given a welding nozzle of this package's own; its materials made into one picture. No mark was on it."),
  "the86guy-roadster": {
    title: "2008 Roadster",
    creator: "the 86 guy",
    creatorUrl: "https://sketchfab.com/the_86_guy",
    sourceUrl: "https://sketchfab.com/3d-models/2008-tesla-roadster-317dabbe5e824948a92091f7bd39c2de",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 502,492 triangles; the badges, lettering and dial faces removed with the materials that carried them; the roof panel, the lamps' insides and the wheel nuts left out; rescaled to the sourced length; the bonnet made bare carbon; materials merged and renamed.",
  },
  "metarex4d-roadster": {
    title: "Roadster 2020",
    creator: "metarex.4d",
    creatorUrl: "https://sketchfab.com/metarex.4d",
    sourceUrl: "https://sketchfab.com/3d-models/tesla-roadster-2020-1fbf29e297bd4a17ac39a00a378441d8",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 608,850 triangles; the badge on the nose, the lettering on the tail and the marks on the wheels and the steering wheel removed; its textures left out; rescaled to the sourced wheelbase; repainted in the first generation's red; materials merged and renamed.",
  },
  "gmmichaelonearth-roadster": {
    title: "Roadster 2.0 (Will be enchanced soon)",
    creator: "Michael (gmmichaelonearth)",
    creatorUrl: "https://sketchfab.com/gmmichaelonearth",
    sourceUrl: "https://sketchfab.com/3d-models/tesla-roadster-20-will-be-enchanced-soon-8d5da3904e434fc3830edf558cb9014d",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Reduced from 552,876 triangles; the wheels' middle caps, which carry a mark, removed; its body's picture shrunk and its white made the first generation's red; rescaled to the sourced wheelbase; materials merged and renamed. Its wheels are minchou19's, credited on their own.",
  },
  "minchou19-wheels": {
    title: "Roadster fly wheels",
    creator: "minchou19",
    creatorUrl: "https://sketchfab.com/minchou19",
    sourceUrl: "https://sketchfab.com/3d-models/tesla-roadster-fly-wheels-31a0476f5fd14fc282e799b8ae4ae4f3",
    licence: "CC BY 4.0",
    licenceUrl: LICENCE_URL,
    changes: "Used as Michael's model has them, on its second-generation Roadster: their middle caps, which carry a mark, removed; reduced; rescaled with the car; materials merged and renamed.",
  },
  "nasa-voyager": nasa("Voyager Probe (A)", "https://science.nasa.gov/3d-resources/voyager-probe-a/", "The record's marked face removed; reduced from 29,911 triangles; rescaled so the high-gain antenna is the sourced 3.7 m; plain colours kept."),
  "nasa-juno": nasa("Juno (B)", "https://science.nasa.gov/3d-resources/juno-b/", "Reduced from 29,856 triangles; rescaled so the arrays' tip-to-tip is the sourced 20 m; plain colours kept. It carried no mark to remove."),
  // new rows go here
} as const satisfies Record<string, ModelCredit>;

/**
 * The id of one model's credit in `MODEL_CREDITS`.
 *
 * @example
 * ```ts
 * import type { CreditId } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const id: CreditId = "clarence365-block3";
 * console.log(id);
 * ```
 */
export type CreditId = keyof typeof MODEL_CREDITS;

/**
 * One credit as a line of text.
 *
 * @param id The id of a credit in `MODEL_CREDITS`.
 * @returns The credit as one line of text.
 * @example
 * ```ts
 * import { creditLine } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(creditLine("clarence365-block3"));
 * ```
 */
export function creditLine(id: CreditId): string {
  const c: ModelCredit = MODEL_CREDITS[id];
  return `"${c.title}" by ${c.creator} (${c.sourceUrl}), ${c.licence} (${c.licenceUrl}). ${c.changes}`;
}
