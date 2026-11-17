import { go, READING_TABS, RichText, routeHash, SeriesPage, seriesText, Shell, Timeline, useLang, useRoute, type ShellPage } from "@learnkit/web";
import { Component, lazy, Suspense, useState, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import EditorPage from "./EditorPage.tsx";
import LearnPage from "./LearnPage.tsx";
import { SCROLL } from "./pages/kit.tsx";
import { LEARN_TABS } from "./learn/route.ts";
import RoadmapPage from "./RoadmapPage.tsx";
import { STRINGS } from "./strings.ts";
import Toolbox from "./tools/Toolbox.tsx";
import { usePanel } from "./agent/bus.ts";

const AgentPanel = lazy(() => import("./agent/AgentPanel.tsx"));
/** the AI panel, loaded the first time it is opened, then kept (a running answer goes on while it is closed) */
function AgentHost() {
  const open = usePanel().open;
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened ? (
    <Suspense fallback={null}>
      <AgentPanel />
    </Suspense>
  ) : null;
}

const REPO_URL = "https://github.com/jackyko1991/polyphonizer";
/** Concept's sub-pages (Tensorizer's and Formalizer's order, History last) */
const CONCEPT_TABS = ["method", "feynman", "theory", "engraving", "limits", "history"] as const;
const SKILLS_TABS = ["first", "corpus", "structure", "errors", "verify", "share"] as const;
const AGENT_TABS = ["tools", "skills", "mcp", "runner", "roadmap"] as const;
/** Further reading: books & papers, then the learnkit series (Code labs, Explorables) */
const READING = ["books", "papers", "labs", "explorables"] as const;

// the reading pages load when first opened, so the editor starts fast
type PageView = ComponentType<{ section: string | null }>;
const CONCEPT_PAGES: Record<string, PageView> = {
  method: lazy(() => import("./pages/concept/Method.tsx")),
  feynman: lazy(() => import("./pages/concept/Feynman.tsx")),
  theory: lazy(() => import("./pages/concept/Theory.tsx")),
  engraving: lazy(() => import("./pages/concept/Engraving.tsx")),
  limits: lazy(() => import("./pages/concept/Limits.tsx")),
};
const SKILLS_PAGES: Record<string, PageView> = {
  first: lazy(() => import("./pages/skills/First.tsx")),
  corpus: lazy(() => import("./pages/skills/Corpus.tsx")),
  structure: lazy(() => import("./pages/skills/Structure.tsx")),
  errors: lazy(() => import("./pages/skills/Errors.tsx")),
  verify: lazy(() => import("./pages/skills/Verify.tsx")),
  share: lazy(() => import("./pages/skills/Share.tsx")),
};
const READING_PAGES: Record<string, PageView> = {
  books: lazy(() => import("./pages/reading/Books.tsx")),
  papers: lazy(() => import("./pages/reading/Papers.tsx")),
};
const AGENT_PAGES: Record<string, PageView> = {
  tools: lazy(() => import("./pages/agents/Tools.tsx")),
  skills: lazy(() => import("./pages/agents/Setup.tsx").then((m) => ({ default: m.SkillsAgent }))),
  mcp: lazy(() => import("./pages/agents/Setup.tsx").then((m) => ({ default: m.McpAgent }))),
  runner: lazy(() => import("./pages/agents/Runner.tsx")),
};
const LibraryPage = lazy(() => import("./LibraryPage.tsx"));
const HistoryPage = lazy(() => import("./history.ts").then((m) => ({ default: historyPage(m.ERAS, m.HISTORY) })));

export default function App() {
  const { t, lang } = useLang();
  const route = useRoute("editor");
  const pages: ShellPage[] = [
    { id: "editor", label: t("page.editor") },
    { id: "library", label: t("page.library") },
    {
      id: "learn",
      label: t("page.learn"),
      // Learn to ▾ Code / Play
      tabs: LEARN_TABS.map((id) => ({ id, label: t(`learn.tab.${id}`) })),
    },
    {
      id: "concept",
      label: t("page.concept"),
      // sub-pages are a list under the header tab, as on Tensorizer and Formalizer
      tabs: CONCEPT_TABS.map((id) => ({ id, label: t(`tab.${id}`) })),
      defaultTab: CONCEPT_TABS[0],
    },
    {
      id: "skills",
      label: t("page.skills"),
      tabs: SKILLS_TABS.map((id) => ({ id, label: t(`skills.${id}`) })),
      defaultTab: SKILLS_TABS[0],
    },
    {
      id: "agents",
      label: t("page.agents"),
      tabs: AGENT_TABS.map((id) => ({ id, label: t(`agents.${id}`) })),
      defaultTab: AGENT_TABS[0],
    },
    {
      id: "reading",
      label: t("page.reading"),
      // a menu under the header tab: the reading list, then the sister sites
      tabs: READING.map((id) => ({
        id,
        label: id === "books" || id === "papers" ? t(`reading.${id}`) : seriesText(READING_TABS[id], lang),
      })),
      defaultTab: READING[0],
    },
  ];
  const tabOf = <T extends readonly string[]>(tabs: T) => (tabs.includes(route.tab as never) ? route.tab! : tabs[0]);
  return (
    <Shell
      brand={{
        name: (
          <>
            Polyphon<span className="text-rose-200">izer</span>
          </>
        ),
        tagline: t("tagline"),
        logo: `${import.meta.env.BASE_URL}favicon.svg`,
        home: () => go("editor"),
      }}
      pages={pages}
      route={route}
      scrollId={SCROLL}
      footer={
        <>
          <a
            href="https://buymeacoffee.com/jackyko1991"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-yellow-300 px-2.5 py-0.5 font-medium text-gray-900 hover:bg-yellow-400"
          >
            ☕ {t("coffee")}
          </a>
          <span>{t("footer.licence")}</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-gray-900">
            GitHub
          </a>
        </>
      }
    >
      <PageBoundary at={`${route.page}/${route.tab ?? ""}`}>
      <Suspense fallback={<p className="p-10 text-center text-sm text-gray-500">…</p>}>
        {route.page === "library" ? (
          <LibraryPage />
        ) : route.page === "learn" ? (
          <LearnPage tab={route.tab} section={route.section} />
        ) : route.page === "concept" ? (
          tabOf(CONCEPT_TABS) === "history" ? (
            <HistoryPage section={route.section} />
          ) : (
            <Page views={CONCEPT_PAGES} tab={tabOf(CONCEPT_TABS)} section={route.section} />
          )
        ) : route.page === "skills" ? (
          <Page views={SKILLS_PAGES} tab={tabOf(SKILLS_TABS)} section={route.section} />
        ) : route.page === "reading" ? (
          tabOf(READING) === "labs" || tabOf(READING) === "explorables" ? (
            <SeriesPage
              key={route.tab}
              kind={tabOf(READING) === "labs" ? "lab" : "explorable"}
              current="polyphonizer"
              lang={lang}
              onOther={() => go("reading", tabOf(READING) === "labs" ? "explorables" : "labs")}
            />
          ) : (
            <Page views={READING_PAGES} tab={tabOf(READING)} section={route.section} />
          )
        ) : route.page === "agents" ? (
          tabOf(AGENT_TABS) === "roadmap" ? <RoadmapPage /> : <Page views={AGENT_PAGES} tab={tabOf(AGENT_TABS)} section={route.section} />
        ) : route.page === "roadmap" ? (
          // the roadmap was a header page before it moved under AI agent: that address still works
          <RoadmapPage />
        ) : (
          <EditorPage />
        )}
      </Suspense>
      </PageBoundary>
      <Toolbox />
      <AgentHost />
    </Shell>
  );
}

function Page({ views, tab, section }: { views: Record<string, PageView>; tab: string; section: string | null }) {
  const View = views[tab];
  return <View key={tab} section={section} />;
}

/** Concept ▸ History: learnkit's Timeline with this site's eras and cards (loaded with them) */
function historyPage(eras: import("@learnkit/web").Era[], cards: import("@learnkit/web").TimelineCard[]) {
  return function HistoryPage({ section }: { section: string | null }) {
    const { t } = useLang();
    return (
      <div data-testid="history-page">
        <Timeline
          eras={eras}
          cards={cards}
          scrollRoot={SCROLL}
          focus={section}
          labels={{ contents: STRINGS.timeline, sources: STRINGS.sources, open: STRINGS["timeline.open"] }}
          // keep the address shareable without a new history entry (no hashchange, so no re-render)
          onPick={(id) => history.replaceState(null, "", routeHash("concept", "history", id))}
          header={
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("history.title")}</h1>
              <p className="mt-3 text-gray-600">
                <RichText text={t("history.intro")} />
              </p>
            </>
          }
        />
      </div>
    );
  };
}

/** one broken page shows an error card instead of a blank site; a new page (route) starts afresh */
class PageBoundary extends Component<{ at: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { at: string }) {
    if (prev.at !== this.props.at && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[polyphonizer] page crashed:", error, info.componentStack);
  }
  render() {
    return this.state.error ? <Crash error={this.state.error} /> : this.props.children;
  }
}

function Crash({ error }: { error: Error }) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-xl px-5 py-16" data-testid="crash">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">{t("crash.title")}</h1>
        <p className="mt-2 text-sm text-red-800">{t("crash.body")}</p>
        <pre className="mt-3 overflow-x-auto rounded bg-white/70 p-2 font-mono text-xs text-red-900">{error.message}</pre>
        <button onClick={() => location.reload()} className="mt-4 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
          {t("crash.reload")}
        </button>
      </div>
    </div>
  );
}
