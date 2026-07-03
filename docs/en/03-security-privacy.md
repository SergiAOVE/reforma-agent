# Security and privacy

## Principles

- **RLS from the first real migration**: every project data table enables Row Level Security.
  Policies are based on `project_members` (project + membership + role).
- **Private storage**: photos, audio and documents go to private buckets. Access uses
  short-lived signed URLs, controlled by project and membership.
- **Service role on the server only**: the service role key is used only by the worker and
  server-side code. It is never sent to the browser or included in client bundles.
- **No secrets in the repo**: `.env.example` documents the variables without real values. Logs
  never include secrets.
- **Synthetic data**: tests and seeds never use real data about people or renovation sites.
- **Personal data minimization**: full postal addresses are avoided (`address_label` is a label)
  and only strictly necessary data is requested.
- **Role-based permissions**: owner, admin, editor and viewer with differentiated capabilities.
- **Traceability**: `audit_log` records relevant actions (publishing, approving or rejecting AI
  drafts, membership changes).

## Roles

| Role   | Capabilities                                                                       |
| ------ | ---------------------------------------------------------------------------------- |
| owner  | Full project control                                                               |
| admin  | Project management except removing the owner                                       |
| editor | Create setup data, documents, budget items, visits, evidence, issues and decisions |
| viewer | Read only                                                                          |

## RLS implementation (Phases 1–7)

Implemented in [20260702120200_enable_rls.sql](../../supabase/migrations/20260702120200_enable_rls.sql)
and [20260703090000_phase2_membership_helpers.sql](../../supabase/migrations/20260703090000_phase2_membership_helpers.sql),
[20260703171533_phase3_project_setup_storage.sql](../../supabase/migrations/20260703171533_phase3_project_setup_storage.sql)
and [20260703175220_phase4_visit_evidence_storage.sql](../../supabase/migrations/20260703175220_phase4_visit_evidence_storage.sql),
and [20260703182114_phase5_worker_job_claiming.sql](../../supabase/migrations/20260703182114_phase5_worker_job_claiming.sql)
and [20260703190634_phase7_summary_review_metadata.sql](../../supabase/migrations/20260703190634_phase7_summary_review_metadata.sql)
(every policy is commented in the SQL). Summary:

**Helper functions** — `SECURITY DEFINER`, `STABLE`, pinned `search_path`, execute revoked from
`anon`. Definer rights are required so that policies on `project_members` can check membership
without recursing into their own policy:

| Helper                              | Meaning                                        |
| ----------------------------------- | ---------------------------------------------- |
| `is_project_member(project_id)`     | Current user belongs to the project (any role) |
| `has_project_role(project_id, r[])` | Current user has one of the given roles        |
| `can_edit_project(project_id)`      | Role is owner, admin or editor                 |
| `is_project_creator(project_id)`    | Current user created the project (bootstrap)   |
| `shares_project_with(user_id)`      | Both users belong to some common project       |
| `storage_object_project_id(path)`   | First Storage path segment parsed as a UUID    |
| `storage_object_visit_id(path)`     | Second Storage path segment parsed as a UUID   |

**SQL RPCs (Phase 2)** — called from the web app; they never require the service role:

- `create_project_with_owner(name, address_label, description)` — `SECURITY INVOKER`; creates
  the project and the owner membership atomically under the normal RLS policies.
- `add_project_member_by_email(project_id, email, role)` — `SECURITY DEFINER` because the caller
  cannot see profiles of not-yet-member users; all permission checks run inside (caller must be
  owner/admin; only owners may grant the owner role) and the action is written to `audit_log`.
- `claim_agent_job(worker_id, allowed_types, stale_after_seconds)` — `SECURITY INVOKER`,
  executable only by `service_role`; atomically claims worker jobs with `FOR UPDATE SKIP LOCKED`.

**Policy pattern per table:**

| Table                                                                                         | select           | insert                    | update             | delete                         |
| --------------------------------------------------------------------------------------------- | ---------------- | ------------------------- | ------------------ | ------------------------------ |
| `profiles`                                                                                    | own + co-members | own                       | own                | — (cascade from `auth.users`)  |
| `projects`                                                                                    | member           | creator (`created_by`)    | owner/admin        | owner                          |
| `project_members`                                                                             | member           | owner/admin + bootstrap   | owner/admin        | owner/admin; owner rows: owner |
| `zones`, `trades`, `documents`, `contract_items`, `visits`, `evidence`, `issues`, `decisions` | member           | owner/admin/editor        | owner/admin/editor | owner/admin/editor             |
| `audio_transcriptions`                                                                        | member           | — (worker only)           | editors            | — (raw transcript preserved)   |
| `agent_jobs`                                                                                  | member           | editors (self as creator) | — (worker only)    | — (worker only)                |
| `audit_log`                                                                                   | member           | member, about self        | —                  | — (append-only)                |

Notes:

- **Bootstrap**: right after creating a project, the creator may insert themselves as `owner`
  into `project_members` (checked via `is_project_creator`, a definer helper — an inline
  subquery would run under RLS and never match); everything else requires owner/admin.
- **Admins cannot remove owners**: deleting an `owner` membership requires the `owner` role.
- **`anon` gets nothing**: all policies target `authenticated` only.
- **The worker bypasses RLS** with the service role key; that is why job state transitions and
  transcript creation have no client policies at all.
