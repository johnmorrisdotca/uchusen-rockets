import { check, variantOf, type Description, type FitReport, type LookName, type Variant } from "@johnmorrisdotca/uchusen-rockets";
import { build, type Built } from "@johnmorrisdotca/uchusen-rockets/build";
import type { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/element";

const description: Description = { rocket: "starship", variant: "v3" };
const report: FitReport = check(description);
const v3: Variant | undefined = variantOf("starship", "v3");
const rocket: Built = build(description);
console.log(report.ok, v3?.name, rocket.shows.length);

export function paint(element: UchusenRocket): void {
  element.setAttribute("look", "painted");
}

// @ts-expect-error "neon" is not a look
export const look: LookName = "neon";
