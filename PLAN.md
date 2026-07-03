# PLAN.md — Phased roadmap

Roadmap status for `reforma-agent`. Each phase is implemented with a small, specific prompt.
A phase is only marked as completed if the checks (lint, typecheck, test, build) pass.

## Phases

- [x] **Phase 0 — Bootstrap**: pnpm monorepo, web/worker apps, core/ai/db packages, docs, checks.
- [x] **Phase 1 — Data model**: Supabase schema, enums, migrations, base RLS, synthetic seed.
- [x] **Phase 2 — Auth and projects**: Supabase Auth, profiles, projects, memberships and roles.
- [x] **Phase 3 — Project setup**: zones, trades, documents, contract_items (+ CSV import).
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

### Phase 3 — 2026-07-03

Project setup implemented in the web app: `/projects/[projectId]/setup` for zones/trades,
`/documents` for private technical documents and `/budget` for contract line items. Owner/admin/
editor roles can create/edit/delete; viewers are read-only in the UI and RLS remains the final
authority. New migration creates the private `project-documents` bucket, Storage RLS policies
based on project membership, a safe `storage_object_project_id()` helper, and unique
case-insensitive zone/trade names per project. Document uploads use the signed-in user's
publishable-key session, store metadata in `documents`, and generate short-lived signed URLs for
members. Budget items support manual entry and CSV import with Zod validation, row-numbered
errors and documented example headers. `packages/core` gained setup/document/budget form schemas
and `parseBudgetCsv` (58 tests total); `packages/db` types regenerated from the local schema.
Checks green: migration reset, Storage RLS SQL verification, lint, typecheck, test, build.

### Phase 2 — 2026-07-03

Supabase Auth integrated in the Next.js App Router via `@supabase/ssr`: session refresh and
route guards in `apps/web/proxy.ts`, per-request RLS-scoped clients (publishable key only),
login/signup/logout with server actions, profile auto-creation on first visit. Pages: project
list, create project, project dashboard shell, settings (details, membership add/remove, delete
project). New migration adds `create_project_with_owner` (atomic, SECURITY INVOKER),
`add_project_member_by_email` (SECURITY DEFINER with internal permission checks,
enumeration-safe generic errors, race-safe insert), co-member profile visibility, and fixes the
Phase 1 bootstrap policy (its inline EXISTS ran under RLS and never matched). `packages/db`
gained generated DB types and typed client factories; `packages/core` gained form schemas
(50 tests total). Two RLS pitfalls documented: `INSERT … RETURNING` requires SELECT policy;
policy subqueries run under RLS. Verified end-to-end in the browser against the local stack
(login, signup, isolation between users, editor lockout, member management) and reviewed by a
22-agent adversarial workflow (2 confirmed findings, both fixed). Checks green: lint,
typecheck, test, build.

### Phase 1 — 2026-07-02

Data model implemented in three migrations: 10 enums, 14 tables (indexes, FK cascade rules,
`set_updated_at` triggers) and RLS on every table with 49 policies based on `project_members`
plus three `SECURITY DEFINER` helpers (`is_project_member`, `has_project_role`,
`can_edit_project`). Synthetic seed with 2 users, 1 project and sample visit/issue/decision.
TypeScript enum mirrors and Zod validators added to `packages/core` with 41 tests. Validated
against the local Supabase stack (`supabase db reset` clean; RLS functionally tested: member
sees data, outsider and anon see nothing, editor can write, outsider write rejected). Local
stack moved to ports 55321+ to coexist with another Supabase project on the machine. Checks
green: lint, typecheck, test, build.

### Phase 0 — 2026-07-02

Monorepo base created: `apps/web` (Next.js 16 App Router, informational Phase 0 page),
`apps/worker` (minimal startup with controlled JSON logging), `packages/core` (Zod + first test),
`packages/ai` (`AiProvider` interface and prompts folder), `packages/db` (placeholder),
`supabase/` (empty), documentation in `docs/en` and 3 ADRs. Checks run and green:
`pnpm lint`, `pnpm typecheck`, `pnpm test` (3 tests), `pnpm build` (web + worker).
