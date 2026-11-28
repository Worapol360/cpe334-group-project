# CHG-03 — Change Request: F-01 session policy (idle timeout + absolute maximum lifetime)

## 1. Header

| Item | Value |
|---|---|
| Change ID | CHG-03 |
| Title | F-01 session policy: replace single fixed TTL with idle timeout and absolute maximum lifetime |
| Status | Proposed |
| Version | v0.1 |
| Date | 2026-11-28 |
| Authors | Team (Worapol360; TO CONFIRM: co-author listing) |
| Related issue | #51 |
| Change class | Requirement + design + test (contract revision follows in a separate issue) |
| Evidence | PENDING-EVIDENCE-SCREENSHOT |

This document is the change request only. `docs/srs.md`, `docs/sprints/sprint-1/feature-specs.md`, `docs/sprints/sprint-1/api-spec.md`, `docs/sprints/sprint-1/tests.md`, `docs/system-sds.md` and `docs/traceability.md` are **not** modified here; they are revised in the later contract-revision issue.

## 2. Original Sprint 1 requirement and implemented rule

**Requirement IDs**

| ID | Text (abridged) | Source |
|---|---|---|
| FR-01 | Valid credentials start a session; invalid credentials rejected with a generic error | `docs/srs.md` §4 Functional requirements (line 49) |
| FR-02 | User can log out; the session can no longer be used afterwards | `docs/srs.md` §4 (line 50) |
| FR-03 | System returns identity of the current session user | `docs/srs.md` §4 (line 51) |
| FR-04 | Protected operations allowed only per the role/permission matrix, enforced on the backend | `docs/srs.md` §4 (line 52) |
| NFR-01 | Request without a valid session to any protected endpoint → 401, body with no private data | `docs/srs.md` §6 Non-functional requirements (line 91) |
| NFR-06 | Sessions expire after `SESSION_TTL_MINUTES` (default 60); expired/logged-out sessions → 401; logout revokes server-side | `docs/srs.md` §6 (line 96); trace `docs/traceability.md` §3 (line 56) |
| DEC-03 | Sessions server-side: opaque random token, stored hashed in `sessions`, HttpOnly cookie | `docs/srs.md` §8 Decisions (line 120) |

**Feature / ACs**: feature **F-01** “Authentication, Session and Role-Based Access” — `docs/sprints/sprint-1/feature-specs.md` F-01, business rule line 32 (“Session lifetime = `SESSION_TTL_MINUTES` (default 60); expired/revoked/unknown tokens → 401 `UNAUTHENTICATED`”), ACs: **AC-F01-03** (line 48, logout revokes), **AC-F01-04** (line 49, no/garbage cookie → 401), **AC-F01-05** (line 50, “Session past `expires_at` → 401”). Last existing AC number = **AC-F01-11** (line 56), so new ACs start at AC-F01-12.

**Exact current behavior (verified in code)**

