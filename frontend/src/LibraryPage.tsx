/**
 * Library (#/library): every work in music21's corpus (catalogue: library/catalog.json, made by
 * scripts/corpus_catalog.py) and in open-licence collections (OpenScore Lieder and String Quartets, Craig Sapp's
 * Humdrum editions: library/collections.json, made by scripts/collections_catalog.py), sorted by composer and title,
 * with filters (source, collection, composer, era, ensemble, instruments) and
 * a search that also knows composers' names in Chinese and catalogue numbers (BWV, K., Op. … No. …); typing a
 * composer's name filters by that composer. "Open in
 * editor" opens a sample whose main.py is `score = corpus.parse(…)`, or `score = fetch_score("<pinned URL>")` for a
 * collection's work (the worker downloads it; see library/scoreSources.ts); notes are then changed with edit_bar(…)
 * lines (Score ▸ Edit notes), so the original stays intact.
 */
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Icon } from "./Button.tsx";
import { go, useLang } from "@learnkit/web";
import { useEffect, useMemo, useState } from "react";
import { catalogIds, idLabel, idMatches, parseQuery } from "./library/catalogNumbers.ts";
import { elsewhereLinks, LICENCE_CLASSES, licenceClass, searchTerms, type LicenceClass } from "./library/elsewhere.ts";
import { AFFILIATE_REL, urtextUrl } from "./library/urtext.ts";
import { analysisKey, analysisUrl, codeWithHarmony, type Analyses } from "./library/analyses.ts";
import { IMSLP, IMSLP_SOURCE, imslpRows, parseImslp } from "./library/imslp.ts";
import { MUTOPIA, MUTOPIA_LICENCES, MUTOPIA_SOURCE, mutopiaLinks, mutopiaRow, type MutopiaRow } from "./library/mutopia.ts";
import { byComposer, codeFor, idText, MUSIC21, sourceOf, type Row, type Source } from "./library/collections.ts";
import { addRecent } from "./project.ts";
import { fill } from "./strings.ts";
import { openInEditor } from "./workspace.ts";
import type { L } from "./problems.ts";

export type { Row };

