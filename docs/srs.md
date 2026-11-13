# Software Requirements Specification (SRS)

| Item | Value |
|---|---|
| Product | **FeedbackLoop** *(placeholder name, rename as you wish)* |
| Theme | 10 – Review, Feedback, and Survey System |
| Context | Department course and teaching feedback surveys |
| Team | `<Student A name / ID>`, `<Student B name / ID>` |
| Version | v0.1 – 2026-11-10 (baseline, branch `docs/issue-01-sprint1-specification`) |
| Related | `features.md`, `traceability.md`, `system-sds.md`, `sprints/plan.md`, `sprints/sprint-1/feature-specs.md, api-spec.md, ui-spec.md, tests.md` |

---

## 1. Stakeholder problem and context

A university department collects feedback on courses, lecturers and activities with ad-hoc tools (paper forms, generic form services, chat polls). Problems: staff cannot control who may answer or how often, students can answer the same form many times, results are hand-counted, and nobody can tell which data is private.

**FeedbackLoop** lets a staff member (Survey Owner) define a short survey, publish it, collect validated responses from logged-in students (Respondents), and read an aggregate summary. The product is built over three sprints. Sprint 1 delivers an *identified* survey workflow end to end.

## 2. Actors and responsibilities

| Actor | Description | Responsibilities |
|---|---|---|
| **Survey Owner** (role `owner`) | Lecturer or department staff member | Create surveys, publish them, view aggregate results of **their own** surveys |
| **Respondent** (role `respondent`) | Student | View published surveys, submit one response per survey, view their **own** response |
| **Anonymous visitor** | Not logged in | May only log in and call the public health endpoint |
| System / Seed | Seed procedure | Creates demo accounts and demo surveys (synthetic data only) |

One account has exactly one role. Administrator functions are out of scope.

## 3. Product scope

### 3.1 In scope (whole product)
Authentication and role-based access; survey definition with question types; publication and closing; response eligibility control; identified and anonymous response modes; duplicate-response prevention; aggregate analysis; raw-data access policy; CSV export; deployment on GCP.

### 3.2 Sprint 1 scope
Login/logout/current user, two roles, seeded accounts; create a draft survey (single-choice and rating questions); publish it; submit a validated response with duplicate prevention; view own response; owner aggregate summary; backend authorization for all of these.

### 3.3 Explicit exclusions (whole product)
Self-registration, password recovery, email verification, multi-role accounts, administrator console, real email/SMS notifications, external APIs, payment, mobile native apps, multi-language UI, real student data.

### 3.4 Deferred (not in Sprint 1)
Free-text and multi-select questions, editing/deleting drafts, closing surveys, eligibility lists, raw-data viewing, anonymous mode, CSV export, advanced analysis (see `sprints/plan.md`).

## 4. Functional requirements (FR)

| ID | Requirement (observable behaviour) | Sprint |
|---|---|---|
| FR-01 | A user can log in with email and password; valid credentials start a session, invalid credentials are rejected with a generic error. | 1 |
| FR-02 | A logged-in user can log out; the session can no longer be used afterwards. | 1 |
| FR-03 | The system returns the identity (id, display name, role) of the current session user. | 1 |
| FR-04 | Every protected operation is allowed only for the roles and records defined in the role/permission matrix, enforced on the backend. | 1 |
| FR-05 | A Survey Owner can create a survey in `draft` status with a title, optional description and an ordered list of questions of type `single_choice` (with options) or `rating` (1–5). | 1 |
| FR-06 | A Survey Owner can list and open the surveys they own. | 1 |
| FR-07 | A Survey Owner can publish their own draft survey (`draft → published`). | 1 |
| FR-08 | A Respondent can list published surveys and open one for answering. | 1 |
| FR-09 | A Respondent can submit one response containing an answer to every question of a published survey and receives a confirmation. | 1 |
| FR-10 | A Respondent can retrieve their own submitted response. | 1 |
| FR-11 | A Survey Owner can view an aggregate summary (response count, per-option counts and percentages, rating distribution and average) of their own survey. | 1 |
| FR-12 | A Survey Owner can edit, delete or duplicate a draft survey. | 2 |
| FR-13 | A Survey Owner can close a published survey. | 2 |
| FR-14 | Additional question types: free-text and multi-select. | 2 |
| FR-15 | A Survey Owner can restrict who may respond (eligibility list/group). | 2 |
| FR-16 | A Survey Owner can view raw responses of identified surveys under the raw-data access policy. | 2 |
| FR-17 | A Respondent can list their submitted responses. | 2 |
| FR-18 | A Survey Owner can create a survey in anonymous mode with identity/answer separation. | 3 |
| FR-19 | A Survey Owner can export results as CSV. | 3 |
| FR-20 | A Survey Owner can filter and compare results (by question, date range). | 3 |

