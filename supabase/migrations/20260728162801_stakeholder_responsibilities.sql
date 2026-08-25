-- Migration: stakeholder functions and responsibility assignments
--
-- Permission roles and real-world project functions are intentionally
-- separate. RLS continues to authorize through project_role only;
-- stakeholder_type is descriptive context for coordination and reporting.

create type public.stakeholder_type as enum (
  'customer',
  'site_manager',
  'architect',
  'engineer',
  'contractor',
  'foreman',
  'worker',
  'consultant',
  'other'
);

comment on type public.stakeholder_type is
  'A project member''s real-world function. This value never grants database permissions.';

revoke usage on type public.stakeholder_type from public, anon;
grant usage on type public.stakeholder_type to authenticated, service_role;

alter table public.project_members
  add column stakeholder_type public.stakeholder_type not null default 'other';

comment on column public.project_members.stakeholder_type is
  'Descriptive project function, separate from the permission-bearing role column.';

-- Client updates to memberships are limited to descriptive stakeholder data.
-- Membership creation still uses the audited RPC and deletion still follows
-- the existing RLS policy. Permission-role changes are not exposed here.
revoke update on table public.project_members from authenticated;
grant update (stakeholder_type) on table public.project_members to authenticated;

-- New project creators are customers by default. They may correct this
-- descriptive function later in project settings without changing ownership.
create or replace function public.create_project_with_owner(
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
  values (
    v_project_id,
    trim(p_name),
    nullif(trim(p_address_label), ''),
    nullif(trim(p_description), ''),
    (select auth.uid())
  );

  insert into public.project_members (project_id, user_id, role, stakeholder_type)
  values (v_project_id, (select auth.uid()), 'owner', 'customer');

  insert into public.audit_log (project_id, actor_user_id, action, entity_type, entity_id)
  values (v_project_id, (select auth.uid()), 'project.created', 'project', v_project_id);

  return v_project_id;
end;
$$;

revoke execute on function public.create_project_with_owner(text, text, text)
  from public, anon, service_role;
grant execute on function public.create_project_with_owner(text, text, text)
  to authenticated;

-- Replace the Phase 2 add-member RPC so the inviter records both the
-- permission role and the stakeholder function in one audited operation.
drop function public.add_project_member_by_email(uuid, text, public.project_role);

create function public.add_project_member_by_email(
  p_project_id uuid,
  p_email text,
  p_role public.project_role,
  p_stakeholder_type public.stakeholder_type
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
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if not public.has_project_role(
    p_project_id,
    array['owner', 'admin']::public.project_role[]
  ) then
    raise exception 'only project owners or admins can add members';
  end if;

  if p_role = 'owner'
     and not public.has_project_role(
       p_project_id,
       array['owner']::public.project_role[]
     ) then
    raise exception 'only a project owner can grant the owner role';
  end if;

  select id into v_target_user_id
  from public.profiles
  where lower(email) = lower(trim(p_email));

  if v_target_user_id is null then
    raise exception '%', v_cannot_add using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.project_members
    where project_id = p_project_id and user_id = v_target_user_id
  ) then
    raise exception '%', v_cannot_add;
  end if;

  begin
    insert into public.project_members (
      project_id,
      user_id,
      role,
      stakeholder_type
    )
    values (
      p_project_id,
      v_target_user_id,
      p_role,
      p_stakeholder_type
    )
    returning id into v_membership_id;
  exception
    when unique_violation then
      raise exception '%', v_cannot_add;
  end;

  insert into public.audit_log (
    project_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_project_id,
    (select auth.uid()),
    'member.added',
    'project_member',
    v_membership_id,
    jsonb_build_object(
      'role', p_role,
      'stakeholder_type', p_stakeholder_type
    )
  );

  return v_membership_id;
end;
$$;

revoke execute on function public.add_project_member_by_email(
  uuid,
  text,
  public.project_role,
  public.stakeholder_type
) from public, anon, service_role;
grant execute on function public.add_project_member_by_email(
  uuid,
  text,
  public.project_role,
  public.stakeholder_type
) to authenticated;

-- Responsibility fields store user ids, while composite foreign keys enforce
-- that every selected person is a member of the same project. Removing a
-- member clears only the assignment, never the project id.
alter table public.issues
  add column responsible_user_id uuid,
  add column approver_user_id uuid,
  add constraint issues_responsible_project_member_fkey
    foreign key (project_id, responsible_user_id)
    references public.project_members (project_id, user_id)
    on delete set null (responsible_user_id),
  add constraint issues_approver_project_member_fkey
    foreign key (project_id, approver_user_id)
    references public.project_members (project_id, user_id)
    on delete set null (approver_user_id);

alter table public.decisions
  add column responsible_user_id uuid,
  add column approver_user_id uuid,
  add constraint decisions_responsible_project_member_fkey
    foreign key (project_id, responsible_user_id)
    references public.project_members (project_id, user_id)
    on delete set null (responsible_user_id),
  add constraint decisions_approver_project_member_fkey
    foreign key (project_id, approver_user_id)
    references public.project_members (project_id, user_id)
    on delete set null (approver_user_id);

comment on column public.issues.responsible_user_id is
  'Project member accountable for coordinating the issue response.';
comment on column public.issues.approver_user_id is
  'Project member expected to confirm the issue resolution.';
comment on column public.decisions.responsible_user_id is
  'Project member accountable for preparing or coordinating the decision.';
comment on column public.decisions.approver_user_id is
  'Project member expected to make or confirm the decision.';

create index issues_project_responsible_user_idx
  on public.issues (project_id, responsible_user_id)
  where responsible_user_id is not null;
create index issues_project_approver_user_idx
  on public.issues (project_id, approver_user_id)
  where approver_user_id is not null;
create index decisions_project_responsible_user_idx
  on public.decisions (project_id, responsible_user_id)
  where responsible_user_id is not null;
create index decisions_project_approver_user_idx
  on public.decisions (project_id, approver_user_id)
  where approver_user_id is not null;
