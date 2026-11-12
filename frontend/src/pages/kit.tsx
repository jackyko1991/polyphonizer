/**
 * Building blocks for the Concept, Coding Skills and AI agent pages, in Tensorizer's and Formalizer's shape: a sticky
 * table of contents on the left, a title and introduction, then numbered section cards with text, code, figures,
 * callouts and sources. Text is always a [English, Traditional Chinese] pair (`L`).
 *
 * Pages still being written use `Draft`: their sections list what each will cover, so the outline can be read and
 * changed before the text is written.
 */
import { python } from "@codemirror/lang-python";
import { CodeBlock, go, PageToc, plainText, RichText, useLang } from "@learnkit/web";
import { isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { PROBLEMS, type L } from "../problems.ts";

export type { L };

/** The main scroll area (Shell's scrollId). */
export const SCROLL = "pz-scroll";

export interface SectionInfo {
  /** element id is `<page id>-<section id>`; deep link #/<page>/<tab>/<section id> */
  id: string;
  title: L;
}

/** A whole page: table of contents, title, introduction, then the sections (children). */
export function Page({
  id,
  title,
  intro,
  sections,
  focus,
  overline,
  children,
}: {
  /** prefix of the section element ids, e.g. "method" */
  id: string;
  title: L;
  intro: L;
  sections: SectionInfo[];
  /** section to scroll to on open (from the address) */
  focus?: string | null;
  /** small line above the title, e.g. "AI agent" */
  overline?: L;
  children: ReactNode;
}) {
  const { pick } = useLang();
  useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById(`${id}-${focus}`)?.scrollIntoView({ block: "start" }));
  }, [focus, id]);
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-5 pt-6 pb-16" data-testid={`page-${id}`}>
      <PageToc
        scrollRoot={SCROLL}
        title={pick(["On this page", "本頁內容"])}
        className="top-6"
        items={sections.map((s, i) => ({ id: `${id}-${s.id}`, label: pick(s.title), mark: i + 1 }))}
      />
      <article className="min-w-0 max-w-4xl flex-1 space-y-8">
        <header>
          {overline && <p className="text-sm font-medium text-(--lk-accent)">{pick(overline)}</p>}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            <RichText text={pick(title)} />
          </h1>
          <p className="mt-3 text-gray-600">
            <RichText text={pick(intro)} />
          </p>
        </header>
        {children}
      </article>
    </div>
  );
}

/** One numbered section card. `page` and `id` must match an entry of the Page's `sections`. */
export function Section({ page, id, n, title, children }: { page: string; id: string; n: number; title: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <section id={`${page}-${id}`} className="scroll-mt-6 rounded-xl border border-gray-200 bg-white p-6" data-testid="page-section">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold text-gray-900">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--lk-accent) text-sm text-white">{n}</span>
        <RichText text={pick(title)} />
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

/** A paragraph (RichText: `code`, **bold**, *italic*, $maths$, links). */
export function P({ t }: { t: L }) {
  const { pick } = useLang();
  return (
    <p>
      <RichText text={pick(t)} />
    </p>
  );
}

/** A bulleted list of RichText items. */
export function List({ items, ordered = false }: { items: L[]; ordered?: boolean }) {
  const { pick } = useLang();
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((it, i) => (
        <li key={i}>
          <RichText text={pick(it)} />
        </li>
      ))}
    </Tag>
  );
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

const CALLOUT = {
  tip: "border-rose-200 bg-rose-50/60 text-rose-950",
  note: "border-sky-200 bg-sky-50/60 text-sky-950",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
} as const;

/** A highlighted box: a tip, a side note, or a warning (a common trap). */
export function Callout({ kind = "note", title, children }: { kind?: keyof typeof CALLOUT; title?: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <aside className={`rounded-lg border px-4 py-3 ${CALLOUT[kind]}`}>
      {title && (
        <p className="mb-1 text-sm font-semibold">
          <RichText text={pick(title)} />
        </p>
      )}
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </aside>
  );
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
      .then(([m, a]) => m.engraveSnippet(a.exampleData(abc), width))
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

/** A figure (an inline SVG drawn for the page, or any element) with a caption. */
export function Figure({ caption, children }: { caption: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <figure className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex justify-center overflow-x-auto">{children}</div>
      <figcaption className="mt-2 text-center text-xs text-gray-500">
        <RichText text={pick(caption)} />
      </figcaption>
    </figure>
  );
}

/** A table. Cells are RichText, or an element (e.g. a coloured mark). */
export function Table({ head, rows }: { head: readonly L[]; rows: (readonly (L | ReactElement)[])[] }) {
  const { pick } = useLang();
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                <RichText text={pick(h)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {isValidElement(c) ? c : <RichText text={pick(c as L)} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sources at the end of a section: https links only. */
export function Sources({ items }: { items: { label: string; url: string }[] }) {
  const { pick } = useLang();
  return (
    <div className="mt-2 border-t border-gray-100 pt-3">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{pick(["Sources", "資料來源"])}</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {items.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
              {s.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
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
          <button key={id} onClick={() => go("learn", id)} className="rounded-full bg-rose-50 px-2.5 py-1 text-(--lk-accent) hover:bg-rose-100">
            {p.level} · {plainText(pick(p.title))}
          </button>
        );
      })}
    </p>
  );
}

/** A link to another page of the site, e.g. <SiteLink to={["skills", "errors"]} label={…} />. */
export function SiteLink({ to, label }: { to: [string, string?, string?]; label: L }) {
  const { pick } = useLang();
  return (
    <button onClick={() => go(...to)} className="font-medium text-(--lk-accent) hover:underline">
      {pick(label)} →
    </button>
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
