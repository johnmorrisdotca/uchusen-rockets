---
title: 打ち上げ記録
section: how-to
order: 8
description: 1957年以降の軌道打ち上げ全試行を、ふつうのデータとして提供します。機体・射場・年・結果で検索と集計ができ、各機体をこのパッケージが描くロケットに結び付けます。
---

`launches` エントリーは、最初のスプートニク以降の軌道打ち上げ全試行の記録です。いつ、どの機体で、どこから、誰が打ち上げ、何を積み、どう終わり、どの軌道に着いたかを記録しています。ふつうのデータとふつうの関数だけで、DOM も時計も依存パッケージもないので、サーバーでもテストでも自分のページでも使えます。パッケージのほかの部分はこれを読み込みません。`@johnmorrisdotca/uchusen-rockets/launches` をインポートしないページには、この記録の分は一切含まれません。

**このデータはこのパッケージ自身のものではなく、MIT でもありません。** ジョナサン・C・マクダウェル（Jonathan C. McDowell）の GCAT（General Catalog of Artificial Space Objects、https://planet4589.org/space/gcat）で、クリエイティブ・コモンズ表示 4.0 ライセンスです。データを表示するときは、必ず次のクレジットを添えてください。**Data from GCAT (J. McDowell, planet4589.org/space/gcat)**。同じ行が `LAUNCH_LOG_SOURCE.credit` にあり、何を取り込み、何を変えたかは [NOTICE.md](../../../NOTICE.md) に書いてあります。

## 打ち上げを読む

```ts
import { launchByTag, LAUNCH_LOG_SOURCE } from "@johnmorrisdotca/uchusen-rockets/launches";

const apollo = launchByTag("1969-059");
console.log(apollo?.utc, apollo?.vehicle, apollo?.site.name, apollo?.pad);
console.log(apollo?.flight, apollo?.payloads.join(", "));
console.log(apollo?.outcome, apollo?.orbit);
console.log(LAUNCH_LOG_SOURCE.credit, "release", LAUNCH_LOG_SOURCE.release);
```

打ち上げには次の項目があります。GCAT にない値は `null`（軌道の数値は項目自体がありません）です。記録は、空白を推測で埋めません。

| 項目 | 内容 |
| --- | --- |
| `tag` | GCAT の打ち上げタグで、重複しません。軌道に着いた打ち上げは国際標識（COSPAR 番号。`1957 ALP`、`2018-017`）、失敗には GCAT が付けたもの（`1957-F01`）です。 |
| `date`、`time`、`utc`、`ms` | UTC の日付（`1957-10-04`）、UTC の時刻（`19:28:34`。GCAT に秒がなければ `20:45`、時刻がなければ `null`）、その2つをつないだ ISO 文字列、1970年からのミリ秒です。GCAT が日付か時刻を不確かとしているときは、`approximate` が true になります。 |
| `vehicle`、`variant`、`family` | GCAT での機体名（`Falcon 9`、`Sputnik 8K71PS`）、あれば型式、GCAT でのファミリー名（`R-7`、`Falcon9`）です。 |
| `rocket`、`rocketVariant` | その機体にあたる、このパッケージのロケットの id と型式の id です。下の「ロケットに結び付ける」を見てください。なければ `null` です。 |
| `site`、`pad` | 射場（`{ code: "NIIP-5", name: "Baikonur" }`）と、GCAT の書き方の射点（`LC1`）です。 |
| `agency`、`country` | 打ち上げた組織（`{ code: "SPX", name: "SpaceX" }`）と、GCAT の示すその国（`{ code: "SU", name: "USSR" }`）です。当時の国なので、1957年のバイコヌール発はソ連、2020年のものはロシアです。 |
| `flight` | GCAT でのフライトまたはミッションの名前（`Apollo 11`、`Tesla Roadster`）です。 |
| `payloads`、`payloadCount` | ペイロード名（最初の8つまで）と、全部の数です。コンステレーションの打ち上げでは `payloadCount` が 60 で、名前は8つです。 |
| `outcome`、`score` | `success`、`partial`、`failure` のどれかです。`partial` には GCAT の評点が付きます。 |
| `orbit` | 到達した軌道です。軌道に着かなかった打ち上げは `null` です。`kind` は目標にした軌道（`LEO`、`SSO`、`GTO`、`EEO` など。`ORBIT_KINDS` にあります）で、`apogeeKm`、`perigeeKm`、`inclinationDeg` は投入軌道の値です。GCAT にあるものだけが入ります。 |

