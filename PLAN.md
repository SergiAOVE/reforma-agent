# PLAN.md

## Current Status

Phase 1 is complete in source control. Install, lint, typecheck, tests, and build passed. Supabase CLI checks could not run because the CLI is not installed in this environment.

## Phase Plan

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Bootstrap repo, docs, monorepo, checks | Complete |
| 1 | Supabase schema, enums, RLS, seed | Complete |
| 2 | Auth, profiles, projects, memberships | Not started |
| 3 | Zones, trades, documents, contract items | Not started |
| 4 | Visits and evidence | Not started |
| 5 | Worker and audio transcription | Not started |
| 6 | Textual AI extraction | Not started |
| 7 | Review workflow and dashboard | Not started |
| 8 | Weekly summary | Not started |
| 9 | Deployment docs | Not started |
| 10 | Optional Telegram gateway | Not started |
| 11 | Optional NanoClaw gateway | Not started |
| 12 | Optional document intelligence | Not started |

## Phase 0 Acceptance Checklist

- [x] pnpm workspace created.
- [x] `apps/web` created with Next.js App Router and TypeScript.
- [x] `apps/worker` created as a minimal Node.js TypeScript worker.
- [x] `packages/core` created for domain enums and Zod schemas.
- [x] `packages/ai` created for provider interfaces and mock provider scaffolding.
- [x] `packages/db` created for future Supabase helpers.
- [x] `supabase/` folders created.
- [x] Required docs created.
- [x] `.env.example` created without real secrets.
- [x] Root scripts created.
- [x] Strict TypeScript enabled.
- [x] Minimal core test added.
- [x] Simple Phase 0 landing page added.
- [x] Minimal worker log added.
- [x] Checks passed.
- [x] Phase 0 marked complete.

## Implementation Boundaries

Phase 1 includes database schema, RLS, seed data, shared domain schemas, and docs only. It does not include auth UI, file uploads, real worker processing, real AI, Telegram, image analysis, or business workflow screens.

## Phase 1 Acceptance Checklist

- [x] Initial Supabase enum types defined.
- [x] Initial Supabase tables created in a migration.
- [x] RLS enabled on project data tables.
- [x] RLS policies based on `project_members`.
- [x] Explicit Data API grants prepared for authenticated access.
- [x] Synthetic seed data added.
- [x] Storage policy direction documented.
- [x] Matching TypeScript enums and Zod schemas added in `packages/core`.
- [x] Core tests added for enums and validators.
- [x] Data model and security docs updated.
- [x] `pnpm lint` passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm test` passed.
- [x] `pnpm build` passed.
- [ ] `supabase db reset` run locally.
- [ ] `supabase db advisors` run locally.

The unchecked Supabase CLI items require installing and configuring the Supabase CLI.
