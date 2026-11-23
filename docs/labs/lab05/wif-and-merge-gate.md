# Workload Identity Federation and Merge Gate (L5-06 / #30)

Companion to [deployment.md](deployment.md). Documentation only: every command below is **printed for a human to run**; none of them were executed while writing this file. Values from `deployment.md` (project, region, resource names) are reused as-is; everything else is a `<PLACEHOLDER>`.

## 1. WIF design (no keys, ever)

- **One deployer service account**, least privilege: `s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com`. It gets only what `deploy.yml` touches (see §2). **No service-account JSON key is created for it — WIF only.**
- **One workload identity pool** (`<POOL_ID>`) and **one OIDC provider** (`<PROVIDER_ID>`) with issuer `https://token.actions.githubusercontent.com`.
- **Attribute mapping**: `google.subject=assertion.sub`, `attribute.repository=assertion.repository`, `attribute.ref=assertion.ref`, `attribute.actor=assertion.actor`.
- **Attribute condition**: `assertion.repository=='Worapol360/cpe334-group-project' && assertion.ref=='refs/heads/main'` — only this repository's `main` branch may present a usable token.
- **Restrict further to `refs/heads/main`?** Yes — recommended: it costs nothing (`deploy.yml` only triggers on `main`, including `workflow_dispatch` rollbacks) while stopping any other branch or workflow in the repo from presenting a deployer token. The one-line trade-off: you cannot run a WIF smoke test from a non-main branch. If you skip the `ref` clause, keep the repository clause.
- GitHub environment `demo` is part of the OIDC subject (`:environment:demo`), so the pool binding in §2 pins the full subject, not just the repo.

### GitHub OIDC subject by job context

The `sub` claim changes with the job's context — there is no single "repo subject":

| Job context | OIDC subject (`sub`) |
|---|---|
| Push to `main` (no `environment:`) | `repo:<owner>/<repo>:ref:refs/heads/main` |
| `pull_request` | `repo:<owner>/<repo>:pull_request` |
| Job with `environment: demo` (push to `main` **or** `workflow_dispatch`) | `repo:<owner>/<repo>:environment:demo` (no ref) |
| `workflow_dispatch` without `environment:` | `repo:<owner>/<repo>:ref:refs/heads/main` |

**The deploy job uses the third row.** `.github/workflows/deploy.yml` declares `environment: demo` on the `deploy` job, and that job runs on both triggers (push to `main`, manual `workflow_dispatch`), so its subject is exactly `repo:Worapol360/cpe334-group-project:environment:demo` — no `:ref:` segment. The IAM binding in §2.5 uses `principal://.../subject/repo:Worapol360/cpe334-group-project:environment:demo` to match it one-to-one, while the provider attribute condition (`repository` + `refs/heads/main`) matches the triggers the workflow accepts.

⚠ Adding or removing `environment:` in a job **changes the subject** (rows 1/3 swap); you must then update the binding member — or the attribute condition — before the next run, or authentication fails with "The given credential is rejected by the attribute condition".

## 2. Command pack (PowerShell, one command per block)

Run from anywhere with `gcloud` authenticated to project `cpe-se-course-2026`. Replace every `<PLACEHOLDER>` first. Blocks marked **⚠ IAM CHANGE — read carefully** modify IAM policy.

**1 — Enable the APIs WIF and the deploy job need**

```powershell
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com run.googleapis.com artifactregistry.googleapis.com --project=cpe-se-course-2026
```

Purpose: `iamcredentials` + `sts` are required for WIF token exchange; `iam` for pools/SAs; `run` and `artifactregistry` are what `deploy.yml` calls.

**2 — Create the deployer service account (no key)**

```powershell
gcloud iam service-accounts create s3ed50763-deployer --display-name="Lab5 WIF deployer" --project=cpe-se-course-2026
```

Purpose: the single principal the pipeline may assume; never run `keys create` for it.

**3 — Create the workload identity pool**

```powershell
gcloud iam workload-identity-pools create <POOL_ID> --location=global --project=cpe-se-course-2026
```

Purpose: container for the GitHub OIDC provider.

**4 — Create the OIDC provider with mapping and condition**

```powershell
gcloud iam workload-identity-pools providers create-oidc <PROVIDER_ID> --location=global --workload-identity-pool=<POOL_ID> --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" --attribute-condition="assertion.repository=='Worapol360/cpe334-group-project' && assertion.ref=='refs/heads/main'" --project=cpe-se-course-2026
```

