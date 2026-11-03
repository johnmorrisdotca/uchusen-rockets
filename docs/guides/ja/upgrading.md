---
title: アップグレード
section: upgrading
order: 13
description: バージョンの間で、プロジェクトが影響を受けうる変更と、驚かずに先へ進む方法を説明します。
---

パッケージはまだ0.xなので、マイナーバージョンで動作が変わることがあります。移る前に [CHANGELOG.md](../../../CHANGELOG.md) を読んでください。このページは、何に注意するかを示します。

## 0.2 から 0.3 へ

0.3 では、ロケット、データ、ヘルパーが追加されました。変更履歴に、削除や名前の変更は記載されていません。

- **新しいロケット**：ファルコン1、サターンV、スペースシャトル、SLS、ニューグレン、エレクトロン、ソユーズ2、ドローン船と着陸地点、スターベースのタワーとシーン、アポロの宇宙船、ジェミニ、マーキュリー、ジュピターC、ISS、ハッブル。どれも `<uchusen-rocket rocket="...">` が、ほかに何も変えずに動きます。
- **ライセンス表記**：パッケージのライセンスは `MIT AND CC-BY-4.0 AND ODbL-1.0` です。スターベースの座標・輪郭・標高と、タワーの13 mの敷地は、MIT ではなく © OpenStreetMap contributors の ODbL です。それらのシーンを配布するならクレジットを付けてください。
- **データ**：`FLIGHT_LOG` と `flightLogOf` が、日付と結果つきで実際の飛行を並べます。
- **並べた図**：`<uchusen-lineup>` では、打ち上げ形態のスペースシャトルがオービターの見える向きになります。
- **ヘルパー**：`builderState` はデモのビルダーの背後にある規則で、`spinOf` と `cleanWay` は要素の `spin` と `way` の属性を読みます。

## 0.1 から 0.2 へ

- `element.drive({ yaw, tilt, zoom, panX, panY })` は、回転、傾き、拡大、移動を、同じファミリーの `<kazoku-view-controls>` に任せます。外から駆動されている間、要素自身のドラッグ、ホイール、キー、自転は停止し、`drive(null)` で元に戻ります。パッケージが kazoku-ui をインポートすることはありません。
- `turnedBy(base, yaw, tilt)` と `ViewChoice` 型が追加されました。
- 0.2.1 では、回転中に描画が2回ずつ行われる問題、変更のたびにグラフィックスメモリーがリークする問題、大きさに上限のないキャンバスの問題が修正されました。`pixelRatioFor`、`MAX_PIXELS`、`MAX_SIDE`、`MAX_RATIO` が追加されました。これらの不具合の回避策を入れていたなら、外してください。

```ts
import { turnedBy, VIEWS } from "@johnmorrisdotca/uchusen-rockets";

console.log(turnedBy(VIEWS["three-quarter"], 30, 5));
```

## 移る前に

1. 今のバージョンと新しいバージョンの間の CHANGELOG の見出しを読みます。
2. 保存している `build` の記述に `check` をかけます。なくなった id は、名前を挙げて拒否されます。
3. `dist/assets` の画像を保存している場合は、取り直してください。より良い出典が見つかると寸法が修正されることがあり、データにその旨が記されています。
4. 彩色したロケットで自分のテストをやり直します。クレジットの行は、表示している部品から来るからです。

## バージョンに関する注意

- 最新のバージョンだけがサポートされます。
- パッケージを使うには Node 22 以降が必要です。
- `three` はピア依存関係で `>=0.170.0` です。CDN のスニペットは、このパッケージがテストされたバージョン（`THREE_VERSION`）を示します。

```ts
import { THREE_VERSION } from "@johnmorrisdotca/uchusen-rockets";

console.log(THREE_VERSION);
```
