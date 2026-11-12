/**
 * Reference solutions for the Learn track (Track 0 lessons and the scale problems): each must pass its problem's
 * rules when run by the real engine. summaries.json holds what prelude.py `_run` returns for each solution and for
 * each starter with its blanks emptied; regenerate it after changing a starter or a solution:
 *   node tests/learn/codes.ts | <venv>/bin/python tests/learn/summaries.py > tests/learn/summaries.json
 */
export const SOLUTIONS: Record<string, string> = {
  "syntax-note": `score = tiny("G4 A B c d e f g a b c' d'")\n`,
  "syntax-rhythm-values": `score = tiny("c4 c g g a a g2 f4 f e e d d c2")\n`,
  "syntax-rhythm-dots": `score = tiny("e4 e f g g f e d c c d e e4. d8 d2")\n`,
  "syntax-rhythm-bars": `score = tiny("c4 e g c' b2. a4~ a4 g4 f e d2 c2")\n`,
  "syntax-rhythm-time": `score = tiny("c2 e4 g2 g4 a2 g4 f2.", time="3/4")\n`,
  "syntax-accidentals": `score = tiny("d4 e f# g a b c'# d'")\n`,
  "syntax-part": `score = tiny("d4 g a b2 a4 g2.", name="Violin", inst="violin", key_sig="G", time="3/4")\n`,
  "syntax-score": `flute = tiny("e'2 d' c'1", name="Flute", inst="flute")
cello = tiny("C2 GG C1", name="Cello", inst="cello")
score = together(flute, cello, bpm=72)
`,
  "syntax-transpose": `violin = tiny("c4 d e f g1", name="Violin", inst="violin")
flute = violin.transpose("P5")
flute.partName = "Flute"
score = together(flute, violin)
`,
  "hello-scale": `score = tiny("c4 d e f g a b c'", inst="flute")\n`,
  "scale-two-octaves": `score = tiny("c4 d e f g a b c' d' e' f' g' a' b' c'' b' a' g' f' e' d' c' b a g f e d c", inst="piano")\n`,
  "scale-g-violin": `score = tiny("G4 A B c d e f# g a b c' d' e' f'# g' f'# e' d' c' b a g f# e d c B A G", name="Violin", inst="violin", key_sig="G")\n`,
  "scale-d-two-octaves": `score = tiny("d4 e f# g a b c'# d' e' f'# g' a' b' c''# d'' c''# b' a' g' f'# e' d' c'# b a g f# e d", name="Flute", inst="flute", key_sig="D")\n`,
  "scale-c-three-octaves": `score = tiny("C4 D E F G A B c d e f g a b c' d' e' f' g' a' b' c'' b' a' g' f' e' d' c' b a g f e d c B A G F E D C", inst="piano")\n`,
  "scale-a-harmonic-minor": `score = tiny("A4 B c d e f g# a b c' d' e' f' g'# a' g'# f' e' d' c' b a g# f e d c B A", inst="piano")\n`,
  "scale-a-melodic-minor": `score = tiny("A4 B c d e f# g# a b c' d' e' f'# g'# a' g' f' e' d' c' b a g f e d c B A", inst="piano")\n`,
  "tech-bowing": `violin = tiny("d4 e f# g a2 a2", name="Violin", inst="violin")
bowings(violin, "d u d u d u")
score = violin
`,
  "tech-slurs": `violin = tiny("g4 a b c' d' c' b a g1", name="Violin", inst="violin")
slur(violin, 1, 2)
slur(violin, 3, 4)
slur(violin, 5, 6)
slur(violin, 7, 8)
bowings(violin, "d - u - d - u - d")
score = violin
`,
  "tech-strokes": `violin = tiny("g4 a b c' d' c' b2", name="Violin", inst="violin")
staccato(violin, "1-4")
pizz(violin, 2)
score = violin
`,
  "tech-violin-fingers": `violin = tiny("a4 b c'# d' e' f'# g'# a'", name="Violin", inst="violin")
fingering(violin, "0 1 2 3 0 1 2 3")
score = violin
`,
  "tech-pedal": `piano = tiny("C4 G c e FF C F A GG D G B C G c e", name="Piano", inst="piano")
pedal(piano, "1 2 3 4")
score = piano
`,
  "tech-piano-fingers": `right = tiny("c4 d e f g a b c'", name="Piano", inst="piano")
fingering(right, "1 2 3 1 2 3 4 5")
score = right
`,
  "tech-winds": `flute = tiny("g'4 a' b' g' a'2 d'2 g'4 a' b' c'' b'2 g'2", name="Flute", inst="flute")
breath(flute, 6)
score = flute
`,
  "tech-lyrics": `voice = tiny("c4 c g g a a g2", name="Voice", inst="voice")
lyrics(voice, "Twin-kle twin-kle lit-tle star")
score = voice
`,
  "bow-ode": `violin = tiny("e4 e f g g f e d c c d e e4. d8 d2 e4 e f g g f e d c c d e d4. c8 c2", name="Violin", inst="violin")
bowings(violin, "d u d u d u d u d u d u d - u d u d u d u d u d u d u d - u")
slur(violin, 13, 14)
slur(violin, 28, 29)
score = violin
`,
  "pedal-progression": `piano = tiny("C4 G c e AA E A c FF C F A GG D G B C G c2", name="Piano", inst="piano")
pedal(piano, "1 2 3 4 5")
score = piano
`,
  "flute-breathing": `flute = tiny("b4 b c' d' d' c' b a g g a b b4. a8 a2 b4 b c' d' d' c' b a g g a b a4. g8 g2 a4 a b g a b8 c' b4 g a b8 c' b4 a g a d2 b4 b c' d' d' c' b a g g a b a4. g8 g2", name="Flute", inst="flute")
breath(flute, "15 30 47")
score = flute
`,
  "finger-piano-scale": `right = tiny("c4 d e f g a b c' d' e' f' g' a' b' c''2", name="Piano", inst="piano")
fingering(right, "1 2 3 1 2 3 4 1 2 3 1 2 3 4 5")
score = right
`,
  "finger-violin-scale": `violin = tiny("G4 A B c d e f# g a b c' d' e' f'# g'2", name="Violin", inst="violin")
fingering(violin, "0 1 2 3 4 1 2 3 4 1 2 3 4 1 2")
score = violin
`,
};