/** the catalogue's instruments, in menu order, with their names (singular, plural) */
const INSTRUMENTS: Record<string, { en: [string, string]; zh: string; group: L }> = {
  soprano: { en: ["soprano", "sopranos"], zh: "女高音", group: ["Voices", "人聲"] },
  alto: { en: ["alto", "altos"], zh: "女低音", group: ["Voices", "人聲"] },
  tenor: { en: ["tenor", "tenors"], zh: "男高音", group: ["Voices", "人聲"] },
  bass: { en: ["bass", "basses"], zh: "男低音", group: ["Voices", "人聲"] },
  voice: { en: ["voice", "voices"], zh: "人聲", group: ["Voices", "人聲"] },
  violin: { en: ["violin", "violins"], zh: "小提琴", group: ["Strings", "弦樂"] },
  viola: { en: ["viola", "violas"], zh: "中提琴", group: ["Strings", "弦樂"] },
  cello: { en: ["cello", "cellos"], zh: "大提琴", group: ["Strings", "弦樂"] },
  "double bass": { en: ["double bass", "double basses"], zh: "低音提琴", group: ["Strings", "弦樂"] },
  flute: { en: ["flute", "flutes"], zh: "長笛", group: ["Winds and brass", "管樂"] },
  oboe: { en: ["oboe", "oboes"], zh: "雙簧管", group: ["Winds and brass", "管樂"] },
  clarinet: { en: ["clarinet", "clarinets"], zh: "單簧管", group: ["Winds and brass", "管樂"] },
  bassoon: { en: ["bassoon", "bassoons"], zh: "低音管", group: ["Winds and brass", "管樂"] },
  horn: { en: ["horn", "horns"], zh: "法國號", group: ["Winds and brass", "管樂"] },
  trumpet: { en: ["trumpet", "trumpets"], zh: "小號", group: ["Winds and brass", "管樂"] },
  trombone: { en: ["trombone", "trombones"], zh: "長號", group: ["Winds and brass", "管樂"] },
  piano: { en: ["piano", "piano"], zh: "鋼琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  harpsichord: { en: ["harpsichord", "harpsichord"], zh: "大鍵琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  organ: { en: ["organ", "organ"], zh: "管風琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  guitar: { en: ["guitar or lute", "guitars or lutes"], zh: "吉他／魯特琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  harp: { en: ["harp", "harps"], zh: "豎琴", group: ["Keyboards, harp, guitar", "鍵盤、豎琴、吉他"] },
  melody: { en: ["melody (instrument not given)", "melodies"], zh: "旋律（未註明樂器）", group: ["Other", "其他"] },
  other: { en: ["other", "others"], zh: "其他", group: ["Other", "其他"] },
};
const VOICES = new Set(["soprano", "alto", "tenor", "bass", "voice"]);
/** keyboards are one instrument however many staves they have */
const ONE_PLAYER = new Set(["piano", "harpsichord", "organ", "harp"]);

/** "2 violins, viola, cello" / "小提琴 ×2、中提琴、大提琴" */
export function instrumentSummary(list: string[], zh: boolean): string {
  const n = new Map<string, number>();
  for (const i of list) n.set(i, (n.get(i) ?? 0) + 1);
  return [...n.entries()]
    .map(([i, k]) => {
      const info = INSTRUMENTS[i] ?? INSTRUMENTS.other;
      const many = k > 1 && !ONE_PLAYER.has(i) && i !== "melody";
      return zh ? `${info.zh}${many ? ` ×${k}` : ""}` : many ? `${k} ${info.en[1]}` : info.en[0];
    })
    .join(zh ? "、" : ", ");
}
/** a work has the instrument (any voice for "voice") */
const has = (list: string[], inst: string) => (inst === "voice" ? list.some((i) => VOICES.has(i)) : list.includes(inst));

/** the collections' names; others show their folder name */
const COLLECTIONS: Record<string, L> = {
  bach: ["Bach chorales and more", "巴赫聖詠曲等"],
  beethoven: ["Beethoven string quartets", "貝多芬弦樂四重奏"],
  mozart: ["Mozart quartets and sonata", "莫札特四重奏與奏鳴曲"],
  haydn: ["Haydn quartets", "海頓四重奏"],
  palestrina: ["Palestrina masses", "帕勒斯特里納彌撒曲"],
  monteverdi: ["Monteverdi madrigals", "蒙台威爾第牧歌"],
  josquin: ["Josquin des Prez", "若斯坎・德普雷"],
  trecento: ["Trecento (14th-century Italy)", "十四世紀義大利音樂"],
  essenFolksong: ["Essen folksong collection", "埃森民歌集"],
  oneills1850: ["O'Neill's Music of Ireland (1850)", "歐尼爾愛爾蘭音樂集（1850）"],
  ryansMammoth: ["Ryan's Mammoth Collection", "萊恩大全集"],
  airdsAirs: ["Aird's Airs", "艾爾德曲調集"],
  miscFolk: ["Folk songs", "民歌"],
  leadSheet: ["Lead sheets", "旋律與和弦譜"],
  demos: ["music21 demos", "music21 示範"],
  theoryExercises: ["Theory exercises", "樂理練習"],
};

/** composers' names in Traditional Chinese, for display and search */
export const COMPOSER_ZH: Record<string, string> = {
  "Johann Sebastian Bach": "巴赫",
  "Ludwig van Beethoven": "貝多芬",
  "Wolfgang Amadeus Mozart": "莫札特",
  "Joseph Haydn": "海頓",
  "Giovanni Pierluigi da Palestrina": "帕勒斯特里納",
  "Claudio Monteverdi": "蒙台威爾第",
  "Josquin des Prez": "若斯坎・德普雷",
  "Robert Schumann": "羅伯特・舒曼",
  "Clara Schumann": "克拉拉・舒曼",
  "Arnold Schoenberg": "荀白克",
  "Amy Beach": "艾美・比奇",
  "Frédéric Chopin": "蕭邦",
  "Johannes Ciconia": "奇科尼亞",
  "Arcangelo Corelli": "柯雷利",
  "C. P. E. Bach": "C. P. E. 巴赫",
  "George Frideric Handel": "韓德爾",
  "Scott Joplin": "喬普林",
  "Giuseppe Verdi": "威爾第",
  "Franz Schubert": "舒伯特",
  "Carl Maria von Weber": "韋伯",
  "Francesco Landini": "蘭迪尼",
  "Philippe de Vitry": "維特里",
  "Turlough O'Carolan": "歐卡羅蘭",
  "Irving Berlin": "歐文・柏林",
  "Stephen Foster": "史蒂芬・佛斯特",
  "Johannes Brahms": "布拉姆斯",
  "Felix Mendelssohn": "孟德爾頌",
  "Fanny Hensel": "芬妮・亨塞爾",
  "Hugo Wolf": "沃爾夫",
  "Gustav Mahler": "馬勒",
  "Richard Strauss": "理查・史特勞斯",
  "Richard Wagner": "華格納",
  "Franz Liszt": "李斯特",
  "Claude Debussy": "德布西",
  "Maurice Ravel": "拉威爾",
  "Gabriel Fauré": "佛瑞",
  "Erik Satie": "薩替",
  "Georges Bizet": "比才",
  "Charles Gounod": "古諾",
  "Jules Massenet": "馬斯奈",
  "Hector Berlioz": "白遼士",
  "César Franck": "法朗克",
  "Ernest Chausson": "蕭頌",
  "Cécile Chaminade": "夏米納德",
  "Lili Boulanger": "莉莉・布朗傑",
  "Gioachino Rossini": "羅西尼",
  "Ruggero Leoncavallo": "雷昂卡發洛",
  "Antonín Dvořák": "德弗札克",
  "Bedřich Smetana": "史麥塔納",
  "Leoš Janáček": "楊納傑克",
  "Pyotr Ilyich Tchaikovsky": "柴可夫斯基",
  "Alexander Borodin": "鮑羅定",
  "Mikhail Glinka": "葛令卡",
  "Alexander Glazunov": "葛拉祖諾夫",
  "Edvard Grieg": "葛利格",
  "Carl Nielsen": "尼爾森",
  "Edward Elgar": "艾爾加",
  "Frederick Delius": "戴流士",
  "Arthur Sullivan": "蘇利文",
  "Béla Bartók": "巴爾托克",
  "Alban Berg": "貝爾格",
  "Anton Webern": "魏本",
  "Charles Ives": "艾伍士",
  "Max Reger": "雷格",
  "Ferruccio Busoni": "布梭尼",
  "Luigi Boccherini": "鮑凱里尼",
  "Luigi Cherubini": "凱魯畢尼",
  "Louis Spohr": "史博",
  "Henri Vieuxtemps": "魏奧當",
  "Pauline Viardot": "寶琳・維亞多",
  Traditional: "傳統民謠",
  Anonymous: "佚名",
  "music21 examples": "music21 範例",
};

const ERAS: Record<string, L> = {
  Medieval: ["Medieval", "中世紀"],
  Renaissance: ["Renaissance", "文藝復興"],
  Baroque: ["Baroque", "巴洛克"],
  Classical: ["Classical", "古典"],
  Romantic: ["Romantic", "浪漫"],
  "20th century": ["20th century", "二十世紀"],
  Popular: ["Popular and ragtime", "流行與散拍"],
  Traditional: ["Traditional (folk)", "傳統民謠"],
  Other: ["Other", "其他"],
};
const ERA_ORDER = Object.keys(ERAS);

/** ensemble by number of parts */
export const ensembleOf = (parts: number) => (parts <= 0 ? "" : parts <= 1 ? "solo" : parts === 2 ? "duo" : parts === 3 ? "trio" : parts === 4 ? "quartet" : "more");
const ENSEMBLES: Record<string, L> = {
  solo: ["One part (melody, solo)", "單一聲部（旋律、獨奏）"],
  duo: ["Two parts", "兩個聲部"],
  trio: ["Three parts", "三個聲部"],
  quartet: ["Four parts (quartet, chorale)", "四個聲部（四重奏、聖詠）"],
  more: ["Five or more parts", "五個以上聲部"],
};

/** composers with a few works here but many in the world: say so, and where more will come from */
const FAMOUS = new Set(["Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Joseph Haydn", "Frédéric Chopin", "Franz Schubert", "Robert Schumann", "George Frideric Handel"]);

const PAGE = 100;
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const keyText = (k: number | null) => (k === null ? "" : k === 0 ? "♮" : k > 0 ? `${k}♯` : `${-k}♭`);

const count = <T,>(rows: T[], key: (r: T) => string) => {
  const c = new Map<string, number>();
  for (const r of rows) c.set(key(r), (c.get(key(r)) ?? 0) + 1);
  return c;
};

export default function LibraryPage() {
  const { t, pick, index: langIndex } = useLang();
  const zh = langIndex === 1;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [version, setVersion] = useState("");
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<Record<string, Source>>({});
  // Mutopia's pieces by their page (their files are downloaded there, not opened here)
  const [mutopia, setMutopia] = useState<Map<string, MutopiaRow>>(new Map());
  // When in Rome's harmonic analyses, by Library row; and the filter for works that have one
  const [analyses, setAnalyses] = useState<Analyses>({ sha: "", works: {} });
  const [withHarmony, setWithHarmony] = useState(false);
  const analysisOf = (x: Row) => {
    const k = analysisKey(x);
    return k ? analyses.works[k] : undefined;
  };
  // IMSLP's index: large, fetched only when asked for (its source chosen, or "also search IMSLP")
  const [imslp, setImslp] = useState<"off" | "loading" | "on" | "error">("off");
  const loadImslp = () => {
    if (imslp !== "off" && imslp !== "error") return;
    setImslp("loading");
    fetch(`${import.meta.env.BASE_URL}library/imslp.tsv`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((tsv) => {
        setRows((old) => {
          const eras = new Map((old ?? []).map((x) => [x[4], x[8]] as const));
          return [...(old ?? []), ...imslpRows(parseImslp(tsv), eras)].sort(byComposer);
        });
        setImslp("on");
      })
      .catch(() => setImslp("error"));
  };
  const [source, setSource] = useState("");
  const [collection, setCollection] = useState("");
  const [composer, setComposer] = useState("");
  const [era, setEra] = useState("");
  const [ensemble, setEnsemble] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [licence, setLicence] = useState<LicenceClass | "">("");
  const [openParts, setOpenParts] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    void Promise.all([import("./library/catalog.json"), import("./library/collections.json"), import("./library/mutopia.json"), import("./library/analyses.json")]).then(([m, o, mu, an]) => {
      setAnalyses((an.default ?? an) as unknown as Analyses);
      const data = (m.default ?? m) as unknown as { music21: string; works: Row[] };
      const open = (o.default ?? o) as unknown as { sources: Record<string, Source>; works: Row[] };
      const mutopia = ((mu.default ?? mu) as unknown as { works: MutopiaRow[] }).works;
      setMutopia(new Map(mutopia.map((w) => [mutopiaLinks(w).page, w])));
      setRows([...data.works, ...open.works, ...mutopia.map(mutopiaRow)].sort(byComposer));
      setSources({ ...open.sources, [MUTOPIA]: MUTOPIA_SOURCE, [IMSLP]: IMSLP_SOURCE });
      setVersion(data.music21);
    });
  }, []);
  useEffect(() => setShown(PAGE), [query, source, collection, composer, era, ensemble, instruments, licence, withHarmony]);

  const composerName = (c: string) => (zh && COMPOSER_ZH[c] ? `${COMPOSER_ZH[c]}（${c}）` : c);
  const collectionName = (c: string) => (COLLECTIONS[c] ? pick(COLLECTIONS[c]) : sources[c] ? pick(sources[c].name) : c);
  const sourceName = (s: string) => (s === MUSIC21 ? t("src.music21") : sources[s] ? pick(sources[s].name) : s);
  const inSource = (r: Row) => (!source || sourceOf(r) === source) && (!licence || licenceClass(r, sources) === licence) && (!withHarmony || !!analysisOf(r));

  // search text per row: title, composer in both languages, music21's own spelling, tradition, collection, file
  const index = useMemo(
    () =>
      rows?.map((r) =>
        fold(
          `${r[3]} ${r[4]} ${COMPOSER_ZH[r[4]] ?? ""} ${r[10]} ${r[9]} ${r[0]} ${COLLECTIONS[r[0]]?.join(" ") ?? ""} ${sources[r[13] ?? ""]?.name.join(" ") ?? ""} ${r[13] ? "" : r[1]} ${(r[12] ?? []).join(" ")} ${[
            ...new Set(r[11] ?? []),
          ]
            .map((i) => `${INSTRUMENTS[i]?.en.join(" ") ?? i} ${INSTRUMENTS[i]?.zh ?? ""}${VOICES.has(i) ? " voice voices 人聲" : ""}`)
            .join(" ")}`,
        ),
      ) ?? [],
    [rows, sources],
  );
  const composers = useMemo(() => [...count(rows ?? [], (r) => r[4]).entries()], [rows]);
  // each work's catalogue numbers, from its path and title
  const numbers = useMemo(() => rows?.map((r) => catalogIds(idText(r), r[4])) ?? [], [rows]);
  const typed = useMemo(() => parseQuery(query), [query]);

  // a query word that starts a composer's name (in either language) becomes the composer filter
  const words = fold(typed.rest).split(/\s+/).filter(Boolean);
  const named = useMemo(() => {
    if (composer || !words.length) return null;
    const hits = composers.filter(([c]) => {
      const names = fold(`${c} ${COMPOSER_ZH[c] ?? ""}`).split(/[\s・.]+/);
      return words.some((w) => w.length >= 3 || /[^\x00-\x7f]/.test(w) ? names.some((n) => n.startsWith(w)) || fold(COMPOSER_ZH[c] ?? "").includes(w) : false);
    });
    return hits.length === 1 && hits[0][0] !== "Traditional" ? hits[0][0] : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composers, query, composer]);
  const activeComposer = composer || named || "";
  // words used up by the composer chip don't also have to match the title
  const rest = named ? words.filter((w) => !fold(`${named} ${COMPOSER_ZH[named] ?? ""}`).split(/[\s・.]+/).some((n) => n.startsWith(w)) && !fold(COMPOSER_ZH[named] ?? "").includes(w)) : words;

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (r, i) =>
        inSource(r) &&
        (!collection || r[0] === collection) &&
        (!activeComposer || r[4] === activeComposer) &&
        (!era || r[8] === era) &&
        (!ensemble || ensembleOf(r[5]) === ensemble) &&
        instruments.every((inst) => has(r[11] ?? [], inst)) &&
        typed.ids.every((q) => numbers[i].some((w) => idMatches(q, w))) &&
        rest.every((w) => index[i].includes(w)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, index, numbers, source, licence, withHarmony, analyses, collection, activeComposer, era, ensemble, instruments, query]);

  // filter menus count what the other filters leave
  const composerCounts = useMemo(
    () => count(rows?.filter((r) => inSource(r) && (!collection || r[0] === collection) && (!era || r[8] === era)) ?? [], (r) => r[4]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, source, licence, withHarmony, analyses, collection, era],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eraCounts = useMemo(() => count(rows?.filter((r) => inSource(r) && (!collection || r[0] === collection)) ?? [], (r) => r[8]), [rows, source, licence, withHarmony, analyses, collection]);
  const ensembleCounts = useMemo(() => count(filtered, (r) => ensembleOf(r[5])), [filtered]);
  // works that have each instrument, among those the other filters leave
  const instrumentCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of filtered) for (const i of Object.keys(INSTRUMENTS)) if (has(r[11] ?? [], i)) c.set(i, (c.get(i) ?? 0) + 1);
    return c;
  }, [filtered]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const collectionCounts = useMemo(() => [...count(rows?.filter(inSource) ?? [], (r) => r[0]).entries()].sort((a, b) => b[1] - a[1]), [rows, source, licence, withHarmony, analyses]);
  const sourceCounts = useMemo(() => count(rows ?? [], sourceOf), [rows]);
  const licenceCounts = useMemo(() => count(rows ?? [], (r) => licenceClass(r, sources)), [rows, sources]);
  // the same search in libraries the Library can't open from (the words typed, else the composer)
  const elsewhere = elsewhereLinks(searchTerms(query.trim() ? { query } : { composer: activeComposer }));

  // a library piece opens as a sample (a scratch copy), not over the user's own score
  const open = (r: Row) => {
    // with When in Rome's analysis, when it has one: a line that writes the Roman numerals under the bass
    const an = analysisOf(r);
    const code = an ? codeWithHarmony(codeFor(r, sources), analysisUrl(analyses, an)) : codeFor(r, sources);
    const label = `${r[4]}: ${r[3]}`;
    openInEditor(r[13] ? `src:${r[1]}` : `lib:${r[1]}#${r[2] ?? ""}`, label, code);
    addRecent({ label, code });
    go("editor");
  };
  const select = "h-10 w-full min-w-0 truncate rounded-md border border-gray-300 bg-white px-2 text-sm";
  const few = activeComposer && FAMOUS.has(activeComposer) ? composerCounts.get(activeComposer) ?? 0 : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8" data-testid="library">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("lib.title")}</h1>
      <p className="mt-3 text-gray-600">{t("lib.intro")}</p>
      <div className="sticky top-0 z-10 -mx-5 mt-5 border-b border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <select
            value={source}
            onChange={(e) => (setSource(e.target.value), setCollection(""), e.target.value === IMSLP && loadImslp())}
            aria-label={t("lib.sourceFilter")}
            className={select}
            data-testid="lib-source"
          >
            <option value="">
              {t("lib.allSources")} ({rows?.length ?? "…"})
            </option>
            {[MUSIC21, ...Object.keys(sources)]
              .filter((s) => sourceCounts.get(s) || s === IMSLP)
              .map((s) => (
                <option key={s} value={s}>
                  {sourceName(s)} ({sourceCounts.get(s) ?? (imslp === "loading" ? "…" : t("lib.loadsWhenChosen"))})
                </option>
              ))}
          </select>
          <select value={licence} onChange={(e) => setLicence(e.target.value as LicenceClass | "")} aria-label={t("lib.licenceFilter")} className={select} data-testid="lib-licence-filter">
            <option value="">{t("lib.anyLicence")}</option>
            {LICENCE_CLASSES.filter(([k]) => licenceCounts.get(k)).map(([k, name]) => (
              <option key={k} value={k}>
                {pick(name)} ({licenceCounts.get(k)})
              </option>
            ))}
          </select>
          <select value={collection} onChange={(e) => setCollection(e.target.value)} aria-label={t("lib.collection")} className={select} data-testid="lib-collection">
            <option value="">
              {t("lib.all")} ({rows?.filter(inSource).length ?? "…"})
            </option>
            {collectionCounts.map(([c, n]) => (
              <option key={c} value={c}>
                {collectionName(c)} ({n})
              </option>
            ))}
          </select>
          <select value={activeComposer} onChange={(e) => (setComposer(e.target.value), named && setQuery(""))} aria-label={t("lib.composer")} className={select} data-testid="lib-composer">
            <option value="">{t("lib.allComposers")}</option>
            {[...composerCounts.entries()]
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
              .map(([c, n]) => (
                <option key={c} value={c}>
                  {composerName(c)} ({n})
                </option>
              ))}
          </select>
          <select value={era} onChange={(e) => setEra(e.target.value)} aria-label={t("lib.era")} className={select} data-testid="lib-era">
            <option value="">{t("lib.allEras")}</option>
            {ERA_ORDER.filter((e) => eraCounts.get(e)).map((e) => (
              <option key={e} value={e}>
                {pick(ERAS[e])} ({eraCounts.get(e)})
              </option>
            ))}
          </select>
          <select value={ensemble} onChange={(e) => setEnsemble(e.target.value)} aria-label={t("lib.ensemble")} className={select} data-testid="lib-ensemble">
            <option value="">{t("lib.allEnsembles")}</option>
            {Object.keys(ENSEMBLES).map((k) => (
              <option key={k} value={k}>
                {pick(ENSEMBLES[k])}
                {ensembleCounts.get(k) ? ` (${ensembleCounts.get(k)})` : ""}
              </option>
            ))}
          </select>
          <details className="group relative min-w-0" data-testid="lib-instruments">
            <summary className={`${select} flex cursor-pointer list-none items-center justify-between gap-1 [&::-webkit-details-marker]:hidden`}>
              <span className="truncate">
                {instruments.length
                  ? instruments.map((i) => (zh ? INSTRUMENTS[i].zh : INSTRUMENTS[i].en[0])).join(zh ? "、" : ", ")
                  : t("lib.allInstruments")}
              </span>
              <Icon icon={ChevronDown} className="text-gray-400" />
            </summary>
            <div className="absolute right-0 z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg">
              <p className="px-1 pb-1 text-[11px] text-gray-500">{t("lib.instrumentsHint")}</p>
              {[...new Set(Object.values(INSTRUMENTS).map((v) => v.group[0]))].map((g) => (
                <div key={g} className="mb-1">
                  <p className="px-1 pt-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                    {pick(Object.values(INSTRUMENTS).find((v) => v.group[0] === g)!.group)}
                  </p>
                  {Object.entries(INSTRUMENTS)
                    .filter(([, v]) => v.group[0] === g)
                    .map(([k, v]) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={instruments.includes(k)}
                          onChange={(e) => setInstruments((xs) => (e.target.checked ? [...xs, k] : xs.filter((x) => x !== k)))}
                        />
                        <span className="flex-1">{k === "voice" ? pick(["any voice", "任何人聲"]) : zh ? v.zh : v.en[0]}</span>
                        <span className="text-xs text-gray-400">{instrumentCounts.get(k) ?? 0}</span>
                      </label>
                    ))}
                </div>
              ))}
              {instruments.length > 0 && (
                <button onClick={() => setInstruments([])} className="mt-1 w-full rounded px-1 py-1 text-left text-xs text-(--lk-accent) hover:bg-rose-50">
                  {t("lib.clearInstruments")}
                </button>
              )}
            </div>
          </details>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("lib.search")}
            aria-label={t("lib.search")}
            className="col-span-full h-10 w-full min-w-0 rounded-md border border-gray-300 px-3 text-sm focus:border-(--lk-accent) focus:outline-none"
            data-testid="lib-search"
          />
        </div>
        {(named || composer) && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-medium text-(--lk-accent)" data-testid="lib-composer-chip">
              {fill(t("lib.composerChip"), { name: composerName(activeComposer), n: composerCounts.get(activeComposer) ?? 0 })}
              <button
                onClick={() => (composer ? setComposer("") : setQuery(rest.join(" ")))}
                aria-label={t("lib.clearComposer")}
                className="ml-0.5 text-sm leading-none hover:text-rose-900"
              >
                <Icon icon={X} className="h-3.5 w-3.5" />
              </button>
            </span>
          </p>
        )}
        {!rows && <p className="mt-2 text-xs text-gray-500">{t("lib.loading")}</p>}
      </div>

      <label className="mt-2 mr-4 inline-flex items-center gap-1.5 text-sm text-gray-700" data-testid="lib-harmony-filter">
        <input type="checkbox" checked={withHarmony} onChange={(e) => setWithHarmony(e.target.checked)} />
        {t("lib.withHarmony")} ({Object.keys(analyses.works).length})
      </label>
      <label className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-700" data-testid="lib-imslp-toggle">
        <input type="checkbox" checked={imslp === "on" || imslp === "loading"} disabled={imslp === "loading" || imslp === "on"} onChange={() => loadImslp()} />
        {imslp === "loading" ? t("lib.imslpLoading") : imslp === "error" ? t("lib.imslpError") : t("lib.imslpAlso")}
      </label>
      {/* the same search in libraries this page can't open from: one line under the filters */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm" data-testid="lib-elsewhere">
        <span className="text-gray-600">{t("lib.elsewhere")}</span>
        {elsewhere.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            title={pick(l.gives)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-0.5 font-medium text-gray-800 hover:border-(--lk-accent) hover:text-(--lk-accent)"
            data-testid={`lib-elsewhere-${l.id}`}
          >
            {l.name} ↗
          </a>
        ))}
        <details className="group basis-full text-xs text-gray-600 sm:basis-auto">
          <summary className="cursor-pointer list-none text-(--lk-accent) hover:underline [&::-webkit-details-marker]:hidden">{t("lib.elsewhereHowOpen")}</summary>
          <p className="mt-1 max-w-2xl sm:absolute sm:z-20 sm:rounded-lg sm:border sm:border-gray-200 sm:bg-white sm:p-3 sm:shadow-lg">
            {elsewhere.map((l) => `${l.name}: ${pick(l.gives)}`).join(" · ")}. {t("lib.elsewhereHow")}{" "}
            <button onClick={() => go("editor")} className="font-medium text-(--lk-accent) hover:underline">
              {t("lib.toEditor")} →
            </button>
          </p>
        </details>
      </div>
      {few > 0 && few < 50 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="lib-few">
          {fill(t("lib.few"), { n: few, name: composerName(activeComposer) })}{" "}
          <button onClick={() => go("agents", "roadmap")} className="font-medium underline">
            {t("lib.roadmap")}
          </button>
        </p>
      )}

      <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white" data-testid="lib-results">
        {filtered.slice(0, shown).map((r) => {
          const ids = catalogIds(idText(r), r[4]);
          const src = r[13] ? sources[r[13]] : undefined;
          const mu = r[13] === MUTOPIA ? mutopia.get(r[1]) : undefined;
          const isImslp = r[13] === IMSLP;
          const links = mu ? mutopiaLinks(mu) : null;
          const lic = mu ? MUTOPIA_LICENCES[mu[6]] : src ? { name: src.licence, url: src.licenceUrl } : null;
          const urtext = urtextUrl(r);
          return (
          <li key={`${r[1]}#${r[2] ?? ""}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-(--lk-accent)" data-testid="lib-row-composer">
                {composerName(r[4])}
                {r[9] && <span className="font-normal text-gray-500"> · {r[9]}</span>}
              </p>
              <p className="truncate font-medium text-gray-900" title={r[3]}>
                {ids.map((id) => (
                  <span key={id} className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium text-gray-700" data-testid="lib-number">
                    {idLabel(id)}
                  </span>
                ))}
                {r[3]}
              </p>
              {mu ? (
                <p className="truncate text-xs text-gray-600">{mu[4]}</p>
              ) : isImslp ? null : (
                <PartsLine row={r} open={openParts.has(r[1] + (r[2] ?? ""))} onToggle={() => setOpenParts((o) => { const k = r[1] + (r[2] ?? ""); const n = new Set(o); if (!n.delete(k)) n.add(k); return n; })} />
              )}
              {mu ? (
                <p className="truncate text-xs text-gray-500" data-testid="lib-credit">
                  {MUTOPIA_SOURCE.credit} · {t("lib.mutopiaHow")}
                </p>
              ) : isImslp ? (
                <p className="truncate text-xs text-gray-500" data-testid="lib-credit">
                  {IMSLP_SOURCE.credit} · {t("lib.imslpHow")}
                </p>
              ) : src ? (
                <p className="truncate text-xs text-gray-500" title={fill(t("lib.downloads"), { source: pick(src.name) })} data-testid="lib-credit">
                  {src.credit}
                  {src.nonCommercial && <span className="text-amber-700"> · {t("lib.nonCommercial")}</span>} ·{" "}
                  <span className="font-mono">{r[1].split("/").pop()}</span>
                </p>
              ) : (
                <p className="truncate text-xs text-gray-500">
                  {collectionName(r[0])} ·{" "}
                  <span className="font-mono">
                    {r[1]}
                    {r[2] !== null ? ` #${r[2]}` : ""}
                  </span>
                </p>
              )}
            </div>
            <span className="text-xs whitespace-nowrap text-gray-500">
              {r[8] && ERAS[r[8]] ? `${pick(ERAS[r[8]])}` : ""}
              {r[7] && ` · ${r[7]}`}
              {keyText(r[6]) && ` · ${keyText(r[6])}`}
              {lic && (
                <a
                  href={lic.url}
                  target="_blank"
                  rel="noreferrer"
                  title={fill(t("lib.licence"), { l: lic.name }) + (src?.nonCommercial ? ` · ${t("lib.nonCommercial")}` : "")}
                  className={`ml-2 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${src?.nonCommercial ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
                  data-testid="lib-licence"
                >
                  {lic.name}
                </a>
              )}
              {analysisOf(r) && (
                <span className="ml-2 rounded border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800" title={t("lib.harmonyHint")} data-testid="lib-harmony">
                  {t("lib.harmony")}
                </span>
              )}
              {urtext && (
                // a printed urtext edition to buy (an affiliate link; see the disclosure at the bottom)
                <a href={urtext} target="_blank" rel={AFFILIATE_REL} title={t("lib.urtextHint")} className="ml-2 text-[11px] text-gray-500 hover:text-(--lk-accent) hover:underline" data-testid="lib-urtext">
                  {t("lib.urtext")} ↗
                </a>
              )}
            </span>
            {isImslp ? (
              <a href={r[1]} target="_blank" rel="noopener noreferrer" className="rounded-md bg-(--lk-accent) px-3 py-1 text-sm font-medium text-white hover:opacity-90" data-testid="lib-imslp">
                IMSLP ↗
              </a>
            ) : links ? (
              // Mutopia's files: downloaded from its site, then opened here (Import, or drop the file on the editor)
              <span className="flex items-center gap-1.5" data-testid="lib-mutopia">
                {links.midi && (
                  <a href={links.midi} className="rounded-md bg-(--lk-accent) px-2.5 py-1 text-sm font-medium text-white hover:opacity-90" title={t("lib.midiHint")} data-testid="lib-midi">
                    MIDI ↓
                  </a>
                )}
                {links.pdf && (
                  <a href={links.pdf} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50" data-testid="lib-pdf">
                    PDF ↓
                  </a>
                )}
                <a href={links.page} target="_blank" rel="noreferrer" className="px-1 text-sm text-(--lk-accent) hover:underline" title={t("lib.mutopiaPage")}>
                  Mutopia ↗
                </a>
              </span>
            ) : (
              <button onClick={() => open(r)} className="rounded-md bg-(--lk-accent) px-3 py-1 text-sm font-medium text-white hover:opacity-90" data-testid="lib-open">
                {t("lib.open")}
              </button>
            )}
          </li>
          );
        })}
        {rows && filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">{t("lib.none")}</li>}
      </ul>
      {filtered.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="mx-auto mt-4 block rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
          {fill(t("lib.more"), { n: Math.min(PAGE, filtered.length - shown) })}
        </button>
      )}
      <p className="mt-6 text-xs text-gray-500">
        {fill(t("lib.source"), { v: version })}{" "}
        <a href="https://www.music21.org/music21docs/about/referenceCorpus.html" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          {t("lib.sourceLink")} ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-openscore">
        {t("lib.creditOpenScore")}{" "}
        <a href="https://openscore.cc" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          openscore.cc ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-sapp">
        {t("lib.creditSapp")}{" "}
        <a href="https://github.com/craigsapp/mozart-piano-sonatas" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          mozart-piano-sonatas ↗
        </a>{" "}
        <a href="https://github.com/craigsapp/joplin" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          joplin ↗
        </a>{" "}
        <a href="https://github.com/craigsapp/haydn-piano-sonatas" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          haydn-piano-sonatas ↗
        </a>{" "}
        <a href="https://github.com/craigsapp/scarlatti-keyboard-sonatas" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          scarlatti-keyboard-sonatas ↗
        </a>{" "}
        <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          CC BY-NC-SA 4.0 ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-asap">
        {t("lib.creditAsap")}{" "}
        <a href="https://github.com/fosfrancesco/asap-dataset" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          asap-dataset ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-jrp">
        {t("lib.creditJrp")}{" "}
        <a href="https://josquin.stanford.edu" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          josquin.stanford.edu ↗
        </a>{" "}
        <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          CC BY-NC 4.0 ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-mutopia">
        {t("lib.creditMutopia")}{" "}
        <a href="https://www.mutopiaproject.org" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          mutopiaproject.org ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-imslp">
        {t("lib.creditImslp")}{" "}
        <a href="https://imslp.org" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          imslp.org ↗
        </a>
      </p>
      <p className="mt-1 text-xs text-gray-500" data-testid="lib-credit-wir">
        {t("lib.creditWir")}{" "}
        <a href="https://github.com/MarkGotham/When-in-Rome" target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
          When in Rome ↗
        </a>
      </p>
      <p className="mt-4 border-t border-gray-200 pt-3 text-center text-xs text-gray-400" data-testid="lib-disclosure">
        {t("lib.urtextNote")} {t("lib.disclosure")}
      </p>
    </div>
  );
}

/** a work's instruments and parts: up to 4 parts are listed; more open with ▸ */
function PartsLine({ row, open, onToggle }: { row: Row; open: boolean; onToggle: () => void }) {
  const { t, index } = useLang();
  const zh = index === 1;
  const insts = row[11] ?? [];
  const names = row[12] ?? [];
  const n = row[5];
  const summary = insts.length ? instrumentSummary(insts, zh) : "";
  const count = fill(t(n === 1 ? "lib.part" : "lib.parts"), { n });
  if (!names.length) return <p className="truncate text-xs text-gray-600">{[summary, count].filter(Boolean).join(" · ")}</p>;
  if (names.length <= 4)
    return (
      <p className="truncate text-xs text-gray-600" data-testid="lib-parts">
        {summary} · {names.join(zh ? "、" : ", ")}
      </p>
    );
  return (
    <div className="text-xs text-gray-600">
      <button onClick={onToggle} aria-expanded={open} className="hover:text-gray-900" data-testid="lib-parts-toggle">
        <Icon icon={ChevronRight} className={`inline h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} /> {summary} · {count}
      </button>
      {open && (
        <span className="mt-1 flex flex-wrap gap-1" data-testid="lib-parts">
          {names.map((name, i) => (
            <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
              {name}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
