# Deployment

> Status: **Phase 9 documentation**. This guide documents how to deploy the
> current MVP. It does not add product features.

## Deployment model

`reforma-agent` has three deployable parts:

| Part          | Runtime                   | Purpose                                                          |
| ------------- | ------------------------- | ---------------------------------------------------------------- |
| `apps/web`    | Next.js App Router        | Authenticated PWA, uploads, dashboards and review UI             |
| Supabase      | Hosted Supabase project   | Auth, Postgres, private Storage and RLS                          |
| `apps/worker` | Always-on Node.js process | Polls `agent_jobs`, transcribes audio and runs text-only AI jobs |

The web app and worker communicate only through Supabase. The web app never uses the service role
key and never runs long AI work inside a request.

## Environments

Use separate Supabase projects for production and any serious staging or preview environment.
Preview deployments should not point at production unless you explicitly accept preview users and
preview code touching production renovation data.

Recommended layout:

| Environment     | Web                               | Supabase                          | Worker                              |
| --------------- | --------------------------------- | --------------------------------- | ----------------------------------- |
| Local           | `pnpm dev`                        | Supabase CLI stack                | `pnpm --filter @reforma/worker dev` |
| Preview/staging | Vercel preview or staging project | Separate staging Supabase project | Separate worker instance            |
| Production      | Vercel production project         | Production Supabase project       | Production worker instance          |

Choose a Supabase region close to the worker and web runtime. If the web app runs on Vercel, set
the Vercel function region close to the Supabase project when latency matters.

## Environment variables

Never commit real values. Store production secrets in Vercel project settings and in the worker
host's secret store.

| Variable                        | Web | Worker            | Secret? | Notes                                                                           |
| ------------------------------- | --- | ----------------- | ------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes | optional fallback | no      | Supabase project API URL. Browser-visible.                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | no                | no      | Publishable/anon key. Browser-visible; RLS protects data.                       |
| `SUPABASE_URL`                  | no  | yes               | no      | Worker/server Supabase URL. Usually matches `NEXT_PUBLIC_SUPABASE_URL`.         |
| `SUPABASE_SERVICE_ROLE_KEY`     | no  | yes               | yes     | Worker only. Never add `NEXT_PUBLIC_`; never configure in Vercel web.           |
| `WORKER_ID`                     | no  | optional          | no      | Stable worker name for logs/locks. Defaults to a generated id.                  |
| `WORKER_POLL_INTERVAL_MS`       | no  | yes               | no      | Poll delay when no job is available. Default `5000`.                            |
| `WORKER_STALE_AFTER_SECONDS`    | no  | yes               | no      | Stale processing lock threshold. Default `600`.                                 |
| `WORKER_RUN_ONCE`               | no  | smoke only        | no      | Set `true` only for smoke tests or one-off runs.                                |
| `OPENAI_API_KEY`                | no  | optional          | yes     | Enables real transcription/text extraction. Without it, the mock provider runs. |
| `AI_PROVIDER_API_KEY`           | no  | optional          | yes     | Backward-compatible fallback when `OPENAI_API_KEY` is absent.                   |
| `OPENAI_TRANSCRIPTION_MODEL`    | no  | optional          | no      | Default `gpt-4o-mini-transcribe`.                                               |
| `OPENAI_TEXT_MODEL`             | no  | optional          | no      | Default `gpt-4o-mini`.                                                          |
| `OPENAI_BASE_URL`               | no  | optional          | no/yes  | Optional compatible API base URL. Treat as sensitive if private.                |

Security rules:

- Only `NEXT_PUBLIC_*` values may reach the browser.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` and `AI_PROVIDER_API_KEY` belong only in the
  worker or trusted operational scripts.
- Do not reuse production Supabase secrets in preview deployments unless the preview is fully
  trusted.

## Supabase production setup

1. Create a new Supabase project for production.
2. Set Auth URL configuration:
   - Site URL: production web URL, for example `https://reforma.example.com`.
   - Additional redirect URLs: production callback URLs and any trusted preview/staging URLs.
