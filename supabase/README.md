# Supabase

Phase 1 creates the initial migration, synthetic seed data, and storage policy notes.

Structure:

```text
supabase/
  migrations/
  seed/
  policies/
```

Files:

- `migrations/20260703093000_initial_schema_rls.sql`
- `seed/0001_synthetic_seed.sql`
- `policies/storage-phase-1-notes.md`

The Supabase CLI was not available in the implementation environment, so the migration filename was created manually and local `db reset` / advisors were not run.