Purpose: trust `token.actions.githubusercontent.com` tokens only from this repository's `main`.

**5 — ⚠ IAM CHANGE — let the GitHub principal assume the deployer SA**

```powershell
gcloud iam service-accounts add-iam-policy-binding s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com --member="principal://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL_ID>/subject/repo:Worapol360/cpe334-group-project:environment:demo" --role=roles/iam.workloadIdentityUser --project=cpe-se-course-2026
```

Purpose: grants `roles/iam.workloadIdentityUser` to **one single subject** — `principal://.../subject/<SUBJECT>` is the correct form for a single OIDC subject; a `principalSet://.../subject/...` member does not exist (the `principalSet` form is only for sets such as `principalSet://.../attribute.repository/<owner>/<repo>`). The subject is the deploy job's actual context: this repo, GitHub environment `demo` (see the subject table in §1) — **no `:ref:` segment**, because an environment job's subject drops the ref. The provider attribute condition (`assertion.repository=='Worapol360/cpe334-group-project' && assertion.ref=='refs/heads/main'`) already restricts the same repository and the branches this workflow runs on, so binding and condition agree. Before running, print your real subject with `gh api repos/Worapol360/cpe334-group-project/actions/oidc/customization/sub` and swap in the exact claim if it uses immutable owner/repo IDs.

Equivalent, coarser alternative (binds every job in the repo that satisfies the attribute condition instead of just environment `demo`): `principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL_ID>/attribute.repository/Worapol360/cpe334-group-project` — note it is `attribute.repository/<owner>/<repo>`, never `attribute.repository` combined with a subject.

**6 — ⚠ IAM CHANGE — Cloud Run update/execute rights**

```powershell
gcloud projects add-iam-policy-binding cpe-se-course-2026 --member="serviceAccount:s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com" --role=roles/run.developer --quiet
```

Purpose: `roles/run.developer` covers what `deploy/release.sh` does — `gcloud run jobs update`/`execute` (migration) and `gcloud run services update`/`update-traffic`/`describe`. No `run.admin`.

**7 — ⚠ IAM CHANGE — image push, scoped to the repository**

```powershell
gcloud artifacts repositories add-iam-policy-binding s3ed50763 --location=asia-southeast1 --member="serviceAccount:s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com" --role=roles/artifactregistry.writer --project=cpe-se-course-2026
```

Purpose: `roles/artifactregistry.writer` on repo `s3ed50763` only, for the `docker push` of the commit-SHA image (deploy.yml step 4); project-wide writer is not granted.

**8 — ⚠ IAM CHANGE — actAs on the runtime service account**

```powershell
gcloud iam service-accounts add-iam-policy-binding s3ed50763-runner@cpe-se-course-2026.iam.gserviceaccount.com --member="serviceAccount:s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com" --role=roles/iam.serviceAccountUser --project=cpe-se-course-2026
```

Purpose: `roles/iam.serviceAccountUser` (actAs) on `s3ed50763-runner` only — required so `gcloud run` may update the job/service that runs as that SA; bound to this one SA, not project-wide.

**Roles deliberately NOT granted**: `owner`/`editor` (never), `roles/secretmanager.*` (deploy.yml reads no secrets; the migration job and service read them as the runtime SA), `roles/cloudsql.*` (Cloud SQL is reached at runtime inside the job/service, not by the workflow).

## 3. Read-only verification and GitHub values

Verification (reads only):

```powershell
gcloud iam workload-identity-pools describe <POOL_ID> --location=global --project=cpe-se-course-2026
```

Purpose: confirm the pool exists.

```powershell
gcloud iam workload-identity-pools providers describe <PROVIDER_ID> --location=global --workload-identity-pool=<POOL_ID> --project=cpe-se-course-2026
```

Purpose: confirm issuer, mapping and condition.

```powershell
gcloud iam service-accounts describe s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com --project=cpe-se-course-2026
```

Purpose: confirm the deployer SA (and that no keys exist — `keys` list stays empty).

```powershell
gcloud projects get-iam-policy cpe-se-course-2026 --flatten="bindings" --filter="bindings.members:serviceAccount:s3ed50763-deployer" --format="table(bindings.role)"
```

Purpose: list the project role bindings held by the deployer SA (expect `roles/run.developer` and nothing broader).

