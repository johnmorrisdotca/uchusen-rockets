// A rocket's options as text: the attributes of `<uchusen-rocket>` and the query of `embed.html` are the same words, read by one function and written by another.

/**
 * The attributes of `<uchusen-rocket>` that choose what is drawn, in the order the demo writes them. The `embed.html` query uses the same words.
 *
 * @example
 * ```ts
 * import { OPTION_ATTRIBUTES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(OPTION_ATTRIBUTES.join(", "));
 * ```
 */
export const OPTION_ATTRIBUTES = ["rocket", "variant", "show", "look", "view", "build", "mode", "spin", "way", "label", "assets", "engines", "lights", "phase", "motion"] as const;

/**
 * Every choice that draws a rocket, as plain text: the same names and values as the element's attributes. Nothing here is trusted. A value outside its list falls back to a default when it is drawn.
 *
 * @example
 * ```ts
 * import type { RocketOptions } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const options: RocketOptions = { rocket: "falcon-9", variant: "block-5", look: "thick", view: "below" };
 * console.log(options);
 * ```
 */
export interface RocketOptions {
  rocket?: string;
  variant?: string;
  show?: string;
  look?: string;
  view?: string;
  /** A rocket from parts, as JSON. The same text as the `build` attribute. */
  build?: string;
  mode?: string;
  spin?: string;
  way?: string;
  label?: string;
  assets?: string;
  /** `on` lights every engine that is showing. `off` leaves them dark. Left out, the element follows reduced motion. */
  engines?: string;
  /** `off` puts the lamps out. `running` is the position lights, the white flash and the red beacon. `all` adds the floods and the work lights. Left out, the lamps are all on. */
  lights?: string;
  /** A phase of the rocket's flight, by its id: the engines that burn there. */
  phase?: string;
  /** `on` moves the moving parts of a fleet ship (rings, doors, arrays, dishes) at their real speed, `fast` at ten times. `off` or left out keeps them still; a reader who asked for reduced motion always gets them still. */
  motion?: string;
}

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/**
 * The attributes that draw these options. Empty values are left out.
 *
 * @param options The choices to turn into attributes.
 * @returns The attributes by name, as text. A choice left out or empty has no entry.
 * @example
 * ```ts
 * import { attributesFromOptions } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(attributesFromOptions({ rocket: "starship", variant: "v3", look: "painted", show: "" }));
 * ```
 */
export function attributesFromOptions(options: RocketOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of OPTION_ATTRIBUTES) {
    const value = text(options[name]);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

/**
 * The options `read` finds. A missing attribute is left out; nothing here is trusted as a real rocket.
 *
 * @param read Reads one attribute by name and gives null when it is missing, as `element.getAttribute` does.
 * @returns The choices found, as written. A missing attribute is left out of the result.
 * @example
 * ```ts
 * import { optionsFromAttributes } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const attributes: Record<string, string> = { rocket: "starship", look: "thick" };
 * console.log(optionsFromAttributes((name) => attributes[name] ?? null));
 * ```
 */
export function optionsFromAttributes(read: (name: string) => string | null): RocketOptions {
  const options: RocketOptions = {};
  for (const name of OPTION_ATTRIBUTES) {
    const value = read(name);
    if (value !== null && value !== "") options[name] = value;
  }
  return options;
}

/**
 * The options as a query for `embed.html`.
 *
 * @param options The choices to write.
 * @returns A query for `embed.html`, with one entry for each choice made.
 * @example
 * ```ts
 * import { rocketToParams } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(rocketToParams({ rocket: "falcon-9", show: "apart" }).toString());
 * ```
 */
export function rocketToParams(options: RocketOptions): URLSearchParams {
  return new URLSearchParams(attributesFromOptions(options));
}

/**
 * The options a query names.
 *
 * @param params The query of an `embed.html` address.
 * @returns The choices the query names.
 * @example
 * ```ts
 * import { rocketFromParams } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(rocketFromParams(new URLSearchParams("rocket=falcon-9&look=thick")));
 * ```
 */
export function rocketFromParams(params: URLSearchParams): RocketOptions {
  return optionsFromAttributes((name) => params.get(name));
}
