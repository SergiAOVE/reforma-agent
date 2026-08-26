# PLAN.md — Phased roadmap

Roadmap status for `reforma-agent`. Each phase is implemented with a small, specific prompt.
A phase is only marked as completed if the checks (lint, typecheck, test, build) pass.

## Phases

- [x] **Phase 0 — Bootstrap**: pnpm monorepo, web/worker apps, core/ai/db packages, docs, checks.
- [x] **Phase 1 — Data model**: Supabase schema, enums, migrations, base RLS, synthetic seed.
- [x] **Phase 2 — Auth and projects**: Supabase Auth, profiles, projects, memberships and roles.
- [x] **Phase 3 — Project setup**: zones, trades, documents, contract_items (+ CSV import).
- [x] **Phase 4 — Visits and evidence**: visits, photo/audio uploads, private storage, signed URLs.
- [x] **Phase 5 — Worker and transcription**: agent_jobs, polling, locking, retries, audio transcription.
- [x] **Phase 6 — Textual AI extraction**: summaries, issue drafts and decision drafts (`ai_draft`).
- [x] **Phase 7 — Dashboard and human review**: dashboard, approve/edit/reject drafts, audit log.
- [x] **Phase 8 — Weekly summary**: `generate_weekly_summary` job with a reviewable draft.
- [x] **Phase 9 — Deployment docs.**
- [x] **Phase 10 — Optional: Telegram gateway.**
- [x] **Phase 11 — Optional: NanoClaw gateway.**
- [x] **Phase 12 — Optional: document intelligence.**
- [x] **Phase 13 — Stakeholders and responsibilities**: professional functions plus responsible
      and approver assignments for issues and decisions.
- [x] **Phase 14 — Site manager field workflow**: operator-first Today screen, resumable daily
      drafts, simplified reporting steps and mobile navigation.

The `/prototype/reforma-field` design reference is not a phase. The plan for absorbing it — which
screens the schema already backs, which are a restyle and which a rebuild, and in what order to
ship them — is recorded in
[docs/en/11-field-redesign-integration.md](docs/en/11-field-redesign-integration.md).

## Completed phases log

### Phase 14 — 2026-08-18

The first role-focused experience is now designed for the site manager working from a phone.
Site-manager project links open a dedicated `Today` screen with one-tap start or resume behavior,
quick paths for notes, bulk photos, problems and decision requests, a compact attention list and
secondary access to advanced project tools. Starting from any shortcut reuses the current user's
existing draft for that project and date, preventing accidental duplicate updates; the action
uses the authenticated Supabase client and existing visit RLS. The visit UI now uses plain
language (`Update`, `Photos & files`, `Finish`), keeps title/date/zone/trade behind optional
details, autosaves notes after a short delay, keeps multi-file evidence upload, and replaces the
three-way status control with one clear `Finish update` action. AI controls and AI drafts remain
available but collapsed as advanced tools. The existing owner/reviewer dashboard and data model
remain unchanged. Field view now persists for the browser-tab session across project routes,
defaults on for site managers, keeps return links anchored to `Today`, and uses the same fixed
four-item navigation on desktop and mobile. A Zod schema and focused tests cover operator shortcut
destinations and field-navigation routing. Project start and deadline dates now drive a shallow,
shared project timeline on every route, with visit, decision and weekly-summary milestones shown
as secondary markers. A decision deadline is never treated as the project deadline.

### Phase 13 — 2026-07-28

Stakeholder responsibilities implemented without changing the existing authorization model.
New migration `20260728162801_stakeholder_responsibilities.sql` adds the descriptive
`stakeholder_type` enum to project memberships and optional responsible/approver assignments to
issues and decisions. Composite foreign keys prevent cross-project assignments, indexed foreign
keys keep assignment lookups and member removal efficient, and authenticated membership updates
are limited to the descriptive stakeholder column. Project settings now distinguish permission
from project function; issue and decision forms can assign accountable members and display those
assignments on dashboards and visit review panels. Zod schemas, generated database types, seed
data, tests, security documentation and ADR-0004 were updated. RLS continues to authorize only
through owner/admin/editor/viewer roles; stakeholder functions never grant access.
Dashboard issue and decision rows now expand in place, including records without a linked visit,
with item-scoped save, approve, reject and close actions so users cannot accidentally act on a
different visit record. Closed issues remain available in a collapsed project archive with
read-only details, an explicit reopen action and corresponding audit history.

### Phase 12 — 2026-07-04

