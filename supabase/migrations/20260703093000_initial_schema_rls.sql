create extension if not exists "pgcrypto";

create schema if not exists app_private;
comment on schema app_private is 'Internal helper schema for RLS functions. Do not expose this schema through the Supabase Data API.';
revoke all on schema app_private from public;

create type public.project_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');
create type public.visit_status as enum ('draft', 'published', 'archived');
create type public.evidence_type as enum ('photo', 'audio', 'video', 'document');
create type public.document_type as enum (
  'plan',
  'quote',
  'technical_memory',
  'annex',
  'invoice',
  'warranty',
  'change_order',
  'other'
);
create type public.issue_status as enum (
  'ai_draft',
  'open',
  'in_review',
  'waiting_builder',
  'waiting_owner',
  'resolved',
  'closed',
  'rejected'
);
create type public.decision_status as enum (
  'ai_draft',
  'pending',
  'approved',
  'rejected',
  'superseded',
  'closed'
);
create type public.priority as enum ('low', 'medium', 'high', 'critical');
create type public.job_type as enum (
  'transcribe_audio',
  'extract_visit',
  'generate_visit_summary',
  'suggest_issues',
  'suggest_decisions',
  'generate_weekly_summary'
);
create type public.job_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_format check (email is null or position('@' in email) > 1)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_label text,
  description text,
  status public.project_status not null default 'active',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(trim(name)) > 0)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_members_unique_member unique (project_id, user_id)
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zones_name_not_blank check (length(trim(name)) > 0),
  constraint zones_unique_project_name unique (project_id, name)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_name_not_blank check (length(trim(name)) > 0),
  constraint trades_unique_project_name unique (project_id, name)
);

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
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_title_not_blank check (length(trim(title)) > 0),
  constraint documents_storage_path_not_blank check (length(trim(storage_path)) > 0),
  constraint documents_original_filename_not_blank check (length(trim(original_filename)) > 0),
  constraint documents_mime_type_not_blank check (length(trim(mime_type)) > 0),
  constraint documents_size_bytes_non_negative check (size_bytes >= 0)
);

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
  updated_at timestamptz not null default now(),
  constraint contract_items_title_not_blank check (length(trim(title)) > 0),
  constraint contract_items_quantity_non_negative check (quantity is null or quantity >= 0),
  constraint contract_items_unit_price_non_negative check (unit_price is null or unit_price >= 0),
  constraint contract_items_total_amount_non_negative check (total_amount is null or total_amount >= 0),
  constraint contract_items_status_not_blank check (length(trim(status)) > 0)
);

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
  created_by uuid not null references public.profiles (id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_title_not_blank check (length(trim(title)) > 0),
  constraint visits_published_at_required check (status <> 'published' or published_at is not null)
);

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
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_storage_path_not_blank check (length(trim(storage_path)) > 0),
  constraint evidence_original_filename_not_blank check (length(trim(original_filename)) > 0),
  constraint evidence_mime_type_not_blank check (length(trim(mime_type)) > 0),
  constraint evidence_size_bytes_non_negative check (size_bytes >= 0)
);

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
  completed_at timestamptz,
  constraint agent_jobs_input_is_object check (jsonb_typeof(input) = 'object'),
  constraint agent_jobs_output_is_object check (output is null or jsonb_typeof(output) = 'object'),
  constraint agent_jobs_attempt_count_non_negative check (attempt_count >= 0),
  constraint agent_jobs_max_attempts_positive check (max_attempts > 0),
  constraint agent_jobs_attempts_not_over_max check (attempt_count <= max_attempts)
);

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
  updated_at timestamptz not null default now(),
  constraint audio_transcriptions_unique_evidence unique (evidence_id),
  constraint audio_transcriptions_raw_transcript_not_blank check (length(trim(raw_transcript)) > 0)
);

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
  updated_at timestamptz not null default now(),
  constraint issues_title_not_blank check (length(trim(title)) > 0),
  constraint issues_review_state_allowed check (review_state in ('human_created', 'ai_draft', 'approved', 'edited', 'rejected')),
  constraint issues_source_not_blank check (length(trim(source)) > 0)
);

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
  updated_at timestamptz not null default now(),
  constraint decisions_title_not_blank check (length(trim(title)) > 0),
  constraint decisions_options_is_object check (options is null or jsonb_typeof(options) = 'object'),
  constraint decisions_review_state_allowed check (review_state in ('human_created', 'ai_draft', 'approved', 'edited', 'rejected')),
  constraint decisions_source_not_blank check (length(trim(source)) > 0)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_action_not_blank check (length(trim(action)) > 0),
  constraint audit_log_entity_type_not_blank check (length(trim(entity_type)) > 0),
  constraint audit_log_metadata_is_object check (metadata is null or jsonb_typeof(metadata) = 'object')
);

