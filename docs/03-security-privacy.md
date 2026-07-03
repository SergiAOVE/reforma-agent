# Security and Privacy

Security starts with project membership and private storage.

## Principles

- Enable RLS before storing project data.
- Filter project data by membership in `project_members`.
- Keep Supabase buckets private.
- Never expose the Supabase service role key in the browser.
- Do not log secrets.
- Use synthetic data in tests and seeds.
- Minimize personal data.
- Record relevant user actions in `audit_log`.

## Baseline Status

Phase 0 only created repository scaffolding and documentation.

## Phase 1 RLS Model

Phase 1 adds the initial schema and base RLS policies.

All project data tables enable RLS. Access is based on `project_members`:

- `owner`: full project control in base policies.
- `admin`: project management except owner-member changes in base membership policies.
- `editor`: can create and update project work data.
- `viewer`: read-only project access.

The migration uses `TO authenticated` policies instead of deprecated `auth.role()` checks.

## Helper Functions

`app_private` contains RLS helper functions:

- `current_project_role(project_id)`
- `is_project_member(project_id)`
- `has_project_role(project_id, roles)`
- `project_created_by_current_user(project_id)`
- `users_share_project(user_id)`

These are `SECURITY DEFINER` functions because `project_members` policies otherwise need recursive reads of `project_members`. They live outside `public`, have a fixed `search_path`, use `auth.uid()` internally, and only expose current-user membership checks.

## API Grants

The migration includes explicit grants for `authenticated` and `service_role`. `anon` table access is revoked. RLS still controls row visibility after table-level grants.

## Storage

Phase 1 does not create Storage buckets or policies. Storage policy direction is documented in `supabase/policies/storage-phase-1-notes.md`.

## Future Browser Boundary

Only `NEXT_PUBLIC_*` environment variables may be available to browser code. Server-only keys belong in worker or server runtime environments.

## Current Verification Gap

The Supabase CLI is not installed in this environment, so `supabase db reset`, local RLS test queries, and `supabase db advisors` were not run. The SQL files are prepared for a Supabase environment and should be validated before Phase 2 implementation depends on them.
