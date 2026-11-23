# Persistence test procedure and evidence — C-05 (R-04) / Issue L5-08

**Status: procedure ready; results `TODO: fill after the test`.**

## 1. Goal and pass criteria

Prove **R-04** / check **C-05**: application data (surveys, responses) and server-side sessions live in Cloud SQL, not in the container, so they survive a Cloud Run restart (Step 2), a pipeline redeploy (Step 3) and an optional rollback/roll-forward (Step 4).

**Pass** when, after each of Steps 2–4:

- the records created in Step 1 still exist with unchanged counts,
- the owner opens the summary and sees the same response count,
- the pre-existing session still works, **or** login works again if the session TTL expired (TTL expired is an accepted fallback, note the times),
- after a redeploy, `GET /api/health` returns `version` equal to the new commit SHA.

## 2. Preconditions

- Public URL: `https://s3ed50763-4d7hbszvwq-as.a.run.app`
- A demo **owner** account and a demo **respondent** account. Passwords are shared privately between team members and must **never** be written in this file, any doc, or any screenshot.
- **Session TTL**: `SESSION_TTL_MINUTES`, default **60** minutes (`server/src/config.js`). Run the before/after login checks within one TTL window; if it expired, fall back to "login works again" and record the times.
- Cloud SQL instance `s3ed50763-pg` must be **RUNNING** before starting (see §8).
- Both members have read the cost-control section (§8) before running any state-changing command.
- Command markers: **[CHANGES SERVICE]** / **[CHANGES STATE]** alter cloud state; all other commands are read-only. Nothing here is run by the agent — a human runs them.

## 3. Step 1 — Create identifiable records (live URL)

1. As the **owner**, log in on the public URL, create a survey with a distinctive title: `L5-08 persistence <YYYY-MM-DD HH:MM>` (local time).
2. Add at least one question and **publish** the survey.
3. As the **respondent**, log in and submit **one** response.
4. As the **owner**, open the survey **summary** and note the response count.
5. Record the run (placeholders):

| Field | Value |
|---|---|
| Survey title | `L5-08 persistence <YYYY-MM-DD HH:MM>` |
| Survey ID | `<PLACEHOLDER>` |
| Response count | `<PLACEHOLDER>` |
| Time (local, ISO) | `<PLACEHOLDER>` |
| `/api/health` version | `<PLACEHOLDER>` |
| Current Cloud Run revision | `<PLACEHOLDER>` |

Read-only commands:

```powershell
# Purpose: record the running version before the test
curl.exe -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health
```

```powershell
# Purpose: record the revision serving before the test
gcloud run services describe s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026 --format="value(status.latestReadyRevisionName)"
```

## 4. Step 2 — Restart (new Cloud Run revision, same image)

Force a fresh container **without changing the image** by updating a harmless env var (restart marker). Numbered command pack for a human (PowerShell):

```powershell
# 1. Purpose: confirm the image digest currently deployed (baseline, read-only)
gcloud run revisions describe s3ed50763-00002-tv6 --region=asia-southeast1 --project=cpe-se-course-2026 --format="value(spec.template.spec.containers[0].image)"
```

```powershell
# 2. Purpose: force a NEW revision from the same image via a harmless env var
# [CHANGES SERVICE] — creates a revision and shifts traffic to it
gcloud run services update s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026 --update-env-vars="RESTART_MARKER=persistence-<YYYYMMDD-HHMM>"
```

```powershell
# 3. Purpose: confirm the new revision is serving 100% of traffic (read-only)
gcloud run services describe s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026 --format="table(status.latestReadyRevisionName, status.traffic.revisionName, status.traffic.percent, status.traffic.latestRevision)"
```

```powershell
# 4. Purpose: list revisions (read-only) — keep the new revision name for evidence
gcloud run revisions list --service=s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026
```

```powershell
# 5. Purpose: verify the new revision runs the SAME image digest (read-only)
gcloud run revisions describe <new-revision-name> --region=asia-southeast1 --project=cpe-se-course-2026 --format="value(spec.template.spec.containers[0].image)"
```

**Observe scale to zero** (read-only, time-dependent): leave the service idle ~10 minutes, then in Console → Cloud Run `s3ed50763` → **Metrics** confirm *Container instance count* = 0 (min instances is 0). The next request cold-starts (slower first response). No command changes anything here.

**Verify after restart:**

1. `/api/health` still 200 (curl above).
2. Owner logs in (or existing session still valid — within TTL) and opens the survey summary: same title, same survey ID, **same response count**.
3. Respondent's response is still listed.

## 5. Step 3 — Redeploy through the pipeline

**Trigger** — `deploy.yml` supports `workflow_dispatch`, so:

- **Manual (preferred for the test):** GitHub → Actions → **Deploy demo** → **Run workflow** → branch `main`, `image_tag` **left empty** (empty = test, build and deploy current `main`). [via GitHub UI]
- **Otherwise:** a normal release PR `sprint1-staging` → `main`; merging triggers the same pipeline on push.

**What to check in the run:**

