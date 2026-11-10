---
title: ライセンス・クレジット・商標
section: explanation
order: 10
description: どれが MIT で、どれが CC BY 4.0、パブリックドメイン、ODbL なのか。表示するロケットにどのクレジットが付くのかを説明します。
---

このパッケージには複数のライセンスの作品が含まれ、彩色したロケットを配布するときにはその違いが重要です。

## 4種類の作品

| 内容 | ライセンス |
| --- | --- |
| コード、コードで作ったメッシュ、図面 | MIT |
| `models/` の彩色モデル | CC BY 4.0。ただし1点は CC0、NASA のものはパブリックドメイン |
| スターベースの座標・輪郭・標高、タワーの13 mの敷地 | © OpenStreetMap contributors、ODbL 1.0 |
| 上記以外の外部由来のもの | MIT、ISC、BSD、Apache のいずれかでなければならない |

**彩色モデルは MIT ではなく、使うならクレジットを付ける必要があります。** パッケージ自身のライセンス表記が `MIT AND CC-BY-4.0 AND ODbL-1.0` なのはそのためです。

## 表示するもののクレジットを探す

`check(description).credits` は、ロケットが使うすべてのライセンスつきモデルを、`usedFor` で部品名とともに並べます。`creditLine(id)` は1件分を1行のテキストにし、`MODEL_CREDITS` はその表全体です。

```ts
import { check, creditLine } from "@johnmorrisdotca/uchusen-rockets";

const report = check({ rocket: "starship", variant: "v3" });
for (const credit of report.credits) console.log(credit.id, credit.licence, "-", creditLine(credit.id));
```

部品ひとつだけを表示したロケットは、その部品のクレジットだけを付けます。スターシップのブロック2や4のように、このパッケージが自分で塗る型式は、ライセンスつきモデルを使わないのでクレジットが要りません。別の型式の代わりに引き伸ばしたモデルは、ひとつもありません。

## 埋め込みコードがクレジットを付ける

`embedCode` は彩色したすべての出力形式にクレジットを書き込み、`paintedCredit` はその一行だけを返すので、ページが画像の横に表示できます。

```ts
import { embedCode, paintedCredit } from "@johnmorrisdotca/uchusen-rockets";

const options = { rocket: "falcon-9", variant: "block-5", look: "painted" };
console.log(paintedCredit(options));
console.log(embedCode(options, "element").includes("Stanley"));
```

自分で画像やファイルを保存するときは、クレジットを一緒に保管してください。

## NASA のモデル

NASA のモデルは、NASA の指針が求めるとおり出典として名前を挙げますが、NASA がこのパッケージを承認しているという印象は与えません。NASA のロゴ、記章、旗、文字は一切同梱していません。根拠は `NOTICE.md` にあります。

## デモサイトの画像

デモサイトには、パッケージに同梱していないものも映ります。ロケットの背後の地球、ジャーニーモードのページの惑星と衛星、スターベースの地図です。それぞれのクレジットは `NOTICE.md` にあり、どのデモページのフッターにも、誰のクレジットかを示す短い一文と、`NOTICE.md` へのリンクがあります。地球の画像は NASA のもので、`@johnmorrisdotca/chikyu-earth` を通して使っています。惑星と衛星の画像は `@johnmorrisdotca/wakusei-planets` のもので、出典とライセンスはそのパッケージ自身の `NOTICE.md` にあります。スターベースの地図は © OpenStreetMap contributors で、ODbL のもとにあります。

## ロゴ・マーク・旗なし

どのメッシュも図面も、メーカーのロゴ、ワードマーク、旗、印字された名前を持ちません。テスト（`test/legal.test.ts`）が、生成されたファイルとモデルについてそれを確かめています。ロケットの名前は、ただの説明の言葉として現れるだけです。すべての商標はそれぞれの所有者のものであり、このプロジェクトは SpaceX、NASA、その他名前を挙げたメーカーや機関と提携しておらず、承認も受けていません。各出典と変更点は [NOTICE.md](../../../NOTICE.md) を見てください。

## モデルを追加するとき

新しいライセンスつきモデルには、`NOTICE.md` の行、そのファイル自身から読み取ったライセンス、利用を妨げる注意書きがないかを確かめたページが必要です。先にマークを消し、作者のクレジットと変更点を書いてください。規則は [CONTRIBUTING.md](../../../CONTRIBUTING.md) にあります。
