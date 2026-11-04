// The fleet's badges: the fleet emblem, a round crest for each ship, the Romurusu class mark and a crew patch for each ship. The pictures are the .svg files in badges/ (made by hand, flat, two or three colours of the fleet's
// palette, crisp from 16 px to 512 px); svgs.ts holds them as strings and `pnpm badges` rewrites it. Ships place a badge on a hull later: nothing here touches a ship's model.
import { FLEET_PALETTE, type FleetColour } from "../../model/fleet/palette.ts";
import { BADGE_SVGS } from "./badges/svgs.ts";

/**
 * Hanabusa's registry number, which is still to come from John: one constant, so it is changed in one place. Its crew patch is drawn with the operator's name where the number will go; draw it again with the number (`scripts/badge-letters.ts` writes the letters) when it arrives.
 *
 * @example
 * ```ts
 * import { HANABUSA_REGISTRY } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(HANABUSA_REGISTRY);
 * ```
 */
export const HANABUSA_REGISTRY = "SPX-???";

/**
 * The ships that have badges.
 *
 * @example
 * ```ts
 * import { type BadgeShip } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ship: BadgeShip = "ariake";
 * console.log(ship);
 * ```
 */
export type BadgeShip = "kaminari" | "miyamoto" | "ariake" | "hanabusa";

/**
 * What a badge is: the fleet's emblem, a ship's crest, a class mark or a ship's crew patch.
 *
 * @example
 * ```ts
 * import { type BadgeKind } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kind: BadgeKind = "crest";
 * console.log(kind);
 * ```
 */
export type BadgeKind = "emblem" | "crest" | "class" | "patch";

/**
 * The words a ship's badges may show, all public.
 *
 * @example
 * ```ts
 * import { FLEET_BADGE_SHIPS, type BadgeShipInfo } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const info: BadgeShipInfo = FLEET_BADGE_SHIPS.kaminari;
 * console.log(info.name, info.kanji, info.ruby);
 * ```
 */
export interface BadgeShipInfo {
  /** The ship's id: the one in its badges' ids. */
  id: BadgeShip;
  /** The name as it is written in English. */
  name: string;
  /** The name in Japanese. */
  kanji: string;
  /** The reading in hiragana, where it is fixed (always shown with the name where there is one). */
  ruby?: string;
  /** The registry number. */
  registry: string;
  /** The class's name in English, for a ship of a named class. */
  className?: string;
  /** The class's name in Japanese. */
  classKanji?: string;
  /** The class code of the glossary: IHT, ICV or IXV. */
  classCode: "IHT" | "ICV" | "IXV";
  /** The one-line public meaning of the name. */
  meaning: string;
}

/**
 * The ships that have badges, with the public words each may show. Registry numbers are never explained and the characters of a name are never taken apart.
 *
 * @example
 * ```ts
 * import { FLEET_BADGE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_BADGE_SHIPS.kaminari.registry);
 * ```
 */
export const FLEET_BADGE_SHIPS: Readonly<Record<BadgeShip, BadgeShipInfo>> = {
  kaminari: { id: "kaminari", name: "Kaminari", kanji: "加美鳴", ruby: "かみなり", registry: "SPX-207", classCode: "IHT", meaning: "thunder" },
  miyamoto: { id: "miyamoto", name: "Miyamoto", kanji: "宮本", registry: "SPX-452", className: "Romurusu", classKanji: "ロムルス級", classCode: "ICV", meaning: "at the foot of the shrine" },
  ariake: { id: "ariake", name: "Ariake", kanji: "有明", ruby: "ありあけ", registry: "SPX-186", className: "Romurusu", classKanji: "ロムルス級", classCode: "ICV", meaning: "daybreak" },
  hanabusa: { id: "hanabusa", name: "Hanabusa", kanji: "花房", registry: HANABUSA_REGISTRY, classCode: "IXV", meaning: "flower cluster" },
};

/**
 * One badge: its picture and what it is.
 *
 * @example
 * ```ts
 * import { badge, type Badge } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const one: Badge | undefined = badge("crest-kaminari");
 * console.log(one?.kind, one?.colours);
 * ```
 */
export interface Badge {
  /** Its id, such as `crest-kaminari`. */
  id: string;
  /** Emblem, crest, class mark or crew patch. */
  kind: BadgeKind;
  /** The ship it belongs to; none for the fleet emblem and the class mark. */
  ship: BadgeShip | null;
  /** The class it marks (the Romurusu class mark only). */
  className: string | null;
  /** What the picture is called, as its title says. */
  name: string;
  /** The design in one line. */
  idea: string;
  /** The picture, as a complete SVG document. It has a `viewBox`, draws its words as paths and needs no font, no picture and no other file. */
  svg: string;
  /** The picture's size in its own units: the SVG's `viewBox`. */
  size: { width: number; height: number };
  /** The fleet palette's roles the picture is drawn in, in the palette's order. */
  colours: readonly FleetColour[];
}

