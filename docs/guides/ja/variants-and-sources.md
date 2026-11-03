---
title: 型式と出典つきの寸法
section: explanation
order: 2
description: ロケットがなぜ型式ごとに分かれているのか、数値がどう出典を示すのか、空欄や食い違いが何を意味するのかを説明します。
---

ロケットは変わります。スターシップのブロック1とブロック3は別物ですし、2012年のファルコン9とブロック5も別物です。そのためこのパッケージには、単一の「ファルコン9」はなく、出典が記録している型式ごとに、それぞれ固有の寸法があります。

![すべてのロケットを同じ縮尺で並べた図：スターシップ、ファルコン9、ドラゴン2つきファルコン9、ファルコンヘビー、グラスホッパー、ドラゴン2。](../../images/family.jpg)

## 数値は出典を示すか、空欄にする

データのすべての寸法・数・日付は `Figure` です。値、その出典の id、出典に日付があればその日付を持ちます。出典のない数値は空欄（`value` が `null`）で、隙間を埋めるために推定されることはありません。

```ts
import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";

const v3 = variantOf("starship", "v3");
const height = v3?.facts.height;
console.log(height?.value, height?.source, height?.source ? SOURCES[height.source].url : "");
```

`SOURCES` はすべての id が指す表で、題名、発行元、URL、ページの日付、直接読んだのか、検索で見つけたのか、他のページに引用されていたのかを持ちます。

## 出典が食い違うとき

出典どうしが一致しないこともあります。その数値は選んだ値を保持し、ほかの値は `others` に、誰がそう言ったか、なぜ選ばなかったかとともに並べます。

```ts
import { variantOf } from "@johnmorrisdotca/uchusen-rockets";

const booster = variantOf("starship", "v3")?.facts.parts.booster;
for (const other of booster?.others ?? []) console.log(other.value, other.source, other.note);
```

## 数値の横に必ず添える言葉

発表されただけで造られていない数値や、全体を語らない形で述べられた数値があります。そうした数値には `brief` があり、どこに表示されても値の横に残さなければならない短い言葉です。`figureWords` は、表に載せるのにふさわしい形で数値を文字にします。

```ts
import { figureWords, variantOf } from "@johnmorrisdotca/uchusen-rockets";

const v4 = variantOf("starship", "v4");
console.log(v4?.status, figureWords(v4?.facts.height, " m"));
```

ブロック4は発表されただけで造られていないため、高さは推定値として表示されます。実測した寸法と取り違えられることはありません。

## ステータス

型式の `status` は `flown`、`announced`、`artist-model`、`test-vehicle`、`support` のいずれかです。実在の型式として表示されるロケットは、その型式に当てはまる部品だけを使います。部品を混ぜたものはカスタム構成であり、そう明記されます。

## 何があるかを調べる

`ROCKETS` は id をキーとするレコードです。各項目は型式を順に並べ、既定の型式を示します。

```ts
import { ROCKETS } from "@johnmorrisdotca/uchusen-rockets";

for (const rocket of Object.values(ROCKETS).slice(0, 5)) console.log(rocket.id, rocket.variants.map((variant) => variant.id).join(" "));
```

`PLANNED_ROCKETS` は、出典つきの事実はあるがまだ形のないロケットを並べています。

## こういう作りにしている理由

見た目はそれらしくても10メートルずれている図は、ない方がましです。メッシュと図面は同じ出典つきの数値から作られるので、お互いにも、横にある表とも食い違いません。[設計](architecture.md)を見てください。
