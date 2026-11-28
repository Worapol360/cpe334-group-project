# Deployment — FeedbackLoop / TokTickIT (Lab 5)

**Status: Draft v0.1, Lab 5 in progress.**

## 1. Purpose

This document describes how the application is built, tested and run today, which environment variables it reads, and what remains to be done to reach the Lab 5 reference deployment on Google Cloud.

## 2. Stack and changes from the Lab 5 reference stack

| Reference (Lab 5) | In this repo today | Status |
|---|---|---|
| Artifact Registry (image registry) | Unified multi-stage `Dockerfile` exists at repo root; commit-SHA images pushed to Artifact Registry | Implemented — pending first run on `main` (Issue: #29, #31, #32) |
| Cloud Run (service) | Deployed on Cloud Run (`s3ed50763`) serving Express API + built SPA over HTTPS | Implemented — pending first run on `main` (Issue: #29, #31, #32) |
| Cloud SQL for PostgreSQL | Local only: PostgreSQL 16 via `docker-compose.yml` on host port 5433; Cloud SQL `s3ed50763-pg` provisioned | Done (Issue: #29, #32) — persistence verified across restart and redeploy (C-05 PASS) |
| Secret Manager | Secret Manager stores `DATABASE_URL` (`s3ed50763-database-url`), admin and demo secrets; injected to Cloud Run | Done (Issue: #29) |
| GitHub Actions | CI runs on every pull request (`.github/workflows/ci-docker.yml`, job `test-and-docker`, see §9); automated deploy on push to `main` (`deploy.yml`) with WIF and smoke testing | Implemented — pending first run on `main` (Issue: #28, #30, #31, #32) |
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

## 7. GCP Resource names and configuration (L5-05 / #29)

- **GCP project**: `cpe-se-course-2026`
- **Region**: `asia-southeast1`
- **Team Prefix**: `s3ed50763`
- **Cloud Run service**: `s3ed50763`
- **Cloud Run Public URL**: `https://s3ed50763-4d7hbszvwq-as.a.run.app`
- **Cloud Run migration job**: `s3ed50763-migrate`
- **Cloud SQL instance**: `s3ed50763-pg` (PostgreSQL 16, tier `db-f1-micro`, connection `cpe-se-course-2026:asia-southeast1:s3ed50763-pg`, database `s3ed50763`, user `s3ed50763`)
- **Artifact Registry repository**: `s3ed50763` (`asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s3ed50763/s3ed50763`)
- **Service Accounts**:
  - Runtime service account: `s3ed50763-runner@cpe-se-course-2026.iam.gserviceaccount.com`
  - Deployer service account: `s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com`
- **Secret Manager secrets**:
  - `s3ed50763-database-url` (Prisma `DATABASE_URL`)
  - `s3ed50763-admin-password`
  - `s3ed50763-demo-password`
- **Release procedure (L5-07)**: see §12 (push to `main` → CI `test-and-docker` → `deploy.yml` builds image tagged with commit SHA → `deploy/release.sh` executes migration and updates Cloud Run → `deploy/smoke_test.py` validates public URL; manual rollback supported via `workflow_dispatch`).
- **How to find the running commit (L5-07)**: see §12.3 (`GET /api/health` returns `version` equal to commit SHA; also readable in Cloud Run revision metadata and GitHub Actions Step Summary).
- **Persistence evidence (L5-08)**: full procedure and evidence verified across both restart and redeploy (C-05 PASS) — see [persistence-test.md](persistence-test.md).

### 7.1 Persistence test result (L5-08 / C-05)

**Status: PASS — restart verified with identical image-digest evidence, pipeline redeploy verified through deploy.yml; overall C-05 = PASS.**

Full procedure, command packs, evidence table (Figures 1–5) and cost-control commands: **[persistence-test.md](persistence-test.md)**.

| Check | Before restart | After restart | After redeploy |
|---|---|---|---|
| Revision / time | `s3ed50763-00003-6dt` — `2026-11-24T00:24:32.958Z` | `s3ed50763-00004-ssd` (100% traffic, same image from `7a705e2`) — `2026-11-24T00:28:30.472Z` | `s3ed50763` latest revision (100% traffic from `de6d513`) — `2026-11-27T13:38:52Z` |
| Survey ID 5 / response count | survey ID `5`, `1` response | survey ID `5`, `1` response (unchanged) | survey ID `5`, `1` response (unchanged) |
| `/api/health` version | `7a705e28527f7d32b78a9fc0f867f23414bfff19` | same SHA returned; owner1 session still valid within the 60-minute TTL | `de6d5135183412346c59a10c90ff87383c77df21` (matches release commit SHA) |
| Image digest (restart pass criterion) | `s3ed50763-00003-6dt`: `sha256:3002c8f30f2032ce97f30bd0cdc2ee2dd31982c98630a8a735385f4047c63461` | `s3ed50763-00004-ssd`: `sha256:3002c8f30f2032ce97f30bd0cdc2ee2dd31982c98630a8a735385f4047c63461` — identical digest: restart changed only the revision, not the image | new image built from `main` and pinned by `@sha256` digest in Artifact Registry |

**Cost-control summary**: Cloud Run `min-instances 0` / `max-instances 3` (idle scales to zero); Cloud SQL `s3ed50763-pg` on tier `db-f1-micro`; pause with `--activation-policy=NEVER` when idle (data and storage are kept — stopping deletes nothing) and resume with `ALWAYS`, then confirm running, before every test **and every deploy/release** (the migration job and the app need the database). Read-only describe commands and the state-changing pause/resume pack are in [persistence-test.md §8](persistence-test.md#8-cost-control).

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

## 10. First Google Cloud deployment (L5-05 / #29)

### 10.1 Environment and Provisioned Resources

Deployment targets Google Cloud project `cpe-se-course-2026` in region `asia-southeast1` under group prefix `s3ed50763`:

- **Cloud Run Service**: `s3ed50763` (public URL: `https://s3ed50763-4d7hbszvwq-as.a.run.app`)
- **Cloud Run Migration Job**: `s3ed50763-migrate`
- **Cloud SQL PostgreSQL Instance**: `s3ed50763-pg` (PostgreSQL 16)
- **Artifact Registry**: `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s3ed50763`
- **Secret Manager Secrets**: `s3ed50763-database-url`, `s3ed50763-admin-password`, `s3ed50763-demo-password`

### 10.2 Deployment Pipeline & Release Verification

1. Container image built and pushed to Artifact Registry pinned by immutable commit SHA and digest.
2. Migration job `s3ed50763-migrate` executed and completed all Prisma schema migrations (`20261111000001_001_users_sessions`, `20261112000002_002_surveys`, `20261113000003_004_responses_answers`) and demo data seed.
3. Cloud Run service `s3ed50763` updated to latest revision `s3ed50763-00002-tv6` serving 100% of traffic.

### 10.3 Live Verification Evidence (C-04)

- **Health check (`/api/health`)**:
  ```http
  HTTP/1.1 200 OK
  content-type: application/json; charset=utf-8
  {"status":"ok","version":"dev"}
  ```

- **Readiness check (`/api/ready`)**:
  ```http
  HTTP/1.1 200 OK
  content-type: application/json; charset=utf-8
  {"status":"ready","db":"connected"}
  ```

- **Live Revision Status**:
  - Service: `s3ed50763`
  - Latest Revision: `s3ed50763-00002-tv6`
  - Traffic: 100% LATEST
  - Public URL: `https://s3ed50763-4d7hbszvwq-as.a.run.app`

## 11. Workload Identity Federation and merge gate (L5-06 / #30)

Full design, command pack, verification and demo procedure: **[wif-and-merge-gate.md](wif-and-merge-gate.md)**. Summary: one least-privilege deployer service account (`s3ed50763-deployer`, no JSON key — WIF only) is assumed by GitHub Actions through one workload identity pool and one OIDC provider for `token.actions.githubusercontent.com`, whose attribute mapping/exchange is restricted by an attribute condition to this repository (`Worapol360/cpe334-group-project`, recommended additionally to `refs/heads/main`). The deploy job needs `permissions: id-token: write` (already in `deploy.yml`) and only `roles/run.developer`, `roles/artifactregistry.writer` on the repo, `roles/iam.serviceAccountUser` on the runtime SA, plus `roles/iam.workloadIdentityUser` bound to the deploy job's single OIDC subject (`principal://.../subject/repo:Worapol360/cpe334-group-project:environment:demo`, because the `deploy` job runs with `environment: demo`) — no owner/editor, no Secret Manager or Cloud SQL roles for the deployer. The provider resource name and deployer SA email go into GitHub environment `demo` as variables `WIF_PROVIDER` / `WIF_SERVICE_ACCOUNT` (with `GCP_PROJECT_ID`, `GCP_REGION`) — identifiers, never keys. The merge gate is a GitHub ruleset `protect-main-and-staging` on `main` and `sprint1-staging`: pull request required, 1 approval, required status check `test-and-docker`, no force pushes, no deletion, empty bypass list; proven by the C-02 failing-test PR #39 (check `CI / test-and-docker (pull_request)` failed after 2m, Merge button blocked, PR closed without merging — evidence kept). WIF itself is only proven by the first real `deploy.yml` run (L5-07).

## 12. Automated Deployment Pipeline and Release Procedure (L5-07 / #31)

### 12.1 Pipeline Architecture (`.github/workflows/deploy.yml`)

The automated CD pipeline triggers on every push to `main` (and via manual `workflow_dispatch` for rollback):

1. **Pre-flight CI Validation (`test`)**: Re-runs `.github/workflows/ci-docker.yml` (`test-and-docker` required check). If tests fail, the deployment is strictly skipped (`deploy` job does not execute).
2. **Keyless Cloud Authentication**: Authenticates to Google Cloud using Workload Identity Federation (`google-github-actions/auth@v3`) using `vars.WIF_PROVIDER` and `vars.WIF_SERVICE_ACCOUNT` from GitHub environment `demo`. No service account keys are stored or used.
3. **Container Build & Registry Push**: Builds the root multi-stage Dockerfile and pushes it to Artifact Registry tagged with the full 40-character commit SHA (`$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:$IMAGE_TAG`).
4. **Digest Pinning & Database Migration**: Invokes `deploy/release.sh`, which resolves the image to its immutable `@sha256:...` digest, executes the Cloud Run migration job (`s3ed50763-migrate`) with `--wait`, and updates the Cloud Run service (`s3ed50763`) with `--image="$DIGEST_IMAGE"` and `--update-env-vars="APP_VERSION=$IMAGE_TAG"`.
5. **Post-Deployment Smoke Test**: Runs `deploy/smoke_test.py` against `$SERVICE_URL` and asserts `$IMAGE_TAG`:
   - `GET /api/health` -> HTTP 200 `{"status":"ok","version":"<commit_sha>"}` (asserts `version == IMAGE_TAG`)
   - `GET /api/ready` -> HTTP 200 `{"status":"ready","db":"connected"}`
   - `GET /` -> HTTP 200 HTML (`<html...`)
   - **Authenticated Session Checks** _(prerequisite: configure both variables below in GitHub Environment `demo` before first run; if unset the pipeline prints `SKIP login` and login evidence is incomplete)_:
     - Environment Variable: `SMOKE_EMAIL` -> set to `respondent1@example.test` (seeded respondent account, avoiding owner privilege)
     - Environment Secret: `SMOKE_PASSWORD` -> set to the demo password matching Secret Manager `s3ed50763-demo-password`
     - **TODO (before first run on `main`)**: verify both values are configured in GitHub Settings -> Environments -> `demo`.
     - When configured: verifies `POST /api/auth/login` (stores HTTP-only cookie `sid`), `GET /api/auth/me` (confirms user session), and `POST /api/auth/logout` (revokes session and clears cookie with HTTP 204).
6. **Deployment Summary**: Writes commit SHA, digest, rollback flag, service URL, and smoke test status to `$GITHUB_STEP_SUMMARY`.

### 12.2 Release Procedure (End-to-End)

1. Feature development occurs on dedicated feature branches (`feature/issue-<num>-*`).
2. Feature PR is opened into `sprint1-staging`. Requires 1 approval from a teammate and a passing `test-and-docker` status check.
3. Once validated on `sprint1-staging`, a Release PR is opened from `sprint1-staging` into `main`.
4. Merging the Release PR into `main` automatically triggers `deploy.yml`.
5. A git tag is created and pushed for the release:
   ```sh
   git tag -a v0.1.2-lab5 -m "Release v0.1.2-lab5: automated WIF pipeline release"
   git push origin v0.1.2-lab5
   ```
6. **Post-merge Release Evidence** _(pending — fill in after first pipeline run on `main`)_:
   - [ ] Link to `Deploy demo` GitHub Actions workflow run on `main` (Actions Run URL)
   - [ ] Actions Step Summary: commit SHA, Artifact Registry image digest, rollback: false, service URL, smoke status
   - [ ] Smoke test step log output (must include `PASS login` and `PASS logout` — requires `SMOKE_EMAIL`/`SMOKE_PASSWORD` configured):
     ```text
     PASS /api/health (version: <commit_sha>)
     PASS /api/ready
     PASS /
     PASS login and authenticated /api/auth/me
     PASS logout
     ```
   - [ ] `curl -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health` output with matching commit SHA
   - [ ] `gcloud run services describe s3ed50763 ...` output confirming 100% traffic on latest revision
   - [ ] Release tag: `v0.1.2-lab5` (already pushed).

### 12.3 How to Find the Running Commit

1. **Via Public API (`/api/health`)**:
   ```sh
   curl -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health
   # Expected output on production release: {"status":"ok","version":"<commit_sha>"}
   ```
2. **Via Cloud Run Metadata**:
   ```sh
   gcloud run services describe s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026 --format="table(status.latestReadyRevisionName, spec.template.spec.containers[0].image, spec.template.spec.containers[0].env)"
   ```
3. **Via GitHub Actions Step Summary**:
   Check the `Deploy demo` workflow run on GitHub under Actions -> Job `deploy` -> Summary (`$GITHUB_STEP_SUMMARY`).
4. **Via Web UI Footer**:
   The frontend footer (`client/src/App.jsx`) dynamically queries `/api/health` on mount and displays the active version/commit SHA (e.g. `FeedbackLoop • Lab 5 Release (<commit_sha>)`). If the health endpoint does not respond, no version is shown — the footer never displays a hardcoded fallback version.

### 12.4 Rollback Procedure

In the event of a broken production release:
1. Open GitHub Actions -> **Deploy demo** workflow.
2. Click **Run workflow**, select branch `main`, and enter `image_tag`: the full 40-character commit SHA of a previous known-good deployment.
3. The workflow detects rollback mode (`inputs.image_tag != ''`):
   - Unit and E2E tests are skipped.
   - Container image build is skipped (the existing image in Artifact Registry is reused).
   - Database migrations are skipped.
   - The Cloud Run service is updated to the target digest image and traffic shifted to 100%.
   - The smoke test runs against the restored revision.


