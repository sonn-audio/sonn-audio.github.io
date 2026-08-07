/**
 * The docs build. Same philosophy as build.mjs: one command, node built-ins only.
 *
 *   node build-docs.mjs
 *
 * Every page is an HTML fragment in docs-src/<slug>.html — pure content, no boilerplate.
 * This script wraps each fragment in docs-src/template.html, renders the sidebar from
 * docs-src/nav.json (the current page lit), and writes docs/<slug>/index.html — except
 * `index`, which becomes docs/index.html so /docs/ is the home.
 *
 * The fragment's first <h1> feeds the <title>; a leading
 * <!-- description: ... --> comment feeds the meta description. Do not edit anything
 * under docs/ by hand — it is generated, like de/.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

import { existsSync } from 'node:fs';

const template = readFileSync('docs-src/template.html', 'utf8');
const { sections } = JSON.parse(readFileSync('docs-src/nav.json', 'utf8'));

// The API reference is generated from core's INTEGRATING.md by build-api.mjs;
// when it exists, it slides in as a section before "help".
if (existsSync('docs-src/gen/nav.json')) {
  const gen = JSON.parse(readFileSync('docs-src/gen/nav.json', 'utf8'));
  const helpAt = sections.findIndex((s) => s.title === 'help');
  sections.splice(helpAt === -1 ? sections.length : helpAt, 0, gen);
}

const pages = sections.flatMap((s) => s.items);

const navFor = (active) =>
  sections
    .map((s) => {
      const items = s.items
        .map((it) => {
          const href = it.slug === 'index' ? '/docs/' : `/docs/${it.slug}/`;
          const on = it.slug === active ? ' class="on" aria-current="page"' : '';
          return `          <li><a${on} href="${href}">${it.title}</a></li>`;
        })
        .join('\n');
      return `        <p class="docs-nav-k mono">${s.title}</p>\n        <ul>\n${items}\n        </ul>`;
    })
    .join('\n');

let built = 0;
for (const { slug } of pages) {
  const path = existsSync(`docs-src/${slug}.html`) ? `docs-src/${slug}.html` : `docs-src/gen/${slug}.html`;
  const fragment = readFileSync(path, 'utf8');
  const title = /<h1[^>]*>(.*?)<\/h1>/s.exec(fragment)?.[1].replace(/<[^>]+>/g, '') ?? slug;
  const description = /<!--\s*description:\s*(.*?)\s*-->/s.exec(fragment)?.[1] ?? 'sonn documentation';
  const html = template
    .replaceAll('{{title}}', title)
    .replaceAll('{{description}}', description)
    .replaceAll('{{slug}}', slug)
    .replace('{{nav}}', navFor(slug))
    .replace('{{content}}', fragment.trim());
  const dir = slug === 'index' ? 'docs' : `docs/${slug}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
  built++;
}

// The sitemap: both landing editions and every docs page that was just built.
const BASE = 'https://sonn-audio.github.io';
const urls = ['/', '/de/', ...pages.map((p) => (p.slug === 'index' ? '/docs/' : `/docs/${p.slug}/`))];
writeFileSync(
  'sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join('\n') +
    '\n</urlset>\n',
);

console.log(`docs built: ${built} pages. sitemap: ${urls.length} urls.`);