/** wrong answers a student might write: each must fail (id → [code, the rule ids that must fail]) */
export const WRONG: Record<string, [string, string[]][]> = {
  "syntax-note": [[`score = tiny("G4 A B C d e f g a b c'' d'")\n`, ["pitches", "lowest", "highest"]]],
  "syntax-rhythm-values": [[`score = tiny("c4 c g g a a g2 f f e e d d c2")\n`, ["rhythm"]]],
  "syntax-rhythm-bars": [[`score = tiny("c4 e g c' b2. a4 a4 g4 f e d2 c2")\n`, ["pitches", "rhythm"]]],
  "syntax-accidentals": [[`score = tiny("d4 e f# g a b c#' d'")\n`, ["pitches", "steps"]]],
  "scale-two-octaves": [
    // the top note played twice
    [`score = tiny("c4 d e f g a b c' d' e' f' g' a' b' c'' c'' b' a' g' f' e' d' c' b a g f e d c")\n`, ["count", "steps"]],
  ],
  "scale-a-melodic-minor": [
    // melodic minor's raised notes on the way down too
    [`score = tiny("A4 B c d e f# g# a b c' d' e' f'# g'# a' g'# f'# e' d' c' b a g# f# e d c B A")\n`, ["steps"]],
  ],
  "tech-pedal": [[`piano = tiny("C4 G c e FF C F A GG D G B C G c e", name="Piano", inst="piano")
pedal(piano, "1-2 3-4")
score = piano
`, ["pedalChangesWithHarmony"]]],
  "bow-ode": [
    // the slurred pair bowed separately: the second phrase starts up-bow
    [`violin = tiny("e4 e f g g f e d c c d e e4. d8 d2 e4 e f g g f e d c c d e d4. c8 c2", name="Violin", inst="violin")
bowings(violin, "d u d u d u d u d u d u d u d u d u d u d u d u d u d u d u")
score = violin
`, ["phraseStartsDown", "slurOneBow"]],
  ],
  "flute-breathing": [
    // a breath in the middle of a phrase
    [`flute = tiny("b4 b c' d' d' c' b a g g a b b4. a8 a2 b4 b c' d' d' c' b a g g a b a4. g8 g2 a4 a b g a b8 c' b4 g a b8 c' b4 a g a d2 b4 b c' d' d' c' b a g g a b a4. g8 g2", name="Flute", inst="flute")
breath(flute, "8 15 30 47")
score = flute
`, ["breathAtPhraseEnds"]],
  ],
  "finger-piano-scale": [[`right = tiny("c4 d e f g a b c' d' e' f' g' a' b' c''2", name="Piano", inst="piano")
fingering(right, "1 2 3 4 1 2 3 4 1 2 3 4 1 2 3")
score = right
`, ["thumbUnder"]]],
  "scale-g-violin": [[`score = tiny("g4 a b c' d' e' f'# g' a' b' c'' d'' e'' f''# g'' f''# e'' d'' c'' b' a' g' f'# e' d' c' b a g")\n`, ["starts", "highest", "ends"]]],
};

/** every markings.py helper at least once (what each one writes, and that Verovio engraves it: tests/learn.test.ts) */
export const MARKING_DEMOS: string[] = [
  `v = tiny("g4 a b c' d' e' f'# g'", name="Violin", inst="violin")
spiccato(v, "1-2")
tenuto(v, 3)
accent(v, [4])
harmonic(v, 8)
trill(v, 7)
text(v, 5, "II pos.")
pizz(v, 1)
arco(v, 2)
score = v
`,
  `p = tiny("c1 f1 g1 c1", name="Piano", inst="piano")
score = together(p)
edit_bar(score, 0, 1, "<c e g>1")
arpeggio(score.parts[0], 1)
una_corda(score.parts[0], "1-2")
pedal(score.parts[0], "1:3-2 3-4:3")
`,
  `voice = tiny("c4 d e2 g4 e c2", name="Voice", inst="voice")
lyrics(voice, "Ah _ vous di-rai-je")
breath(voice, 3)
score = voice
`,
];
