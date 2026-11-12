# Sprint 1 Feature Specifications

Version v0.1 – 2026-11-10. Feature design, business rules, data, acceptance criteria (AC), feature-level Definition of Done, completion evidence and revision history for F-01 … F-05. Detailed UI behaviour is in `ui-spec.md`, API contracts in `api-spec.md`, and test specification (STS), system tests and Product DoD in `tests.md`. Requirement IDs refer to `../../srs.md`.

---

## F-01 Authentication, Session and Role-Based Access

| Item | Value |
|---|---|
| Feature | F-01 |
| Issue / branch | #02 `feature/issue-02-sprint1-auth` |
| Owner → reviewer | Student A → Student B |
| Linked requirements | FR-01, FR-02, FR-03, FR-04, BR-08, NFR-01, NFR-02, NFR-03, NFR-06, NFR-07, NFR-08, NFR-10 |
| Depends on | DOC-01 (this contract); stack decision Q-01 |
| Status | Planned (contract v0.1) |

> UI: `ui-spec.md` · API: `api-spec.md` · Tests (STS): `tests.md` §11 (F-01).

### Feature design
**Purpose.** Provide the foundation every other feature uses: project skeleton with migrations/seed/test harness, login, logout, current user, session lifecycle, password hashing, a reusable role guard and the error envelope.

**Workflow.**
1. User opens `/login`, submits email + password.
2. API verifies hash; creates session; sets HttpOnly cookie; returns user.
3. UI stores nothing sensitive; calls `GET /api/auth/me` on load to know the current user.
4. Logout revokes the session and clears the cookie; UI returns to `/login`.

**Business rules / validation.**
* Email and password are required, strings, email ≤ 254 chars, password ≤ 128 chars.
* Unknown email and wrong password give the same 401 `INVALID_CREDENTIALS` response.
* Session lifetime = `SESSION_TTL_MINUTES` (default 60); expired/revoked/unknown tokens → 401 `UNAUTHENTICATED`.
* Role guard `requireRole(role)` returns 403 `FORBIDDEN` when the session role differs.
* Identity and role are never taken from the request body.

**Permissions.** Login and health: public. Logout and `me`: any authenticated user.

**Failure / boundary cases.** missing fields; wrong types; very long password; expired session; revoked session; garbage cookie; two logins by the same user (each gets its own session).

### Data specification
Migration `001_users_sessions`: tables `users` and `sessions` as defined in `system-sds.md` §4. Seed (idempotent) creates 2 owners, 2 respondents (passwords hashed from `SEED_PASSWORD`) – see SDS §4.1. Other layers: no change.

### Acceptance criteria
| AC | Criterion (observable) |
|---|---|
| AC-F01-01 | Valid credentials → 200, user `{id, displayName, role}`, session cookie set; `GET /api/auth/me` with it returns the same user |
| AC-F01-02 | Wrong password and unknown email → 401 `INVALID_CREDENTIALS`, identical response shape, no cookie |
| AC-F01-03 | After logout the same cookie gets 401 on `me`; session row has `revoked_at` set |
| AC-F01-04 | Request without cookie or with garbage cookie to a protected endpoint → 401, body contains no private data |
| AC-F01-05 | Session past `expires_at` → 401 |
| AC-F01-06 | Stored `password_hash` ≠ plaintext and verifies with the hash library; seed stores hashes; no API response contains `password_hash` |
| AC-F01-07 | A route protected by `requireRole('owner')` returns 403 `FORBIDDEN` for a respondent session and passes for an owner (boundary: role comes from DB session, not request) |
| AC-F01-08 | UI: invalid login shows error; valid login shows navbar with user and Logout and lands on role home; anonymous visit to protected page redirects to `/login`; logout returns to `/login` |
| AC-F01-09 | Missing/empty/non-string email or password → 422 `VALIDATION_ERROR` with field errors; error body contains no internals |
| AC-F01-10 | On an empty DB, migrate + seed creates exactly 2 owners and 2 respondents; running seed again creates no duplicates |
| AC-F01-11 | `GET /api/health` returns 200 `{status, version}` without a session and without private data |

