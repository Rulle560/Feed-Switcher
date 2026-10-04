# FS-006 Policy Check — 2026-09-21

This is an engineering compliance checklist, not legal advice. Authoritative platform terms control.

## Chrome Web Store

Reviewed:
- https://developer.chrome.com/docs/webstore/user_data
- https://developer.chrome.com/webstore/program_policies
- https://developer.chrome.com/docs/extensions/reference/api/permissions

Engineering implications applied in FS-006:
1. Privacy policy/disclosure is required because the extension handles user-selected configuration and authentication information for optional cloud sync.
2. Minimum permissions remain mandatory: required `storage` + YouTube-only host permission; local backend remains optional and user-triggered.
3. Cloud-sync data use is disclosed before transmission and requires affirmative consent.
4. Limited Use disclosure prohibits sale/advertising secondary uses and constrains human access.
5. Production transmission of user data must use HTTPS. Localhost HTTP remains developer-only acceptance infrastructure.

## YouTube API Services

Reviewed:
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/terms/developer-policies-guide
- https://developers.google.com/youtube/terms/api-services-terms-of-service

FS-006 boundary:
- Level A does **not** use YouTube Data API / Analytics API / Reporting API.
- No API Data is stored.
- No YouTube OAuth or Authorized Data is requested.

Readiness requirements captured for Gate 2/3:
1. Public privacy policy must clearly state YouTube API Services use before those API features are exposed.
2. YouTube Terms of Service and Google Privacy Policy links are already included in the built-in/public templates.
3. If Authorized Data is later introduced, revocation and deletion controls must be implemented before exposure.
4. YouTube API Data retention must follow the applicable storage/refresh/deletion rules and any approved Analytics/Derived Metrics permissions.
5. Significant product/data-scope changes require privacy-policy review and renewed consent when necessary.
