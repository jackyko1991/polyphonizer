/** A small label on what isn't ready or needs Pro: "Coming soon" (amber) or "Pro" (the accent colour). */
import { useLang } from "@learnkit/web";

export const COMING_SOON = ["Coming soon", "即將推出"] as const;
export const PRO = ["Pro", "Pro"] as const;

export function Badge({ text, pro = false }: { text: readonly [string, string]; pro?: boolean }) {
  const { pick } = useLang();
  return (
    <span className={`ml-1.5 inline-block rounded px-1.5 py-px align-middle text-[10px] font-semibold ${pro ? "bg-(--lk-accent) text-white" : "bg-amber-100 text-amber-900"}`} data-testid={pro ? "badge-pro" : "badge-soon"}>
      {pick(text)}
    </span>
  );
}
