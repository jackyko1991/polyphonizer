/**
 * "Urtext" links in the Library: an Amazon UK search for a work's urtext edition (Henle, Bärenreiter, Wiener Urtext …),
 * for the composers those publishers cover. No prices, covers or Amazon scripts: a plain affiliate link, marked
 * sponsored, and the disclosure at the bottom of the Library (as Tensorizer does).
 */
import type { Row } from "./collections.ts";
import { searchTerms } from "./elsewhere.ts";

/** Amazon Associates store ID (Amazon UK). The only place the tag is written. */
export const AMAZON_TAG = "tensorizer-21";

/** rel of every affiliate link (a paid link, per Google and the ASA/CMA guidance; no opener, no referrer) */
export const AFFILIATE_REL = "sponsored noopener noreferrer";

/** composers whose works the urtext publishers print (the Library's spellings) */
const URTEXT = new Set([
  "Johann Sebastian Bach", "George Frideric Handel", "Domenico Scarlatti", "Antonio Vivaldi", "Arcangelo Corelli", "Georg Philipp Telemann",
  "Henry Purcell", "François Couperin", "Jean-Philippe Rameau", "C. P. E. Bach", "Joseph Haydn", "Wolfgang Amadeus Mozart",
  "Ludwig van Beethoven", "Franz Schubert", "Carl Maria von Weber", "Felix Mendelssohn", "Fanny Hensel", "Robert Schumann",
  "Clara Schumann", "Frédéric Chopin", "Franz Liszt", "Johannes Brahms", "Antonín Dvořák", "Edvard Grieg", "Pyotr Ilyich Tchaikovsky",
  "Modest Mussorgsky", "Gabriel Fauré", "Claude Debussy", "Maurice Ravel", "Erik Satie", "Érik Satie", "Alexander Scriabin",
  "Sergei Rachmaninoff", "Sergei Prokofiev", "Mily Balakirev", "Mikhail Glinka", "Scott Joplin", "Hugo Wolf", "Gustav Mahler",
  "Richard Strauss", "Muzio Clementi", "Carl Czerny", "Fernando Sor", "Mauro Giuliani", "Claudio Monteverdi", "Josquin des Prez",
  "Giovanni Pierluigi da Palestrina", "Dietrich Buxtehude", "Johann Pachelbel", "Amy Beach", "Cécile Chaminade",
]);

/** an Amazon UK search for the work's urtext edition, or null where none is published */
export function urtextUrl(r: Row): string | null {
  if (!URTEXT.has(r[4])) return null;
  const q = `${searchTerms({ composer: r[4], title: r[3] })} urtext`;
  return `https://www.amazon.co.uk/s?k=${encodeURIComponent(q).replace(/%20/g, "+")}&i=stripbooks&tag=${AMAZON_TAG}`;
}
