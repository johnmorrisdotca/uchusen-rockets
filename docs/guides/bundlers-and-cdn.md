---
title: Bundlers and CDNs
section: how-to
order: 9
description: Use the rocket from unpkg, with Vite, or with webpack, as examples that are built and opened in a browser.
---

A page can load the element from a CDN with no build step, or a bundler can include it. Each example here is a file in [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples) that `pnpm test:usage` builds against the package as npm packs it and opens in a browser, and this page holds each one word for word. [Getting started](getting-started.md) has the jsDelivr page.

## unpkg

unpkg serves the package's files as they are, so the page names `dist/element.js` and an import map points `three`, and `three/addons/` (three.js's loaders and controls), at three.js on the same CDN. The element loads three.js only when it draws a 3D view.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Uchusen Rockets from unpkg</title>
    <script type="importmap">
      { "imports": { "three": "https://unpkg.com/three@0.186.1/build/three.module.js", "three/addons/": "https://unpkg.com/three@0.186.1/examples/jsm/" } }
    </script>
    <script type="module" src="https://unpkg.com/@johnmorrisdotca/uchusen-rockets@0/dist/element.js"></script>
  </head>
  <body>
    <uchusen-rocket rocket="falcon-heavy" look="thick" view="below" style="max-width: 360px"></uchusen-rocket>
  </body>
</html>
```

The `@0` takes the newest 0.x release; name a full version such as `@0.4.0` to pin one.

## Vite

Install the package and three.js (`npm install @johnmorrisdotca/uchusen-rockets three`). Import the element once; Vite finds three.js for the 3D view, and the page that asks for no 3D never loads it.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Uchusen Rockets with Vite</title>
  </head>
  <body>
    <uchusen-rocket id="rocket" rocket="falcon-9" variant="block-5" look="thick" style="max-width: 360px"></uchusen-rocket>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

```ts no-run
import "@johnmorrisdotca/uchusen-rockets/element";
import { variantOf } from "@johnmorrisdotca/uchusen-rockets";

const rocket = document.querySelector("uchusen-rocket")!;
rocket.setAttribute("label", `${variantOf("falcon-9", "block-5")?.name}, drawn from sourced sizes`);
```

## webpack

The same import works in webpack 5. The config below is the whole of it.

```js no-run
import "@johnmorrisdotca/uchusen-rockets/element";

const rocket = document.createElement("uchusen-rocket");
rocket.setAttribute("rocket", "falcon-heavy");
rocket.setAttribute("look", "thick");
rocket.style.maxWidth = "360px";
document.body.append(rocket);
```

```js no-check
import { fileURLToPath } from "node:url";

export default {
  mode: "production",
  entry: "./src/index.js",
  output: { path: fileURLToPath(new URL("./dist", import.meta.url)), filename: "main.js" },
};
```

A painted rocket loads its models from a folder of `.glb` files that a bundler does not copy: see [React and other frameworks](react-and-frameworks.md#painted-models-and-bundlers).
