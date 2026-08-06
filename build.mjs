/**
 * The translation build. One command, no dependencies: `node build.mjs`.
 *
 * index.html is the source of truth and stays hand-editable — English needs no build at
 * all. de/index.html is GENERATED from it by applying i18n/de.json, a flat list of
 * [english, german] pairs, plus a handful of structural fixups (lang attribute, asset
 * paths, the language switch, locale metadata).
 *
 * The contract that keeps the two pages from drifting apart:
 *  - every English string in the table MUST still occur in index.html — a pair that no
 *    longer matches fails the build, so a copy edit cannot silently leave the German
 *    page behind;
 *  - matching is whitespace-insensitive (runs of whitespace match any runs), so
 *    reflowing a paragraph does not break its translation;
 *  - pairs are applied longest-first, so a short string can never eat the middle of a
 *    longer one.
 *
 * Do not edit de/index.html by hand — edit i18n/de.json and rebuild.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('index.html', 'utf8');
const { pairs } = JSON.parse(readFileSync('i18n/de.json', 'utf8'));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whitespace-insensitive matcher: the JSON never has to mirror the HTML's line wrapping. */
const patternFor = (en) => new RegExp(escapeRegex(en).replace(/\s+/g, '\\s+'), 'g');

let out = src;
const misses = [];
for (const [en, de] of [...pairs].sort((a, b) => b[0].length - a[0].length)) {
  const re = patternFor(en);
  if (!re.test(out)) {
    misses.push(en);
    continue;
  }
  re.lastIndex = 0;
  out = out.replace(re, () => de);
}

if (misses.length > 0) {
  console.error(`de.json has ${misses.length} pair(s) that no longer match index.html:`);
  for (const m of misses) console.error(`  · ${m.length > 90 ? m.slice(0, 90) + '…' : m}`);
  console.error('Update the English side of those pairs (or drop them), then rebuild.');
  process.exit(1);
}

/* --- structural fixups: everything that is not a sentence ---------------------------- */

out = out
  .replace('<html lang="en">', '<html lang="de">')
  // the German page lives one level down, the shared assets do not
  .replaceAll('"assets/', '"../assets/')
  // the switch: the other language is now the link, this one the lit label
  .replace(
    /<a class="on" href="\/" aria-current="true">en<\/a>\s*<a href="\/de\/" lang="de" hreflang="de">de<\/a>/,
    '<a href="/" lang="en" hreflang="en">en</a>\n          <a class="on" href="/de/" aria-current="true">de</a>',
  )
  // locale metadata
  .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="website" />\n    <meta property="og:locale" content="de_DE" />');

if (out === src) {
  console.error('Nothing was translated — that cannot be right.');
  process.exit(1);
}

mkdirSync('de', { recursive: true });
writeFileSync('de/index.html', out);
console.log(`de/index.html generated: ${pairs.length} translations applied.`);
