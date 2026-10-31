// The embed page: it draws what its address says, for a site that cannot run script of its own. The address is read as text.
import { attributesFromOptions, paintedCredit, rocketFromParams, type RocketOptions } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";

setAssetBase(new URL("assets/", document.baseURI).href);

const asked = rocketFromParams(new URLSearchParams(location.search));
const options: RocketOptions = { rocket: "starship", variant: "v3", show: "together", look: "line", view: "three-quarter", spin: "off", ...asked };
const rocket = document.getElementById("rocket") as UchusenRocket;
for (const [name, value] of Object.entries(attributesFromOptions(options))) rocket.setAttribute(name, value);
const credit = paintedCredit(options);
const node = document.getElementById("credit");
if (credit !== "" && node) {
  node.hidden = false;
  node.textContent = credit;
}
queueMicrotask(() => {
  document.documentElement.dataset.ready = "true";
});
