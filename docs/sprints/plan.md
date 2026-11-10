# Three-Sprint Plan

Version v0.1 – 2026-11-10.

## 1. Sprint overview

| Sprint | Goal | Features | Dependencies | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| **1** | Small working domain slice with authentication, permissions and persistence: create → publish → respond → summarise an *identified* survey | DOC-01, F-01, F-02, F-03, F-04, F-05, TEST-01 | DOC-01 → F-01 → F-02 → F-03 → F-04 → F-05 → TEST-01 | Release on `main` with tag; all Sprint 1 AC verified; local setup documented | Deliverable 1 (extended to 15 Nov, with Lab 5) |
| **2** | Core expansion: complete survey lifecycle and richer questions | F-06, F-07, F-08, F-09, F-10, F-11 (+ Lab 5 SYS-03 maintained) | Sprint 1 release; F-08 before F-09; F-10 before Sprint 3 | Deployed integrated increment; contracts + tests for each feature | Deliverable 2 (29 Nov) |
| **3** | Remaining features, integration and hardening | F-12, F-13, F-14, F-15 | F-10 before F-12/F-13 | Complete product, regression suite passing, remaining-work list empty or disclosed | Progress 29 Nov, complete by 13 Dec |

## 2. Sprint 1 scope

**Included:** authentication with two roles and seeded accounts; draft survey creation (single-choice, rating); publication; response submission with duplicate prevention and validation; own-response retrieval; owner aggregate summary; backend authorization; unit, API/DB and E2E tests; local setup docs.

**Excluded from Sprint 1 (and why):**

| Deferred item | Sprint | Reason |
|---|---|---|
| Edit/delete/duplicate drafts | 2 | Not needed for the vertical slice; BR-04 guard is in place |
| Close survey, eligibility lists | 2 | Need new state transition and policy; closed handled by seed |
| Free-text, multi-select | 2 | Aggregation is harder; two types suffice |
| Raw data view | 2 | Access policy must be designed first |
| Anonymous mode | 3 | Needs privacy design; risk of mislabelling (DEC-07) |
| CSV export, advanced analysis | 3 | Depend on raw-data policy |

**Feasibility:** 5 features, ~51 AC, 66 feature tests plus 13 system tests. Work is parallel after F-01 (F-02/F-03 and F-04 tests/specs can start together using seed surveys).

## 3. Issue and branch map (Sprint 1)

Branch flow: `main` (release) ← `sprint1-staging` (integration, from `main`) ← feature branches (from `sprint1-staging`). Feature PRs target `sprint1-staging`; when Sprint 1 is accepted, a release PR `sprint1-staging → main` is opened, reviewed, merged and tagged `v0.1.0-sprint1`.

| Order | Issue | Branch | Purpose | Owner → Reviewer | Labels |
|---|---|---|---|---|---|
| 0 | #01 [DOC-01] Sprint 1 Specification & Planning | `docs/issue-01-sprint1-specification` | Baseline docs and contracts (committed first) | A + B (pair) | `sprint1`, `docs` |
| 1 | #02 [F-01] Authentication, Session and Role-Based Access | `feature/issue-02-sprint1-auth` | Login, logout, current user, roles | A → B | `sprint1`, `feature` |
| 2 | #03 [F-02] Survey Creation with Questions | `feature/issue-03-sprint1-survey-create` | Create survey, questions | B → A | `sprint1`, `feature` |
| 3 | #04 [F-03] Survey Publication | `feature/issue-04-sprint1-survey-publish` | Publish, visibility | A → B | `sprint1`, `feature` |
| 4 | #05 [F-04] Response Submission with Duplicate Prevention | `feature/issue-05-sprint1-response-submit` | Respond, validate, no duplicates | B → A (pair on tests) | `sprint1`, `feature` |
| 5 | #06 [F-05] Owner Aggregate Summary | `feature/issue-06-sprint1-summary` | Summary | A → B | `sprint1`, `feature` |
| 6 | #07 [TEST-01] Sprint 1 Integration & E2E Testing | `test/issue-07-sprint1-integration-e2e` | Cross-feature and E2E tests | A + B (pair) | `sprint1`, `test` |

Lab 5 issues and PRs additionally carry the `lab5` label.

Sequencing:

```
DOC-01 ─► F-01 ─► F-02 ─► F-03 ─► F-04 ─► F-05 ─► TEST-01 ─► release PR
                   └─ F-03 spec/tests can start in parallel with F-02 using seed data
                                   └─ F-04 tests can be written (failing) while F-03 is in review
```

## 4. Work sharing (no permanent roles)

| Area | Student A | Student B |
|---|---|---|
| Documents | SRS (Part A), SDS auth/roles/config | Features + traceability (Part B), SDS data model/API |
| Pair | Sprint plan (Part D), cross-review of all documents | same |
| Features | F-01, F-03, F-05 (spec + tests + code) | F-02, F-04 (spec + tests + code) |
| Review | Reviews F-02, F-04 | Reviews F-01, F-03, F-05 |
| Pair work | F-04 tests (BR-01/concurrency), TEST-01, release PR, PDF assembly | same |

Each owner writes the feature's contract and failing tests first; the reviewer reviews contract, tests and diff. Authors never approve their own PRs; each review records a specific check or finding.

## 5. Spec-first history rule

1. Commit all contracts, STS and DoD on `docs/issue-01-sprint1-specification` and merge into `sprint1-staging` before any implementation branch starts.
2. In each feature branch: commit failing tests (`test: …`), then implementation (`feat: …`), then docs/evidence update. Keep commit IDs for Part F.
3. Contract changes after this point are new revision rows, never silent edits.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Stack undecided (Q-01) | Decide before F-01; record in `system-sds.md` §2 |
| Lab 5 due same day as Deliverable 1 | Finish TEST-01 early; Lab 5 starts from tagged release |
| F-04 is the heaviest feature | Pair on its tests; B owns, A co-writes |

## 7. Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| v0.1 | 2026-11-10 | `<A>`, `<B>` | Initial plan |
