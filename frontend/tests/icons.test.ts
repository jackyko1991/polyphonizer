/** Buttons use Lucide icons (src/Button.tsx), not Unicode glyphs or emoji, so every icon has the same size. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OLD = /[▶■⟳💾⑂⤓⤢⤡✎♪↺📁≡🗑]/u;
// still being converted by the Learn work; remove from this list when done
const PENDING = [/src\/LearnPage\.tsx$/, /src\/learn\//];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

test("no button shows an old glyph as its icon", () => {
  const found: string[] = [];
  for (const f of files("src")) {
    if (PENDING.some((re) => re.test(f))) continue;
    const text = readFileSync(f, "utf8");
    // JSX text right inside a <button …> (possibly after line breaks): its first character
    for (const m of text.matchAll(/<button\b[^>]*>\s*([^<{\s])/g))
      if (OLD.test(m[1])) found.push(`${f}:${text.slice(0, m.index).split("\n").length} ${m[1]}`);
  }
  assert.deepEqual(found, []);
});
