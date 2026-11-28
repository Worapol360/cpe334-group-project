# Lab 5 Evidence Report — Deployment & CI/CD Pipeline

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**System Name:** FeedbackLoop (Group Project)  
**Team Prefix / Group Name:** `s3ed50763`  
**Section:** 3  
**Student A:** Worapol Saeku (`Worapol360`)  
**Student B:** Aran Edlek (`aranedlek` — Student ID: `67070505230`)  
**Repository:** https://github.com/Worapol360/cpe334-group-project (Public)  
**Release Tag:** `v0.1.2-lab5`  
**Public Service URL:** https://s3ed50763-4d7hbszvwq-as.a.run.app  

---

## Answer Part 0: Metadata, Team Contributions & Evidence Index

### 0.1 Team Information & Verification Endpoints

| Attribute | Details |
|---|---|
| **Course** | CPE 334 Software Engineering |
| **Section** | Section 3 |
| **Team Prefix** | `s3ed50763` |
| **Product / System** | **FeedbackLoop** (Survey & Response Management System) |
| **Student A** | **Worapol Saeku** (`Worapol360`) |
| **Student B** | **Aran Edlek** (`aranedlek` — Student ID: `67070505230`) |
| **Repository URL** | https://github.com/Worapol360/cpe334-group-project (Public) |
| **Staging Branch** | `sprint1-staging` |
| **Production Branch** | `main` |
| **Release Tag** | `v0.1.2-lab5` |
| **Release Commit** | `de6d5135183412346c59a10c90ff87383c77df21` |
| **Public Service URL** | https://s3ed50763-4d7hbszvwq-as.a.run.app |
| **Live Health Check** | `GET /api/health` → `{"status":"ok","version":"<commit_sha>"}` |
| **Live Readiness Check** | `GET /api/ready` → `{"status":"ready","db":"connected"}` |

---

### 0.2 Team Contribution & PR Review Matrix

ทุก Pull Request ใน Lab 5 ใช้ engineering workflow แบบ 2 คน: 1 author, 1 reviewer ที่มี written comments/approvals, required status check `test-and-docker`, และ issue traceability ครบถ้วน

| Issue | Title | Author | Reviewer | PR Link & Merge Commit | Summary |
|---|---|:---:|:---:|---|---|
| **#25** (L5-01) | GCP setup, billing alert & team access | Worapol360 | aranedlek | Direct Cloud Shell / Portal | ตั้งค่า project `cpe-se-course-2026`, budget alerts, IAM team access ภายใต้ prefix `s3ed50763` |
| **#26** (L5-02) | Cloud-ready config & deployment.md | Worapol360 | aranedlek | [PR #34](https://github.com/Worapol360/cpe334-group-project/pull/34) (`4ecbb16`) | เพิ่ม production static SPA serving, trust proxy, `/api/health`, `/api/ready`, baseline deployment doc |
| **#27** (L5-03) | Containerize FeedbackLoop with Docker | aranedlek | Worapol360 | [PR #35](https://github.com/Worapol360/cpe334-group-project/pull/35) (`448d356`) | Multi-stage root `Dockerfile`, `docker-compose.yml` (db, migrate, server, client), healthcheck probes (C-01, C-03) |
| **#28** (L5-04) | CI workflow on PRs & Dependabot | aranedlek | Worapol360 | [PR #36](https://github.com/Worapol360/cpe334-group-project/pull/36) (`0bc008c`) | สร้าง `.github/workflows/ci-docker.yml` job `test-and-docker`, ephemeral postgres, Dependabot |
| **#29** (L5-05) | First GCP deployment (Cloud Run, SQL, Secrets) | Worapol360 | aranedlek | [PR #37](https://github.com/Worapol360/cpe334-group-project/pull/37) (`42230ee`) | Deploy Cloud Run `s3ed50763`, Cloud SQL `s3ed50763-pg`, Artifact Registry, Secret Manager (C-04) |
| **#30** (L5-06) | WIF & required-check merge gate | Worapol360 | aranedlek | [PR #38](https://github.com/Worapol360/cpe334-group-project/pull/38) (`f7019bc`) | Keyless WIF, ruleset `protect-main-and-staging`, C-02 failing-check demo [PR #39](https://github.com/Worapol360/cpe334-group-project/pull/39) |
| **#31** (L5-07) | Deploy workflow & first pipeline release | aranedlek | Worapol360 | [PR #40](https://github.com/Worapol360/cpe334-group-project/pull/40) (`7a705e2`) | สร้าง `deploy.yml`, `release.sh`, cookie-based `smoke_test.py`, version assertion. Release [PR #41](https://github.com/Worapol360/cpe334-group-project/pull/41) (`8d2f8d0`) |
| **#32** (L5-08) | Persistence across restart & redeploy | Worapol360 | aranedlek | [PR #48](https://github.com/Worapol360/cpe334-group-project/pull/48) (`2728edc`) & [PR #49](https://github.com/Worapol360/cpe334-group-project/pull/49) (`de6d513`) | ยืนยัน data persistence ผ่านทั้ง restart (Step 2) และ redeploy (Step 3) — C-05 PASS |
| **#33** (L5-09) | Finalize deployment.md & Evidence Report | aranedlek | Worapol360 | PR pending | จัดทำเอกสาร deployment ฉบับสมบูรณ์และ Lab 5 PDF submission |

