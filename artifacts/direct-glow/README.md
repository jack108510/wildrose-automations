# Direct-widget glow evidence

Captured 2026-11-11 with the local `wildrose-widget.js` loaded in isolated Chromium. The bakery page is the live public Harbourlight test site; its installed pilot widget was blocked in the browser and replaced with this local direct-widget candidate. No production file was changed.

- `direct-invoices.png`: synthetic Account → Billing → Invoice history route.
- `direct-bakery-wholesale.png`: content glow on the live bakery page, with the direct widget's existing dark header and cream panel.
- `direct-bakery-hours.png`: hours glow on the same page, without navigation.
- `direct-live-face.png`: direct widget on the fixture, showing the unchanged face.

Before editing, `https://wildroseautomations.ca/wildrose-widget.js` matched repository `gh-pages` HEAD `79d5806` (SHA-256 `8bd4da44b47cbd8c9e68bc16277859832ab3800dc354d4b012928c12e01b19e5`). The separately served `https://wildrose-widget.wildeautomations.com/wildrose-widget.js` did **not** match: SHA-256 `1f15cf28b2673c04614e9e606fdb482aa2de1952dcafdc0492fe91860de44094`, using Retell SDK v2 rather than the repository's v3. Reconcile that production service source before deploying this branch there; merging `gh-pages` alone will not update the separately served API-domain file.

Run tests with `ROSE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test-wildrose-widget-guidance.mjs` and `ROSE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test-wildrose-widget-live.mjs`, or install Playwright locally and omit the environment variable.
