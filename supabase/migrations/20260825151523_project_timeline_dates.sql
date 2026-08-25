-- Project-level planning dates support the shared timeline without treating a
-- decision deadline as the deadline for the whole renovation. Existing project
-- RLS already controls these columns through the projects table policies.
alter table public.projects
  add column start_date date,
  add column deadline_date date,
  add constraint projects_deadline_after_start_check
    check (deadline_date is null or start_date is null or deadline_date >= start_date);

comment on column public.projects.start_date is
  'Optional planned or actual project start date.';

comment on column public.projects.deadline_date is
  'Optional project-level target completion date.';
