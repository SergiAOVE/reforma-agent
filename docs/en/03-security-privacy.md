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

## Open source deployment model

Each user deploys their own instance and configures their own Supabase project. There is no
central multi-tenant service: each renovation's data stays under the control of whoever deploys.

## Status

Phase 0: principles documented only. Concrete RLS policies are written and commented in SQL in
**Phase 1**, and Storage policies no later than **Phase 4**.
