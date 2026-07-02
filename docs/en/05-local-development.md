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

## Supabase (from Phase 1)

The `supabase/` directory holds migrations, seeds and policies. The Supabase CLI will be used
for the local stack:

```bash
supabase start
supabase db reset
```

Exact commands will be documented when the first migrations are created.

## Conventions

- Everything in English: documentation, code identifiers, table names and variables.
- TypeScript strict across the monorepo (see `tsconfig.base.json`).
- Run `pnpm lint && pnpm typecheck && pnpm test` before considering any task done.