```powershell
gcloud iam service-accounts get-iam-policy s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com --project=cpe-se-course-2026
```

Purpose: list the SA-level bindings (expect the `roles/iam.workloadIdentityUser` binding on the `principal://.../subject/repo:Worapol360/cpe334-group-project:environment:demo` member).

```powershell
gcloud projects describe cpe-se-course-2026 --format="value(projectNumber)"
```

Purpose: print `<PROJECT_NUMBER>` for the `WIF_PROVIDER` path.

Exact values to copy into **GitHub → Settings → Environments → `demo`** (deploy.yml reads them from `vars.*` / `secrets.*` of that environment):

| GitHub name | Kind | Value |
|---|---|---|
| `GCP_PROJECT_ID` | variable | `cpe-se-course-2026` |
| `GCP_REGION` | variable | `asia-southeast1` |
| `WIF_PROVIDER` | variable | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL_ID>/providers/<PROVIDER_ID>` |
| `WIF_SERVICE_ACCOUNT` | variable | `s3ed50763-deployer@cpe-se-course-2026.iam.gserviceaccount.com` |
| `SMOKE_EMAIL` | variable (optional) | `<PLACEHOLDER>` |
| `SMOKE_PASSWORD` | **secret** (optional) | `<PLACEHOLDER>` |

These four GCP values are **identifiers, not keys** — a provider resource name and an SA email cannot authenticate anything by themselves; the OIDC exchange still requires GitHub's signed token. Store them as Actions environment variables (and `SMOKE_PASSWORD` as the only secret), never print them in logs, never add a JSON key. Set `SMOKE_EMAIL` + `SMOKE_PASSWORD` together or not at all.

## 4. GitHub ruleset checklist (merge gate)

For **`main`** and **`sprint1-staging`** (add **`sprint2-staging`** once that branch exists) — Settings → Rules → Rulesets → branch ruleset, enforcement **Active**:

- [ ] Require a pull request before merging
- [ ] Required approvals: **1**
- [ ] Require status checks to pass: **`test-and-docker`** (pick it via "Add checks"; see §6)
- [ ] Block force pushes
- [ ] Block deletions
- [ ] Bypass list: **empty** (no users, teams or apps)

Repository-wide — Settings → Code security and analysis:

- [ ] Secret scanning: **on**
- [ ] Push protection: **on**
- [ ] Repository visibility: **Public** (Settings → General → Danger Zone)

## 5. C-02 demo — a failing test blocks the merge

1. `git switch -c temp/lab5-failing-check` from up-to-date `sprint1-staging`.
2. Break exactly one test (e.g. flip an assertion in one unit test). Do not change application code and do not touch any released branch.
3. Commit, push, open a pull request **into `sprint1-staging`** (a normal PR, not a draft).
4. Expected result: job `test-and-docker` fails; the PR shows the required check failing and the merge button disabled ("Required" / merge blocked).
5. **Close the PR without merging.** Keep the temp branch, the closed PR and the failed CI run as evidence. Never merge it; never touch the released application.

**Result** (C-02 evidence):

- Ruleset **`protect-main-and-staging`** active on `main` and `sprint1-staging`.
- Demo PR **#39** from `temp/lab5-failing-check` into `sprint1-staging`.
- Check **`CI / test-and-docker (pull_request)`** failed (failing after 2m).
- GitHub **blocked the Merge button** (required check not passing).
- **PR #39 closed without merging**; the branch, the PR and the CI run were kept as evidence.
- Screenshot kept for the Lab 5 report.
- Run link: `<run link>` · Breaking commit: `<commit>`

## 6. Known limitations

- WIF can only be proven by a real run: the first `deploy.yml` run (L5-07). Sections 2–3 are setup and read-only verification only — no workflow was executed here.
- A required status check must have run at least once on the repository before it appears in the ruleset's "Add checks" list; run one PR through `test-and-docker` first.
- The OIDC `sub` claim varies by job context (see the table in §1): an `environment: demo` job has `repo:<owner>/<repo>:environment:demo` with **no ref**, while a plain push to `main` has `repo:<owner>/<repo>:ref:refs/heads/main`. The pool binding must match the deploy job's subject exactly (the `principal://.../subject/...` member in §2.5) or authentication fails with "The given credential is rejected by the attribute condition". The claim may also carry immutable owner/repo IDs — print it with the `gh api` command in §2.5 if in doubt.
- `sprint2-staging` ruleset is added when the branch exists.
