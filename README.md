# FeedbackLoop

FeedbackLoop is the CPE 334 Theme 10 class project: a department course-feedback survey tool with two roles, **Survey Owner** (creates and publishes surveys, views aggregate summaries) and **Respondent** (browses published surveys and submits responses). Sprint 1 runs in **identified mode only** — every response is linked to its respondent (BR-09). Repository: <https://github.com/Worapol360/cpe334-group-project>

## Sprint 1 scope

Implemented in this release:

- Login / logout with a session cookie (F-01)
- Create a draft survey with questions (F-02)
- Publish a draft survey (F-03)
- Submit one response per respondent per survey, with duplicate prevention (F-04)
- Owner aggregate summary for a published survey (F-05)

NOT in Sprint 1:

- Anonymous response mode (identified mode only)
- Closing surveys, eligibility lists, CSV export — these are later sprints
- A `closed` survey exists only from seed data (`S-CLOSED`); there is no close action in the UI or API

## Prerequisites

- **Node.js 24** (the Dockerfiles use `node:24-alpine`; there is no `engines` field or `.nvmrc` in this repo)
- **npm** (ships with Node.js)
- **Docker Desktop** — the database is PostgreSQL 16 (`postgres:16-alpine` in `docker-compose.yml`)
- **Git**

## Quick start (PowerShell)

Run these from the repository root, one step at a time. Leave steps 11 and 12 running in their own terminals.

1. `git clone https://github.com/Worapol360/cpe334-group-project.git`
2. `cd cpe334-group-project`
3. `git checkout <TAG>`
4. `npm install --prefix server`
5. `npm install --prefix client`
6. `Copy-Item server\.env.example server\.env`
7. Edit `server\.env`: choose your own `SEED_PASSWORD` (any password you pick) and set `PORT=8081`
8. `docker compose --env-file server/.env up -d db` — wait until `docker compose --env-file server/.env ps` shows the db as **healthy** (the compose file defines a `pg_isready` healthcheck) before continuing
9. `npm run db:migrate --prefix server`
10. `npm run db:seed --prefix server`
11. `npm run dev --prefix server` (API, listens on port 8081)
12. `npm run dev --prefix client` (web app, Vite dev server on port 5173)
13. Open **<http://localhost:5173>** — sign in with one of the seeded accounts below

Optional checks:

- API health: <http://localhost:8081/api/health>
- For the test suites only, also run: `npm install --prefix e2e`

## Environment variables

All application variables live in `server/.env` (copy of `server/.env.example`). Never commit `.env`.

| Name | Purpose | Example placeholder |
|---|---|---|
| `APP_ENV` | Runtime environment label | `development` |
| `PORT` | API listen port | `8081` |
| `LOG_LEVEL` | Log verbosity | `info` |
| `APP_VERSION` | Version reported by `/api/health` | `dev` |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins | `http://localhost:5173` |
| `SESSION_TTL_MINUTES` | Session lifetime in minutes | `60` |
| `COOKIE_SECURE` | `Secure` cookie flag (keep `false` for local HTTP) | `false` |
| `POSTGRES_USER` | Database user created by Docker Compose | `feedbackloop` |
| `POSTGRES_PASSWORD` | Database password (placeholder only) | `change-me` |
| `POSTGRES_DB` | Database name | `feedbackloop` |
| `DATABASE_URL` | Application database connection string | `postgresql://feedbackloop:change-me@localhost:5433/feedbackloop` |
| `DATABASE_URL_TEST` | Test database connection string (must differ from `DATABASE_URL`) | `postgresql://feedbackloop:change-me@localhost:5433/feedbackloop_test` |
| `SEED_PASSWORD` | Password assigned to all four seeded accounts | `<CHOOSE-A-PASSWORD>` |

`client/.env` is **not** needed for local UAT: the Vite dev server proxies `/api` to `http://localhost:8081` (`client/vite.config.js`). `client/.env.example` defines `VITE_API_URL`, but the current client code never reads it — API calls use relative `/api` paths (only the Docker builds pass that variable).

Notes:

- **`SEED_PASSWORD` must be chosen by the person running the app.** It is hashed at seed time and becomes the login password for **all four** seeded accounts. Changing it later in `.env` does not change existing accounts (see Troubleshooting).
- **Host DB port 5433.** `docker-compose.yml` maps `5433:5432` so it does not clash with a local PostgreSQL on 5432; `DATABASE_URL` and `DATABASE_URL_TEST` must use `localhost:5433`. If 5433 is already taken, change the host side of `ports` in `docker-compose.yml` **and** the port in both URL variables.
- **API `PORT=8081`** is the value this team uses: set it in `server\.env` (the `.env.example` file ships `8080`, and the code default is `8080`). The Vite proxy (`client/vite.config.js`) and the E2E config (`e2e/playwright.config.js`) both expect **8081**. If 8081 is taken, change `PORT` in `server\.env` and the proxy target in `client/vite.config.js` together.

