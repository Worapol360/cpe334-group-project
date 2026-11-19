# FeedbackLoop Sprint 1 UAT Cases (Lab 6, Part A)

| Item | Value |
|---|---|
| Product | FeedbackLoop (CPE 334 Theme 10, department course-feedback surveys) |
| Product Team | Worapol Saeku (`Worapol360`), `aranedlek` |
| Tested scope | Sprint 1 only: F-01 to F-05 (identified mode) |
| Release under test | tag `v0.1.1-sprint1-uat` (see `handoff.md` for commit SHAs) |
| Contract references | `docs/sprints/sprint-1/feature-specs.md` (AC-Fxx-nn), `docs/sprints/sprint-1/tests.md` |
| Run mode | Local (per TA). Web app `http://localhost:5173`, API `http://localhost:8081` |

All data is synthetic. Passwords are never written in this file: every account uses the `SEED_PASSWORD` chosen by whoever runs the app (see `handoff.md`).

## 1. Conventions

**Accounts** (all share `SEED_PASSWORD`)

| Label | Email | Role |
|---|---|---|
| owner1 | `owner1@example.test` | Survey Owner |
| owner2 | `owner2@example.test` | Survey Owner |
| respondent1 | `respondent1@example.test` | Respondent |
| respondent2 | `respondent2@example.test` | Respondent |

**Seeded surveys** (fresh database)

| Key | Title | Status | Owner |
|---|---|---|---|
| S-DRAFT | Quarterly Team Feedback | draft | owner1 |
| S-PUB | Course CPE334 Feedback | published | owner1 |
| S-CLOSED | Past Semester Survey | closed | owner1 |
| S-OWNER2-DRAFT | Owner Two Private Survey | draft | owner2 |

Every seeded survey has Q1 "Which aspect did you find most valuable?" (single choice: Lectures and Materials, Hands-on Labs, Team Collaboration) and Q2 "How satisfied are you with the course pace? (1=Lowest, 5=Highest)" (rating 1 to 5).

**Survey ids.** Pages for one survey use its id in the URL (`/owner/surveys/<id>`, `/surveys/<id>`, `/responses/<id>`). Read the id from the browser address bar after opening the survey or response from the UI, and write it down as the case says (for example `ID-UATA`).

**Run order and independence.** Start from a freshly reset database (`handoff.md`, section 5) and run the cases in this order:

| Order | Case | Depends on |
|---|---|---|
| 1 | UAT-07 | none |
| 2 | UAT-01 | none (creates "UAT Survey A") |
| 3 | UAT-02 | none (uses seeded S-PUB) |
| 4 | UAT-03 | none |
| 5 | UAT-04 | UAT-01 ("UAT Survey A" must exist and be published) |
| 6 | UAT-05 | UAT-01 and UAT-02 (needs `ID-UATA` and `ID-R1PUB`) |
| 7 | UAT-06 | UAT-01 (respondent1 already answered "UAT Survey A") |

If a dependency case FAILED or was BLOCKED, record the dependent case as BLOCKED with the reason; do not mark it PASS.

**Result values:** PASS, FAIL, BLOCKED. Write what you actually observed in the actual-result field; do not copy the expected result.

**Category coverage required by Lab 6**

| Category | Cases |
|---|---|
| Normal domain journey | UAT-01 |
| Business rule / boundary | UAT-02, UAT-03, UAT-04 |
| Forbidden role / ownership | UAT-05 |
| State / history / persistence | UAT-06 |
| Authentication foundation | UAT-07 |

---

## UAT-07 Login, logout and anonymous access

| Field | Value |
|---|---|
| Category | Authentication / access foundation |
| References | AC-F01-01, AC-F01-02, AC-F01-04, AC-F01-08 |
| Purpose | A user can only reach the app by logging in, bad logins are rejected without hints, and logout ends access |
| Role | owner1 (anonymous at the start) |
| Preconditions | Fresh database, API and web app running, browser has no FeedbackLoop session (use a private window) |
| Test data | Wrong password: `WrongPass-123`. Unknown email: `nobody@example.test` |

