"""The copista wrapper's page joining (music21; no PyTorch needed). Run: pixi run test-runner"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engines"))
import copista  # noqa: E402


def page(tmp, name, parts, bars):
    from music21 import meter, note, stream

    s = stream.Score()
    for i in range(parts):
        p = stream.Part()
        for b in range(bars):
            m = stream.Measure(number=b + 1)
            if b == 0:
                m.append(meter.TimeSignature("4/4"))
            m.append(note.Note(60 + i + b, quarterLength=4))
            p.append(m)
        s.append(p)
    f = Path(tmp) / f"{name}.musicxml"
    s.write("musicxml", fp=str(f))
    return f


class Title(unittest.TestCase):
    def test_the_score_takes_the_learners_file_name(self):
        xml = "<work><work-title>input_p01.musicxml</work-title></work><movement-title>input_p01.musicxml</movement-title>"
        out = copista.titled(xml, "bwv-1006_3 <a4> & co")
        self.assertIn("<movement-title>bwv-1006_3 &lt;a4&gt; &amp; co</movement-title>", out)
        self.assertIn("<work-title>bwv-1006_3 &lt;a4&gt; &amp; co</work-title>", out)
        self.assertEqual(copista.titled(xml, ""), xml)
        # the reader writes no title: one is added before the identification
        bare = '<score-partwise version="4.0">\n  <identification></identification>\n  <part-list></part-list>'
        self.assertIn("<movement-title>Minuet</movement-title>\n  <identification>", copista.titled(bare, "Minuet"))


class Join(unittest.TestCase):
    def test_pages_in_reading_order(self):
        names = [Path(f"score-{n}.musicxml") for n in (10, 2, 1)]
        self.assertEqual([p.name for p in sorted(names, key=copista.page_order)], ["score-1.musicxml", "score-2.musicxml", "score-10.musicxml"])

    def test_join_appends_each_parts_measures_renumbered(self):
        from music21 import converter, stream

        with tempfile.TemporaryDirectory() as tmp:
            xml = copista.join_pages([page(tmp, "p-1", 2, 3), page(tmp, "p-2", 2, 2), page(tmp, "p-3", 3, 1)])
            out = Path(tmp) / "all.musicxml"
            out.write_text(xml)
            s = converter.parse(str(out))
            self.assertEqual(len(s.parts), 2)
            # page 3 has 3 parts, unlike page 1: left out
            self.assertEqual([m.number for m in s.parts[0].getElementsByClass(stream.Measure)], [1, 2, 3, 4, 5])
            self.assertEqual([n.pitch.midi for n in s.parts[1].flatten().notes], [61, 62, 63, 61, 62])


if __name__ == "__main__":
    unittest.main()
