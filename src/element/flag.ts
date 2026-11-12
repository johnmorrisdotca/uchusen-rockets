// A country's flag for the `flags` attribute, from @johnmorrisdotca/hata, an optional peer loaded only when a flag is first wanted. Without it, or when it fails to load, there is no flag and nothing is logged.

/**
 * What the element takes from hata's `/load` entry: a flag's SVG by its code. Written out here, so no type of this package reaches the optional peer.
 *
 * @example
 * ```ts
 * import type { FlagSource } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * const none: FlagSource = { flag: () => Promise.resolve(null) };
 * console.log(await none.flag("US"));
 * ```
 */
export interface FlagSource {
  flag(code: string, options?: { shape?: "4:3" | "1:1" | "round" }): Promise<string | null>;
}

let loader: () => Promise<FlagSource> = () => import("@johnmorrisdotca/hata/load");
let loaded: Promise<FlagSource | null> | undefined;

/**
 * Where the flags come from, if a page wants to hand them over itself (before the first element with `flags` connects): a module with hata's `flag(code, { shape })`, such as one that imports only the flags the page shows.
 *
 * @param load Returns hata's `/load` entry, or a module with the same `flag`, as a promise.
 * @example
 * ```ts no-run
 * import { setFlagLoader } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * setFlagLoader(() => import("@johnmorrisdotca/hata/load"));
 * ```
 */
export function setFlagLoader(load: () => Promise<FlagSource>): void {
  loader = load;
  loaded = undefined;
}

/** A country's flag at 4:3 as SVG markup, or null when hata is not there, failed to load or has no flag for the code. It never rejects. */
export function flagSvg(code: string): Promise<string | null> {
  loaded ??= loader().catch(() => null);
  return loaded.then((hata) => (hata ? hata.flag(code, { shape: "4:3" }) : null)).catch(() => null);
}
