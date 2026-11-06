// A thin React wrapper round `<uchusen-rocket>`.
import { createElement, type HTMLAttributes, type Ref, useEffect } from "react";
import type { Description } from "./fit.ts";
import type { ViewName } from "./framing.ts";
import type { LookName } from "./looks.ts";

/**
 * The props of the React wrapper: the element's attributes as props (`rocket`, `variant`, `show`, `look`, `view`, `mode`, `assets`, `spin`, `way`, `label`, `engines`, `lights`, `phase`), `build` as an object, and any other HTML attribute.
 *
 * @example
 * ```ts
 * import type { UchusenRocketProps } from "@johnmorrisdotca/uchusen-rockets/react";
 *
 * const props: UchusenRocketProps = { rocket: "starship", variant: "v3", look: "thick" };
 * console.log(props);
 * ```
 */
export interface UchusenRocketProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
  rocket?: string;
  variant?: string;
  /** "together", "apart" or a part's slot, such as "booster". */
  show?: string;
  look?: LookName;
  view?: ViewName;
  /** A rocket from parts. */
  build?: Description;
  mode?: "auto" | "drawing";
  assets?: string;
  spin?: string | number;
  way?: "cw" | "ccw";
  label?: string;
  /** "on" lights the engines, and a reader who asked for reduced motion has them off. */
  engines?: "on" | "off";
  /** "off", "running" or "all". Left out, the lamps are all on. Reduced motion holds a flash steady. */
  lights?: "off" | "running" | "all";
  /** A phase of the rocket's flight, by its id. */
  phase?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * A thin React wrapper round `<uchusen-rocket>`. It loads the element on first use, so server rendering draws only the tag.
 *
 * @param props The props. `build` is turned into the element's JSON attribute; the rest go through as they are.
 * @returns The `<uchusen-rocket>` element. It is never null or undefined.
 * @example
 * ```tsx no-run
 * import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";
 *
 * export const Hero = () => <UchusenRocket rocket="falcon-9" variant="block-5" look="painted" />;
 * console.log(typeof UchusenRocket);
 * ```
 */
export function UchusenRocket({ build, ...rest }: UchusenRocketProps) {
  useEffect(() => {
    void import("./element.ts");
  }, []);
  return createElement("uchusen-rocket", { ...rest, build: build ? JSON.stringify(build) : undefined });
}