3. Keep email/password auth enabled if that remains the chosen login method.
4. Keep the Data API enabled for `public`, but rely on the explicit grants and RLS policies in
   the migrations.
5. Confirm `project-documents` and `visit-evidence` buckets remain private after migrations run.
6. Copy only the production URL and publishable/anon key into Vercel web env vars.
7. Copy the service role key only into the worker host.

Do not run `supabase db reset` against production. It is destructive and intended for local
development.

## Local-to-production migration workflow

Before deploying a migration:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
supabase db reset
supabase db lint --local
supabase migration list --local
```

Link each remote environment once:

```bash
supabase link --project-ref <production-project-ref>
supabase migration list --linked
```

Preview the remote migration plan:

```bash
supabase db push --dry-run
```

Apply pending migrations:

```bash
supabase db push
supabase migration list --linked
```

Notes:

- Do not pass `--include-seed` for production. The seed creates synthetic local users and demo
  data only.
- Prefer a CI/CD pipeline for production migrations once the project has multiple contributors.
- For risky schema changes, use expand/migrate/contract: add compatible structures first, deploy
  app code that can use both shapes, then remove old structures in a later release.
- Generate TypeScript types from the target schema only after schema changes are committed and
  verified locally:

```bash
supabase gen types typescript --local --schema public > packages/db/src/database.types.ts
```

## Vercel web deployment

`apps/web` is the only part that should run on Vercel.

Recommended Vercel project settings:

| Setting          | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Framework preset | Next.js                                                                                           |
| Root directory   | `apps/web`                                                                                        |
| Install command  | Vercel default pnpm install, or `corepack enable && pnpm install --frozen-lockfile` if overridden |
| Build command    | `pnpm build`                                                                                      |
| Output directory | Vercel default for Next.js                                                                        |
| Node.js version  | `22.x` or newer                                                                                   |

Environment variables for the Vercel web project:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Do not configure `SUPABASE_SERVICE_ROLE_KEY` on the Vercel web project. The code in `apps/web`
does not need it.

Recommended deploy sequence:

1. Apply Supabase migrations.
2. Deploy a Vercel preview.
3. Verify login, project list and dashboard load against the intended Supabase environment.
4. Promote or deploy to production.
5. Start or restart the worker after the database is migrated.

CLI example:

```bash
cd apps/web
vercel
vercel --prod
```

For custom CI, build and deploy separately:

```bash
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

## Worker deployment

Deploy `apps/worker` to an always-on Node.js host, not to a request-scoped serverless function.
Suitable hosts include a small VM, systemd service, Docker container, Fly.io machine, Render
background worker, Railway service or any equivalent process supervisor.

Requirements:

- Node.js >= 22.
- pnpm available through Corepack or installed on the host.
- Network access to the Supabase project and AI provider.
- A restart policy so the process comes back after crashes or host restarts.

Build and start:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm --filter @reforma/worker build
pnpm --filter @reforma/worker start
```

Worker production env:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
WORKER_ID=worker-production-1
WORKER_POLL_INTERVAL_MS=5000
WORKER_STALE_AFTER_SECONDS=600
OPENAI_API_KEY=<openai-key>
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TEXT_MODEL=gpt-4o-mini
```

Operational notes:

- Run one worker initially. The `claim_agent_job()` RPC uses row locking and stale-lock recovery,
  so multiple workers can be introduced later, but one worker is easier to observe.
- Do not set `WORKER_RUN_ONCE=true` in production.
- Logs are JSON-ish controlled messages and should never include secrets.
- The worker uses the service role key, so treat host access as production database access.

Smoke test a deployed worker:

1. Log in as an owner/admin/editor.
2. Upload an audio evidence file or create text AI/weekly summary jobs from the UI.
3. Confirm `agent_jobs.status` moves from `pending` to `processing` to `completed`.
4. Confirm the expected draft row appears and remains reviewable.
5. Confirm failed jobs carry a safe `error_message` and retry only up to `max_attempts`.

