-- Migration: Phase 3 project setup and private document Storage
--
-- Adds the private Storage bucket used by technical project documents and
-- Storage RLS policies tied to the first folder segment of each object path:
--   project-documents/<project_id>/<uuid>-<sanitized-filename>
--
-- Documents are metadata rows in public.documents; files live in Storage.
-- No document/OCR/plan analysis happens here.

-- Keep zone/trade names unique per project in a case-insensitive way. This
-- gives the setup forms deterministic behavior and keeps CSV imports from
-- resolving ambiguous names.
create unique index zones_project_name_unique_idx
  on public.zones (project_id, lower(name));

create unique index trades_project_name_unique_idx
  on public.trades (project_id, lower(name));

-- The local and hosted Supabase Storage API reads bucket configuration from
-- storage.buckets. The bucket is private; access is exclusively through RLS
-- on storage.objects and signed URLs generated for authorized members.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Safely parse the project id from a Storage object path. Badly formed paths
-- return null and therefore fail all membership checks below instead of
-- raising cast errors inside RLS.
create function public.storage_object_project_id(p_name text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_first_folder text;
begin
  v_first_folder := (storage.foldername(p_name))[1];
  if v_first_folder is null then
    return null;
  end if;

  return v_first_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke execute on function public.storage_object_project_id(text) from public, anon;
grant execute on function public.storage_object_project_id(text) to authenticated;

-- Storage RLS:
-- * project members can read/download/list objects for their projects.
-- * owner/admin/editor can upload and delete project document objects.
-- * uploads are not upserts in Phase 3; object paths include a UUID.
-- These policies do not expose the service role key to the web app.
create policy "project documents: select members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.is_project_member(public.storage_object_project_id(name))
  );

create policy "project documents: insert editors"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_object_project_id(name))
  );

create policy "project documents: update editors"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_object_project_id(name))
  )
  with check (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_object_project_id(name))
  );

create policy "project documents: delete editors"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_object_project_id(name))
  );
