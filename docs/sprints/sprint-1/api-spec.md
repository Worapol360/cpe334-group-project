# Sprint 1 API Specification

Version v0.1 – 2026-11-10. Conventions, error envelope, HTTP status policy and the endpoint catalogue are in `../../system-sds.md` §6; role matrix in §7. Identity and role always come from the session; client-sent `ownerId`, `respondentId`, `role`, `status` are ignored.

---

## F-01 Authentication, Session and Role-Based Access
| Method & path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/health` | – | `200 {"status":"ok","version":"<APP_VERSION>"}` | – |
| `POST /api/auth/login` | `{"email":"...","password":"..."}` | `200 {"user":{"id","displayName","role"}}` + `Set-Cookie` session | 401 `INVALID_CREDENTIALS`; 422 `VALIDATION_ERROR` |
| `GET /api/auth/me` | cookie | `200 {"user":{"id","displayName","role"}}` | 401 `UNAUTHENTICATED` |
| `POST /api/auth/logout` | cookie | `204`, cookie cleared, session revoked | 401 `UNAUTHENTICATED` |

Responses never contain `password_hash`, token hashes or stack traces.

---

## F-02 Survey Creation with Questions
`POST /api/owner/surveys`

```json
{ "title": "Course CPE334 feedback", "description": "Week 10",
  "questions": [
    { "text": "Pick the best topic", "type": "single_choice", "options": ["Git", "Testing", "CI/CD"] },
    { "text": "Rate the lab", "type": "rating" } ] }
```

Success `201`:

```json
{ "survey": { "id": 12, "title": "...", "description": "...", "status": "draft", "mode": "identified",
    "createdAt": "...", "publishedAt": null,
    "questions": [ { "id": 31, "position": 1, "text": "...", "type": "single_choice",
                     "options": [ { "id": 71, "position": 1, "label": "Git" } ] } ] } }
```

| Method & path | Success | Errors |
|---|---|---|
| `GET /api/owner/surveys` | `200 {"surveys":[{id,title,status,createdAt}]}` (own only) | 401, 403 |
| `GET /api/owner/surveys/{id}` | `200 {"survey":{...full...}}` | 401, 403 (not owner/role), 404 unknown id |
| `POST /api/owner/surveys` | 201 as above | 401, 403, 422 `VALIDATION_ERROR` with `fields[]` |

---

## F-03 Survey Publication
| Method & path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/owner/surveys/{id}/publish` | no body | `200 {"survey":{id,status:"published",publishedAt,...}}` | 401; 403 (role/not owner); 404; 409 `INVALID_STATE_TRANSITION`; 422 `VALIDATION_ERROR` |
| `GET /api/surveys` | – | `200 {"surveys":[{id,title,description}]}` (published only) | 401; 403 (owner) |
| `GET /api/surveys/{id}` | – | `200 {"survey":{id,title,description,questions:[{id,position,text,type,options:[{id,label}]}]}}` | 401; 403; 404 (unknown or not published) |

---

## F-04 Response Submission with Duplicate Prevention
`POST /api/surveys/{id}/responses`

```json
{ "answers": [ { "questionId": 31, "optionId": 72 },
               { "questionId": 32, "ratingValue": 4 } ] }
```

Success `201`: `{"response":{"id":55,"surveyId":12,"submittedAt":"..."}}`

| Method & path | Success | Errors |
|---|---|---|
| `POST /api/surveys/{id}/responses` | 201 | 401; 403 (not respondent); 404 unknown survey; 409 `SURVEY_NOT_OPEN` / `DUPLICATE_RESPONSE`; 422 `VALIDATION_ERROR` (`fields[]` names the question) |
| `GET /api/responses/{id}` | `200 {"response":{id,surveyId,surveyTitle,submittedAt,answers:[{questionId,questionText,type,optionId,optionLabel,ratingValue}]}}` | 401; 403 (other respondent or owner); 404 |
| `GET /api/surveys` (extended from F-03) | each item adds `myResponseId` (null if none) | as F-03 |

Check order: authenticate → role → survey exists → status published → duplicate → validation → insert (the unique constraint is the authoritative duplicate guard).

---

## F-05 Owner Aggregate Summary
`GET /api/owner/surveys/{id}/summary` → `200`, `Cache-Control: no-store`:

```json
{ "summary": {
    "surveyId": 12, "title": "...", "status": "published", "responseCount": 3,
    "generatedAt": "2026-11-14T09:30:00.000Z",
    "questions": [
      { "questionId": 31, "text": "Pick the best topic", "type": "single_choice",
        "options": [ { "optionId": 71, "label": "Git", "count": 1, "percent": 33.4 },
                     { "optionId": 72, "label": "Testing", "count": 1, "percent": 33.3 },
                     { "optionId": 73, "label": "CI/CD", "count": 1, "percent": 33.3 } ] },
      { "questionId": 32, "text": "Rate the lab", "type": "rating",
        "distribution": { "1": 0, "2": 0, "3": 1, "4": 1, "5": 1 }, "average": 4.0 } ] } }
```

`generatedAt` is the ISO-8601 time the aggregates were computed for this request.

Percent rule (largest remainder): `tenths = floor(count / responseCount × 1000)` (integer tenths of a percent), then the leftover tenths needed to reach 1000 (i.e. 100.0 %) are distributed one each to the largest fractional remainders, ties broken by lower position in the `options` array, and each option is `tenths / 10`. Percentages therefore always sum to exactly 100.0 when `responseCount > 0` — e.g. three votes split 1/1/1 → 33.4, 33.3, 33.3 (naive rounding would give 99.7 for 9 options × 31 votes plus 1 option × 21 votes of 300) — and are `0` when `responseCount` is 0.

Errors: 401; 403 (role or not owner); 404 unknown survey.
