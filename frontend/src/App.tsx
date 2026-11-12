import { go, Shell, useLang, useRoute, type ShellPage } from "@learnkit/web";
import EditorPage from "./EditorPage.tsx";
import LearnPage from "./LearnPage.tsx";
import RoadmapPage from "./RoadmapPage.tsx";

const REPO_URL = "https://github.com/jackyko1991/polyphonizer";

export default function App() {
  const { t } = useLang();
  const route = useRoute("editor");
  const pages: ShellPage[] = [
    { id: "editor", label: t("page.editor") },
    { id: "learn", label: t("page.learn") },
    { id: "roadmap", label: t("page.roadmap") },
  ];
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
      scrollId="pz-scroll"
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
      {route.page === "learn" ? <LearnPage id={route.tab} /> : route.page === "roadmap" ? <RoadmapPage /> : <EditorPage />}
    </Shell>
  );
}
