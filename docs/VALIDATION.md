# Validation record

Prepared and locally validated on 2026-10-04. These results describe the clean preparation copy, not a public release or external adoption.

## Automated

- `npm run check`: **76 tests passed, 0 failed, 0 skipped**, using Node 24.13.0 on Windows. Current extension/backend syntax and manifest checks passed. The offline build and distribution validator passed, including exact source-byte consistency and an unchanged permission allowlist.
- Tests cover current frontend settings/search/profiles, enable/disable, consent boundaries, privacy export, build repeatability and optional backend validation, atomic revision conflicts, account deletion and retention.
- D1 SQL checks execute the actual repository statements against in-memory Node SQLite through a D1-shaped adapter. They cover concurrent revision writers, cascading deletion, delayed writers and scheduled cleanup. This is not a deployed Cloudflare integration test. Node prints an experimental SQLite warning; tests still pass.
- Local transport checks use a disposable loopback server and verify empty 204 preflight, streamed request size enforcement and independent retention scheduling.
- Remote GitHub CI: not run; repository/release pending.

## Browser

- Chrome for Testing **151.0.7922.34**, controlled using Node 24.19.0 and Playwright in fresh disposable profiles. YouTube requests were intercepted and served a synthetic HTML fixture; no user profile or live viewing data was used.
- **8 flows passed using the exact shipping distribution**: unpacked MV3/shared core load; custom topic and favorite; native search URL and recent profile; JSON export/import; immediate enable/disable; consent requirement and withdrawal; privacy export excluding credentials; confirmed local data reset. No observed page errors.
- **4 optional-sync flows passed** against a real loopback HTTP backend with a disposable repository: account creation; favorite upload/download with revision; privacy export excluding the generated test key; deletion after consent withdrawal while retaining local favorites. No observed page errors.
- The positive sync fixture pregrants the localhost host permission in a **test-only manifest copy**. The shipping manifest is unchanged. The real optional-host-permission approval dialog is **not verified** by this fixture.

Synthetic tests are not evidence of external adoption. Minimum Chrome 120, live YouTube layouts, a user's actual upgrade path, native optional-permission approval and deployed Workers/D1 remain unverified environments. Remote GitHub CI has not run. See ACCEPTANCE.md for manual checks before claiming those environments work.
