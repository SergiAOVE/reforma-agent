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

## RLS implementation (Phases 1–3)

Implemented in [20260702120200_enable_rls.sql](../../supabase/migrations/20260702120200_enable_rls.sql)
and [20260703090000_phase2_membership_helpers.sql](../../supabase/migrations/20260703090000_phase2_membership_helpers.sql)
[20260703171533_phase3_project_setup_storage.sql](../../supabase/migrations/20260703171533_phase3_project_setup_storage.sql)
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

**SQL RPCs (Phase 2)** — called from the web app; they never require the service role:

- `create_project_with_owner(name, address_label, description)` — `SECURITY INVOKER`; creates
  the project and the owner membership atomically under the normal RLS policies.
- `add_project_member_by_email(project_id, email, role)` — `SECURITY DEFINER` because the caller
  cannot see profiles of not-yet-member users; all permission checks run inside (caller must be
  owner/admin; only owners may grant the owner role) and the action is written to `audit_log`.

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

Phase 3 deliberately handles only project documents. Visit evidence (photos/audio/video) remains
Phase 4, and photos are still evidence only — no AI photo analysis.

## Open source deployment model

Each user deploys their own instance and configures their own Supabase project. There is no
central multi-tenant service: each renovation's data stays under the control of whoever deploys.

## Status

Phases 1–3 done: schema + RLS in migrations, auth and membership management live in the web
app, and private project document Storage is implemented. Visit evidence Storage policies arrive
with Phase 4.
