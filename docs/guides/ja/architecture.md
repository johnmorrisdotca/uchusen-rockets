---
title: 設計
section: explanation
order: 11
description: データ、部品レコード、図面、メッシュ、要素がどうつながり、なぜ互いに食い違えないのかを説明します。
---

このパッケージは、数値をひとつの場所にしか書かないように作られています。メッシュ、図面、その横の表は、同じ出典つきの数値から作られるので、食い違えません。

## 層

| 層 | 場所 | 依存先 |
| --- | --- | --- |
| データ | `src/data/` | なし。出典つきの数値、型式、飛行、クレジット。 |
| 部品レコード | `src/parts.ts`、`src/model/registry.ts` | データ。すべての部品に同じ形式のレコード。 |
| ピース | `src/model/` | 部品レコード。出典つきの寸法から作る単純な形状：回転体、箱、リング。 |
| メッシュ | `src/build/glb.ts` | ピース。三角形と `.glb` ファイル。 |
| 図面 | `src/draw/` | ピース。同じピースから作る SVG。 |
| 規則 | `src/fit.ts`、`src/layout.ts`、`src/framing.ts`、`src/looks.ts`、`src/flight.ts` | 部品レコード。純粋な関数。 |
| 要素 | `src/element.ts`、`src/element/` | 上のすべてと、3Dビューのときだけ three.js。 |

ルートと `build` のエントリーは three.js も DOM も読み込みません。要素は3Dビューのときだけ three.js を読み込むので、図面だけのページは three.js をダウンロードしません。

## 部品は数値の表

ブロックの違いは、たとえば `src/model/starship.ts` の数値の違いです。同じピースがメッシュにも図面にもなるので、両者は食い違いません。部品レコードは、実寸（メートル）、組み合わさる接合部、形状の出典を持ちます。

```ts
import { PART_ENTRIES } from "@johnmorrisdotca/uchusen-rockets";

const kinds = new Map<string, number>();
for (const { record } of PART_ENTRIES) kinds.set(record.kind, (kinds.get(record.kind) ?? 0) + 1);
console.log(PART_ENTRIES.length, "parts;", Object.fromEntries(kinds));
```

## メッシュは記述の純粋な関数

現在時刻も、シードなしの乱数も使いません。同じ記述からは同じバイト列ができ、テストがそれを保証します。図面も同じです。

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const a = build({ rocket: "falcon-9", variant: "block-5" }).glb().bytes;
const b = build({ rocket: "falcon-9", variant: "block-5" }).glb().bytes;
console.log(a.length === b.length && a.every((byte, i) => byte === b[i]));
```

## 見た目は表の1項目

`LOOKS` が変えるのは線・色・塗りで、形は決して変えません。だから、どの見た目も、すべての型式で、組み上げた状態でも分解した状態でも部品ひとつだけでも、特別扱いなしで使えます。

## 要素

最初にコードが描いた図面が表示されます。要素が画面に入り、ブラウザーが WebGL を使えるときは、three.js を読み込んでクロスフェード（`CROSSFADE_MS`）で引き継ぎます。WebGL がなかったり、コンテキストが失われたりしたら、図面が再び引き継ぎます。要素は、何かが動いているときだけ描き、画面外で30秒たつと WebGL コンテキストを手放します。

キャンバスの大きさは、要素の大きさに画面のピクセル比を掛けた値です。`pixelRatioFor` が、比率は2まで、1辺は4096ピクセルまで、合計は600万ピクセルまでに抑えます。

```ts
import { MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor } from "@johnmorrisdotca/uchusen-rockets";

console.log(MAX_RATIO, MAX_SIDE, MAX_PIXELS, pixelRatioFor(2560, 1440, 2));
```

## 外から来たものは信用しない

すべての属性は文字として読まれ、表と照らし合わされます。未知のロケット、型式、部品は名前を挙げて拒否され、未知の見た目・視点・表示は既定値に戻ります（`cleanLook`、`cleanView`、`cleanShow`）。マークアップに届く新しいオプションには、悪意のある値のテストがあります。

## ロケットを追加する

型式を `src/data/` に、部品を `src/model/registry.ts` に（単純な形状のピースで）、そしてその行を `ROCKETS` に追加します。ほかは何も変える必要がなく、要素、図面、適合チェック、デモがそれらを読み取ります。数値とモデルが満たすべき規則は [CONTRIBUTING.md](../../../CONTRIBUTING.md) にあります。