---

### 0.3 Mandatory Checks Index (C-01 to C-06)

| Check ID | Requirement | Description | Status | Tested Commit / Ref | Evidence Location |
|---|---|---|:---:|---|---|
| **C-01** | R-02 | CI workflow with meaningful test results on PR | **PASS** | `0bc008c` ([PR #36](https://github.com/Worapol360/cpe334-group-project/pull/36)) | Answer Part 1 §1.1; `ci-docker.yml` runs 18 unit + 85 API + 23 E2E tests |
| **C-02** | R-06 | Required status check merge gate blocks failing PRs | **PASS** | `d24ec7b` ([PR #39](https://github.com/Worapol360/cpe334-group-project/pull/39)) | Answer Part 1 §1.3; PR #39 blocked and closed without merge |
| **C-03** | R-03 | Docker local data persistence across container restart | **PASS** | `448d356` ([PR #35](https://github.com/Worapol360/cpe334-group-project/pull/35)) | Answer Part 2 §2.3; surveys and sessions survive `docker compose down/up` |
| **C-04** | R-05 | Public Cloud Run deployment with healthy DB connection | **PASS** | `42230ee` ([PR #37](https://github.com/Worapol360/cpe334-group-project/pull/37)) | Answer Part 3 §3.1; live URL HTTP 200 on health and readiness |
| **C-05** | R-04 | Cloud persistence across restart and pipeline redeployment | **PASS** | `2728edc` ([PR #48](https://github.com/Worapol360/cpe334-group-project/pull/48)), `de6d513` ([PR #49](https://github.com/Worapol360/cpe334-group-project/pull/49)) | Answer Part 3 §3.3; survey ID 5 & 1 response intact (Figures 1–5) |
| **C-06** | R-07, R-08 | Repeatable automated CD pipeline on push to `main` | **PASS** | `de6d513` ([Run #6](https://github.com/Worapol360/cpe334-group-project/actions/runs/46008184647)) | Answer Part 4 §4.1; deploy, WIF auth, smoke test PASS |

---

## Answer Part 1: CI and Quality Gate (30 Points)

### 1.1 Pull Request CI Workflow — C-01 (R-02)

**Workflow File:** [`.github/workflows/ci-docker.yml`](https://github.com/Worapol360/cpe334-group-project/blob/main/.github/workflows/ci-docker.yml)  
**Trigger:** `pull_request` into `sprint1-staging`, `sprint2-staging`, and `main`  
**Required Job:** `test-and-docker` (DO NOT RENAME — bound to branch ruleset merge gate)

**Pipeline Steps (in order):**

1. **Checkout** — `actions/checkout@v7.0.1` (SHA-pinned `3d3c42e5aac5ba805825da76410c181273ba90b1`, `persist-credentials: false`)
2. **Setup Node.js 24** — `actions/setup-node@v7.1.0` (SHA-pinned) with npm cache for 3 lockfiles
3. **Create test database** — `CREATE DATABASE feedbackloop_test` via `psql` (service container cannot mount `db/init/`)
4. **Install dependencies** — `npm ci` in `server/`, `client/`, `e2e/`
5. **Prisma generate + migrate + seed** — against ephemeral postgres:16 service container
6. **Unit tests (Vitest)** — 18 tests passed
7. **API & Integration tests (Vitest + Supertest)** — 85 tests passed
8. **Client production build** — `npm run build` in `client/` (Vite)
9. **Playwright E2E tests** — 23 browser tests in headless Chrome (`channel: "chrome"`)
10. **Docker build** — `docker build --tag "feedbackloop:${{ github.sha }}" .` (no push, no registry login)
11. **Upload Playwright report** — only on failure (`if: failure()`)

**Evidence — PR #36 CI pass (C-01):**
- PR Link: [PR #36 — CI workflow on PRs & Dependabot](https://github.com/Worapol360/cpe334-group-project/pull/36)
- Required check `CI / test-and-docker (pull_request)` passed with 18 unit + 85 API/integration + 23 E2E tests
- Each suite runs with `if: ${{ !cancelled() }}` so a failure in one suite still lets the others run and report

**CI-only environment values (throwaway, NOT secrets):**

| Name | CI-only value | Purpose |
|---|---|---|
| `POSTGRES_USER` | `ci_feedbackloop` | ephemeral service container |
| `POSTGRES_PASSWORD` | `ci-only-fake-password` | ephemeral service container |
| `DATABASE_URL` | `postgresql://ci_feedbackloop:...@localhost:5432/feedbackloop` | app database |
| `DATABASE_URL_TEST` | `postgresql://ci_feedbackloop:...@localhost:5432/feedbackloop_test` | test database |
| `SEED_PASSWORD` | `ci-only-fake-password` | demo-account seeding |

**Actions used (all SHA-pinned):**

| Action | Pin |
|---|---|
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1) |
| `actions/setup-node` | `949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0) |
| `actions/upload-artifact` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.1) |

---

### 1.2 Keyless Workload Identity Federation (WIF)

**Design Document:** [`docs/labs/lab05/wif-and-merge-gate.md`](https://github.com/Worapol360/cpe334-group-project/blob/main/docs/labs/lab05/wif-and-merge-gate.md)

- **Zero JSON keys** — ใช้ OpenID Connect (OIDC) token exchange แทน obsolete service account keys
- **Deployer SA:** `s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com` — least-privilege roles only:
  - `roles/run.developer` (Cloud Run update/execute)
  - `roles/artifactregistry.writer` (scoped to repo `s3ed50763` only)
  - `roles/iam.serviceAccountUser` (actAs on runtime SA `s3ed50763-runner`)
- **WIF Pool & Provider:** `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/s3ed50763/providers/s3ed50763`
- **Attribute Condition:** `assertion.repository == 'Worapol360/cpe334-group-project' && assertion.ref == 'refs/heads/main'`
- **Environment binding:** `principal://.../subject/repo:Worapol360/cpe334-group-project:environment:demo` (deploy job uses `environment: demo`)
- **Roles deliberately NOT granted:** `owner`/`editor`, `roles/secretmanager.*`, `roles/cloudsql.*`

---

### 1.3 Required-Check Merge Gate — C-02 (R-06)

**Ruleset:** `protect-main-and-staging` (Active, enforced on `main` and `sprint1-staging`)

**Ruleset configuration:**
- ✅ Require pull request before merging (minimum 1 approval)
- ✅ Require status check `test-and-docker` to pass
- ✅ Require branches to be up to date
- ✅ Block force pushes
- ✅ Block deletions
- ✅ Bypass list: **empty** (no users, teams or apps)
- ✅ Secret scanning: **on** (Push protection enabled)

**C-02 Proof — Failing test blocks merge:**

1. Created temporary branch `temp/lab5-failing-check` from `sprint1-staging`
2. Added intentionally failing unit test in `server/tests/unit/lab5-gate-demo.test.js`
3. Opened [PR #39 — `[Lab5][DEMO] Failing check must block merge (C-02)`](https://github.com/Worapol360/cpe334-group-project/pull/39)
4. Required check `CI / test-and-docker (pull_request)` **failed after 2 minutes**
5. GitHub **blocked the Merge button** (required check not passing)
6. **PR #39 closed without merging** — branch, PR and failed CI run preserved as evidence

---

## Answer Part 2: Docker and Reproducible Configuration (20 Points)

### 2.1 Unified Production Container (`Dockerfile`) — C-03 (R-03)

**Dockerfile:** [`Dockerfile`](https://github.com/Worapol360/cpe334-group-project/blob/main/Dockerfile) (at repo root)

Multi-stage build ที่ optimize สำหรับ production:

1. **Client Build Stage (`client-builder`):** `node:24-alpine` → `npm ci` → `npm run build` → ได้ `client/dist` (Vite production assets)
2. **Server Dependency Stage (`server-deps`):** `npm ci` → Prisma client generation
3. **Runtime Stage:** Copy server source + client build assets → non-root `node` user → port `3000`

**Key files:**
- [`Dockerfile`](https://github.com/Worapol360/cpe334-group-project/blob/main/Dockerfile) — unified multi-stage build
- [`docker-compose.yml`](https://github.com/Worapol360/cpe334-group-project/blob/main/docker-compose.yml) — local development with 4 services
- [`.dockerignore`](https://github.com/Worapol360/cpe334-group-project/blob/main/.dockerignore) — excludes `node_modules`, `.env`, etc.
- [`.env.example`](https://github.com/Worapol360/cpe334-group-project/blob/main/.env.example) — 14 environment variables with `CHANGE_ME` placeholders

---

### 2.2 Docker Compose Local Environment

Compose setup ที่ mirror production:

| Service | Image | Port | Healthcheck |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5433:5432` | `pg_isready` |
| `migrate` | Build from Dockerfile | — | Exits cleanly (code 0) before server starts |
| `server` | Build from Dockerfile | `3000:3000` | `GET /api/ready` |
| `client` | Build from Dockerfile | `5173:80` | — |

**Named volume** `postgres_data` ทำให้ข้อมูลไม่สูญหายเมื่อ container restart

---

### 2.3 Verification Evidence (C-01 & C-03)

**Docker Compose Build & Startup:**
```powershell
docker compose --env-file server/.env up --build -d
```

**Container Status (`docker compose ps`):**
```text
NAME                   IMAGE                          SERVICE   STATUS                      PORTS
feedbackloop-client    cpe334-group-project-client    client    Up 14 seconds               0.0.0.0:5173->80/tcp
feedbackloop-db        postgres:16-alpine             db        Up 33 seconds (healthy)     0.0.0.0:5433->5432/tcp
feedbackloop-migrate   cpe334-group-project-migrate   migrate   Exited (0) 21 seconds ago   
feedbackloop-server    cpe334-group-project-server    server    Up 20 seconds (healthy)     0.0.0.0:3000->3000/tcp
```

**C-01 — Health & Readiness Probes (local):**
```text
GET /api/health → HTTP/1.1 200 OK → {"status":"ok","version":"dev"}
GET /api/ready  → HTTP/1.1 200 OK → {"status":"ready","db":"connected"}
```

**C-03 — Persistence Across Restart:**
```powershell
docker compose --env-file server/.env down
docker compose --env-file server/.env up -d
```
Verified: ข้อมูล surveys, respondent sessions, และ seeded accounts ยังคงอยู่ครบถ้วนหลัง restart โดยไม่ต้อง re-seed — ข้อมูลถูกเก็บใน Docker named volume `postgres_data`

**Environment Variables (14 ตัว ตรงกับ `.env.example`):**

| Name | Purpose | Secret |
|---|---|:---:|
| `APP_ENV` | Runtime environment: `development` \| `production` | no |
| `PORT` | API listen port (default `8081`) | no |
| `LOG_LEVEL` | Log verbosity | no |
| `APP_VERSION` | Version reported by `/api/health` | no |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins | no |
| `SESSION_TTL_MINUTES` | Session lifetime in minutes | no |
| `COOKIE_SECURE` | Session cookie `Secure` flag | no |
| `POSTGRES_USER` | Postgres superuser | no |
| `POSTGRES_PASSWORD` | Postgres password | **yes** |
| `POSTGRES_DB` | Database name | no |
| `DATABASE_URL` | Application DB connection string | **yes** |
| `DATABASE_URL_TEST` | Test DB connection string | **yes** |
| `SEED_PASSWORD` | Seeded demo account password | **yes** |
| `API_PROXY_TARGET` | Vite dev-server proxy target | no |

---

## Answer Part 3: GCP Deployment and Persistence (35 Points)

### 3.1 Provisioned Cloud Resources — C-04 (R-05)

Deployment targets Google Cloud project `cpe-se-course-2026` in region `asia-southeast1` under prefix `s3ed50763`:

| Resource | Name / Details |
|---|---|
| **Cloud Run Service** | `s3ed50763` — Public URL: https://s3ed50763-4d7hbszvwq-as.a.run.app |
| **Cloud Run Migration Job** | `s3ed50763-migrate` — `npx prisma migrate deploy && npm run prisma:seed` |
| **Cloud SQL PostgreSQL** | `s3ed50763-pg` — PostgreSQL 16, tier `db-f1-micro`, 10 GB SSD |
| **Artifact Registry** | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s3ed50763/s3ed50763` |
| **Secret Manager** | `s3ed50763-database-url`, `s3ed50763-admin-password`, `s3ed50763-demo-password` |
| **Runtime SA** | `s3ed50763-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| **Deployer SA** | `s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com` (WIF, zero JSON keys) |

**Live Verification Evidence (C-04):**

```powershell
# Health check
curl.exe -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health
# → {"status":"ok","version":"de6d5135183412346c59a10c90ff87383c77df21"}

# Readiness check
curl.exe -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/ready
# → {"status":"ready","db":"connected"}
```

---

### 3.2 Application Architecture on GCP

- **Client served by Express:** เมื่อ `APP_ENV=production` Express serve SPA จาก `client/dist` บน origin เดียวกับ API พร้อม `index.html` fallback
- **Trust proxy:** `app.set('trust proxy', 1)` สำหรับ `Secure` cookies หลัง Cloud Run load balancer
- **Session management:** HTTP-only cookie `sid` → server เก็บ SHA-256 hash + expiry ใน `Session` table
- **Zero state in container:** ไม่มี file writes, ไม่มี in-memory sessions → containers เป็น disposable, state อยู่ใน Cloud SQL เท่านั้น
- **Cost control:** Cloud Run `min-instances: 0` / `max-instances: 3`; Cloud SQL `db-f1-micro`; pause ด้วย `--activation-policy=NEVER` เมื่อ idle

---

### 3.3 Cloud Persistence Verification — C-05 (R-04)

**Full Evidence Document:** [`docs/labs/lab05/persistence-test.md`](https://github.com/Worapol360/cpe334-group-project/blob/main/docs/labs/lab05/persistence-test.md)

Data persistence ถูกพิสูจน์ผ่านทั้ง container restart และ pipeline redeployment:

**Step 1 — Create Identifiable Records:**
- Login เป็น `owner1@example.test` สร้าง survey **"Lab5 Persistence Test 7a705e2"** (Survey ID `5`), publish, record `1` response
- Revision `s3ed50763-00003-6dt` at `2026-11-24T00:24:32.958Z` (**Figure 1**)

**Step 2 — Cloud Run Restart (Same Image, New Revision):**
- Update env var `PERSISTENCE_TEST_AT` → trigger new revision `s3ed50763-00004-ssd` (**Figure 2**)
- Confirmed survey ID `5` and 1 response unchanged (**Figure 3**)
- **Image Digest Evidence:** ทั้ง 2 revisions ใช้ **identical image digest** (`sha256:3002c8f30f2032ce97f30bd0cdc2ee2dd31982c98630a8a735385f4047c63461`) — restart เปลี่ยนแค่ revision, ไม่ใช่ image

**Step 3 — Pipeline Redeployment:**
- Merged Release PR #49 → `main` → deploy commit `de6d513` via GitHub Actions Run #6 (**Figure 4**)
- `GET /api/health` → `{"status":"ok","version":"de6d5135183412346c59a10c90ff87383c77df21"}` (**Figure 5**)
- Survey ID `5` and 1 response **intact** in Cloud SQL after full redeployment

**Overall C-05 Status: PASS ✅**

| Check | Before restart | After restart | After redeploy |
|---|---|---|---|
| Revision / time | `s3ed50763-00003-6dt` (2026-11-24T00:24:32Z) | `s3ed50763-00004-ssd` (2026-11-24T00:28:30Z) | Latest revision from `de6d513` (2026-11-27T13:38:52Z) |
| Survey ID 5 / responses | survey ID `5`, 1 response | unchanged | unchanged |
| `/api/health` version | `7a705e2...` | `7a705e2...` (unchanged) | `de6d513...` (matches new commit SHA) |
| Image digest | `sha256:3002c8f3...` | `sha256:3002c8f3...` (**identical**) | new image from Artifact Registry |

---

### 3.4 Evidence Figures

**Figure 1. C-05 (R-04): Owner summary before restart, survey ID 5, 1 response; URL https://s3ed50763-4d7hbszvwq-as.a.run.app; revision s3ed50763-00003-6dt; commit 7a705e2**  
![Figure 1. Owner summary before restart](images/figure-1-before-restart.png)

**Figure 2. C-05 (R-04): Cloud Shell env var update and new revision s3ed50763-00004-ssd serving 100% traffic, same image from 7a705e2; URL https://s3ed50763-4d7hbszvwq-as.a.run.app; commit 7a705e2**  
![Figure 2. Cloud Shell env var update and new revision at 100% traffic](images/figure-2-after-restart-revision.png)

**Figure 3. C-05 (R-04): Owner summary after restart, survey ID 5, 1 response; URL https://s3ed50763-4d7hbszvwq-as.a.run.app; revision s3ed50763-00004-ssd; commit 7a705e2**  
![Figure 3. Owner summary after restart](images/figure-3-after-restart-summary.png)

**Figure 4. C-05 (R-04): GitHub Actions Deploy demo Run #6 step summary on main; commit de6d513; image digest; smoke test passed**  
![Figure 4. GitHub Actions Deploy demo Run #6 step summary](images/figure-4-after-redeploy-actions.png)

**Figure 5. C-05 (R-04): Public /api/health after redeploy returning version de6d5135183412346c59a10c90ff87383c77df21; URL https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health; commit de6d513**  
![Figure 5. Public /api/health after redeploy](images/figure-5-after-redeploy-health.png)

---

## Answer Part 4: Repeatable Release Pipeline (15 Points)

### 4.1 Automated Deployment Pipeline — C-06 (R-07, R-08)

**Workflow File:** [`.github/workflows/deploy.yml`](https://github.com/Worapol360/cpe334-group-project/blob/main/.github/workflows/deploy.yml)  
**Release Script:** [`deploy/release.sh`](https://github.com/Worapol360/cpe334-group-project/blob/main/deploy/release.sh)  
**Smoke Test:** [`deploy/smoke_test.py`](https://github.com/Worapol360/cpe334-group-project/blob/main/deploy/smoke_test.py)  
**Trigger:** Automated on push to `main` (via Release PRs); manual rollback via `workflow_dispatch`

**Pipeline Architecture (6 stages):**

1. **Pre-flight CI (`test`):** Re-runs `ci-docker.yml` (`test-and-docker`). If tests fail → deployment strictly skipped.
2. **Keyless Cloud Auth:** WIF token exchange via `google-github-actions/auth@v3` using `vars.WIF_PROVIDER` and `vars.WIF_SERVICE_ACCOUNT` from GitHub environment `demo`. No JSON keys.
3. **Container Build & Push:** Builds root multi-stage Dockerfile → pushes to Artifact Registry tagged with 40-character commit SHA (`$IMAGE_TAG`).
4. **Digest Pinning & Migration:** `release.sh` resolves immutable `@sha256:...` digest → executes migration job `s3ed50763-migrate` with `--wait` → updates Cloud Run with `--image="$DIGEST_IMAGE"` and `--update-env-vars="APP_VERSION=$IMAGE_TAG"`.
5. **Post-Deployment Smoke Test:** `smoke_test.py` asserts:
   - `GET /api/health` → version matches `IMAGE_TAG` (commit SHA)
   - `GET /api/ready` → `db == 'connected'`
   - `GET /` → HTML document
   - Authenticated session lifecycle: login (cookie `sid`) → `/api/auth/me` → logout (HTTP 204)
6. **Deployment Summary:** Records commit SHA, digest, rollback flag, service URL, and smoke results to `$GITHUB_STEP_SUMMARY`.

---

### 4.2 Release Procedure (End-to-End Lifecycle)

```
Issue → Feature Branch → Feature PR (sprint1-staging) → Release PR (main) → Deploy
```

1. Feature development on dedicated branches (`feature/issue-<num>-*`)
2. Feature PR into `sprint1-staging` — requires 1 approval + passing `test-and-docker`
3. Release PR from `sprint1-staging` into `main`
4. Merge triggers `deploy.yml` automatically
5. Git tag created and pushed:
   ```sh
   git tag -a v0.1.2-lab5 -m "Release v0.1.2-lab5: automated WIF pipeline release"
   git push origin v0.1.2-lab5
   ```

**C-06 Evidence — Deploy Run #6 on `main`:**
- Actions Run: [#46008184647](https://github.com/Worapol360/cpe334-group-project/actions/runs/46008184647) (Deploy job [#140537948321](https://github.com/Worapol360/cpe334-group-project/actions/runs/46008184647/job/140537948321))
- Commit: `de6d5135183412346c59a10c90ff87383c77df21`
- Release tag: `v0.1.2-lab5`

---

### 4.3 How to Find the Running Commit

1. **Via Public API:** `curl -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health` → `{"status":"ok","version":"<commit_sha>"}`
2. **Via Cloud Run Metadata:** `gcloud run services describe s3ed50763 --region=asia-southeast1 --format="..."`
3. **Via GitHub Actions Step Summary:** Actions → Job `deploy` → Summary (`$GITHUB_STEP_SUMMARY`)
4. **Via Web UI Footer:** `client/src/App.jsx` dynamically queries `/api/health` and displays commit SHA (no hardcoded fallback)

---

### 4.4 Rollback Procedure

1. GitHub Actions → **Deploy demo** → **Run workflow** → branch `main` → `image_tag`: 40-char commit SHA of previous known-good deployment
2. Rollback mode: skip tests, skip build, skip migration → reuse existing Artifact Registry image → update Cloud Run → smoke test on restored revision

---

### 4.5 Cost Control & Idle Resource Management

- **Cloud Run:** `min-instances: 0` (scales to zero) / `max-instances: 3`
- **Cloud SQL:** `db-f1-micro` (shared core, 0.6 GB RAM, 10 GB SSD)
- **Pause:** `gcloud sql instances patch s3ed50763-pg --activation-policy=NEVER` (keeps disk/data intact)
- **Resume:** `gcloud sql instances patch s3ed50763-pg --activation-policy=ALWAYS` (must confirm RUNNABLE before deploy)

---

## Definition of Done Audit Checklist

- [x] **Every Lab 5 Issue and PR labelled `lab5`**: Issues #25–#33, PRs #34–#41, #48–#49
- [x] **Every PR has specific peer review**: Review feedback from @Worapol360 and @aranedlek
- [x] **Repository is public**: https://github.com/Worapol360/cpe334-group-project
- [x] **Zero secrets in repository or document**: No passwords, API tokens, cookies, or service account keys in code/docs/screenshots
- [x] **All Checks C-01 through C-06 fully verified and PASS**
- [x] **Deployment documentation complete**: [`docs/labs/lab05/deployment.md`](https://github.com/Worapol360/cpe334-group-project/blob/main/docs/labs/lab05/deployment.md)

---

*Report generated: November 2026*  
*Team: Worapol Saeku & Aran Edlek | Group: s3ed50763 | Section: 3*