## Seeded accounts

All four accounts share the password you set as `SEED_PASSWORD`.

| Email | Label | Role |
|---|---|---|
| `owner1@example.test` | Owner One | owner |
| `owner2@example.test` | Owner Two | owner |
| `respondent1@example.test` | Respondent One | respondent |
| `respondent2@example.test` | Respondent Two | respondent |

## Seeded surveys

| Key | Title | Status | Owner |
|---|---|---|---|
| `S-DRAFT` | Quarterly Team Feedback | draft | `owner1@example.test` |
| `S-PUB` | Course CPE334 Feedback | published | `owner1@example.test` |
| `S-CLOSED` | Past Semester Survey | closed | `owner1@example.test` |
| `S-OWNER2-DRAFT` | Owner Two Private Survey | draft | `owner2@example.test` |

Each seeded survey has the same two questions:

1. **Which aspect did you find most valuable?** (single choice)
   - Lectures and Materials
   - Hands-on Labs
   - Team Collaboration
2. **How satisfied are you with the course pace? (1=Lowest, 5=Highest)** (rating, no options)

## Reset to a clean state

**Re-running the seed does NOT delete responses or surveys created during testing.** The seed only upserts the four demo users and the four demo surveys; anything you created (and all submitted responses) stays in the database.

To get back to a clean state, wipe the database volume and re-run migrate + seed. This is **destructive**: it deletes all local data (accounts, surveys and responses created during testing).

```powershell
docker compose --env-file server/.env down -v
docker compose --env-file server/.env up -d db
npm run db:migrate --prefix server
npm run db:seed --prefix server
```

`down -v` stops the `db` container and removes its `postgres_data` volume, so the next `up -d db` starts an empty database (the init script also recreates the `*_test` database on first start). Wait for the db to report **healthy** (`docker compose --env-file server/.env ps`) before migrate and seed.

## Run the tests

From the repository root (install E2E dependencies first with `npm install --prefix e2e`):

| Suite | Command |
|---|---|
| Unit | `npm run test:unit` |
| API / integration | `npm run test:api` |
| E2E (Playwright) | `npm run test:e2e` |
| All of the above | `npm test` |

- The **API/integration and E2E** suites read `DATABASE_URL_TEST` from `server/.env`. It must point at the dedicated `<POSTGRES_DB>_test` database (created automatically by `db/init/01-create-test-db.sh` the first time the `db` container starts). The **unit** suite is pure domain code and needs no database.
- Those two suites **refuse to run** if `DATABASE_URL_TEST` is missing or is equal to `DATABASE_URL` (`server/tests/harness/db.js`, `e2e/playwright.config.js`). The harness migrates and seeds the test database itself — no manual migrate/seed step is needed for tests.
- The E2E suite starts its own API (8081) and client (5173) and runs in the `chrome` browser channel (`e2e/playwright.config.js`); close any running dev servers first, and make sure Google Chrome is installed.

## Troubleshooting

1. **`docker compose` fails with a daemon error** — Docker Desktop is not running. Start it and retry step 8.
2. **Port already in use (5433 or 8081)** — 5433: change the host side of `ports` in `docker-compose.yml` plus both URL variables in `server\.env`. 8081: change `PORT` in `server\.env` and the proxy target in `client/vite.config.js`.
3. **`prisma migrate deploy` cannot connect** — the `db` container is not up yet or `DATABASE_URL` uses the wrong port; check `docker compose --env-file server/.env ps` and confirm `DATABASE_URL` says `localhost:5433`.
4. **Login fails for all seeded accounts** — `SEED_PASSWORD` was changed *after* seeding; accounts keep the password from the last seed. Run the wipe procedure above (or at least re-seed) with the new value.
5. **E2E fails immediately** — a dev server already occupies 8081/5173 (the suite refuses to reuse them), or Chrome (`channel: 'chrome'`) is not installed.

## Known Sprint 1 limitations

- No login rate limiting
- No CSRF token (SameSite=Lax cookie + JSON-only state-changing endpoints)
- No pagination
- Owners see aggregates only — raw responses are not exposed

## More documentation

- [`docs/`](docs/) — SRS (`srs.md`), feature list (`features.md`), system design (`system-sds.md`), requirements traceability (`traceability.md`), and the Sprint 1 contracts and tests under `docs/sprints/sprint-1/` (API spec, feature specs, UI spec, tests)
- [`docs/labs/lab5-starter-kit-notes.md`](docs/labs/lab5-starter-kit-notes.md) — the original Lab 5 starter-kit README (deployment/CI material), kept for reference
