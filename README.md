# reforma-agent

**intelligent home renovation tracking**, built mobile-first and on
its way to being a full PWA (a web manifest ships already; icons, service worker and offline
support are still pending).

Someone periodically visits a renovation site to document progress and report it to owners who
live abroad. The app records site visits, stores photos and audio as evidence, transcribes audio,
generates reviewable summaries, and manages issues, pending decisions, technical documents and an
itemized budget.

The site-manager experience opens on a phone-friendly **Today** screen. It resumes the current
daily draft, autosaves notes, accepts several photos at once, and keeps reporting a problem or
requesting a decision inside the same site-update flow.

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

More detail in [docs/en/05-local-development.md](docs/en/05-local-development.md). Deployment
guidance lives in [docs/en/07-deployment.md](docs/en/07-deployment.md). The optional Telegram
gateway is documented in [docs/en/08-telegram-gateway.md](docs/en/08-telegram-gateway.md), and
the optional NanoClaw gateway is documented in
[docs/en/09-nanoclaw-gateway.md](docs/en/09-nanoclaw-gateway.md). Optional document
intelligence is documented in
[docs/en/10-document-intelligence.md](docs/en/10-document-intelligence.md). The design
prototype's screens are mapped onto the schema in
[docs/en/11-prototype-backing-matrix.md](docs/en/11-prototype-backing-matrix.md).

## Project status

**Implemented through Phase 14**: MVP schema, auth, project setup, visits/evidence, worker jobs,
text-only AI drafts, review workflow, weekly summaries, deployment documentation and an optional
Telegram/NanoClaw gateway contract, optional text-only document intelligence, stakeholder
functions and responsibility assignments, plus the site-manager field workflow. See
[PLAN.md](PLAN.md) for the phased roadmap.

## Security and privacy

- RLS enabled on all project data tables (from Phase 1).
- Private storage; access via signed URLs.
- The service role key is never exposed to the client.
- Optional gateways call first-party server APIs; they do not write directly to Supabase.
- Document intelligence runs only in the worker and does not analyze photos.
- No real data in tests or seeds; synthetic data only.
- Each user deploys their own instance with their own Supabase project.

More detail in [docs/en/03-security-privacy.md](docs/en/03-security-privacy.md).

## License

MIT.
