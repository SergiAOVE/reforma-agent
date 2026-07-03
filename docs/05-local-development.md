# Local Development

## Prerequisites

- Node.js 22 or newer.
- pnpm 11 or newer.

## Setup

```bash
pnpm install
```

Copy environment placeholders if needed:

```bash
cp .env.example .env.local
```

Do not add real secrets to git.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Repository Notes

The web and worker checks do not require a running Supabase project yet.

## Supabase Phase 1

Phase 1 adds SQL files but does not require auth UI or app integration yet.

Expected Supabase validation commands once the CLI is installed:

```bash
supabase --version
supabase db reset
supabase db advisors
```

If using a direct Postgres connection instead, apply:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260703093000_initial_schema_rls.sql
psql "$DATABASE_URL" -f supabase/seed/0001_synthetic_seed.sql
```

The seed file is synthetic and must not be replaced with real renovation data.
