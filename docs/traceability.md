# Requirements Traceability

Version v0.1 – 2026-11-10. Chain: **Requirement → Feature/Responsibility → Sprint → AC → Planned test**. The "Actual test / result" columns are filled in `sprints/sprint-1/tests.md` §6 after execution.

## 1. Functional requirements

| Requirement | Feature | Sprint | AC | Planned tests |
|---|---|---|---|---|
| FR-01 Login | F-01 | 1 | AC-F01-01, 02, 09 | TC-F01-01, 03, 04, 05, 12 |
| FR-02 Logout | F-01 | 1 | AC-F01-03, 08 | TC-F01-06, 13 |
| FR-03 Current user | F-01 | 1 | AC-F01-01 | TC-F01-02 |
| FR-04 Role-based access | F-01 (guard) + F-02..F-05 (enforcement) | 1 | AC-F01-07, AC-F02-07, AC-F03-05, AC-F04-09, AC-F05-05 | TC-F01-10, TC-F02-10, TC-F03-06, TC-F04-11, TC-F05-06, TC-INT-01 |
| FR-05 Create survey | F-02 | 1 | AC-F02-01..05, 08, 09, 10 | TC-F02-01..07, 11, 12, 13 |
| FR-06 List/open own surveys | F-02 | 1 | AC-F02-06 | TC-F02-02, 08, 09 |
| FR-07 Publish survey | F-03 | 1 | AC-F03-01..05, 09 | TC-F03-01..06, 11 |
| FR-08 List/open published surveys | F-03 | 1 | AC-F03-06 | TC-F03-07, 08 |
| FR-09 Submit response | F-04 | 1 | AC-F04-01, 03..09, 11..13 | TC-F04-01, 03..11, 14..17 |
| FR-10 View own response | F-04 | 1 | AC-F04-02, 10, 13 | TC-F04-02, 12, 13, 16 |
| FR-11 Aggregate summary | F-05 | 1 | AC-F05-01..14 | TC-F05-01..13, 15..22 |
| FR-12 Draft management | F-06 | 2 | planned | – |
| FR-13 Close survey | F-08 | 2 | planned | – |
| FR-14 More question types | F-07 | 2 | planned | – |
| FR-15 Eligibility | F-09 | 2 | planned | – |
| FR-16 Raw-data viewer | F-10 | 2 | planned | – |
| FR-17 Response history | F-11 | 2 | planned | – |
| FR-18 Anonymous mode | F-12 | 3 | planned | – |
| FR-19 CSV export | F-13 | 3 | planned | – |
| FR-20 Advanced analysis | F-14 | 3 | planned | – |

## 2. Business rules

| Requirement | Feature | Sprint | AC | Planned tests |
|---|---|---|---|---|
| BR-01 One response per respondent per survey | F-04 | 1 | AC-F04-03, 04 | TC-F04-03, 04, TC-INT-05 |
| BR-02 Only published accepts responses | F-03 (visibility), F-04 (rejection) | 1 | AC-F03-06, AC-F04-05 | TC-F03-07, 08, TC-F04-05 |
| BR-03 Publish only by owner, from draft | F-03 | 1 | AC-F03-01..04 | TC-F03-01..05 |
| BR-04 Structure modifiable only in draft | F-03 (guard), F-06 (endpoint) | 1 / 2 | AC-F03-07 | TC-F03-09 |
| BR-05 Valid survey definition | F-02, F-03 | 1 | AC-F02-02..05, AC-F03-08 | TC-F02-03..07, TC-F03-10 |
| BR-06 Valid response | F-04 | 1 | AC-F04-06, 07, 08 | TC-F04-06..10 |
| BR-07 Data visibility | F-04, F-05 | 1 | AC-F04-10, AC-F05-05, 06 | TC-F04-12, 13, TC-F05-06, 07 |
| BR-08 Role/ownership from session only | F-01..F-05 | 1 | AC-F02-08, AC-F04-09, 11 | TC-F02-11, TC-F04-11, 14 |
| BR-09 Identified mode | F-02, F-04 | 1 | AC-F02-01, AC-F04-01 | TC-F02-01, TC-F04-01 |
| BR-10 Eligibility = any logged-in respondent | F-04 | 1 | AC-F04-01 | TC-F04-01, TC-E2E-01 |
| BR-11 Close rules | F-08 | 2 | planned | – |
| BR-12 Anonymous separation | F-12 | 3 | planned | – |

