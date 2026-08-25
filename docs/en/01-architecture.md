# Architecture

## Overview

```text
┌─────────────────────┐        ┌──────────────────────────┐
│  apps/web           │        │  Supabase                │
│  Next.js App Router │◄──────►│  Auth · Postgres · RLS   │
│  Mobile-first PWA   │        │  Private Storage         │
└─────────────────────┘        └───────────┬──────────────┘
        ▲                                  │ agent_jobs (polling)
        │ optional gateway                 │
┌───────┴─────────────┐        ┌───────────▼──────────────┐
│ Optional gateways   │        │  apps/worker             │
│ Telegram/NanoClaw   │        │  Node/TypeScript         │
└─────────────────────┘        │  transcription, text AI  │
                               └──────────────────────────┘
```

- **apps/web**: UI, authentication, forms, file uploads and dashboards. It never runs long AI
  jobs inside a request; it only enqueues work into `agent_jobs`.
  `/projects/[projectId]/today` is the role-focused field entry point for site managers. Its
  server action uses the normal authenticated client and existing visit RLS to resume or create a
  daily draft; it is not a separate backend or permission path. A shared project layout keeps
  field navigation active across project routes. Site managers default into field view, while an
  explicit visit to `Today` stores a project-scoped browser-tab preference in `sessionStorage`.
  The same layout renders a shallow timeline from `projects.start_date` and
  `projects.deadline_date` on every project route; visits, decisions and weekly summaries add
  visual milestones but never define the project deadline.
- **Supabase**: source of truth. Auth, Postgres with RLS, private Storage.
- **apps/worker**: processes `agent_jobs` asynchronously (transcription, textual extraction,
  summaries, text-only document intelligence) with locking, retries and idempotency. It uses the
  service role key, which never reaches the browser.
- **Optional gateways**: normalize third-party messages and call first-party server APIs. They do
  not write directly to Supabase and are not part of the core data path.

## Shared packages

- **packages/core**: domain types, enums and Zod schemas. No framework dependencies.
- **packages/db**: typed Supabase clients (browser, server, worker) and RLS-aware helpers.
- **packages/ai**: swappable `AiProvider` interface, prompts, output schemas and parsers.
  Will include a `MockAiProvider` for tests.

## Key decisions (see docs/adr)

1. [ADR-0001](../adr/0001-stack-next-supabase-worker.md) — Next.js + Supabase + separate worker.
2. [ADR-0002](../adr/0002-no-ai-vision-in-mvp.md) — No AI vision in the MVP.
3. [ADR-0003](../adr/0003-no-nanoclaw-openclaw-core.md) — No NanoClaw/OpenClaw/Telegram as core.
4. [ADR-0004](../adr/0004-separate-permissions-from-stakeholder-functions.md) — Permission
   roles remain separate from real-world project functions.

## Coupling rules

- The worker and the web app communicate only through the database (`agent_jobs`), never via
  direct calls, so they stay independently deployable and testable.
- Every AI output is validated with Zod before persisting; if validation fails, the job is marked
  as failed and no inconsistent data is created.
- Integrations (Telegram and NanoClaw) enter as gateways against first-party APIs, never writing
  directly to the database.
