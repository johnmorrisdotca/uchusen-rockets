---
title: ジャーニーモード
section: how-to
order: 7
description: 本物のロケットやSPXフリートの船で、地球から月や惑星まで飛ばします。実際の位置から出す打ち上げの時期、エンジンの噴射、向きの反転、数字を、ふつうの関数として使えます。
---

ジャーニーモードは、太陽系の2つの場所の間の旅を計画して、再生します。画面はデモの `journey.html` です。その下の計算は、このパッケージの `journey` エントリーにあります。DOM も依存パッケージもないので、サーバーでもテストでも自分のページでも使えます。

## 機体は2種類

**弾道型**は、本物のロケットです。ホーマン遷移で出発します。待機軌道からエンジンを噴射し、半周分の楕円軌道を長く慣性で飛び、反対側で減速のエンジンを噴射します。出発できる日は決まっていて、これを打ち上げウィンドウと呼びます。ページは、惑星の実際の位置から探します。

**ずっと噴射する**機体は、SPXフリートの船です。中間点まで加速し、船の向きを反転して、同じ加速度で減速して止まります（フリップ＆バーン）。式は相対論に基づいていて、将来の恒星間の旅にも使えます。太陽系の中では `2 sqrt(d / a)` になります。

## 計算

```ts
import { circularSpeed, flipAndBurn, G0, GM_KM3_S2, hohmann, synodicPeriod } from "@johnmorrisdotca/uchusen-rockets/journey";

const AU = 149_597_870.7;
const mars = hohmann(GM_KM3_S2.sun!, AU, 1.52371034 * AU);
console.log((mars.seconds / 86_400).toFixed(1), "days,", mars.dv1.toFixed(2), "and", mars.dv2.toFixed(2), "km/s");
console.log(synodicPeriod(365.256, 686.98).toFixed(1), "days between windows");
console.log(circularSpeed(GM_KM3_S2.earth!, 6378.137 + 185).toFixed(2), "km/s in a 185 km orbit");

const ship = flipAndBurn(0.5 * AU * 1000, 0.015 * G0, 600);
console.log((ship.frameSeconds / 86_400).toFixed(1), "days at 0.015 g, half an AU");
```

この数字は、NASA が発表している値と照らし合わせて確かめています。火星まで約259日、2.94 km/s と 2.65 km/s、ウィンドウの間隔は779.9日です。

## 場所

コアは天体暦を読み込みません。`BodySource`（場所の一覧と、ある時刻のその位置）を渡します。デモは [wakusei-planets](https://github.com/johnmorrisdotca/wakusei-planets) から作っています（`demo/journey-bodies.ts`）。位置は NASA JPL の近似軌道要素から出しています。円軌道だけの簡単な `BodySource` でも、計画を試せます。

```ts
import { craftOf, planTrip, type BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";

const AU = 149_597_870.7;
const day = 86_400_000;
const circle = (au: number, days: number) => (ms: number) => [au * Math.cos((2 * Math.PI * ms) / day / days), au * Math.sin((2 * Math.PI * ms) / day / days), 0] as const;
const source: BodySource = {
  stops: [
    { id: "earth", name: { en: "Earth", ja: "地球" }, kind: "planet", radiusKm: 6378.137, colour: "#4c88c4" },
    { id: "mars", name: { en: "Mars", ja: "火星" }, kind: "planet", radiusKm: 3396.19, colour: "#c76a3f" },
  ],
  positionAu: (id, ms) => (id === "earth" ? circle(1, 365.256)(ms) : circle(1.52371034, 686.98)(ms)),
  offsetKm: () => [0, 0, 0],
};

const trip = planTrip(source, craftOf("kaminari")!, "earth", "mars", Date.UTC(2026, 10, 4));
console.log(trip.verdict.line);
console.log(Math.round(trip.frameS / 86_400), "days,", Math.round(AU), "km to an AU");
```

## 機体にできること

`planTrip` は、機体の限界を隠しません。判定を平易な1行で返し、`playable` で再生できるかどうかを伝えます。

| 判定 | 意味 |
| --- | --- |
| `rated` | この旅に合う公表された積載量があり、その行に出典が書かれます。 |
| `at-least` | この旅の数字はないものの、もっと厳しい旅の数字がある場合です。火星への軌道に16.8 t を送れるロケットは、月へは少なくともそれだけ送れます。 |
| `not-rated` | 合う数字がありません。噴射は物理から計算しますが、その機体が持ち上げられるとは、どこにも書かれていません。 |
| `flyby` | 出発はできますが、宇宙船の燃料では止まれません。オリオンの 1,050 m/s では、火星を周回するのに必要な 2.2 km/s に足りません。 |
| `cannot` | 断ります。理由は行に書きます。燃料が足りない、ロケットは地球からしか打ち上げられない、直線の道が太陽を通る、などです。 |
| `ok` | ずっと噴射する船で、燃料に余裕があります。 |

機体の数字には、すべて出典があるか、「推定」と書いて何から計算したかを示します。ページでは推定を「推定」と表示します。

## 旅を再生する

旅は、予熱、点火、上昇、噴射、慣性飛行、反転、減速、到着という段階の並びです。本物の慣性飛行は何か月もかかるので、段階ごとに、実際の時間を画面の時間に割り当てます。`stateAt(trip, source, playbackSeconds)` は、その瞬間のすべてを、旅と時間だけから返します。だから、どの場面も単独で描けて、テストに時計は要りません。

```ts
import { CRAFTS, duration } from "@johnmorrisdotca/uchusen-rockets/journey";

for (const craft of CRAFTS) console.log(craft.name, craft.drive);
console.log(duration(258.8 * 86_400));
```

## ページが描くもの

星は2Dキャンバス、地図と道のりは SVG、機体はこのパッケージ自前の線画を横向きにしたものです。WebGL は使わないので、解放が必要なコンテキストもありません。フレームは、旅を再生していて、ページが見えているときだけ、1秒に最大30回要求します。選んだ内容は URL に残ります（`?from=earth&to=mars&craft=falcon-heavy`）。

## 噴射のあとに残るもの

横から見た図には、残ったものだけが出ます。ロケットは、カウントダウンと上昇のあいだは全体、出発の噴射と慣性飛行のあいだは上段とそのペイロード、向きを反転してからはペイロードだけの姿で描きます。サターンVは、S-IVB とアポロ宇宙船、そのあとは司令船・機械船。スペース・ローンチ・システムは、上段とオリオン、そのあとはオリオンだけ。ファルコンヘビーは、上段とペイロード、そのあとはフェアリングに入ったペイロードです。新しく描くものはありません。どの姿も、そのロケット自身の部品を（どの部品かは `stageOf` が答えます）1本に積み直し、ロケット全体に合わせた大きさで描くので、縮尺は変わりません。ファルコンヘビーの打ち上げの瞬間のように、横にブースターがあるロケットは、すべてのコアが見えるように正面から描きます。

旅の数字には、使った推進剤の「燃料」の行があります（ほとんどのロケットは、エンジンの比推力を書いた資料がないため、理由を添えて「不明」と表示します）。ペイロードは別の行で、「目的地へのペイロード」として示します。
