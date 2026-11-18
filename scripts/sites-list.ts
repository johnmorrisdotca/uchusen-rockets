// The places the `sites` entry holds, as scripts/make-sites.ts reads them: what a person decides, one row at a time. Everything else comes from Wikidata (CC0) and GCAT (CC BY 4.0) when the script runs.
//
// id         the entry's own slug, unique
// kind       spaceport: a fixed place on land. launch-area: a sea zone, a platform or an air-launch base, where there is no spaceport to point at.
// wikidata   the item for the place itself (never a pad inside it, a village or a company), or null where Wikidata has none
// gcat       GCAT's launch-site codes (sites.tsv) for the place: every code in the launch log is on exactly one row, bar `unplaced` below
// celestrak  CelesTrak's launch-site codes for the place, kept as identifiers only (no CelesTrak coordinates or text are used)
// country    the ISO 3166-1 alpha-2 code of the territory the place is in, or null at sea. The script checks it against the item's country (P17) and says where it differs
// en, ja     a name typed here, where the item has no label or the label is not the name a reader knows. Otherwise the Wikidata label is used.
// position   "gcat" where the item's point is not the place (Starbase: Wikidata's is the village, 3 km away), so GCAT's is used
// operators  Wikidata items to name as the operators instead of what the place's own item says, where that is missing or names a facility of the agency (Tanegashima: "Kagoshima Space Center", JAXA's own site)
export interface SiteRow {
  id: string;
  kind: "spaceport" | "launch-area";
  wikidata: string | null;
  gcat: string[];
  celestrak: string[];
  country: string | null;
  en?: string;
  ja?: string;
  position?: "gcat";
  operators?: string[];
}