| Aspect | Current implementation |
|---|---|
| Expiry computation | Fixed at login: `expires_at = now + SESSION_TTL_MINUTES * 60_000` — `server/src/persistence/sessions.js:8-15` (`createSession`, line 10). No sliding renewal. |
| Storage | Column `sessions.expires_at` (TIMESTAMP(3) NOT NULL) plus `created_at`, `revoked_at`, `token_hash`, `user_id` — `server/prisma/schema.prisma:24-35`, migration `server/prisma/migrations/20261111000001_001_users_sessions/migration.sql:16-31`. Token stored as SHA-256 (`sessions.js:4-6`). |
| Check | On every request: `findValidSession()` — `sessions.js:17-27`; revoked (line 24) or `expiresAt.getTime() <= Date.now()` (line 25) → `null`. Called from `loadSession` middleware `server/src/api/middleware/session.js:19-35`, mounted on all four routers (`routes/auth.js:18`, `routes/ownerSurveys.js:18`, `routes/responses.js:9`, `routes/surveys.js:15`). |
| Expired response | `401` with code `UNAUTHENTICATED` and standard envelope via `requireAuth` (`session.js:37-43`) / `requireRole` (`session.js:45-59`) and `errorBody` (`server/src/api/errors.js`). No data returned. Cookie **not** cleared, session row **not** deleted (only logout sets `revoked_at`, `sessions.js:29-34`). Browser drops the cookie through `maxAge` set at login. |
| Cookie | `sid`, `httpOnly: true`, `sameSite: lax`, `path: /`, `secure` from `COOKIE_SECURE`, `maxAge = SESSION_TTL_MINUTES * 60_000` — `session.js:8-17`, `routes/auth.js:41`. |
| Config | `SESSION_TTL_MINUTES` read once: `server/src/config.js:35` via `readInt` (lines 12-18; integer check only, no range check, empty/unset → `60`). Consumed only in `routes/auth.js:40-41`. Declared in `.env.example` (line 14) and `server/.env.example` (line 11); documented in `docs/system-sds.md` §9 (line 192). |
| Roles | Identity and role come only from the session row (`session.js:23-30`); `requireRole` → 403 `FORBIDDEN` on mismatch. |
| Design statement | `docs/system-sds.md` §8 “Authentication design”: Login row (line 175), Current user (177), Logout (178), **Expiry (line 179: “Absolute lifetime (default 60 min); no sliding renewal in Sprint 1”)**, §4 table row `sessions` (line 75). |

## 3. Proposed new rule (precise, testable)

1. **Idle timeout — `SESSION_IDLE_MINUTES`, default `30`.**
   A session whose `last_authenticated_activity` is **30:00 or more** ago is expired (401). At **29:59** it is valid, and every successful authenticated request **renews** `last_activity_at`.
   Formal: expired when `now - last_activity_at >= SESSION_IDLE_MINUTES * 60_000`.
2. **Absolute maximum — `SESSION_ABSOLUTE_MINUTES`, default `480`.**
   A session at **8:00:00 or more** since `created_at` is expired even if just used (401).
   Formal: expired when `now - created_at >= SESSION_ABSOLUTE_MINUTES * 60_000`.
3. **Both conditions must hold**: a session is valid only if *neither* test expires it (AND of the two “still valid” predicates). Login/creation semantics, token generation, hashing and cookie name are unchanged.
4. **`SESSION_TTL_MINUTES` — deprecate and remove** (chosen option). The variable stops being read (`config.js:35` is replaced by the two new reads) and is documented as deprecated/ignored if still present in an environment.
   *Justification (simplest)*: a mapping (`SESSION_TTL_MINUTES` → `SESSION_ABSOLUTE_MINUTES`) would keep two names with different meanings alive, require an extra precedence rule (which wins if both are set?) and an extra test path. One-line removal in `config.js`, two clearly named variables, and one doc note in SDS §9 is the smallest surface. Deployment environments that still export `SESSION_TTL_MINUTES` keep working (unused variable, no error) — see §11 impact on Cloud Run env config.
5. **Expired response — unchanged**: `401`, error code `UNAUTHENTICATED`, same error envelope as today (`errorBody`), no session/user data in the body, **session cookie handling unchanged** (no clear on expiry; logout still clears and revokes). No new error code is introduced by this change.
6. **Both roles**: the rule applies identically to Owner and Respondent sessions. Identity and role continue to come only from the DB session, never from the request.
7. **Startup validation**: the app fails to start (error thrown during config load, before the server listens) if `SESSION_IDLE_MINUTES <= 0`, `SESSION_ABSOLUTE_MINUTES <= 0`, or `SESSION_IDLE_MINUTES > SESSION_ABSOLUTE_MINUTES`.
8. **Persistence**: new column `sessions.last_activity_at TIMESTAMP(3)`.
   - New migration (additive, per SDS §4 forward-only rules): add column → `UPDATE sessions SET last_activity_at = created_at` → `SET NOT NULL` with default for new rows.
   - Backfill rule: **`last_activity_at = created_at`** for all existing rows.
   - Sessions open at deploy time: each keeps its `created_at`. After deploy a session is valid only if it is < 30:00 old *and* < 8:00:00 old under the new rule. Consequence: sessions created **more than 30 minutes before the deploy** are rejected on their next request (401) even if used seconds earlier; sessions created within the last 30 minutes stay valid. Affected users get a 401 → one-time re-login (details in §11).
