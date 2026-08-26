# Field redesign integration

> Status: **plan, not a phase**. How the design prototype at
> [/prototype/reforma-field](../../apps/web/app/prototype/reforma-field/page.tsx) gets absorbed
> into the product: which screens the schema can already back, how much UI work each one is, and
> in what order to ship them. Phase status lives in [PLAN.md](../../PLAN.md); the data model is
> documented in [02-data-model.md](02-data-model.md).

The prototype route is a design reference over hard-coded fixtures. It implements no phase and is
meant to be dissolved into real screens phase by phase, then deleted.

Two questions decide the sequencing, and both are answered here: **can the data support this
screen**, and **how much UI work is it**. A screen that is fully backed can still be a rebuild,
and a screen with a schema gap can still be a restyle.

## Summary

| Screen    | Data             | UI                          | Ship |
| --------- | ---------------- | --------------------------- | ---- |
| Attention | Backed           | New route (was a hash)      | 1    |
| More      | Backed           | New route (was a `details`) | 1    |
| Today     | One gap          | Restyle plus two additions  | 2    |
| Entry     | Backed           | **Rebuild**                 | 3    |
| Diary     | One query change | New route                   | 3    |
| Budget    | Backed           | Presentation only           | 4    |
| Documents | Backed           | Presentation only           | 4    |
| Overview  | Backed           | Presentation only           | 4    |
| Schedule  | **No schema**    | Blocked on Phase 15         | 5    |

## Sequence

1. **Nav refactor, with Attention and More as real routes.** Both are fully backed. This
   establishes the four-peer-screens model that every later step assumes.
