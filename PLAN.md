# PLAN.md — Phased roadmap

Roadmap status for `reforma-agent`. Each phase is implemented with a small, specific prompt.
A phase is only marked as completed if the checks (lint, typecheck, test, build) pass.

## Phases

- [x] **Phase 0 — Bootstrap**: pnpm monorepo, web/worker apps, core/ai/db packages, docs, checks.
- [ ] **Phase 1 — Data model**: Supabase schema, enums, migrations, base RLS, synthetic seed.
- [ ] **Phase 2 — Auth and projects**: Supabase Auth, profiles, projects, memberships and roles.
- [ ] **Phase 3 — Project setup**: zones, trades, documents, contract_items (+ CSV import).
- [ ] **Phase 4 — Visits and evidence**: visits, photo/audio uploads, private storage, signed URLs.
- [ ] **Phase 5 — Worker and transcription**: agent_jobs, polling, locking, retries, audio transcription.
- [ ] **Phase 6 — Textual AI extraction**: summaries, issue drafts and decision drafts (`ai_draft`).
- [ ] **Phase 7 — Dashboard and human review**: dashboard, approve/edit/reject drafts, audit log.
- [ ] **Phase 8 — Weekly summary**: `generate_weekly_summary` job with a reviewable draft.
- [ ] **Phase 9 — Deployment docs.**
- [ ] **Phase 10 — Optional: Telegram gateway.**
- [ ] **Phase 11 — Optional: NanoClaw gateway.**
- [ ] **Phase 12 — Optional: document intelligence.**

## Completed phases log

### Phase 0 — 2026-07-02

Monorepo base created: `apps/web` (Next.js 16 App Router, informational Phase 0 page),
`apps/worker` (minimal startup with controlled JSON logging), `packages/core` (Zod + first test),
`packages/ai` (`AiProvider` interface and prompts folder), `packages/db` (placeholder),
`supabase/` (empty), documentation in `docs/en` and 3 ADRs. Checks run and green:
`pnpm lint`, `pnpm typecheck`, `pnpm test` (3 tests), `pnpm build` (web + worker).