## 打ち上げを検索する

どの検索も、古い順に並べて返します。機体は GCAT での名前、射場はコードか名前で、大文字と小文字を区別せずに一致させます。複数のコードが同じ名前を共有するとき（バイコヌールは GCAT では `NIIP-5` と `GIK-5` の2つです）は、その全部が対象になります。

```ts
import { countLaunches, launchesByOutcome, launchesBySite, launchesByVehicle, launchesByYear, launchTotals } from "@johnmorrisdotca/uchusen-rockets/launches";

launchesByVehicle("Saturn V").length; // 13
launchesByYear(1957).length; // 3
launchesBySite("Baikonur")[0]?.date; // "1957-10-04"
launchesByOutcome("failure")[0]?.tag; // "1957-F01"

const shuttle = launchTotals({ rocket: "space-shuttle" });
console.log(shuttle.total, "launches,", shuttle.failure, "failed");

for (const one of countLaunches("year", { rocket: "electron" })) console.log(one.key, one.count);
```

`findLaunches` は `vehicle`、`family`、`rocket`、`site`、`agency`、`country`、`year`、`from`、`to`、`outcome` のどれでも指定できる絞り込み条件を受け取り、指定した項目はすべて満たす必要があります。`countLaunches(by, filter)` は `vehicle`、`family`、`rocket`、`site`、`agency`、`country`、`year`、`outcome`、`orbit` のどれかでまとめ、`{ key, count }` の行を多い順に返します（年は古い順です）。まとめる項目の値がない打ち上げ（たとえば、ロケットに結び付いていない機体の打ち上げ）は、その集計に入りません。`launchTotals(filter)` は、合計と結果ごとの数を返します。

```ts
import { countLaunches, findLaunches } from "@johnmorrisdotca/uchusen-rockets/launches";

const heavy = findLaunches({ rocket: "falcon-heavy" })[0];
console.log(heavy?.date, heavy?.flight, heavy?.payloads);
console.log(countLaunches("country", { from: "2020-01-01" }).slice(0, 3));
```

## ロケットに結び付ける

GCAT は機体を型名で呼び、このパッケージはその一部を描いています。`LAUNCH_VEHICLE_LINKS` が両者をつなぐ表です。1行が、GCAT の機体名、`ROCKETS` にあるロケットの id、その機体にあたる型式が1つあればその id、そして両者の近さです。`same` は描いている機体そのもの（`Falcon 9`、`Saturn V`、`Soyuz-2-1A`）です。`family` は同じファミリーの別の機体です。たとえば1973年から2004年まで飛んだ Soyuz-U は、描いているのは Soyuz-2 ですが、ここでは `soyuz` として扱います。各行が、実際に飛んだ機体と、実在するロケットと型式を指していることは、テストで確かめています。

| ロケット | 結び付く GCAT の機体 |
| --- | --- |
| `falcon-9`、`falcon-heavy`、`falcon-1` | Falcon 9、Falcon Heavy、Falcon 1 |
| `saturn-v` | Saturn V |
| `space-shuttle` | Space Shuttle |
| `sls`、`new-glenn`、`electron` | SLS Block 1、New Glenn 7x2、Electron |
| `starship` | Starship V2 と V3（描いている型式）、Starship V1.0 |
| `jupiter-c` | Jupiter C |
| `soyuz` | Soyuz-2-1A と 2-1B（描いている型式）、および Soyuz-2-1V、ST-A、ST-B、FG、U、U2、U-PVB、11A511、11A511L、11A511M |

スプートニクを打ち上げた R-7 のように、行のない機体は `rocket: null` です。ドラゴン、ジェミニ、マーキュリーのような宇宙船は、記録では打ち上げ機体ではないので、行はありません。

```ts
import { findLaunches, LAUNCH_VEHICLE_LINKS } from "@johnmorrisdotca/uchusen-rockets/launches";
import { ROCKETS } from "@johnmorrisdotca/uchusen-rockets";

const soyuz = LAUNCH_VEHICLE_LINKS.filter((link) => link.rocket === "soyuz");
console.log(ROCKETS["soyuz"]?.name, "has", soyuz.length, "linked vehicles and", findLaunches({ rocket: "soyuz" }).length, "launches");
```

## 決めたこと

GCAT の一覧には、あらゆる種類の打ち上げが入っています。軌道打ち上げの記録にするために選んだ基準は次のとおりです。自分の用途に合うかどうかを判断できるよう、書いておきます。

