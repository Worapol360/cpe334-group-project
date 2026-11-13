# Sprint 1 – Tests (STS), System Tests, Definition of Done and Evidence Log

Version v0.1 – 2026-11-10. Feature-level test specifications are in §11. This file also holds the system-level tests (Issue #07 `[TEST-01]`), the Product Definition of Done, and the templates for execution evidence.

## 1. Conventions

| Item | Rule |
|---|---|
| IDs | AC: `AC-Fxx-nn`; tests: `TC-Fxx-nn` (feature), `TC-INT-nn` (API/DB system), `TC-E2E-nn` (browser), `TC-MAN-nn` (manual). Issue `[TEST-01]` is a work item, not a test case |
| Levels | Unit (domain logic, no DB/HTTP) · API/DB integration (real API + real test DB) · E2E (browser through UI→API→DB) · Manual (supplement only) |
| Test DB | Separate database, reset before each integration/E2E run, seeded from the same seed script |
| Evidence per test | file/name, command, counts (pass/fail/skip), tested commit |

## 2. Counts (planned)

| Feature | AC | Tests |
|---|---|---|
| F-01 | 11 | 15 |
| F-02 | 10 | 14 |
| F-03 | 9 | 11 |
| F-04 | 13 | 17 |
| F-05 | 8 | 9 |
| System (TEST-01) | – | 13 |
| **Total** | **51** | **79** |

## 3. System-level tests (Issue #07, branch `test/issue-07-sprint1-integration-e2e`)

| Test | Requirement | Level | Precondition / input | Action | Expected |
|---|---|---|---|---|---|
| TC-INT-01 | NFR-01, NFR-03, FR-04 | API/DB | endpoint × actor table (anonymous, respondent, owner own, owner other) covering **every** endpoint in SDS §6.1 | table-driven requests | status codes equal SDS §7 matrix; denied responses carry no private data |
| TC-INT-02 | FR-05..FR-11 | API/DB | clean seeded DB | owner creates → publishes; respondent1 lists, answers, reads own response; owner reads summary | each step succeeds; stored data retrieved correctly; summary count 1 |
| TC-INT-03 | NFR-08 | Integration | empty DB | run migrate + seed + start app + health | app healthy; 4 users; 4 seed surveys |
| TC-INT-04 | NFR-06 | API | sessions for owner and respondent | logout / advance clock beyond TTL, call every protected endpoint | all 401 |
| TC-INT-05 | NFR-04, BR-01 | API/DB | respondent1 and respondent2, same survey | parallel submissions: 3 each | exactly one response per respondent (2 rows total) |
| TC-INT-06 | NFR-07 | API | fault injected into a handler | call endpoint | 500 `INTERNAL_ERROR`, no stack/SQL/path in body |
| TC-INT-07 | FR-11, BR-07 | API/DB | respondent1 and 2 submit different answers | owner summary | counts match both; no identifiers in JSON |
| TC-E2E-01 | FR-01..FR-11 | E2E | seeded users | owner logs in, creates + publishes; logs out; respondent logs in, answers, sees confirmation; logs out; owner opens summary | summary shows 1 response and correct counts |
| TC-E2E-02 | BR-01 | E2E | respondent already answered | open survey again / try to resubmit | form disabled or 409 error shown; no second response |
| TC-E2E-03 | FR-04, NFR-03 | E2E + API | respondent logged in | open `/owner/surveys` by URL; call owner API from the page context | "not allowed" page; API returns 403 |
| TC-E2E-04 | FR-01, FR-02, NFR-06 | E2E | – | invalid login; valid login; logout; back button | error shown; logged in; login page; protected data not shown |
| TC-MAN-01 | NFR-08 | Manual | clean clone, only README | follow README (≤ 6 commands) | app runs, tests run; time and commands recorded |
| TC-MAN-02 | NFR-09 | Manual | each screen | check loading/empty/error states and field errors | checklist all ticked |

## 4. Execution and evidence rules

1. Run the full suite on the release commit with the documented command(s); save the console output (counts of passed/failed/skipped).
2. Never disable, skip or weaken a required test; report any failed/skipped test and the reason.
3. TDD evidence for each sampled rule: commit ID + output of the failing run → commit ID + output of the passing run.
4. Inspect assertions yourself; AI statements such as "all tests pass" are not evidence.
5. Manual checks supplement but never replace automated tests.
6. Seed passwords and any secret stay out of screenshots, logs, PDF and Git.

## 5. Product Definition of Done (Sprint 1)

A feature or the sprint is **Done** only when all hold:

- [ ] Required behaviour implemented as specified in the feature contract (UI, API, data).
- [ ] All planned tests for the feature executed; meaningful tests passing; failed/skipped tests disclosed.
- [ ] Negative, boundary, and role/ownership tests included and passing.
- [ ] Persistence verified through the real database (not mock-only).
- [ ] TDD evidence kept for rule work (failing → passing, commit IDs).
- [ ] PR reviewed by the teammate with a specific check/finding; author did not approve own PR.
- [ ] Feature merged into `sprint1-staging`; integration and system tests (TEST-01) pass there.
- [ ] Release PR `sprint1-staging → main` reviewed and merged; release tagged `v0.1.0-sprint1`.
- [ ] README, `.env.example`, contracts, traceability and results table are up to date.
- [ ] No secrets in Git; synthetic data only.
- [ ] Incomplete work and limitations disclosed in Part F.

## 6. AC-to-test results table (fill after execution)

Release commit: `<sha>` · Command: `<test command>` · Total / pass / fail / skip: `<..>`

| AC | Planned tests | Actual file / test name | Result |
|---|---|---|---|
| AC-F01-01 | TC-F01-01, 02 | | |
| AC-F01-02 | TC-F01-03, 04 | | |
| AC-F01-03 | TC-F01-06 | | |
| AC-F01-04 | TC-F01-07 | | |
| AC-F01-05 | TC-F01-08 | | |
| AC-F01-06 | TC-F01-09, 14 | | |
| AC-F01-07 | TC-F01-10 | | |
| AC-F01-08 | TC-F01-12, 13 | | |
| AC-F01-09 | TC-F01-05 | | |
| AC-F01-10 | TC-F01-11 | | |
| AC-F01-11 | TC-F01-15 | | |
| AC-F02-01 | TC-F02-01, 02 | `tests/api/f02-api.test.js`: TC-F02-01, TC-F02-02 | Pass |
| AC-F02-02 | TC-F02-03 | `tests/unit/f02-unit.test.js`: TC-F02-03; `tests/api/f02-api.test.js`: TC-F02-03 | Pass |
| AC-F02-03 | TC-F02-04 | `tests/unit/f02-unit.test.js`: TC-F02-04 | Pass |
| AC-F02-04 | TC-F02-05, 06 | `tests/unit/f02-unit.test.js`: TC-F02-05, TC-F02-06 | Pass |
| AC-F02-05 | TC-F02-07 | `tests/unit/f02-unit.test.js`: TC-F02-07 | Pass |
| AC-F02-06 | TC-F02-08, 09, 15 | `tests/api/f02-api.test.js`: TC-F02-08, TC-F02-09, TC-F02-15 | Pass |
| AC-F02-07 | TC-F02-10 | `tests/api/f02-api.test.js`: TC-F02-10 | Pass |
| AC-F02-08 | TC-F02-11 | `tests/api/f02-api.test.js`: TC-F02-11 | Pass |
| AC-F02-09 | TC-F02-13, 14 | Manual verification in client UI (`/owner/surveys/new`, `/owner/surveys`, `/owner/surveys/:id`); automated E2E consolidated under TEST-01 (Issue #7) | Pass (Manual) |
| AC-F02-10 | TC-F02-12 | `tests/api/f02-api.test.js`: TC-F02-12 | Pass |
| AC-F03-01 | TC-F03-01 | | |
| AC-F03-02 | TC-F03-02, 04 | | |
| AC-F03-03 | TC-F03-03, 04 | | |
| AC-F03-04 | TC-F03-05 | | |
| AC-F03-05 | TC-F03-06 | | |
| AC-F03-06 | TC-F03-07, 08 | | |
| AC-F03-07 | TC-F03-09 | | |
| AC-F03-08 | TC-F03-10 | | |
| AC-F03-09 | TC-F03-11 | | |
| AC-F04-01 | TC-F04-01 | `tests/api/f04-api.test.js`: TC-F04-01 | Pass |
| AC-F04-02 | TC-F04-02 | `tests/api/f04-api.test.js`: TC-F04-02 | Pass |
| AC-F04-03 | TC-F04-03 | `tests/api/f04-api.test.js`: TC-F04-03 | Pass |
| AC-F04-04 | TC-F04-04 | `tests/api/f04-api.test.js`: TC-F04-04 | Pass |
| AC-F04-05 | TC-F04-05 | `tests/api/f04-api.test.js`: TC-F04-05 | Pass |
| AC-F04-06 | TC-F04-06, 07 | `tests/unit/f04-unit.test.js`: TC-F04-06; `tests/api/f04-api.test.js`: TC-F04-07 | Pass |
| AC-F04-07 | TC-F04-08 | `tests/unit/f04-unit.test.js`: TC-F04-08 | Pass |
| AC-F04-08 | TC-F04-09, 10 | `tests/unit/f04-unit.test.js`: TC-F04-09; `tests/api/f04-api.test.js`: TC-F04-10 | Pass |
| AC-F04-09 | TC-F04-11 | `tests/api/f04-api.test.js`: TC-F04-11 | Pass |
| AC-F04-10 | TC-F04-12, 13 | `tests/api/f04-api.test.js`: TC-F04-12, TC-F04-13 | Pass |
| AC-F04-11 | TC-F04-14 | `tests/api/f04-api.test.js`: TC-F04-14 | Pass |
| AC-F04-12 | TC-F04-15 | `tests/api/f04-api.test.js`: TC-F04-15 | Pass |
| AC-F04-13 | TC-F04-16, 17 | `tests/api/f04-api.test.js`: TC-F04-17; `e2e/f04.spec.js`: TC-F04-16 (playwright 1 passed, 10.2s) | Pass |
| AC-F05-01 | TC-F05-01, 02 | | |
| AC-F05-02 | TC-F05-01, 03 | | |
| AC-F05-03 | TC-F05-01, 04 | | |
| AC-F05-04 | TC-F05-05 | | |
| AC-F05-05 | TC-F05-06 | | |
| AC-F05-06 | TC-F05-07 | | |
| AC-F05-07 | TC-F05-08 | | |
| AC-F05-08 | TC-F05-09 | | |

## 7. TDD log (fill during implementation)

| Rule / AC | Test | Failing commit + date | Failing output summary | Fix commit + date | Passing output summary |
|---|---|---|---|---|---|
| BR-01 / AC-F04-03 | TC-F04-03 | `081a52a` (2026-11-13) | `AssertionError: expected 404 to be 409 (endpoint missing)` | `fe2835e` (2026-11-13) | `Pass (409 DUPLICATE_RESPONSE)` |
| Ownership / AC-F04-10 | TC-F04-12 | `081a52a` (2026-11-13) | `AssertionError: expected 404 to be 403 (endpoint missing)` | `fe2835e` (2026-11-13) | `Pass (403 FORBIDDEN, body lacks answers)` |
| BR-03 / AC-F03-02 | TC-F03-02 | | | | |
| NFR-02 / AC-F01-06 | TC-F01-09 | | | | |

## 8. Git workflow evidence (fill for two completed Issues)

| Issue | Feature / AC | Branch | Author | Reviewer | Review note (specific check) | PR → staging | Release PR → main | Commit IDs/dates (spec → tests → impl) |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |

Final board status screenshot and release tag/commit: `<..>`

## 9. Contribution table and AI-use declaration

| Student | Specs | Tests | Code | Reviews | Pair work (Issue/PR links) |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |

AI-use declaration: tools used (`opencode`, model `<..>`), tasks assisted (`<drafting contracts, generating tests/code, …>`); all output reviewed and run by the students.

## 10. Known limitations (initial)

No login rate limiting; no CSRF token (SameSite cookie only); `closed` surveys exist only through seed data; owners cannot see raw responses; pagination absent.

## 11. Feature-level test specification (STS)

Each test links to its AC (`feature-specs.md`).

### F-01 Authentication, Session and Role-Based Access
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TC-F01-01 | 01 | API/DB | seeded owner1 | POST login valid | 200, user body, `Set-Cookie`; session row exists |
| TC-F01-02 | 01 | API | session from TC-01 | GET me | 200, same id/role |
| TC-F01-03 | 02 | API | owner1 | POST login wrong password | 401 INVALID_CREDENTIALS, no cookie |
| TC-F01-04 | 02 | API | unknown email | POST login | 401, body identical to TC-03 |
| TC-F01-05 | 09 | API | – | POST login with missing/empty/non-string fields | 422 with field errors, no stack trace |
| TC-F01-06 | 03 | API/DB | active session | POST logout, then GET me with old cookie | 204 then 401; `revoked_at` not null |
| TC-F01-07 | 04 | API | no cookie / garbage cookie | GET me and a protected probe route | 401 UNAUTHENTICATED, no data |
| TC-F01-08 | 05 | API | session with TTL overridden / clock advanced | GET me | 401 |
| TC-F01-09 | 06 | API/DB | seeded users | Read `password_hash`; verify with hash lib | not equal to plaintext; verify = true |
| TC-F01-10 | 07 | Unit + API | test-only route guarded by owner role | call as respondent, as owner | 403 / 200 |
| TC-F01-11 | 10 | Integration | empty DB | migrate, seed, seed again | 4 users total, no duplicates |
| TC-F01-12 | 08 | E2E | seeded users | invalid login, then valid login | error shown; then navbar + role home |
| TC-F01-13 | 08 | E2E | logged-in user | visit protected page logged out; click Logout | redirect to `/login`; after logout redirected, back button shows no data |
| TC-F01-14 | 06 | API | login and me | inspect response JSON keys | no `password_hash` / token hash |
| TC-F01-15 | 11 | API | no session | GET `/api/health` | 200 with status and version |

### F-02 Survey Creation with Questions
| Test | AC | Level | Precondition / input | Action | Expected |
|---|---|---|---|---|---|
| TC-F02-01 | 01 | API/DB | owner1 session; valid body | POST create | 201 draft; rows exist; owner_id = owner1 |
| TC-F02-02 | 01 | API | survey from 01 | GET detail | same questions/options in order |
| TC-F02-03 | 02 | Unit + API | title `""`, `"   "`, 200 chars, 201 chars | validate / POST | reject, reject, accept, reject; no rows for rejects |
| TC-F02-04 | 03 | Unit | `questions: []` | validate | error on `questions` |
| TC-F02-05 | 04 | Unit | single-choice with 1, 2, 10, 11 options | validate | reject, accept, accept, reject |
| TC-F02-06 | 04 | Unit | 20 and 21 questions | validate | accept, reject |
| TC-F02-07 | 05 | Unit | rating with options; type `"text"` | validate | reject both |
| TC-F02-08 | 06 | API | owner1 and owner2 each own surveys | GET list as owner1 | only owner1 surveys |
| TC-F02-09 | 06 | API | owner1 requests `S-OWNER2-DRAFT` | GET detail | 403, no survey fields in body |
| TC-F02-10 | 07 | API | respondent / no session | POST + GET list | 403 / 401 |
| TC-F02-11 | 08 | API/DB | body with `ownerId=owner2`, `status="published"` | POST create | stored as draft, owner = session user |
| TC-F02-12 | 10 | Integration | fault injected on 2nd question insert | POST create | 500/422 safe error; zero survey/question/option rows |
| TC-F02-13 | 09 | E2E | owner logged in | create via form; submit invalid form | detail page shows saved survey; invalid shows inline errors; list shows new row |
| TC-F02-14 | 09 | Manual | empty owner account; throttled network; API offline | open list/forms | empty, loading and error states visible |
| TC-F02-15 | 06 | API | owner1 session; non-numeric or alphanumeric ID "12abc" | GET detail | 404 NOT_FOUND |

### F-03 Survey Publication
| Test | AC | Level | Precondition / input | Action | Expected |
|---|---|---|---|---|---|
| TC-F03-01 | 01 | API/DB | owner1, `S-DRAFT` | POST publish, then GET detail | 200 published, `published_at` not null, persisted |
| TC-F03-02 | 02 | API/DB | published survey | POST publish again | 409; `published_at` equals previous value |
| TC-F03-03 | 03 | API | `S-CLOSED` | POST publish | 409; still closed |
| TC-F03-04 | 02, 03 | Unit | transition function over all 9 pairs | evaluate | only draft→published allowed |
| TC-F03-05 | 04 | API/DB | owner1 on `S-OWNER2-DRAFT` | POST publish | 403; status still draft |
| TC-F03-06 | 05 | API | respondent / no session | POST publish | 403 / 401 |
| TC-F03-07 | 06 | API | seed: draft, published, closed | respondent GET list | only published returned |
| TC-F03-08 | 06 | API | respondent, `S-DRAFT` | GET detail | 404; body has no title/questions |
| TC-F03-09 | 07 | Unit | statuses draft/published/closed | `canModifyStructure` | true / false / false |
| TC-F03-10 | 08 | Unit | survey object with zero questions | publish use case | rejected, no status change |
| TC-F03-11 | 09 | E2E | owner and respondent accounts | owner publishes via UI; respondent opens list | badge changes; survey listed; confirmation dialog shown |

### F-04 Response Submission with Duplicate Prevention
| Test | AC | Level | Precondition / input | Action | Expected |
|---|---|---|---|---|---|
| TC-F04-01 | 01 | API/DB | respondent1; `S-PUB`; valid answers | POST | 201; 1 response + N answers; respondent_id = respondent1 |
| TC-F04-02 | 02 | API | response from 01 | GET by id as respondent1 | 200; answers equal submitted |
| TC-F04-03 | 03 | API/DB | respondent1 already answered | POST again | 409 DUPLICATE_RESPONSE; count = 1 |
| TC-F04-04 | 04 | API/DB | respondent1; 5 parallel POSTs | send concurrently | one 201, four 409; count = 1 |
| TC-F04-05 | 05 | API/DB | `S-DRAFT`, `S-CLOSED`, id 999999 | POST | 409, 409, 404; zero rows |
| TC-F04-06 | 06 | Unit | answers missing one question | `validateResponse` | error naming that question |
| TC-F04-07 | 06 | API/DB | same input | POST | 422; zero rows |
| TC-F04-08 | 07 | Unit | rating values 0, 1, 5, 6, 3.5, "a" | validate | reject, accept, accept, reject, reject, reject |
| TC-F04-09 | 08 | Unit | foreign option; foreign question; duplicate answer | validate | each rejected |
| TC-F04-10 | 08 | API/DB | same cases via API | POST | 422; zero rows |
| TC-F04-11 | 09 | API/DB | owner1 session / no session | POST | 403 / 401; zero rows |
| TC-F04-12 | 10 | API | response of respondent1; session respondent2 | GET by id | 403; body lacks answers |
| TC-F04-13 | 10 | API | owner1 session | GET respondent1's response | 403 |
| TC-F04-14 | 11 | API/DB | body contains `respondentId=respondent2` | POST as respondent1 | stored respondent = respondent1 |
| TC-F04-15 | 12 | Integration | fault injected on 2nd answer insert | POST | safe error; zero response rows |
| TC-F04-16 | 13 | E2E | respondent logged in; published survey | answer + submit; submit incomplete; revisit | confirmation shows answers; inline errors; form disabled on revisit |
| TC-F04-17 | 13 | API | respondent1 answered `S-PUB` | GET `/api/surveys` | item has `myResponseId` not null; other surveys null |

### F-05 Owner Aggregate Summary
| Test | AC | Level | Precondition / input | Action | Expected |
|---|---|---|---|---|---|
| TC-F05-01 | 01, 02, 03 | Unit | 3 responses: topic Git, Git, Testing; ratings 3, 4, 5 | `aggregate()` | count 3; Git 2, Testing 1, CI/CD 0; distribution 3/4/5 = 1 each |
| TC-F05-02 | 01 | API/DB | same data stored via API | GET summary | equals TC-01 expectation |
| TC-F05-03 | 02 | Unit | counts 1, 1, 1 of 3; counts 2, 1 | percent calculation | 33.3 ×3; 66.7 and 33.3 |
| TC-F05-04 | 03 | Unit | ratings 1, 2 / 3, 4, 5 / 5, 5, 4 | average | 1.50 / 4.00 / 4.67 |
| TC-F05-05 | 04 | API | `S-PUB` with no responses | GET summary | 200; zeros; `average` null |
| TC-F05-06 | 05 | API | owner2 session on owner1 survey; respondent session; no session | GET summary | 403 / 403 / 401; no summary data |
| TC-F05-07 | 06 | API | summary with 2 responses | inspect JSON keys recursively | no `respondentId`, `email`, `displayName`, `responseId`, `answers` |
| TC-F05-08 | 07 | API/DB | summary count n; respondent2 submits | GET summary again | count n+1; distributions updated |
| TC-F05-09 | 08 | E2E | survey with and without responses | open summary page | values rendered; empty state "No responses yet" |

## 12. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial version | – |
