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

| Role   | Capabilities                                  |
| ------ | --------------------------------------------- |
| owner  | Full project control                          |
| admin  | Project management except removing the owner  |
| editor | Create visits, evidence, issues and decisions |
| viewer | Read only                                     |

## RLS implementation (Phase 1)

Implemented in [supabase/migrations/20260702120200_enable_rls.sql](../../supabase/migrations/20260702120200_enable_rls.sql)
(every policy is commented in the SQL). Summary:

**Helper functions** — `SECURITY DEFINER`, `STABLE`, pinned `search_path`, execute revoked from
`anon`. Definer rights are required so that policies on `project_members` can check membership
without recursing into their own policy:

| Helper                              | Meaning                                        |
| ----------------------------------- | ---------------------------------------------- |
| `is_project_member(project_id)`     | Current user belongs to the project (any role) |
| `has_project_role(project_id, r[])` | Current user has one of the given roles        |
| `can_edit_project(project_id)`      | Role is owner, admin or editor                 |

**Policy pattern per table:**

| Table                                                                                         | select | insert                    | update             | delete                         |
| --------------------------------------------------------------------------------------------- | ------ | ------------------------- | ------------------ | ------------------------------ |
| `profiles`                                                                                    | own    | own                       | own                | — (cascade from `auth.users`)  |
| `projects`                                                                                    | member | creator (`created_by`)    | owner/admin        | owner                          |
| `project_members`                                                                             | member | owner/admin + bootstrap   | owner/admin        | owner/admin; owner rows: owner |
| `zones`, `trades`, `documents`, `contract_items`, `visits`, `evidence`, `issues`, `decisions` | member | owner/admin/editor        | owner/admin/editor | owner/admin/editor             |
| `audio_transcriptions`                                                                        | member | — (worker only)           | editors            | — (raw transcript preserved)   |
| `agent_jobs`                                                                                  | member | editors (self as creator) | — (worker only)    | — (worker only)                |
| `audit_log`                                                                                   | member | member, about self        | —                  | — (append-only)                |

Notes:

- **Bootstrap**: right after creating a project, the creator may insert themselves as `owner`
  into `project_members`; everything else requires owner/admin.
- **Admins cannot remove owners**: deleting an `owner` membership requires the `owner` role.
- **`anon` gets nothing**: all policies target `authenticated` only.
- **The worker bypasses RLS** with the service role key; that is why job state transitions and
  transcript creation have no client policies at all.
- Finer per-role rules (e.g. who may publish a visit) arrive with the phases that build the
  corresponding UI.

## Open source deployment model

Each user deploys their own instance and configures their own Supabase project. There is no
central multi-tenant service: each renovation's data stays under the control of whoever deploys.

## Status

Phase 1 done: schema + RLS live in migrations, with synthetic seed for local development.
Storage bucket policies are documented as pending and will be implemented with the upload flows
(**Phase 4** at the latest).
