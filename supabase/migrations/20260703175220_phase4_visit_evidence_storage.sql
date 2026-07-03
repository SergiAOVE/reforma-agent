-- Migration: Phase 4 visits and private evidence Storage
--
-- Adds the private Storage bucket used by visit evidence (photos, audio,
-- video and document evidence). Object paths must be:
--   visit-evidence/<project_id>/<visit_id>/<uuid>-<sanitized-filename>
--
-- Photos are evidence only: this migration does not add OCR, AI vision,
-- transcription jobs or any automatic analysis.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visit-evidence',
  'visit-evidence',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
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

-- Safely parse the visit id from the second folder segment of a Storage path.
-- Badly formed paths return null and therefore fail the visit/project match
-- checks below instead of raising cast errors inside RLS.
create function public.storage_object_visit_id(p_name text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_second_folder text;
begin
  v_second_folder := (storage.foldername(p_name))[2];
  if v_second_folder is null then
    return null;
  end if;

  return v_second_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke execute on function public.storage_object_visit_id(text) from public, anon;
grant execute on function public.storage_object_visit_id(text) to authenticated;

-- Storage RLS:
-- * project members can read/download/list evidence objects.
-- * owner/admin/editor can upload/delete evidence objects.
-- * uploads must use a path with an existing visit in the same project.
-- * uploads use unique object paths and do not use upsert in Phase 4.
-- * the service role remains server/worker-only and is not needed by the web app.
create policy "visit evidence: select members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'visit-evidence'
    and public.is_project_member(public.storage_object_project_id(name))
  );

create policy "visit evidence: insert editors"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'visit-evidence'
    and public.can_edit_project(public.storage_object_project_id(name))
    and exists (
      select 1
      from public.visits
      where id = public.storage_object_visit_id(name)
        and project_id = public.storage_object_project_id(name)
    )
  );

create policy "visit evidence: update editors"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'visit-evidence'
    and public.can_edit_project(public.storage_object_project_id(name))
  )
  with check (
    bucket_id = 'visit-evidence'
    and public.can_edit_project(public.storage_object_project_id(name))
    and exists (
      select 1
      from public.visits
      where id = public.storage_object_visit_id(name)
        and project_id = public.storage_object_project_id(name)
    )
  );

create policy "visit evidence: delete editors"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'visit-evidence'
    and public.can_edit_project(public.storage_object_project_id(name))
  );
