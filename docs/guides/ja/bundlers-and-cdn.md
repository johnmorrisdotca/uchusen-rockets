---
title: バンドラーと CDN
section: how-to
order: 9
description: unpkg、Vite、webpack からロケットを使う方法を、ビルドしてブラウザーで開いて確かめた例で説明します。
---

ページは、ビルドなしで CDN から要素を読み込めます。バンドラーに含めることもできます。ここにある例は、すべて [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples) のファイルです。`pnpm test:usage` が、npm が作るとおりのパッケージを使ってビルドし、ブラウザーで開いて確かめ、このページに同じファイルがそのまま載っているかも調べます。jsDelivr のページは[はじめに](getting-started.md)にあります。

## unpkg

unpkg はパッケージのファイルをそのまま配信します。ページは `dist/element.js` を指定し、インポートマップで `three` と `three/addons/`（three.js のローダーやコントロール）を同じ CDN の three.js に向けます。要素が three.js を読み込むのは、3Dビューを描くときだけです。

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

`@0` は 0.x の最新版を指します。版を固定するには `@0.4.0` のように完全な版を書きます。

## Vite

パッケージと three.js をインストールします（`npm install @johnmorrisdotca/uchusen-rockets three`）。要素を一度インポートすれば、3Dビューに必要な three.js は Vite が見つけます。3Dを使わないページは three.js を読み込みません。

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

webpack 5 でも同じインポートが使えます。下の設定ファイルがすべてです。

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

彩色のロケットは、`.glb` ファイルのフォルダーからモデルを読み込みます。バンドラーはそのフォルダーをコピーしないので、[React とその他のフレームワーク](react-and-frameworks.md#彩色モデルとバンドラー)を見てください。
