# Feed Switcher Backend Lite — FS-006

FS-006 keeps the FS-005 pseudonymous sync model and adds privacy/deletion/retention controls.

- Create account -> server returns one recovery/sync key (`fs1.account.secret`).
- Server stores only SHA-256(secret), never the original secret.
- Synced payload contains schema-v1 discovery settings + at most 24 favorites and 8 recent channel presets. Unknown fields and malformed nested values are rejected; discovery `active` is always stored as `false`.
- Browser enabled state, local Gate approvals and local Feature Flags are not synced.
- Cloud-account deletion hard-deletes the account row and sync snapshot.
- Operational logs are allowlisted and contain no URLs, queries, topics, viewing history or sync keys.
- Operational logs have a 30-day retention target. While the local server is running, startup cleanup and an independent hourly timer remove expired events even without API traffic (up to one additional hour of scheduling delay). When the server is stopped, cleanup resumes at its next startup. The local repository also caps logs at 500 events.
- Server config returns JSON data/flags only; never executable JS/WASM.

## Local acceptance server

Windows: double-click `start-backend.bat`.

It starts on `http://127.0.0.1:8787` and stores development data in `.data/dev-db.json`. No npm install is required; use Node 24 or later, matching the project validation environment. Local HTTP is for same-device developer acceptance only. The JSON repository serializes writes and saves by replacing a temporary file; use only one backend process per data file. An unreadable or corrupt data file causes an error and is preserved instead of silently replacing it with an empty database.

Sync writes check the account and expected revision atomically in the repository. Simultaneous uploads from the same revision produce one success and one `409 revision_conflict`; an upload cannot recreate an account/snapshot after deletion. Requests are limited to 256 KiB of actual UTF-8 bytes.

Run `node --test Backend_Lite/tests/*.test.mjs` from the project root using Node 24 or later. Tests use only memory and disposable temporary directories; the D1 SQL integration suite uses built-in SQLite and does not contact Cloudflare.

## Production target

The optional production adapter is `cloudflare/worker.mjs` with D1 (`schema.sql`). Its single-statement conditional UPSERT checks the account and revision; account deletion cascades to the snapshot. `wrangler.toml.example` includes an hourly Cron Trigger and the Worker implements `scheduled` cleanup independent of API traffic. This takes effect only after an operator configures and deploys the binding and trigger; no hosted backend is provided here. With a normally operating hourly trigger, expired logs are physically deleted after 30 days plus up to one hour of scheduling delay. Platform failures, disabled triggers, and any operator-managed backups have separate retention responsibilities; verify those before advertising a deployed policy.

Public production deployment must use an owned HTTPS API hostname and complete abuse/rate limiting and operational security review. Deployment remains deferred until FS-006 is accepted and the public privacy/terms URLs and support contact are finalized.
