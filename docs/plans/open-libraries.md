# Bridging open music libraries

How the Library reaches scores held elsewhere. A library can be opened in place when its files sit one score per file
on a host that lets a web page download them (CORS: GitHub's raw files do), in a format Verovio or music21 reads
(MusicXML, Humdrum, ABC, MEI, MIDI), under a clear licence. Those are catalogued by `scripts/collections_catalog.py`
(URLs pinned to a commit) and opened with `fetch_score()` through an allow-list (`library/scoreSources.ts`,
`prelude.py`). Everything else is reached by the learner: a link out, their own download, and Open file, or later
through the local runner (docs/plans/local-agent.md), which is not bound by CORS.

## Where each library stands (Nov 2026)

| Library | Format | Licence | Browser download | Here |
|---|---|---|---|---|
| music21 corpus | mixed | open | built in | in |
| OpenScore Lieder, String Quartets | MusicXML | CC0 | yes (GitHub) | in |
| Craig Sapp: Mozart, Joplin, Haydn, Scarlatti | Humdrum | CC BY-NC-SA 4.0 | yes | in (Haydn, Scarlatti added Nov 2026) |
| ASAP (piano, Bach to Ravel) | MusicXML | CC BY-NC-SA 4.0 | yes | in (Nov 2026) |
| Josquin Research Project | Humdrum | CC BY-NC 4.0 | yes | in (Nov 2026) |
| Craig Sapp: Bach 370 chorales | Humdrum | CC BY-NC-SA 4.0 | yes | no: music21's corpus has them |
| Craig Sapp: Beethoven sonatas, Chopin preludes; Mozart quartets | Humdrum | none stated | yes | no (ask the editor) |
| The Session | ABC | forbids processing with language models | yes | no: Polyphonizer has an AI helper |
| Nottingham folk tunes | ABC | GPL-3 | yes | maybe |
| OpenEWLD | MusicXML | claims public domain; songs into the 1940s | yes | no |
| When in Rome | RomanText analyses | CC BY-SA 4.0 | yes | later: analyses shown over scores |
| DCML corpora | MuseScore (.mscx) | CC BY-NC-SA 4.0 | yes | no: neither engine reads .mscx |
| PDMX | MusicXML in one archive | CC0 / CC BY | yes (Zenodo), not per file | later: a listing with a mirror |
| IMSLP | mostly scanned PDF | per file (public domain in Canada …) | no (no CORS) | stages A–C below |
| CPDL | mixed | per work | no (blocks automated requests) | link out |
| Mutopia | LilyPond, MIDI, PDF | public domain / CC | no | link out; its MIDI opens |

## Stages for the libraries a page can't reach

- **A. Link out and open the file.** The Library's "Find elsewhere" row searches IMSLP, CPDL and Mutopia for the work
  or composer in view; the learner downloads there (accepting IMSLP's copyright notice themselves) and drops the file
  on the editor or uses Open file. MusicXML, MIDI, ABC, Humdrum and MEI open at once; a PDF or a recording says it
  needs the local runner (stage C). A licence filter (CC0 / attribution / non-commercial) narrows the Library.
- **B. Search through the local runner.** The runner calls IMSLP's and Mutopia's APIs from the learner's computer and
  lists works with the file types they offer; opening one shows its page there, so the learner still accepts and
  downloads it.
- **C. PDF and sound to notes.** The runner turns a PDF into MusicXML with Audiveris (open-source optical music
  recognition) and a recording into notes with an open transcription model (Basic Pitch), then the editor opens the
  result for correction with Edit notes. The first line of main.py credits where the file came from.