9. **Renewal write policy: update `last_activity_at` on every successful authenticated request** (one `UPDATE` by primary key inside `findValidSession`/`loadSession` when a valid session is loaded).
   *Reason*: exact boundary semantics (29:59 valid / 30:00 expired) with no skew, deterministic tests, and no extra state to reason about. A throttle (e.g. skip writes within 60 s of the stored value) saves writes but makes the effective idle window fuzzy by up to the throttle interval and forces the expiry check to subtract that same interval — more logic and flakier boundary tests. Expected load is low (lab deployment), so correctness/simple wins; throttling can be revisited if write volume becomes a problem.
10. **Cookie `maxAge`**: set at login to `SESSION_ABSOLUTE_MINUTES * 60_000` (was `SESSION_TTL_MINUTES * 60_000`, `routes/auth.js:41`) so the browser-side ceiling matches the server-side absolute maximum and the removed variable is not referenced. Expired-response cookie behavior itself is unchanged (see item 5).

## 4. Reason / business justification

- Long survey forms and owner summary pages are dropped mid-use: a respondent filling in a long questionnaire loses the session and the unsaved submission at the 60-minute mark with no warning, even while actively typing.
- Conversely, an idle session on a shared lab machine stays fully authenticated for a full 60 minutes after the user walks away; with only a fixed lifetime there is no way to shorten the risk window without also punishing active use.
- Splitting the policy into a **short idle window (30 min)** and a **generous absolute ceiling (8 h)** gives both: active work is not interrupted, and an abandoned session is unusable within 30 minutes regardless of when it was created.
- The current single rule (`expires_at = created_at + 60`) cannot express either requirement; the change is the minimum schema + config change that can.

## 5. Scope and out of scope

**In scope**
- `sessions` schema + migration (`last_activity_at`, backfill), session persistence logic, session middleware, config validation and new/removed env variables, cookie `maxAge` derivation, documentation/contract/test updates performed in the *follow-up* revision issue.

**Explicitly out of scope**
- Login rate limiting (documented SDS §8 limitation, line 181).
- CSRF token (SDS §8 line 180, SameSite=Lax stands).
- Other cookie flags (`COOKIE_SECURE`, `SameSite`, name, `Path`).
- F-15 hardening (separate backlog item; TO CONFIRM: F-15 description).
- Any Sprint 2/3 feature (F-06 … F-14, including F-12 anonymous mode and F-14 summary performance).
- UI redesign or new UI feedback for expiry (client keeps today’s behavior; see §11).
- Password hashing, seed, error envelope content, and any F-02..F-05 business rule.

## 6. Boundary table and invalid cases

