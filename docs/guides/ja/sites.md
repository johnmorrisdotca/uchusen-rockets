---
title: 宇宙港と射場
section: how-to
order: 9
description: 55か所の宇宙港と射場を、ID・英語名と日本語名・位置・運営者・国・各地からの打ち上げ数つきのふつうのデータとして提供します。地図や地球儀に置くためのものです。
---

`sites` エントリーは、ロケットが飛び立つ場所のデータです。陸上の宇宙港が47か所、打ち上げ海域（海上の区域、洋上基地、空中発射の基地2か所）が8か所あります。どの場所にも、ID、英語名と日本語名、位置の点、国、運営者、GCAT・CelesTrak・Wikidata でのコード、GCAT の打ち上げ記録にあるその場所からの打ち上げがついています。ふつうのデータとふつうの関数だけで、DOM も時計も依存パッケージもないので、地図でも地球儀でもサーバーでもテストでも使えます。パッケージのほかの部分はこれを読み込みません。`@johnmorrisdotca/uchusen-rockets/sites` をインポートしないページには、この分は一切含まれません。

**このデータはこのパッケージ自身のものではなく、MIT でもありません。** 位置・名前・運営者は Wikidata（CC0、パブリックドメイン）から、打ち上げ数と一部の位置は、ジョナサン・C・マクダウェル（Jonathan C. McDowell）の GCAT（General Catalog of Artificial Space Objects、https://planet4589.org/space/gcat）から取っています。GCAT は、クリエイティブ・コモンズ表示 4.0 ライセンスです。GCAT 由来の部分（打ち上げ数、最初と最後の日付）を表示するときは、必ず次のクレジットを添えてください。**Data from GCAT (J. McDowell, planet4589.org/space/gcat)**。同じ行が `SITES_SOURCE.gcat.credit` にあります。何を取り込み、何を手で入力し、何を変えたかは [NOTICE.md](../../../NOTICE.md) に書いてあります。

## 場所を読む

```ts
import { siteById, SITES_SOURCE } from "@johnmorrisdotca/uchusen-rockets/sites";

const site = siteById("tanegashima");
console.log(site?.name.en, site?.name.ja, site?.country, site?.lat, site?.lon);
console.log(site?.operators, site?.launches?.total, "launches, the last on", site?.launches?.last);
console.log(SITES_SOURCE.gcat.credit);
```

場所には次の項目があります。出典にない値は `null` か空のリストです。空白を推測で埋めることはしません。

| 項目 | 内容 |
| --- | --- |
| `id` | 英小文字のスラッグで、重複せず、変わりません。`cape-canaveral`、`tanegashima` など。エントリーの外から場所を指すときは、種類をつけて書きます（`spaceport/kourou`）。 |
| `kind` | `spaceport` は陸上の固定された場所です。`launch-area` は、点で示せる場所がないもので、海上の区域、洋上基地、空中発射の機体が飛び立った空軍基地などです。 |
| `name` | `{ en, ja }`。英語名と日本語名です。どちらも必ずあります。 |
| `country` | その場所がある地域の ISO 3166-1 alpha-2 コードで、海上では `null` です。運営している国ではなく、場所がある国です。バイコヌールは `KZ`、クールーは `GF`（フランス領ギアナ）です。打ち上げ記録の `site.iso` は運営している国のコードなので、違うことがあります。 |
| `lat`、`lon` | 度で、小数点以下4桁です。場所の中の1点で、発射台や敷地の輪郭ではありません。宇宙港は数十 km に広がっていて、ヴァンデンバーグの点は基地の中ほどにあり、発射台の位置ではありません。 |
| `approximate` | 出典が示す精度が 0.005 度（約 500 m）より粗いか、示されていないときに true です。海上の区域の点は、いつも approximate です。 |
| `operators` | 運営者、なければ所有者の名前で、Wikidata に書かれたとおりに英語で入っています。何も書かれていなければ空です。 |
| `codes` | `gcat` はその場所の GCAT の射場コードで、打ち上げ記録の `site.code` と同じ形です（バイコヌールは `NIIP-5` と `GIK-5`）。`celestrak` は CelesTrak のコードで、識別子としてだけ入れています。 |
| `wikidata` | `{ id, revision }`。その場所の Wikidata の項目と、読んだ版です。項目がなければ（海上の区域）`null` です。 |
| `launches` | `{ total, success, partial, failure, first, last }`。その場所の GCAT コードから、GCAT の記録にある軌道打ち上げの試行数と、最初と最新の UTC の日付です。記録になければ（スペースポート・アメリカ、エスレンジ）`null` です。 |
| `sources` | 各項目の出どころです。`position`（`wikidata` か `gcat`）、`en` と `ja`（`wikidata` か `typed`）、`country` と `operators`（`wikidata`、`typed`、`null`）。`typed` は、パッケージの一覧に手で書いたもので、読む人が確かめるためのものです。 |

## 場所を探す

```ts
import { findSites } from "@johnmorrisdotca/uchusen-rockets/sites";

findSites({ code: "NIIP-5" })[0]?.id; // "baikonur"
console.log(findSites({ country: "JP" }).map((site) => site.name.ja));
console.log(findSites({ kind: "spaceport", since: "2025-11-09" }).length);
console.log(findSites({ launched: false }).map((site) => site.id));
```

