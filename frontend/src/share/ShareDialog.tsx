/**
 * Export ▸ For a library: what one site (IMSLP, CPDL, Mutopia, MuseScore.com, OpenScore) needs before it takes a score,
 * the files to download in the forms it wants, and where its upload or report page is. Nothing is sent from here: the
 * learner uploads, or submits the report, on the site itself.
 */
import { go, useLang } from "@learnkit/web";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "../Button.tsx";
import type { ScoreData } from "../engine/types.ts";
import { BUTTON, FIELD, PRIMARY } from "../ui.ts";
import { licenceOf, type Rights } from "../licences.ts";
import { correctionIssueUrl, metadataOf, mutopiaComposerId, openScoreOf, SITES, type ShareFile, type SiteId } from "./sites.ts";

export interface ShareDialogProps {
  site: SiteId;
  score: ScoreData;
  /** the score's code (finds an OpenScore original read with fetch_score) */
  code: string;
  /** the score's licence: Mutopia's licence field and maintainer come from it */
  rights?: Rights | null;
  /** download one of the score's files (MusicXML, MIDI, PDF, LilyPond with these header fields) */
  onFile: (kind: ShareFile, header?: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

export default function ShareDialog({ site: id, score, code, rights, onFile, onClose }: ShareDialogProps) {
  const { pick } = useLang();
  const site = SITES[id];
  const meta = metadataOf(score.musicxml);
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (site.fields ?? []).map((f) => [
        f.key,
        f.from === "title"
          ? score.title || meta.title
          : f.from === "composer"
            ? meta.composer
            : f.key === "license"
              ? (licenceOf(rights?.licence)?.mutopia ?? "")
              : f.key === "maintainer"
                ? (rights?.holder ?? "")
                : (f.value ?? ""),
      ]),
    ),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const original = openScoreOf(code);
  // Mutopia's id for the composer, where Mutopia already has pieces of theirs (from the Library's list of them)
  useEffect(() => {
    if (id !== "mutopia" || !meta.composer) return;
    let live = true;
    void import("../library/mutopia.json").then((m) => {
      const found = mutopiaComposerId(meta.composer, (m.default as { works: unknown[][] }).works.map((w) => ({ composer: String(w[2]), folder: String(w[7]) })));
      if (live && found) setFields((f) => (f.mutopiacomposer ? f : { ...f, mutopiacomposer: found }));
    });
    return () => void (live = false);
  }, [id, meta.composer]);
  const get = async (kind: ShareFile) => {
    setBusy(kind);
    setErr(null);
    try {
      await onFile(kind, kind === "ly" ? fields : undefined);
    } catch (e) {
      setErr((e as { message?: string }).message ?? String(e));
    }
    setBusy(null);
  };
  const missing = (site.fields ?? []).filter((f) => f.required && !fields[f.key]?.trim());
  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/30 p-4" onClick={onClose} data-testid="share">
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={pick(site.name)}
      >
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-base font-semibold text-gray-900">{pick(["For ", "給 "]) + pick(site.name)}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={pick(["Close", "關閉"])}>
            <Icon icon={X} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">{pick(site.about)}</p>

        <h3 className="mt-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["What it needs", "需要什麼"])}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700" data-testid="share-needs">
          {site.needs.map((n, i) => (
            <li key={i}>{pick(n)}</li>
          ))}
        </ul>

        {site.fields?.length ? (
          <div className="mt-4 grid gap-2" data-testid="share-fields">
            {site.fields.map((f) => (
              <label key={f.key} className="grid gap-0.5 text-sm">
                <span className="text-gray-700">
                  {pick(f.label)} {f.required && <span className="text-(--lk-accent)">*</span>}
                  <code className="ml-1 text-[11px] text-gray-400">{f.key}</code>
                </span>
                {f.options ? (
                  <select value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} className={FIELD}>
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} placeholder={f.hint} className={FIELD} />
                )}
              </label>
            ))}
          </div>
        ) : null}

        <h3 className="mt-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">{pick(["Files", "檔案"])}</h3>
        <div className="mt-1 flex flex-wrap gap-2" data-testid="share-files">
          {site.files.map((f) => (
            <button key={f} onClick={() => void get(f)} disabled={busy !== null || (f === "ly" && missing.length > 0)} className={BUTTON} data-testid={`share-${f}`}>
              {busy === f ? "…" : pick(FILE_LABEL[f])}
            </button>
          ))}
        </div>
        {site.files.includes("ly") && missing.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">{pick(["Fill in the starred fields first.", "請先填好標 * 的欄位。"])}</p>
        )}
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {id === "openscore" ? (
            original ? (
              <a href={correctionIssueUrl(original, score.title || meta.title)} target="_blank" rel="noopener noreferrer" className={PRIMARY} data-testid="share-go">
                {pick(["Open a correction report on GitHub", "在 GitHub 開一份更正回報"])} <Icon icon={ExternalLink} />
              </a>
            ) : (
              <p className="text-sm text-gray-600">{pick(["This score wasn't opened from OpenScore, so there is nothing of theirs to correct.", "這份樂譜不是從 OpenScore 開啟的，所以沒有他們的樂譜可更正。"])}</p>
            )
          ) : (
            <a href={site.upload} target="_blank" rel="noopener noreferrer" className={PRIMARY} data-testid="share-go">
              {pick(site.uploadLabel)} <Icon icon={ExternalLink} />
            </a>
          )}
          <a href={site.guide} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-(--lk-accent) hover:underline">
            {pick(["Their guide", "他們的說明"])} ↗
          </a>
          <button onClick={() => (onClose(), go("skills", "share", id))} className="text-sm text-(--lk-accent) hover:underline" data-testid="share-tutorial">
            {pick(["Step by step", "逐步教學"])}
          </button>
        </div>
      </div>
    </div>
  );
}

const FILE_LABEL: Record<ShareFile, readonly [string, string]> = {
  musicxml: ["MusicXML", "MusicXML"],
  midi: ["MIDI", "MIDI"],
  pdf: ["PDF (print)", "PDF（列印）"],
  ly: ["LilyPond (draft)", "LilyPond（草稿）"],
};
