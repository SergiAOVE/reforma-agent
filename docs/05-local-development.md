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

## Phase 0 Notes

Supabase CLI is not required yet because Phase 0 does not create migrations or local Supabase services.
