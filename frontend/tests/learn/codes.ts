/** Prints, as JSON, every code the Learn tests run through the engine (see solutions.ts). */
import { readFileSync } from "node:fs";
import { PROBLEMS } from "../../src/problems.ts";
import { MARKING_DEMOS, SOLUTIONS, WRONG } from "./solutions.ts";

/** every <Example code={`…`}> in the lessons, with the ABC of the <Notation> inside it */
export function lessonExamples(): { code: string; abc: string }[] {
  const text = ["lessons.tsx", "techniqueLessons.tsx"].map((f) => readFileSync(new URL(`../../src/learn/${f}`, import.meta.url), "utf8")).join("\n");
  return [...text.matchAll(/<Example\b[^>]*?\bcode=\{`([^`]*)`\}[\s\S]*?<Notation\b[^>]*?\babc=\{`([^`]*)`\}/g)].map((m) => ({
    code: m[1] + "\n",
    abc: m[2],
  }));
}

export function codes(): string[] {
  const out = new Set<string>();
  for (const p of PROBLEMS) {
    if (!(p.id in SOLUTIONS)) continue;
    out.add(SOLUTIONS[p.id]);
    out.add(p.starter.replaceAll("___", ""));
    for (const [code] of WRONG[p.id] ?? []) out.add(code);
  }
  for (const e of lessonExamples()) out.add(e.code);
  for (const c of MARKING_DEMOS) out.add(c);
  return [...out];
}

if (import.meta.main) console.log(JSON.stringify(codes()));
