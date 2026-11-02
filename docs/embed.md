# Put a rocket on your own site

The drawings are made to be used. A page of yours can show the same rocket the demo shows, in any of six ways. The [demo](https://johnmorrisdotca.github.io/uchusen-rockets/) has a panel that copies the code for whatever is on the screen, and saves it as an SVG or a PNG.

| Way | When |
| --- | --- |
| CDN script and custom element | The page can run a script. One script tag, an import map for three.js, and the tag. |
| Embed page | The page cannot run a script. Use an iframe. |
| Module | You want the SVG from a script of your own. |
| SVG | You want the drawing itself. |
| Data address | You want it in an `<img>`, with no file of your own. |
| Image link | You want a plain `<img>` of a file in the package: the three-quarter view, with no flames. |

`embedCode(options, kind)` writes the snippet. `element`, `iframe`, `module`, `svg`, `data` and `link` are the kinds.

```ts
import { attributesFromOptions, embedCode, rocketFromParams, rocketToParams } from "@johnmorrisdotca/uchusen-rockets";

const options = { rocket: "starship", variant: "v3", look: "line", view: "three-quarter" };
embedCode(options, "element").includes("<uchusen-rocket"); // true
embedCode(options, "iframe").includes("embed.html"); // true
attributesFromOptions(options).rocket; // "starship"
rocketFromParams(rocketToParams(options)).view; // "three-quarter"
embedCode(options, "element").includes("importmap"); // true
embedCode(options, "link").includes("dist/assets/starship-v3.svg"); // true
```

## The embed page

For a page that cannot run script: an iframe of `embed.html` that draws what its address says. The query is the element's attributes. `engines=on` lights the engines in the embed the same way it does on the element.

```html
<iframe src="https://johnmorrisdotca.github.io/uchusen-rockets/embed.html?rocket=starship&variant=v3&look=line&view=three-quarter" title="Rocket" style="width:100%;max-width:480px;aspect-ratio:3 / 4;border:0"></iframe>
```

The page shows the drawing at once, and the 3D view when the browser can draw it. A painted model is fetched only when the address says `look=painted`, and always from the site itself. `phase=hot-staging` shows a phase of the flight, and `flight=1` adds the [flight's controls](flight.md).

## The credit travels with a painted rocket

The painted models stay under CC BY 4.0. `embedCode` asks `check` which parts are showing and writes their credit into every painted form: the element's caption, the iframe's caption, the module, the SVG's description and the data address. A line drawing has no such credit. A variant this package paints itself has none either, because no licensed model is used.

A rocket shown as one part credits that part. Ship alone does not credit the booster.

The element loads `three` only for a 3D view, and the CDN snippet's import map names the version this package is tested with. With a bundler, install the package and `three` and leave the map and the script out. To save a picture, the demo's Save PNG and Save SVG make a file of what is on the screen, and the credit is printed beside them: keep it with a painted rocket.