create index profiles_email_idx on public.profiles (email);
create index projects_created_by_idx on public.projects (created_by);
create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_user_id_idx on public.project_members (user_id);
create index zones_project_id_idx on public.zones (project_id);
create index trades_project_id_idx on public.trades (project_id);
create index documents_project_id_idx on public.documents (project_id);
create index contract_items_project_id_idx on public.contract_items (project_id);
create index contract_items_trade_id_idx on public.contract_items (trade_id);
create index contract_items_zone_id_idx on public.contract_items (zone_id);
create index visits_project_id_idx on public.visits (project_id);
create index visits_visit_date_idx on public.visits (visit_date);
create index evidence_project_id_idx on public.evidence (project_id);
create index evidence_visit_id_idx on public.evidence (visit_id);
create index agent_jobs_project_status_idx on public.agent_jobs (project_id, status);
create index agent_jobs_pending_idx on public.agent_jobs (status, created_at) where status = 'pending';
create index audio_transcriptions_project_id_idx on public.audio_transcriptions (project_id);
create index issues_project_status_idx on public.issues (project_id, status);
create index issues_project_priority_idx on public.issues (project_id, priority);
create index decisions_project_status_idx on public.decisions (project_id, status);
create index decisions_project_priority_idx on public.decisions (project_id, priority);
create index audit_log_project_id_idx on public.audit_log (project_id);
create index audit_log_actor_user_id_idx on public.audit_log (actor_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_project_members_updated_at
before update on public.project_members
for each row execute function public.set_updated_at();

create trigger set_zones_updated_at
before update on public.zones
for each row execute function public.set_updated_at();

create trigger set_trades_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger set_contract_items_updated_at
before update on public.contract_items
for each row execute function public.set_updated_at();

create trigger set_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create trigger set_evidence_updated_at
before update on public.evidence
for each row execute function public.set_updated_at();

create trigger set_agent_jobs_updated_at
before update on public.agent_jobs
for each row execute function public.set_updated_at();

create trigger set_audio_transcriptions_updated_at
before update on public.audio_transcriptions
for each row execute function public.set_updated_at();

create trigger set_issues_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

create trigger set_decisions_updated_at
before update on public.decisions
for each row execute function public.set_updated_at();

create or replace function app_private.current_project_role(p_project_id uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = (select auth.uid())
  limit 1
$$;

comment on function app_private.current_project_role(uuid) is 'Returns the current authenticated user role for a project. SECURITY DEFINER is used only to avoid project_members RLS recursion.';

create or replace function app_private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  )
$$;

comment on function app_private.is_project_member(uuid) is 'Checks current authenticated user membership without exposing arbitrary member lookup.';

create or replace function app_private.has_project_role(
  p_project_id uuid,
  p_allowed_roles public.project_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_project_role(p_project_id) = any (p_allowed_roles), false)
$$;

comment on function app_private.has_project_role(uuid, public.project_role[]) is 'Checks whether the current authenticated user has one of the allowed project roles.';

create or replace function app_private.project_created_by_current_user(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.created_by = (select auth.uid())
  )
$$;

comment on function app_private.project_created_by_current_user(uuid) is 'Allows the project creator to create the initial owner membership before membership-based policies can apply.';

create or replace function app_private.users_share_project(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.project_members current_member
      join public.project_members target_member
        on target_member.project_id = current_member.project_id
      where current_member.user_id = (select auth.uid())
        and target_member.user_id = p_user_id
    )
$$;

comment on function app_private.users_share_project(uuid) is 'Allows members to resolve profile rows for users in the same project without exposing all profiles.';

revoke all on function app_private.current_project_role(uuid) from public, anon, authenticated;
revoke all on function app_private.is_project_member(uuid) from public, anon, authenticated;
revoke all on function app_private.has_project_role(uuid, public.project_role[]) from public, anon, authenticated;
revoke all on function app_private.project_created_by_current_user(uuid) from public, anon, authenticated;
revoke all on function app_private.users_share_project(uuid) from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_project_role(uuid) to authenticated;
grant execute on function app_private.is_project_member(uuid) to authenticated;
grant execute on function app_private.has_project_role(uuid, public.project_role[]) to authenticated;
grant execute on function app_private.project_created_by_current_user(uuid) to authenticated;
grant execute on function app_private.users_share_project(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.zones enable row level security;
alter table public.trades enable row level security;
alter table public.documents enable row level security;
alter table public.contract_items enable row level security;
alter table public.visits enable row level security;
alter table public.evidence enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.audio_transcriptions enable row level security;
alter table public.issues enable row level security;
alter table public.decisions enable row level security;
alter table public.audit_log enable row level security;

grant usage on schema public to authenticated, service_role;
grant usage on type public.project_role to authenticated, service_role;
grant usage on type public.project_status to authenticated, service_role;
grant usage on type public.visit_status to authenticated, service_role;
grant usage on type public.evidence_type to authenticated, service_role;
grant usage on type public.document_type to authenticated, service_role;
grant usage on type public.issue_status to authenticated, service_role;
grant usage on type public.decision_status to authenticated, service_role;
grant usage on type public.priority to authenticated, service_role;
grant usage on type public.job_type to authenticated, service_role;
grant usage on type public.job_status to authenticated, service_role;

revoke all on all tables in schema public from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.zones to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.contract_items to authenticated;
grant select, insert, update, delete on public.visits to authenticated;
grant select, insert, update, delete on public.evidence to authenticated;
grant select, insert, update, delete on public.agent_jobs to authenticated;
grant select, insert, update, delete on public.audio_transcriptions to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert, update, delete on public.decisions to authenticated;
grant select, insert on public.audit_log to authenticated;
grant all privileges on all tables in schema public to service_role;

create policy "Users can read their own or shared profiles"
on public.profiles
for select
to authenticated
using (app_private.users_share_project(id));

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Project members can read projects"
on public.projects
for select
to authenticated
using (app_private.is_project_member(id));

create policy "Authenticated users can create their own projects"
on public.projects
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "Owners and admins can update projects"
on public.projects
for update
to authenticated
using (app_private.has_project_role(id, array['owner', 'admin']::public.project_role[]))
with check (app_private.has_project_role(id, array['owner', 'admin']::public.project_role[]));

create policy "Owners can delete projects"
on public.projects
for delete
to authenticated
using (app_private.has_project_role(id, array['owner']::public.project_role[]));

create policy "Project members can read memberships"
on public.project_members
for select
to authenticated
using (app_private.is_project_member(project_id));

comment on policy "Project members can read memberships" on public.project_members is 'Membership policies use app_private helpers to avoid recursive RLS reads on project_members.';

create policy "Creators owners and admins can add memberships"
on public.project_members
for insert
to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and app_private.project_created_by_current_user(project_id)
  )
  or app_private.has_project_role(project_id, array['owner']::public.project_role[])
  or (
    role <> 'owner'
    and app_private.has_project_role(project_id, array['admin']::public.project_role[])
  )
);

