-- Migration: enable Row Level Security and base policies
-- Phase 1 of reforma-agent.
--
-- Model:
-- * Every project data table enables RLS. Without a matching policy, a row is
--   invisible/untouchable for `authenticated` users.
-- * Policies are based on public.project_members: you can only see data of
--   projects you belong to, and only write according to your role.
-- * The worker uses the service role key, which BYPASSES RLS by design.
--   That key must never reach the browser.
-- * `anon` users get nothing: no policy below targets them.

-- ---------------------------------------------------------------------------
-- Helper functions
--
-- SECURITY DEFINER is required: policies on project_members that queried
-- project_members directly would recurse into their own policy. A definer
-- function runs as its owner (postgres) and skips RLS for the lookup itself.
-- search_path is pinned to avoid schema hijacking.
-- ---------------------------------------------------------------------------

-- True when the current user is a member of the project (any role).
create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

-- True when the current user has one of the given roles in the project.
-- Example: public.has_project_role(id, array['owner','admin']::public.project_role[])
create function public.has_project_role(p_project_id uuid, p_roles public.project_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
      and pm.role = any (p_roles)
  );
$$;

-- Convenience: true when the user can write project content
-- (owner, admin or editor; viewers are read-only).
create function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_project_role(
    p_project_id,
    array['owner', 'admin', 'editor']::public.project_role[]
  );
$$;

-- Lock the helpers down: only authenticated users may call them.
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.has_project_role(uuid, public.project_role[]) from public, anon;
revoke execute on function public.can_edit_project(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- profiles
-- Users manage their own profile only. Reading other members' profiles
-- (to show names in a project) will be added in Phase 2 when the UI needs it.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: profiles disappear via auth.users cascade.

-- ---------------------------------------------------------------------------
-- projects
-- Members can read. Any authenticated user can create a project they own
-- (created_by must be themselves). Owner/admin update; only owner deletes.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

create policy "projects: select members"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id));

create policy "projects: insert creator"
  on public.projects for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "projects: update owner/admin"
  on public.projects for update
  to authenticated
  using (public.has_project_role(id, array['owner', 'admin']::public.project_role[]))
  with check (public.has_project_role(id, array['owner', 'admin']::public.project_role[]));

create policy "projects: delete owner"
  on public.projects for delete
  to authenticated
  using (public.has_project_role(id, array['owner']::public.project_role[]));

-- ---------------------------------------------------------------------------
-- project_members
-- Members see the member list of their projects. The project creator can
-- insert themselves as owner (bootstrap right after creating the project);
-- owner/admin manage the rest. Owner rows can only be removed by an owner,
-- so an admin can never delete the owner.
-- ---------------------------------------------------------------------------
alter table public.project_members enable row level security;

create policy "project_members: select members"
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "project_members: insert owner/admin or creator bootstrap"
  on public.project_members for insert
  to authenticated
  with check (
    -- Bootstrap: the creator adds themselves as owner of their new project.
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = (select auth.uid())
      )
    )
    -- Normal management by owner/admin.
    or public.has_project_role(project_id, array['owner', 'admin']::public.project_role[])
  );

create policy "project_members: update owner/admin"
  on public.project_members for update
  to authenticated
  using (public.has_project_role(project_id, array['owner', 'admin']::public.project_role[]))
  with check (public.has_project_role(project_id, array['owner', 'admin']::public.project_role[]));