1. Job `test` ran the CI workflow (`test-and-docker`) and passed — deploy is skipped if it fails.
2. Image tag = full 40-character commit SHA (validate step rejects anything else).
3. Step summary shows the image **digest** (`@sha256:...`), `Rollback: false`, service URL.
4. Migration job `s3ed50763-migrate` executed with `--wait` and succeeded (prereq: Cloud SQL RUNNING).
5. Smoke test passed: `/api/health` version == IMAGE_TAG, `/api/ready` DB connected, `/` HTML, plus login/`/api/auth/me`/logout if `SMOKE_EMAIL`/`SMOKE_PASSWORD` are configured.

**Verify after redeploy:** repeat the Step 2 verification (records exist, summary counts unchanged, session works or re-login), then:

```powershell
# Purpose: version must equal the new commit SHA (read-only)
curl.exe -s https://s3ed50763-4d7hbszvwq-as.a.run.app/api/health
```

## 6. Step 4 (optional) — Rollback and roll forward  **[OPTIONAL]**

> **Safety:** this is only safe if migrations are **additive** (no destructive/irreversible schema change), so an older image can still run against the current database.

- **Option A — via the workflow [CHANGES SERVICE]:** Deploy demo → Run workflow → branch `main`, `image_tag` = full 40-char SHA of a previous known-good commit. Tests, build and migration are skipped; the service is pointed back at that image and the smoke test runs.
- **Option B — route traffic to an earlier revision [CHANGES SERVICE]:**

```powershell
# Purpose: send 100% of traffic to an earlier revision (read the name from revisions list first)
gcloud run services update-traffic s3ed50763 --to-revisions=<earlier-revision>=100 --region=asia-southeast1 --project=cpe-se-course-2026
```

- **Smoke check:** `/api/health` (read-only curl), owner login, summary counts unchanged.
- **Roll forward [CHANGES SERVICE]:** re-run Deploy demo with the newer SHA, or:

```powershell
# Purpose: send 100% of traffic back to the latest revision
gcloud run services update-traffic s3ed50763 --to-latest --region=asia-southeast1 --project=cpe-se-course-2026
```

## 7. Evidence table (template)

`TODO: fill after the test.`

| Check | Before (time, revision, version) | After restart | After redeploy | Result | Screenshot figure |
|---|---|---|---|---|---|
| Distinctive survey `L5-08 persistence <...>` exists | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | Figure 1 / 3 |
| Response count unchanged (owner summary) | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | Figure 1 / 3 |
| Session works (or re-login works) | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | — |
| `/api/health` version | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` (= new SHA) | `<PLACEHOLDER>` | Figure 5 |
| New revision serving 100% traffic / same image digest | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | `<PLACEHOLDER>` | Figure 2 / 4 |
| Rollback + roll forward records intact (optional) | — | — | `<PLACEHOLDER>` | `<PLACEHOLDER>` | — |

**Screenshots to take** (URL bar visible, revision/time visible, **no secrets** — no passwords, cookies, connection strings, or env values):

1. Owner summary with the distinctive title and response counts (public URL visible).
2. Revision list / describe showing the new revision at 100% traffic, with timestamp.
3. The same owner summary **after** the restart.
4. The Deploy demo run step summary (commit SHA, digest, smoke test passed).
5. `/api/health` output **after** the redeploy (`version` = new commit SHA).

**Caption format:** `Figure N. C-05 (R-04): <what> ; <URL>; <revision>; <commit>`

## 8. Cost control

Target settings (as provisioned by `deploy/deploy.sh`): Cloud Run **min instances 0**, **max instances 3**; Cloud SQL tier **`db-f1-micro`** (smallest).

Read-only checks:

```powershell
# Purpose: read min/max instances (read-only)
gcloud run services describe s3ed50763 --region=asia-southeast1 --project=cpe-se-course-2026 --format="value(spec.template.spec.scaling.minInstanceCount, spec.template.spec.scaling.maxInstanceCount)"
```

```powershell
# Purpose: read Cloud SQL tier and activation policy (read-only)
gcloud sql instances describe s3ed50763-pg --project=cpe-se-course-2026 --format="value(settings.tier, settings.activationPolicy)"
```

Pause / resume Cloud SQL — **[CHANGES STATE] — both members must read this block before running either command:**

```powershell
# [CHANGES STATE] Purpose: pause Cloud SQL when idle (stops compute charges; data is NOT deleted)
gcloud sql instances patch s3ed50763-pg --project=cpe-se-course-2026 --activation-policy=NEVER
```

```powershell
# [CHANGES STATE] Purpose: resume Cloud SQL (must run before any test or release)
gcloud sql instances patch s3ed50763-pg --project=cpe-se-course-2026 --activation-policy=ALWAYS
```

**Warnings:**

- The instance must be **RUNNING** (`activationPolicy = ALWAYS`) before **any** test or release — otherwise the app, migration job and smoke test cannot reach the database and will fail.
- Stopping (`NEVER`) does **not** delete data; it only stops the instance. Deleting the instance would.

## 9. Known limitations

- A pass proves persistence only for the records created in Step 1 at the times measured — not for every feature or data type.
- Seeded demo data is recreated by `prisma:seed` on every migration job run, so seeded rows are **not** reliable evidence; use the distinctive UI-created record.
- The session check is bounded by the 60-minute TTL: "login works again" is an accepted fallback, not proof the original session survived.
- Step 2 changes an env var, so the new revision is not byte-identical configuration-wise; the image digest staying the same is what proves "same image".
- Scale-to-zero observation depends on the idle window and the Console metrics view.
