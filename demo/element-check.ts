// The element on a plain page, for the browser tests.
import { setAssetBase } from "../src/element.ts";

setAssetBase(new URL("assets/", document.baseURI).href);
