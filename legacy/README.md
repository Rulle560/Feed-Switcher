# Historical snapshots

This directory preserves the old FS-004.1 TypeScript source/tests/public assets and
the old FS-006 v0.6.0 Chrome_Loadable snapshot for provenance and comparison.
They are excluded from the current build and test suite. Historical tests are not
claimed as coverage of the latest extension.

The only current extension source is `src/extension`; load the generated `dist`
directory after `npm run build`. Do not load a historical snapshot as the current release.
