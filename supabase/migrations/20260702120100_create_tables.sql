-- Migration: create core tables
-- Phase 1 of reforma-agent.
-- Every project data table carries project_id: RLS policies (next migration)
-- filter by project membership. created_at/updated_at are maintained by the
-- set_updated_at trigger defined below.

-- Reusable trigger to keep updated_at fresh on every UPDATE.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user. Created on first login (Phase 2).
-- Personal data is minimized: email and an optional display name only.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects: a renovation project. address_label is a human label
-- ("Barcelona flat"), never a full postal address (data minimization).
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_label text,
  description text,
  status public.project_status not null default 'active',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_members: memberships and roles. This table is the basis of every
-- RLS policy: you can only touch data of projects you belong to.
-- ---------------------------------------------------------------------------
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

create trigger project_members_set_updated_at
  before update on public.project_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- zones: rooms/areas of the renovation (kitchen, main bathroom, hallway...).
-- ---------------------------------------------------------------------------
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index zones_project_id_idx on public.zones (project_id);

create trigger zones_set_updated_at
  before update on public.zones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trades: crafts involved (electrical, plumbing, carpentry, painting...).
-- ---------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trades_project_id_idx on public.trades (project_id);

create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents: technical documents (plan, quote, technical specification...).
-- Files live in private Storage; this table stores metadata only.
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.document_type not null,
  title text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  notes text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_project_id_idx on public.documents (project_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contract_items: budget line items, entered manually or imported from CSV
-- (Phase 3). Optionally traced back to a source document and page.
-- ---------------------------------------------------------------------------
create table public.contract_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_document_id uuid references public.documents (id) on delete set null,
  code text,
  title text not null,
  description text,
  trade_id uuid references public.trades (id) on delete set null,
  zone_id uuid references public.zones (id) on delete set null,
  quantity numeric,
  unit text,
  unit_price numeric,
  total_amount numeric,
  included_excluded text,
  source_page text,
  notes text,
  status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contract_items_project_id_idx on public.contract_items (project_id);

create trigger contract_items_set_updated_at
  before update on public.contract_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- visits: site visits. Edited as draft, then published for owners.
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  visit_date date not null,
  status public.visit_status not null default 'draft',
  general_status text,
  summary text,
  human_notes text,
  primary_zone_id uuid references public.zones (id) on delete set null,
  primary_trade_id uuid references public.trades (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visits_project_id_idx on public.visits (project_id);

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- evidence: photos, audio, video or documents attached to a visit.
-- Photos are visual evidence only: never AI vision input (ADR-0002).
-- Files live in private Storage; this table stores metadata only.
-- ---------------------------------------------------------------------------
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  visit_id uuid references public.visits (id) on delete set null,
  type public.evidence_type not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  zone_id uuid references public.zones (id) on delete set null,
  trade_id uuid references public.trades (id) on delete set null,
  manual_note text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index evidence_project_id_idx on public.evidence (project_id);
create index evidence_visit_id_idx on public.evidence (visit_id);

create trigger evidence_set_updated_at
  before update on public.evidence
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- agent_jobs: async job queue processed by the worker (service role only).
-- The web app enqueues; the worker locks, processes and completes.
-- Locking and retries are implemented in Phase 5.
-- ---------------------------------------------------------------------------
create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.job_type not null,
  status public.job_status not null default 'pending',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  locked_by text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index agent_jobs_project_id_idx on public.agent_jobs (project_id);
-- Partial index for the worker's polling query: fetch pending jobs in order.
create index agent_jobs_pending_idx on public.agent_jobs (created_at)
  where status = 'pending';

create trigger agent_jobs_set_updated_at
  before update on public.agent_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audio_transcriptions: transcription of an audio evidence item.
-- raw_transcript is never overwritten; users edit edited_transcript.
-- AI extractions (Phase 6) use the edited version when present.
-- ---------------------------------------------------------------------------
create table public.audio_transcriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  raw_transcript text not null,
  edited_transcript text,
  language text,
  provider text,
  model text,
  created_by_job_id uuid references public.agent_jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audio_transcriptions_project_id_idx on public.audio_transcriptions (project_id);
create index audio_transcriptions_evidence_id_idx on public.audio_transcriptions (evidence_id);

create trigger audio_transcriptions_set_updated_at
  before update on public.audio_transcriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- issues: problems detected on site. Created by humans, or proposed by AI as
-- 'ai_draft' rows that must be reviewed (approved/edited/rejected).
-- review_state: human_created | ai_draft | approved | edited | rejected.
-- ---------------------------------------------------------------------------
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  visit_id uuid references public.visits (id) on delete set null,
  title text not null,
  description text,
  zone_id uuid references public.zones (id) on delete set null,
  trade_id uuid references public.trades (id) on delete set null,
  priority public.priority not null default 'medium',
  status public.issue_status not null default 'open',
  review_state text not null default 'human_created',
  source text not null default 'human',
  contract_item_id uuid references public.contract_items (id) on delete set null,
  cost_risk text,
  schedule_risk text,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_job_id uuid references public.agent_jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index issues_project_id_idx on public.issues (project_id);
create index issues_visit_id_idx on public.issues (visit_id);

create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- decisions: pending decisions for the owners. Same human/AI draft flow as
-- issues. options is a jsonb array of alternatives shown to the owners.
-- ---------------------------------------------------------------------------
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  visit_id uuid references public.visits (id) on delete set null,
  title text not null,
  description text,
  options jsonb,
  recommendation text,
  zone_id uuid references public.zones (id) on delete set null,
  trade_id uuid references public.trades (id) on delete set null,
  priority public.priority not null default 'medium',
  status public.decision_status not null default 'pending',
  review_state text not null default 'human_created',
  source text not null default 'human',
  deadline date,
  cost_impact text,
  schedule_impact text,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_job_id uuid references public.agent_jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decisions_project_id_idx on public.decisions (project_id);
create index decisions_visit_id_idx on public.decisions (visit_id);

create trigger decisions_set_updated_at
  before update on public.decisions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log: append-only trace of relevant actions (publishing a visit,
-- approving/rejecting AI drafts, membership changes...). No updated_at:
-- rows are never modified.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_project_id_idx on public.audit_log (project_id);
