/**
 * The API reference build. One source of truth: core's INTEGRATING.md, which lives next
 * to the code it describes. This script fetches it (or reads a local checkout), converts
 * the markdown, splits it into one page per `##` chapter, and writes the results as
 * generated fragments for build-docs.mjs to assemble like any other page.
 *
 *   node build-api.mjs          # fetches from github (curl, so proxies work)
 *   SONN_CORE=../core node build-api.mjs   # reads a local checkout instead
 *
 * Outputs:
 *   docs-src/gen/ref-<slug>.html   one fragment per chapter — GENERATED, do not edit
 *   docs-src/gen/nav.json          the "api reference" sidebar section
 *
 * The markdown converter below handles exactly what INTEGRATING.md uses — headings,
 * fenced code, blockquotes, lists, tables, links, bold/em/inline code — and nothing
 * speculative. If the file grows syntax this misses, the build output shows it plainly.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SOURCE_URL = 'https://raw.githubusercontent.com/sonn-audio/core/main/INTEGRATING.md';

let md;
if (process.env.SONN_CORE) {
  md = readFileSync(`${process.env.SONN_CORE}/INTEGRATING.md`, 'utf8');
} else {
  md = execSync(`curl -sfL ${SOURCE_URL}`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

/* --- markdown → html -------------------------------------------------------- */

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => {
      // links naar het eigen document worden anchors; die lossen we per pagina niet op —
      // laat ze naar de reference-index wijzen zodat niets dood is.
      const href = url.startsWith('#') ? '/docs/reference/' : url;
      const rel = href.startsWith('http') ? ' rel="noopener"' : '';
      return `<a href="${href}"${rel}>${t}</a>`;
    });

function mdToHtml(src) {
  const lines = src.split('\n');
  const out = [];
  let i = 0;
  const paragraph = [];
  const flushP = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' ').trim())}</p>`);
      paragraph.length = 0;
    }
  };
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flushP();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre>${escapeHtml(buf.join('\n'))}</pre>`);
      continue;
    }

    const h = /^(#{2,6})\s+(.*)$/.exec(line);
    if (h) {
      flushP();
      // een niveau omhoog: het ##-hoofdstuk is de paginatitel, ### wordt h2, enz.
      const level = Math.max(2, h[1].length - 1);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      flushP();
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<div class="note">${inline(buf.join(' ').trim())}</div>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushP();
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (/^\s*[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushP();
      const items = [];
      while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (/^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flushP();
      const cells = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') +
          '</tbody></table>',
      );
      continue;
    }

    if (line.trim() === '' || line.trim() === '---') {
      flushP();
      i++;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }
  flushP();
  return out.join('\n');
}

/* --- split into chapters ----------------------------------------------------- */

const slugify = (t) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// strip de H1-regel; alles vóór de eerste ## is de overview
const body = md.replace(/^#\s+.*\n/, '');
const parts = body.split(/^## (?=\S)/m);
const intro = parts.shift();

const pages = [
  { slug: 'reference', title: 'Overview', body: intro },
  ...parts.map((chunk) => {
    const nl = chunk.indexOf('\n');
    const title = chunk.slice(0, nl).trim();
    return { slug: `ref-${slugify(title)}`, title, body: chunk.slice(nl + 1) };
  }),
];

mkdirSync('docs-src/gen', { recursive: true });
const navItems = [];
for (const { slug, title, body: pageBody } of pages) {
  const html = [
    `<!-- GENERATED from ${SOURCE_URL} — edit INTEGRATING.md in sonn-audio/core, then rerun build-api.mjs. -->`,
    `<!-- description: ${title} — the sonn public API, rendered from core's INTEGRATING.md. -->`,
    '<p class="eyebrow">api reference</p>',
    `<h1>${escapeHtml(title === 'Overview' ? 'Integrating with sonn' : title)}</h1>`,
    mdToHtml(pageBody.trim()),
    `<div class="note">This chapter is rendered from <a href="https://github.com/sonn-audio/core/blob/main/INTEGRATING.md" rel="noopener">INTEGRATING.md</a> in sonn-audio/core — the API's single source of truth, kept next to the code it describes.</div>`,
  ].join('\n');
  writeFileSync(`docs-src/gen/${slug}.html`, html);
  navItems.push({ slug, title: title === 'Overview' ? 'Integrating with sonn' : title });
}

writeFileSync(
  'docs-src/gen/nav.json',
  JSON.stringify({ title: 'api reference', items: navItems }, null, 2) + '\n',
);

console.log(`api reference built: ${pages.length} chapters from INTEGRATING.md.`);
