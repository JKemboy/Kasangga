# KASANGGA system audit — November 11, 2026

Core connections and the tested workflows passed. This is not a claim that every feature has been verified through a real signed-in browser session. Two historical payment inconsistencies remain unresolved.

## Verified against linked Supabase

- 57 referenced RPC names exist and have authenticated execution grants. Twenty-four referenced tables/storage buckets exist. The frontend payment Edge Function is deployed and active. This is an inventory check, not proof that every possible argument combination works.
- Actual authenticated database-role checks passed for Learner, Tutor, LCO and OSWE. Each account can read its own profile/roles. Staff snapshots reject other portal roles and unauthenticated identities.
- Learner/Tutor session, review, report, directory, message-notification and chat reads passed. LCO and OSWE live snapshots passed the production UI mappers.
- Rollback-only incident/OSWE regressions passed: grouped incident types, official-semester counting, LCO referral, OSWE confirmation, confirmed same-type history, manually selected decisions, required conditions, insufficient-evidence outcomes, and clearance follow-up. Tests use artificial fixtures, not assumed academic calendar dates.
- Rollback-only tutor service checks passed: unchanged booked ranges remain preserved and conflicting topic times are rejected.
- Rollback-only completion tests passed: uploaded-object registration, participant access to proof, learner notifications, reminder cooldown, learner-only completion, rating eligibility and legacy completion rejection.
- Notification email queue tests passed for all four roles, including preferences, deduplication and read receipts. No test email was intentionally delivered.
- Payment allocation totals match the stored paid-payment gross amounts where allocations exist. No completed bookings lack completion timestamps. Tutor profiles have approved application links.

Temporary SQL audit copies were used; deleted `scripts/sql` files were not restored. All workflow fixtures were rolled back. Existing record totals remained 11 bookings, 11 reports, 8 cases, 6 decisions and 6 holds.

## Live HTTP and browser checks

- Auth settings are reachable and Google OAuth is configured.
- Edge Function health endpoint returns HTTP 200.
- Checkout rejects unauthenticated callers; unsigned payment webhooks and invalid email-worker secrets are rejected.
- Anonymous staff snapshot requests are rejected over HTTP.
- Headless Edge browser: login, registration, public Terms page, all four anonymous dashboard redirects, and the Terms modal on desktop/mobile passed without runtime errors. Reading Terms does not automatically check consent.
- Authenticated dashboard UI smoke tests used **mocked auth/HTTP responses with actual exported database records**: Learner 10 sections, Tutor 10, LCO 12 and OSWE 8. All 40 rendered without runtime crashes. This verifies rendering/navigation, not real authenticated HTTP execution of every button.
- Learner/Tutor session screens passed mobile overflow and closed-sidebar checks at 390px. Screenshots were visually inspected.

## Bug fixed

`src/services/sessionLifecycle.js` now accepts both raw database fields and mapped session fields. Previously, the Tutor dashboard's 30-second timer passed mapped records to a function expecting raw database names, causing incorrect lifecycle classification. Completed sessions now remain Completed, and upcoming/ongoing sessions use the correct times. `scripts/check-session-lifecycle.mjs` covers both record formats and the time boundaries.

## Remaining findings and verification gaps

1. **BK-2 and BK-3:** stored as paid/completed but have no `payments` rows. Their transaction IDs/payment provenance cannot be verified. No financial history was fabricated or changed. Reconciliation requires authoritative original payment records or confirmation that these were demonstration bookings.
2. **No official semesters configured; no active escalation mappings.** Automatic semester counting and action suggestions remain inactive by design. Do not invent dates or disciplinary mappings.
3. Seven University Policies procedure entries still require verified official content. Their placeholders are intentional and must not be treated as official Handbook text.
4. Real Google sign-in, paid checkout/PayMongo settlement, real file transfer and signed-file download over Storage HTTP, OCR accuracy, inbox email delivery and actual payment/refund transfers were not exercised end-to-end. Database/mock tests cannot establish these external outcomes.
5. The current workspace has no `supabase/migrations` directory. Existing live functionality is installed, but rebuilding a fresh database from this working tree is not verified. Previously deleted migrations were not restored during this audit.

## Audit tooling

Existing component/service checks and the production build passed. Added `.mjs` tools:

- `check-session-lifecycle.mjs`: regression for the fixed timer issue.
- `check-system-connections.mjs <temporary inventory directory>`: referenced RPC/table/bucket/Edge Function inventory.
- `check-system-role-mapping.mjs <temporary export directory>`: live role snapshot mapping.
- `check-system-http.mjs`: read-only health and rejection checks using local environment configuration; secrets are not printed.
- `check-system-browser.mjs <temporary tools directory>`: public-page and anonymous browser checks.
- `check-system-role-browser.mjs <temporary export/tools directory> [--mobile-only]`: mocked role UI smoke checks. Browser tooling was installed outside the repository. Export files contain private records and were kept in the temporary directory, not committed or printed in the report.

Production build passes with the existing large-bundle warning. No deployment or real payment was performed by this audit.