| # | Case | Expected outcome |
|---|---|---|
| B1 | Idle elapsed 29:59 | Session valid; 200/204 as appropriate; `last_activity_at` renewed to now |
| B2 | Idle elapsed exactly 30:00 | Expired → 401 `UNAUTHENTICATED`, standard envelope, no data, cookie untouched |
| B3 | Absolute elapsed 7:59:59 (idle < 30:00) | Valid |
| B4 | Absolute elapsed exactly 8:00:00 (idle < 30:00) | Expired → 401 `UNAUTHENTICATED` even though just used |
| B5 | Renewal sequence: login at T0; authenticated request at T0+29:59; next request at T0+59:58 | All 200 (each successful request renews `last_activity_at`); session still under absolute ceiling |
| B6 | Idle < 30:00 but absolute ≥ 8:00:00 | Expired → 401 (absolute wins) |
| B7 | Expired token (past idle or absolute) sent to any protected endpoint | 401 `UNAUTHENTICATED`, no private data (all four routers) |
| B8 | Tampered / unknown / garbage token | 401 `UNAUTHENTICATED` (hash lookup fails; behavior unchanged) |
| B9 | Logged-out token (`revoked_at` set) | 401 `UNAUTHENTICATED`; row still revoked, not deleted |
| B10 | No cookie at all | 401 `UNAUTHENTICATED` (unchanged) |
| B11 | Invalid env config: `SESSION_IDLE_MINUTES=0`, `SESSION_IDLE_MINUTES=-5`, `SESSION_ABSOLUTE_MINUTES=0`, or `SESSION_IDLE_MINUTES > SESSION_ABSOLUTE_MINUTES` | Process fails at startup with a configuration error; server does not start listening |
| B12 | Owner session vs Respondent session | Identical expiry semantics for both roles |
| B13 | Cross-user access (other owner’s survey, other respondent’s response) | 403 unchanged; role/ownership still from session only |
| B14 | Wrong password / unknown email at login | 401 `INVALID_CREDENTIALS` unchanged (no session created) |

## 7. Draft acceptance criteria (draft, finalized in the contract revision issue)

Existing numbering ends at **AC-F01-11**; new IDs continue at AC-F01-12.

| AC | Given | When | Then |
|---|---|---|---|
| AC-F01-12 (draft) | A logged-in session with `last_activity_at` set to 29:59 ago | A request to any protected endpoint | The request succeeds (non-401) and `last_activity_at` is updated to the request time |
| AC-F01-13 (draft) | A logged-in session with `last_activity_at` set to 30:00 ago (or more) | A request to any protected endpoint | 401 `UNAUTHENTICATED`, error envelope identical to today’s expiry response, no session/user data, session cookie not cleared |
| AC-F01-14 (draft) | A session created 7:59:59 ago with recent activity | A request to a protected endpoint | The request succeeds |
| AC-F01-15 (draft) | A session created 8:00:00 ago (or more) that was used seconds earlier | A request to a protected endpoint | 401 `UNAUTHENTICATED` (absolute maximum overrides recent activity) |
| AC-F01-16 (draft) | Both env variables valid, defaults unset | App startup | `SESSION_IDLE_MINUTES` defaults to 30, `SESSION_ABSOLUTE_MINUTES` to 480; `SESSION_TTL_MINUTES` is ignored if present |
| AC-F01-17 (draft) | `SESSION_IDLE_MINUTES <= 0`, `SESSION_ABSOLUTE_MINUTES <= 0`, or `SESSION_IDLE_MINUTES > SESSION_ABSOLUTE_MINUTES` | App startup | The process exits with a configuration error and never starts listening |
| AC-F01-18 (draft) | A database containing sessions created before the migration | Migration runs, then a pre-deploy session is used | Migration backfills `last_activity_at = created_at`; the resulting valid/expired decision matches the new rule; a session older than 30 minutes is rejected with 401, a session younger than 30 minutes still works |
| AC-F01-19 (draft) | Owner session and Respondent session | Both expiry tests above | Identical status/code/envelope for both roles; identity and role still come only from the session |

Marked **draft, finalized in the contract revision issue** (which will also renumber/align `tests.md` §11 and `traceability.md`).

## 8. Impact table

