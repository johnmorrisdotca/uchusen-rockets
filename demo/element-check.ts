// The element on a plain page, for the browser tests. `?flags=none` stands in for a page without hata: the flags' import fails.
import { setAssetBase, setFlagLoader } from "../src/element.ts";

setAssetBase(new URL("assets/", document.baseURI).href);
setFlagLoader(new URLSearchParams(location.search).get("flags") === "none" ? () => Promise.reject(new Error("hata is not installed")) : () => import("./flags.ts"));