`findSites` は、`kind`、`country`（海上の場所は `null`）、`code`、`launched`、`since` のどれでも条件にでき、指定した条件はすべて満たす必要があります。`code` は、どの体系でも、その場所のコードのどれか1つで、大文字小文字は区別しません。GCAT のコード（`NIIP-5`）、CelesTrak のコード（`TYMSC`）、Wikidata の項目（`Q177477`）が使えます。CelesTrak はケープカナベラルとケネディを `AFETR` という1つのコードにまとめているので、このコードでは2か所とも見つかります。`since` は、記録にある最新の打ち上げがその日以降の場所を残します。「まだ使われている」を表すひとつの方法です。記録に打ち上げがない場所は残りませんが、記録に入らないロケットのために使われていることはあります。

## 場所を地図に置く

どの場所にも点があるので、地図や地球儀は一覧をそのまま使えます。打ち上げ記録とは GCAT のコードでつながるので、打ち上げからその場所が見つかります。

```ts
import { launchByTag } from "@johnmorrisdotca/uchusen-rockets/launches";
import { findSites } from "@johnmorrisdotca/uchusen-rockets/sites";

const launch = launchByTag("1969-059");
const place = findSites({ code: launch?.site.code })[0];
console.log(place?.name.en, place?.lat, place?.lon, place?.launches?.total);
```

2つのエントリーは別々のファイルで、それぞれ自分だけを読み込みます。場所のデータは記録を読み込まず、記録も場所のデータを読み込みません。

## 場所の出どころ

- **どの場所か。** GCAT の記録にある65の射場を、同じ場所のものは1つにまとめました（バイコヌールの GCAT コード2つ、ヴァンデンバーグの5つ、ケープカナベラルの3つ）。それに、探されそうな場所を7か所足しました。準軌道の射場や新しい射場（スペースポート・アメリカ、エスレンジ、コーン・ランチ、北海道スペースポート、エトラク、アーネム、クーニバ）です。GCAT 自身が疑わしいとしている `TYSC?`（場所も国もない打ち上げ1件）は、どの行にも入れていません。閉鎖された場所も、最後の打ち上げの日付つきで残しています。
- **点。** その場所の Wikidata の項目にある座標です。Wikidata に項目がない場所（海上の区域）や、その点が場所を指していない場合は GCAT の点を使い、`sources.position` が `gcat` になります。スターベースがそうで、Wikidata の点は発射台から3 km 離れた村でした。どの点も、GCAT の点から 100 km 以内にあることを確かめています。
- **名前。** Wikidata の項目にある英語と日本語のラベルです。ラベルがないか、人が使う名前と違うものは手で入力し（`sources.en`、`sources.ja`）、NOTICE と変更履歴に、確認用に書き出しています。海上の区域の名前は、「黄海の発射海域」のような、ふつうの説明です。名前にロゴやマークは入っていません。
- **運営者。** 項目に書かれた運営者、なければ所有者で、読んだ日の時点のものです。解散したものは除いています。項目に何も書かれていないか、機関の施設だけが書かれているとき（種子島は「鹿児島宇宙センター」で、JAXA 自身の拠点です）は、パッケージの一覧で運営者の Wikidata 項目を指定し、`sources.operators` が `typed` になります。運営者自身のページとは照らし合わせていません。射場の運営者は、点より変わりやすいからです。
- **打ち上げ。** このパッケージの打ち上げ記録から数えているので GCAT の数字で、テストが、数が記録と一致することを確かめます。記録を作り直したら、場所のデータも作り直す必要があります。
- **含まないもの。** 発射台、敷地の輪郭、機関のセンターや追跡局、空港、港、これからの打ち上げです。OpenStreetMap や Wikipedia のデータ、非営利限定やシェアアライクの一覧は使っていません。CelesTrak のコードは識別子として残していますが、座標も文章も使っていません。

## サイズと読み込み

データは55か所で、1つのファイル `dist/sites/data.js` に入っていて、そのままで約 28 kB です。バンドラーのとおりにまとめて最小化したエントリーは 27 kB で、圧縮して送ると 6 kB です。テストが、それをエントリー自身の基準値と照らします。このデータを読み込むのは `sites` エントリーだけです。クレジットは小さな別ファイル `dist/sites/source.js` で、`@johnmorrisdotca/uchusen-rockets/sites/source` としてもインポートできます。クレジットを表示するだけのページは、場所のデータを読み込まずに済みます。`sites()` が返す場所はすべて凍結されています。どの呼び出し元も同じ行を共有しているためです。変更したいときは、コピーしてから変更してください。

`scripts/make-sites.ts` が、`scripts/sites-list.ts` の一覧、Wikidata、GCAT の `sites.tsv` からファイルを作ります（`node scripts/make-sites.ts <フォルダー> --release 1.8.9`）。Wikidata には2回問い合わせます（場所の項目と、運営者・国の項目）。英語名か日本語名がない場所、点が GCAT の点から 100 km を超えて離れている場所、打ち上げ記録にある射場がどの行にも入っていない場合は、止まります。
