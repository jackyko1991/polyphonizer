/**
 * The music toolbox, on every page: one launcher at the bottom right that fans out the tools (virtual keyboard,
 * metronome, tuner) on hover or click, and a dock along the bottom of the window where the open tools live as tabs.
 * Tools keep running in the background (the metronome keeps ticking while you change pages); a dot on the launcher
 * says so. Shortcuts: ⌘⇧K keyboard, ⌘⇧M metronome, ⌘⇧U tuner (Ctrl on Windows and Linux).
 */
import { useLang } from "@learnkit/web";
import { AudioWaveform, Maximize2, Minimize2, Piano, Timer, Wrench, X, type LucideIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { closeTool, hideDock, moveTool, openTool, setDockHeight, setExpanded, toggleTool, useToolbox, type ToolId } from "./toolboxState.ts";

const KeyboardTool = lazy(() => import("./KeyboardTool.tsx"));
const MetronomeTool = lazy(() => import("./MetronomeTool.tsx"));
const TunerTool = lazy(() => import("./TunerTool.tsx"));

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘⇧" : "Ctrl+Shift+";

export const TOOLS: { id: ToolId; icon: LucideIcon; name: readonly [string, string]; key: string }[] = [
  { id: "keyboard", icon: Piano, name: ["Keyboard", "虛擬鍵盤"], key: "K" },
  { id: "metronome", icon: Timer, name: ["Metronome", "節拍器"], key: "M" },
  { id: "tuner", icon: AudioWaveform, name: ["Tuner", "調音器"], key: "U" },
];

export default function Toolbox() {
  const { pick } = useLang();
  const box = useToolbox();
  const [menu, setMenu] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [shown, setShown] = useState(false);

  // shortcuts, on any page
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return;
      const tool = TOOLS.find((t) => e.code === `Key${t.key}`);
      if (!tool) return;
      e.preventDefault();
      toggleTool(tool.id);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // the dock slides up when it opens; the page keeps its last lines visible above it
  const dockOpen = box.open.length > 0;
  // dragging a tab to reorder: which tool, where the pointer started, and whether it moved (then it's not a click)
  const tabBar = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: ToolId; x: number } | null>(null);
  const dragged = useRef(false);
  const [dragging, setDragging] = useState<ToolId | null>(null);
  const dockShown = dockOpen && !box.hidden;
  // the dock is a bottom panel by default (phone and computer); ⤢ makes it fill the window, Esc shrinks it back
  const sheet = box.expanded;
  useEffect(() => {
    if (!dockShown || !sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockShown, sheet]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(dockShown));
    document.documentElement.style.setProperty("--pz-dock", dockShown ? `${box.height}px` : "0px");
    return () => cancelAnimationFrame(raf);
  }, [dockShown, box.height]);

  const hoverIn = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (!menu) openTimer.current = window.setTimeout(() => setMenu(true), 120);
  };
  const hoverOut = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(false), 250);
  };
  const choose = (id: ToolId) => {
    openTool(id);
    setMenu(false);
  };

  return (
    <>
      {/* launcher and its menu */}
      <div
        // always in the same place, bottom right, above everything (the dock and the phone sheet too)
        className="fixed right-4 bottom-10 z-[70] flex flex-col items-end gap-2"
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        onKeyDown={(e) => e.key === "Escape" && setMenu(false)}
      >
        <div
          role="menu"
          aria-label={pick(["Music tools", "音樂工具"])}
          className={`flex flex-col items-end gap-2 pb-1 ${menu ? "" : "pointer-events-none"}`}
        >
          {TOOLS.map((t, i) => {
            const running = box.running.includes(t.id);
            const delay = menu ? (TOOLS.length - 1 - i) * 40 : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                tabIndex={menu ? 0 : -1}
                onClick={() => choose(t.id)}
                style={{ transitionDelay: `${delay}ms` }}
                className={`group flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pr-1.5 pl-3 text-sm font-medium text-gray-800 shadow-md transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-x-0.5 hover:bg-rose-50 motion-reduce:transition-opacity ${
                  menu
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-2 scale-90 opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
                }`}
              >
                <span className="flex flex-col items-end leading-tight">
                  <span>{pick(t.name)}</span>
                  <span className="text-[10px] font-normal text-gray-400">
                    {mod}
                    {t.key}
                  </span>
                </span>
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full ${running ? "bg-(--lk-accent) text-white" : "bg-rose-50 text-(--lk-accent)"}`}
                >
                  <t.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label={pick(["Music tools", "音樂工具"])}
          title={pick(["Music tools: keyboard, metronome, tuner", "音樂工具：虛擬鍵盤、節拍器、調音器"])}
          data-testid="toolbox"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-(--lk-accent) text-white shadow-lg transition-all duration-150 ease-out hover:scale-[1.06] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lk-accent)"
        >
          {menu ? (
            <X className="h-5 w-5 transition-transform duration-200" strokeWidth={2} aria-hidden />
          ) : (
            <Wrench className="h-5 w-5 -rotate-12 transition-transform duration-200" strokeWidth={2} aria-hidden />
          )}
          {box.running.length > 0 && (
            <span className="absolute top-0.5 right-0.5 h-3 w-3 animate-[pz-dot_1.6s_ease-in-out_infinite] rounded-full border-2 border-white bg-emerald-500" />
          )}
        </button>
      </div>

      {/* the dock */}
      {dockOpen && (
        <section
          aria-label={pick(["Music tools", "音樂工具"])}
          className={`fixed inset-x-0 bottom-7 z-40 flex flex-col border-t border-gray-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
            shown ? "translate-y-0" : "translate-y-full"
          } ${
            // enlarged: the tool fills the window (big, easy to touch on a phone or a stand)
            sheet ? "top-0 bottom-0 z-[60] h-[100dvh]! border-t-0" : ""
          } ${box.hidden ? "hidden" : ""}`}
          style={{ height: box.height }}
          data-testid="tool-dock"
        >
          <div className={sheet ? "hidden" : ""}>
            <Resizer />
          </div>
          <div ref={tabBar} className="flex h-9 shrink-0 items-stretch gap-1 border-b border-gray-200 bg-gray-50 px-2" role="tablist">
            {box.open.map((id, index) => {
              const t = TOOLS.find((x) => x.id === id)!;
              const front = box.active === id;
              return (
                <div
                  key={id}
                  data-tab={id}
                  className={`flex items-center rounded-t-md ${front ? "bg-white shadow-[0_1px_0_white]" : ""} ${dragging === id ? "cursor-grabbing opacity-70 ring-1 ring-(--lk-accent)/40" : ""}`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={front}
                    onClick={() => (dragged.current ? (dragged.current = false) : openTool(id))}
                    // drag a tab sideways to reorder (mouse or touch); Alt+← / → moves it with the keyboard
                    onPointerDown={(e) => {
                      drag.current = { id, x: e.clientX };
                      dragged.current = false;
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const d = drag.current;
                      if (!d || (!dragged.current && Math.abs(e.clientX - d.x) < 6)) return;
                      dragged.current = true;
                      setDragging(d.id);
                      // its new place: how many of the other tabs have their centre left of the pointer
                      const to = [...(tabBar.current?.querySelectorAll<HTMLElement>("[data-tab]") ?? [])].filter((el) => {
                        if (el.dataset.tab === d.id) return false;
                        const r = el.getBoundingClientRect();
                        return r.left + r.width / 2 < e.clientX;
                      }).length;
                      if (box.open[to] !== d.id) moveTool(d.id, to);
                    }}
                    onPointerUp={() => {
                      drag.current = null;
                      setDragging(null);
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      setDragging(null);
                    }}
                    onKeyDown={(e) => {
                      if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                      e.preventDefault();
                      moveTool(id, index + (e.key === "ArrowLeft" ? -1 : 1));
                    }}
                    title={pick(["Drag to reorder (Alt+← / →)", "拖曳可調整順序（Alt+← / →）"])}
                    className={`flex touch-none items-center gap-1.5 px-3 text-sm font-medium select-none ${front ? "text-(--lk-accent)" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    <t.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    {pick(t.name)}
                    {box.running.includes(id) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeTool(id)}
                    aria-label={`${pick(["Close", "關閉"])} ${pick(t.name)}`}
                    className="mr-1 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setExpanded(!sheet)}
              className="ml-auto flex items-center gap-1 self-center rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 max-sm:px-2.5"
              title={sheet ? pick(["Back to the bottom panel (Esc)", "回到底部面板（Esc）"]) : pick(["Fill the screen", "全螢幕"])}
              aria-pressed={sheet}
              data-testid="dock-expand"
            >
              {sheet ? <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden /> : <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />}
              <span className="max-sm:hidden">{sheet ? pick(["Smaller", "縮小"]) : pick(["Full screen", "全螢幕"])}</span>
            </button>
            <button
              type="button"
              onClick={hideDock}
              className="flex items-center gap-1 self-center rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 max-sm:px-2.5"
              title={pick(["Close the tools (they keep running; open the Toolbox to come back)", "關閉工具面板（工具會繼續運作；從工具箱回來）"])}
              data-testid="dock-close"
            >
              <X className="h-4 w-4 max-sm:h-5 max-sm:w-5" strokeWidth={2} aria-hidden />
              {pick(["Close", "關閉"])}
            </button>
          </div>
          {/* room on the right (and at the bottom on a phone) for the Toolbox button, which sits over the dock */}
          <div className="min-h-0 flex-1 overflow-auto p-3 pr-20 max-sm:p-4 max-sm:pr-4 max-sm:pb-24">
            <Suspense fallback={<p className="text-sm text-gray-500">…</p>}>
              {/* open tools stay mounted (a ticking metronome keeps its panel state); only the front one shows */}
              {box.open.map((id) => (
                <div key={id} className={`h-full ${box.active === id ? "animate-[pz-fade_0.15s_ease-out]" : "hidden"}`} role="tabpanel">
                  {id === "keyboard" ? <KeyboardTool /> : id === "metronome" ? <MetronomeTool /> : <TunerTool />}
                </div>
              ))}
            </Suspense>
          </div>
        </section>
      )}
    </>
  );
}

/** drag the dock's top edge to resize it */
function Resizer() {
  const { pick } = useLang();
  const box = useToolbox();
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={pick(["Resize the tools", "調整工具高度"])}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") setDockHeight(box.height + 20);
        if (e.key === "ArrowDown") setDockHeight(box.height - 20);
      }}
      onPointerDown={(e) => {
        const startY = e.clientY;
        const startH = box.height;
        const move = (ev: PointerEvent) => setDockHeight(startH + (startY - ev.clientY));
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      className="absolute inset-x-0 -top-1 h-2 cursor-ns-resize hover:bg-rose-200/60"
    />
  );
}
