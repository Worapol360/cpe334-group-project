# TC-MAN-02: UI State Checklist – Manual Test Template

**Test ID:** TC-MAN-02  
**Requirement:** NFR-09  
**Level:** Manual  
**Precondition:** Application running locally with seeded data. Each screen should be tested for loading, empty, and error states, plus field-level validation.

## Objective

Verify that every screen in the application handles UI states correctly: loading indicators while data is being fetched, empty-state messages when there is no data, error banners when API calls fail, and inline field validation errors on forms.

## Checklist

### Login Page (`/login`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Default | Navigate to `/login` | Email + password fields, submit button visible | | |
| Validation error | Submit empty form | Inline errors on email and password fields | | |
| Invalid credentials | Submit wrong password | Error banner: "Invalid email or password" | | |
| Loading | Click submit (observe briefly) | Submit button shows loading / disabled state | | |

### Owner Survey List (`/owner/surveys`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open page (observe briefly) | Loading spinner or skeleton visible | | |
| With data | Login as owner1 | List of surveys with title, status badge | | |
| Empty | Login as owner with no surveys | "No surveys yet" or equivalent message | | |
| Error | Disconnect server / throttle network | Error banner, no crash | | |

### Owner Survey Detail (`/owner/surveys/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open survey detail | Loading indicator | | |
| Draft survey | Open a draft survey | Title, questions, Publish button visible | | |
| Published survey | Open a published survey | Title, questions, no Publish button, Summary link | | |
| Not found | Navigate to `/owner/surveys/999999` | "Not found" message | | |

### Owner Survey Create (`/owner/surveys/new`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Default | Navigate to create page | Empty form with title, question fields | | |
| Validation errors | Submit with empty title | Inline error on title field | | |
| Validation errors | Submit with no questions | Error message about questions | | |
| Success | Submit valid form | Redirect to detail page with saved data | | |

### Owner Summary (`/owner/surveys/:id/summary`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open summary page | Loading indicator | | |
| With responses | Survey with submitted responses | Response count, option counts/percents, rating distribution | | |
| No responses | Published survey with 0 responses | "No responses yet" message, counts = 0 | | |
| Error + Retry | Intercept API / disconnect | Error banner with retry button | | |

### Respondent Survey List (`/surveys`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open page | Loading indicator | | |
| With data | Login as respondent | List of published surveys | | |
| Answered badge | After answering a survey | "Answered" badge visible on that survey | | |
| Empty | No published surveys | "No surveys available" message | | |

### Respondent Survey Detail (`/surveys/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open survey detail | Loading indicator | | |
| Unanswered survey | Open published survey not yet answered | Form with questions, Submit button enabled | | |
| Already answered | Open survey already answered | "Already answered" banner, submit button disabled | | |
| Not found | Navigate to `/surveys/999999` | "Not found" or redirect | | |
| Field errors | Submit incomplete form | Inline validation errors on unanswered questions | | |

### Response Confirmation (`/responses/:id`)

| State | How to Trigger | Expected UI | Observed | Pass/Fail |
|-------|----------------|-------------|----------|-----------|
| Loading | Open response page | Loading indicator | | |
| With data | After submitting response | Survey title, submitted answers, confirmation message | | |
| Not found | Navigate to `/responses/999999` | "Not found" message | | |
| Forbidden | Open another user's response | "Forbidden" or redirect | | |

## Results

- **All states checked:** ___ / ___ total checks
- **Issues found:** ___

## Tester

- **Name:** ___
- **Date:** ___

