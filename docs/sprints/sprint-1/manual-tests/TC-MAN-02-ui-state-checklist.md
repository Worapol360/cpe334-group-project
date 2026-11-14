# TC-MAN-02: UI State Checklist – Manual Test Execution Report

**Test ID:** TC-MAN-02  
**Requirement:** NFR-09  
**Level:** Manual  
**Precondition:** Application running locally with seeded data (`http://localhost:5173`). Each screen tested for loading, empty, and error states, plus field-level validation.

## Objective

Verify that every screen in the application handles UI states correctly: loading indicators while data is being fetched, empty-state messages when there is no data, error banners when API calls fail, and inline field validation errors on forms.

## Execution Checklist

### 1. Login Page (`/login`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Default | Navigate to `/login` | Email + password fields, submit button visible | Rendered clean form with email, password inputs and Submit button | Pass |
| Validation error | Submit empty form | Inline errors on email and password fields | Inline messages "Email is required" and "Password is required" shown | Pass |
| Invalid credentials | Submit wrong password | Error banner: "Invalid email or password" | Red alert banner displayed with exact message; password input cleared | Pass |
| Loading | Click submit (observe briefly) | Submit button shows loading / disabled state | Button briefly changes to "Logging in…" and becomes disabled during request | Pass |

### 2. Owner Survey List (`/owner/surveys`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open page (observe briefly) | Loading spinner or skeleton visible | `data-testid="loading"` text "Loading surveys…" rendered during fetch | Pass |
| With data | Login as owner1 | List of surveys with title, status badge | Table rendered showing "Course CPE334 Feedback", "Quarterly Team Feedback", status badges | Pass |
| Empty | Login as owner with no surveys | "No surveys yet" or equivalent message | `data-testid="empty-state"` displays "No surveys yet" and "+ Create your first survey" link | Pass |
| Error | Disconnect server / throttle network | Error banner, no crash | Red error box `data-testid="error-message"` rendered cleanly without crashing page | Pass |

### 3. Owner Survey Detail (`/owner/surveys/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open survey detail | Loading indicator | "Loading survey…" displayed during fetch | Pass |
| Draft survey | Open a draft survey | Title, questions, Publish button visible | Survey title, description, questions rendered; green "Publish" button present | Pass |
| Published survey | Open a published survey | Title, questions, no Publish button, Summary link | Green "PUBLISHED" badge shown; Publish button hidden; "View summary →" link visible | Pass |
| Not found | Navigate to `/owner/surveys/999999` | "Not found" message | `data-testid="error-message"` displays "Survey not found" | Pass |

### 4. Owner Survey Create (`/owner/surveys/new`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Default | Navigate to create page | Empty form with title, question fields | Title input, description textarea, Question 1 (single_choice with 2 empty option inputs) rendered | Pass |
| Validation errors | Submit with empty title | Inline error on title field | Red inline text `data-testid="title-error"` displays "Title is required" | Pass |
| Validation errors | Submit with no questions / empty question text | Error message about questions | Inline error "Question text is required" shown under question 1 | Pass |
| Success | Submit valid form | Redirect to detail page with saved data | Redirected to `/owner/surveys/:id` with new title and "DRAFT" badge visible | Pass |

### 5. Owner Summary (`/owner/surveys/:id/summary`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open summary page | Loading indicator | "Loading summary…" rendered during fetch | Pass |
| With responses | Survey with submitted responses | Response count, option counts/percents, rating distribution | Response count "1 response" displayed, single choice bar chart with percentages, rating 1–5 distribution table | Pass |
| No responses | Published survey with 0 responses | "No responses yet" message, counts = 0 | Empty state "No responses yet" displayed; responseCount = 0; average = null | Pass |
| Error + Retry | Intercept API / disconnect | Error banner with retry button | Red banner with "Retry" button `data-testid="summary-retry"`; clicking reload re-fetches | Pass |

### 6. Respondent Survey List (`/surveys`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open page | Loading indicator | `data-testid="loading"` with "Loading surveys…" visible | Pass |
| With data | Login as respondent | List of published surveys | Published surveys rendered in card list with titles and descriptions | Pass |
| Answered badge | After answering a survey | "Answered ✔" badge visible on that survey | Green badge `data-testid="answered-badge"` displays "Answered ✔" on submitted survey | Pass |
| Empty | No published surveys | "No surveys available" message | `data-testid="empty-state"` displays "No surveys available" | Pass |

### 7. Respondent Survey Detail (`/surveys/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open survey detail | Loading indicator | Loading indicator visible | Pass |
| Unanswered survey | Open published survey not yet answered | Form with questions, Submit button enabled | Form with radio choices, rating scale 1–5 buttons, active "Submit Response" button | Pass |
| Already answered | Open survey already answered | "Already answered" banner, submit button disabled | Yellow banner `data-testid="already-answered-banner"` displayed; button says "Already Submitted" and is disabled | Pass |
| Not found | Navigate to `/surveys/999999` | "Not found" or redirect | Error box shows "Survey not found" | Pass |
| Field errors | Submit incomplete form | Inline validation errors on unanswered questions | Red inline message "Please answer this question" displayed under unanswered questions | Pass |

### 8. Response Confirmation (`/responses/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open response page | Loading indicator | Loading state rendered | Pass |
| With data | After submitting response | Survey title, submitted answers, confirmation message | Green confirmation message "Your response was recorded", submission timestamp, and submitted answers listed | Pass |
| Not found | Navigate to `/responses/999999` | "Not found" message | "Response not found" displayed | Pass |
| Forbidden | Open another user's response | "Forbidden" or redirect | HTTP 403 error / "You do not have permission to view this response" displayed | Pass |

## Results Summary

- **All states checked:** 32 / 32 checks verified and passed
- **Issues found:** None. Loading, empty, error, and validation states behave consistently across all 8 views.

## Tester

- **Name:** Student B (aranedlek)
- **Date:** 2026-11-15
