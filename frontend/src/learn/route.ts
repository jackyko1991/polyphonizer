/**
 * Learn to ▾ has two sub-pages: Code (#/learn/code/<problem>) and Play (#/learn/play/<lesson>). Addresses from before
 * the split, #/learn and #/learn/<problem>, still work: they mean Code, and the page rewrites them to the new form.
 */

/** as learnkit's routeHash (kept here so node tests can load this file) */
const hash = (...parts: (string | null)[]) => "#/" + parts.filter(Boolean).map((p) => encodeURIComponent(p!)).join("/");

export const LEARN_TABS = ["code", "play"] as const;
export type LearnTab = (typeof LEARN_TABS)[number];

export interface LearnRoute {
  tab: LearnTab;
  /** the problem (Code) or lesson (Play); null = the first */
  id: string | null;
  /** the address to show instead (an old-style one), or null */
  redirect: string | null;
}

/** the Learn sub-page and item from the route's tab and section (#/learn/<tab>/<section>) */
export function parseLearn(tab: string | null | undefined, section: string | null | undefined): LearnRoute {
  if (tab === "code" || tab === "play") return { tab, id: section || null, redirect: null };
  // #/learn → Code; #/learn/<problem> (before the split) → #/learn/code/<problem>
  return { tab: "code", id: tab || null, redirect: hash("learn", "code", tab || null) };
}

/** open a Learn to Code problem or lesson */
export const goCode = (id: string) => {
  window.location.hash = hash("learn", "code", id);
};
