import "@johnmorrisdotca/uchusen-rockets/element";
import { variantOf } from "@johnmorrisdotca/uchusen-rockets";

const rocket = document.querySelector("uchusen-rocket")!;
rocket.setAttribute("label", `${variantOf("falcon-9", "block-5")?.name}, drawn from sourced sizes`);
