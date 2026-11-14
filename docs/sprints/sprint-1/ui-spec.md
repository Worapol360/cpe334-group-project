# Sprint 1 UI Specification

Version v0.1 – 2026-11-10. Shared conventions (routes, navbar, route guards, loading/empty/error states) are in `../../system-sds.md` §5. Hidden or disabled controls are a convenience only; the backend enforces authorization.

---

## F-01 Authentication, Session and Role-Based Access
| Element | Behaviour |
|---|---|
| `/login` | Email, password, Submit. While submitting: button disabled + loading text. Invalid login: generic error "Invalid email or password". Field errors for missing input. |
| Navbar | Shows display name and role of current user; **Logout** button. Hidden on `/login`. |
| Route guard | Anonymous visit to a protected route → redirect `/login`. After login: owner → `/owner/surveys`, respondent → `/surveys`. |
| After logout | Redirect to `/login`; browser back does not reveal data (API returns 401). |

---

## F-02 Survey Creation with Questions
| Screen | Behaviour |
|---|---|
| `/owner/surveys` | Table: title, status, created date, link. **Empty state:** "No surveys yet" + Create button. Loading and error states. |
| `/owner/surveys/new` | Form with dynamic question list (add/remove, reorder not required), type selector, options editor. Inline field errors from client and server. Submit disabled while saving. |
| `/owner/surveys/:id` | Read-only detail: title, description, status badge, questions with options. (Publish button added by F-03.) |

---

## F-03 Survey Publication
| Screen | Behaviour |
|---|---|
| `/owner/surveys/:id` | Status badge. **Publish** button only when `draft`; confirmation dialog explains that questions cannot be changed afterwards; on success badge becomes `published`; on 409/403 an error banner is shown. Hiding the button is convenience only. |
| `/surveys` (respondent) | List of published surveys (title, description). **Empty state:** "No surveys available". Loading and error states. |
| `/surveys/:id` | Read-only survey view (answer form added by F-04). |

---

## F-04 Response Submission with Duplicate Prevention
| Screen | Behaviour |
|---|---|
| `/surveys` | Adds "Answered ✔" marker and link to own response when `myResponseId` present. |
| `/surveys/:id` | Radio group for single-choice; 1–5 selector for rating; Submit disabled while saving; missing answers highlighted per question. If already answered: form disabled with "You have already submitted this survey". On 409 `DUPLICATE_RESPONSE`/`SURVEY_NOT_OPEN` an error banner is shown. |
| `/responses/:id` | Confirmation "Thank you" + submitted answers, submitted time. 403/404 → "not allowed / not found". |

---

## F-05 Owner Aggregate Summary
| Screen | Behaviour |
|---|---|
| `/owner/surveys/:id/summary` | Header with title, status and response count (`summary-response-count`), plus an "Updated at" timestamp (`summary-updated-at`) and a **Refresh** control (`summary-refresh`) that re-fetches the summary. Per question: table (and simple bar) of option counts/percent (`option-count-{optionId}`, `option-percent-{optionId}`), or rating distribution + average for all levels 1–5 with labels (`rating-count-{questionId}-{1..5}`, `rating-average-{questionId}`). The testid elements render only the value (integer count, percent with `%`, average with 2 decimals). **Empty state** "No responses yet"; loading state while fetching; failed fetch → **error state** (`summary-error`) with a **Retry** control (`summary-retry`). Below 600 px viewport width the layout stacks in a single column (each option's count and percent stacked under its label) with no horizontal scrolling. 403/404 → "not allowed / not found". |
| `/owner/surveys/:id` | Adds "View summary" link. |
