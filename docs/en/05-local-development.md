# Local development

## Requirements

- Node.js >= 22
- pnpm (recommended via corepack: `corepack enable pnpm`)

## Getting started

```bash
git clone <repo>
cd reforma-agent
pnpm install
cp .env.example .env   # fill in values once Supabase exists (Phase 1+)
```

## Scripts

| Command          | What it does                                |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Starts web (Next.js) and worker in parallel |
| `pnpm build`     | Builds web and worker                       |
| `pnpm lint`      | ESLint across the monorepo                  |
| `pnpm typecheck` | `tsc --noEmit` in each package              |
| `pnpm test`      | Vitest in packages with tests               |
| `pnpm format`    | Prettier across the repository              |

The web app runs at `http://localhost:3000`. In Phase 0 the worker only writes a controlled
startup log and exits (in `dev` mode it stays in watch).

## Supabase

Requires the [Supabase CLI](https://supabase.com/docs/guides/local-development) and Docker.

```bash
supabase start      # start the local stack (first run downloads images)
supabase db reset   # apply all migrations + synthetic seed from scratch
supabase status     # show local URLs and keys for .env
supabase stop       # stop the stack
```

`supabase status` prints the local `API URL` and keys. For the web app, create
`apps/web/.env.local` (gitignored) with:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from supabase status>
```

For the worker, export server-only variables in your shell or a local process manager:

```bash
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_SERVICE_ROLE_KEY=<secret/service role key from supabase status>
WORKER_POLL_INTERVAL_MS=5000
```

Without `SUPABASE_SERVICE_ROLE_KEY`, the worker logs that it is disabled and exits cleanly so
local web development can still run. Without an AI API key, Phase 5 uses `MockAiProvider` and
stores deterministic mock transcripts; Phase 6 also uses deterministic mock summaries, issue
drafts and decision drafts. To use real OpenAI-backed processing, configure:

```bash
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TEXT_MODEL=gpt-4o-mini
```

Run one polling pass for local smoke tests:

```bash
WORKER_RUN_ONCE=true pnpm --filter @reforma/worker dev
```

Seeded test users (local only): `ana@example.com` (owner) and `luis@example.com` (editor),
password `password123`.

Phase 3 creates a private `project-documents` Storage bucket. Document uploads are capped at
10 MB by the bucket configuration and by the web form. Budget CSV imports are capped at 512 KB.

Phase 4 creates a private `visit-evidence` Storage bucket. Evidence uploads are capped at 50 MB
and accept common image, audio, video, PDF, text, CSV and Office document MIME types. Evidence
files are linked to visits and can optionally reference a zone and trade. Photos are evidence
only; no OCR, AI vision or photo analysis runs in Phase 4.

Phase 5 adds audio transcription jobs. Editors enqueue `transcribe_audio` from audio evidence on
the visit detail page. The worker writes to `audio_transcriptions`, and editors can review/edit
the transcript in the same visit screen. Phase 5 still does not process photos, OCR documents,
extract issues/decisions or generate summaries.

Phase 6 adds text extraction jobs on the same visit detail page:
`generate_visit_summary`, `suggest_issues` and `suggest_decisions`. The worker uses only visit
notes, edited transcripts, zones/trades, document metadata and budget metadata. It does not
download photos or documents, does not OCR, and does not analyze images. Generated issues and
decisions are `ai_draft` rows for later human review.

Phase 7 adds the project dashboard and human review actions. Open
`/projects/<project_id>` to see recent visits, open issues, pending decisions, AI drafts and the
audit log. Owner/admin/editor roles can approve, edit, reject and close AI drafts; viewers remain
read-only through RLS.

Example budget CSV:

```csv
code,title,description,trade,zone,quantity,unit,unit_price,total_amount,included_excluded,source_page,notes
K01,Kitchen cabinets,Base units,Carpentry,Kitchen,2,unit,1200,2400,included,4,Oak finish
E01,Lighting points,Ceiling lights,Electrical,Living room,8,unit,45,360,included,5,
```

`trade` and `zone` must match existing project setup names. The importer reports row-numbered
errors and does not create partial rows when validation fails.

After changing the schema, regenerate the TypeScript types:

```bash
supabase gen types typescript --local > packages/db/src/database.types.ts
```

Migrations live in `supabase/migrations/` (enums → tables → RLS) and the seed in
`supabase/seed/seed.sql`. See [02-data-model.md](02-data-model.md) and
[03-security-privacy.md](03-security-privacy.md).

## Conventions

- Everything in English: documentation, code identifiers, table names and variables.
- TypeScript strict across the monorepo (see `tsconfig.base.json`).
- Run `pnpm lint && pnpm typecheck && pnpm test` before considering any task done.
