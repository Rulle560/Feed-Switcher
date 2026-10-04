# Feed Switcher FS-006 Data Flow

## Local-only core

YouTube page -> content script -> user-selected Topic/Language/Region/Time/Priority -> YouTube native search URL.

Stored in `chrome.storage.local`:
- Feed Switcher enable state
- current discovery configuration
- favorites
- recent channel configurations
- cached remote Gate configuration
- privacy consent record
- optional cloud account connection metadata and sync key

The extension does not collect or sync YouTube viewing history, YouTube search history, Chrome browsing history or cookies.

## Optional cloud sync

User gesture + current privacy consent -> optional backend host permission -> Backend Lite.

Uploaded payload:
- discovery configuration (forced inactive in transfer)
- favorites
- recent channel configurations

Not uploaded:
- device enable state
- local Gate approval
- local Feature Flags
- browser history
- YouTube history
- cookies

Authentication:
- client stores `fs1.<account>.<secret>` locally;
- server receives it as bearer authentication for an explicit request;
- server stores only SHA-256(secret), never the raw secret.

Operational events:
- allowlisted event type
- 16-char hash-derived account identifier
- status
- client version
- timestamp

No URL, topic, query string, sync key or viewing history is logged.
