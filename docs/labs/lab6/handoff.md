# FeedbackLoop Sprint 1 UAT Handoff (Lab 6, Part A)

Read this file together with `uat-cases.md` (same folder). Nothing else needs to be explained verbally: the cases give the steps and expected results, this file gives the version, accounts, setup, reset and reporting rules.

> Items written as `<<VERIFY: ...>>` are resolved from the repository before this file is final (see the commit that adds this file). No such marker may remain in the released version.

## 1. Teams and contacts

| Role | Team | Students |
|---|---|---|
| Product Team (author of this handoff) | FeedbackLoop | Worapol Saeku (`Worapol360`), `aranedlek` |
| UAT Team (executes the cases) | `<<UAT team name / students, filled when the partner is confirmed>>` | |

| Item | Value |
|---|---|
| Agreed contact channel | `<<channel, e.g. LINE group / email>>` |
| Agreed UAT session | `<<date and time>>` |
| Agreed defect-correction / re-test session | `<<date and time>>` |

## 2. Release under test

| Item | Value |
|---|---|
| Repository | https://github.com/Worapol360/cpe334-group-project (public) |
| Release tag | `v0.1.1-sprint1-uat` |
| Tag commit | `<<VERIFY: output of git rev-parse v0.1.1-sprint1-uat^{commit}>>` |
| Sprint 1 baseline release | `main` @ `cd3374869785089ed90546b00212d65ada054dfb` (release PR #15, content = `sprint1-staging` @ `0bc008c`) |
| Difference between baseline and tag | Documentation only: `README.md` was rewritten as the app-specific local-UAT guide and the original Lab 5 starter README was moved to `docs/labs/lab5-starter-kit-notes.md`; no application code or test changes. |
| Run mode | Local, as permitted by the TA (Lab 5 deployment was postponed). No deployed URL |
| Local addresses | Web app `http://localhost:5173`, API `http://localhost:8081`, database port `5433` |
| Contract | `docs/sprints/sprint-1/feature-specs.md` (AC-Fxx-nn) and `docs/sprints/sprint-1/tests.md` |

The UAT Team must record the tag and commit it actually ran (`git rev-parse HEAD`) in every result record. Acceptance applies only to that release. The Product Team will tell the UAT Team before changing anything that could affect testing (for example a fix release).

## 3. Accepted-for-test scope

In scope (delivered in Sprint 1, identified mode only):

| Feature | Behaviour |
|---|---|
| F-01 | Login, logout, session, role-based access |
| F-02 | Survey creation with single-choice and rating questions, owner list and detail |
| F-03 | Publication (draft to published only) and respondent visibility |
| F-04 | Response submission, one response per respondent, own-response read |
| F-05 | Owner aggregate summary (counts, percentages, rating distribution and average) |

Out of scope (not accepted and not to be reported as defects; Sprint 2 and 3): editing, deleting or duplicating drafts, closing a survey, free-text and multi-select questions, eligibility control, raw-response viewer for owners, response history, anonymous mode, CSV export, advanced analysis, login rate limiting, CSRF token, pagination.

The `closed` status exists only through seed data (`Past Semester Survey`); there is no close action in Sprint 1.

## 4. Accounts

All data is synthetic. Credentials are **not** written in Git or in the PDF.

| Label | Email | Role |
|---|---|---|
| owner1 | `owner1@example.test` | Survey Owner |
| owner2 | `owner2@example.test` | Survey Owner |
| respondent1 | `respondent1@example.test` | Respondent |
| respondent2 | `respondent2@example.test` | Respondent |

The password of every account is the `SEED_PASSWORD` value in `server/.env`. The Product Team sends the value (or a ready `.env`) to the UAT Team through the private course handoff channel only. The UAT Team may also choose its own `SEED_PASSWORD` when it creates its own `server/.env`; then no secret needs to be shared. Never paste the password in screenshots, logs, issues or the PDF.

## 5. Setup, data reset and cleanup

Prerequisites: Git, Node.js `24` (README "Prerequisites"), Docker Desktop, PowerShell (commands below are for Windows PowerShell).

### 5.1 First-time setup

```powershell
git clone https://github.com/Worapol360/cpe334-group-project.git
cd cpe334-group-project
git checkout v0.1.1-sprint1-uat
git rev-parse HEAD            # record this value in your results
```

```powershell
npm install --prefix server
npm install --prefix client
Copy-Item server\.env.example server\.env
# edit server\.env: choose your own SEED_PASSWORD and set PORT=8081 (DATABASE_URL and DATABASE_URL_TEST must use localhost:5433, DB host port 5433)
docker compose --env-file server/.env up -d db
# wait until docker compose --env-file server/.env ps shows the db as healthy
cd server; npx prisma generate; cd ..
npm run db:migrate --prefix server
npm run db:seed --prefix server
```

### 5.2 Start the system

Start the database first, then start the API and the web app in two separate terminals:

```powershell
docker compose --env-file server/.env up -d db
npm run dev --prefix server
npm run dev --prefix client
```

The database uses host port 5433, the API listens on http://localhost:8081, and the web app (Vite dev server) on http://localhost:5173.

Check before testing: `http://localhost:8081/api/health` returns `status` and `version`, and the web app at `http://localhost:5173` shows the login page.

### 5.3 Reset to a fresh database

Run this before the first case and any time the case sequence has to start again. It deletes all data in the **development** database only.

Stop the API and client dev servers (Ctrl+C), then run the reset procedure from README "Reset to a clean state":

```powershell
docker compose --env-file server/.env down -v
docker compose --env-file server/.env up -d db
npm run db:migrate --prefix server
cd server; npx prisma generate; cd ..
npm run db:seed --prefix server
```

`down -v` removes the `postgres_data` volume, so `up -d db` starts an empty database; wait for the db to be **healthy** before migrate, generate and seed. Confirmed from `server/src/persistence/seed.js`: the seed creates exactly 4 users (`owner1`, `owner2`, `respondent1`, `respondent2`) and exactly the 4 surveys in the table below (titles, statuses and owners as listed).

Expected state after reset:

| Key | Title | Status | Owner |
|---|---|---|---|
| S-DRAFT | Quarterly Team Feedback | draft | owner1 |
| S-PUB | Course CPE334 Feedback | published | owner1 |
| S-CLOSED | Past Semester Survey | closed | owner1 |
| S-OWNER2-DRAFT | Owner Two Private Survey | draft | owner2 |

No responses exist after reset.

### 5.4 Cleanup after UAT

Stop the API and web app (Ctrl+C), then `docker compose --env-file server/.env down` (add `-v` only if you also want to delete the database volume). Delete your local `server/.env`. The UAT Team keeps its screenshots and notes, not the Product Team's secrets.

### 5.5 Special step in UAT-06

UAT-06 restarts the database container and the API to prove persistence. Use the commands written in that case. If Docker is not available the case is BLOCKED (not PASS) with the reason recorded.

## 6. Case sequence and independence

Run from a freshly reset database in this order. Cases are not independent: a dependent case after a FAIL or BLOCKED dependency is recorded as BLOCKED.

| Order | Case | Category | Depends on |
|---|---|---|---|
| 1 | UAT-07 | Authentication / access foundation | none |
| 2 | UAT-01 | Normal domain journey | none (creates "UAT Survey A") |
| 3 | UAT-02 | Business rule: one response per respondent | none (uses seeded S-PUB) |
| 4 | UAT-03 | Business rule / boundary: validation | none |
| 5 | UAT-04 | Business rule: status and visibility | UAT-01 |
| 6 | UAT-05 | Forbidden role / ownership | UAT-01, UAT-02 |
| 7 | UAT-06 | State / history / persistence | UAT-01 |

The four categories required by Lab 6 are all covered (normal: UAT-01; business rule/boundary: UAT-02 to UAT-04; forbidden: UAT-05; state/persistence: UAT-06). To repeat a case on its own, reset first and run its dependencies.

## 7. Recording results

For every case the UAT Team records:

| Field | Content |
|---|---|
| Case ID | for example UAT-01 |
| Tester name and team | both students take part; name who ran and who observed |
| Date and time | local time of the run |
| Tested version | tag and `git rev-parse HEAD` |
| Inputs used | the synthetic data actually entered |
| Actual result | what was observed, in the tester's own words. Do not copy the expected result |
| Result | PASS, FAIL or BLOCKED (with reason). BLOCKED is not a pass |
| Evidence | screenshot or text excerpt with an evidence ID |

For rejected operations (UAT-03, UAT-04, UAT-05) show the rejection **and** check that the protected state was not changed or disclosed (the cases include the check step). A normal-journey screenshot (UAT-01) and a negative/access screenshot (UAT-05) are required.

## 8. Reporting findings

Report every FAIL as a finding to the Product Team through the agreed channel and as a GitHub Issue labelled `lab6` and `uat-finding` in the repository above (the Product Team can create the Issue if the UAT Team has no access). One finding per Issue.

| Field | Content |
|---|---|
| Issue ID | GitHub Issue number |
| Product team / reporter | FeedbackLoop / name of UAT tester |
| Tested version | tag and commit |
| Linked case and requirement | for example UAT-05 step 6, AC-F02-06 |
| Preconditions and data | accounts, surveys, ids used |
| Reproduction steps | numbered, starting from a reset database |
| Expected result | from the case or the contract |
| Actual result | observed behaviour |
| Severity | Critical, Major or Minor, with the user impact as reason |
| Evidence | screenshot or log excerpt |

Severity guide (by user impact):

| Severity | Meaning | Sprint 1 acceptance |
|---|---|---|
| Critical | Data of another user is disclosed or changed, a forbidden operation succeeds, data is lost or corrupted, or the app cannot be used | Blocks. Must be fixed and re-tested |
| Major | A required acceptance criterion fails and there is no practical workaround | Blocks. Must be fixed and re-tested |
| Minor | Wrong or unclear text, cosmetic issue, or an AC deviation with a clear workaround and no data risk | Fixed, or explicitly accepted by the UAT Team as a documented limitation |

A request for behaviour that is not in the Sprint 1 contract is an enhancement, not a defect. The Product Team answers each finding as accepted defect, duplicate (linked to the original), not-defect or enhancement, with a reason tied to the contract. A failing acceptance criterion is never re-labelled as an enhancement.

## 9. Corrections and re-test

1. The Product Team confirms the finding, writes a failing automated test (RED), fixes it (GREEN), runs the full suite, opens a reviewed PR, and releases and tags a corrected version.
2. The Product Team gives the UAT Team the corrected tag, the Issue and the original case steps.
3. The UAT Team re-tests the corrected defects and the affected cases, then records one decision for the tested release: Accepted, Accepted with documented minor limitations, or Not Accepted, with its names, date and tested version. Only the UAT Team can record this decision.

## 10. Known limitations in Sprint 1

These are known and are not reported as defects: no login rate limiting; no CSRF token (cookie uses `SameSite=Lax`); no pagination; owners see aggregates only, never raw responses; `closed` surveys exist only from seed data; rating values 0, 6 and 3.5 and concurrency, rollback and session-expiry rules are verified by automated tests, not by this manual UAT.

Automated test evidence for the baseline (reported on tested commit `34c51d6`): 18 unit, 79 API and integration, 23 E2E, all passing, plus 2 manual tests. The Product Team re-runs `npm test` on the tagged commit before the UAT session and gives the result to the UAT Team: `<<result, date, commit>>`.