- **`INSERT … RETURNING` gotcha**: returned rows must also pass the table's SELECT policy.
  That is why `create_project_with_owner` generates the project id up front instead of using
  `RETURNING` (the creator only becomes a member one statement later).
- Finer per-role rules (e.g. who may publish a visit) arrive with the phases that build the
  corresponding UI.

## Web authentication (Phase 2)

- Supabase Auth (email + password) integrated in the Next.js App Router via `@supabase/ssr`.
- Sessions live in cookies; `apps/web/proxy.ts` refreshes tokens on every request and keeps
  unauthenticated visitors out of `/projects*`.
- Server components and server actions create a per-request client with the **publishable key**
  only ([apps/web/lib/supabase/server.ts](../../apps/web/lib/supabase/server.ts)); every query
  runs under RLS as the signed-in user. The service role key is not read anywhere in `apps/web`.
- The `profiles` row is created on first authenticated visit (`ensureProfile`).
- Server actions re-validate input with Zod (`packages/core/src/forms.ts`) and rely on RLS as
  the final authority — UI role checks are convenience, not enforcement.

## Private document storage (Phase 3)

Technical documents use the private `project-documents` bucket created by
`20260703171533_phase3_project_setup_storage.sql`. Object names must start with the project id:

```text
<project_id>/<uuid>-<sanitized-original-filename>
```

Storage RLS is on `storage.objects`:

| Operation | Policy                                          |
| --------- | ----------------------------------------------- |
| select    | project members may list/read/download objects  |
| insert    | owner/admin/editor may upload project documents |
| update    | owner/admin/editor may replace/update objects   |
| delete    | owner/admin/editor may delete project documents |

The web app uploads with the signed-in user's publishable-key session, not the service role.
Members receive short-lived signed URLs generated on the server. The bucket is not public.

## Private visit evidence storage (Phase 4)

Visit evidence uses the private `visit-evidence` bucket created by
`20260703175220_phase4_visit_evidence_storage.sql`. Object names must start with the project id
and visit id:

```text
<project_id>/<visit_id>/<uuid>-<sanitized-original-filename>
```

Storage RLS is on `storage.objects`:

| Operation | Policy                                                             |
| --------- | ------------------------------------------------------------------ |
| select    | project members may list/read/download files                       |
| insert    | owner/admin/editor may upload evidence files for an existing visit |
| update    | owner/admin/editor may update evidence files for an existing visit |
| delete    | owner/admin/editor may delete evidence files                       |

The web app uploads evidence with the signed-in user's publishable-key session and stores
metadata in `evidence`. Server components create short-lived signed URLs for project members.
The bucket accepts photos, audio, video, PDF, text, CSV and Office document files up to 50 MB.

Photos are evidence only. Phase 4 does not perform OCR, AI vision, photo analysis, transcription,
worker polling or automatic issue/decision extraction.

## Worker and AI job security (Phases 5–6)

- `apps/web` can only enqueue `agent_jobs` through normal authenticated RLS policies. It cannot
  update job status, forge worker output, write `audio_transcriptions` or write AI provenance as
  the worker.
- `apps/worker` is the only runtime that reads `SUPABASE_SERVICE_ROLE_KEY`. It creates a
  service-role Supabase client with session persistence disabled.
- `claim_agent_job()` is not executable by `anon` or `authenticated`; only `service_role` can
  claim pending/stale jobs.
- The worker processes only the implemented job types:
  `transcribe_audio`, `generate_visit_summary`, `suggest_issues` and `suggest_decisions`.
  Other enum values stay reserved for later phases and fail permanently if claimed.
- `transcribe_audio` rejects non-audio evidence as a permanent job failure.
- Private audio is downloaded from the `visit-evidence` bucket by the worker service role.
  Project members still access evidence through signed URLs in the web app.
- Transcripts are reviewable: the worker writes `raw_transcript` and initial `edited_transcript`;
  editors may update only the editable transcript field through RLS.
- Phase 6 text extraction never downloads files from Storage. Its context is limited to visit
  notes, edited transcripts, zones/trades, document metadata and budget metadata.
- Issue and decision suggestions are inserted as `ai_draft` rows with `source = 'ai'` and
  `created_by_job_id`. They are visible to project members but remain drafts until a human review
  workflow is implemented.

Phase 6 does not implement OCR, AI vision, photo analysis, Telegram or NanoClaw.

## Human review security (Phase 7)

- Review actions are normal Next.js server actions using the signed-in user's publishable-key
  Supabase session. They do not use or read the service role key.
- RLS remains the final authority: owner/admin/editor roles can update summaries, issues and
  decisions; viewers can read but submitted review forms match zero rows.
- Every approve/edit/reject/close action writes an `audit_log` row with the acting user,
  entity id and previous/new review state or status.
- Summary review metadata lives on `visits`, protected by the existing `visits` RLS policies.
- Issue and decision review uses the existing `issues` and `decisions` RLS policies.
- Review actions do not enqueue worker jobs and do not run AI inside web requests.

## Open source deployment model

Each user deploys their own instance and configures their own Supabase project. There is no
central multi-tenant service: each renovation's data stays under the control of whoever deploys.

## Status

Phases 1–7 done: schema + RLS in migrations, auth and membership management live in the web app,
private project document Storage and private visit evidence Storage are implemented, and the
service-role worker can transcribe audio evidence and generate reviewable text drafts through
`agent_jobs`; project members can now review AI drafts with audit logging.
