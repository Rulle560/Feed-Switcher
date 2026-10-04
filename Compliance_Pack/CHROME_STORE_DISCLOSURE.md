# Chrome Web Store disclosure preparation reference — v0.6.3

This is preparation material for a future Chrome Web Store or hosted-service submission, not a completed submission, platform approval or deployed privacy policy. The current MIT beta is local-first, provides optional same-device sync and a separately deployable self-hosting adapter, and supplies no hosted sync service. Before any store submission, check the current form and the actual shipping manifest/runtime; this reference does not override README.md or docs/VALIDATION.md.

## Single purpose

**Deliberate YouTube topic discovery with saved search configurations.** Feed Switcher lets users choose topics, language, region and time preferences, then save, favorite, switch and export their configurations. It creates native YouTube search URLs; it does not control recommendations or guarantee rankings. AI creator analysis, video scoring and paid features are not implemented. Optional same-device sync requires explicit consent and a separately started local backend; cross-device self-hosting needs its own deployment, permission and operational validation.

## Permissions justification

### `storage`
Required to persist Feed Switcher settings, favorites, recent channel configurations, privacy-consent record, cached Gate configuration and optional pseudonymous sync-account connection metadata.

### `https://www.youtube.com/*`
Required only to inject the Feed Switcher interface on YouTube and implement user-triggered Topic Discovery/search orchestration. The extension does not use this permission to collect or transmit YouTube viewing history, search history, cookies or page video content to Backend Lite.

### Optional backend origin
The current shipping manifest declares only `http://127.0.0.1:8787/*` as an optional host for same-device developer sync. It must be requested only after an explicit user action and consent. Publishing this local-first beta does not require providing a hosted backend. A future hosted or cross-device deployment needs an owned HTTPS origin, a separately reviewed permission change and its own operational validation; none is provisioned by this package.

## Data categories — conservative disclosure

Disclose handling where the form asks about collection/transmission, even if the value is pseudonymous or transient.

- Name, email or other direct identity fields: **not requested** by the current sync flow. Pseudonymous account metadata and authentication information are handled as described below; reassess the store's data categories before a submission.
- Health information: **No**.
- Financial/payment information: **No**.
- Personal communications: **No**.
- Precise location: **No**.
- Web browsing history: **No**.
- Website content: **No server collection**. The YouTube content script has page access to render the UI, but FS-006 does not transmit page/video content.
- User activity / product interaction: **Yes, limited** — user-selected discovery configuration, favorites and recent Feed Switcher configurations may be sent to the separately operated backend when the user opts in. No hosted backend is provided by this beta.
- Authentication information: **Yes, limited** — the pseudonymous sync key authenticates the user to Feed Switcher Backend Lite. The raw secret is stored locally and transmitted for authenticated sync requests; the server stores only its SHA-256 hash.

## Uses

Allowed uses are limited to:
- provide Feed Switcher functionality;
- synchronize the user’s selected channel configuration;
- secure/authenticate the sync account;
- operate and troubleshoot the service using minimal event metadata.

No personalized advertising, retargeting, sale of user data or unrelated secondary use.

## Limited Use statement

Feed Switcher’s use and transfer of user data is limited to providing or improving its single user-facing purpose. User data is not sold and is not used for personalized, retargeted or interest-based advertising. Human access to synced user data is prohibited except when the user explicitly requests support for specific data, when necessary for security/abuse investigation, when required by law, or after aggregation/anonymization for internal operations.

## Deletion and public feedback boundaries

Deleting a sync account deletes that account and its current sync snapshot. It does not clear local favorites or establish deletion of every operator-managed backup. Any self-hosted operator must separately disclose and verify backup and log retention. The current package does not provide a hosted service or an audited production deletion policy.

After the public project is created, feedback can be filed at https://github.com/Rulle560/Feed-Switcher/issues. Do not publish sync keys, personal exports, databases or browsing data. No operator identity, jurisdiction, support email or guaranteed response time is invented here.