| # | Action | Expected result |
|---|---|---|
| 1 | Not logged in, open `http://localhost:5173/owner/surveys` | Redirected to the login page. No survey data is shown. |
| 2 | On the login page enter `owner1@example.test` and `WrongPass-123`, submit | An error message is shown. You stay on the login page. No navbar with a user name. |
| 3 | Enter `nobody@example.test` and `WrongPass-123`, submit | The same kind of error message as step 2 (the app does not reveal whether the email exists). |
| 4 | Enter `owner1@example.test` and the correct password, submit | Login succeeds and the owner home is shown. The navbar shows "Owner One" and a Logout control. |
| 5 | Click Logout | You are returned to the login page. |
| 6 | Click the browser Back button | The login page is shown (or you are redirected to it). No owner survey data is displayed. |

---

## UAT-01 Normal journey: create, publish, answer, read summary

| Field | Value |
|---|---|
| Category | Normal domain journey |
| References | AC-F02-01, AC-F02-09, AC-F03-01, AC-F03-06, AC-F03-09, AC-F04-01, AC-F04-02, AC-F04-13, AC-F05-01, AC-F05-02, AC-F05-03, AC-F05-06, AC-F05-08, AC-F05-10 |
| Purpose | An owner creates and publishes a survey, a respondent answers it once, and the owner sees correct aggregates |
| Roles | owner1, respondent1 |
| Preconditions | Fresh database (UAT-07 may already have run). Nobody is logged in. |
| Test data | Survey title `UAT Survey A`, description `Synthetic survey for UAT`. Q1 (single choice) `Which aspect did you find most valuable?` with options `Lectures and Materials`, `Hands-on Labs`, `Team Collaboration`. Q2 (rating) `How satisfied are you with the course pace? (1=Lowest, 5=Highest)`. respondent1 answers Q1 = `Hands-on Labs`, Q2 = `4`. |

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as owner1. Open the create-survey form. | The form is shown. |
| 2 | Enter the title and description above. Add Q1 with its three options in the order given and Q2 as a rating question. Save. | The survey detail page opens showing `UAT Survey A`, status Draft, the two questions in the entered order and the three options in the entered order. Write down the id from the URL as `ID-UATA`. |
| 3 | Open the owner survey list. | `UAT Survey A` is listed as Draft. `Owner Two Private Survey` is not listed. |
| 4 | Open `UAT Survey A`, click Publish and confirm in the dialog. | A confirmation dialog is shown before publishing. The status badge changes to Published. |
| 5 | Reload the page. | The survey is still Published. |
| 6 | Log out. Log in as respondent1. Open the survey list. | The list shows `UAT Survey A` and `Course CPE334 Feedback`. It does not show `Quarterly Team Feedback`, `Past Semester Survey` or `Owner Two Private Survey`. |
| 7 | Open `UAT Survey A`. Choose `Hands-on Labs` for Q1 and `4` for Q2. Submit. | A confirmation page shows "Your response" (not "anonymous") with the saved answers `Hands-on Labs` and `4`. |
| 8 | Go back to the survey list. | `UAT Survey A` is marked as answered. |
| 9 | Log out. Log in as owner1. Open `UAT Survey A` and click View summary. | The summary page opens. |
| 10 | Read the summary. | Response count is 1. Q1: Lectures and Materials count 0 and 0.0%, Hands-on Labs count 1 and 100.0%, Team Collaboration count 0 and 0.0%. Q2: rating 1 to 5 counts are 0, 0, 0, 1, 0 and the average is 4.00. An "Updated at" time is shown. No respondent name, email or id appears anywhere on the page. |
| 11 | Click Refresh on the summary page. | The page reloads the data and shows the same values as step 10, with no error. |

---

## UAT-02 Business rule: one response per respondent

