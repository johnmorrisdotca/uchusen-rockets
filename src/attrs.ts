// A rocket's options as text: the attributes of `<uchusen-rocket>` and the query of `embed.html` are the same words, read by one function and written by another.

export const OPTION_ATTRIBUTES = ["rocket", "variant", "show", "look", "view", "build", "mode", "spin", "way", "label", "assets", "engines"] as const;

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
}

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/** The attributes that draw these options. Empty values are left out. */
export function attributesFromOptions(options: RocketOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of OPTION_ATTRIBUTES) {
    const value = text(options[name]);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

/** The options `read` finds. A missing attribute is left out; nothing here is trusted as a real rocket. */
export function optionsFromAttributes(read: (name: string) => string | null): RocketOptions {
  const options: RocketOptions = {};
  for (const name of OPTION_ATTRIBUTES) {
    const value = read(name);
    if (value !== null && value !== "") options[name] = value;
  }
  return options;
}

/** The options as a query for `embed.html`. */
export function rocketToParams(options: RocketOptions): URLSearchParams {
  return new URLSearchParams(attributesFromOptions(options));
}

/** The options a query names. */
export function rocketFromParams(params: URLSearchParams): RocketOptions {
  return optionsFromAttributes((name) => params.get(name));
}
