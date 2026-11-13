# Feature Inventory

Version v0.1 – 2026-11-10. Requirement IDs refer to `srs.md`.

## 1. Sprint 1 features

| ID | Feature | Short description | Requirements | Depends on | Sprint | GitHub Issue / Branch | Owner → Reviewer |
|---|---|---|---|---|---|---|---|
| F-01 | Authentication, Session and Role-Based Access | Login, logout, current user, session lifecycle, password hashing, role guard, seed accounts, project skeleton/migrations/test harness, health endpoint | FR-01, FR-02, FR-03, FR-04, BR-08, NFR-01, NFR-02, NFR-03, NFR-06, NFR-08, NFR-10 | DOC-01 | 1 | #02 `feature/issue-02-sprint1-auth` | A → B |
| F-02 | Survey Creation with Questions | Owner creates a draft survey with single-choice and rating questions; lists/opens own surveys | FR-05, FR-06, BR-05, BR-08, BR-09, NFR-03, NFR-05, NFR-09 | F-01 | 1 | #03 `feature/issue-03-sprint1-survey-create` | B → A |
| F-03 | Survey Publication | Owner publishes own draft (state transition); respondents see only published surveys | FR-07, FR-08, BR-02 (visibility), BR-03, BR-04, BR-05, NFR-03 | F-01, F-02 | 1 | #04 `feature/issue-04-sprint1-survey-publish` | A → B |
| F-04 | Response Submission with Duplicate Prevention | Respondent answers a published survey; validation; DB-level duplicate prevention; confirmation; view own response | FR-09, FR-10, BR-01, BR-02, BR-06, BR-07, BR-08, BR-09, BR-10, NFR-03, NFR-04, NFR-05, NFR-09 | F-01, F-03 | 1 | #05 `feature/issue-05-sprint1-response-submit` | B → A (pair on tests) |
| F-05 | Owner Aggregate Summary | Owner views counts, percentages, rating distribution/average of own survey | FR-11, BR-07, NFR-03, NFR-09 | F-01, F-04 | 1 | #06 `feature/issue-06-sprint1-summary` | A → B |

## 2. Sprint 1 process and system responsibilities

| ID | Responsibility | Description | Requirements | Where established / verified |
|---|---|---|---|---|
| DOC-01 | Specification & planning | SRS, features, traceability, system SDS, sprint plan, feature contracts, STS, DoD | all baseline | Issue #01, branch `docs/issue-01-sprint1-specification` |
| SYS-01 | Project skeleton, DB migrations, seed | Created in F-01; extended by each feature's migration | NFR-08 | F-01, TC-F01-11, TC-INT-03 |
| SYS-02 | Test harness | Unit, API/DB integration and E2E runners, test DB reset, clock control | NFR-06, NFR-08 | F-01 |
| TEST-01 | Sprint 1 integration & E2E testing | Cross-feature API journey, authorization matrix, E2E journeys | NFR-01, NFR-03, NFR-04, NFR-06, NFR-07, NFR-09 | Issue #07, branch `test/issue-07-sprint1-integration-e2e` |
| SYS-03 | Delivery: Docker, CI/CD, GCP | Container image, CI on PRs, deploy from `main`, persistence | NFR-08, NFR-10 | Lab 5 (due 2026-11-15); design in `system-sds.md` §11 |

## 3. Later-sprint features (allocated now, contracts elaborated later)

| ID | Feature | Requirements | Depends on | Sprint |
|---|---|---|---|---|
| F-06 | Draft survey management (edit, delete, duplicate) | FR-12, BR-04 | F-02, F-03 | 2 |
| F-07 | Additional question types (free-text, multi-select) | FR-14, BR-05, BR-06 | F-02, F-04, F-05 | 2 |
| F-08 | Close survey | FR-13, BR-11, BR-02 | F-03 | 2 |
| F-09 | Eligibility control | FR-15, BR-10 (replaced) | F-04, F-08 | 2 |
| F-10 | Raw response access policy and viewer | FR-16, BR-07 (revised) | F-04, F-05 | 2 |
| F-11 | Respondent response history | FR-17 | F-04 | 2 |
| F-12 | Anonymous mode with identity/answer separation | FR-18, BR-12, NFR-12 | F-04, F-10 | 3 |
| F-13 | CSV export | FR-19 | F-10, F-12 | 3 |
| F-14 | Advanced analysis and filtering | FR-20, NFR-11 | F-05, F-07 | 3 |
| F-15 | Hardening: usability, regression, error handling | NFR-07, NFR-09, NFR-11 | all | 3 |

## 4. Feature sizing rationale (Sprint 1)

| Feature | Approx. AC | Approx. tests | Why a separate feature |
|---|---|---|---|
| F-01 | 11 | 15 | Foundation everything depends on; own state (sessions) |
| F-02 | 10 | 14 | Data-entry validation rules (BR-05) and ownership |
| F-03 | 9 | 11 | Clean state machine; good TDD material |
| F-04 | 13 | 17 | Core rules BR-01/02/06, concurrency, privacy |
| F-05 | 8 | 9 | Computation + privacy of aggregates |
