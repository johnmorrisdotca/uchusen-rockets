---
title: TypeScript と Node
section: how-to
order: 10
description: TypeScript でパッケージの型を使い、Node で DOM も three.js もなしに中核を使う方法を、型検査して実行した例で説明します。
---

パッケージは自分の型を同梱しているので、TypeScript で追加の設定は要りません。ルートと `/build` は three.js も DOM もインポートしないため、Node、ワーカー、ビルド処理で動きます。ここにある例は、すべて [`examples/`](https://github.com/johnmorrisdotca/uchusen-rockets/tree/main/examples) のファイルです。`pnpm test:usage` が、npm が作るとおりのパッケージを使って、厳格モードで型検査し、Node で実行し、このページに同じファイルがそのまま載っているかも調べます。

## TypeScript

```ts
import { check, variantOf, type Description, type FitReport, type LookName, type Variant } from "@johnmorrisdotca/uchusen-rockets";
import { build, type Built } from "@johnmorrisdotca/uchusen-rockets/build";
import type { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/element";

const description: Description = { rocket: "starship", variant: "v3" };
const report: FitReport = check(description);
const v3: Variant | undefined = variantOf("starship", "v3");
const rocket: Built = build(description);
console.log(report.ok, v3?.name, rocket.shows.length);

export function paint(element: UchusenRocket): void {
  element.setAttribute("look", "painted");
}

// @ts-expect-error "neon" is not a look
export const look: LookName = "neon";
```

`check` と `build` は同じ `Description` を受け取ります。最後の行は、わざと型エラーにしています。`"neon"` は見た目（look）にありません。

## Node

サーバーも、ブラウザーと同じ SVG を描き、同じ出典つきの数値を読めます。

```js
import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

// A server draws the same SVG a browser does: pure, no DOM, no three.js.
const rocket = build({ rocket: "falcon-9", variant: "block-5" });
const svg = rocket.svg({ look: "thick", view: "front" });
const height = variantOf("falcon-9", "block-5")?.facts.height;
console.log(svg.startsWith("<svg"), height?.value, "m, from", height?.source ? SOURCES[height.source].publisher : "no source");
```

`rocket.glb()` で、メッシュのバイト列も同じように得られます。詳しくは[部品からロケットを組み立てる](build-from-parts.md)にあります。