## 5. Business rules (BR)

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | A respondent may submit **at most one** response per survey. Enforced by a database uniqueness constraint so that concurrent requests cannot create two. | 1 |
| BR-02 | A response is accepted only for a survey in status `published`. Responses to `draft` or `closed` surveys are rejected. | 1 |
| BR-03 | Only the owner of a survey may publish it, and only from status `draft`. Any other transition is rejected. | 1 |
| BR-04 | The question structure of a survey may be modified only while it is `draft`. | 1 (domain guard) / 2 (edit endpoint) |
| BR-05 | A survey definition is valid only if: title non-empty (≤ 200 chars); 1–20 questions; question text non-empty (≤ 500 chars); `single_choice` has 2–10 options; `rating` has no options. | 1 |
| BR-06 | A response is valid only if: it has exactly one answer for each question of that survey; a `single_choice` answer references an option of that question; a `rating` answer is an integer 1–5. | 1 |
| BR-07 | Data visibility: an owner sees only **aggregates** of their own surveys (no raw answers in Sprint 1); a respondent sees only their own response. | 1 |
| BR-08 | Only role `owner` may manage surveys and only role `respondent` may submit responses. Ownership is derived from the session, never from client-supplied ids or roles. | 1 |
| BR-09 | Sprint 1 surveys are in **identified** mode: every response is linked to its respondent. The UI/API must not call such responses "anonymous". | 1 |
| BR-10 | Eligibility (Sprint 1 assumption): every logged-in respondent may answer any published survey. | 1 |
| BR-11 | A survey can be closed only by its owner from `published`; closed surveys reject responses. | 2 |
| BR-12 | Anonymous mode must store answers without any link to respondent identity, while still preventing duplicate participation (documented privacy design). | 3 |

## 6. Non-functional requirements (NFR)

| ID | Requirement and measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | A request without a valid session to any protected endpoint is rejected with HTTP 401 and a body containing no private data. | Table-driven API test over all protected endpoints (TC-INT-01) | 1 |
| NFR-02 | Passwords are stored only as salted adaptive hashes (argon2id or bcrypt, cost ≥ 10); no plaintext or reversible storage; hashes never appear in any API response. | DB inspection test + response-key test (TC-F01-09, TC-F01-14) | 1 |
| NFR-03 | 100% of protected endpoints enforce role and ownership on the backend; violations give HTTP 403 and no resource data. | Authorization matrix test (TC-INT-01) + per-feature tests | 1 |
| NFR-04 | Under 5 concurrent identical submissions from one respondent to one survey, exactly 1 response row exists afterwards. | Concurrency API test (TC-F04-04) | 1 |
| NFR-05 | Saving a response (response + all answers) and creating a survey (survey + questions + options) are atomic: after an injected failure no partial rows remain. | Rollback tests (TC-F02-12, TC-F04-15) | 1 |
| NFR-06 | Sessions expire after `SESSION_TTL_MINUTES` (default 60); expired or logged-out sessions are rejected with 401; logout revokes the session server-side. | TC-F01-06, TC-F01-08, TC-INT-04 | 1 |
| NFR-07 | Error responses contain only error code, a safe message and optional field errors; no stack trace, SQL, file path or secret. | Induced-error test (TC-INT-06) | 1 |
| NFR-08 | From a clean clone, a developer can set up, migrate, seed, run and test the app using only the commands in README (≤ 6 commands); seed is idempotent; all configuration is read from environment variables; no real secret in Git. | Manual clean-clone run (TC-MAN-01), TC-F01-11, TC-INT-03 | 1 |
| NFR-09 | Every screen that loads data has loading, empty and error states; validation errors appear next to the field. | E2E tests + manual checklist (TC-MAN-02) | 1 |
| NFR-10 | The app is deployable as a container: stateless application tier (sessions and data in the database), configuration only via environment, health endpoint `GET /api/health`, build identifies commit via `APP_VERSION`. | Design in Sprint 1; verified in Lab 5 | 1 → Lab 5 |
| NFR-11 | Summary of a survey with 500 responses × 10 questions returns within 2 s (p95, local environment). | Performance test | 3 |
| NFR-12 | In anonymous mode no query or API can join an answer to a respondent identity. | Schema review + negative test | 3 |