create policy "project_members: delete owner/admin, owners only by owner"
  on public.project_members for delete
  to authenticated
  using (
    public.has_project_role(project_id, array['owner', 'admin']::public.project_role[])
    and (
      role <> 'owner'
      or public.has_project_role(project_id, array['owner']::public.project_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- Project content tables: zones, trades, documents, contract_items, visits,
-- evidence, audio_transcriptions, issues, decisions.
-- Same base pattern for Phase 1:
--   select -> any member; insert/update/delete -> owner/admin/editor.
-- Finer per-role rules (e.g. who may publish a visit) arrive with the UI
-- phases that exercise them.
-- ---------------------------------------------------------------------------

-- zones ----------------------------------------------------------------------
alter table public.zones enable row level security;

create policy "zones: select members"
  on public.zones for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "zones: insert editors"
  on public.zones for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "zones: update editors"
  on public.zones for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "zones: delete editors"
  on public.zones for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- trades ---------------------------------------------------------------------
alter table public.trades enable row level security;

create policy "trades: select members"
  on public.trades for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "trades: insert editors"
  on public.trades for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "trades: update editors"
  on public.trades for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "trades: delete editors"
  on public.trades for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- documents ------------------------------------------------------------------
alter table public.documents enable row level security;

create policy "documents: select members"
  on public.documents for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "documents: insert editors"
  on public.documents for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "documents: update editors"
  on public.documents for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "documents: delete editors"
  on public.documents for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- contract_items -------------------------------------------------------------
alter table public.contract_items enable row level security;

create policy "contract_items: select members"
  on public.contract_items for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "contract_items: insert editors"
  on public.contract_items for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "contract_items: update editors"
  on public.contract_items for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "contract_items: delete editors"
  on public.contract_items for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- visits ---------------------------------------------------------------------
alter table public.visits enable row level security;

create policy "visits: select members"
  on public.visits for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "visits: insert editors"
  on public.visits for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "visits: update editors"
  on public.visits for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "visits: delete editors"
  on public.visits for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- evidence -------------------------------------------------------------------
alter table public.evidence enable row level security;

create policy "evidence: select members"
  on public.evidence for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "evidence: insert editors"
  on public.evidence for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "evidence: update editors"
  on public.evidence for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "evidence: delete editors"
  on public.evidence for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- audio_transcriptions -------------------------------------------------------
-- Transcriptions are created by the worker (service role, bypasses RLS).
-- Members read them; editors may edit the edited_transcript. No client insert
-- or delete: the raw transcript must be preserved (see docs/en/04).
alter table public.audio_transcriptions enable row level security;

create policy "audio_transcriptions: select members"
  on public.audio_transcriptions for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "audio_transcriptions: update editors"
  on public.audio_transcriptions for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- issues ---------------------------------------------------------------------
alter table public.issues enable row level security;

create policy "issues: select members"
  on public.issues for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "issues: insert editors"
  on public.issues for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "issues: update editors"
  on public.issues for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "issues: delete editors"
  on public.issues for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- decisions ------------------------------------------------------------------
alter table public.decisions enable row level security;

create policy "decisions: select members"
  on public.decisions for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "decisions: insert editors"
  on public.decisions for insert
  to authenticated
  with check (public.can_edit_project(project_id));

create policy "decisions: update editors"
  on public.decisions for update
  to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy "decisions: delete editors"
  on public.decisions for delete
  to authenticated
  using (public.can_edit_project(project_id));

-- ---------------------------------------------------------------------------
-- agent_jobs
-- Members see their project's jobs; editors enqueue new ones (created_by must
-- be themselves). No client update/delete: only the worker (service role)
-- transitions job state, so clients cannot fake results or steal locks.
-- ---------------------------------------------------------------------------
alter table public.agent_jobs enable row level security;

create policy "agent_jobs: select members"
  on public.agent_jobs for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "agent_jobs: insert editors"
  on public.agent_jobs for insert
  to authenticated
  with check (
    public.can_edit_project(project_id)
    and created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- audit_log
-- Append-only. Members read their project's log and may write entries about
-- themselves. No update/delete for anyone (only service role could).
-- ---------------------------------------------------------------------------
alter table public.audit_log enable row level security;

create policy "audit_log: select members"
  on public.audit_log for select
  to authenticated
  using (project_id is not null and public.is_project_member(project_id));

create policy "audit_log: insert members about self"
  on public.audit_log for insert
  to authenticated
  with check (
    project_id is not null
    and public.is_project_member(project_id)
    and actor_user_id = (select auth.uid())
  );
