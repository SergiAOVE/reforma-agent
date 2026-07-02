# reforma-agent

Open source PWA for **intelligent home renovation tracking**.

Someone periodically visits a renovation site to document progress and report it to owners who
live abroad. The app records site visits, stores photos and audio as evidence, transcribes audio,
generates reviewable summaries, and manages issues, pending decisions, technical documents and an
itemized budget.

## Core principle

> The app is the source of truth. The AI worker is a controlled processor.
> AI proposes reviewable drafts; it does not make final decisions.
> Photos are visual evidence, not input automatically interpreted by AI.

## Stack

- **Next.js App Router + TypeScript** — web app / PWA ([apps/web](apps/web))
- **Supabase** — Auth, Postgres, private Storage and Row Level Security
- **Node.js/TypeScript worker** — AI jobs and long-running tasks ([apps/worker](apps/worker))
- **Zod** — validation of domain and AI inputs/outputs
- **Vitest** — tests
- **pnpm** — monorepo with workspaces

## Structure

```text
apps/
  web/        Next.js App Router (mobile-first UI, auth, dashboards, uploads)
  worker/     Node/TypeScript worker (agent_jobs polling, transcription, AI extraction)
packages/
  core/       Domain types, enums, Zod schemas
  db/         Supabase clients and RLS-aware helpers
  ai/         AI provider interface, prompts, output schemas
supabase/     Migrations, seeds and RLS policies
docs/
  en/         Product and technical documentation
  adr/        Architecture Decision Records
```

## Local development

Requirements: Node.js >= 22 and pnpm (via corepack).

```bash
pnpm install
pnpm dev        # web + worker in parallel
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

More detail in [docs/en/05-local-development.md](docs/en/05-local-development.md).

## Project status

**Phase 0 completed**: monorepo base, documentation and checks. No business functionality yet.
See [PLAN.md](PLAN.md) for the phased roadmap.

## Security and privacy

- RLS enabled on all project data tables (from Phase 1).
- Private storage; access via signed URLs.
- The service role key is never exposed to the client.
- No real data in tests or seeds; synthetic data only.
- Each user deploys their own instance with their own Supabase project.

More detail in [docs/en/03-security-privacy.md](docs/en/03-security-privacy.md).

## License

MIT.
