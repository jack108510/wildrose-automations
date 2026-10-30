# Client widget release checks

Before publishing a widget change:
1. Trace the installed script and published appearance. Explicitly compare the client site brand, embed parameters, and API values. An explicit embed accent takes precedence when the published primary is still the default orange.
2. Run `node --check wildrose-widget-sandbox.js` and `node tests/kmc-widget-mobile.mjs` with Playwright installed. `PLAYWRIGHT_MODULE` may point to a separately installed Playwright module.
3. Inspect saved Voice and Chat screenshots at 360x640, 390x760, 640x390 and desktop. CI uploads these screenshots. Tests do not judge design quality: manual visual review is mandatory before publication. Check the Rose orb and layout, client brand fit, touch targets, clipping and browser-safe viewport bounds.
4. Run `node scripts/check-kmc-site.mjs` to preview the exact candidate on the live KMC page through request interception; it does not change the website. Inspect both phone and desktop screenshots in /tmp.
5. Publish only reviewed files from a clean worktree. Do not bundle unrelated local edits. Confirm the remote asset and repeat `node scripts/check-kmc-site.mjs --live` without request interception. Screenshot the actual result; distinguish cached old versions from deployment failure.
6. Verify Voice/Chat navigation, close and reopen. This is not a real microphone/audio or lead-delivery test. Test those separately when changing their implementation.

The GitHub workflow provides regression detection and screenshot artifacts. It is not a protected deployment gate: direct GitHub Pages pushes can still publish before CI completes. Use a reviewed PR and required status checks to enforce a hard gate if branch protection is configured later.

Floating widgets use the shared Rose layout. KMC supplies its logo and green accent through the embed; the published default orange no longer overrides that accent. Custom published colors still take precedence. KMC's hero CTA visibility adjustment is tied to its public business ID.
