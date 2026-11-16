import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

/** run Python with the prelude's helpers (music21 from the pixi environment) */
function py(code: string): string {
  const prog = `import sys, types\nns = {}\nexec(compile(open("src/engine/prelude.py").read(), "prelude.py", "exec"), ns)\n${code}`;
  return execFileSync("python3", ["-c", prog], { encoding: "utf8" }).trim();
}

test("with_harmony writes a When in Rome analysis's Roman numerals under the bass, at their bar and beat", (t) => {
  try {
    execFileSync("python3", ["-c", "import music21"], { stdio: "ignore" });
  } catch {
    return t.skip("no music21 here");
  }
  const out = py(`
from music21 import converter, stream, note, meter
rn = converter.parse("""Composer: Test
Title: Test
Time signature: 4/4

m1 C: I b3 V
m2 I b3 V7
""", format="romantext")
s = stream.Score()
for pitches in (["E5", "D5", "C5", "D5", "E5"], ["C3", "C3", "G2", "G2", "C3"]):
    p = stream.Part()
    for i, ps in enumerate((pitches[:4], pitches[4:])):
        m = stream.Measure(number=i + 1)
        if i == 0:
            m.append(meter.TimeSignature("4/4"))
        for x in ps:
            m.append(note.Note(x, quarterLength=1 if len(ps) == 4 else 4))
        p.append(m)
    s.append(p)
out = ns["with_harmony"](s, rn)
bass = out.parts[-1].flatten().notes
print([ (n.nameWithOctave, n.lyric) for n in bass ])
print([ n.lyric for n in out.parts[0].flatten().notes ])
`);
  const [bass, top] = out.split("\n");
  // bar 2's bass is one whole note: its two numerals read in order on it
  assert.equal(bass, "[('C3', 'I'), ('C3', None), ('G2', 'V'), ('G2', None), ('C3', 'I V7')]");
  // the tune is left alone
  assert.equal(top, "[None, None, None, None, None]");
});