| Field | Value |
|---|---|
| Category | Business rule (duplicate prevention) |
| References | BR-01, AC-F04-01, AC-F04-02, AC-F04-03, AC-F04-13 |
| Purpose | A respondent can answer a survey only once; the duplicate is not stored; another respondent is not affected |
| Roles | respondent1, respondent2, owner1 |
| Preconditions | Fresh database. respondent1 has not answered `Course CPE334 Feedback`. |
| Test data | respondent1 answers Q1 = `Team Collaboration`, Q2 = `3` on `Course CPE334 Feedback` |

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as respondent1. Open `Course CPE334 Feedback`. Choose `Team Collaboration` and `3`. Submit. | The confirmation page shows the answers `Team Collaboration` and `3`. Write down the id from the URL as `ID-R1PUB`. |
| 2 | Open the survey list. | `Course CPE334 Feedback` is marked as answered. |
| 3 | Open `Course CPE334 Feedback` again. | The form is disabled or replaced by an "already answered" state. You cannot submit a second response. |
| 4 | Use the browser Back button to return to the earlier form page, if it is still shown, and try to submit again. | The attempt is rejected with a duplicate-response message, or no form can be submitted. No second confirmation is produced. |
| 5 | Log out. Log in as respondent2. Open `Course CPE334 Feedback`. | The form is available and not marked as answered for respondent2. Do not submit. |
| 6 | Log out. Log in as owner1. Open `Course CPE334 Feedback` and View summary. | Response count is 1 (not 2). Q1: Team Collaboration count 1 and 100.0%, the other two options 0 and 0.0%. Q2 average is 3.00. |

---

## UAT-03 Boundary and validation

| Field | Value |
|---|---|
| Category | Business rule / boundary (input validation) |
| References | BR-05, BR-06, AC-F02-02, AC-F02-03, AC-F02-04, AC-F02-09, AC-F04-06, AC-F04-13 |
| Purpose | Invalid surveys and incomplete responses are rejected with clear errors and nothing is stored; the exact boundary values are accepted |
| Roles | owner1, respondent2 |
| Preconditions | Fresh database. UAT-02 may already have run. respondent2 has not answered `Course CPE334 Feedback`. |
| Test data | See steps. In PowerShell, `('A' * 200) \| Set-Clipboard` copies a 200-character title and `('A' * 201) \| Set-Clipboard` a 201-character title. |

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as owner1. In the create form enter a title of only spaces, add one valid rating question, save. | An inline error appears on the title field. No survey is created. |
| 2 | Enter title `UAT Boundary B` with no questions, save. | An error says at least one question is required. No survey is created. |
| 3 | Enter title `UAT Boundary B`, add a single-choice question `Pick one` with only one option `Only`, save. | An inline error says a single-choice question needs at least 2 options. No survey is created. |
| 4 | Change the question to have exactly two options `Yes` and `No`, save. | The survey is saved as Draft (2 options is the accepted minimum). It appears in the owner list. |
| 5 | Create a survey whose title is exactly 200 characters (A repeated) with one rating question, save. | The survey is saved as Draft. |
| 6 | Create a survey whose title is 201 characters with one rating question, save. | It is not saved and the title shows an error, or the input stops you from typing the 201st character. No 201-character survey appears in the owner list. |
| 7 | Open the owner list. | It contains the surveys from steps 4 and 5 and does not contain any survey from steps 1, 2, 3 and 6. |
| 8 | Log out. Log in as respondent2. Open `Course CPE334 Feedback`. Answer Q1 only and leave Q2 empty. Submit. | An error is shown for the unanswered question. No confirmation page appears. |
| 9 | Open the survey list. | `Course CPE334 Feedback` is not marked as answered for respondent2. |
| 10 | Log out. Log in as owner1. Open the summary of `Course CPE334 Feedback`. | The response count has not increased because of step 8 (it is 1 if UAT-02 ran, otherwise 0 with "No responses yet"). |

Note: rating values 0, 6 and 3.5 cannot be typed through the UI. They are covered by automated tests (AC-F04-07) and are not part of this manual UAT.