- **入れた打ち上げ。** GCAT の打ち上げコードが軌道打ち上げ、または地球から深宇宙への打ち上げ（地球の待機軌道を経て出ていくもの。月へ向かうアポロの飛行や、ファルコンヘビーのロードスター）で、成功か失敗で終わったものを残します。外したのは、弾道飛行、ミサイル、観測ロケット、月からの打ち上げ、射点での爆発と射点での中止（機体が離昇しなかったもの）、そして最初の1周のうちに降りる計画のため GCAT が「準軌道（near-orbital）」と呼ぶスターシップの飛行です。GCAT が軌道打ち上げに数えているスターシップの飛行は入っています。アポロの AS-202 のように、GCAT が深宇宙の打ち上げに分類している弾道試験が少しあり、それらは `orbit: null` で入っています。
- **結果。** GCAT の `S` が `success`、`F` が `failure` です。GCAT が 1 から 99 の評点を付けた打ち上げ（`S75`、`F40`）は `partial` で、`score` がその数です。使える軌道だが目標どおりではなかった、ペイロードが分離しなかった、軌道には着いたが役に立たなかった、などです。GCAT 自身は 75 未満を失敗として数えます。その基準にしたいときは、`failure` と、`score` が 75 未満の `partial` を数えてください。
- **時刻。** 時刻はすべて GCAT の示す UTC で、ロケットが最初に動いた時刻です。点火を基準にする資料とは数秒ずれることがあります。時刻のない打ち上げが約460件に1件、GCAT が時刻を不確かとしている打ち上げが約100件に1件あります。
- **ペイロード。** 名前は GCAT が物体に付けた名前です（`1-y ISZ` はスプートニク1号で、ロシア語を目録の書き方でローマ字にしています）。1つの打ち上げにつき、最初の8つの名前と全体の数だけを持つので、記録は小さく保たれます。
- **軌道。** `kind` は GCAT の打ち上げプロファイルコードが示す、目標にした軌道で、軌道に着いた打ち上げにだけ付けます。`partial` の打ち上げでは、到達した軌道が別のものであることもあります。数値は投入軌道のものです。GCAT の持つ値には偏りがあり、近地点と軌道傾斜角があるのは約5件に1件（2020年以降と1960〜70年代のものが大半）、遠地点があるのは10件に9件です。脱出軌道（207件）の遠地点は GCAT の切りのよい 150,000 km で、「地球を離れる」という意味の値であり、測定値ではありません。近地点がマイナスになることがあります（13件。スターシップの飛行を含みます）。GCAT が示す飛行経路が地表より下に入るためで、その飛行はこの近地点の軌道を1周していません。この数値は高度ではありません。
- **名前。** 射場の名前2つは綴りを直しています。Baykonur を Baikonur に、Vostochniy を Vostochny にしました。そのほかは GCAT の綴りのままです。

## サイズと読み込み

記録は7,425件の打ち上げで、ファイルは `dist/launches/data.js` の1つです。そのままで約1.1 MB、圧縮して送ると約240 KB です。1つにまとめた JSON 文字列で、最初の検索で解析し（約16ミリ秒）、以降の検索はメモリから読みます。これをインポートするのは `launches` エントリーだけなので、ツリーシェイクできないバンドラーでも、このエントリーをインポートしないページには入りません。ページがファイルを読み込んだあとは、ネットワークも要りません。

`scripts/make-launches.ts` が GCAT の TSV ファイルからこのファイルを作ります（`node scripts/make-launches.ts <フォルダー>`）。新しいリリースが出たら、もう一度まとめ直せます。リリース番号は `launch.tsv` の冒頭にある、`#` で始まるコメント行から読みます。そこに書かれていないときは `--release 1.8.9` のように指定します。ヘッダーにも `--release` にも番号がないときは、スクリプトは止まります。そのため、古いリリース番号が新しいデータに付くことはありません。記録に入るリリース番号とデータの日付は、`LAUNCH_LOG_SOURCE.release` と `.updated` で読めます。

クレジットは `dist/launches/source.js` という小さな別ファイルで、`@johnmorrisdotca/uchusen-rockets/launches/source` としてもインポートできます。クレジットを表示するだけのページは、1.1 MB のデータを読み込まずに済みます。`launches()` が返す打ち上げはすべて凍結されています。どの呼び出し元も同じ行を共有しているためです。変更したいときは、コピーしてから変更してください。
