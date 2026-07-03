-- Migration: Phase 7 summary review metadata
--
-- Phase 6 stored AI summaries in visits.summary, but Phase 7 needs the same
-- human-review lifecycle already used by issues and decisions. These columns
-- keep summary review state on the visit row, under the existing visits RLS
-- policies (members read; owner/admin/editor write).

alter table public.visits
  add column summary_review_state text not null default 'human_created',
  add column summary_source text not null default 'human',
  add column summary_created_by_job_id uuid references public.agent_jobs (id) on delete set null,
  add column summary_reviewed_by uuid references public.profiles (id) on delete set null,
  add column summary_reviewed_at timestamptz;

comment on column public.visits.summary_review_state is
  'Review lifecycle for visits.summary: human_created, ai_draft, approved, edited or rejected.';
comment on column public.visits.summary_source is
  'Origin of visits.summary: human or ai.';
comment on column public.visits.summary_created_by_job_id is
  'Worker job that generated the current AI summary draft, when applicable.';
comment on column public.visits.summary_reviewed_by is
  'User who last approved, edited or rejected the summary.';
comment on column public.visits.summary_reviewed_at is
  'Timestamp of the last summary review action.';

create index visits_summary_review_state_idx
  on public.visits (project_id, summary_review_state)
  where summary_source = 'ai';
