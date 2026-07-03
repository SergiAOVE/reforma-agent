-- Migration: Phase 2 helpers for auth, projects and memberships
--
-- Adds:
-- 1. A profiles SELECT policy so project members can see each other's
--    name/email (needed to render member lists).
-- 2. create_project_with_owner(): atomic project + owner membership creation.
-- 3. add_project_member_by_email(): owner/admin invites an existing user.
-- All helpers keep the service role out of the web app: everything runs as
-- the authenticated user, with permission checks in SQL.

-- ---------------------------------------------------------------------------
-- True when the given profile shares at least one project with the current
-- user. SECURITY DEFINER for the same reason as the Phase 1 helpers: the
-- lookup must not recurse into RLS policies.
-- ---------------------------------------------------------------------------
create function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs
      on mine.project_id = theirs.project_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke execute on function public.shares_project_with(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- True when the current user created the given project. SECURITY DEFINER
-- because the check must work BEFORE the creator becomes a member: policy
-- subqueries run under RLS, and the projects SELECT policy (is_project_member)
-- would hide the just-created project from its own creator.
-- ---------------------------------------------------------------------------
create function public.is_project_creator(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.created_by = (select auth.uid())
  );
$$;

revoke execute on function public.is_project_creator(uuid) from public, anon;

-- Replace the Phase 1 bootstrap policy: its inline EXISTS on projects ran
-- under RLS and therefore never matched (the creator is not a member yet).
-- Same intent, now via the definer helper above.
drop policy "project_members: insert owner/admin or creator bootstrap" on public.project_members;

create policy "project_members: insert owner/admin or creator bootstrap"
  on public.project_members for insert
  to authenticated
  with check (
    -- Bootstrap: the creator adds themselves as owner of their new project.
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and public.is_project_creator(project_id)
    )
    -- Normal management by owner/admin.
    or public.has_project_role(project_id, array['owner', 'admin']::public.project_role[])
  );

-- Members can read the profile (email, full_name) of co-members so the UI
-- can show who is in a project. Non-members remain invisible.
create policy "profiles: select co-members"
  on public.profiles for select
  to authenticated
  using (public.shares_project_with(id));

-- ---------------------------------------------------------------------------
-- create_project_with_owner
--
-- Creates a project and its owner membership in one transaction, so a failed
-- second insert can never leave an ownerless (and therefore invisible)
-- project behind. SECURITY INVOKER on purpose: both inserts run as the
-- calling user and must pass the existing RLS policies
-- ("projects: insert creator" and the project_members bootstrap policy).
--
-- Note: the project id is generated up front and the INSERT deliberately has
-- no RETURNING clause. Rows returned by INSERT ... RETURNING must also pass
-- the table's SELECT policy (is_project_member), and the creator only becomes
-- a member one statement later — RETURNING here would always fail.
-- ---------------------------------------------------------------------------
create function public.create_project_with_owner(
  p_name text,
  p_address_label text default null,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project_id uuid := gen_random_uuid();
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'project name is required';
  end if;

  insert into public.projects (id, name, address_label, description, created_by)
  values (v_project_id, trim(p_name), nullif(trim(p_address_label), ''), nullif(trim(p_description), ''), (select auth.uid()));

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, (select auth.uid()), 'owner');

  insert into public.audit_log (project_id, actor_user_id, action, entity_type, entity_id)
  values (v_project_id, (select auth.uid()), 'project.created', 'project', v_project_id);

  return v_project_id;
end;
$$;

revoke execute on function public.create_project_with_owner(text, text, text) from public, anon;

-- ---------------------------------------------------------------------------
-- add_project_member_by_email
--
-- Owner/admin adds an existing user to a project by email. SECURITY DEFINER
-- is required because the caller cannot see the profiles of users who are
-- not yet co-members; therefore ALL permission checks happen inside:
--   * caller must be owner or admin of the project;
--   * only an owner may grant the 'owner' role;
--   * the target user must exist and not already be a member.
--
-- The "no such account" and "already a member" cases raise the SAME message
-- on purpose: distinct messages would let a caller enumerate which emails
-- have accounts. (A successful add still reveals existence — inherent to
-- invite-by-email and acceptable: it is visible, auditable and reversible.)
-- The unique-violation handler covers the race where two admins add the
-- same person concurrently: without it the raw 23505 error would surface.
-- ---------------------------------------------------------------------------
create function public.add_project_member_by_email(
  p_project_id uuid,
  p_email text,
  p_role public.project_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_user_id uuid;
  v_membership_id uuid;
  v_cannot_add constant text :=
    'could not add member: no account with that email, or they are already a member';
begin
  if not public.has_project_role(p_project_id, array['owner', 'admin']::public.project_role[]) then
    raise exception 'only project owners or admins can add members';
  end if;

  if p_role = 'owner'
     and not public.has_project_role(p_project_id, array['owner']::public.project_role[]) then
    raise exception 'only a project owner can grant the owner role';
  end if;

  select id into v_target_user_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_target_user_id is null then
    raise exception '%', v_cannot_add using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = v_target_user_id
  ) then
    raise exception '%', v_cannot_add;
  end if;

  begin
    insert into public.project_members (project_id, user_id, role)
    values (p_project_id, v_target_user_id, p_role)
    returning id into v_membership_id;
  exception
    when unique_violation then
      raise exception '%', v_cannot_add;
  end;

  insert into public.audit_log (project_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_project_id,
    (select auth.uid()),
    'member.added',
    'project_member',
    v_membership_id,
    jsonb_build_object('role', p_role)
  );

  return v_membership_id;
end;
$$;

revoke execute on function public.add_project_member_by_email(uuid, text, public.project_role) from public, anon;