## 7. Assumptions

| ID | Assumption |
|---|---|
| A-01 | Demo users are synthetic; seed passwords come from an environment variable and are shared privately. |
| A-02 | Survey sizes are small (≤ 20 questions, ≤ a few hundred responses); pagination is not needed in Sprint 1. |
| A-03 | One Postgres-class relational database is available locally and on GCP (any server database with unique constraints and transactions is acceptable). |
| A-04 | A seeded `closed` survey is acceptable evidence for the "closed survey rejected" rule in Sprint 1 (to confirm with TA, see Q-02). |
| A-05 | Time is stored in UTC. |

## 8. Decisions

| ID | Decision | Rationale | Status |
|---|---|---|---|
| DEC-01 | Context = department course feedback surveys; roles Owner = staff, Respondent = student. | Concrete context for rules and demo data. | Resolved |
| DEC-02 | Technology stack is **not fixed yet**; the design is stack-neutral and records the final stack in `system-sds.md` §2 before F-01 starts. | Group app stack not confirmed. | Open until Q-01 |
| DEC-03 | Sessions are server-side: opaque random token, stored hashed in the `sessions` table, sent in an HttpOnly cookie. | Revocable logout, stateless app tier (good for Cloud Run). | Resolved |
| DEC-04 | Sprint 1 question types: `single_choice`, `rating` (fixed scale 1–5). | Simple exact aggregation. | Resolved |
| DEC-05 | HTTP semantics: 401 unauthenticated, 403 forbidden (role or ownership), 404 not found/not visible, 409 state/duplicate conflict, 422 validation. | Consistent, testable. | Resolved |
| DEC-06 | All questions are required in Sprint 1. | Fewer validation branches; optional questions later. | Resolved |
| DEC-07 | Only `identified` mode exists in Sprint 1; the mode column is constrained to that value. | Avoid mislabelled anonymity. | Resolved |
| DEC-08 | Survey status enum is `draft | published | closed` from the start; `closed` is reachable only through seed data in Sprint 1. | Lets BR-02 be tested fully without the close feature. | Resolved |
| DEC-09 | Owners see aggregates only in Sprint 1. | Raw-data policy undefined yet. | Resolved |
| DEC-10 | Eligibility: any logged-in respondent (BR-10). | Advanced eligibility deferred to Sprint 2. | Resolved |
| DEC-11 | ID scheme: `FR/BR/NFR`, `F-xx`, `AC-Fxx-nn`, test cases `TC-Fxx-nn`, `TC-INT-nn`, `TC-E2E-nn`, `TC-MAN-nn`. GitHub issue `[TEST-01]` names a work item, not a test case. | Avoid ID collision. | Resolved |
| DEC-12 | Ownership violations return 403 without resource data. | Simple, consistent rule. | Resolved |

## 9. Questions

| ID | Question | Status / resolution |
|---|---|---|
| Q-01 | Final technology stack of the group app? | **Open** – must be resolved and written in `system-sds.md` §2 before starting F-01. |
| Q-02 | Does the TA accept a seeded `closed` survey for the Sprint 1 "closed survey" rejection? | **Open** – ask TA; fallback: test at domain level and add close in Sprint 2. |
| Q-03 | May an owner answer another owner's survey? | Resolved: no (BR-08). |
| Q-04 | Are respondents' identities visible to owners? | Resolved for Sprint 1: not visible (BR-07, DEC-09). Revisit in Sprint 2 raw-data policy. |

## 10. Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 | 2026-11-10 | `<A>`, `<B>` | Initial baseline |
