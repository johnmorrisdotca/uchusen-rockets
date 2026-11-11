---
title: 飛行の物理
section: how-to
order: 8
description: 位置と速度から軌道を出し、場面の天体の重力を足し合わせ、機体を先の時刻へ進めます。ロケット方程式もあります。一部は Orbiter から移植し、JPL Horizons と比べて確かめています。
---

`physics` エントリーは、機体を飛ばすための計算です。位置と速度からどんな軌道になるか、まわりの天体がどれだけ引くか、しばらく後にどこにいるか、噴射にどれだけの推進剤がいるかを出します。純粋な計算で、DOM も時計も依存パッケージも使わないので、Node でもテストでも自分のページの中でも動きます。単位はすべて SI です（メートル、秒、キログラム、ニュートン）。重力パラメーター（GM）は m^3/s^2 で表すので、`journey` エントリーの `GM_KM3_S2` の値は `1e9` 倍して使います。

一部は、オープンソースの宇宙飛行シミュレーター [Orbiter](https://github.com/orbitersim/orbiter) から移植しました（MIT ライセンス、Copyright (c) 2000-2026 Martin Schweiger）。どのファイルから来たかは、[出どころ](#出どころ)に書いてあります。これは飛行の物理の最初の部分です。噴射と軌道の乗り換え、スラスターで向きを変えること、空気の影響は、このあとのリリースで加わります。

## 位置と速度から軌道を出す

`elementsOf` は、軌道の形と、機体がその上のどこにいるかを出します。`stateOf` は、ケプラーの方程式を使って、ある時間がたった後にどこにいるかを出します。中心の天体のほかには、何にも引かれないものとして計算します。どちらも、閉じた軌道にも、開いた（双曲線の）道すじにも使えます。

```ts
import { elementsOf, stateOf } from "@johnmorrisdotca/uchusen-rockets/physics";

const GM_EARTH = 3.986004418e14;
const orbit = elementsOf(GM_EARTH, [6_563_000, 0, 0], [0, 10_240, 0]);
console.log("eccentricity", orbit.e.toFixed(3), "apogee", ((orbit.apoapsis - 6_378_137) / 1000).toFixed(0), "km");
console.log("once round in", (orbit.period / 3600).toFixed(2), "hours");

const halfway = stateOf(orbit, orbit.period / 2);
console.log("at apogee:", (halfway.position[0] / 1000).toFixed(0), "km,", halfway.velocity[1].toFixed(0), "m/s");
```

## 場面の天体の重力

`gravityAt(position, bodies)` は、渡した天体すべての引く力を足します。天体は点の質量として扱います。天体の `zonal`（J2、あれば J3 と J4、その値の基準の半径、天体の極の向き）を渡すと、天体の平たさの影響も入ります。低い軌道の面が地球のまわりを1日に数度ずつ回っていくのは、この平たさのせいです。惑星から遠いところでは、入れなくてかまいません。

```ts
import { gravityAt, type GravityBody } from "@johnmorrisdotca/uchusen-rockets/physics";

const earth: GravityBody = { gm: 3.986004418e14, position: [0, 0, 0], zonal: { radius: 6_378_137, pole: [0, 0, 1], j: [0.00108262545] } };
const g = gravityAt([6_778_137, 0, 0], [earth]);
console.log(Math.hypot(...g).toFixed(3), "m/s^2 at 400 km over the equator");
```

天体は、機体と同じ座標系、同じ時刻で渡してください。いちばん正確なのは、それ自体が引かれていない座標系です。惑星の間を飛ぶなら、太陽系の重心が中心の座標系がよいです。太陽や地球が中心の座標系でも絵を描くのには使えますが、ほかの天体がその中心を引く分が抜けます。下の表のテスラ・ロードスターを、太陽が中心の座標系で飛ばすと、1か月で約 900 km ずれます。

## 機体を時間に沿って進める

`propagate(start, seconds, options)` は、1回の刻みを `options.step` 秒以下にして、機体を進めます。加速度は `acceleration(t, position, velocity)` で渡します。場面の重力でも、エンジンの推力を機体の質量で割ったものでも、その両方でもかまいません。`path` は軌道を描くための等間隔の点を返し、`step` は1刻みだけ進めます。

```ts
import { elementsOf, gravityAt, path, propagate, type GravityBody } from "@johnmorrisdotca/uchusen-rockets/physics";

const earth: GravityBody[] = [{ gm: 3.986004418e14, position: [0, 0, 0] }];
const start = { t: 0, position: [7_000_000, 0, 0] as const, velocity: [0, 8_200, 1_200] as const };
const turn = elementsOf(earth[0]!.gm, start.position, start.velocity).period;

const later = propagate(start, 10 * turn, { step: 20, method: "sy6", acceleration: (_t, p) => gravityAt(p, earth) });
console.log("after ten turns:", Math.hypot(later.position[0] - start.position[0], later.position[1] - start.position[1], later.position[2] - start.position[2]).toFixed(2), "m from the start");

const line = path(start, turn, 64, { step: 20, acceleration: (_t, p) => gravityAt(p, earth) });
console.log(line.length, "points to draw the orbit");
```

計算の方法は Orbiter と同じです。

| 方法 | どんなものか | 向いている使い方 |
| --- | --- | --- |
| `sy4`（指定しないとき） | 吉田の4次のシンプレクティック法 | 重力だけで長く飛ぶとき。何周しても軌道のエネルギーがずれていきません |
| `sy6`、`sy8` | 6次と8次 | 同じ使い方で、刻みを長くしたいときや、誤差をさらに小さくしたいとき。1刻みの計算は増えます |
| `sy2` | リープフロッグ法 | 手早く見るとき。2次です |
| `rk4` | 定番の4次のルンゲ＝クッタ法 | 空気のように、速度で変わる力があるとき。何周もするとエネルギーが少しずつずれます |

楕円の軌道を 20 秒の刻みで 100 周させると、`sy4`、`sy6`、`sy8` では軌道のエネルギーと角運動量のずれが10兆分の1.5（1.5e-13）以内に収まり、`rk4` ではエネルギーが1億分の5（5e-8）ずれていきます。

## ロケット方程式

`Engine` は、Orbiter でいうスラスターです。真空での推力と、真空での排気速度を持ちます。排気速度は比推力に標準重力をかけたものです（`exhaustSpeedOf`）。1秒に使う推進剤の量は、推力を排気速度で割ったものです。空気の中では、Orbiter と同じく、推進剤の流れは変わらず、推力が直線に沿って下がります。その直線は、基準の気圧で決めたもう1つの排気速度を通ります（`thrustAt`）。

```ts
import { burnSeconds, deltaV, exhaustSpeedOf, massAfter, massFlow, thrustAt, type Engine } from "@johnmorrisdotca/uchusen-rockets/physics";

const engine: Engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
console.log(massFlow(engine).toFixed(1), "kg/s");
console.log(deltaV(engine.exhaustSpeed, 30_000, 20_000).toFixed(0), "m/s from 10 t of propellant");
console.log((30_000 - massAfter(engine.exhaustSpeed, 30_000, 1_000)).toFixed(0), "kg for 1,000 m/s, a burn of", burnSeconds(engine, 30_000, 1_000).toFixed(0), "s");

const firstStage: Engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(330), reference: { exhaustSpeed: exhaustSpeedOf(300), pressure: 101_325 } };
console.log(thrustAt(firstStage, 101_325).toFixed(0), "N at sea level");
```

同じ計算を、サーバーでふつうのスクリプトとして動かす例です（`examples/node/orbit.mjs`。npm が作るとおりのパッケージで実行しています）。

```js
import { GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
import { deltaV, elementsOf, exhaustSpeedOf, gravityAt, propagate } from "@johnmorrisdotca/uchusen-rockets/physics";

// A craft 400 km above the Earth on a circle, flown once round with the Earth's pull. Metres, seconds, kilograms.
const earth = [{ gm: GM_KM3_S2.earth * 1e9, position: [0, 0, 0] }];
const start = { t: 0, position: [6_778_137, 0, 0], velocity: [0, 7_668.6, 0] };
const orbit = elementsOf(earth[0].gm, start.position, start.velocity);
const end = propagate(start, orbit.period, { step: 10, method: "sy8", acceleration: (_t, p) => gravityAt(p, earth) });
const missed = Math.hypot(end.position[0] - start.position[0], end.position[1] - start.position[1]);
console.log((orbit.period / 60).toFixed(1), "minutes round,", missed < 1 ? "back where it started" : `${missed.toFixed(0)} m off`);

// The rocket equation: an engine of specific impulse 314 s, burning a third of a 30 t craft.
console.log(deltaV(exhaustSpeedOf(314), 30_000, 20_000).toFixed(0), "m/s");
```

`92.6 minutes round, back where it started` と `1249 m/s` が表示されます。

## どれくらい正確か

下の数字はどれもテストで、2026-11-11 に、保存しておいた答えと比べて測りました。テストはネットワークを使いません。

| 場合 | 比べた相手 | 結果 |
| --- | --- | --- |
| 閉じた軌道と開いた道すじ、6つ。軌道要素と、5つの時刻の位置 | Orbiter の `Elements` クラスを、そのままコンパイルしたもの | ミリメートルの単位まで同じ。円軌道だけは 0.19 m 違いますが、これは Orbiter 自身の答えが出発点から同じだけずれているためです |
| 月を 28 日飛ばす。太陽と惑星は点の質量 | JPL Horizons | 最後に 1.8 km のずれ |
| 同じものに地球の J2 を入れる | JPL Horizons | 0.76 km |
| テスラ・ロードスターを、太陽のまわりで半年飛ばす | JPL Horizons | 4,047 km のずれ（太陽だけなら 20,969 km）。Horizons は、太陽の光が押す力を観測に合わせて入れていますが、重力だけのこの計算には入っていません |
| ISS を 100 分飛ばす | JPL Horizons | 地球の J2 を入れて 0.20 km、入れないと 48 km |
| 地球と月の重心が太陽を回る周期 | Horizons の恒星年 365.25636 日 | 365.2574 日 |
| 300 秒の噴射を、少しずつ進めて計算する | ロケット方程式 | 1e-10 m/s まで同じ |

残るずれは、それぞれの計算が入れていないもの（天体の重力の高次の項、空気、太陽の光が押す力）から来ています。計算の方法（積分のしかた）のせいではありません。

## 出どころ

Orbiter（https://github.com/orbitersim/orbiter 、MIT ライセンス、Copyright (c) 2000-2026 Martin Schweiger。ライセンスの全文は `LICENSES/Orbiter-MIT.txt`）から移植し、TypeScript で書き直しました。

- `elementsOf`、`stateOf`、`eccentricAnomaly`：`Src/Orbiter/Element.cpp`（`Elements` クラス）
- `gravityAt`：`Src/Orbiter/Psys.cpp`（`SingleGacc`、その J2 から J4 の項、すべての天体の足し合わせ）
- `propagate`、`step`、`path`：`Src/Orbiter/BodyIntegrator.cpp`（4次のルンゲ＝クッタ法と、シンプレクティック法）
- `massFlow`、`thrustAt`：`Src/Orbiter/Vessel.cpp` と `Vessel.h`。`deltaV`：DeltaGlider の燃料表示にあるロケット方程式（`Src/Vessel/DeltaGlider/FuelMfd.cpp`）

移植したどのソースファイルにも、何を変えたかが書いてあります。テストで比べる答えは、JPL Horizons（NASA/JPL、パブリックドメイン）から `scripts/fetch-orbit-reference.ts` で保存したものと、Orbiter 自身のコードから `scripts/orbiter-reference.ts` で作ったものです。クレジットは [NOTICE.md](../../../NOTICE.md) にあります。
