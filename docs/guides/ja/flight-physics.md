---
title: 飛行の物理
section: how-to
order: 8
description: 位置と速度から軌道を出し、場面の天体の重力を足し合わせ、機体を先の時刻へ進めます。ロケット方程式、噴射、軌道の乗り換え、スラスターで機体の向きを変える計算、空気の計算も入っています。一部は Orbiter から移植し、JPL Horizons と比べて確かめています。
---

`physics` エントリーは、機体を飛ばすための計算です。位置と速度からどんな軌道になるか、まわりの天体がどれだけ引くか、しばらく後にどこにいるか、噴射にどれだけの推進剤がいるか、ある軌道から別の軌道へどう乗り換えるか、機体がどう向きを変えるか、空気が機体にどう働くかを出します。純粋な計算で、DOM も時計も依存パッケージも使わないので、Node でもテストでも自分のページの中でも動きます。単位はすべて SI です（メートル、秒、キログラム、ニュートン）。重力パラメーター（GM）は m^3/s^2 で表すので、`journey` エントリーの `GM_KM3_S2` の値は `1e9` 倍して使います。

一部は、オープンソースの宇宙飛行シミュレーター [Orbiter](https://github.com/orbitersim/orbiter) から移植しました（MIT ライセンス、Copyright (c) 2000-2026 Martin Schweiger）。どのファイルから来たかは、[出どころ](#出どころ)に書いてあります。噴射、軌道の乗り換え、スラスターで機体の向きを変えること、空気の影響も、もう入っています。

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

## 噴射

噴射には2通りあります。一瞬で速度を変えるもの（`impulse`。計画を立てるとき、短い噴射はこう扱います）と、実際に飛ばすもの（`flyBurn`）です。`flyBurn` では、エンジンは決めた時間のあいだ、または決めた速度の変化を出すまで押し続けます。その間も重力は引き続け、機体の質量は、エンジンが推進剤を使う分だけ減っていきます。押す向きは、`prograde`（速度の向き）、`retrograde`（その逆）、`normal`（軌道の角運動量の向き）、`antinormal`（その逆）、`radial-out`（天体から遠ざかる向き）、`radial-in`（天体に向かう向き）、または決まったベクトルの向きです。名前のついた向きは、機体が回っている天体（`centre`。指定しなければ原点に止まっているもの）から見て決まります。`flyPlan` は、いくつもの噴射とその間の慣性飛行をまとめて飛ばします。それぞれの噴射は、真ん中が予定の時刻に来るように始めます（`burnStart`）。これは Orbiter の軌道面合わせの画面と同じ決め方です。推進剤がなくなると（`dryMass`）、噴射は予定より早く止まり、`short` の印が付きます。

```ts
import { elementsOf, exhaustSpeedOf, flyBurn, gravityAt, impulse } from "@johnmorrisdotca/uchusen-rockets/physics";

const gm = 3.986004418e14;
const earth = [{ gm, position: [0, 0, 0] as const }];
const leo = { t: 0, position: [6_778_000, 0, 0] as const, velocity: [0, 7_669, 0] as const };

const kick = impulse(leo, 100, "prograde");
console.log("all at once:", ((elementsOf(gm, kick.position, kick.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");

const engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
const flown = flyBurn(leo, 20_000, { engine, direction: "prograde", dv: 100 }, { step: 1, gravity: (_t, p) => gravityAt(p, earth) });
console.log("flown:", flown.seconds.toFixed(1), "s,", flown.propellant.toFixed(0), "kg,", ((elementsOf(gm, flown.state.position, flown.state.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");
```

## 軌道の乗り換え

式で乗り換えを計画し、噴射で実際に飛ばします。`journey` エントリーの `hohmann` は、ホーマン遷移の2回の噴射と、かかる時間を出します。単位をそろえればどの単位でも使えるので、メートルと m^3/s^2 でもかまいません。このエントリーにはさらに次のものがあります。`biElliptic` は、遠い点を通る3回噴射の乗り換えを出します。`speedChangeFor` は、軌道の大きさを決める噴射を出します（活力方程式。Orbiter の乗り換えの画面が噴射の大きさを直すやり方と同じです）。`planeChange` は、軌道の面を回すのに必要な速度の変化を出します。大きさを同時に変えても、変えなくても使えます（余弦定理）。`nodes` は、機体の軌道がほかの面と交わる場所と、そこに着く時刻、そこでかかる速度の変化を出します（Orbiter の軌道面合わせの画面）。`relativeInclination` は2つの面の間の角度を、`crossings` は同じ面にある2つの軌道が交わる場所を出します（Orbiter の乗り換えの画面）。`timeToTrueAnomaly` と `stateAtTrueAnomaly` は、機体が軌道のある点に着くまでの時間と、そこでの動きを出します。噴射の時刻を決めるのに使います。

```ts
import { biElliptic, elementsOf, nodes, planeChange, timeToTrueAnomaly } from "@johnmorrisdotca/uchusen-rockets/physics";

const gm = 3.986004418e14;
const tilted = elementsOf(gm, [6_778_000, 0, 0], [0, 6_739, 3_660]);
const equator = elementsOf(gm, [6_778_000, 0, 0], [0, 7_669, 0]);
const n = nodes(tilted, equator);
console.log(((n!.relativeInclination * 180) / Math.PI).toFixed(1), "degrees apart; the next node in", Math.min(n!.ascending.seconds, n!.descending.seconds).toFixed(0), "s, costing", n!.ascending.dv.toFixed(0), "m/s");
const [low, high] = [6_778_000, 42_164_000];
const atApogee = Math.sqrt(gm * (2 / high - 2 / (low + high)));
console.log(planeChange(atApogee, (28.5 * Math.PI) / 180, Math.sqrt(gm / high)).toFixed(0), "m/s to turn 28.5 degrees and circularise at once, at the far point of a transfer to", high / 1000, "km");
console.log((timeToTrueAnomaly(tilted, Math.PI) / 60).toFixed(1), "minutes to the far side");

const far = biElliptic(gm, 6_778_000, 20 * 6_778_000, 100 * 6_778_000);
console.log(far.total.toFixed(0), "m/s in", (far.seconds / 86_400).toFixed(1), "days by a far point");
```

時間をかけた2回の噴射で、それぞれの真ん中を予定の点に合わせてホーマン遷移を飛ばす、ふつうのスクリプトの例です（`examples/node/transfer.mjs`。npm が作るとおりのパッケージで実行しています）。

```js
import { hohmann, GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
import { elementsOf, exhaustSpeedOf, flyPlan, gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";

// From a 400 km circle to the geostationary radius, with two burns of a 1 MN engine, each centred on its point. Metres and seconds.
const gm = GM_KM3_S2.earth * 1e9;
const earth = [{ gm, position: [0, 0, 0] }];
const [r1, r2] = [6_778_137, 42_164_000];
const plan = hohmann(gm, r1, r2);
const engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(314) };
const burns = [
  { at: 600, engine, direction: "prograde", dv: plan.dv1 },
  { at: 600 + plan.seconds, engine, direction: "prograde", dv: plan.dv2 },
];
const start = { t: 0, position: [r1, 0, 0], velocity: [0, Math.sqrt(gm / r1), 0] };
const flown = flyPlan(start, 20_000, burns, 600 + plan.seconds + 3_600, { step: 2, gravity: (_t, p) => gravityAt(p, earth) });
const orbit = elementsOf(gm, flown.state.position, flown.state.velocity);
console.log((plan.dv1 + plan.dv2).toFixed(0), "m/s,", (20_000 - flown.mass).toFixed(0), "kg of propellant");
console.log("ends", Math.round(Math.abs(orbit.a - r2) / 1000), "km from the circle, eccentricity", orbit.e.toFixed(4));
```

`3854 m/s, 14279 kg of propellant` と `ends 4 km from the circle, eccentricity 0.0000` が表示されます。エンジンが弱いと噴射が長くなり、それぞれの噴射のうち、予定の点から離れた部分が増えます。この機体の 91 kN のエンジンでは、同じ計画でも 404 km 足りずに終わり、離心率は 0.025 になります。そのため弱いエンジンでは、長い噴射をいくつかに分けるか、あとから直す計画にします。

## 姿勢とスラスター

機体がどちらを向いているかは、クォータニオン `[w, x, y, z]` で表します。これは機体自身の座標系を場面の座標系に回すものです（`rotateVector`、`unrotateVector`、`quatFromAxisAngle`、`turnBy`）。回転の速さは機体自身の座標系で表します。`angularAcceleration` は、機体の軸に沿った主慣性モーメントを持つ機体の、オイラーの運動方程式です。`stepSpin` と `spinFor` は機体の回転を時間に沿って進め、`stepCraft` は位置と姿勢を1つの刻みで一緒に進めます。そのため、機首の方向に押すエンジンの推力は、機首が回るのに合わせて向きを変えます（Orbiter の `RK4_LinAng`）。`gravityGradientTorque` は、天体の重力が細長い機体をゆっくり回そうとする力（重力傾度トルク）です。

`Thruster` は、機体のある点で押すものです。`thrusterPush` は、各スラスターの出力をどう決めても、そのときの力、トルク（`position x force`）、使う推進剤を出します。`torqueLimits` は、それぞれの軸のまわりに、それぞれの向きで出せるいちばん大きなトルクを出します（各スラスターは、いちばん大きく回す軸のグループに入ります。Orbiter の姿勢制御のグループと同じ分け方です）。`fireFor` は、ほしいトルクを出すための各スラスターの出力を出します。自動操縦のモードは Orbiter と同じです。`killRotation` は回転を止めます（1回の制御の刻みで止めきるのに必要なトルクの10分の1をかけ、回転の速さが 1e-5 rad/s より小さくなるまでくり返します）。`holdDirection` は、機首をある向きに回してそのまま保ちます（回す速さは毎秒5度まで、目標から20度以内では遅くし、どの軸もスラスターの力の40パーセントまでしか使いません）。機体の上にしたい向き（屋根の向き）を渡すと、機体をロールさせてその向きに合わせます。向きには、「噴射」の節にある `directionOf` で出す、軌道から決まる向きも使えます。機首は、指定しなければ `[0, 1, 0]` です。このパッケージのロケットは +y の向きに立っているからです。

```ts
import { directionOf, fireFor, gravityAt, holdDirection, quatFromAxisAngle, rotateVector, stepCraft, torqueLimits, type Craft, type Thruster, type Vec3 } from "@johnmorrisdotca/uchusen-rockets/physics";

const inertia: Vec3 = [20_000, 6_000, 20_000];
const thrusters: Thruster[] = [];
for (const y of [4, -4]) for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]) thrusters.push({ position: [0, y, 0], direction, thrust: 445, exhaustSpeed: 2_800 });
const limits = torqueLimits(thrusters);
const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];

let craft: Craft = { t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0], q: quatFromAxisAngle([0, 0, 1], -Math.PI / 2), omega: [0, 0, 0] };
for (let k = 0; k < 600; k++) {
  const prograde = directionOf("prograde", craft.position, craft.velocity);
  const fired = fireFor(thrusters, holdDirection(craft, inertia, limits, 0.1, prograde));
  craft = stepCraft(craft, 0.1, { inertia, acceleration: (_t, p) => gravityAt(p, earth), torque: () => fired.torque });
}
const nose = rotateVector(craft.q, [0, 1, 0]);
const prograde = directionOf("prograde", craft.position, craft.velocity);
console.log(((Math.acos(nose[0] * prograde[0] + nose[1] * prograde[1] + nose[2] * prograde[2]) * 180) / Math.PI).toFixed(2), "degrees from prograde after a minute");
```

機体の回転を止める、ふつうのスクリプトの例です（`examples/node/attitude.mjs`。npm が作るとおりのパッケージで実行しています）。

```js
import { fireFor, killRotation, stepSpin, torqueLimits } from "@johnmorrisdotca/uchusen-rockets/physics";

// An 8 m craft standing along +y, with four 445 N thrusters at each end and two pairs for the roll, stops a tumble.
const inertia = [20_000, 6_000, 20_000];
const thrusters = [];
for (const y of [4, -4]) for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) thrusters.push({ position: [0, y, 0], direction, thrust: 445, exhaustSpeed: 2_800 });
for (const s of [1, -1]) thrusters.push({ position: [1.5, 0, 0], direction: [0, 0, s], thrust: 445, exhaustSpeed: 2_800 }, { position: [-1.5, 0, 0], direction: [0, 0, -s], thrust: 445, exhaustSpeed: 2_800 });
const limits = torqueLimits(thrusters);

let spin = { t: 0, q: [1, 0, 0, 0], omega: [0.05, -0.03, 0.02] };
let propellant = 0;
while (Math.hypot(...spin.omega) >= 1e-5) {
  const fired = fireFor(thrusters, killRotation(spin, inertia, limits, 0.1));
  propellant += fired.massFlow * 0.1;
  spin = stepSpin(spin, 0.1, inertia, () => fired.torque);
}
console.log("stopped in", spin.t.toFixed(1), "s with", propellant.toFixed(2), "kg of propellant");
```

`stopped in 8.3 s with 0.17 kg of propellant` が表示されます。

## 空気

`atmosphereAt(model, height)` は、層に分けたモデルから、ある高さの温度、気圧、密度、音の速さを出します。`EARTH_ATMOSPHERE`、`MARS_ATMOSPHERE`、`VENUS_ATMOSPHERE` は Orbiter の 2006 年版のモデルで、数字もそのままです。それぞれ上限の高さ（200 km、100 km、200 km）より上には空気がありません。`standardAtmosphere(height)` は 1976 年の米国標準大気で、海面より 5 km 低いところから 86 km までを、その規格が決めた定数から計算します。`airVelocity` は、惑星と一緒に回る空気に対する機体の速さです。`dynamicPressure` と `machNumber` は Orbiter が表示する動圧とマッハ数、`dragAcceleration` は空気抵抗です。空気抵抗は、機体が空気に対して進む向きと逆向きにかかり、抗力係数と面積をかけた値（`Cd A`）と質量から出します。モデルの気圧は、空気の中のエンジンの推力を出す `thrustAt` にもそのまま渡せます。

```ts
import { airVelocity, atmosphereAt, dragAcceleration, dynamicPressure, EARTH_ATMOSPHERE, machNumber } from "@johnmorrisdotca/uchusen-rockets/physics";

const height = 40_000;
const position = [6_378_137 + height, 0, 0] as const;
const air = atmosphereAt(EARTH_ATMOSPHERE, height);
const through = airVelocity(position, [0, 2_500, -1_000], [0, 0, 7.292115e-5]);
const speed = Math.hypot(...through);
console.log("Mach", machNumber(speed, air).toFixed(1), "at", height / 1000, "km;", (dynamicPressure(air.density, speed) / 1000).toFixed(1), "kPa");
console.log("drag", Math.hypot(...dragAcceleration(air.density, through, 1.2 * 10, 5_000)).toFixed(1), "m/s^2 on a 5 t capsule");
```

いくつかの高さの空気を、ふつうのスクリプトで出す例です（`examples/node/air.mjs`。npm が作るとおりのパッケージで実行しています）。

```js
import { atmosphereAt, EARTH_ATMOSPHERE, MARS_ATMOSPHERE, standardAtmosphere } from "@johnmorrisdotca/uchusen-rockets/physics";

// The air at a few heights: Orbiter's 2006 Earth beside the 1976 U.S. Standard Atmosphere, and Mars. Kelvin, pascals, kg/m^3.
for (const height of [0, 11_000, 30_000]) {
  const orbiter = atmosphereAt(EARTH_ATMOSPHERE, height);
  const standard = standardAtmosphere(height);
  console.log(height / 1000, "km:", orbiter.pressure.toFixed(0), "Pa (Orbiter),", standard.pressure.toFixed(0), "Pa (1976 standard)");
}
console.log("Mars at the surface:", atmosphereAt(MARS_ATMOSPHERE, 0).pressure, "Pa,", atmosphereAt(MARS_ATMOSPHERE, 0).density, "kg/m^3");
```

気圧が並んで表示されます。20 km までは同じで、30 km では 1 パーセント違います。火星は 610 Pa です。

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
| 静止軌道の半径へのホーマン遷移を、一瞬の噴射で | `journey/physics.ts` の `hohmann` | 遠い円にミリメートルの単位まで合い、離心率は 1e-9 より小さい |
| 同じものを、20 t の機体で、時間をかけた噴射で飛ばす | `hohmann` | 3 MN のエンジンで 1.3 km、1 MN で 3.5 km、300 kN で 39 km、91 kN で 404 km のずれ |
| 傾き 28.5 度の軌道からのホーマン遷移。2回目の噴射で面も回す | 余弦定理 | 赤道の上の円に着き、傾きと離心率は 1e-9 より小さい |
| Orbiter の見積もり（速度かける 5 度）の大きさで、面に垂直に噴射する | その角度 | 4.995 度 |
| 6つの軌道それぞれの5つの点での位置、速さ、時刻 | Orbiter の `PosVel_TA`、`Spd_TA`、`MeanAnomaly_from_TrueAnomaly` をコンパイルしたもの | ミリメートルの単位まで同じ |
| クォータニオンでベクトルを回すことと、オイラーの運動方程式 | Orbiter の `mul`、`tmul`、`EulerInv_full` をコンパイルしたもの | 1e-12 まで同じ |
| 慣性モーメントが真ん中の、不安定な軸のまわりで、トルクなしで 600 秒回り続ける物体 | 保たれるべき量 | エネルギーは 5e-14 まで、角運動量は 0.01 秒の刻みで 2.5e-7 まで保たれる（姿勢を進める計算は、Orbiter と同じく2次です） |
| 2つの慣性モーメントが等しい、回っている物体 | 教科書にある首ふりの速さ（回転の速さの (C - A) / A 倍） | 20 秒後に 1e-6 rad まで同じ |
| 一定のトルク、または偶力になる2つのスラスター | 回転の速さ t / I と角度 t^2 / 2I | 1e-12 まで同じ |
| 8 m の機体の回転を、0.05、0.03、0.02 rad/s から止める | Orbiter の基準 1e-5 rad/s | 8.3 秒で止まり、推進剤は 0.17 kg |
| 低い軌道で、進行方向から 90 度ずれたところから始めて、進行方向を保つ | 速度の向き | 32 秒後には 0.5 度より小さくなり、そのあとは 0.26 度遅れてついていく（軌道が回る速さを、回す速さを決める式の係数で割った値） |
| 地球、火星、金星の空気を、25 通りの高さで出す | Orbiter の 2006 年版のモデルをコンパイルしたもの | 1e-12 まで同じ |
| 1976 年の標準大気を、規格が決めた定数から 0 から 60 km まで計算する | 規格に印刷されている表 I | 表にある5けたの範囲で同じ。気圧と密度は 4e-5 以内、温度は 0.0005 K 以内 |
| Orbiter の 2006 年版の地球のモデル | 1976 年の標準大気 | 20 km までは同じ。気圧は 38 km で 3 パーセント、60 km で 17 パーセント違う |
| 100 kg の物体を 30 km から落とす（`Cd A` は 0.5 m^2） | 2 km での終端速度 | 終端速度 62.4 m/s に対して 63.0 m/s。空気がだんだん濃くなるので、まだ遅くなっている途中です |

残るずれは、それぞれの計算が入れていないもの（天体の重力の高次の項、空気、太陽の光が押す力）から来ています。計算の方法（積分のしかた）のせいではありません。

## 出どころ

Orbiter（https://github.com/orbitersim/orbiter 、MIT ライセンス、Copyright (c) 2000-2026 Martin Schweiger。ライセンスの全文は `LICENSES/Orbiter-MIT.txt`）から移植し、TypeScript で書き直しました。

- `elementsOf`、`stateOf`、`eccentricAnomaly`：`Src/Orbiter/Element.cpp`（`Elements` クラス）
- `gravityAt`：`Src/Orbiter/Psys.cpp`（`SingleGacc`、その J2 から J4 の項、すべての天体の足し合わせ）
- `propagate`、`step`、`path`：`Src/Orbiter/BodyIntegrator.cpp`（4次のルンゲ＝クッタ法と、シンプレクティック法）
- `massFlow`、`thrustAt`：`Src/Orbiter/Vessel.cpp` と `Vessel.h`。`deltaV`：DeltaGlider の燃料表示にあるロケット方程式（`Src/Vessel/DeltaGlider/FuelMfd.cpp`）
- `stateAtTrueAnomaly`、`timeToTrueAnomaly`：`Src/Orbiter/Element.cpp`（`PosVel_TA`、`MeanAnomaly_from_TrueAnomaly`）
- `directionOf`、`impulse`、`burnStart`：`Src/Orbiter/Vessel.cpp` の姿勢のモード、`Src/Orbiter/MfdAlign.cpp` の噴射の時刻の決め方、`Src/Orbiter/MfdTransfer.cpp` の噴射。`flyBurn` と `flyPlan` は、時間を進める計算を使って、ここで新しく書いたものです
- `speedChangeFor`、`crossings`：`Src/Orbiter/MfdTransfer.cpp`。`nodes`、`relativeInclination`：`Src/Orbiter/MfdAlign.cpp`。`biElliptic` と `planeChange` は、ここで新しく書いたものです
- `angularAcceleration`、`gravityGradientTorque`：`Src/Orbiter/Rigidbody.cpp`（`EulerInv_full`、`GetTorque`）。`stepCraft`、`stepSpin`、`spinFor`：`Src/Orbiter/BodyIntegrator.cpp`（`RK4_LinAng`）。クォータニオン：`Src/Orbiter/Vecmat.cpp`。`thrusterPush`、`torqueLimits`、`fireFor`、`killRotation`、`holdDirection`：`Src/Orbiter/Vessel.cpp`（スラスターのトルク、`MaxAngularMoment`、自動操縦のモード）
- `atmosphereAt`、`EARTH_ATMOSPHERE`、`MARS_ATMOSPHERE`、`VENUS_ATMOSPHERE`：`Src/Celbody/Atmosphere/EarthAtm2006`、`MarsAtm2006`、`VenusAtm2006`。`airVelocity`、`dynamicPressure`、`machNumber`、`dragAcceleration`：`Src/Orbiter/Vesselbase.cpp`、`Planet.h`、`Vessel.cpp`。`standardAtmosphere` は、1976 年の米国標準大気（U.S. Standard Atmosphere, 1976。NOAA、NASA、米国空軍が出したもので、米国政府の著作物）の表 2、3、4 をもとに、ここで新しく書いたものです

移植したどのソースファイルにも、何を変えたかが書いてあります。テストで比べる答えは、JPL Horizons（NASA/JPL、パブリックドメイン）から `scripts/fetch-orbit-reference.ts` で保存したものと、Orbiter 自身のコードから `scripts/orbiter-reference.ts` で作ったものです。クレジットは [NOTICE.md](../../../NOTICE.md) にあります。
