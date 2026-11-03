import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

export function RocketView({ look = "thick" }: { look?: "line" | "thick" | "painted" }) {
  return <UchusenRocket rocket="starship" variant="v3" show="apart" look={look} label="Starship Block 3, taken apart" />;
}
