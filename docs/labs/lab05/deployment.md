# Deployment — FeedbackLoop / TokTickIT (Lab 5)

**Status: Draft v0.1, Lab 5 in progress.**

## 1. Purpose

This document describes how the application is built, tested and run today, which environment variables it reads, and what remains to be done to reach the Lab 5 reference deployment on Google Cloud.

## 2. Stack and changes from the Lab 5 reference stack

| Reference (Lab 5) | In this repo today | Status |
|---|---|---|
| Artifact Registry (image registry) | Unified multi-stage `Dockerfile` exists at repo root; no registry push yet | TODO — Issue: L5-04 CI |
| Cloud Run (service) | Express can serve API + built SPA (`APP_ENV=production`); no service deployed | TODO — Issue: L5-05 GCP first deploy |
| Cloud SQL for PostgreSQL | Local only: PostgreSQL 16 via `docker-compose.yml` on host port 5433 | TODO — Issue: L5-08 persistence |
| Secret Manager | Not used; secrets live only in local `server/.env` (never committed) | TODO — Issue: L5-05 GCP first deploy |
| GitHub Actions | Workflows exist (`.github/workflows/ci-docker.yml`, `deploy.yml`, `dependabot.yml`) but the pipeline is not yet wired to a real project | TODO — Issues: L5-04 CI, L5-06 WIF and merge gate, L5-07 deploy workflow |
| Docker image build for the app | `Dockerfile` (root) and `docker-compose.yml` services are present but compose `migrate`/`server`/`client` services are commented out | TODO — Issue: L5-03 Docker |

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
