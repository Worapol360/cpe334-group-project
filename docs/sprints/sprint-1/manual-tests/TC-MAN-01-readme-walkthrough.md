# TC-MAN-01: README Walkthrough – Manual Test Template

**Test ID:** TC-MAN-01  
**Requirement:** NFR-08  
**Level:** Manual  
**Precondition:** Clean clone of the repository; only README available for guidance.

## Objective

Verify that a new developer can clone, set up, and run the project (server + client + tests) following only the README instructions, within a reasonable number of commands (≤ 6).

## Procedure

| Step | README Instruction / Command | Expected Outcome | Actual Outcome | Pass/Fail |
|------|------------------------------|-------------------|----------------|-----------|
| 1 | `git clone <repo-url> && cd cpe334-group-project` | Repository cloned successfully | | |
| 2 | `cd server && cp .env.example .env && npm install` | Dependencies installed; `.env` file created with all required vars | | |
| 3 | `npx prisma migrate deploy && npm run db:seed` | Database migrated; 4 users and 4 surveys seeded (output confirms count) | | |
| 4 | `npm run test:unit && npm run test:api` | Unit: 18/18 pass; API: 58/58 pass (or known flake count documented) | | |
| 5 | `cd ../client && npm install && npm run dev` | Vite dev server starts on http://localhost:5173 | | |
| 6 | `cd ../server && npm run dev` | Express server starts on configured port; `GET /api/health` returns `{ status: "ok" }` | | |

## Results

- **Total commands:** ___
- **Total time:** ___ minutes
- **All steps passed:** Yes / No
- **Issues encountered:** ___

## Tester

- **Name:** ___
- **Date:** ___

