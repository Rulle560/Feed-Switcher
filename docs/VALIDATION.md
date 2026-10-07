# Validation record

Initial preparation was validated on 2026-10-04. The follow-up below was performed on 2026-10-05. These results describe specific test environments and are not external adoption evidence.

## Automated

- `npm run check`: **76 tests passed, 0 failed, 0 skipped**, using Node 24.13.0 on Windows. Current extension/backend syntax and manifest checks passed. The offline build and distribution validator passed, including exact source-byte consistency and an unchanged permission allowlist.
- Tests cover current frontend settings/search/profiles, enable/disable, consent boundaries, privacy export, build repeatability and optional backend validation, atomic revision conflicts, account deletion and retention.
- D1 SQL checks execute the actual repository statements against in-memory Node SQLite through a D1-shaped adapter. They cover concurrent revision writers, cascading deletion, delayed writers and scheduled cleanup. This is not a deployed Cloudflare integration test. Node prints an experimental SQLite warning; tests still pass.
- Local transport checks use a disposable loopback server and verify empty 204 preflight, streamed request size enforcement and independent retention scheduling.
- Remote GitHub CI passed on 2026-10-04 for source commit `dbfc1be59f6697f97bf13f1ddcba0bf1dc1de7cc`: the Node 24 `npm run check` jobs completed successfully on both `windows-latest` and `ubuntu-latest`. [Recorded run](https://github.com/Rulle560/Feed-Switcher/actions/runs/37197476322). This evidence is tied to that commit; consult Actions for newer commits.

## Browser

- Chrome for Testing **151.0.7922.34**, controlled using Node 24.19.0 and Playwright in fresh disposable profiles. YouTube requests were intercepted and served a synthetic HTML fixture; no user profile or live viewing data was used.
- **8 flows passed using the exact shipping distribution**: unpacked MV3/shared core load; custom topic and favorite; native search URL and recent profile; JSON export/import; immediate enable/disable; consent requirement and withdrawal; privacy export excluding credentials; confirmed local data reset. No observed page errors.
- **4 optional-sync flows passed** against a real loopback HTTP backend with a disposable repository: account creation; favorite upload/download with revision; privacy export excluding the generated test key; deletion after consent withdrawal while retaining local favorites. No observed page errors.
- The positive sync fixture pregrants the localhost host permission in a **test-only manifest copy**. The shipping manifest is unchanged. The real optional-host-permission approval dialog is **not verified** by this fixture.

## Browser follow-up — 2026-10-05

- Windows, Chrome for Testing **151.0.7922.34**, fresh disposable profiles. The current shipping 0.6.3 distribution was used without permission changes. No personal browser profile, history, credentials or user database was read.
- **5 live YouTube checks passed** without request interception or a signed-in account: launcher on the public homepage (HTTP 200); custom topic and favorite; native search with the selected topic and recent configuration; disposable JSON export/import; popup enable/disable immediately updating the live page. No extension-attributed page error was observed. This covers the public layout served in that session, not every layout, locale, signed-in state or browser version.
- **4 isolated upgrade checks passed** from the archived `legacy/fs006/Chrome_Loadable` manifest **0.6.0** to shipping **0.6.3**. The old UI created a favorite/recent configuration with non-default language, region, time range and sort, then disabled the extension. After replacing runtime files at the same temporary absolute path and restarting the same disposable profile, the extension identity stayed unchanged, both complete settings/profile objects were preserved, and old favorites/recent configurations remained usable with the expected search URL and no duplicate records.
- The upgrade uses synthetic settings only. It does not verify the maintainer's actual FS-006 sub-version, a real user's data, a Chrome update-button interaction, a changed installation path, an uninstall/reinstall path, or sync-account/consent migration. An initial harness run used the incorrect field name `recents`; that harness assertion was corrected to the real `recent` schema before the passing run. No product change was required.

## Chrome 120 follow-up — 2026-10-06

- Official Chrome for Testing **120.0.6099.109**, Windows x64, new headless mode, fresh disposable profile. The binary was selected from Google's known-good-version catalog and used only in the local test directory. The exact shipping 0.6.3 manifest and runtime files were unchanged.
- **8 synthetic-page flows passed**: MV3/shared-core load; custom topic and favorite; native search URL and recent configuration; JSON export/import; immediate enable/disable; consent requirement and withdrawal; privacy export excluding credentials; confirmed reset of disposable local data. No page error was observed. This verifies those core flows on this specific Chrome 120 build, not every Chrome 120 patch or live YouTube layout.
- A separate fresh headless Chromium **151.0.7922.34** check used the unchanged optional-permission manifest, with no pregrant. Localhost permission was absent initially. After checking consent and clicking account creation, the permission request remained pending for the observation period; permission remained absent and an instrumented loopback HTTP server received **0 requests**. This is neither an observed native dialog nor human denial/approval evidence. The native permission flow remains a manual check.
- On 2026-10-06, the actual Node 24 checks for documentation commit `857c43af53d0d7b27d513533c6ee44bab6ba2f03` were verified as successful on both Windows and Ubuntu. [Recorded run](https://github.com/Rulle560/Feed-Switcher/actions/runs/37254272993). These were the existing completed Actions jobs; they were not manually rerun.

## 0.6.4 permission-error patch — 2026-10-07

- Chrome's [permissions API reference](https://developer.chrome.com/docs/extensions/reference/api/permissions) documents that permission-request problems reject the Promise. Isolated tests against the former 0.6.3 UI reproduced four escaping rejections: `contains` and `request` failures in both popup actions and privacy-center deletion. Two simulated-denial cases already stopped safely. This is a synthetic API-failure reproduction, not a failure reported by a real user or a native-dialog test.
- 0.6.4 catches those API failures, displays a retryable error and returns before any backend command. Permission scope and consent policy are unchanged. Six regression cases check errors, exact localhost permission arguments, call order/count, no new backend message/request, unchanged local state, and retry availability.
- Windows, Node **24.13.0**: `npm run check` passed **82 tests, 0 failures, 0 skipped**, including syntax, unchanged permission allowlist, build and exact source-byte consistency. The test count includes the six new cases; previous counts above remain historical.
- Shipping **0.6.4** on disposable Chrome for Testing **120.0.6099.109** passed the same **8 synthetic-page core flows** listed above. Disposable Chromium **151.0.7922.34** passed **4 optional-sync flows** against a real temporary loopback backend, with localhost permission pregranted in a test-only manifest copy. No page errors were observed. The shipping manifest was not pregranted or expanded.
- Live YouTube and same-directory upgrade results above belong to **0.6.3**; they are not silently relabeled as 0.6.4 results. Remote CI for this patch must be checked against the actual new commit in Actions; these local results alone do not establish remote success.

Native optional-host-permission approval/denial, actual-user upgrade and deployed Workers/D1 remain unverified environments. Remote CI success does not verify those browser or production environments. See ACCEPTANCE.md for remaining manual checks. Neither synthetic nor live acceptance tests count as independent users or adoption.
