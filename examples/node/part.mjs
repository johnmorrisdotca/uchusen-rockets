import { partsOf } from "@johnmorrisdotca/uchusen-rockets";
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const zarya = partsOf("iss").find((part) => part.id === "zarya");
const svg = build({ rocket: "iss", variant: "iss" }).svg({ look: "line", part: "zarya" });
const picked = svg.includes('data-slot="zarya" opacity="1"') && svg.includes('opacity="0.28"');
console.log(`${zarya.name} ${zarya.nameJa} ${zarya.launched} ${zarya.height} ${picked}`);
