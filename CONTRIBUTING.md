# Contributing

Start with a reproducible user problem. Describe your Chrome and operating-system version, extension version, expected result, actual result, and minimal steps. Use synthetic topic/configuration examples; do not attach sync keys, browser history, account data or databases.

Run `npm run check` before proposing a change. Add a focused regression test when changing search generation, local data handling, consent, sync or backend concurrency. Record manual browser checks when the behavior cannot be established by the automated suite.

Keep the local discovery core usable without a server. New host permissions, uploaded fields, dependencies and data retention require a clear explanation and a privacy-document update. Feature proposals are discussed before large implementation work.

Changes are reviewed by the maintainer. A release note should connect a fix to its actual behavior and evidence; synthetic test cases must not be described as real user adoption.
