// A thin React wrapper round `<uchusen-rocket>`.
import { createElement, type HTMLAttributes, type Ref, useEffect } from "react";
import type { Description } from "./fit.ts";
import type { ViewName } from "./framing.ts";
import type { LookName } from "./looks.ts";

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
  /** A phase of the rocket's flight, by its id. */
  phase?: string;
  ref?: Ref<HTMLElement>;
}

export function UchusenRocket({ build, ...rest }: UchusenRocketProps) {
  useEffect(() => {
    void import("./element.ts");
  }, []);
  return createElement("uchusen-rocket", { ...rest, build: build ? JSON.stringify(build) : undefined });
}
