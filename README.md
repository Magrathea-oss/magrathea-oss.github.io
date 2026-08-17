# Magrathea OSS presentation site

Static landing page for the Magrathea OSS software constellation, published at
[magrathea-oss.github.io](https://magrathea-oss.github.io/).

The first product worlds are:

- **Magrathea Git** — self-hosted Git collaboration and repository governance;
- **Magrathea PKI** — BDD-first PKI and key-management boundaries;
- **Magrathea ObjectStore** — AWS S3-compatible reactive object storage.

## Visual lineage

The site uses an original presentation composition while deliberately carrying
forward the visual language established by the Magrathea Git forge shell:

- a full-viewport planetary atelier artwork before the original constellation hero;
- night teal, mint, amber, and cool-canvas design tokens;
- orbital/cartographic motifs;
- the byte-identical original `magrathea-orbit.svg` artwork;
- explicit status labels and restrained product claims.

The planetary artwork was generated locally in ComfyUI with Flux.2 Klein, without
reference images. Separate desktop and portrait compositions keep the world legible
without downloading a desktop crop on mobile. AVIF and WebP delivery renditions stay
below 65 KB; JPEG provides the fallback. The lossless ComfyUI outputs, exact API
workflows, model hashes, prompts, seeds, and derivative hashes are retained in:

- [`assets/img/magrathea-world.provenance.json`](assets/img/magrathea-world.provenance.json);
- [`assets/img/magrathea-world.comfyui.json`](assets/img/magrathea-world.comfyui.json);
- [`assets/img/source/`](assets/img/source/).

Orbit-mark provenance remains recorded in
[`assets/img/magrathea-orbit.provenance.json`](assets/img/magrathea-orbit.provenance.json).
No remote font, analytics, advertising, or runtime framework is used.

## Local preview

```bash
python3 -m http.server 4173
# open http://127.0.0.1:4173/
```

The document remains useful without JavaScript. JavaScript progressively adds
the compact mobile menu, section awareness, reveal transitions, and linked
product/orbit highlighting.

## Validation

```bash
npm ci
npx playwright install chromium
npm run validate
```

The validation contract checks semantic structure, truthful product tokens,
artwork provenance and hashes, responsive rendition selection, preservation and
ordering of the original hero and sections, keyboard and mobile navigation,
reduced-motion behavior, JavaScript-free rendering, console/network failures,
responsive overflow, and the dedicated 404 page. Browser screenshots are written
to `test-results/`.

## Deployment

`.github/workflows/validate.yml` validates pull requests and deploys the exact
static files through GitHub Pages on pushes to `main`. The site has no build-time
content generation and includes `.nojekyll` so asset paths remain byte-stable.

## Status boundary

The individual project repositories and their executable requirement catalogues
are authoritative. This presentation does not upgrade an engineering preview,
partial requirement, or bounded validation result into a production-readiness,
certification, security-assurance, or compliance claim.
