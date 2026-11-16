# Bridging open music libraries

How the Library reaches scores held elsewhere. A library can be opened in place when its files sit one score per file
on a host that lets a web page download them (CORS: GitHub's raw files do), in a format Verovio or music21 reads
(MusicXML, Humdrum, ABC, MEI, MIDI), under a clear licence. Those are catalogued by `scripts/collections_catalog.py`
(URLs pinned to a commit) and opened with `fetch_score()` through an allow-list (`library/scoreSources.ts`,
`prelude.py`). Everything else is reached by the learner: a link out, their own download, and Open file, or later
through the local runner (docs/plans/local-agent.md), which is not bound by CORS.

## Where each library stands (Nov 2026)

| Library | Format | Licence | Here |
|---|---|---|---|
| music21 corpus | mixed | open | in: opens in the editor |
| OpenScore Lieder, String Quartets | MusicXML | CC0 | in: opens in the editor |
| Craig Sapp: Mozart, Joplin, Haydn, Scarlatti | Humdrum | CC BY-NC-SA 4.0 | in: opens in the editor |
| ASAP (piano, Bach to Ravel) | MusicXML | CC BY-NC-SA 4.0 | in: opens in the editor |
| Josquin Research Project | Humdrum | CC BY-NC 4.0 | in: opens in the editor |
| Mutopia Project | LilyPond, MIDI, PDF | PD / CC BY / CC BY-SA | in: 2,036 pieces listed, downloaded from mutopiaproject.org |
| IMSLP | mostly scanned PDF | per file | in: 267,461 works listed from its public work list, linked to their pages |
| When in Rome | RomanText analyses | CC BY-SA 4.0 | in: 688 works' Roman numerals written under the bass |
| MuseScore.com | — | per score; no open catalogue, scraping not allowed | link out (search) |
| CPDL | mixed | per work | link out; a request to list its works is drafted (it blocks automated access) |
| PDMX | MusicXML in archives | CC0 / CC BY | left out (no single files to open; a mirror was decided against) |
| The Session | ABC | forbids processing with language models | left out |
| Craig Sapp: Beethoven sonatas, Chopin preludes; Mozart quartets | Humdrum | none stated | left out (ask the editor) |
| DCML corpora | MuseScore (.mscx) | CC BY-NC-SA 4.0 | left out: neither engine reads .mscx |

## The catalogue database

All the sources meet in one SQLite database (scripts/library-db.ts → frontend/public/library/library.sqlite, built by
the deploy and by pixi run dev/build, not kept in git): 287,957 works, composers, catalogue numbers, instruments,
licences, analyses and a full-text index (accents folded; composers' Chinese names). The page reads it with
sql.js-httpvfs over HTTP range requests, so a search reads a few pages, never the whole file; the Library's own
~22,000 openable works still load as compressed JSON (GitHub Pages compresses JSON, not SQLite), for instant filters.

- One spelling per composer (composerMatch.ts, composer-aliases.ts): IMSLP's where exactly one IMSLP composer fits a
  name (initials, accents, transliterations, middle names), the Library's own where it names the composer itself.
- The same work across sources (siblings.json): the same composer and catalogue number (and a Beethoven or Mozart
  sonata's number standing for its opus or K); a row shows "Also at: IMSLP ↗ · Mutopia ↗ …". 1,560 works linked.

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