Optional document intelligence implemented as a worker-only, text-only feature. New migration
`20260704073241_phase12_document_intelligence.sql` adds the `analyze_document` job type and
`document_insights` with review metadata, worker-job provenance, explicit Data API grants and RLS
policies: project members read, owner/admin/editor roles review/update, worker/service role
inserts, no client delete. `packages/core` gained job input/output and provider result schemas
plus a MIME helper that only accepts text-like documents. `packages/ai` gained
`AiProvider.analyzeDocument()` with deterministic mock output and OpenAI structured JSON output
using only extracted text and metadata. `apps/worker` now processes `analyze_document` through the
existing polling/locking/retry flow, downloads only from the private `project-documents` bucket,
rejects images/photos and non-text files as permanent failures, and stores `ai_draft` insights.
No UI enqueue button, OCR, image analysis, PDF/Office parsing, gateway mutation, automatic
issue/decision extraction or web-request AI work was added. Documentation now covers the feature
in `docs/en/10-document-intelligence.md`.

### Phase 11 — 2026-07-03

Optional NanoClaw gateway implemented without schema changes, worker changes or new core
dependencies. New `packages/core/src/nanoclaw.ts` defines the narrow NanoClaw raw-webhook event
contract, command parsing, runtime config validation and first-party command payload schemas.
`apps/web` now exposes `POST /api/nanoclaw/webhook`, which validates a NanoClaw bearer token,
accepts only text-command JSON events and forwards normalized command intents to a configured
first-party API with a separate bearer token. `POST /api/gateway/nanoclaw/commands` is the Phase
11 first-party command contract; it acknowledges `/help`, `/status`, `/visit <note>`,
`/issue <note>`, `/decision <note>` and `/weekly-summary <range>` but does not create project
rows, write Supabase data, upload files, enqueue AI jobs or bypass RLS. NanoClaw variables were
added to `.env.example`; documentation now covers deployment, security and setup in
`docs/en/09-nanoclaw-gateway.md`. No OCR, image analysis, document intelligence or new AI jobs
were added.

### Phase 10 — 2026-07-03

Optional Telegram gateway implemented without schema changes or new core dependencies. New
`packages/core/src/telegram.ts` defines the narrow Telegram Bot API update subset, command
parsing, runtime config validation and first-party command payload schemas. `apps/web` now exposes
`POST /api/telegram/webhook`, which validates Telegram's webhook secret header, accepts only text
commands and forwards normalized command intents to a configured first-party API with a bearer
token. `POST /api/gateway/telegram/commands` is the Phase 10 first-party command contract; it
acknowledges `/start`, `/help`, `/status` and `/visit <note>` but does not create project rows,
write Supabase data, upload files, enqueue AI jobs or bypass RLS. Telegram variables were added to
`.env.example`; documentation now covers deployment, security and setup in
`docs/en/08-telegram-gateway.md`. No NanoClaw, OCR, image analysis or document intelligence was
added.

### Phase 9 — 2026-07-03

Deployment documentation implemented without product/runtime changes. New
`docs/en/07-deployment.md` documents the production topology (`apps/web` on Vercel, hosted
Supabase, always-on Node worker), environment variable ownership, Supabase production setup,
local-to-production migration workflow, Vercel web deployment, Node worker deployment, private
Storage bucket verification, RLS verification, backup/restore basics, production security checks
and rollback guidance. `README.md`, `docs/en/05-local-development.md` and
`docs/en/06-roadmap.md` now link to the deployment guide. No schema, UI, worker behavior, AI jobs,
Telegram, NanoClaw, OCR, image analysis or document intelligence were added. Checks green: lint,
typecheck, tests and build.

### Phase 8 — 2026-07-03

Weekly summary generation implemented. New migration
`20260703193548_phase8_weekly_summaries.sql` creates `weekly_summaries` with review metadata,
worker-job provenance, indexes, explicit Data API grants and RLS policies: project members read,
owner/admin/editor roles review, worker/service role inserts, no client delete. The dashboard can
enqueue `generate_weekly_summary` jobs for a date range, shows recent weekly jobs and summaries,
and adds approve/edit/reject review actions with `audit_log` entries. `apps/worker` now processes
`generate_weekly_summary` through the existing `agent_jobs` polling/locking/retry flow and stores
validated `ai_draft` rows. The Phase 8 worker context is text-only: visits, reviewed summaries,
open reviewed issues, pending/approved reviewed decisions, zones/trades, budget metadata and
document metadata. It does not download files, OCR documents, analyze images, implement Telegram,
implement NanoClaw or add document intelligence. `packages/core` gained weekly summary job/form
schemas; `packages/ai` gained mock and OpenAI structured-output weekly summary support; tests were
added across core, AI and worker. Checks green: `supabase db reset`, generated DB types,
`supabase db lint --local`, local migration list, worker smoke generation of a weekly summary,
authenticated RLS read/update smoke, anon sees 0 rows, lint, typecheck, test and build.