| Requirement ID | Feature | SRS / Feature SDS / System SDS sections | AC IDs | STS test IDs (existing affected / new needed) | Code modules | Change type |
|---|---|---|---|---|---|---|
| NFR-06 | F-01 | srs §6 :96; sds §8 :179 (Expiry row); feature-specs F-01 :32 | AC-F01-05 | TC-F01-08, TC-INT-04 (affected); new idle/absolute boundary tests (AC-F01-12..15) | `persistence/sessions.js`, `middleware/session.js`, `config.js` | modify |
| NFR-01 | F-01 | srs §6 :91; sds §6 :127 | AC-F01-04 | TC-F01-07, TC-INT-01 (unchanged expectations) | `middleware/session.js` (`requireAuth`) | unchanged |
| FR-01 | F-01 | srs §4 :49; sds §8 :175 | AC-F01-01, 02 | TC-F01-01, 03, 04, 05 | `routes/auth.js` (cookie maxAge only) | modify (minor) |
| FR-02 | F-01 | srs §4 :50; sds §8 :178 | AC-F01-03 | TC-F01-06 | `persistence/sessions.js` (`revokeSession`) | unchanged |
| FR-03 | F-01 | srs §4 :51; sds §8 :177 | AC-F01-01 | TC-F01-02 | `middleware/session.js` (`loadSession`) | modify (adds renewal write) |
| BR-08 / FR-04 (role & ownership matrix) | F-01..F-05 | srs §4 :52, §5 BR-08 :81; sds §7 (matrix, :154) | AC-F01-07 | TC-F01-10, TC-INT-01 | `domain/roles.js`, `requireRole` | unchanged |
| DEC-03 (server-side sessions, hashed token, HttpOnly) | F-01 | srs §8 :120; sds §4 :75, §8 :175 | AC-F01-06 | TC-F01-09, TC-F01-14, l502 cookie-options test | `persistence/sessions.js` (hash) | unchanged (hashing) / modify (columns) |
| NFR-07 (safe errors) | F-01 | srs §6 :97 | AC-F01-09 | TC-F01-05, TC-INT-06 | `api/errors.js` | unchanged |
| NFR-10 / health | F-01 | srs §6 :100 | AC-F01-11 | TC-F01-15 | `routes/health.js`, `ready.js` | unchanged |
| Config/env | F-01 | sds §9 :192; `.env.example` :13-14; `server/.env.example` :10-11 | AC-F01-16, 17 | new startup-validation tests | `config.js` | modify |
| Persistence / migration | F-01 | sds §4 :75, §4.1 :84-97 | AC-F01-18 | new migration + backfill test | `prisma/schema.prisma`, new migration file, `persistence/sessions.js` | new |
| F-02 Survey creation | F-02 | feature-specs F-02 (business rules BR-05) | AC-F02-* | TC-F02-01..15 | none (uses `loadSession` only) | unchanged (depends on auth middleware) |
| F-03 Publication | F-03 | feature-specs F-03 (BR-03/04/05) | AC-F03-* | TC-F03-01..06 | none | unchanged (depends on auth middleware) |
| F-04 Response submission | F-04 | feature-specs F-04 (BR-01, BR-07) | AC-F04-* | TC-F04-01..17, TC-INT-05 | none | unchanged (depends on auth middleware) |
| F-05 Summary | F-05 | feature-specs F-05 v0.2/v0.3 (CHG-01/02) | AC-F05-* | TC-F05-01..22, TC-INT-07 | none | unchanged (depends on auth middleware) |
| Owner/Respondent permission matrix | F-01..F-05 | sds §7 :154-167 | AC-F01-07, AC-F02-07, AC-F03-05, AC-F04-09, AC-F05-05 | TC-INT-01 | `requireRole` | unchanged |
| Client 401 handling | F-01 UI | feature-specs F-01 AC-F01-08 | AC-F01-08 | TC-F01-12, TC-F01-13 (E2E) | `client/src/auth.jsx`, `client/src/api.js`, page error states | unchanged in this change |

## 9. Existing behavior that MUST remain unchanged (protected tests)

