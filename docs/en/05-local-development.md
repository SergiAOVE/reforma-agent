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

`supabase status` prints the local `API URL`, `anon key` and `service_role key` — copy them into
`.env` (see `.env.example`). Seeded test users (local only): `ana@example.com` (owner) and
`luis@example.com` (editor), password `password123`.

Migrations live in `supabase/migrations/` (enums → tables → RLS) and the seed in
`supabase/seed/seed.sql`. See [02-data-model.md](02-data-model.md) and
[03-security-privacy.md](03-security-privacy.md).

## Conventions

- Everything in English: documentation, code identifiers, table names and variables.
- TypeScript strict across the monorepo (see `tsconfig.base.json`).
- Run `pnpm lint && pnpm typecheck && pnpm test` before considering any task done.