## 3. Non-functional requirements

| Requirement | Feature / responsibility | Sprint (establish → verify) | AC | Planned tests |
|---|---|---|---|---|
| NFR-01 Unauthenticated rejected | F-01 + every feature; TEST-01 | 1 | AC-F01-04 | TC-F01-07, TC-INT-01 |
| NFR-02 Password hashing | F-01 | 1 | AC-F01-06 | TC-F01-09, 14 |
| NFR-03 Backend authorization | F-01..F-05; TEST-01 | 1 | AC-F01-07, AC-F02-06, 07, AC-F03-04, 05, AC-F04-10, AC-F05-05 | TC-F01-10, TC-F02-09, 10, TC-F03-05, 06, TC-F04-12, 13, TC-F05-06, TC-INT-01 |
| NFR-04 Concurrency uniqueness | F-04 | 1 | AC-F04-04 | TC-F04-04, TC-INT-05 |
| NFR-05 Atomic persistence | F-02, F-04 | 1 | AC-F02-10, AC-F04-12 | TC-F02-12, TC-F04-15 |
| NFR-06 Session lifecycle | F-01; TEST-01 | 1 | AC-F01-03, 05 | TC-F01-06, 08, TC-INT-04 |
| NFR-07 Safe errors | F-01 (error handler); TEST-01 | 1 | AC-F01-09 | TC-F01-05, TC-INT-06 |
| NFR-08 Reproducible setup | SYS-01, SYS-02 (F-01); TEST-01 | 1 | AC-F01-10 | TC-F01-11, TC-INT-03, TC-MAN-01 |
| NFR-09 UI states | F-02..F-05; TEST-01 | 1 | AC-F02-09, AC-F03-09, AC-F04-13, AC-F05-08, 10, 12 | TC-F02-13, 14, TC-F03-11, TC-F04-16, TC-F05-09, 16, 17, 21, 22, TC-MAN-02 |
| NFR-10 Deployability | F-01 (health, env config); SYS-03 | 1 design → Lab 5 verify | AC-F01-11 | TC-F01-15; Lab 5 checks C-01..C-06 |
| NFR-11 Summary performance | F-14 | 3 | planned | – |
| NFR-12 Anonymous privacy | F-12 | 3 | planned | – |

## 4. Coverage check

| Check | Result |
|---|---|
| Every FR/BR/NFR has a feature/responsibility and sprint | Yes (§1–3) |
| Every Sprint 1 requirement has ≥ 1 AC and ≥ 1 planned test | Yes |
| Requirements without elaborated AC/tests | FR-12..20, BR-11, BR-12, NFR-11, NFR-12 – planned for Sprints 2–3; contracts written before implementation of each feature |
| Requirements without owner feature | None |

## 5. Approved changes log

| Change ID | Date | Description | Approved by | Affected |
|---|---|---|---|---|
| CHG-00 | 2026-11-10 | Initial baseline created | Team | all |
| CHG-01 | 2026-11-14 | F-05 summary contract v0.2: largest-remainder percent rule, freshness (`generatedAt`, `Cache-Control: no-store`), Updated-at/Refresh and error/Retry UI, responsive layout with stable testids; AC-F05-02/08 revised, AC-F05-09..13 added, TC-F05-03/09 revised, TC-F05-10..13 and TC-F05-15..19 added, TC-F05-14 reserved | Team (issue #6) | `sprints/sprint-1/feature-specs.md`, `sprints/sprint-1/api-spec.md`, `sprints/sprint-1/ui-spec.md`, `sprints/sprint-1/tests.md`, FR-11, NFR-09 |
| CHG-02 | 2026-11-14 | F-05 verification hardening from review 2: contract v0.3 — AC-F05-14 added, AC-F05-10 and AC-F05-12 extended (retry variants, long option labels); TC-F05-20..22 added | Team (issue #6) | `sprints/sprint-1/feature-specs.md`, `sprints/sprint-1/ui-spec.md`, `sprints/sprint-1/tests.md`, FR-11, NFR-09 |

*(Add a row for each later change; never delete rows.)*
