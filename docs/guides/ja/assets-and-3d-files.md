---
title: すぐ使えるファイルと3Dモデル
section: how-to
order: 9
description: 同梱の .glb と .svg をそのまま使い、build で自分用を作り、その中身も確認します。
---

パッケージは `@johnmorrisdotca/uchusen-rockets/assets/` の下に、すべてのロケット・型式・部品の `.glb` メッシュと `.svg` 図面を同梱しています。要素を使いたくないときや、ロケットをほかのソフトに持ち出したいときに便利です。

## 何があるか

| ファイル | 内容 |
| --- | --- |
| `starship-v3.glb` | コードで作ったロケットのメッシュ。部品はスロット名（`booster`、`ship`）のノードになり、線画の見た目の線は線プリミティブとして入っています。 |
| `starship-v3-booster.glb`、`starship-v3-ship.glb` | 部品ひとつずつ。 |
| `starship-v3.svg`、`starship-v3.thick.svg`、`starship-v3.painted.svg` | 組み上げた全体を、見た目ごとに。 |
| `starship-v3-apart.svg`、`starship-v3-booster.svg` | 分解した姿と、部品ひとつ。 |
| `parts/raptor-vacuum.glb` | 小さな部品。 |
| `models/starship-v3-booster.glb` | 彩色モデル。CC BY 4.0。 |

すべてメートル単位で、Y が上、部品の底が軸上にあり、風上側が +Z です。位置と法線は `KHR_mesh_quantization` で量子化されており、three.js などのビューアーはデコーダーなしで読めます。

## そのまま使う

```html
図：[Starship Block 3](https://cdn.jsdelivr.net/npm/@johnmorrisdotca/uchusen-rockets@0/dist/assets/starship-v3.svg)
```

`assetPathOf(options)` は、オプションに対応するファイルのパスを返します。対応するファイルが同梱されていなければ `null` です。

```ts
import { assetPathOf } from "@johnmorrisdotca/uchusen-rockets";

console.log(assetPathOf({ rocket: "falcon-9", variant: "block-5", show: "apart", look: "thick" }));
console.log(assetPathOf({ rocket: "falcon-9", variant: "block-5", view: "side" }));
```

## 自分で作る

`build` は、Node でもブラウザーでも、依存なしで同じバイト列を作ります。同じ記述からは必ず同じバイト列ができます。現在時刻も乱数も使いません。

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const rocket = build({ rocket: "saturn-v" });
const glb = rocket.glb();
console.log(glb.bytes.length, "bytes,", glb.triangles, "triangles");
console.log(rocket.svg({ look: "painted", view: "side" }).length, "characters of SVG");
```

Node でファイルに書くには `writeFileSync("saturn-v.glb", glb.bytes)` とします。

## サイズの上限

コードで作るメッシュは600 KB未満、図面は80 KB未満で、どの見た目でもこの上限を守ります。彩色モデルは8 MB未満で、彩色の見た目が求めたときだけ読み込まれます。ブラウザーのテストが、各シーンの負荷を測っています。

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const size = build({ rocket: "starship", variant: "v4" }).glb().bytes.length;
console.log(size < 600_000);
```

## 彩色モデルとクレジット

`models/` のファイルは、他の人がライセンスを付けて公開した作品に由来します。彩色したロケットは、表示している部品のクレジットを添えなければなりません。どれがそのロケットのものかは `check(description).credits` が教えます。規則は[ライセンスとクレジット](licences-and-credits.md)にあります。
