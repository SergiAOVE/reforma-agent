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
│ Telegram Bot API    │        │  apps/worker             │
│ webhook relay only  │        │  Node/TypeScript         │
└─────────────────────┘        │  transcription, text AI  │
                               └──────────────────────────┘
```

- **apps/web**: UI, authentication, forms, file uploads and dashboards. It never runs long AI
  jobs inside a request; it only enqueues work into `agent_jobs`.
- **Supabase**: source of truth. Auth, Postgres with RLS, private Storage.
- **apps/worker**: processes `agent_jobs` asynchronously (transcription, textual extraction,
  summaries) with locking, retries and idempotency. It uses the service role key, which never
  reaches the browser.
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

## Coupling rules

- The worker and the web app communicate only through the database (`agent_jobs`), never via
  direct calls, so they stay independently deployable and testable.
- Every AI output is validated with Zod before persisting; if validation fails, the job is marked
  as failed and no inconsistent data is created.
- Integrations (Telegram now, NanoClaw only if a later phase requests it) enter as gateways
  against first-party APIs, never writing directly to the database.