| Behavior | Protecting tests |
|---|---|
| 401 envelope and codes (`UNAUTHENTICATED` / `INVALID_CREDENTIALS`), no private data | TC-F01-07, TC-F01-05, TC-INT-01, TC-INT-06 |
| 403 `FORBIDDEN` on role mismatch; role from session only | TC-F01-10 (unit + API), TC-INT-01, TC-F02-10, TC-F03-06, TC-F04-11, TC-F05-06 |
| 404 unknown / not-visible resources (no leakage) | TC-F02-06, TC-F02-15, TC-F03-06, TC-F04-12, TC-INT-01 |
| 409 `DUPLICATE_RESPONSE` / `SURVEY_NOT_OPEN` / `INVALID_STATE_TRANSITION`; DB `UNIQUE(survey_id, respondent_id)` guard | TC-F04-03, TC-F04-04, TC-INT-05, TC-F03-01..04 |
| 422 `VALIDATION_ERROR` with `fields[]` | TC-F01-05, TC-F02-02..05, TC-F04-07 |
| Token hashing (SHA-256), no token/hash in responses | TC-F01-09, TC-F01-14 |
| Logout: 204, `revoked_at` set, old cookie rejected, cookie cleared | TC-F01-06, TC-INT-04 (logout case) |
| Owner isolation / ownership from session | TC-F02-06, TC-F02-08/11, TC-F04-10/11, TC-F05-05 |
| F-05 aggregate summary semantics, `generatedAt`, `Cache-Control: no-store` | TC-F05-01..06, TC-INT-07 |
| Health endpoint without session | TC-F01-15 |
| Cookie flags `HttpOnly` + `SameSite=Lax` + `COOKIE_SECURE` | `l502-cloud-ready.test.js` cookie-options test (line 88-94) |
| E2E login/logout/redirect flows | TC-F01-12, TC-F01-13 (`e2e/f01.spec.js`) |

## 10. Existing tests whose expected result legitimately changes

No test’s *expected status/code* changes (expiry still yields 401). What changes is **setup/precondition and spec wording**:

| Test ID | File | Why it must be revised |
|---|---|---|
| TC-F01-08 | `server/tests/api/f01-api.test.js:187-207`; spec `tests.md:196` | Precondition says “session with TTL overridden / clock advanced”; with `SESSION_TTL_MINUTES` deprecated, the setup must set `last_activity_at` (idle case) or `created_at` (absolute case) instead of only `expires_at`. Expected 401 unchanged. |
| TC-INT-04 | `server/tests/integration/system.test.js:465-517`; spec `tests.md:33` | Spec wording “advance clock beyond TTL”; implementation must expire by backdating `last_activity_at`/`created_at` (logout case unchanged). Expected 401 unchanged. |
| tests.md §6 row AC-F01-05 / §11 row TC-F01-08 | `tests.md:79`, `:196` | Text references the TTL rule; updated in the contract-revision issue. |
| TC-F01-01 session-row assertions | `server/tests/api/f01-api.test.js:53-54` | Asserts `expiresAt > now`; still passes as-is, but the row should additionally be checked for `last_activity_at` (strengthen, not invert). |

New tests required: idle boundary (29:59/30:00), absolute boundary (7:59:59/8:00:00), renewal sequence, both-conditions rule, startup validation, migration backfill. IDs TBD in the contract-revision issue (proposal: TC-F01-16..).

## 11. Risks and migration / historical-data notes

