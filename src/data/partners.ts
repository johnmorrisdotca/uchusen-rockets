// Every country that took part in a craft, not only the one it comes from, each with what it contributed (in English and Japanese) and its source, read 2026-11-16 from the pages named in `sources.ts`.
// `countryOf` stays as it was: one country of origin, or a blank. A craft with no line here has the one country its own article names, as "its country of origin"; a ship of the SPX fleet is this package's own design and has none.
// Where an agency is the contributor (ESA), the countries are the ones its pages list, marked `via` so a picture can show them as one group.
import { ROCKET_COUNTRIES, type CountryCode } from "./countries.ts";
import type { SourceId } from "./sources.ts";
import type { Figure } from "./types.ts";

/**
 * The former countries that `@johnmorrisdotca/hata` draws a flag for, each by the code hata keeps it under (ISO 3166-3 where it has one, the IOC's where it does not): the Soviet Union is "SUHH".
 *
 * @example
 * ```ts
 * import { FORMER_COUNTRY_CODES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FORMER_COUNTRY_CODES.includes("SUHH"));
 * ```
 */
export const FORMER_COUNTRY_CODES = ["ANHH", "BOH", "BUMM", "CSHH", "CSXX", "DDDE", "FRG", "RHZW", "SUHH", "WIF", "YUCS", "ZRCD"] as const;

/**
 * A country code a partner may carry: an ISO 3166-1 alpha-2 code, or one of the former countries' codes that hata draws (the Soviet Union is "SUHH").
 *
 * @example
 * ```ts
 * import type { PartnerCode } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const soviet: PartnerCode = "SUHH";
 * console.log(soviet);
 * ```
 */
export type PartnerCode = CountryCode | (typeof FORMER_COUNTRY_CODES)[number];

/**
 * A short line in both languages.
 *
 * @example
 * ```ts
 * import { partnersOf, type PartnerWords } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const contribution: PartnerWords | undefined = partnersOf("space-shuttle")[1]?.contribution;
 * console.log(contribution?.en, contribution?.ja);
 * ```
 */
export interface PartnerWords {
  en: string;
  ja: string;
}

/**
 * The group a country is shown under when the group, not the country, made the contribution: `source` is the page that lists the country as one of the group's, and `named` is true when that page is about this craft and names the country, false when it is the group's own list of its members today and says nothing of this craft.
 *
 * @example
 * ```ts
 * import { partnersOf, type PartnerGroup } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const via: PartnerGroup | undefined = partnersOf("ariane-6")[0]?.via;
 * console.log(via?.group, via?.named);
 * ```
 */
export interface PartnerGroup {
  group: "esa";
  source: SourceId;
  named: boolean;
}

/**
 * A country that took part in a craft: its code, what it contributed in English and Japanese, and the source for that. A country shown through a group carries `via`.
 *
 * @example
 * ```ts
 * import { partnersOf, type Partner } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const canada: Partner | undefined = partnersOf("space-shuttle").find((partner) => partner.country === "CA");
 * console.log(canada?.contribution.en, canada?.source);
 * ```
 */
export interface Partner {
  /** An ISO 3166-1 alpha-2 code, or a former country's code ("SUHH"). Every one has a flag in hata. */
  country: PartnerCode;
  contribution: PartnerWords;
  /** The page that says what the country contributed. */
  source: SourceId;
  via?: PartnerGroup;
  note?: string;
}

