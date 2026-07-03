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

## Phase 0 Status

Phase 0 only creates repository scaffolding and documentation. It does not create Supabase tables, policies, buckets, or authentication flows.

## Future Browser Boundary

Only `NEXT_PUBLIC_*` environment variables may be available to browser code. Server-only keys belong in worker or server runtime environments.
