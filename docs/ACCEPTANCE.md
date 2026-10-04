# Manual beta acceptance

Use a separate browser profile and disposable examples. Never publish a sync key, personal profile export, browsing data or a backend database in an issue. Automated evidence is recorded in VALIDATION.md; this checklist is not a claim that these steps have already passed.

1. With Node 24+, run `npm run check`, then load the generated `dist` folder through Chrome's unpacked-extension control. Confirm version 0.6.3.
2. On a live YouTube page, verify the launcher, popup enable/disable, custom topic, saved/recent profiles and JSON import/export. Confirm the generated query matches the visible explanation. Language, region and time settings are approximate search hints.
3. Check a normal profile upgraded from an earlier version without clearing existing data. Back up only your own settings locally before the test; never share the backup. Existing sync-account custody must be handled explicitly, not silently reset.
4. For optional same-device sync, start Backend_Lite in a separate disposable copy. Consent must be unchecked by default. Approve the localhost host permission through Chrome's real permission prompt, then create a disposable account. Test upload/download and one stale-revision conflict.
5. Withdraw consent: creation/upload/download must stop immediately. Deleting the disposable cloud account should still be available after confirmation and should preserve local favorites. Verify the deleted account can no longer authenticate.
6. Export the privacy summary: it must omit the complete sync key. Confirm local clear affects only this test profile's Feed Switcher data. Do not clear an existing user's real data for acceptance testing.
7. A hosted HTTPS service and Chrome Web Store publication need separate deployment, operational/privacy verification and release work. No hosted service or store listing is provided by this package.

Record browser/OS, exact version, steps and actual result. Open a reproducible issue with synthetic examples if a check fails; do not turn an unexecuted checklist into a passing record.
