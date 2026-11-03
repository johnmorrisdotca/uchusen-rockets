---
title: Put a rocket on your own site
section: how-to
order: 7
description: Six ways to copy a rocket into a page, from a script tag to a plain image, and how a painted rocket's credit travels with it.
---

The drawings are made to be used. A page of yours can show the same rocket the demo shows, in any of six ways. The demo has a panel that copies the code for whatever is on the screen, and saves it as an SVG or a PNG.

Picture: [The embed page: a rocket drawn from its address, with nothing else.](https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/embed.jpg)

| Way | When |
| --- | --- |
| `element` | The page can run a script. One script tag, an import map for three.js and the tag. |
| `iframe` | The page cannot run a script. An iframe of the embed page. |
| `module` | You want the SVG from a script of your own. |
| `svg` | You want the drawing itself. |
| `data` | You want it in an `<img>` with no file of your own. |
| `link` | A plain `<img>` of a file in the package: the three-quarter view, with no flames. |

## Write the code

`embedCode(options, kind)` writes the snippet.

```ts
import { EMBED_KINDS, embedCode } from "@johnmorrisdotca/uchusen-rockets";

const options = { rocket: "starship", variant: "v3", look: "line", view: "three-quarter" };
for (const kind of EMBED_KINDS) console.log(kind.padEnd(8), embedCode(options, kind).slice(0, 70).replaceAll("\n", " "));
```

## The embed page

For a page that cannot run script: an iframe of `embed.html` that draws what its address says. The query is the element's attributes, and `rocketToParams` and `rocketFromParams` convert between options and a query.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Uchusen Rockets in an iframe</title>
  </head>
  <body>
    <iframe
      src="https://johnmorrisdotca.github.io/uchusen-rockets/embed.html?rocket=starship&variant=v3&look=line"
      title="Starship Block 3"
      style="width: 100%; max-width: 480px; aspect-ratio: 3 / 4; border: 0"
      loading="lazy"
    ></iframe>
  </body>
</html>
```

```ts
import { rocketFromParams, rocketToParams } from "@johnmorrisdotca/uchusen-rockets";

const query = rocketToParams({ rocket: "falcon-9", variant: "block-5", show: "apart" });
console.log(query.toString(), rocketFromParams(query));
```

The embed shows the drawing at once and the 3D view when the browser can draw it. A painted model is fetched only when the address says `look=painted`, and always from the site itself. If you host your own copy, `embedCode`'s third argument, `{ site, cdn }`, points the code at it.

## The credit travels with a painted rocket

The painted models stay under CC BY 4.0, or are public domain where the row says so. `embedCode` asks `check` which parts are showing and writes their credit into every painted form: the element's caption, the iframe's caption, the module, the SVG's description and the data address.

```ts
import { paintedCredit } from "@johnmorrisdotca/uchusen-rockets";

console.log(paintedCredit({ rocket: "starship", variant: "v3", look: "painted" }));
console.log(JSON.stringify(paintedCredit({ rocket: "starship", variant: "v3", look: "line" })));
```

A line drawing has no such credit, and a variant this package paints itself has none either. A rocket shown as one part credits that part only. If you save a picture from the demo, keep the credit it prints beside the file.

## A picture with no script at all

`assetPathOf` names the shipped drawing for a set of options, under `dist/assets/` in the package. A bundler or a CDN can serve it as it is.

```ts
import { assetPathOf, CDN } from "@johnmorrisdotca/uchusen-rockets";

console.log(assetPathOf({ rocket: "starship", variant: "v3" }), assetPathOf({ rocket: "starship", variant: "v3", look: "painted", view: "below" }));
console.log(CDN);
```

`null` means no file is shipped for those options. Use the module or the element instead, which draw any combination.
