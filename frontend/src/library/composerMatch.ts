/**
 * Composers' names across sources: Mutopia writes "F. Liszt", the corpus "Alexander Borodin", IMSLP "Franz Liszt" and
 * "Aleksandr Borodin". The Library takes IMSLP's spelling where one IMSLP composer, and only one, fits a name: the same
 * surname (accents aside), and each given name the same, its initial, or a usual transliteration of it. Names the
 * sources share already are left alone; a name that fits two composers, or none, is never guessed at.
 */

const fold = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .trim();

/** given names written differently in different alphabets or languages */
const SAME: string[][] = [
  ["alexander", "aleksandr", "alexandre", "alessandro", "alejandro"],
  ["peter", "pyotr", "piotr", "pietro", "pedro"],
  ["sergei", "sergey", "serge"],
  ["nikolai", "nikolay", "nicolai", "nikolaus", "nicolas"],
  ["mikhail", "michail", "michael"],
  ["modest", "modeste"],
  ["anton", "antonin", "antonio", "antoine"],
  ["frederic", "fryderyk", "friedrich", "frederick"],
  ["josef", "joseph", "giuseppe", "jose"],
  ["johann", "johannes", "jan", "john", "jean", "giovanni"],
  ["dmitri", "dmitry", "dmytro"],
  ["alexei", "aleksey", "alexey", "aleksei"],
];
const SAME_AS = new Map(SAME.flatMap((g) => g.map((n) => [n, g] as const)));

function givenFits(a: string, b: string): boolean {
  if (a.length === 1) return b.startsWith(a);
  if (b.length === 1) return a.startsWith(b);
  return a === b || (SAME_AS.get(a)?.includes(b) ?? false);
}

/** each of the shorter list's given names fits one of the longer's, in order ("Amy Beach" in "Amy Marcy Beach") */
function givensFit(mine: string[], theirs: string[]): boolean {
  let j = 0;
  for (const g of mine) {
    while (j < theirs.length && !givenFits(g, theirs[j])) j++;
    if (j === theirs.length) return false;
    j++;
  }
  return true;
}

const parts = (name: string) => {
  const words = fold(name).split(/\s+/).filter(Boolean);
  return { surname: words.at(-1) ?? "", given: words.slice(0, -1) };
};

/** IMSLP's spelling of a composer's name, or null when no single IMSLP composer fits */
export function matchComposer(name: string, imslp: string[] | Map<string, string[]>): string | null {
  const bySurname = imslp instanceof Map ? imslp : indexBySurname(imslp);
  const mine = parts(name);
  if (!mine.given.length) return null;
  const fits = (bySurname.get(mine.surname) ?? []).filter((n) => {
    const theirs = parts(n);
    if (!theirs.given.length || !givenFits(mine.given[0], theirs.given[0])) return false;
    // (either may have a middle name the other leaves out: "Amy Beach", "Peter Ilyich Tchaikovsky")
    return mine.given.length <= theirs.given.length ? givensFit(mine.given, theirs.given) : givensFit(theirs.given, mine.given);
  });
  if (fits.includes(name)) return name;
  // one that accounts for every part of the name ("C. P. E." → Carl Philipp Emanuel, not Christoph) before one that
  // leaves some out
  const whole = fits.filter((n) => parts(n).given.length >= mine.given.length);
  if (whole.length) return whole.length === 1 ? whole[0] : null;
  return fits.length === 1 ? fits[0] : null;
}

/** IMSLP's composers by folded surname (build once, match many) */
export function indexBySurname(names: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const n of names) {
    const s = parts(n).surname;
    if (!s) continue;
    m.set(s, [...(m.get(s) ?? []), n]);
  }
  return m;
}
