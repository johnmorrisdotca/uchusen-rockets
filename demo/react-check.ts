// The React wrapper on a page of its own, for the browser tests.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { setAssetBase } from "../src/element.ts";
import { UchusenRocket } from "../src/react.ts";

setAssetBase(new URL("assets/", document.baseURI).href);
const node = document.getElementById("root");
if (node) createRoot(node).render(createElement(UchusenRocket, { rocket: "starship", variant: "v3", show: "ship", look: "thick", mode: "drawing", id: "react-rocket" }));
