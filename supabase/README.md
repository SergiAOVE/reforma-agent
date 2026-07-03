# supabase/

Database infrastructure managed with the Supabase CLI.

- `config.toml` — local stack configuration (`supabase start`).
- `migrations/` — versioned SQL migrations:
  - `20260702120000_create_enums.sql` — the 10 domain enums.
  - `20260702120100_create_tables.sql` — the 14 core tables, indexes and `updated_at` triggers.
  - `20260702120200_enable_rls.sql` — RLS helpers and policies (commented).
  - `20260703090000_phase2_membership_helpers.sql` — project creation and membership RPCs,
    co-member profile visibility, fixed bootstrap policy.
- `seed/` — synthetic development data (never real data). Applied by `supabase db reset`.
- `policies/` — reserved for standalone policy docs (Storage policies arrive in Phase 4).

## Local workflow

```bash
supabase start      # start the local stack (requires Docker)
supabase db reset   # apply all migrations + seed from scratch
supabase stop       # stop the stack
```

Seeded test users (local only): `ana@example.com` (owner) and `luis@example.com` (editor),
password `password123`.

## Rules

- RLS enabled on all project data tables; policies based on `project_members`.
- Private buckets; the service role key lives on the server/worker only.
- The TypeScript mirrors of the SQL enums live in `packages/core/src/enums.ts` — keep in sync.
