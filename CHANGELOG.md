# Changelog

## 0.6.4 — permission error handling, 2026-10-07

- Catch optional-host permission API failures in sync actions and cloud-account deletion, show a retryable error, and stop before any backend action.
- Preserve the existing denied-permission behavior, account/local data and permission scope.
- Add six isolated regression cases covering API rejection and simulated denial in both UI entry points. These are not native permission-dialog acceptance tests.

## 0.6.3 — release preparation, 2026-10-04

- Reconcile the latest 0.6.2 runtime source with a reproducible build and a single shared core.
- Add current-runtime regression coverage and clean release validation.
- Correct optional backend preflight, conditional-write and data-validation boundaries; see validation results for verified behavior.
- Add MIT permission, contributor guidance, attribution and explicit deployment/feature limitations.

This is a preparation entry; a public release date is recorded only when the release actually occurs. Earlier 0.6.2 and 0.6.0 packages existed locally and do not constitute verified public releases.
