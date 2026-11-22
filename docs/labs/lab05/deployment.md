# Deployment — FeedbackLoop / TokTickIT (Lab 5)

**Status: Draft v0.1, Lab 5 in progress.**

## 1. Purpose

This document describes how the application is built, tested and run today, which environment variables it reads, and what remains to be done to reach the Lab 5 reference deployment on Google Cloud.

## 2. Stack and changes from the Lab 5 reference stack

| Reference (Lab 5) | In this repo today | Status |
|---|---|---|
| Artifact Registry (image registry) | Unified multi-stage `Dockerfile` exists at repo root; no registry push yet | TODO — Issue: L5-07 deploy workflow |
| Cloud Run (service) | Express can serve API + built SPA (`APP_ENV=production`); no service deployed | TODO — Issue: L5-05 GCP first deploy |
| Cloud SQL for PostgreSQL | Local only: PostgreSQL 16 via `docker-compose.yml` on host port 5433 | TODO — Issue: L5-08 persistence |
| Secret Manager | Not used; secrets live only in local `server/.env` (never committed) | TODO — Issue: L5-05 GCP first deploy |
| GitHub Actions | CI runs on every pull request (`.github/workflows/ci-docker.yml`, job `test-and-docker`, see §9); `deploy.yml` exists but the deploy pipeline is not yet wired to a real project | Done (Issue: #28); TODO — Issues: L5-06 WIF and merge gate, L5-07 deploy workflow |
| Docker image build for the app | Unified multi-stage `Dockerfile` at root for Cloud Run / production; `docker-compose.yml` with `db`, `migrate`, `server`, and `client` services; compose healthchecks on `db` and `server` (`/api/ready`); `/api/health` and `/api/ready` endpoints | Done (Issue: #27) |

Not a change, but worth noting: the server is plain JavaScript (ESM) with Prisma, not TypeScript as some starter comments suggest.

## 3. Environment variables

Source of truth: `.env.example` at the repo root (placeholders only, `CHANGE_ME`). The API reads `server/.env` (`server/src/config.js`); copy the example there for local use. Values must never be committed.

| Name | Purpose | Secret | Where the value comes from |
|---|---|---|---|
| `APP_ENV` | Runtime environment: `development` \| `production` (enables static serving + `trust proxy`) | no | local `.env`; Cloud Run env (`production`) |
| `PORT` | API listen port (local default `8081`; Cloud Run injects its own) | no | local `.env`; Cloud Run env |
| `LOG_LEVEL` | Log verbosity (`silent`/`error`/`warn`/`info`) | no | local `.env`; Cloud Run env |
| `APP_VERSION` | Version reported by `/api/health` (falls back to `dev`) | no | local `.env`; GitHub Actions / Cloud Run env (set from the deployed commit) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins | no | local `.env`; Cloud Run env |
| `SESSION_TTL_MINUTES` | Session lifetime in minutes | no | local `.env`; Cloud Run env |
| `COOKIE_SECURE` | Session cookie `Secure` flag — `false` locally, `true` behind HTTPS on Cloud Run | no | local `.env`; Cloud Run env |
| `POSTGRES_USER` | Postgres superuser (compose creates the DB with it) | no | local `server/.env` (compose `--env-file`); Secret Manager / Cloud SQL config (TODO) |
| `POSTGRES_PASSWORD` | Postgres password | **yes** | local `server/.env`; Secret Manager (TODO) |
| `POSTGRES_DB` | Postgres database name | no | local `server/.env`; Cloud SQL config (TODO) |
| `DATABASE_URL` | Application database connection string | **yes** | local `server/.env`; Secret Manager (TODO) |
| `DATABASE_URL_TEST` | Dedicated test database connection string (tests refuse to run without it) | **yes** | local `server/.env`; GitHub Actions secret (TODO) |
| `SEED_PASSWORD` | Password for the seeded demo accounts | **yes** | local `server/.env`; Secret Manager (TODO) |
| `API_PROXY_TARGET` | Vite dev-server proxy target for `/api` (default `http://localhost:8081`) | no | local shell/`.env` (dev only) |

Notes:

- This table matches `.env.example` exactly (14 variables).
- `client/.env.example` lists `VITE_API_URL`, but the client code never reads it (`client/src/api.js` calls the API with relative URLs); it is stale and not part of the table.

## 4. Local commands

All commands run from the repo root unless stated. There is no root install; install per package:

```sh
npm install --prefix server
npm install --prefix client
npm install --prefix e2e
```

**Database (PostgreSQL 16, host port 5433):**

```sh
# start only the DB, using the API's env file for POSTGRES_* values
docker compose --env-file server/.env up -d db
```

The compose file requires `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` to be set (they come from `server/.env`). On first start, `db/init/01-create-test-db.sh` also creates the `<POSTGRES_DB>_test` database required by the tests.

**Migrate and seed** (use `DATABASE_URL` from `server/.env`):

```sh
npm run db:migrate --prefix server   # prisma migrate deploy
npm run db:seed --prefix server      # node src/persistence/seed.js (demo accounts)
```

**Run locally:**

```sh
npm run dev --prefix server          # API with watch, PORT from .env (local: 8081)
npm start --prefix server            # API without watch
npm run dev --prefix client          # Vite dev server on 5173, proxies /api -> API_PROXY_TARGET
npm run build --prefix client        # produces client/dist for production serving
```

In development the browser talks to the Vite server (5173) which proxies `/api` to the API (8081). With `APP_ENV=production` the Express server serves `client/dist` itself (see §6).

**Tests** (from the repo root; requires the test database on 5433):

```sh
npm run test:unit                    # vitest unit suite
npm run test:api                     # vitest API + integration suites
npm run test:e2e                     # playwright (starts API on 8081 + Vite on 5173 itself)
npm test                             # all three, in that order
```

## 5. What is stored where

- **All application data lives in PostgreSQL**: users, surveys, questions, options, responses and answers — see the Prisma models in `server/prisma/schema.prisma` (`User`, `Session`, `Survey`, `Question`, `QuestionOption`, `Response`, `Answer`).
- **Sessions are server-side in the database**: the browser only ever receives an opaque cookie token; the server stores its SHA-256 hash plus expiry in the `Session` table (`server/src/persistence/sessions.js`, read on every request by `server/src/api/middleware/session.js`).
- **Nothing app-critical is kept only in the container**: the application code writes no files (no uploads, no on-disk caches — see `server/src/`), and sessions/data are not held in process memory. Containers are therefore disposable; only the Postgres volume (`postgres_data` in `docker-compose.yml`) and the database itself hold state.

## 6. Production behaviour (already implemented, L5-02)

- **Client served by Express**: when `APP_ENV=production`, `server/src/app.js` serves the built SPA from `client/dist` on the same origin as the API, with an `index.html` fallback for non-`/api` GET/HEAD routes. Unknown `/api` paths still return the JSON error envelope (`{"error":{...}}`). Development behaviour is unchanged.
- **Trust proxy**: in production the app sets `app.set('trust proxy', 1)` so `Secure` cookies and client IPs work behind the Cloud Run load balancer.
- **Cookie**: the session cookie is always `HttpOnly` and `SameSite=Lax`; its `Secure` flag follows `COOKIE_SECURE` (`false` locally, `true` on Cloud Run) — `server/src/api/middleware/session.js`.
- **Health/version**: `GET /api/health` returns `{"status":"ok","version":"<APP_VERSION>"}` and falls back to `"dev"` when `APP_VERSION` is unset (`server/src/api/routes/health.js`, `server/src/config.js`). No other configuration or secret is exposed.

## 7. TODO placeholders

- **GCP project**: `CHANGE_ME_PROJECT_ID` — TODO (Issue: L5-05).
- **Region**: `CHANGE_ME_REGION` — TODO (Issue: L5-05).
- **Resource names** (Artifact Registry repo, Cloud Run service, Cloud SQL instance, Secret Manager secrets, service account): `CHANGE_ME_*` — TODO (Issues: L5-05, L5-08).
- **Release procedure**: TODO (Issue: L5-07) — expected shape: push to `main` → CI (`ci-docker.yml`) → `deploy.yml` builds the image tagged with the commit SHA → `deploy/release.sh` migrates and updates the Cloud Run service → `deploy/smoke_test.py` checks the public URL; manual rollback by re-running the workflow with a previous image tag.
- **How to find the running commit**: TODO (Issue: L5-07) — the image tag is the full commit SHA; confirm via the workflow's deployment summary / Cloud Run revision metadata.
- **Persistence evidence**: TODO (Issue: L5-08) — demonstrate data (including sessions) surviving a container restart against Cloud SQL.

## 8. Docker Verification and Evidence (L5-03 / #27)

### 8.1 Docker Compose Services and Startup
Command:
```powershell
docker compose --env-file server/.env up --build -d
```
All images built, containers created, migrations applied, and services marked healthy before dependents start.

### 8.2 Container Status (`docker compose ps`)
Command:
```powershell
docker compose --env-file server/.env ps -a
```
Output:
```text
NAME                   IMAGE                          COMMAND                  SERVICE   CREATED          STATUS                      PORTS
feedbackloop-client    cpe334-group-project-client    "/docker-entrypoint.…"   client    34 seconds ago   Up 14 seconds               0.0.0.0:5173->80/tcp, [::]:5173->80/tcp
feedbackloop-db        postgres:16-alpine             "docker-entrypoint.s…"   db        34 seconds ago   Up 33 seconds (healthy)     0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
feedbackloop-migrate   cpe334-group-project-migrate   "./docker-entrypoint…"   migrate   34 seconds ago   Exited (0) 21 seconds ago   
feedbackloop-server    cpe334-group-project-server    "./docker-entrypoint…"   server    34 seconds ago   Up 20 seconds (healthy)     0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp
```

### 8.3 Health and Readiness Probes
Command:
```powershell
curl.exe -i http://localhost:3000/api/health
```
Output:
```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 31
{"status":"ok","version":"dev"}
```

Command:
```powershell
curl.exe -i http://localhost:3000/api/ready
```
Output:
```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 35
{"status":"ready","db":"connected"}
```

### 8.4 C-03 Persistence Across Restart
Command:
```powershell
docker compose --env-file server/.env down
docker compose --env-file server/.env up -d
```
Verified data persistence: login with seeded `owner1@example.test` and demo surveys persist intact without re-seeding.

## 9. CI on pull requests (L5-04 / #28)

### 9.1 Workflow file and triggers

- **File**: `.github/workflows/ci-docker.yml` (workflow name `CI`, replaced by this issue; Dependabot config in `.github/dependabot.yml`).
- **Triggers**: `pull_request` into `sprint1-staging`, `sprint2-staging` and `main`, plus manual `workflow_dispatch`. The workflow is also callable via `workflow_call` so `deploy.yml` can run CI again before deploying (L5-07). There is deliberately **no `push` trigger** and the workflow needs **no GitHub secrets**.
- **Permissions**: `contents: read` only. **Concurrency**: group `ci-<workflow>-<PR number>` (falls back to the ref when there is no PR number), with `cancel-in-progress` limited to `pull_request` runs so a newer push cancels an outdated PR run but never a deploy or manual run. **Timeout**: 30 minutes on the job.
- The job creates an ephemeral `postgres:16` service container; because a service container cannot mount `db/init/`, a `psql` step creates the second database (`feedbackloop_test`) exactly like `db/init/01-create-test-db.sh` does locally.

### 9.2 Job name — do not rename

The workflow has exactly one job whose **id and name are both `test-and-docker`**. Issue L5-06 turns this job name into the **required status check** of the branch-protection merge gate; renaming the job (or the `name:` field) makes the check disappear and silently breaks the merge gate.

### 9.3 Steps (in order)

1. `actions/checkout` (SHA-pinned, `persist-credentials: false`).
2. `actions/setup-node` with **Node 24** (matches `node:24-alpine` in the `Dockerfile`) and npm cache for the three lockfiles.
3. Create the test database with `psql` (`CREATE DATABASE feedbackloop_test`).
4. `npm ci` in `server/`, `client/` and `e2e/`.
5. `npx prisma generate`, `npx prisma migrate deploy` (app database), `npm run prisma:seed`.
6. **Unit tests** (`npm run test:unit`) and **API + integration tests** (`npm run test:api`) — the test harness itself migrates + seeds `DATABASE_URL_TEST`.
7. **Client production build** (`npm run build` in `client/`).
8. **Playwright browsers**: `npx playwright install --with-deps chromium` (the config launches the runner's system Chrome via `channel: "chrome"`).
9. **E2E tests** (`npx playwright test --reporter=list,html` in `e2e/`): Playwright starts the API on `PORT=8081` (against the test database) and the Vite dev server on `5173` itself.
10. **`docker build`** of the root `Dockerfile`, tagged with the commit SHA (`feedbackloop:<sha>`). No push, no registry login.
11. Upload the Playwright report as an artifact **only when the job failed** (`if: failure()`).

Each suite runs with `if: ${{ !cancelled() }}` so a failure in one suite still lets the others run and report; any failing step still fails the job.

### 9.4 Throwaway CI-only environment values (not secrets)

All values live in the workflow's top-level `env:` block, are obviously fake, and exist only for the lifetime of the job. **No repository secrets are used.**

| Name | CI-only value | Points at |
|---|---|---|
| `POSTGRES_USER` | `ci_feedbackloop` | ephemeral service container |
| `POSTGRES_PASSWORD` | `ci-only-fake-password` | ephemeral service container |
| `POSTGRES_DB` | `feedbackloop` | app database |
| `DATABASE_URL` | `postgresql://ci_feedbackloop:ci-only-fake-password@localhost:5432/feedbackloop?schema=public` | app database |
| `DATABASE_URL_TEST` | `postgresql://ci_feedbackloop:ci-only-fake-password@localhost:5432/feedbackloop_test?schema=public` | test database (different DB — tests refuse to run otherwise) |
| `SEED_PASSWORD` | `ci-only-fake-password` | demo-account seeding |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Vite dev server origin used by E2E |

### 9.5 Where to find results

- **Test summary**: on the workflow run page → job `test-and-docker` → **Step summary** (`$GITHUB_STEP_SUMMARY`). It contains one section per suite ("Unit tests (Vitest)", "API and integration tests (Vitest)", "E2E tests (Playwright)") with passed/failed counts, produced from the existing reporters via CLI flags only.
- **Playwright artifact**: on failure only, the run's **Artifacts** section contains `playwright-report` (`e2e/playwright-report/` HTML report plus `e2e/test-results/`). Green runs upload nothing.

### 9.6 Actions used and pinning

| Action | Pin |
|---|---|
| `actions/checkout` | SHA `3d3c42e5aac5ba805825da76410c181273ba90b1` (= tag `v7.0.1`) |
| `actions/setup-node` | SHA `949feb2413d6458794dcd2491c4babbbce0c15c1` (= tag `v7.1.0`) |
| `actions/upload-artifact` | SHA `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (= tag `v7.0.1`) |

All three are pinned to verified full 40-character commit SHAs (verified read-only with `git ls-remote` against the action repositories) — **no unpinned actions remain**. `.github/dependabot.yml` opens weekly bump PRs for `github-actions` and for each npm package directory (`/server`, `/client`, `/e2e`), max 3 open PRs each, targeting `sprint1-staging`.

Note for L5-07: `deploy.yml` calls this workflow with `uses: ./.github/workflows/ci-docker.yml`, which works again now that `workflow_call` is restored (no inputs or secrets are passed); `cancel-in-progress` is limited to `pull_request` runs, so a deploy-triggered CI run on `main` is never cancelled by concurrency.