### Definition of Done (feature)
Product DoD (see `tests.md` §5) plus: all TC-F01-* executed and passing with output kept; TC-F01-03/06/08/10 followed TDD (failing then passing evidence); README setup (install, env, migrate, seed, run, test) verified on a clean clone; `.env.example` lists all variables in SDS §9; no secrets committed; PR reviewed by B with a specific finding recorded.

### Completion evidence
| Item | Value |
|---|---|
| Failing-test commit | |
| Implementation commit | |
| Test command / result / counts | |
| PR link, reviewer, review note | |

### Revision history
| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial contract | – |

---

## F-02 Survey Creation with Questions

| Item | Value |
|---|---|
| Feature | F-02 |
| Issue / branch | #03 `feature/issue-03-sprint1-survey-create` |
| Owner → reviewer | Student B → Student A |
| Linked requirements | FR-05, FR-06, BR-05, BR-08, BR-09, NFR-03, NFR-05, NFR-09 |
| Depends on | F-01 (auth, role guard, error envelope, test harness) |
| Status | Planned (contract v0.1) |

> UI: `ui-spec.md` · API: `api-spec.md` · Tests (STS): `tests.md` §11 (F-02).

### Feature design
**Purpose.** A Survey Owner creates a draft survey with questions, lists their own surveys and opens one.

**Workflow.**
1. Owner opens `/owner/surveys/new`, enters title, optional description, adds questions (single-choice with options, or rating).
2. Submit → API validates (BR-05), stores survey + questions + options in one transaction, status `draft`, `owner_id` = session user.
3. UI redirects to `/owner/surveys/:id` showing the persisted survey.
4. `/owner/surveys` lists only the owner's surveys.

**Business rules / validation (BR-05).**
* Title: required after trimming, ≤ 200 chars. Description: optional, ≤ 2000 chars.
* 1–20 questions; question text required, ≤ 500 chars; type ∈ {`single_choice`, `rating`}.
* `single_choice`: 2–10 options, each label non-empty (≤ 200 chars).
* `rating`: no options (scale fixed 1–5).
* Server sets `status='draft'`, `mode='identified'`, `owner_id` from session; client values for these are ignored.
* Order of questions/options is the order submitted (stored as `position`).

**Permissions.** Owner only. Owner sees only own surveys; other owner's survey by id → 403. Respondent → 403; anonymous → 401.

**Failure / boundary cases.** blank title; 0 questions; 21 questions; single-choice with 1 or 11 options; rating with options; unknown type; client sends `status:"published"` or `ownerId`; DB failure midway.

### Data specification
Migration `002_surveys`: tables `surveys`, `questions`, `question_options` with constraints from `system-sds.md` §4 (`CHECK mode='identified'`, `UNIQUE(survey_id, position)`, `UNIQUE(question_id, position)`). Seed adds `S-DRAFT`, `S-PUB`, `S-CLOSED`, `S-OWNER2-DRAFT` (S-PUB/S-CLOSED statuses set directly by seed).

### Acceptance criteria
| AC | Criterion |
|---|---|
| AC-F02-01 | Owner posts a valid survey → 201, status `draft`, `owner_id` = current user; survey, questions and options are persisted in order and returned by GET detail |
| AC-F02-02 | Empty/whitespace title → 422 on `title`; nothing stored. Title of exactly 200 chars accepted, 201 rejected |
| AC-F02-03 | Zero questions → 422; nothing stored |
| AC-F02-04 | `single_choice` with 1 option rejected, with 2 accepted, with 10 accepted, with 11 rejected; 20 questions accepted, 21 rejected |
| AC-F02-05 | `rating` question with options → 422; unknown question type → 422 |
| AC-F02-06 | Owner list contains only own surveys; GET detail of another owner's survey → 403 with no survey data |
| AC-F02-07 | Respondent calling any F-02 endpoint → 403; anonymous → 401 |
| AC-F02-08 | Client-supplied `ownerId`, `status`, `mode` are ignored (survey is draft, owned by session user) |
| AC-F02-09 | UI: valid form saves and shows detail; invalid form shows inline errors and stores nothing; list shows empty state and loading/error states |
| AC-F02-10 | If saving any question/option fails, no survey rows remain (atomic) |

### Definition of Done (feature)
Product DoD plus: all TC-F02-* executed with output kept; TC-F02-03..07 and 09 written failing first; migration applies on an empty DB and on top of F-01; seed shows the four demo surveys; PR reviewed by A with a specific check (e.g. "verified rollback test fails if transaction removed").