---

## UAT-04 Survey availability and status rules

| Field | Value |
|---|---|
| Category | Business rule (publication state and visibility) |
| References | BR-02, BR-03, AC-F03-02, AC-F03-03, AC-F03-06, AC-F03-09, AC-F04-05 |
| Purpose | Respondents can only see and answer published surveys, and the Publish action exists only for drafts |
| Roles | owner1, respondent1 |
| Preconditions | UAT-01 done (`UAT Survey A` is published). Fresh seed data otherwise. |
| Test data | Seeded draft `Quarterly Team Feedback`, seeded closed `Past Semester Survey`, seeded published `Course CPE334 Feedback` |

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as owner1. Open `Quarterly Team Feedback` (draft). | A Publish control is available. Write down its URL id as `ID-DRAFT`. Do not click Publish. |
| 2 | Open `Past Semester Survey` (closed). | The status shows Closed and there is no Publish control. Write down its URL id as `ID-CLOSED`. |
| 3 | Open `Course CPE334 Feedback` (published). | The status shows Published and there is no Publish control. |
| 4 | Log out. Log in as respondent1. Open the survey list. | Only published surveys are listed. `UAT Survey A` (created and published in UAT-01) appears next to `Course CPE334 Feedback`. `Quarterly Team Feedback`, `Past Semester Survey`, `Owner Two Private Survey` and any draft created in UAT-03 are not listed. |
| 5 | In the address bar open `http://localhost:5173/surveys/<ID-DRAFT>`. | A "not found" or "not available" page is shown. No survey title or questions are disclosed. |
| 6 | In the address bar open `http://localhost:5173/surveys/<ID-CLOSED>`. | The same "not found" or "not available" result. No survey data and no answer form. |

Note: submitting to a closed survey through the API (409 `SURVEY_NOT_OPEN`) cannot be done from the UI; it is covered by automated tests (AC-F04-05). A closed survey exists only from seed data in Sprint 1 (no close action until Sprint 2).

---

## UAT-05 Forbidden role and ownership access