- **Sessions open at deploy**: backfill `last_activity_at = created_at` means every session older than 30 minutes is rejected immediately after deploy, including sessions used seconds before the deploy. Users see a 401; the SPA shows an error state and, on the next full page load, redirects to `/login` (see client note below). Mitigation: announce the deploy window; a one-time re-login is acceptable for the lab user base.
- **Rollback**: the migration adds one nullable-then-`NOT NULL` column and does not drop anything. Rolling back the *code* to a build that does not know `last_activity_at` is safe (extra column ignored by Prisma queries that do not select it — TO CONFIRM: verify Prisma client strictness on unknown columns on rollback). Rolling back the *migration* is not performed (forward-only, additive per SDS §4.1); leaving the column in place is harmless for the old code.
- **`SESSION_TTL_MINUTES` in deployed environments** (Cloud Run / docker env, `.env.example`): becomes ignored. Deployed revision value: PENDING-DEPLOY-CHECK. Environments should be updated to set `SESSION_IDLE_MINUTES` / `SESSION_ABSOLUTE_MINUTES` (defaults apply if unset), otherwise behavior silently changes from 60 min fixed to 30 min idle / 8 h absolute — a **stricter** policy than before for idle sessions.
- **Client behavior on 401 mid-session (unchanged, known UX gap)**: `client/src/auth.jsx:14-19` clears the user only on the mount-time `/api/auth/me` refresh; data pages (`Surveys.jsx:22-25`, `OwnerSurveys.jsx:22-24`, `SurveyDetail.jsx:47-53`, `ResponseDetail.jsx:23-31`, `OwnerSurveySummary.jsx:87-88`) only render the error message (“Authentication required”) and do **not** log out or redirect; `RequireAuth` (`client/src/App.jsx:20-27`) trusts the cached user until a full reload. With a 30-minute idle timeout this gap is reached more often → more users seeing a stuck error page. Fixing it is explicitly out of scope here (§5) but should be raised in the contract-revision issue.
- **Write amplification**: one `UPDATE sessions` per authenticated request (renewal policy, §3.9). Low risk at lab scale; monitored via DB if the app is ever scaled.
- **Boundary semantics of `>=`**: both predicates use `>=` (30:00 and 8:00:00 are expired), matching the current `expiresAt <= now` convention (`sessions.js:25`).

## 12. Version table

| Item | Value |
|---|---|
| Accepted Sprint 1 baseline | `main` @ `cd3374869785089ed90546b00212d65ada054dfb` (2026-11-15, “Merge pull request #15 … sprint1-staging”) — **no tag created** for this commit (verified: the only tag `v0.1.1-sprint1-uat` points at `8d2f8d0`, a later commit) |
| Actual pre-change commit | `de6d5135183412346c59a10c90ff87383c77df21` (HEAD, “Merge pull request #49 … sprint1-staging”) |
| Deployed revision | PENDING-DEPLOY-CHECK |
| Intervening changes since baseline (48 commits, `cd33748..de6d513`) | PR #17/#18 Lab 6 UAT handoff docs; PR #24 sprint1-staging merge (tag `v0.1.1-sprint1-uat` = `8d2f8d0`); PR #34 Docker containerization (#26); PR #35 CI workflow (#27); PR #36 GCP first deploy docs (#28); PR #37 deploy scripts, APP_VERSION, `DEMO_USER_PASSWORD` fallback in `config.js` (#29); PR #38 WIF gate (#30); PR #40 release pipeline, `ready.js`/`app.js` health+trust-proxy changes, smoke tests (#31); PR #41 Lab 5 persistence evidence; PR #48 image-digest evidence (#32); PR #49 sprint1-staging (F-05 contract v0.2/v0.3, CHG-01/CHG-02); PR #50 Lab 6 part-B UAT execution docs (#20). |
| — of which code under `server/src` | Only `ready.js` (new), `app.js` (trust proxy / serve client), `config.js` (seed-password fallback) changed since baseline. Session/auth modules (`persistence/sessions.js`, `api/middleware/session.js`, `api/routes/auth.js`, `prisma/schema.prisma`, session migrations) are **byte-identical to baseline** — verified by `git diff --stat` (no entries). |
| Docs affected by CHG-03 (later issue) | `docs/srs.md`, `docs/sprints/sprint-1/feature-specs.md`, `docs/sprints/sprint-1/api-spec.md`, `docs/sprints/sprint-1/tests.md`, `docs/system-sds.md`, `docs/traceability.md` (§5 change log row for CHG-03) |

## 13. Approval record

| Item | Value |
|---|---|
| Pre-approval required? | No — the instructor announced that Lab 7 change requests need no instructor/TA pre-approval |
| Approver | Instructor |
| Approval date | 2026-11-28 |
| Evidence | PENDING-EVIDENCE-SCREENSHOT |

## 14. Review

| Item | Value |
|---|---|
| Reviewer | aranedlek |
| Date | TO CONFIRM |
| Finding | TO CONFIRM |