2. **Today restyle, with a schedule-strip placeholder.** Its "see all" targets exist by now.
3. **Entry as a new route beside `/visits/[visitId]`.** See
   [Entry is a rebuild](#entry-is-a-rebuild). The autosave bug below is fixed, so this step is
   not gated on it.
4. **Budget, Documents and Overview.** Presentation only.
5. **Phase 15: `schedule_items`, then the Schedule screen and a real health chip.**

## Restyle or rebuild

### The bottom navigation changes shape

The four slots survive, but two of them stop being parts of a page and become pages.

| Slot | Today (Phase 14)               | Prototype                                  |
| ---- | ------------------------------ | ------------------------------------------ |
| 1    | Today → `/today`               | Today (also active for Entry and Schedule) |
| 2    | Updates → `/visits`            | Diary → the history screen                 |
| 3    | Attention → `/today#attention` | Attention, a screen, with a badge count    |
| 4    | More → `/today#more`           | More, a screen, hub for the four tools     |

In the current build, Attention and More are anchors into the Today page: `#attention` scrolls to
a section and `#more` opens a `<details>` element.
[`fieldNavigationSection()`](../../apps/web/lib/field-view.ts) confirms it — all three of Today,
Attention and More resolve from the same pathname, discriminated only by the hash.

### Today is close to a restyle

Four of five blocks map across unchanged: header, primary entry call to action, quick actions,
attention list, recent list. The real changes are:

- **New:** the deadline and schedule strip, with a health dot and slack note. No current
  equivalent, and the one part of the redesign with no schema behind it.
- **Quick actions go from four to three.** Voice note is added; "Write a note" folds into the
  main call to action; "Request a decision" moves into Entry.
- **The attention and recent lists gain "see all" targets**, which is why the nav refactor ships
  first.
- **Dropped:** the back link, stakeholder badge, notices and permission footer.

### Entry is a rebuild

The current visit route is a three-step tab wizard — Update, Photos & files, Finish — in
[`visit-tabs.tsx`](../../apps/web/app/projects/[projectId]/visits/[visitId]/visit-tabs.tsx). The
prototype deletes that organising principle: Entry is one scrolling page with no tabs.

| Aspect           | Today (Phase 14)               | Prototype                                    |
| ---------------- | ------------------------------ | -------------------------------------------- |
| Structure        | Three hash-routed tabs         | One scroll, no tabs                          |
| Zone and trade   | Hidden behind optional details | Inline chips, "Where & what"                 |
| Photographs      | A separate tab                 | Inline grid in the flow                      |
| Voice            | File upload, manual transcribe | Record button, live waveform, transcribing   |
| Report a problem | Form nested in the Finish tab  | A sheet, reachable from Today and from Entry |
| Ask a decision   | Form nested in the Finish tab  | A sheet                                      |
| Finish           | The third tab                  | A confirmation sheet                         |

**The clearest single argument that this is not cosmetic:** today, tapping "Report a problem" on
the Today screen posts `destination=issue`, which redirects to `#new-issue`, which `tabFromHash`
resolves to the **Finish** tab. A site manager reporting a damp patch arrives on step three of a
wizard called "Finish this site update". In the prototype the same tap opens a two-field sheet
over whatever screen they were on. That reordering cannot be reached by restyling.

### Where AI review goes

The current visit route does triple duty: field capture, field reporting, and reviewer tooling —
the Finish tab also carries "AI and advanced tools" with the text-extraction enqueues. The
prototype's Entry is field-only and has nowhere to put that.

**AI review belongs on the Phase 7 dashboard**, which is already the reviewer surface: it has the
review forms and writes `audit_log` entries. It does **not** belong on Overview. The design frames
Overview as what the owner sees — a read-only weekly summary with an approved tag — and hanging
worker enqueues behind it would muddle the one screen whose whole identity is that it is the
client's view. Overview stays read-only.

## A note save could review a summary nobody looked at (found and fixed)

> **Fixed.** The autosave path no longer reads or writes `summary`:
> `visitAutosaveFieldsSchema` strips the field at the boundary (covering stale clients that
> still post it), `persistVisitUpdate` writes only the fields the form owns, dead `updateVisit`
> is deleted, and explicit summary review lives solely in `reviewSummary`, which carries its own
> audit entry. Regression tests in `packages/core/src/forms.test.ts` pin the stale-tab save.
> The `updated_at` guard from the fix table has landed too: autosave echoes the last-seen
> `updated_at`, a save against a newer row is rejected instead of silently reverting it, and the
> save-state row shows "This update changed elsewhere — reload". The conflict-versus-permission
> split is pinned by `apps/web/lib/visit-autosave-conflict.test.ts`. Only the Entry narrow write
> action remains, for when that route is built. The rest of this section records the bug as
> found.

Found while checking the redesign's dual-write window — but it did not need the redesign. The
app before the fix triggered it in one tab.

`persistVisitUpdate` treats a changed summary as a review action. On every autosave it compares
the posted summary with the current row; if they differ and the current summary came from AI, it
flips `summary_review_state` — `edited` when the posted text is non-empty, `rejected` when it is
empty — stamps `summary_reviewed_by` with the current user, overwrites the summary text, and
writes an `audit_log` entry: `summary.edited` or `summary.rejected`, with `actor_user_id` set to
whoever saved (`apps/web/app/projects/[projectId]/visits/actions.ts`, line 231).

Every firing of that branch is a bug, because no legitimate edit can reach it. The only live
caller of `persistVisitUpdate` is the autosave form — `updateVisit`, the other route in, has no
callers at all — and that form renders no summary editor while posting the summary it loaded on
every save. A posted summary that differs from the current one can only mean the tab is stale.

Reproduction, one person, one tab:

1. Open a visit before it has a summary. The form freezes `summary = ""`.
2. Enqueue **Generate summary** from the same page's advanced tools, and keep typing notes.
3. The worker completes and writes the AI draft.
4. The next autosave — 800 ms after any keystroke — posts the frozen empty summary. The draft
   text is destroyed, `summary_created_by_job_id` is nulled, the review state becomes `rejected`,
   and the audit log records `summary.rejected` by the person typing.

The two-tab variant undoes reviews instead: a summary approved elsewhere is reverted to the
stale text, flipped to `edited`, and re-attributed to the note-editor.

The audit entry is the worst part. The trail now contains a review that a named person never
performed — in a system whose job is recording who decided what on a construction contract, that
is worse than the lost field.

### The fix, in order

| Fix                                                                                                                                                                                                                                                    | Scope                                   | Priority                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| Review state changes only through an explicit review action, never inferred from a changed value. Concretely, `persistVisitUpdate` stops reading or writing `summary`; explicit edits already have `reviewSummary`, which carries its own audit write. | Everywhere, including the current route | Root fix — first                                                           |
| Entry gets a narrow write action that touches only the fields it owns.                                                                                                                                                                                 | The new route                           | Do anyway; with the root fix in, an optimization, not a safety requirement |
| An `updated_at` guard or optimistic concurrency on visit autosave.                                                                                                                                                                                     | Everywhere                              | Secondary — stops a stale tab silently reverting title, date, zone, trade  |

With the root fix in, step 3 of the sequence stops being gated on this and becomes a normal
build.

## Before you start

One thing to decide deliberately rather than discover.

### The hashes being retired have exactly one producer

Moving Attention and More from hashes to routes means auditing whoever produces those URLs. The
audit surface is small:

| Hash                                               | Produced by                                    | Consumed by                             |
| -------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| `#attention`, `#more`                              | the field nav component, and nothing else      | `fieldNavigationSection()` and its test |
| `#finish`                                          | the Today page's "view finished update" link   | `tabFromHash`                           |
| `#update`, `#files`, `#new-issue`, `#new-decision` | `destinationHash()` in the Today server action | `tabFromHash`                           |

No page other than the nav itself links to `#attention` or `#more`, so retiring them touches the
nav, the helper and one test. The deep links into a visit are the shareable ones: if any have been
bookmarked, they need redirects rather than silently landing on the wrong tab.

## The nine screens in detail

### Backed — presentation work only

| Screen        | What already backs it                                                                                                                                                                                                  | Missing                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Budget**    | `contract_items` carries more than the mockup shows: code, title, quantity, unit, unit price, total, status, zone and trade. The budget page already joins zones, trades and documents, and sums the contracted total. | Nothing.                                                                                                           |
| **Documents** | `documents` plus private-bucket signed URLs from Phases 3 and 4 — filename, size, MIME type, document type and upload date are all stored.                                                                             | The mockup shows `Report` and `Permit` kinds; `document_type` has neither. Map the labels, or add two enum values. |
| **Overview**  | `weekly_summaries` with review state, plus the project timeline, which already derives markers from visits, decisions and weekly summaries.                                                                            | Nothing. Keep it read-only.                                                                                        |

### Partial — one gap each

| Screen        | What already backs it                                                                                                                                                                                                                                                   | Missing                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**     | The Today page already queries today's draft visit with its evidence, recent visits, open issues and pending decisions. Project name, address and "week 22 of 29" all derive from `projects`.                                                                           | The schedule-health chip. "Only 2 days of slack" needs a planned baseline; `start_date` and `deadline_date` give a span, not progress against plan. |
| **Entry**     | End to end: `visits.human_notes` with autosave, the photo strip from `evidence.manual_note`, voice notes through `agent_jobs` into `audio_transcriptions`, problem and decision sheets writing `issues` and `decisions`, and "finish the day" flipping `visits.status`. | Nothing in the schema. The work is the rebuild above, plus automatic transcription instead of a manual enqueue button.                              |
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

## Recommended next phase

> Add a `schedule_items` table with phase, milestone and delivery kinds, planned versus actual
> dates, and RLS matching the existing project-membership model. Add Zod schemas in
> `packages/core` and a derived schedule-health helper. No UI in this phase.

This is step 5 of the sequence, not step 1: the nav refactor and Today restyle both ship against
data that already exists, and the schedule strip can carry a placeholder until this lands.