export const SITE_ROWS: SiteRow[] = [
  { id: "cape-canaveral", kind: "spaceport", wikidata: "Q334465", gcat: ["CC", "SPFL", "SPFLA"], celestrak: ["AFETR"], country: "US", ja: "ケープカナベラル宇宙軍基地" },
  { id: "kennedy", kind: "spaceport", wikidata: "Q48821", gcat: ["KSC"], celestrak: ["AFETR"], country: "US" },
  { id: "vandenberg", kind: "spaceport", wikidata: "Q461492", gcat: ["V", "VS", "VSFB", "VSFBS", "PA"], celestrak: ["AFWTR"], country: "US", ja: "ヴァンデンバーグ宇宙軍基地" },
  { id: "wallops", kind: "spaceport", wikidata: "Q182348", gcat: ["WI", "WIMB", "MARS"], celestrak: ["WLPIS"], country: "US", operators: ["Q23548"] },
  { id: "kodiak", kind: "spaceport", wikidata: "Q283842", gcat: ["KLC", "PSCA"], celestrak: ["KODAK"], country: "US" },
  { id: "starbase", kind: "spaceport", wikidata: "Q16950811", gcat: ["STB"], celestrak: ["STARB"], country: "US", ja: "スターベース", position: "gcat" },
  { id: "mojave", kind: "spaceport", wikidata: "Q390522", gcat: ["MHV"], celestrak: [], country: "US", en: "Mojave Air and Space Port" },
  { id: "kwajalein", kind: "spaceport", wikidata: "Q1794892", gcat: ["KMR"], celestrak: ["KWAJ"], country: "MH", en: "Kwajalein Atoll (Reagan Test Site)", ja: "クェゼリン環礁" },
  { id: "kauai", kind: "spaceport", wikidata: "Q10860388", gcat: ["KAU"], celestrak: [], country: "US" },
  { id: "china-lake", kind: "spaceport", wikidata: "Q3014558", gcat: ["NOTS"], celestrak: [], country: "US" },
  { id: "spaceport-america", kind: "spaceport", wikidata: "Q1352314", gcat: [], celestrak: [], country: "US" },
  { id: "corn-ranch", kind: "spaceport", wikidata: "Q3693636", gcat: [], celestrak: [], country: "US" },
  { id: "baikonur", kind: "spaceport", wikidata: "Q177477", gcat: ["NIIP-5", "GIK-5"], celestrak: ["TYMSC"], country: "KZ" },
  { id: "plesetsk", kind: "spaceport", wikidata: "Q15778", gcat: ["NIIP-53", "GIK-1", "GNIIPV", "GNIIP"], celestrak: ["PLMSC"], country: "RU" },
  { id: "kapustin-yar", kind: "spaceport", wikidata: "Q753201", gcat: ["GTsP-4", "GTsMP-4"], celestrak: ["KYMSC"], country: "RU" },
  { id: "vostochny", kind: "spaceport", wikidata: "Q1166191", gcat: ["VOST"], celestrak: ["VOSTO"], country: "RU", operators: ["Q190795"] },
  { id: "svobodny", kind: "spaceport", wikidata: "Q1366384", gcat: ["GIK-2"], celestrak: ["SVOBO"], country: "RU" },
  { id: "dombarovsky", kind: "spaceport", wikidata: "Q627080", gcat: ["YAS"], celestrak: ["DLS"], country: "RU", en: "Dombarovsky (Yasny)" },
  { id: "jiuquan", kind: "spaceport", wikidata: "Q692677", gcat: ["JQ"], celestrak: ["JSC"], country: "CN" },
  { id: "taiyuan", kind: "spaceport", wikidata: "Q1194479", gcat: ["TYSC"], celestrak: ["TAISC"], country: "CN" },
  { id: "xichang", kind: "spaceport", wikidata: "Q734306", gcat: ["XSC"], celestrak: ["XICLF"], country: "CN" },
  { id: "wenchang", kind: "spaceport", wikidata: "Q1246624", gcat: ["WEN"], celestrak: ["WSC"], country: "CN" },
  { id: "hainan-commercial", kind: "spaceport", wikidata: "Q112957964", gcat: ["HCSLS"], celestrak: [], country: "CN", ja: "文昌商業宇宙発射場" },
  { id: "kourou", kind: "spaceport", wikidata: "Q308987", gcat: ["CSG"], celestrak: ["FRGUI"], country: "GF" },
  { id: "hammaguir", kind: "spaceport", wikidata: "Q1021734", gcat: ["HMG"], celestrak: ["HGSTR"], country: "DZ" },
  { id: "alcantara", kind: "spaceport", wikidata: "Q922797", gcat: ["ALCA"], celestrak: ["ALCLC"], country: "BR" },
  { id: "sriharikota", kind: "spaceport", wikidata: "Q640273", gcat: ["SHAR", "SDSC"], celestrak: ["SRILR"], country: "IN", operators: ["Q229058"] },
  { id: "tanegashima", kind: "spaceport", wikidata: "Q742683", gcat: ["TNSC"], celestrak: ["TANSC"], country: "JP", operators: ["Q179103"] },
  { id: "uchinoura", kind: "spaceport", wikidata: "Q1077124", gcat: ["KASC", "USC"], celestrak: ["KSCUT"], country: "JP", operators: ["Q179103"] },
  { id: "kii", kind: "spaceport", wikidata: "Q122375877", gcat: ["KII"], celestrak: ["SPKII"], country: "JP" },
  { id: "hokkaido", kind: "spaceport", wikidata: "Q109605856", gcat: [], celestrak: [], country: "JP" },
  { id: "naro", kind: "spaceport", wikidata: "Q495281", gcat: ["NARO"], celestrak: ["NSC"], country: "KR", operators: ["Q494948"] },
  { id: "sohae", kind: "spaceport", wikidata: "Q377158", gcat: ["SOHAE"], celestrak: ["YUN"], country: "KP" },
  { id: "tonghae", kind: "spaceport", wikidata: "Q136547814", gcat: ["TONGH"], celestrak: [], country: "KP" },
  { id: "semnan", kind: "spaceport", wikidata: "Q16047974", gcat: ["SEM"], celestrak: ["SEMLS"], country: "IR" },
  { id: "shahroud", kind: "spaceport", wikidata: "Q112648507", gcat: ["SHAHR"], celestrak: ["SMTS"], country: "IR", en: "Shahroud Space Center", ja: "シャールード宇宙センター" },
  { id: "palmachim", kind: "spaceport", wikidata: "Q590092", gcat: ["PALB"], celestrak: ["YAVNE"], country: "IL" },
  { id: "mahia", kind: "spaceport", wikidata: "Q28180879", gcat: ["MAHIA"], celestrak: ["RLLB"], country: "NZ", en: "Rocket Lab Launch Complex 1 (Māhia)", ja: "ロケットラボ・マヒア射場" },
  { id: "woomera", kind: "spaceport", wikidata: "Q16927441", gcat: ["WOO"], celestrak: ["WOMRA"], country: "AU", en: "Woomera Test Range", ja: "ウーメラ試験場" },
  { id: "bowen", kind: "spaceport", wikidata: "Q131056918", gcat: ["BOWEN"], celestrak: ["BOS"], country: "AU", ja: "ボーエン軌道宇宙港" },
  { id: "arnhem", kind: "spaceport", wikidata: "Q112762197", gcat: [], celestrak: [], country: "AU", ja: "アーネム宇宙センター" },
  { id: "koonibba", kind: "spaceport", wikidata: "Q99519682", gcat: [], celestrak: [], country: "AU", ja: "クーニバ試験場", operators: ["Q99522958"] },
  { id: "san-marco", kind: "spaceport", wikidata: "Q644399", gcat: ["SMLC"], celestrak: ["SNMLP"], country: "KE", en: "San Marco platform (Broglio Space Centre)" },
  { id: "andoya", kind: "spaceport", wikidata: "Q124478301", gcat: ["AND"], celestrak: ["ANDSP"], country: "NO", ja: "アンドーヤ宇宙港" },
  { id: "esrange", kind: "spaceport", wikidata: "Q1368518", gcat: [], celestrak: [], country: "SE", operators: ["Q3270281"] },
  { id: "cornwall", kind: "spaceport", wikidata: "Q108551216", gcat: ["NEWQ"], celestrak: [], country: "GB", ja: "スペースポート・コーンウォール", operators: ["Q3774189"] },
  { id: "etlaq", kind: "spaceport", wikidata: "Q132676491", gcat: [], celestrak: [], country: "OM", ja: "エトラク宇宙港" },
  { id: "edwards", kind: "launch-area", wikidata: "Q217563", gcat: ["EAFB"], celestrak: [], country: "US" },
  { id: "gando", kind: "launch-area", wikidata: "Q1130612", gcat: ["GANC"], celestrak: ["CAS"], country: "ES", en: "Gran Canaria Airport (Gando)" },
  { id: "yellow-sea", kind: "launch-area", wikidata: null, gcat: ["HHAI"], celestrak: ["YSLA"], country: null, en: "Yellow Sea launch area", ja: "黄海の発射海域" },
  { id: "yangjiang", kind: "launch-area", wikidata: null, gcat: ["YJ"], celestrak: ["SCSLA"], country: null, en: "South China Sea launch area (Yangjiang)", ja: "南シナ海の発射海域" },
  { id: "east-china-sea", kind: "launch-area", wikidata: null, gcat: ["ECS"], celestrak: [], country: null, en: "East China Sea launch area", ja: "東シナ海の発射海域" },
  { id: "barents-sea", kind: "launch-area", wikidata: null, gcat: ["BLA"], celestrak: [], country: null, en: "Barents Sea launch area", ja: "バレンツ海の発射海域" },
  { id: "jeju", kind: "launch-area", wikidata: null, gcat: ["JEJU"], celestrak: ["JJSLA"], country: null, en: "Jeju Island sea launch area", ja: "済州島沖の発射海域" },
  { id: "sea-launch", kind: "launch-area", wikidata: null, gcat: ["KLA"], celestrak: ["SEAL"], country: null, en: "Sea Launch platform (equatorial Pacific)", ja: "シーローンチの洋上基地" },
];

/** GCAT sites in the launch log that no row holds, and why: GCAT itself marks the site as doubtful (`TYSC?`, a launch it files under Taiyuan with a question mark). */
export const UNPLACED: Record<string, string> = { "TYSC?": "GCAT's own doubtful entry, with no state or place" };
