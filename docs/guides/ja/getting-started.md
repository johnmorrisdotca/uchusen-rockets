---
title: はじめに
section: tutorial
order: 1
description: ロケットをページに置き、分解し、見た目を変え、同じロケットをコードから読み取るまでを、10分ほどで体験します。
---

このガイドでは、スターシップをページに置き、閲覧者が回せるようにし、分解し、彩色し、最後に同じロケットを Node でデータとして読みます。必要なのはテキストエディターとブラウザーだけです。ページはパッケージを CDN から読み込みます。

図：[ブロック3のロケットを彩色した3Dビュー。ステンレスの機体に黒いタイル、横にはコントロールと出典つきの寸法が並ぶ。](https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/main-painted.jpg)

## 1. ロケットのあるページ

`rocket.html` という名前で保存して開いてください。`<uchusen-rocket>` タグがロケットで、インポートマップは3Dビューが使う three.js を指し、スクリプトがタグを動かします。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Uchusen Rockets from jsDelivr</title>
    <script type="importmap">
      { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/" } }
    </script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets@0/dist/element.js"></script>
  </head>
  <body>
    <uchusen-rocket rocket="starship" variant="v3" look="thick" style="max-width: 360px"></uchusen-rocket>
  </body>
</html>
```

最初にコードが描いた線画が表示されます。要素が画面に入り、ブラウザーが WebGL を使えるときは、3Dビューが途切れなく引き継ぎます。ドラッグで回し、矢印キーで動かし、何もしなければゆっくり自転します。WebGL がなければ線画のままなので、ページが空の枠になることはありません。

## 2. 分解して見た目を変える

3つの属性で表示が変わります。`show` は部品、`look` は描き方、`view` は視点を選びます。

```html
<uchusen-rocket rocket="starship" variant="v3" show="apart" look="painted" view="back"></uchusen-rocket>
<uchusen-rocket rocket="starship" variant="v3" show="booster" look="thick" view="below"></uchusen-rocket>
```

`look` は `line`、`thick`、`painted` のいずれかです。彩色（`painted`）では、ライセンスつきの3Dモデルがあればそれを使い、なければこのパッケージ自身の塗りを使います。すべての値は[見た目・視点・部品](looks-views-and-parts.md)にあります。

## 3. プロジェクトに入れる

バンドラーを使う場合は、インポートマップも CDN も要りません。パッケージと three.js をインストールし、要素を一度インポートします。

```sh
npm install @johnmorrisdotca/uchusen-rockets three
```

```ts no-run
import "@johnmorrisdotca/uchusen-rockets/element";
```

要素をインポートすると、`<uchusen-rocket>`、`<uchusen-lineup>`、`<uchusen-flight>` が定義されます。three.js は3Dビューが必要なときだけ読み込まれるので、線画だけのページは three.js をダウンロードしません。

## 4. 同じロケットをデータとして読む

パッケージの中核には three.js も DOM もないため、Node、ワーカー、ビルド処理で動きます。どの型式にも、出典つきの寸法があります。

```ts
import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";

const v3 = variantOf("starship", "v3");
console.log(v3?.name, v3?.facts.height.value, "m");
const booster = v3?.facts.parts.booster;
console.log(booster?.value, "m, from", booster?.source ? SOURCES[booster.source].publisher : "no source");
```

## 5. 組み合わせが成り立つか確かめる

```ts
import { check } from "@johnmorrisdotca/uchusen-rockets";

const report = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } });
console.log(report.ok, report.custom, report.label);
```

成り立つ組み合わせは許可され、「カスタム構成」と表示されます。実際に飛んだ機体として扱われることはありません。詳しくは[部品からロケットを組み立てる](build-from-parts.md)を読んでください。

## 次に読むもの

- 各ロケットの内容と数値の出典は、[型式と出典つきの寸法](variants-and-sources.md)にあります。
- 自分のサイトに載せる6つの方法は、[自分のサイトに載せる](embed-on-your-site.md)にあります。
- 線画は出るのに3Dビューが出ないときは、[困ったとき](troubleshooting.md)を見てください。
