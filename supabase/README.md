# supabase/

Database infrastructure (pending until Phase 1).

- `migrations/` — versioned SQL migrations.
- `seed/` — synthetic development data (never real data).
- `policies/` — RLS and Storage policies, commented in SQL.

Rules: RLS enabled on all project data tables, policies based on `project_members`, private
buckets, and service role key on the server/worker only.
