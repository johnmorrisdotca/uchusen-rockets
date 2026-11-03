import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

// A server draws the same SVG a browser does: pure, no DOM, no three.js.
const rocket = build({ rocket: "falcon-9", variant: "block-5" });
const svg = rocket.svg({ look: "thick", view: "front" });
const height = variantOf("falcon-9", "block-5")?.facts.height;
console.log(svg.startsWith("<svg"), height?.value, "m, from", height?.source ? SOURCES[height.source].publisher : "no source");
