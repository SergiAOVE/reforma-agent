# reforma-agent

`reforma-agent` is an open source PWA for tracking home renovation work when owners live away from the construction site.

The app will let a trusted visitor document site visits, upload photos as evidence, upload audio notes, transcribe audio, write visit summaries, manage issues, track owner decisions, store technical documents, structure the quote into budget line items, and produce reviewable weekly updates.

## Core Principle

The app is the source of truth. Supabase stores data, permissions, and private files. A separate worker processes AI jobs. AI proposes reviewable drafts; humans approve, edit, or reject them. Photos are evidence only; the MVP does not use AI image analysis.

## Phase 0 Status

This repository currently contains the Phase 0 foundation only:

- pnpm workspace monorepo
- Next.js App Router web app in `apps/web`
- Minimal Node.js TypeScript worker in `apps/worker`
- Shared domain package in `packages/core`
- AI abstraction package in `packages/ai`
- Future Supabase helper package in `packages/db`
- Supabase folder placeholders
- Project docs and ADRs

Business features, Supabase integration, auth, storage, real AI, and database migrations are intentionally deferred to later phases.

## Stack

- Next.js App Router
- TypeScript strict mode
- Supabase Auth, Postgres, Storage, and RLS
- Node.js/TypeScript worker
- Zod
- Vitest
- pnpm workspaces

## Local Development

Install dependencies:

```bash
pnpm install
```

Run all development processes:

```bash
pnpm dev
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Environment

Copy `.env.example` to `.env.local` for local development. Do not commit real secrets.

The browser may only receive `NEXT_PUBLIC_*` values. The Supabase service role key is server-only and must never be exposed to client code.

## Repository Rules

See `AGENTS.md`, `CLAUDE.md`, and `PLAN.md` before implementing future phases.
