// The embed page: it draws what its address says, for a site that cannot run script of its own. The address is read as text.
import { attributesFromOptions, paintedCredit, rocketFromParams, type RocketOptions } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { PAGE_LOOK } from "./chip.ts";
import { frameCredit } from "./frame-credit.ts";

setAssetBase(new URL("assets/", document.baseURI).href);

const params = new URLSearchParams(location.search);
frameCredit(params.get("lang") === "ja");
const asked = rocketFromParams(params);
// the models come from this site, whatever an address says
delete asked.assets;
const options: RocketOptions = { rocket: "starship", variant: "v3", show: "together", look: PAGE_LOOK, view: "three-quarter", spin: "off", ...asked };
const rocket = document.getElementById("rocket") as UchusenRocket;
for (const [name, value] of Object.entries(attributesFromOptions(options))) rocket.setAttribute(name, value);
const credit = paintedCredit(options);
const node = document.getElementById("credit");
if (credit !== "" && node) {
  node.hidden = false;
  node.textContent = credit;
}
if (window.self === window.top) {
  const open = document.getElementById("open-in");
  const link = document.getElementById("open-in-link");
  if (open && link instanceof HTMLAnchorElement) {
    open.hidden = false;
    link.href = `embed-page.html${location.search}`;
  }
}
if (params.get("flight") === "1") {
  const bar = document.createElement("uchusen-flight");
  bar.setAttribute("for", "rocket");
  bar.dataset.testid = "flight";
  rocket.after(bar);
}
queueMicrotask(() => {
  document.documentElement.dataset.ready = "true";
});