## Storage buckets

The migrations create two private buckets:

| Bucket              | Created by        | Max size | Purpose                                      |
| ------------------- | ----------------- | -------- | -------------------------------------------- |
| `project-documents` | Phase 3 migration | 10 MB    | Plans, quotes, invoices, warranties, annexes |
| `visit-evidence`    | Phase 4 migration | 50 MB    | Photos, audio, video and document evidence   |

Verification checklist:

- Buckets are private, not public.
- Object paths start with the project id; visit evidence also includes the visit id.
- Members receive signed URLs generated server-side.
- Uploads from the web app use the signed-in user's publishable-key session, not the service
  role.
- Photos remain evidence only; no AI vision or OCR pipeline is enabled.

## RLS verification

Run these checks after production migrations and before inviting real users:

1. Anonymous requests cannot read project data.
2. A user can read only projects where they have a `project_members` row.
3. A viewer can read but cannot create, update or delete project content.
4. Owner/admin/editor can create visits, evidence, setup data, budget items and review drafts.
5. `agent_jobs` can be inserted by editors but cannot be updated by clients.
6. `claim_agent_job()` cannot be executed by `anon` or `authenticated`; only the service role can
   claim work.
7. `audio_transcriptions` and `weekly_summaries` are inserted by the worker/service role and
   reviewed by editors through normal RLS.
8. Storage objects in both buckets are inaccessible without a valid project membership.

Useful SQL inspection queries from Supabase SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

```sql
select id, name, public, file_size_limit
from storage.buckets
where id in ('project-documents', 'visit-evidence');
```

## Backups and restore basics

Use Supabase managed backups for production. The CLI can also create portable SQL dumps for
manual restore drills:

```bash
supabase db dump --linked -f backups/schema-and-data.sql
supabase db dump --linked --data-only --use-copy -f backups/data.sql
```

Backup notes:

- Database dumps include database rows and Storage metadata, not necessarily the bytes stored in
  private Storage buckets. Export bucket objects separately when you need a fully portable backup.
- Keep backups encrypted and outside the repository.
- Test restores into a separate Supabase project before relying on a backup process.
- Preserve migration history (`supabase_migrations`) when restoring into a replacement project
  that will continue using the Supabase CLI.

Basic restore drill:

1. Create a temporary Supabase project.
2. Restore the database dump.
3. Restore or copy Storage bucket objects.
4. Verify migrations are recorded or repair migration history.
5. Point a staging web/worker deployment at the restored project.
6. Verify login, project isolation, signed URLs, worker processing and draft review.
7. Destroy the temporary restore project after the drill.

## Production security checklist

Before real renovation data enters the system:

- All production secrets live in platform secret stores, not in git.
- The Vercel web project has only publishable Supabase variables.
- The worker host has the service role key and OpenAI key; the web host does not.
- Supabase Auth Site URL and redirect URLs match the production domain.
- RLS is enabled on every project data table.
- Data API grants for new public tables are explicit and paired with RLS.
- Storage buckets are private and Storage RLS policies exist.
- The worker host has restart policy, log retention and alerting on crashes.
- Supabase backups are enabled and a restore drill has been performed.
- Production and preview environments do not accidentally share databases.
- No Telegram, NanoClaw, OCR, image analysis or document intelligence service is configured as
  part of the MVP deployment.

## Rollback guidance

Web rollback is straightforward: promote or redeploy a previous Vercel deployment.

Database rollback is more delicate. Prefer forward fixes over down migrations once production data
exists. If a bad migration shipped:

1. Stop the worker to prevent more background writes.
2. Disable or roll back the web deployment if it depends on the bad schema.
3. Assess whether a forward migration can repair the issue.
4. Restore from backup only when data corruption or irreversible schema damage requires it.
5. Re-run RLS and worker smoke tests before reopening access.
