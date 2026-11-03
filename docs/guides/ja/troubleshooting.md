---
title: 困ったとき
section: troubleshooting
order: 12
description: タグが何も出さない、3Dビューが出ない、彩色モデルが出ない理由と、エラーの意味を説明します。
---

## タグが何も表示されない

`<uchusen-rocket>` は、要素をインポートすることで定義されます。ページが `@johnmorrisdotca/uchusen-rockets/element` をモジュール（`type="module"`）として一度インポートしているか確かめてください。インポートしないと、タグは空の枠のままです。

## 線画は出るが3Dビューが出ない

線画は設計上のフォールバックです。3Dビューには WebGL と three.js が要ります。要素の `data-state` を見てください。`picture`（待機中）、`loading`、`3d`、`fallback`（WebGL がないので線画のまま）、`error` のいずれかです。

- **インポートマップがない**（CDN のページ）：ブラウザーが `three` を見つけられません。[はじめに](getting-started.md)のインポートマップを追加してください。
- **three.js がない**（バンドラー）：インストールしてください。オプションのピア依存関係で、`>=0.170.0` です。
- **`mode="drawing"`** が指定されている：この属性は線画を保ち、three.js を読み込みません。
- ブラウザーで **Save-Data** がオン：設計上、線画のままです。
- **動きを減らす**設定は3Dビューを止めません。止まるのは自転、炎、アニメーションによる移動です。

## 彩色したロケットが地味に見える

ライセンスつきのモデルは、彩色の見た目が求めたときだけ取得されます。届くまで、あるいは失敗したときは、パッケージ自身の塗りが表示されます。

- バンドラーを使うとモジュールの場所が変わるため、その隣という既定の `./assets/` は合わなくなります。`dist/assets` をサイトが配信するフォルダーにコピーし、`setAssetBase("/your/folder/")` を呼ぶか、`assets` 属性を指定してください。[React とその他のフレームワーク](react-and-frameworks.md)を見てください。
- 要素の `uchusen-painted` と `uchusen-error` のイベントを見てください。

## 厳格なコンテンツセキュリティポリシーで止められる

要素は、インラインのスクリプトもスタイルもない厳格なポリシーの下で動きます。彩色モデルのために `connect-src` が、また `img-src blob:` が必要です。埋め込みページとコードビルダーは `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' blob: data:` で動いています。

## サーバーで `HTMLElement is not defined`

Node で要素をインポートしても安全です。DOM がないときは空の基底クラスで代用されます。エラーがほかのライブラリーから出ているなら、要素はブラウザーだけでインポートしてください（クライアント専用のエフェクトか、`useEffect` の中でインポートする React ラッパー）。中核と `build` のエントリーは DOM に触れません。

## `There is no part "..."`

`buildPart` と `build` は、`PART_ENTRIES` にない部品の id では例外を投げます。綴りを確かめてください。

```ts
import { partEntry } from "@johnmorrisdotca/uchusen-rockets";

console.log(partEntry("starship-v3-ship") !== undefined, partEntry("starship-v9-ship"));
```

## `FitError`

部品が組み合わさらないと、`build` は `FitError` を投げます。その `report` には、`check` が返すのと同じ言葉で問題が入っています。それを利用者に見せてください。

```ts
import { check } from "@johnmorrisdotca/uchusen-rockets";

for (const issue of check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } }).issues) console.log(issue.level, issue.code, issue.message);
```

## 入力した値が無視される

属性は表と照らし合わされます。一覧にない見た目・視点・表示は、失敗せずに既定になり、綴りを間違えた `rocket` や `variant` は名前を挙げて拒否されます。値が何になるかは `cleanLook`、`cleanView`、`cleanShow` でわかります。

## エンジンが暗い

`engines="on"` で点火するのは、出典がそれを伝え、図にもあるエンジンだけです。動きを減らす設定を選んだ閲覧者には消えています。[エンジンの点火と飛行](engines-and-flights.md)を見てください。

## Node がスクリプトを動かせない

パッケージを使うには Node 22 以降が必要です。このパッケージ自体の開発には22.18以降が必要です。テストとスクリプトが、Node 標準の型除去（type stripping）機能で TypeScript を直接実行するからです。

## それでも解決しないとき

コード、ブラウザー、`data-state` の値を添えて https://github.com/johnmorrisdotca/uchusen-rockets/issues に issue を立ててください。セキュリティ上の問題は、[SECURITY.md](../../../SECURITY.md) に記載の連絡先へ送ってください。