create policy "Owners and admins can update memberships"
on public.project_members
for update
to authenticated
using (
  app_private.has_project_role(project_id, array['owner']::public.project_role[])
  or (
    role <> 'owner'
    and app_private.has_project_role(project_id, array['admin']::public.project_role[])
  )
)
with check (
  app_private.has_project_role(project_id, array['owner']::public.project_role[])
  or (
    role <> 'owner'
    and app_private.has_project_role(project_id, array['admin']::public.project_role[])
  )
);

create policy "Owners and admins can delete memberships"
on public.project_members
for delete
to authenticated
using (
  app_private.has_project_role(project_id, array['owner']::public.project_role[])
  or (
    role <> 'owner'
    and app_private.has_project_role(project_id, array['admin']::public.project_role[])
  )
);

create policy "Project members can read zones"
on public.zones
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert zones"
on public.zones
for insert
to authenticated
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Editors can update zones"
on public.zones
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete zones"
on public.zones
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read trades"
on public.trades
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert trades"
on public.trades
for insert
to authenticated
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Editors can update trades"
on public.trades
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete trades"
on public.trades
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read documents"
on public.documents
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert documents"
on public.documents
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Editors can update documents"
on public.documents
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete documents"
on public.documents
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read contract items"
on public.contract_items
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert contract items"
on public.contract_items
for insert
to authenticated
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Editors can update contract items"
on public.contract_items
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete contract items"
on public.contract_items
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read visits"
on public.visits
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert visits"
on public.visits
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Editors can update visits"
on public.visits
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete visits"
on public.visits
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read evidence"
on public.evidence
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert evidence"
on public.evidence
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Editors can update evidence"
on public.evidence
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete evidence"
on public.evidence
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read agent jobs"
on public.agent_jobs
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can enqueue agent jobs"
on public.agent_jobs
for insert
to authenticated
with check (
  (created_by is null or created_by = (select auth.uid()))
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Owners and admins can update agent jobs"
on public.agent_jobs
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Owners and admins can delete agent jobs"
on public.agent_jobs
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read audio transcriptions"
on public.audio_transcriptions
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert audio transcriptions"
on public.audio_transcriptions
for insert
to authenticated
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Editors can update audio transcriptions"
on public.audio_transcriptions
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete audio transcriptions"
on public.audio_transcriptions
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read issues"
on public.issues
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert issues"
on public.issues
for insert
to authenticated
with check (
  (created_by is null or created_by = (select auth.uid()))
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Editors can update issues"
on public.issues
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete issues"
on public.issues
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read decisions"
on public.decisions
for select
to authenticated
using (app_private.is_project_member(project_id));

create policy "Editors can insert decisions"
on public.decisions
for insert
to authenticated
with check (
  (created_by is null or created_by = (select auth.uid()))
  and app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[])
);

create policy "Editors can update decisions"
on public.decisions
for update
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]))
with check (app_private.has_project_role(project_id, array['owner', 'admin', 'editor']::public.project_role[]));

create policy "Owners and admins can delete decisions"
on public.decisions
for delete
to authenticated
using (app_private.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "Project members can read audit log"
on public.audit_log
for select
to authenticated
using (
  (project_id is null and actor_user_id = (select auth.uid()))
  or (project_id is not null and app_private.is_project_member(project_id))
);

create policy "Authenticated users can write their own audit events"
on public.audit_log
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (project_id is null or app_private.is_project_member(project_id))
);

comment on table public.evidence is 'Photos, audio, video, and document files are stored as evidence. MVP code must not analyze photo pixels with AI.';
comment on table public.agent_jobs is 'Queue table for controlled async worker jobs. Long AI work must not run inside normal web requests.';
comment on column public.issues.review_state is 'Review state keeps AI-generated content as drafts until human approval, edit, or rejection.';
comment on column public.decisions.review_state is 'Review state keeps AI-generated content as drafts until human approval, edit, or rejection.';