### Completion evidence
| Item | Value |
|---|---|
| Failing-test commit | `99fb6a1` (TC-F02-03..07 unit tests written failing first) |
| Implementation commit | `681f435` |
| Test command / result / counts | Unit: `npm run test:unit` (5 passed for F-02, 100%)<br>API: `npm run test:api` (9 passed for F-02, 100%)<br>Total F-02 automated tests: 14 passed |
| TDD & Rollback verification | 1. **TC-F02-09 Exception Note:** API integration tests were committed alongside Express routes in `681f435`; verified that omitting the ownership guard in `ownerSurveys.js` returns HTTP 200, causing TC-F02-09 to fail, whereas with guard it returns HTTP 403 with zero survey fields.<br>2. **TC-F02-12 Rollback:** Verified that removing the `prisma.$transaction` wrapper leaves an orphaned survey row on 2nd question failure, failing the test; with transaction, zero rows remain.<br>3. **TC-F02-13, 14 (UI E2E):** Manual verification on client UI passed (empty, loading, validation error and create flow); cross-feature automated E2E consolidated under TEST-01 (Issue #7). |
| PR link, reviewer, review note | Pending review by Student A (Worapol360) |

### Revision history
| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial contract | – |

---

## F-03 Survey Publication

| Item | Value |
|---|---|
| Feature | F-03 |
| Issue / branch | #04 `feature/issue-04-sprint1-survey-publish` |
| Owner → reviewer | Student A → Student B |
| Linked requirements | FR-07, FR-08, BR-02 (visibility), BR-03, BR-04, BR-05, NFR-03 |
| Depends on | F-01, F-02 |
| Status | Planned (contract v0.1) |

> UI: `ui-spec.md` · API: `api-spec.md` · Tests (STS): `tests.md` §11 (F-03).

### Feature design
**Purpose.** Move a survey from `draft` to `published` (state transition) and make published surveys visible to respondents.

**State model.**

| From \ To | draft | published | closed |
|---|---|---|---|
| draft | – | **allowed** (owner) | rejected |
| published | rejected | rejected (already published) | *Sprint 2* |
| closed | rejected | rejected | rejected |

**Workflow.**
1. Owner opens own draft detail, clicks **Publish**, confirms.
2. API checks role, ownership, current status; re-validates definition (BR-05); sets `status='published'`, `published_at=now`.
3. Respondent opens `/surveys` and sees the survey; draft and closed surveys are not listed.

**Business rules.**
* BR-03: only the owner, only from `draft`.
* BR-04: guard `canModifyStructure(status)` is true only for `draft` (used by Sprint 2 edit; unit-tested now).
* BR-02 (visibility part): respondent list/detail include only `published` surveys; a draft/closed survey by id → 404 for respondents.
* BR-05 re-check at publish (defence in depth).

**Permissions.** Publish: owner of that survey. Respondent → 403; anonymous → 401; other owner → 403. List/detail of published surveys: respondent only (owner → 403).

**Failure / boundary cases.** publish twice; publish closed; publish other owner's; unknown id (404); concurrent double publish (second gets 409, `published_at` unchanged).

### Data specification
No new table. Uses `surveys.status`, `surveys.published_at`. Migration `003_survey_status_index` (optional index on `surveys(status)`); otherwise no change.

### Acceptance criteria
| AC | Criterion |
|---|---|
| AC-F03-01 | Owner publishes own draft → 200, `status='published'`, `published_at` set, persisted (visible on re-GET) |
| AC-F03-02 | Publishing an already published survey → 409 `INVALID_STATE_TRANSITION`; `published_at` unchanged |
| AC-F03-03 | Publishing a `closed` survey → 409; status unchanged |
| AC-F03-04 | Owner publishing another owner's survey → 403; status unchanged |
| AC-F03-05 | Respondent publishing → 403; anonymous → 401 |
| AC-F03-06 | Respondent list contains published surveys only (draft and closed excluded); respondent GET of a draft/closed survey → 404 with no survey data |
| AC-F03-07 | Domain guard allows structure modification only for status `draft` |
| AC-F03-08 | Publishing a survey whose definition violates BR-05 is rejected (422) and stays draft |
| AC-F03-09 | UI: Publish button visible only for draft, confirmation shown, badge updates after publish; published survey appears in respondent list; empty/loading/error states present |

### Definition of Done (feature)
Product DoD plus: TC-F03-01..05 written failing first (TDD evidence kept for TC-F03-02 and 05); transition table documented in code comments and matches §1; PR reviewed by B with a specific check (e.g. "tried publish on closed seed survey, got 409").

### Completion evidence
| Item | Value |
|---|---|
| Failing-test commit | |
| Implementation commit | |
| Test command / result / counts | |
| PR link, reviewer, review note | |

### Revision history
| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial contract | – |

---

## F-04 Response Submission with Duplicate Prevention

| Item | Value |
|---|---|
| Feature | F-04 |
| Issue / branch | #05 `feature/issue-05-sprint1-response-submit` |
| Owner → reviewer | Student B → Student A (pair on tests) |
| Linked requirements | FR-09, FR-10, BR-01, BR-02, BR-06, BR-07, BR-08, BR-09, BR-10, NFR-03, NFR-04, NFR-05, NFR-09 |
| Depends on | F-01, F-03 |
| Status | Planned (contract v0.1) |

> UI: `ui-spec.md` · API: `api-spec.md` · Tests (STS): `tests.md` §11 (F-04).

### Feature design
**Purpose.** A respondent answers a published survey once. This is the core business-rule feature of Sprint 1.

**Workflow.**
1. Respondent opens `/surveys`, sees survey with "answered" marker if already responded.
2. Opens `/surveys/:id`, answers every question, submits.
3. API checks role, survey status, duplicate, answer validity; stores `responses` + `answers` in **one transaction**; `respondent_id` = session user.
4. UI shows confirmation (`/responses/:id`) with the saved answers.

**Business rules.**
* BR-01: one response per (survey, respondent); DB `UNIQUE(survey_id, respondent_id)`; unique-violation → 409 `DUPLICATE_RESPONSE`.
* BR-02: survey must be `published`; draft/closed → 409 `SURVEY_NOT_OPEN`; unknown id → 404.
* BR-06: exactly one answer per question of that survey; `single_choice` → `optionId` of that question; `rating` → integer 1–5.
* BR-10: any logged-in respondent is eligible.
* BR-07: only the response's respondent can read it; owners cannot read raw responses.
* BR-09: stored identified; UI says "Your response", never "anonymous".
* Client-sent `respondentId` ignored.

**Permissions.** Submit: respondent only (owner 403, anonymous 401). Read response by id: its respondent only (other respondent 403, owner 403).

**Failure / boundary cases.** second submission; 5 parallel submissions; draft/closed/unknown survey; missing answer; extra answer; duplicate answer for one question; question from another survey; option of another question; rating 0, 1, 5, 6, 3.5, "a"; DB failure after response row insert.

### Data specification
Migration `004_responses_answers`: `responses` with **`UNIQUE(survey_id, respondent_id)`**, `answers` with `UNIQUE(response_id, question_id)`, `CHECK (option_id IS NULL) <> (rating_value IS NULL)`, `CHECK rating_value BETWEEN 1 AND 5`, FKs per SDS §4.

### Acceptance criteria
| AC | Criterion |
|---|---|
| AC-F04-01 | Respondent submits a valid response to a published survey → 201; one response row and one answer row per question persisted; `respondent_id` = session user |
| AC-F04-02 | `GET /api/responses/{id}` by the same respondent returns the saved answers equal to those submitted |
| AC-F04-03 | A second submission by the same respondent to the same survey → 409 `DUPLICATE_RESPONSE`; still exactly one response stored |
| AC-F04-04 | 5 parallel identical submissions → exactly one 201, the others 409; exactly one response row |
| AC-F04-05 | Draft or closed survey → 409 `SURVEY_NOT_OPEN`; unknown survey → 404; nothing stored |
| AC-F04-06 | Missing answer for any question → 422 naming the question; nothing stored |
| AC-F04-07 | Rating 1 and 5 accepted; 0, 6, 3.5, `"a"` rejected with 422 |
| AC-F04-08 | Option from another question or survey, unknown question id, or two answers for one question → 422; nothing stored |
| AC-F04-09 | Owner submitting → 403; anonymous → 401; nothing stored |
| AC-F04-10 | Respondent B reading respondent A's response → 403 with no answer data; owner reading a raw response → 403 |
| AC-F04-11 | Client-sent `respondentId` is ignored; stored respondent is the session user |
| AC-F04-12 | If saving an answer fails, no response row remains (atomic) |
| AC-F04-13 | UI: respondent can answer and sees confirmation with saved answers; validation errors shown per question; already-answered survey shows disabled form; list shows "Answered" marker |

### Definition of Done (feature)
Product DoD plus: TC-F04-03, 04, 05, 07, 10, 12 written failing first (TDD evidence for TC-F04-03 and TC-F04-12 kept for Part F); concurrency test run 20 times without flake; the duplicate guard verified to work through the DB constraint (the pre-check can be removed in a local experiment and TC-F04-04 still passes); PR reviewed by A with a specific check.

### Completion evidence
| Item | Value |
|---|---|
| Failing-test commit | |
| Implementation commit | |
| Test command / result / counts | |
| PR link, reviewer, review note | |

### Revision history
| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial contract | – |

---

## F-05 Owner Aggregate Summary

| Item | Value |
|---|---|
| Feature | F-05 |
| Issue / branch | #06 `feature/issue-06-sprint1-summary` |
| Owner → reviewer | Student A → Student B |
| Linked requirements | FR-11, BR-07, NFR-03, NFR-09 |
| Depends on | F-01, F-04 |
| Status | Planned (contract v0.1) |

> UI: `ui-spec.md` · API: `api-spec.md` · Tests (STS): `tests.md` §11 (F-05).

### Feature design
**Purpose.** The Survey Owner reads aggregate results of their own survey without seeing individual responses.

**Workflow.** Owner opens survey detail → **View summary** → `/owner/surveys/:id/summary` shows response count and, per question, aggregates.

**Aggregation rules.**
* `responseCount` = number of responses for the survey.
* `single_choice`: for each option `count` and `percent = count / responseCount × 100`, rounded to 1 decimal; options with zero votes are listed; percentages sum to 100 ± 0.1 per rounding (not forced).
* `rating`: `distribution` for values 1–5 (zeros included), `average` rounded to 2 decimals, `null` when no responses.
* No responses: `responseCount = 0`, all counts 0, percent 0, average `null` (HTTP 200).
* Summary is allowed for any status of an owned survey.

**Privacy (BR-07).** The body contains no respondent id, name, email, response id or per-response answer list.

**Permissions.** Owner of that survey only; other owner → 403; respondent → 403; anonymous → 401.

**Failure / boundary cases.** zero responses; one response; unknown survey (404); another owner's survey; respondent calling.

### Data specification
No schema change. Aggregates are computed from `responses`/`answers` by grouped queries and a pure aggregation function in the domain layer.

### Acceptance criteria
| AC | Criterion |
|---|---|
| AC-F05-01 | For a fixture of 3 responses, `responseCount` and every option count/rating distribution equal the expected values |
| AC-F05-02 | Option percentages are `count / responseCount × 100` rounded to 1 decimal; zero-vote options are listed |
| AC-F05-03 | Rating average is the mean rounded to 2 decimals (e.g. ratings 3, 4, 5 → 4.00) |
| AC-F05-04 | Survey with no responses → 200, counts 0, percent 0, average `null` |
| AC-F05-05 | Other owner → 403; respondent → 403; anonymous → 401; none receive summary data |
| AC-F05-06 | Summary JSON contains no respondent identifiers and no per-response answer data |
| AC-F05-07 | After a new response is submitted, the summary count increases by one and reflects its answers (persistence journey) |
| AC-F05-08 | UI: summary page shows counts/percent/average; empty, loading and error states present |

### Definition of Done (feature)
Product DoD plus: aggregation function covered by unit tests with the fixture above; TC-F05-06 and 07 written failing first; PR reviewed by B with a specific check (e.g. "recomputed percentages by hand for the fixture").

### Completion evidence
| Item | Value |
|---|---|
| Failing-test commit | |
| Implementation commit | |
| Test command / result / counts | |
| PR link, reviewer, review note | |

### Revision history
| Version | Date | Change | Reason |
|---|---|---|---|
| v0.1 | 2026-11-10 | Initial contract | – |
