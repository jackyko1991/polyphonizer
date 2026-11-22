/**
 * Building blocks for the Concept, Coding Skills and AI agent pages, in Tensorizer's and Formalizer's shape: a sticky
 * table of contents on the left, a title and introduction, then numbered section cards with text, code, figures,
 * callouts and sources. Text is always a [English, Traditional Chinese] pair (`L`). The site-neutral blocks (Page,
 * Section, P, List, Callout, Figure, Table, Sources, SiteLink) are learnkit's page kit, re-exported here; Python code,
 * music notation, "Try it in" and draft outlines are Polyphonizer's own.
 *
 * Pages still being written use `Draft`: their sections list what each will cover, so the outline can be read and
 * changed before the text is written.
 */
import { python } from "@codemirror/lang-python";
import {
  Callout as KitCallout,
  CodeBlock,
  go,
  List,
  Page as KitPage,
  plainText,
  RichText,
  Section,
  SiteLink,
  useLang,
  type CalloutProps,
  type PageProps,
  type SectionInfo,
} from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { PROBLEMS, type L } from "../problems.ts";

export { Figure, List, P, Section, SiteLink, Sources, Table } from "@learnkit/web";
export type { SectionInfo } from "@learnkit/web";
export type { L };

/** The main scroll area (Shell's scrollId). */
export const SCROLL = "pz-scroll";

/** A whole page (learnkit's Page) scrolling in Polyphonizer's main area. */
export function Page(props: Omit<PageProps, "scrollRoot">) {
  return <KitPage {...props} scrollRoot={SCROLL} />;
}

const PYTHON = python();

/** Python (music21) code, syntax-coloured, with an optional note under it. */
export function Py({ code, title, note }: { code: string; title?: string; note?: L }) {
  const { pick } = useLang();
  return (
    <div className="space-y-1">
      <CodeBlock code={code} title={title} language={PYTHON} />
      {note && (
        <p className="text-[11px] text-gray-500">
          <RichText text={pick(note)} />
        </p>
      )}
    </div>
  );
}

/** Polyphonizer's tips are rose, its accent; notes and warnings keep learnkit's colours. */
const TONES = { tip: "border-rose-200 bg-rose-50/60 text-rose-950" };

/** A highlighted box: a tip, a side note, or a warning (a common trap). */
export function Callout(props: Omit<CalloutProps, "tones">) {
  return <KitCallout {...props} tones={TONES} />;
}

/**
 * Music on the page: a short example in ABC notation, engraved by Verovio in the browser (no Python needed), with ▶
 * to hear it and the notes lighting up as they sound. Write the ABC as a template literal (abc={`…`}) without ${…}:
 * tests/notation.test.ts finds every example in the pages and checks that Verovio reads it.
 *
 * ABC in one minute: X:1 (example number), M:4/4 (time), L:1/4 (default length), K:C (key; K:Dm, K:G …), Q:1/4=90
 * (tempo); notes C D E F G A B c (c = middle C's octave up; C, = octave down; c' = two up), ^ sharp, _ flat, = natural;
 * C2 = twice the default length, C/2 = half; z rest; [CEG] chord; | bar; V:1 / V:2 for two staves (drawn through
 * engine/abc.ts, which supports notes, rests, chords, ties, triplets and "annotations").
 */
export function Notation({ abc, caption, instrument = 0, width = 560 }: { abc: string; caption?: L; instrument?: number; width?: number }) {
  const { pick } = useLang();
  const box = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState<{ svg: string; sounds: import("../engine/engrave.ts").Sound[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([import("../engine/engrave.ts"), import("../engine/abc.ts")])
      .then(([m, a]) => m.engraveSnippet(a.exampleData(abc), width, undefined, abc))
      .then((r) => live && setOut(r), (e) => live && setErr(String(e)));
    return () => {
      live = false;
    };
  }, [abc, width]);
  const play = async () => {
    const player = await import("../engine/player.ts");
    if (playing) return player.stop();
    if (!out) return;
    setPlaying(true);
    const mark = (id: string, on: boolean) => box.current?.querySelector(`[id="${CSS.escape(id)}"]`)?.classList.toggle("pz-playing", on);
    const staves = Math.max(1, ...out.sounds.map((s) => s.staff + 1));
    await player
      .play(out.sounds, mark, 0, { parts: [], programs: Array(staves).fill(instrument) })
      .catch(() => undefined);
    setPlaying(false);
  };
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3" data-testid="notation">
      <div className="flex items-start gap-2">
        <button
          onClick={() => void play()}
          disabled={!out}
          aria-label={pick(playing ? ["Stop", "停止"] : ["Play", "播放"])}
          title={pick(playing ? ["Stop", "停止"] : ["Play", "播放"])}
          className="mt-1 shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {playing ? "■" : "▶"}
        </button>
        <div ref={box} className="pz-score min-w-0 flex-1 overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full">
          {err ? (
            <p className="text-xs text-red-700">{err}</p>
          ) : out ? (
            <div dangerouslySetInnerHTML={{ __html: out.svg }} />
          ) : (
            <p className="py-6 text-center text-xs text-gray-400">♪ …</p>
          )}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-1 text-center text-xs text-gray-500">
          <RichText text={pick(caption)} />
        </figcaption>
      )}
    </figure>
  );
}

/** "Try it in: …" chips that open Learn to Code problems. */
export function TryIn({ ids }: { ids: string[] }) {
  const { pick } = useLang();
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500">{pick(["Try it in:", "動手試試："])}</span>
      {ids.map((id) => {
        const p = PROBLEMS.find((q) => q.id === id);
        if (!p) throw new Error(`TryIn: no problem ${id}`);
        return (
          <button key={id} onClick={() => go("learn", "code", id)} className="rounded-full bg-rose-50 px-2.5 py-1 text-(--lk-accent) hover:bg-rose-100">
            {p.level} · {plainText(pick(p.title))}
          </button>
        );
      })}
    </p>
  );
}

/** One page still being written: an outline of sections, each with what it will cover. */
export interface DraftOutline {
  id: string;
  title: L;
  intro: L;
  overline?: L;
  sections: (SectionInfo & { plan: L[]; tryIn?: string[] })[];
}

/** Renders a `DraftOutline`: the page's real frame (contents, numbered sections) with each section's plan. */
export function Draft({ outline, focus }: { outline: DraftOutline; focus?: string | null }) {
  const { pick } = useLang();
  const { id, sections } = outline;
  return (
    <Page id={id} title={outline.title} intro={outline.intro} sections={sections} focus={focus} overline={outline.overline}>
      <Callout kind="warn" title={["Draft outline", "草稿大綱"]}>
        <p>
          {pick([
            "This page is planned but not written yet. Each section below says what it will cover.",
            "這一頁已規劃、尚未撰寫。下面每一節說明它將涵蓋的內容。",
          ])}{" "}
          <SiteLink to={["concept", "history"]} label={["Read the History of notation", "閱讀記譜史"]} />
        </p>
      </Callout>
      {sections.map((s, i) => (
        <Section key={s.id} page={id} id={s.id} n={i + 1} title={s.title}>
          <p className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase">{pick(["Will cover", "將涵蓋"])}</p>
          <List items={s.plan} />
          {s.tryIn && <TryIn ids={s.tryIn} />}
        </Section>
      ))}
    </Page>
  );
}
