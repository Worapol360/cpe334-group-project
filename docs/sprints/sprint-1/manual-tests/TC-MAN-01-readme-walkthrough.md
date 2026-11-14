# TC-MAN-01: README Walkthrough – Manual Test Execution Report

**Test ID:** TC-MAN-01  
**Requirement:** NFR-08  
**Level:** Manual  
**Precondition:** Clean clone of the repository; only README available for guidance.

## Objective

Verify that a new developer can clone, set up, and run the project (server + client + tests) following only the README instructions, within a reasonable number of commands (≤ 6).

## Procedure and Observed Results

| Step | README Instruction / Command | Expected Outcome | Actual Outcome | Pass/Fail |
|------|------------------------------|-------------------|----------------|-----------|
| 1 | `git clone https://github.com/Worapol360/cpe334-group-project.git && cd cpe334-group-project` | Repository cloned successfully | Clean clone checked out at `93bc150` (`sprint1-staging`); directory structure matches README | Pass |
| 2 | `cd server && cp .env.example .env && npm install` | Dependencies installed; `.env` file created with all required vars | Dependencies installed in 6.2s; `.env` configured with `PORT=8081` and `DATABASE_URL_TEST` pointing to `localhost:5433` | Pass |
| 3 | `npx prisma migrate deploy && npm run db:seed` | Database migrated; 4 users and 4 surveys seeded (output confirms count) | 3 migrations deployed (`001_init`, `002_surveys_questions`, `003_responses_answers`); output confirms `seed: 4 users, 4 demo surveys upserted` | Pass |
| 4 | `npm run test:unit && npm run test:api` | Unit: 18/18 pass; API & Integration: 79/79 pass | `test:unit` 18/18 passed (5 files); `test:api` 79/79 passed (6 files including system integration); 0 failed | Pass |
| 5 | `cd ../client && npm install && npm run dev` | Vite dev server starts on http://localhost:5173 | Vite v8.3.8 ready in 392 ms on `http://localhost:5173/`; proxy to `http://localhost:8081` active | Pass |
| 6 | `cd ../server && npm run dev` | Express server starts on configured port; `GET /api/health` returns `{ status: "ok" }` | `feedbackloop api listening on port 8081 (development)`; `GET /api/health` returns HTTP 200 `{"status":"ok","version":"dev"}` | Pass |

## Results Summary

- **Total commands:** 6 commands
- **Total time:** ~4 minutes (including package installations and DB seed)
- **All steps passed:** Yes (6 / 6 steps passed)
- **Issues encountered:** None. Port 8080 was in use on the local environment so `PORT=8081` was used as documented in README § Local database.

## Tester

- **Name:** Student B (aranedlek)
- **Date:** 2026-11-15