| Field | Value |
|---|---|
| Category | Forbidden role / ownership |
| References | AC-F01-04, AC-F01-07, AC-F02-06, AC-F02-07, AC-F03-04, AC-F03-05, AC-F04-09, AC-F04-10, AC-F05-05 |
| Purpose | Users cannot use another role's pages or read another user's surveys, summaries or responses, and the protected data is neither shown nor changed |
| Roles | anonymous, respondent1, respondent2, owner1, owner2 |
| Preconditions | UAT-01 and UAT-02 done: `ID-UATA` (UAT Survey A) and `ID-R1PUB` (respondent1's response to `Course CPE334 Feedback`) are known. |
| Test data | URLs built from `ID-UATA` and `ID-R1PUB` |

| # | Action | Expected result |
|---|---|---|
| 1 | Not logged in, open `http://localhost:5173/surveys` and `http://localhost:5173/responses/<ID-R1PUB>`. | Each redirects to the login page. No survey or answer data is shown. |
| 2 | Log in as respondent1. Open `http://localhost:5173/owner/surveys` and `http://localhost:5173/owner/surveys/new`. | A "not allowed" page is shown for each. No owner data and no create form. |
| 3 | As respondent1 open `http://localhost:5173/owner/surveys/<ID-UATA>/summary`. | A "not allowed" page. No counts or percentages are shown. |
| 4 | Log out. Log in as owner2. Open the owner survey list. | Only `Owner Two Private Survey` (and surveys owner2 created) is listed. No survey of owner1 appears. |
| 5 | As owner2 open `http://localhost:5173/owner/surveys/<ID-UATA>`. | An error banner saying "You do not have permission to access this survey". The title and questions of `UAT Survey A` are not displayed and no Publish control is reachable. |
| 6 | As owner2 open `http://localhost:5173/owner/surveys/<ID-UATA>/summary`. | An error banner saying "You are not allowed to view this summary". No aggregates are shown. |
| 7 | As owner2 open `http://localhost:5173/surveys`. | A "not allowed" page (owners cannot use the respondent area). |
| 8 | Log out. Log in as respondent2. Open `http://localhost:5173/responses/<ID-R1PUB>`. | An error banner saying "You do not have permission to view this response". None of respondent1's answers are shown. |
| 9 | As respondent2, in the same browser, open `http://localhost:8081/api/responses/<ID-R1PUB>` in a new tab. | The API answers with a JSON error whose code is `FORBIDDEN` (HTTP 403) and no answer data. If you see `UNAUTHENTICATED` instead, confirm you are still logged in as respondent2 in this browser profile, retry once, and record exactly what you saw. |
| 10 | Log out. Log in as owner1. Open `http://localhost:5173/responses/<ID-R1PUB>`. | An error banner saying "You do not have permission to view this response" (owners cannot read raw responses). |
| 11 | As owner1 open the summary of `Course CPE334 Feedback` and the status of `UAT Survey A`. | Protected state is unchanged: `Course CPE334 Feedback` still shows response count 1 with the UAT-02 values, and `UAT Survey A` is still Published with response count 1. |

---

## UAT-06 Persistence across logout and restart

| Field | Value |
|---|---|
| Category | State / history / persistence |
| References | AC-F04-02, AC-F05-02, AC-F05-03, AC-F05-07, NFR persistence (data survives restart) |
| Purpose | Saved surveys and responses survive logout, API restart and database restart, and the summary reflects a new response |
| Roles | owner1, respondent1, respondent2 |
| Preconditions | UAT-01 done (respondent1 answered `UAT Survey A` with `Hands-on Labs` and `4`). respondent2 has not answered `UAT Survey A`. |
| Test data | respondent2 answers Q1 = `Lectures and Materials`, Q2 = `5` |

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as owner1. Open the summary of `UAT Survey A`. | Response count is 1 (values as in UAT-01 step 10). |
| 2 | Log out. Log in as respondent2. Open `UAT Survey A`, choose `Lectures and Materials` and `5`, submit. | A confirmation page shows `Lectures and Materials` and `5`. |
| 3 | Log out. Stop the API (Ctrl+C in its terminal). In PowerShell run `docker compose --env-file server/.env restart db`, wait until `docker compose --env-file server/.env ps` shows the db as healthy, then start the API again (`npm run dev --prefix server`). | The API starts without errors. |
| 4 | Reload the browser page and log in as owner1. Open the summary of `UAT Survey A`. | Response count is 2. Q1: Lectures and Materials 1 and 50.0%, Hands-on Labs 1 and 50.0%, Team Collaboration 0 and 0.0% (percentages sum to 100.0). Q2: rating counts 0, 0, 0, 1, 1 and the average is 4.50. |
| 5 | Open the owner survey list. | `UAT Survey A` is still there and Published, together with the surveys saved in UAT-03. |
| 6 | Log out. Log in as respondent1. Open the survey list. | `UAT Survey A` is still marked as answered. |
| 7 | Open respondent1's response to `UAT Survey A` from the UI (or the confirmation page). | The saved answers are still `Hands-on Labs` and `4`. |

---

## Coverage summary

| AC area | Covered by |
|---|---|
| F-01 login, errors, session end, redirects | UAT-07, UAT-05 |
| F-02 create, validation, ownership | UAT-01, UAT-03, UAT-05 |
| F-03 publish, visibility, state rules | UAT-01, UAT-04, UAT-05 |
| F-04 submit, duplicate, validation, own-response access | UAT-01, UAT-02, UAT-03, UAT-05, UAT-06 |
| F-05 summary values, privacy, refresh, access | UAT-01, UAT-02, UAT-05, UAT-06 |

Not coverable from the UI and verified by automated tests only: rating values 0, 6, 3.5 (AC-F04-07), concurrency (AC-F04-04), atomic rollback (AC-F02-10, AC-F04-12), session expiry (AC-F01-05).
