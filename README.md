# sonn — the website

The product site for [sonn](https://github.com/sonn-audio/core), served by GitHub Pages at
**https://sonn-audio.github.io/**.

Static and self-contained on purpose: two self-hosted fonts, inline SVG, one stylesheet, one
script — no build step, no dependency, no request that leaves the host. Open `index.html` in a
browser and you are running the site.

```
index.html            the page, and all of its behaviour (one <script> at the bottom)
assets/site.css       the identity: tokens, layout, scrollytelling, microinteractions
assets/fonts/         Hanken Grotesk + JetBrains Mono (variable, woff2)
assets/sonn-mark.svg  favicon — the roofline over the level meter
assets/og.png         social card, rendered from the hero itself
```

The visual identity is the one the server draws on its own front door (`public/index.html` in
`core`): near-black ground, one green accent, one hairline as the structural device, Hanken
Grotesk for what things are and engraved mono caps for what they are called.

Deploys are automatic: push to `main` and GitHub Pages publishes the repository root.

> The Spotify OAuth callback and the Cast receiver pages are **not** here. They live in
> `core/docs` and stay there: their URLs are registered with Spotify and in the Google Cast
> console, and the redirect URI is compiled into the server.