const ESA_MEMBERS = ["AT", "BE", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LU", "NL", "NO", "PL", "PT", "RO", "SI", "ES", "SE", "CH", "GB"] as const satisfies readonly CountryCode[];

/**
 * The 23 Member States of the European Space Agency, as ESA's own page lists them (read 2026-11-16). Canada sits on ESA's council as a Cooperating State and is not in the list. The list is ESA today: where a craft's own page names the states that took part, `partnersOf` uses that list instead.
 *
 * @example
 * ```ts
 * import { ESA_MEMBER_STATES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(ESA_MEMBER_STATES.value?.length, ESA_MEMBER_STATES.source);
 * ```
 */
export const ESA_MEMBER_STATES: Figure<readonly CountryCode[]> = { value: ESA_MEMBERS, source: "esa-member-states", date: "2026-11-16", note: "ESA's page: 23 Member States. Canada is a Cooperating State." };

const ORIGIN: PartnerWords = { en: "Its country of origin", ja: "開発国" };
const TODAY = "ESA's Member States today, from ESA's own page. The pages read for this craft do not say which states paid for it.";

const one = (country: PartnerCode, contribution: PartnerWords, source: SourceId, note?: string): Partner => ({ country, contribution, source, ...(note ? { note } : {}) });
const through = (countries: readonly CountryCode[], contribution: PartnerWords, source: SourceId, via: SourceId, named: boolean, note?: string): Partner[] =>
  countries.map((country) => ({ country, contribution, source, via: { group: "esa", source: via, named }, ...(note ? { note } : {}) }));

const SPACELAB: PartnerWords = { en: "Spacelab, the European laboratory carried in the payload bay", ja: "ペイロードベイに搭載された欧州の実験室スペースラブ" };
const COLUMBUS: PartnerWords = { en: "The Columbus laboratory, through ESA", ja: "ESA を通じたコロンバス実験棟" };
const ARIANE: PartnerWords = { en: "Pays into ESA's Ariane 6 programme, and its industry builds parts of the rocket", ja: "ESA のアリアン6計画に出資し、自国の企業が機体の部品を製造" };

/** By rocket id, only where a craft has a partner beyond its country of origin, or has no country of origin at all. `ROCKET_PARTNERS` adds the rest. */
const SPECIFIC: Readonly<Record<string, readonly Partner[]>> = {
  "space-shuttle": [
    one("US", { en: "The orbiters and the programme, operated by NASA", ja: "NASA が運用したオービターとスペースシャトル計画" }, "wikipedia-space-shuttle"),
    one("CA", { en: "Canadarm, the Shuttle Remote Manipulator System, built by Canadian firms including Spar Aerospace", ja: "カナダアーム（スペースシャトルのリモート・マニピュレータ・システム）。スパー・エアロスペース社を含むカナダの企業が製造" }, "csa-canadarm"),
    ...through(["AT", "BE", "DK", "FR", "DE", "IT", "NL", "ES", "CH", "GB"], SPACELAB, "collectspace-spacelab", "collectspace-spacelab", true, "Ten countries funded, designed and built Spacelab, which flew in the payload bay on many missions and is not drawn. Germany was West Germany then."),
  ],
  iss: [
    one("US", { en: "The US Orbital Segment: Destiny, Unity, the truss and the solar arrays", ja: "米国の軌道セグメント（デスティニー、ユニティ、トラス、太陽電池パドル）" }, "wikipedia-iss-participants"),
    one("RU", { en: "The Russian Orbital Segment, including Zarya and Zvezda", ja: "ロシアの軌道セグメント（ザーリャ、ズヴェズダなど）" }, "wikipedia-iss-participants"),
    one("JP", { en: "The Kibō laboratory", ja: "日本実験棟「きぼう」" }, "wikipedia-iss-participants"),
    one("CA", { en: "Canadarm2, Dextre and the Mobile Base System", ja: "カナダアーム2、デクスター、モバイル・ベース・システム" }, "csa-canadarm2"),
    ...through(["BE", "DK", "FR", "DE", "IT", "NL", "NO", "ES", "SE", "CH", "GB"], COLUMBUS, "wikipedia-iss-participants", "nasa-iss-cooperation", true, "The eleven ESA countries NASA lists as taking part. ESA's own page names ten that signed the 1998 agreement and the United Kingdom, which joined in 2012; it adds Hungary, Luxembourg and Slovenia, which committed in 2019, and they are left out here."),
  ],
  hubble: [
    one("US", { en: "The telescope, deployed from a Space Shuttle in 1990", ja: "1990年にスペースシャトルから放出された望遠鏡本体" }, "esa-hubble-overview"),
    ...through(ESA_MEMBERS, { en: "Through ESA: the Faint Object Camera, the first two solar wings and a team at the Space Telescope Science Institute", ja: "ESA を通じて、微光天体カメラ、最初の2枚の太陽電池翼、宇宙望遠鏡科学研究所の要員を提供" }, "esa-hubble-overview", "esa-member-states", false, TODAY),
  ],
  jwst: [
    one("US", { en: "Led its design and development", ja: "設計と開発を主導" }, "nasa-webb-international"),
    one("CA", { en: "The Fine Guidance Sensor and the Near-Infrared Imager and Slitless Spectrograph (NIRISS)", ja: "精密ガイドセンサーと近赤外線撮像装置・スリットレス分光器（NIRISS）" }, "csa-webb-role"),
    ...through(ESA_MEMBERS, { en: "Through ESA: the NIRSpec instrument, the optical system of MIRI, the Ariane 5 launch and staff for operations", ja: "ESA を通じて、NIRSpec、MIRI の光学系、アリアン5による打ち上げ、運用要員を提供" }, "esa-webb-europe-role", "esa-member-states", false, `${TODAY} NASA counts 12 European nations among the contributors and does not name them.`),
  ],
  "apollo-soyuz": [
    one("US", { en: "The Apollo spacecraft, built by North American Rockwell and launched on a Saturn IB from Kennedy", ja: "ノースアメリカン・ロックウェル社製のアポロ宇宙船。ケネディ宇宙センターからサターンIBで打ち上げ" }, "wikipedia-apollo-soyuz"),
    one("SUHH", { en: "The Soyuz spacecraft, built by NPO Energia and launched from Baikonur", ja: "NPO エネルギア社製のソユーズ宇宙船。バイコヌールから打ち上げ" }, "wikipedia-apollo-soyuz", "The Soviet Union is not an ISO 3166-1 code; hata keeps its flag as SUHH."),
  ],
  "sputnik-1": [one("SUHH", { en: "Built and launched by the Soviet Union", ja: "ソ連が製造・打ち上げ" }, "nasa-history-sputnik-chronology", "NASA's chronology names the USSR. The Soviet Union is not an ISO 3166-1 code; hata keeps its flag as SUHH.")],
  electron: [
    one("NZ", { en: "Launches from Launch Complex 1 on the Māhia Peninsula", ja: "マヒア半島の第1発射施設から打ち上げ" }, "wikipedia-electron", "Its source names New Zealand and the United States as its countries of origin."),
    one("US", { en: "A second launch site: Launch Complex 2 at Wallops, Virginia", ja: "第2の発射場：バージニア州ワロップスの第2発射施設" }, "wikipedia-electron", "Its source names New Zealand and the United States as its countries of origin."),
  ],
  "ariane-6": [
    one("FR", { en: "CNES, France's space agency, built and runs the launch site in French Guiana", ja: "フランス国立宇宙研究センター（CNES）が仏領ギアナの発射施設を建設・運用" }, "esa-ariane-6-cooperation", "France is also one of the participating states, and is listed once, here."),
    ...through(["AT", "BE", "CZ", "DE", "IT", "IE", "NL", "NO", "RO", "ES", "SE", "CH"], ARIANE, "esa-ariane-6-cooperation", "esa-ariane-6-cooperation", true),
  ],
  sls: [
    one("US", { en: "The rocket and the Orion capsule, used by NASA", ja: "NASA が使うロケットとオリオン宇宙船" }, "wikipedia-sls"),
    ...through(ESA_MEMBERS, { en: "Through ESA: the European Service Module of Orion, built by Airbus Defence and Space", ja: "ESA を通じて、エアバス・ディフェンス・アンド・スペース社が製造したオリオンの欧州サービスモジュール" }, "wikipedia-esm", "esa-member-states", false, TODAY),
  ],
  cassini: [
    one("US", { en: "The orbiter, built and run by NASA's Jet Propulsion Laboratory", ja: "NASA ジェット推進研究所が製造・運用した周回機" }, "wikipedia-cassini-huygens"),
    one("IT", { en: "The Italian Space Agency (ASI) provided the high-gain antenna, the radar and the radio science subsystem", ja: "イタリア宇宙機関（ASI）が高利得アンテナ、レーダー、電波科学サブシステムを提供" }, "wikipedia-cassini-huygens", "Italy is also an ESA Member State, and is listed once, here."),
    ...through(ESA_MEMBERS.filter((country) => country !== "IT"), { en: "Through ESA: the Huygens probe, which the orbiter carried to Titan", ja: "ESA を通じて、周回機が土星の衛星タイタンまで運んだ探査機ホイヘンスを提供" }, "wikipedia-cassini-huygens", "esa-member-states", false, `${TODAY} The probe is not in the model.`),
  ],
  galileo: [
    one("US", { en: "The spacecraft, built by NASA's Jet Propulsion Laboratory", ja: "NASA ジェット推進研究所が製造した探査機" }, "nasa-galileo"),
    one("DE", { en: "The propulsion system, built by Messerschmitt-Bölkow-Blohm", ja: "メッサーシュミット・ベルコウ・ブローム社が製造した推進系" }, "nasa-galileo", "Provided by the Federal Republic of Germany, which NASA calls its major international partner on Galileo. West Germany then; Germany's code is DE."),
  ],
  juno: [
    one("US", { en: "The spacecraft, operated by NASA with the Jet Propulsion Laboratory", ja: "NASA がジェット推進研究所とともに運用する探査機" }, "nasa-juno"),
    one("IT", { en: "The Jovian Infrared Auroral Mapper (JIRAM)", ja: "木星赤外オーロラマッパー（JIRAM）" }, "nasa-juno"),
  ],
  "atlas-v": [
    one("US", { en: "The rocket, built by United Launch Alliance", ja: "ユナイテッド・ローンチ・アライアンス社製のロケット" }, "wikipedia-atlas-v"),
    one("RU", { en: "The RD-180 first-stage engine, made by NPO Energomash", ja: "NPO エネルゴマッシュ社製の第1段エンジン RD-180" }, "wikipedia-atlas-v"),
  ],
};

function withOrigin(): Record<string, readonly Partner[]> {
  const all: Record<string, readonly Partner[]> = { ...SPECIFIC };
  for (const [id, figure] of Object.entries(ROCKET_COUNTRIES)) {
    if (Object.hasOwn(all, id) || figure.value === null || figure.source === null) continue;
    all[id] = [one(figure.value, ORIGIN, figure.source, figure.note)];
  }
  return all;
}

/**
 * Every country that took part in each rocket, by id: the rocket's country of origin, and the others that built a part, supplied it or flew with it. A rocket with one country has one partner whose line is "Its country of origin". The Space Shuttle has the United States, Canada and the ten countries of Spacelab; the ISS the five partners and the ESA countries; Ariane 6 the thirteen states ESA lists. A ship of the SPX fleet has none.
 *
 * @example
 * ```ts
 * import { ROCKET_PARTNERS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(ROCKET_PARTNERS["jwst"]?.map((partner) => partner.country).slice(0, 3), Object.keys(ROCKET_PARTNERS).length);
 * ```
 */
export const ROCKET_PARTNERS: Readonly<Record<string, readonly Partner[]>> = withOrigin();

/**
 * The countries that took part in a rocket, each with what it contributed in English and Japanese and its source. A country shown through ESA carries `via`. A ship of the SPX fleet, which is this package's own design, and an id that is not read give an empty list. `countryOf` still gives the one country of origin, or a blank.
 *
 * @param rocket A rocket's id, built or planned.
 * @returns The partners, the country of origin first where it has one. Empty when there are none.
 * @example
 * ```ts
 * import { partnersOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const shuttle = partnersOf("space-shuttle");
 * console.log(shuttle.map((partner) => partner.country).join(" "), shuttle[1]?.contribution.en);
 * ```
 */
export function partnersOf(rocket: string): readonly Partner[] {
  return Object.hasOwn(ROCKET_PARTNERS, rocket) ? (ROCKET_PARTNERS[rocket] as readonly Partner[]) : [];
}
