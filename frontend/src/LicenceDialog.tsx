/** The project's licence (and who holds it), or the learner's default for every project; written into its exports. */
import { useLang } from "@learnkit/web";
import { X } from "lucide-react";
import { useState } from "react";
import { Icon } from "./Button.tsx";
import { LICENCES, licenceOf, rightsLine, type Rights } from "./licences.ts";
import { FIELD, PRIMARY } from "./ui.ts";

export default function LicenceDialog({
  own,
  fallback,
  onSave,
  onClose,
}: {
  /** the project's own setting ("" licence: none of its own) */
  own: { licence?: string; holder?: string };
  /** the learner's default */
  fallback: Rights | null;
  onSave: (project: { licence?: string; holder?: string }, makeDefault: boolean) => void;
  onClose: () => void;
}) {
  const { pick } = useLang();
  const [licence, setLicence] = useState(own.licence ?? "");
  const [holder, setHolder] = useState(own.holder ?? fallback?.holder ?? "");
  const [asDefault, setAsDefault] = useState(false);
  const shown: Rights | null = licence ? { licence, holder } : fallback;
  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/30 p-4" onClick={onClose} data-testid="licence-dialog">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={pick(["Licence", "授權"])}>
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-base font-semibold text-gray-900">{pick(["This score's licence", "這份樂譜的授權"])}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={pick(["Close", "關閉"])}>
            <Icon icon={X} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {pick([
            "Written into its MusicXML, the printed pages, LilyPond files and the project's zip. It covers your edition or arrangement; music in the public domain stays free whatever you choose.",
            "會寫進它的 MusicXML、列印頁面、LilyPond 檔和專案 zip。它涵蓋你的版本或編曲；公有領域的音樂不論你選什麼都仍然自由。",
          ])}
        </p>
        <div className="mt-3 space-y-1.5" role="radiogroup">
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" checked={!licence} onChange={() => setLicence("")} className="mt-1" />
            <span>
              {pick(["Use my default", "使用我的預設"])}{" "}
              <span className="text-gray-500">({fallback ? pick(licenceOf(fallback.licence)!.name) : pick(["none set: nothing is written", "尚未設定：不寫入任何授權"])})</span>
            </span>
          </label>
          {LICENCES.map((l) => (
            <label key={l.id} className="flex items-start gap-2 text-sm">
              <input type="radio" checked={licence === l.id} onChange={() => setLicence(l.id)} className="mt-1" data-testid={`licence-${l.id}`} />
              <span>
                {pick(l.name)} <span className="block text-xs text-gray-500">{pick(l.about)}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-3 grid gap-0.5 text-sm">
          <span className="text-gray-700">{pick(["Rights holder (you, or Anonymous)", "權利人（你，或 Anonymous）"])}</span>
          <input value={holder} onChange={(e) => setHolder(e.target.value)} className={FIELD} data-testid="licence-holder" />
        </label>
        {shown && <p className="mt-2 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600" data-testid="licence-preview">{rightsLine(shown)}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={asDefault} disabled={!licence} onChange={(e) => setAsDefault(e.target.checked)} data-testid="licence-default" />
            {pick(["Also my default for other scores", "也作為其他樂譜的預設"])}
          </label>
          <button onClick={() => (onSave(licence ? { licence, holder: holder.trim() } : {}, asDefault), onClose())} className={`${PRIMARY} ml-auto`} data-testid="licence-save">
            {pick(["Save", "儲存"])}
          </button>
        </div>
      </div>
    </div>
  );
}
