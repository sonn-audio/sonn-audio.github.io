# sonn — the website

The product site for [sonn](https://github.com/sonn-audio/core), served by GitHub Pages at
**https://sonn-audio.github.io/** (English) and **https://sonn-audio.github.io/de/** (German).

Static and self-contained on purpose: two self-hosted fonts, inline SVG, one stylesheet, one
script — no dependency, no request that leaves the host. Open `index.html` in a browser and
you are running the site.

```
index.html            the page, and all of its behaviour — THE source of truth, hand-editable
i18n/de.json          the German edition, as [english, german] pairs
build.mjs             node build.mjs → regenerates de/index.html (node built-ins only)
de/index.html         GENERATED — never edit by hand
docs-src/             the documentation: one HTML fragment per page + nav.json + template
build-docs.mjs        node build-docs.mjs → regenerates docs/ (node built-ins only)
docs/                 GENERATED — never edit by hand
assets/site.css       the identity: tokens, layout, scrollytelling, microinteractions, docs
assets/fonts/         Hanken Grotesk + JetBrains Mono (variable, woff2)
assets/sonn-mark.svg  favicon — the roofline over the level meter
assets/og.png         social card, rendered from the hero itself
```

## Docs

Documentation pages are HTML fragments in `docs-src/` — pure content, no boilerplate. The
sidebar lives in `docs-src/nav.json`, the shell in `docs-src/template.html`, and
`node build-docs.mjs` wraps every fragment into `docs/<slug>/index.html`. Only pages that
exist are in the nav — no dead links. English for now; German follows the same route as the
landing once the chapters settle.

## Editing

English needs no build: edit `index.html` and push. For German, add or update the matching
pair in `i18n/de.json` and run `node build.mjs`. The build **fails** when a pair's English
side no longer occurs in `index.html`, so a copy edit cannot silently strand the German page
— fix the pair, rebuild, commit both.

Matching is whitespace-insensitive, so reflowing a paragraph never breaks its translation.
Product vocabulary (`bit-perfect`, `zones · live`, `bypassed`, `grouped`) is deliberately not
translated: that is what the product UI itself says.

The visual identity is the one the server draws on its own front door (`public/index.html` in
`core`): near-black ground, one green accent, one hairline as the structural device, Hanken
Grotesk for what things are and engraved mono caps for what they are called.

Deploys are automatic: push to `main` and GitHub Pages publishes the repository root.

> The Spotify OAuth callback and the Cast receiver pages are **not** here. They live in
> `core/docs` and stay there: their URLs are registered with Spotify and in the Google Cast
> console, and the redirect URI is compiled into the server.
