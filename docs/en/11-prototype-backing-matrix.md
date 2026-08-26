# Field prototype backing matrix

> Status: **reference, not a phase**. Maps the nine screens of the design prototype at
> [/prototype/reforma-field](../../apps/web/app/prototype/reforma-field/page.tsx) onto the schema
> in [supabase/migrations/](../../supabase/migrations/), so each screen can be scheduled against
> what already exists. Phase status itself lives in [PLAN.md](../../PLAN.md); the data model is
> documented in [02-data-model.md](02-data-model.md).

The prototype route is a design reference over hard-coded fixtures. It implements no phase and is
meant to be dissolved into real screens phase by phase, then deleted. This document records which
screens the current schema can already back with real data.

## Summary

| Verdict   | Screens                              | Work required                   |
| --------- | ------------------------------------ | ------------------------------- |
| Backed    | Budget, Documents, Overview          | Presentation only               |
| Partial   | Today, Entry, Diary, Attention, More | One small gap each              |
| No schema | Schedule                             | A new table; a phase of its own |

## Phase status

All fifteen phases (0–14) are marked complete in `PLAN.md`, and each was verified against
artifacts in the tree rather than the checkbox. Three points are worth recording:

- `extract_visit` is a phantom job type. It appears in the `job_type` enum
  ([create_enums.sql](../../supabase/migrations/20260702120000_create_enums.sql), line 58) and is
  mirrored in [packages/core/src/enums.ts](../../packages/core/src/enums.ts), but no worker branch
  handles it. No phase ever claimed it; it is a leftover from Phase 1.
- The Telegram and NanoClaw gateways acknowledge commands but write no rows, upload nothing and
  enqueue no jobs. That is their documented scope, so they are complete as specified, but they are
  still functionally stubs.
- The prototype route is not a phase. See the header comment in its `page.tsx`.

## The nine screens

### Backed — presentation work only

| Screen        | What already backs it                                                                                                                                                                                                  | Missing                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Budget**    | `contract_items` carries more than the mockup shows: code, title, quantity, unit, unit price, total, status, zone and trade. The budget page already joins zones, trades and documents, and sums the contracted total. | Nothing.                                                                                                           |
| **Documents** | `documents` plus private-bucket signed URLs from Phases 3 and 4 — filename, size, MIME type, document type and upload date are all stored.                                                                             | The mockup shows `Report` and `Permit` kinds; `document_type` has neither. Map the labels, or add two enum values. |
| **Overview**  | Essentially the existing dashboard: `weekly_summaries` with review state, plus the project timeline, which already derives markers from visits, decisions and weekly summaries.                                        | Nothing.                                                                                                           |

### Partial — one gap each

| Screen        | What already backs it                                                                                                                                                                                                                                                   | Missing                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**     | The Today page already queries today's draft visit with its evidence, recent visits, open issues and pending decisions. Project name, address and "week 22 of 29" all derive from `projects`.                                                                           | The schedule-health chip. "Only 2 days of slack" needs a planned baseline; `start_date` and `deadline_date` give a span, not progress against plan. |
| **Entry**     | End to end: `visits.human_notes` with autosave, the photo strip from `evidence.manual_note`, voice notes through `agent_jobs` into `audio_transcriptions`, problem and decision sheets writing `issues` and `decisions`, and "finish the day" flipping `visits.status`. | UX wiring only. Transcription is a manual enqueue button today, not the automatic inline transcription the mockup shows.                            |
| **Diary**     | `visits.visit_date`, title and status, plus per-visit evidence and issues, supply every row of the list.                                                                                                                                                                | Current selects use `evidence(id)`, so "11 photographs · 2 voice notes" cannot be split. Widen to `evidence(id, type)`. No schema change.           |
| **Attention** | Both queries already exist, and resolve actions landed in Phases 7 and 13: approve, reject, close and reopen, each with an audit entry.                                                                                                                                 | `issues` has no `deadline` column; only `decisions` does. The merged list sorts by deadline, so issues can currently contribute priority alone.     |
| **More**      | Every count is available: the contract-item sum, document count, zones and trades, members and the viewer's own role.                                                                                                                                                   | Only its Schedule row points at nothing.                                                                                                            |

### No schema

| Screen       | What already backs it                                                                                           | Missing                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schedule** | Of the whole screen, only the `Decision` entries in the upcoming list are derivable, from `decisions.deadline`. | No phase, task, milestone or delivery table exists in any migration. `trades` carries name, description and sort order, with no dates. Every Gantt bar and every Trade, Delivery and Milestone row is unbacked. |

## The Schedule gap

This is the only screen with nothing behind it, and it reaches past its own route: the
schedule-health chip on Today reads from the same missing data. Measuring slack needs a planned
baseline to compare against, and nothing in the schema holds one.

One new table would back the Schedule screen, the schedule-health chip and the Schedule row in
More:

```sql
-- Sketch only. Not implemented; see PLAN.md for the authoritative phase list.
create type public.schedule_item_kind as enum ('phase', 'milestone', 'delivery');

create table public.schedule_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  kind           public.schedule_item_kind not null,
  name           text not null,
  trade_id       uuid references public.trades(id) on delete set null,
  zone_id        uuid references public.zones(id) on delete set null,
  planned_start  date,
  planned_end    date,
  actual_start   date,
  actual_end     date,
  status         text not null default 'planned',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

RLS would mirror the existing project-membership model: members read, `can_edit_project()` writes.
Zod schemas belong in `packages/core`, alongside a derived schedule-health helper.

## Smaller gaps

None of these block each other, and none block the Schedule work.

| Gap                          | Fix                                                                                           | Cost           |
| ---------------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| Evidence counts not split    | Widen `evidence(id)` to `evidence(id, type)` so photographs and voice notes count separately. | Query change   |
| Issues have no deadline      | Add `issues.deadline date` so Attention can sort issues and decisions on one axis.            | One migration  |
| Document kinds do not match  | Map `Report` and `Permit` onto `document_type`, or add the two values.                        | Labels or enum |
| Transcription is manual      | Enqueue `transcribe_audio` on audio upload and poll `agent_jobs.status`.                      | UX wiring      |
| `extract_visit` is unhandled | Implement it, or drop it from the enum and its TypeScript mirror.                             | Tidy-up        |

## Recommended next phase

> Add a `schedule_items` table with phase, milestone and delivery kinds, planned versus actual
> dates, and RLS matching the existing project-membership model. Add Zod schemas in
> `packages/core` and a derived schedule-health helper. No UI in this phase.

Taking this first unblocks the only screen with nothing behind it, and retires the
schedule-health placeholder on Today at the same time. The smaller gaps can land in any order
alongside it.