const coloursOf = (svg: string): FleetColour[] => (Object.keys(FLEET_PALETTE) as FleetColour[]).filter((role) => svg.toLowerCase().includes(FLEET_PALETTE[role]));

const make = (id: string, kind: BadgeKind, ship: BadgeShip | null, idea: string, className: string | null = null): Badge => {
  const svg = BADGE_SVGS[id];
  if (!svg) throw new Error(`no picture for badge ${id}`);
  const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  if (!box) throw new Error(`badge ${id} has no viewBox`);
  return { id, kind, ship, className, name: /<title>([^<]*)<\/title>/.exec(svg)?.[1] ?? id, idea, svg, size: { width: Number(box[1]), height: Number(box[2]) }, colours: coloursOf(svg) };
};

/**
 * Every badge of the fleet: the emblem, four crests, the class mark and four crew patches.
 *
 * @example
 * ```ts
 * import { FLEET_BADGES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_BADGES.map((badge) => badge.id));
 * ```
 */
export const FLEET_BADGES: readonly Badge[] = [
  make("fleet-emblem", "emblem", null, "A four-pointed star on a tilted orbit in a ring, with the operator's name in a plate under it."),
  make("crest-kaminari", "crest", "kaminari", "One bolt breaking a ring: thunder."),
  make("crest-miyamoto", "crest", "miyamoto", "A torii over two crossed swords."),
  make("crest-ariake", "crest", "ariake", "A crescent moon on the horizon, the dawn rays behind it, the water below."),
  make("crest-hanabusa", "crest", "hanabusa", "Seven flowers in a round cluster."),
  make("class-romurusu", "class", null, "A wolf's face, front on, in a hexagon.", "Romurusu"),
  make("patch-kaminari", "patch", "kaminari", "The thunder crest, the name above it and the registry number below, in a shield."),
  make("patch-miyamoto", "patch", "miyamoto", "The torii crest, the name above it and the registry number below, in a shield."),
  make("patch-ariake", "patch", "ariake", "The dawn crest, the name above it and the registry number below, in a shield."),
  make("patch-hanabusa", "patch", "hanabusa", "The flower crest and the name above it, with the operator's name where the registry number will go, in a shield."),
];

/**
 * A badge by its id.
 *
 * @param id The badge's id, such as `crest-kaminari`.
 * @returns The badge, or `undefined` when there is none by that id.
 *
 * @example
 * ```ts
 * import { badge } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(badge("crest-ariake")?.idea, badge("nothing"));
 * ```
 */
export const badge = (id: string): Badge | undefined => FLEET_BADGES.find((one) => one.id === id);

/**
 * The badges of a ship: its crest and its crew patch.
 *
 * @param ship The ship's id.
 * @returns Its badges, in the order of `FLEET_BADGES`.
 *
 * @example
 * ```ts
 * import { badgesOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(badgesOf("miyamoto").map((one) => one.kind));
 * ```
 */
export const badgesOf = (ship: BadgeShip): readonly Badge[] => FLEET_BADGES.filter((one) => one.ship === ship);

/**
 * A badge's SVG drawn at a width, with its own proportions: for putting it in a page.
 *
 * @param id The badge's id.
 * @param width The width in pixels (the picture's own width when left out).
 * @returns The SVG document.
 * @throws When there is no badge by that id.
 *
 * @example
 * ```ts
 * import { badgeSvg } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(badgeSvg("fleet-emblem", 64).slice(0, 80));
 * ```
 */
export const badgeSvg = (id: string, width?: number): string => {
  const one = badge(id);
  if (!one) throw new Error(`no badge ${id}`);
  if (width === undefined) return one.svg;
  return one.svg.replace(/width="\d+" height="\d+"/, `width="${width}" height="${Number(((width * one.size.height) / one.size.width).toFixed(2))}"`);
};

/**
 * A badge as a `data:` address, to use as an image's `src` or a CSS background.
 *
 * @param id The badge's id.
 * @returns The address.
 * @throws When there is no badge by that id.
 *
 * @example
 * ```ts
 * import { badgeUri } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(badgeUri("class-romurusu").startsWith("data:image/svg+xml,"));
 * ```
 */
export const badgeUri = (id: string): string => `data:image/svg+xml,${encodeURIComponent(badgeSvg(id))}`;
