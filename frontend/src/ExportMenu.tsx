/**
 * The Export menu, one for the score panel's Export button and for My scores' export (exporting.ts does the work):
 * the score (MusicXML, MIDI, print or PDF), the whole project (.zip) or its code, its licence, and the files a library
 * wants (share/). Items that need the compiled score wait for it.
 */
import { useLang } from "@learnkit/web";
import { ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Button.tsx";
import { SITE_IDS, SITES, type SiteId } from "./share/sites.ts";
import { BUTTON } from "./ui.ts";

export interface ExportActions {
  /** the score is compiled (MusicXML, MIDI, print and the libraries need it) */
  ready: boolean;
  musicxml: () => void;
  midi: () => Promise<void>;
  print: () => Promise<void>;
  zip: () => Promise<void>;
  code: () => void;
  /** open the licence dialog; the licence's short name, or "" when none is set */
  licence: () => void;
  licenceName: string;
  site: (id: SiteId) => void;
}

export default function ExportMenu({ actions: a, variant = "button", onOpen, align = "right" }: { actions: ExportActions; variant?: "button" | "icon"; onOpen?: () => void; align?: "left" | "right" }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // a click elsewhere or Escape closes it
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => (document.removeEventListener("pointerdown", away), document.removeEventListener("keydown", esc));
  }, [open]);
  const pick = (f: () => unknown) => () => (setOpen(false), void f());
  const item = (label: string, f: () => unknown, needsScore: boolean, testId?: string) => (
    <button
      onClick={pick(f)}
      disabled={needsScore && !a.ready}
      title={needsScore && !a.ready ? t("export.compileFirst") : undefined}
      className="rounded-md px-3 py-1.5 text-left hover:bg-gray-100 disabled:opacity-40"
      data-testid={testId}
    >
      {label}
    </button>
  );
  return (
    <div className="relative" ref={box}>
      {variant === "button" ? (
        <button onClick={() => (onOpen?.(), setOpen((o) => !o))} className={`${BUTTON} shadow-sm`} aria-expanded={open} data-testid="export">
          <Icon icon={Download} /> {t("export")} <Icon icon={ChevronDown} className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={() => (onOpen?.(), setOpen((o) => !o))}
          title={t("ws.export")}
          aria-label={t("ws.export")}
          aria-expanded={open}
          className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200"
          data-testid="tree-export"
        >
          <Icon icon={Download} />
        </button>
      )}
      {open && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} z-40 mt-1 flex w-72 flex-col rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-lg`} data-testid="export-menu">
          <p className="px-3 pt-1 pb-0.5 text-xs font-semibold text-gray-500">{t("export.score")}</p>
          {item(t("export.musicxml"), a.musicxml, true, "export-musicxml")}
          {item(t("export.midi"), a.midi, true, "export-midi")}
          {item(t("export.print"), a.print, true, "export-print")}
          <p className="mt-1 border-t border-gray-100 px-3 pt-2 pb-0.5 text-xs font-semibold text-gray-500">{t("export.project")}</p>
          {item(t("export.zip"), a.zip, false, "export-zip")}
          {item(t("export.code"), a.code, false, "export-code")}
          <button onClick={pick(a.licence)} className="rounded-md px-3 py-1.5 text-left hover:bg-gray-100" data-testid="export-licence">
            {t("export.licence")} <span className="text-gray-500">{a.licenceName || t("export.licenceNone")}</span>
          </button>
          {/* the files a library wants, its rules, and where its upload page is */}
          <p className="mt-1 border-t border-gray-100 px-3 pt-2 pb-1 text-xs font-semibold text-gray-500">{t("export.forLibrary")}</p>
          <div className="flex flex-wrap gap-1 px-2 pb-1" data-testid="export-sites">
            {SITE_IDS.map((id) => (
              <button
                key={id}
                onClick={pick(() => a.site(id))}
                disabled={!a.ready}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:border-(--lk-accent) hover:text-(--lk-accent) disabled:opacity-40"
                data-testid={`export-site-${id}`}
              >
                {SITES[id].name[0].replace(/ \(.*\)$/, "")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