### Phase 7 — 2026-07-03

Dashboard and human review implemented. New migration
`20260703190634_phase7_summary_review_metadata.sql` adds review metadata to `visits.summary`
(`summary_source`, `summary_review_state`, `summary_created_by_job_id`, `summary_reviewed_by`,
`summary_reviewed_at`) so AI summaries can be approved, edited or rejected like AI issue and
decision drafts. The Phase 6 worker now marks generated summaries as `ai_draft`. The project page
is now an operational dashboard with recent visits, open issues, pending decisions, AI review
queue, project data links, members and audit log. Shared review forms support approve/edit/reject
for AI summaries/issues/decisions and close for issues/decisions; review actions run as the
authenticated user under RLS and write `audit_log` entries. `packages/core` gained review form
validators and tests. No weekly summaries, Telegram, NanoClaw, OCR, image analysis or new AI jobs
were added. Checks green: `supabase db reset`, `supabase db lint --local`, local migration list,
worker smoke generation of summary/issue/decision drafts, authenticated RLS review smoke,
viewer-denied RLS smoke, lint, typecheck, test and build.

### Phase 6 — 2026-07-03

Textual AI extraction implemented without new schema migrations. `apps/worker` now claims and
processes `generate_visit_summary`, `suggest_issues` and `suggest_decisions` jobs through the
existing `agent_jobs` queue and `claim_agent_job()` RPC. Context is text-only: visit notes,
edited transcripts, zones/trades, document metadata and budget metadata. The worker does not
download documents/photos, does not OCR and does not use vision. `packages/ai` now exposes text
provider methods with deterministic `MockAiProvider` output and optional OpenAI structured JSON
extraction (`OPENAI_TEXT_MODEL`, default `gpt-4o-mini`). `packages/core` gained Zod schemas for
Phase 6 job input, provider output and completed job metadata. The visit detail page can enqueue
the three text jobs and displays generated `ai_draft` issue/decision rows while keeping
approve/edit/reject review workflows for Phase 7. The synthetic seed UUID literals were
normalized to RFC-shaped values so local seeded rows pass the same Zod UUID validators as
generated production rows. Checks green: `supabase db reset`, `supabase db lint --local`, local
migration list, worker smoke test for all three Phase 6 jobs, guardrail scans, lint, typecheck,
test and build.

### Phase 5 — 2026-07-03

Worker and audio transcription implemented. New migration adds a service-role-only
`claim_agent_job()` RPC using `FOR UPDATE SKIP LOCKED`, plus a unique
`audio_transcriptions.evidence_id` index for idempotent retries. `apps/worker` now loads
server-only Supabase config, creates a service-role client with session persistence disabled,
polls `agent_jobs`, claims `transcribe_audio` work, retries transient failures, marks permanent
input errors as failed, downloads private audio evidence, transcribes it and writes
reviewable `audio_transcriptions`. `packages/ai` now has a transcription-capable
`AiProvider`, deterministic `MockAiProvider` and optional OpenAI provider
(`OPENAI_API_KEY`, default model `gpt-4o-mini-transcribe`). The visit detail page can enqueue
audio transcription jobs, shows pending/processing/failed status and lets editors save the
reviewed transcript. `packages/core` gained Zod schemas for transcription job input/output and
transcript edits; tests added across core, AI and worker. Phase 5 stays audio-only: no summaries,
issue/decision extraction, OCR, photo analysis, Telegram or NanoClaw.
Checks green: `supabase db reset`, generated DB types, `supabase db lint --local`, migration
list, service-role worker smoke test, authenticated RPC rejection test, guardrail scans, lint,
typecheck, test and build.

### Phase 4 — 2026-07-03

Visits and evidence implemented in the web app: `/projects/[projectId]/visits` for creating and
reviewing site visits, and `/projects/[projectId]/visits/[visitId]` for editing details,
publishing, archiving, returning to draft, deleting visits, uploading evidence, previewing
signed evidence links and editing evidence metadata. Owner/admin/editor roles can write; viewers
are read-only in the UI and RLS remains the final authority. New migration creates the private
`visit-evidence` bucket, Storage RLS policies for member access and editor writes, and a
`storage_object_visit_id()` helper so uploads must point at an existing visit in the same project.
Evidence files support photo, audio, video and document types, optional zone/trade links, MIME
checks and a 50 MB limit. Photos remain evidence only: no OCR, AI vision, photo analysis,
transcription, worker polling or automatic extraction was added. `packages/core` gained visit and
evidence Zod schemas plus MIME helpers (64 tests total); `packages/db` types regenerated from the
local schema. Checks green: `supabase db reset`, `supabase db lint --local`, migration list,
functional Storage/RLS smoke test, lint, typecheck, test, build.

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
